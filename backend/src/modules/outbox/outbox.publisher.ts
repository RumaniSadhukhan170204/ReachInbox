import { publishPendingOutboxEvents } from "./outbox.service";

let running = false;

export async function runOutboxPublisher() {
  if (running) return;

  running = true;

  try {
    await publishPendingOutboxEvents();
  } catch (error) {
    console.error("Outbox publisher error:", error);
  } finally {
    running = false;
  }
}