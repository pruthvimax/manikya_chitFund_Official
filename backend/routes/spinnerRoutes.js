import express from "express";
import {
  getSpinnerCandidates,
  getSpinnerState,
  requireSpinnerAdmin,
  startSpin,
} from "../controllers/spinnerController.js";

const router = express.Router();

/* ================= ADMIN (needs x-spinner-key header) ================= */
router.get("/candidates", requireSpinnerAdmin, getSpinnerCandidates);
router.post("/start", requireSpinnerAdmin, startSpin);

/* ================= MEMBER + ADMIN ================= */
// Members must belong to the auction's group (checked in the controller).
router.get("/state", getSpinnerState);

export default router;
