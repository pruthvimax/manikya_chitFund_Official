import express from "express";
import {
  createMeeting,
  getEmployeeMeetings,
  getAllMeetings,
  updateMeeting,
  deleteMeeting,
  updateMeetingStatus,
} from "../controllers/meetingController.js";

const router = express.Router();

router.post("/add", createMeeting);
router.get("/employee/:emp_id", getEmployeeMeetings);
router.get("/", getAllMeetings);
router.put("/:id", updateMeeting);
router.delete("/:id", deleteMeeting);
router.put("/:id/status", updateMeetingStatus);

export default router;