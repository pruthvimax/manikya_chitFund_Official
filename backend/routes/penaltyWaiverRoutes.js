import express from "express";
import { setPenaltyWaiver, getPenaltyWaiverReport } from "../controllers/penaltyWaiverController.js";

const router = express.Router();

router.put(
  "/:groupId/members/:groupMemberId/penalty-waiver/:monthIndex",
  setPenaltyWaiver
);

// audit list - mounted at /api/penalty-waivers
export const penaltyWaiverReportRouter = express.Router();
penaltyWaiverReportRouter.get("/", getPenaltyWaiverReport);

export default router;
