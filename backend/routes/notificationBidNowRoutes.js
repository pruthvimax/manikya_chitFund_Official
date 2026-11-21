import express from "express";
import { setBidNowEnabled } from "../controllers/bidNowToggleController.js";

const router = express.Router();

// admin: switch the Bid Now page ON / OFF for one auction notification
router.put("/:id/bid-now", setBidNowEnabled);

export default router;
