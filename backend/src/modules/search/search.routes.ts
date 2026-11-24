
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { searchEmails } from "./email-search.service";

const router = Router();

router.get("/emails", authenticate, async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const results = await searchEmails(req.userId!, query);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    next(error);
  }
});

export default router;
