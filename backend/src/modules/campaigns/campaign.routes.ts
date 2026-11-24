
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  createCampaignController,
  listCampaigns,
  campaignDetails
} from "./campaign.controller";

const router = Router();

router.use(authenticate);

router.post("/", createCampaignController);
router.get("/", listCampaigns);
router.get("/:id", campaignDetails);

export default router;
