import express from "express";

import {
  // ADMIN - VACANCIES
  createVacancy,
  getVacancies,
  updateVacancy,
  deleteVacancy,

  // MEMBER - VACANCIES
  getOpenVacancies,

  // MEMBER - SUBSCRIBE
  createVacancyRequest,
  getMyVacancyRequests,

  // ADMIN - SUBSCRIPTION REQUESTS
  getVacancyRequests,
  getVacancyRequestCount,
  markRequestsSeen,
  approveVacancyRequest,
  rejectVacancyRequest,
  deleteVacancyRequest,
} from "../controllers/vacancyController.js";

const router = express.Router();

/* =========================================================
   SUBSCRIPTION REQUESTS
   (declared BEFORE "/:id" so they are not swallowed by it)
========================================================= */

router.get("/requests/count", getVacancyRequestCount);
router.put("/requests/seen", markRequestsSeen);

router.get("/requests", getVacancyRequests);
router.post("/requests", createVacancyRequest);

router.put("/requests/:id/approve", approveVacancyRequest);
router.put("/requests/:id/reject", rejectVacancyRequest);
router.delete("/requests/:id", deleteVacancyRequest);

router.get("/my-requests/:userid", getMyVacancyRequests);

/* =========================================================
   MEMBER: OPEN VACANCIES
========================================================= */

router.get("/open", getOpenVacancies);

/* =========================================================
   ADMIN: VACANCIES
========================================================= */

router.get("/", getVacancies);
router.post("/", createVacancy);
router.put("/:id", updateVacancy);
router.delete("/:id", deleteVacancy);

export default router;
