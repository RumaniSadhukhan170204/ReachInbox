
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  // Server
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  FRONTEND_URL: z.string().url(),
  BACKEND_URL: z.string().url(),

  // PostgreSQL
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(""),

  // Authentication
  JWT_SECRET: z.string().min(24),
  JWT_EXPIRES_IN: z.string().default("7d"),
  SESSION_SECRET: z.string().min(24),

  // Google OAuth
 GOOGLE_CLIENT_ID: z.string().min(1),
GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.string().url(),

  // SMTP / Ethereal
  SMTP_HOST: z.string().default(""),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),
  SMTP_FROM: z.string().default(""),

  // Elasticsearch
  ELASTICSEARCH_NODE: z.string().min(1),
ELASTICSEARCH_USERNAME: z.string().min(1),
ELASTICSEARCH_PASSWORD: z.string().min(1),
ELASTICSEARCH_CA_PATH: z.string().min(1),

  // Slack OAuth
 // Slack OAuth
SLACK_CLIENT_ID: z.string().min(1),
SLACK_CLIENT_SECRET: z.string().min(1),
SLACK_REDIRECT_URI: z.string().url(),
SLACK_SIGNING_SECRET: z.string().default(""),

  // Email worker and rate limits
  EMAIL_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().int().nonnegative().default(1000),
  DEFAULT_HOURLY_LIMIT: z.coerce.number().int().positive().default(100)
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error("Environment configuration error:");
  console.error(result.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = result.data;
