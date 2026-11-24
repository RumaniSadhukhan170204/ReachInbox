
import {
  connectDatabase,
  disconnectDatabase
} from "../config/db";

import { initializeEmailIndex, reindexAllEmails } from "../modules/search/email-search.service";

async function main() {
  try {
    await connectDatabase();

    await initializeEmailIndex();

    await reindexAllEmails();

    console.log("Email re-indexing completed successfully");
  } catch (error) {
    console.error("Email re-indexing failed:", error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

void main();
