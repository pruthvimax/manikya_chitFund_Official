import express from "express";
import { sendOtp, verifyOtp, getAdminProfile } from "../controllers/adminController.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/profile/:mobile", getAdminProfile);

export default router;
