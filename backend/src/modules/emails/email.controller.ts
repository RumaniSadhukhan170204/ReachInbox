
import { Request, Response, NextFunction } from "express";
import { EmailStatus } from "@prisma/client";
import { prisma } from "../../config/db";

export async function listEmails(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const status = req.query.status as string | undefined;

    const allowedStatuses = Object.values(EmailStatus);

    if (status && !allowedStatuses.includes(status as EmailStatus)) {
      return res.status(400).json({ message: "Invalid email status" });
    }

    const emails = await prisma.email.findMany({
      where: {
        userId: req.userId!,
        ...(status ? { status: status as EmailStatus } : {})
      },
      orderBy: { scheduledAt: "desc" },
      take: 200
    });

    res.json({ success: true, emails });
  } catch (error) {
    next(error);
  }
}

export async function emailDetails(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const email = await prisma.email.findFirst({
      where: {
        id: String(req.params.id),
        userId: req.userId!
      }
    });

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    res.json({ success: true, email });
  } catch (error) {
    next(error);
  }
}
