import express from "express";
import {
  createCommitment,
  getEmployeeCommitments,
  getAllCommitments,
  updateCommitmentStatus,
  deleteCommitment,
} from "../controllers/commitmentController.js";

const router = express.Router();

router.post("/add", createCommitment);
router.get("/employee/:emp_id", getEmployeeCommitments);
router.get("/", getAllCommitments);
router.put("/:id/status", updateCommitmentStatus);
router.delete("/:id", deleteCommitment);

export default router;