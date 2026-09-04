import express from "express";
import {
  createLeaveRequest,
  getEmployeeLeaves,
  getAllLeaves,
  deleteLeaveRequest,
  updateLeaveStatus,
} from "../controllers/leaveRequestController.js";

const router = express.Router();

// Make sure all routes are defined
router.post("/add", createLeaveRequest);
router.get("/employee/:emp_id", getEmployeeLeaves);
router.get("/", getAllLeaves);  // This is the main GET route
router.delete("/:id", deleteLeaveRequest);
router.put("/:id/status", updateLeaveStatus);

export default router;