
import { elasticsearch } from "../../config/elasticsearch";
import { prisma } from "../../config/db";

const INDEX = "reachinbox-emails";

// Create the Elasticsearch index if it doesn't exist
export async function initializeEmailIndex() {
  const exists = await elasticsearch.indices.exists({
    index: INDEX
  });

  if (!exists) {
    await elasticsearch.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          userId: { type: "keyword" },
          campaignId: { type: "keyword" },
          recipient: { type: "text" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" }
        }
      }
    });

    console.log("Elasticsearch email index created");
  }
}

// Index one email
export async function indexEmail(emailId: string) {
  const email = await prisma.email.findUnique({
    where: { id: emailId }
  });

  if (!email) {
    throw new Error("Email not found for indexing");
  }

  await elasticsearch.index({
    index: INDEX,
    id: email.id,
    document: {
      userId: email.userId,
      campaignId: email.campaignId,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt
    },
    refresh: "wait_for"
  });
}

// Search emails belonging to the authenticated user
export async function searchEmails(
  userId: string,
  query: string
) {
  const result = await elasticsearch.search({
    index: INDEX,
    query: {
      bool: {
        filter: [
          {
            term: { userId }
          }
        ],
        must: [
          {
            multi_match: {
              query,
              fields: [
                "recipient",
                "subject",
                "body"
              ],
              fuzziness: "AUTO"
            }
          }
        ]
      }
    }
  });

 return result.hits.hits.map((hit) => ({
  id: hit._id,
  ...(hit._source ?? {})
}));
}

// Re-index all existing emails
export async function reindexAllEmails(userId?: string) {
  const emails = await prisma.email.findMany({
    where: userId ? { userId } : undefined
  });

  for (const email of emails) {
    await elasticsearch.index({
      index: INDEX,
      id: email.id,
      document: {
        userId: email.userId,
        campaignId: email.campaignId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt
      }
    });
  }

  await elasticsearch.indices.refresh({
    index: INDEX
  });

  console.log(`Indexed ${emails.length} emails`);
}
