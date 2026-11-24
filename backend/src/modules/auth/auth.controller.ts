
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/db";
import { env } from "../../config/env";

export async function googleCallback(req: Request, res: Response) {
  const user = req.user as {
    id: string;
    email: string;
  } | undefined;

  if (!user) {
    return res.redirect(`${env.FRONTEND_URL}/login?error=google_auth_failed`);
  }

  const token = jwt.sign(
    { sub: user.id },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  // Temporary development handoff. Replace with a one-time
  // Redis-backed authorization code before production.
  return res.redirect(
    `${env.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}`
  );
}

export async function getProfile(req: Request, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      email: true,
      name: true,
      avatar: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ success: true, user });
}

export async function logout(_req: Request, res: Response) {
  res.json({
    success: true,
    message: "Logged out. Clear the client-side token."
  });
}
