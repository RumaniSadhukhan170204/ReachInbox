import { WebClient } from "@slack/web-api";
import { prisma } from "../../config/db";

export async function notifySlack(
  userId: string,
  message: string
) {
  const integration = await prisma.slackIntegration.findUnique({
    where: { userId }
  });

  if (!integration || !integration.channelId) {
    console.log("Slack integration or channel not configured");
    return;
  }

  const channelId: string = integration.channelId;
  const client = new WebClient(integration.accessToken);

  try {
    await client.chat.postMessage({
      channel: channelId,
      text: message
    });

    console.log("Slack notification sent successfully");
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
}
