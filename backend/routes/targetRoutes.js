import express from "express";
import {
  createTarget,
  getEmployeeTargets,
  getAllTargets,
  updateTarget,
  updateTargetStatus,
  deleteTarget,
  updateSalaryAndIncentive,
  toggleFreeze,
} from "../controllers/targetController.js";

const router = express.Router();

// Employee routes
router.post("/add", createTarget);
router.get("/employee/:emp_id", getEmployeeTargets);

// Admin routes
router.get("/", getAllTargets);

// ✅ Specific routes FIRST (before the generic :id)
router.put("/:id/salary-incentive", updateSalaryAndIncentive);
router.put("/:id/status", updateTargetStatus);
router.put("/:id/freeze", toggleFreeze);

// ✅ Generic route LAST
router.put("/:id", updateTarget);

router.delete("/:id", deleteTarget);

export default router;