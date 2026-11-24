
import { CampaignStatus } from "@prisma/client";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

interface CreateCampaignInput {
  name: string;
  subject: string;
  body: string;
  recipients: string[];
  startAt: string;
  delayMs?: number;
  hourlyLimit?: number;
}

export async function createCampaign(
  userId: string,
  input: CreateCampaignInput
) {
  const recipients = [
    ...new Set(
      input.recipients.map((email) => email.trim().toLowerCase())
    )
  ];

  if (!recipients.length) {
    throw new AppError("At least one recipient is required", 400);
  }

  const invalid = recipients.filter(
    (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );

  if (invalid.length) {
    throw new AppError(`Invalid recipient: ${invalid[0]}`, 400);
  }

  if (!input.name.trim() || !input.subject.trim() || !input.body.trim()) {
    throw new AppError("Campaign name, subject and body are required", 400);
  }

  const startAt = new Date(input.startAt);

  if (Number.isNaN(startAt.getTime()) || startAt.getTime() < Date.now()) {
    throw new AppError("Start time must be a valid future date", 400);
  }

  const delayMs = Math.max(1000, input.delayMs ?? 1000);
  const hourlyLimit = Math.max(1, input.hourlyLimit ?? 100);

  return prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.create({
      data: {
        userId,
        name: input.name.trim(),
        subject: input.subject.trim(),
        body: input.body,
        startAt,
        delayMs,
        hourlyLimit,
        totalRecipients: recipients.length,
        status: CampaignStatus.SCHEDULED
      }
    });

    for (let index = 0; index < recipients.length; index++) {
      const recipient = recipients[index];

      const scheduledAt = new Date(
        startAt.getTime() + index * delayMs
      );

      const email = await tx.email.create({
        data: {
          userId,
          campaignId: campaign.id,
          recipient,
          subject: input.subject.trim(),
          body: input.body,
          status: "SCHEDULED",
          scheduledAt,
          idempotencyKey: `${campaign.id}:${recipient}`
        }
      });

      await tx.outboxEvent.create({
        data: {
          eventType: "EMAIL_SCHEDULE",
          payload: {
            emailId: email.id,
            userId,
            campaignId: campaign.id
          }
        }
      });
    }

    return campaign;
  });
}

export async function getCampaigns(userId: string) {
  return prisma.campaign.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { emails: true }
      }
    }
  });
}

export async function getCampaignById(
  userId: string,
  id: string
) {
  const campaign = await prisma.campaign.findFirst({
    where: { id, userId },
    include: {
      emails: {
        orderBy: { scheduledAt: "asc" }
      }
    }
  });

  if (!campaign) {
    throw new AppError("Campaign not found", 404);
  }

  return campaign;
}
