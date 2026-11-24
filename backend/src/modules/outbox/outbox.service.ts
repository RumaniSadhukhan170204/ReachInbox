import { prisma } from "../../config/db";
import { emailQueue, EmailJobData } from "../queue/email.queue";

export async function publishPendingOutboxEvents() {
  const events = await prisma.outboxEvent.findMany({
    where: {
  status: { in: ["PENDING", "FAILED"] },
  attempts: { lt: 10 }
},
    orderBy: { createdAt: "asc" },
    take: 100
  });

  for (const event of events) {
    try {
      const payload = event.payload as unknown as EmailJobData;

      await emailQueue.add("send-email", payload, {
        jobId: payload.emailId,
        delay: Math.max(
          0,
          new Date(
            (await prisma.email.findUniqueOrThrow({
              where: { id: payload.emailId },
              select: { scheduledAt: true }
            })).scheduledAt
          ).getTime() - Date.now()
        )
      });

      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "PUBLISHED",
          publishedAt: new Date()
        }
      });
    } catch (error) {
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          attempts: { increment: 1 }
        }
      });

      console.error("Outbox publishing failed:", error);
    }
  }
}