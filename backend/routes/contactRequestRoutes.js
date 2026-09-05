import express from "express";

import {
  createContactRequest,
  getContactRequests,
  getUnreadContactRequestCount,
  markContactRequestAsRead,
  deleteContactRequest,
} from "../controllers/contactRequestController.js";

const router = express.Router();


// Member sends contact request
router.post("/", createContactRequest);


// Admin gets all notifications
router.get("/", getContactRequests);


// Admin dashboard unread count
router.get("/unread-count", getUnreadContactRequestCount);


// Admin opens notification
router.patch("/:id/read", markContactRequestAsRead);

// Admin deletes notification
router.delete("/:id", deleteContactRequest);

export default router;