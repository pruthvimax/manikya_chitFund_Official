import express from "express";
import {
  createEnrollment,
  getEmployeeEnrollments,
  getAllEnrollments,
  updateEnrollmentStatus,
  deleteEnrollment,
} from "../controllers/enrollmentController.js";

const router = express.Router();

router.post("/add", createEnrollment);
router.get("/employee/:emp_id", getEmployeeEnrollments);
router.get("/", getAllEnrollments);
router.put("/:id/status", updateEnrollmentStatus);
router.delete("/:id", deleteEnrollment);

export default router;