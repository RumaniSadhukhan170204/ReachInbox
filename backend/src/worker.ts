import { emailWorker } from "./modules/workers/email.worker";

console.log("ReachInbox email worker started");

process.on("SIGINT", async () => {
  await emailWorker.close();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await emailWorker.close();
  process.exit(0);
});