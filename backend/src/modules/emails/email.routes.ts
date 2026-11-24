
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  listEmails,
  emailDetails
} from "./email.controller";

const router = Router();

router.use(authenticate);

router.get("/", listEmails);
router.get("/:id", emailDetails);

export default router;
