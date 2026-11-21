import express from "express";
import { setMemberDividend } from "../controllers/memberDividendController.js";

const router = express.Router();

// admin: change one member's dividend for one month
router.put("/:groupId/members/:groupMemberId/dividend/:monthIndex", setMemberDividend);

export default router;
