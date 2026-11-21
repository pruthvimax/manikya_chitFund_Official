import express from "express";
import { deleteFollowUp, listFollowUps, saveFollowUp } from "../controllers/callFollowUpController.js";

const router = express.Router();

router.get("/", listFollowUps);
router.put("/", saveFollowUp);
router.delete("/", deleteFollowUp);

export default router;
