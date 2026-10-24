import express from "express";
import {
  getFollowUpCount,
  markFollowUpDone,
} from "../controllers/dailyFollowUpController.js";

const router = express.Router();

/* Mounted at /api/daily-database/follow-ups (before the main
   daily-database router, so nothing there can swallow these). */
router.get("/count/:empId", getFollowUpCount);
router.put("/:id/done", markFollowUpDone);

export default router;
