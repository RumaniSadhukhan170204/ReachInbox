
import app from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/db";
import { redis } from "./config/redis";

import { runOutboxPublisher } from "./modules/outbox/outbox.publisher";
import { initializeEmailIndex } from "./modules/search/email-search.service";

async function start() {
  try {
    // 1. Connect to PostgreSQL
    await connectDatabase();

    // 2. Connect to Redis
    await redis.ping();
    console.log("Redis connected successfully");

    // 3. Initialize Elasticsearch
    try {
      await initializeEmailIndex();
      console.log("Elasticsearch email index ready");
    } catch (error) {
      console.error("Elasticsearch initialization failed:", error);
    }

    // 4. Publish pending Outbox events
    await runOutboxPublisher();

    // 5. Poll Outbox every 5 seconds
    setInterval(() => {
      void runOutboxPublisher();
    }, 5000);

    // 6. Start Express server
    app.listen(env.PORT, () => {
      console.log(`ReachInbox API: http://localhost:${env.PORT}`);
    });

  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  console.log("Shutting down ReachInbox API...");

  await redis.quit();
  await disconnectDatabase();

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void start();
