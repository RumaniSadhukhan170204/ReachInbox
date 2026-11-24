
import express from "express";
import cors from "cors";
import passport from "passport";
import cookieParser from "cookie-parser";

import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";

import authRoutes from "./modules/auth/auth.routes";
import campaignRoutes from "./modules/campaigns/campaign.routes";
import emailRoutes from "./modules/emails/email.routes";
import searchRoutes from "./modules/search/search.routes";
import slackRoutes from "./modules/slack/slack.routes";

import { serverAdapter } from "./modules/queue/queue-dashboard";

const app = express();

// CORS
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);

// Body parsing and authentication
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "ReachInbox API is running",
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/slack", slackRoutes);

// Queue dashboard
app.use("/admin/queues", serverAdapter.getRouter());

// Error middleware must be registered last
app.use(errorMiddleware);

export default app;
