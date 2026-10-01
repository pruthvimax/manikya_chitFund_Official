import express from "express";
import {
  createEntry,
  getEmployeesSummary,
  getEntriesByEmployee,
  updateEntry,
  deleteEntry,
} from "../controllers/dailyDatabaseController.js";

const router = express.Router();

/* Order matters: the static "/employees-summary" path must be
   registered before the "/employee/:empId" dynamic path so it
   doesn't get swallowed by the param route. */
router.post("/", createEntry);
router.get("/employees-summary", getEmployeesSummary);
router.get("/employee/:empId", getEntriesByEmployee);
router.put("/:id", updateEntry);
router.delete("/:id", deleteEntry);

export default router;
