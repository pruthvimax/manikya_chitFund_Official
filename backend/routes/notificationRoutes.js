import express from "express";

import {
  addNotification,
  getNotifications,
  updateNotification,
  deleteNotification,
  getUserNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

/* =========================================================
   ADMIN
========================================================= */

router.post(
  "/",
  addNotification
);

router.get(
  "/",
  getNotifications
);

router.put(
  "/:id",
  updateNotification
);

router.delete(
  "/:id",
  deleteNotification
);


/* =========================================================
   USER
========================================================= */

router.get(
  "/user/:userid",
  getUserNotifications
);

export default router;