import express from "express";
import {
  getSpinnerCandidates,
  getSpinnerState,
  requireSpinnerAdmin,
  startSpin,
} from "../controllers/spinnerController.js";
import {
  announceSpin,
  cancelSpinAnnouncement,
  getMemberSpinAnnouncements,
  getSpinAnnouncement,
} from "../controllers/spinAnnounceController.js";

const router = express.Router();

/* ================= ADMIN (needs x-spinner-key header) ================= */
router.get("/candidates", requireSpinnerAdmin, getSpinnerCandidates);
router.post("/start", requireSpinnerAdmin, startSpin);

/* "Spin starts at ..." notification + reminders (admin) */
router.get("/announce", requireSpinnerAdmin, getSpinAnnouncement);
router.post("/announce", requireSpinnerAdmin, announceSpin);
router.post("/announce/cancel", requireSpinnerAdmin, cancelSpinAnnouncement);

/* ================= MEMBER + ADMIN ================= */
// Members must belong to the auction's group (checked in the controller).
router.get("/state", getSpinnerState);
// spin-time announcements shown in the member's notification list
router.get("/announcements", getMemberSpinAnnouncements);

export default router;
