import express from "express";
import {
  createWorkSheet,
  getEmployeeWorkSheets,
  getAllWorkSheets,
  updateWorkSheetStatus,
  deleteWorkSheet,
} from "../controllers/workSheetController.js";

const router = express.Router();

router.post("/add", createWorkSheet);
router.get("/employee/:emp_id", getEmployeeWorkSheets);
router.get("/", getAllWorkSheets);
router.put("/:id/status", updateWorkSheetStatus);
router.delete("/:id", deleteWorkSheet);

export default router;