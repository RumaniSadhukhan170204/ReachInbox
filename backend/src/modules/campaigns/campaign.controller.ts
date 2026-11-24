
import { Request, Response, NextFunction } from "express";
import {
  createCampaign,
  getCampaigns,
  getCampaignById
} from "./campaign.service";

export async function createCampaignController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, subject, body, recipients, startAt, delayMs, hourlyLimit } =
      req.body;

    if (
      !name ||
      !subject ||
      !body ||
      !Array.isArray(recipients) ||
      !startAt
    ) {
      return res.status(400).json({
        success: false,
        message: "name, subject, body, recipients and startAt are required"
      });
    }

    const campaign = await createCampaign(req.userId!, {
      name,
      subject,
      body,
      recipients,
      startAt,
      delayMs,
      hourlyLimit
    });

    return res.status(201).json({
      success: true,
      campaign
    });
  } catch (error) {
    next(error);
  }
}

export async function listCampaigns(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const campaigns = await getCampaigns(req.userId!);
    res.json({ success: true, campaigns });
  } catch (error) {
    next(error);
  }
}

export async function campaignDetails(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const campaign = await getCampaignById(
      req.userId!,
      String(req.params.id)
    );

    res.json({ success: true, campaign });
  } catch (error) {
    next(error);
  }
}
