import express from "express";
import { getMemberHistory } from "../controllers/memberHistoryController.js";

const router = express.Router();

router.get("/:userid", getMemberHistory);

export default router;
