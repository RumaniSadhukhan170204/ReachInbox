
import { Worker, Job } from "bullmq";
import nodemailer, { SentMessageInfo } from "nodemailer";

import { redis } from "../../config/redis";
import { prisma } from "../../config/db";
import { env } from "../../config/env";

import { EmailJobData } from "../queue/email.queue";
import { reserveEmailSlot } from "../queue/rate-limiter";
import { rescheduleEmail } from "../queue/reschedule";
import { indexEmail } from "../search/email-search.service";
import { notifySlack } from "../slack/slack.service";

let transporter: import("nodemailer").Transporter | null = null;

// ==========================================
// 1. EMAIL TRANSPORTER
// ==========================================

async function getTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS
      }
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });

    console.log("Ethereal test account created:", testAccount.user);
  }

  return transporter;
}

// ==========================================
// 2. CAMPAIGN COMPLETION + SLACK NOTIFICATION
// ==========================================

async function updateCampaignCompletion(
  campaignId: string,
  userId: string
) {
  const completion = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.findFirst({
      where: {
        id: campaignId,
        userId
      }
    });

    if (!campaign) return null;

    // Count actual processed email records.
    const emailCounts = await tx.email.groupBy({
      by: ["status"],
      where: {
        campaignId,
        userId
      },
      _count: {
        _all: true
      }
    });

    const sentCount =
      emailCounts.find((item) => item.status === "SENT")
        ?._count._all ?? 0;

    const failedCount =
      emailCounts.find((item) => item.status === "FAILED")
        ?._count._all ?? 0;

    const processedCount = sentCount + failedCount;

    if (processedCount < campaign.totalRecipients) {
      return null;
    }

    const finalStatus =
      failedCount > 0 ? "FAILED" : "COMPLETED";

    // Only one worker can perform the terminal transition.
    const updated = await tx.campaign.updateMany({
      where: {
        id: campaignId,
        userId,
        status: {
          in: ["SCHEDULED", "PROCESSING"]
        }
      },
      data: {
        status: finalStatus,
        sentCount,
        failedCount
      }
    });

    if (updated.count === 0) {
      return null;
    }

    return {
      name: campaign.name,
      totalRecipients: campaign.totalRecipients,
      sentCount,
      failedCount,
      status: finalStatus
    };
  });

  if (!completion) return;

  console.log(
    `Campaign ${campaignId} finished with status ${completion.status}`
  );

  // Slack errors are handled inside notifySlack.
  // They must never cause email delivery to be retried.
  const message =
    completion.status === "COMPLETED"
      ? [
          "✅ *ReachInbox Campaign Completed*",
          `Campaign: ${completion.name}`,
          `Total recipients: ${completion.totalRecipients}`,
          `Successfully sent: ${completion.sentCount}`,
          `Failed: ${completion.failedCount}`
        ].join("\n")
      : [
          "⚠️ *ReachInbox Campaign Finished with Failures*",
          `Campaign: ${completion.name}`,
          `Total recipients: ${completion.totalRecipients}`,
          `Successfully sent: ${completion.sentCount}`,
          `Failed: ${completion.failedCount}`
        ].join("\n");

  await notifySlack(userId, message);
}

// ==========================================
// 3. PROCESS ONE EMAIL
// ==========================================

async function processEmail(job: Job<EmailJobData>) {
  const { emailId, userId, campaignId } = job.data;

  // Fetch email.
  const email = await prisma.email.findFirst({
    where: {
      id: emailId,
      userId,
      campaignId
    }
  });

  if (!email) {
    throw new Error("Email record not found");
  }

  // Prevent duplicate sending.
  if (
    email.status === "SENT" ||
    email.status === "CANCELLED" ||
    email.status === "UNKNOWN"
  ) {
    console.log(`Skipping email ${emailId}: ${email.status}`);
    return;
  }

  // Fetch campaign.
  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      userId
    }
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  // Apply Redis rate limiting.
  const reservation = await reserveEmailSlot(
    userId,
    campaign.hourlyLimit,
    emailId,
    env.MIN_DELAY_BETWEEN_EMAILS_MS
  );

  // Reschedule when rate limit is reached.
  if (!reservation.allowed) {
    await rescheduleEmail(
      job.data,
      reservation.retryAfterMs
    );

    console.log(
      `Email ${emailId} rescheduled. Retry after ${reservation.retryAfterMs}ms`
    );

    return;
  }

  // Mark email as processing.
  await prisma.email.update({
    where: { id: emailId },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 }
    }
  });

  // ==========================================
  // 4. SEND EMAIL
  // ==========================================

  let info: SentMessageInfo;

  try {
    const mailer = await getTransporter();

    info = await mailer.sendMail({
      from:
        env.SMTP_FROM ||
        "ReachInbox Demo <demo@reachinbox.local>",
      to: email.recipient,
      subject: email.subject,
      text: email.body
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown SMTP error";

    console.error(
      `Email sending failed for ${emailId}:`,
      message
    );

    const isFinalAttempt =
      job.attemptsMade + 1 >=
      Number(job.opts.attempts ?? 1);

    await prisma.email.update({
      where: { id: emailId },
      data: {
        status: isFinalAttempt ? "FAILED" : "PENDING",
        errorMessage: message
      }
    });

    if (isFinalAttempt) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          failedCount: { increment: 1 }
        }
      });

      await updateCampaignCompletion(campaignId, userId);
    }

    // The reservation stays consumed because an SMTP
    // sending attempt was made.
    throw error;
  }

  // ==========================================
  // 5. CONFIRM SUCCESS IN DATABASE
  // ==========================================

  let updatedEmail;

  try {
    updatedEmail = await prisma.email.update({
      where: { id: emailId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        errorMessage: null
      }
    });

    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: 1 }
      }
    });

    await updateCampaignCompletion(campaignId, userId);

  } catch (databaseError) {
    console.error(
      "SMTP accepted the email, but database confirmation failed:",
      databaseError
    );

    // Do not blindly retry an email that SMTP may have accepted.
    try {
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: "UNKNOWN",
          errorMessage:
            "SMTP accepted the email, but database confirmation failed."
        }
      });
    } catch (statusError) {
      console.error(
        "Could not mark email UNKNOWN:",
        statusError
      );
    }

    throw databaseError;
  }

  console.log("Email sent successfully:", email.recipient);

  // ==========================================
  // 6. ETHEREAL PREVIEW
  // ==========================================

  const previewUrl = nodemailer.getTestMessageUrl(info);

  if (previewUrl) {
    console.log("Ethereal preview:", previewUrl);
  }

  // ==========================================
  // 7. ELASTICSEARCH INDEXING
  // ==========================================

  try {
    await indexEmail(emailId);
  } catch (indexError) {
    console.error(
      "Elasticsearch indexing failed:",
      indexError
    );
  }

  return updatedEmail;
}

// ==========================================
// 8. START BULLMQ WORKER
// ==========================================

export const emailWorker = new Worker<EmailJobData>(
  "email-queue",
  processEmail,
  {
    connection: redis,
    concurrency: env.EMAIL_WORKER_CONCURRENCY
  }
);

// ==========================================
// 9. WORKER EVENT LISTENERS
// ==========================================

emailWorker.on("completed", (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on("failed", (job, error) => {
  console.error(
    `Email job ${job?.id} failed:`,
    error.message
  );
});

emailWorker.on("error", (error) => {
  console.error("Email worker error:", error);
});
