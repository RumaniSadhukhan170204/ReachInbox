
import { WebClient } from "@slack/web-api";
import { prisma } from "../../config/db";

export async function notifySlack(
  userId: string,
  message: string
): Promise<boolean> {
  try {
    const integration = await prisma.slackIntegration.findUnique({
      where: { userId }
    });

    if (!integration) {
      console.log("Slack is not connected for user:", userId);
      return false;
    }

    if (!integration.channelId) {
      console.log("Slack notification channel is not configured");
      return false;
    }

    const client = new WebClient(integration.accessToken);

    await client.chat.postMessage({
      channel: integration.channelId,
      text: message,
      unfurl_links: false,
      unfurl_media: false
    });

    console.log("Slack notification sent successfully");

    return true;
  } catch (error) {
    console.error("Slack notification failed:", error);
    return false;
  }
}
