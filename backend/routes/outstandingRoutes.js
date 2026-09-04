import express from "express";
import { getMyOutstanding } from "../controllers/outstandingController.js";

const router = express.Router();

router.get("/member/my-outstanding/:memberId", getMyOutstanding);

export default router;
