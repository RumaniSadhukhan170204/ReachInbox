
import { Queue } from "bullmq";
import { redis } from "../../config/redis";

export interface EmailJobData {
  emailId: string;
  userId: string;
  campaignId: string;
}

export const emailQueue = new Queue<EmailJobData>(
  "email-queue",
  {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      },
      removeOnComplete: false,
      removeOnFail: false
    }
  }
);
