import express from "express";
import { createAdvance, getAdvanceSummary, listAdvances } from "../controllers/advanceController.js";
import { getMyAdvances } from "../controllers/memberAdvanceController.js";

const router = express.Router();

router.get("/summary", getAdvanceSummary);
router.get("/my/:userid", getMyAdvances);
router.get("/", listAdvances);
router.post("/", createAdvance);

export default router;
