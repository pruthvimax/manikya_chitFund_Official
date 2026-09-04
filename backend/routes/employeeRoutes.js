
import express from "express";

import {
  checkEmployeeStatus,
  addEmployee,
  getEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  loginEmployee,
  getEmployeeDashboardSummary,
  getEmployeeCollections,
  getEmployeeCollectionsByDate,
} from "../controllers/employeeController.js";

const router = express.Router();

/* =================================================
   ============ AUTH & EMPLOYEE APIs ===============
   ================================================= */

// AUTH
router.post("/add", addEmployee);

router.post("/login", loginEmployee);

/* =================================================
   ============ DASHBOARD & COLLECTIONS ============
   ================================================= */

// EMPLOYEE DASHBOARD
router.get(
  "/dashboard/summary",
  getEmployeeDashboardSummary
);

// EMPLOYEE COLLECTIONS
router.get(
  "/collections",
  getEmployeeCollections
);

// ADMIN: EMPLOYEE COLLECTIONS BY DATE
// IMPORTANT: This MUST be before "/:emp_id"
router.get(
  "/:emp_id/collections-by-date",
  getEmployeeCollectionsByDate
);

/* =================================================
   ============ EMPLOYEE CRUD ======================
   ================================================= */

// GET ALL EMPLOYEES
router.get(
  "/",
  getAllEmployees
);

// GET ONE EMPLOYEE
router.get(
  "/:emp_id",
  getEmployee
);

// UPDATE EMPLOYEE
router.put(
  "/:emp_id",
  updateEmployee
);

// DELETE EMPLOYEE
router.delete(
  "/:emp_id",
  deleteEmployee
);

// CHECK EMPLOYEE STATUS
router.get(
  "/check-status/:emp_id",
  checkEmployeeStatus
);

/* =================================================
   ============ DEBUG ==============================
   ================================================= */

console.log(
  "EMPLOYEE ROUTES LOADED: collections-by-date enabled"
);

export default router;
