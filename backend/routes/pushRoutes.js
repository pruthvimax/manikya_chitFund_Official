import express from "express";
import {
  registerPushToken,
  setPushBadge,
  unregisterPushToken,
} from "../controllers/pushController.js";

const router = express.Router();

router.post("/register", registerPushToken);
router.post("/unregister", unregisterPushToken);
router.post("/badge", setPushBadge);

export default router;
