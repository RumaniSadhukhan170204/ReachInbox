
import {
  emailQueue,
  EmailJobData
} from "../modules/queue/email.queue";

export async function rescheduleEmail(
  data: EmailJobData,
  delayMs: number
) {
  await emailQueue.add("send-email", data, {
    jobId: `${data.emailId}-retry-${Date.now()}`,
    delay: Math.max(1000, delayMs),
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000
    },
    removeOnComplete: false,
    removeOnFail: false
  });
}
