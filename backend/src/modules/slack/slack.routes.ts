
import { Router } from "express";
import { WebClient } from "@slack/web-api";
import crypto from "crypto";

import { authenticate } from "../../middleware/auth.middleware";
import { env } from "../../config/env";
import { prisma } from "../../config/db";
import { redis } from "../../config/redis";
import { AppError } from "../../utils/AppError";

const router = Router();
const STATE_TTL_SECONDS = 300;

// 1. SLACK CONNECTION STATUS

router.get("/status", authenticate, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: req.userId }
    });

    res.json({
      success: true,
      connected: Boolean(integration),
      teamName: integration?.teamName ?? null,
      teamId: integration?.teamId ?? null,
      channelId: integration?.channelId ?? null
    });
  } catch (error) {
    next(error);
  }
});

// 2. GENERATE AUTHORIZATION URL

router.post("/authorize", authenticate, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    const state = crypto.randomBytes(32).toString("hex");

    await redis.set(
      `slack-oauth:${state}`,
      req.userId,
      "EX",
      STATE_TTL_SECONDS
    );

    res.cookie("slack_oauth_state", state, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: STATE_TTL_SECONDS * 1000,
      path: "/"
    });

    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      scope: "chat:write,channels:read,groups:read",
      redirect_uri: env.SLACK_REDIRECT_URI,
      state
    });

    res.json({
      success: true,
      authorizationUrl:
        `https://slack.com/oauth/v2/authorize?${params.toString()}`
    });
  } catch (error) {
    next(error);
  }
});

// 3. SLACK OAUTH CALLBACK

router.get("/callback", async (req, res) => {
  try {
    const state = req.query.state;
    const savedState = req.cookies?.slack_oauth_state;

    const redisKeyExists =
      typeof state === "string"
        ? await redis.exists(`slack-oauth:${state}`)
        : false;

    console.log("SLACK OAUTH DEBUG:", {
      queryStateReceived: typeof state === "string",
      cookieReceived: typeof savedState === "string",
      stateMatches:
        typeof state === "string" &&
        typeof savedState === "string" &&
        state === savedState,
      redisKeyExists: redisKeyExists === 1
    });

    if (
      typeof state !== "string" ||
      typeof savedState !== "string" ||
      state !== savedState
    ) {
      throw new AppError("Invalid Slack OAuth state", 403);
    }

    const userId = await redis.get(`slack-oauth:${state}`);

    if (!userId) {
      throw new AppError("Slack OAuth session expired", 403);
    }

    if (typeof req.query.error === "string") {
      throw new AppError(
        `Slack authorization denied: ${req.query.error}`,
        400
      );
    }

    const code = req.query.code;

    if (typeof code !== "string") {
      throw new AppError("Missing Slack authorization code", 400);
    }

    const client = new WebClient();

    const result = await client.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI
    });

    if (
      !result.ok ||
      !result.access_token ||
      !result.team?.id
    ) {
      throw new AppError("Slack authorization failed", 400);
    }

    await prisma.slackIntegration.upsert({
      where: { userId },
      update: {
        teamId: result.team.id,
        teamName: result.team.name ?? null,
        accessToken: result.access_token,
        channelId: null
      },
      create: {
        userId,
        teamId: result.team.id,
        teamName: result.team.name ?? null,
        accessToken: result.access_token
      }
    });

    await redis.del(`slack-oauth:${state}`);

    res.clearCookie("slack_oauth_state", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    console.log("Slack workspace connected successfully.");

    return res.redirect(
      `${env.FRONTEND_URL}/settings?slack=connected`
    );
  } catch (error) {
    console.error("Slack OAuth callback failed:", error);

    res.clearCookie("slack_oauth_state", {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    return res.redirect(
      `${env.FRONTEND_URL}/settings?slack=error`
    );
  }
});

// 4. GET AVAILABLE CHANNELS

router.get("/channels", authenticate, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: req.userId }
    });

    if (!integration) {
      throw new AppError("Connect Slack first", 404);
    }

    const client = new WebClient(integration.accessToken);

    const channels: Array<{
      id: string;
      name: string;
      is_private: boolean;
      is_member: boolean;
    }> = [];

    let cursor: string | undefined;

    do {
      const response = await client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200,
        cursor
      });

      for (const channel of response.channels ?? []) {
        if (channel.id && channel.name) {
          channels.push({
            id: channel.id,
            name: channel.name,
            is_private: channel.is_private ?? false,
            is_member: channel.is_member ?? false
          });
        }
      }

      cursor = response.response_metadata?.next_cursor || undefined;
    } while (cursor);

    res.json({ success: true, channels });
  } catch (error) {
    next(error);
  }
});

// 5. SAVE SELECTED CHANNEL

router.put("/channel", authenticate, async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError("Authentication required", 401);
    }

    const { channelId } = req.body;

    if (typeof channelId !== "string" || !channelId.trim()) {
      throw new AppError("Valid channel ID is required", 400);
    }

    const integration = await prisma.slackIntegration.findUnique({
      where: { userId: req.userId }
    });

    if (!integration) {
      throw new AppError("Connect Slack first", 404);
    }

    const client = new WebClient(integration.accessToken);

    const channelInfo = await client.conversations.info({
      channel: channelId
    });

    const channel = channelInfo.channel;

    if (!channel?.id) {
      throw new AppError("Slack channel not found", 404);
    }

    if (channel.is_archived) {
      throw new AppError("Cannot select an archived channel", 400);
    }

    if (!channel.is_member) {
      throw new AppError(
        "Invite the ReachInbox Slack app to this channel first",
        400
      );
    }

    await prisma.slackIntegration.update({
      where: { userId: req.userId },
      data: { channelId }
    });

    res.json({
      success: true,
      message: "Slack notification channel saved",
      channelId
    });
  } catch (error) {
    next(error);
  }
});

export default router;
