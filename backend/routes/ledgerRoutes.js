import express from "express";
import {
  changeLedgerPassword,
  getLedgerSummary,
  verifyLedgerPassword,
} from "../controllers/ledgerController.js";

const router = express.Router();

router.post("/verify", verifyLedgerPassword);
router.post("/change-password", changeLedgerPassword);
router.get("/summary", getLedgerSummary);

export default router;
