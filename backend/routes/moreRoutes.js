import express from "express";
import {
  addHandover,
  deleteAnnouncement,
  deleteHandover,
  deleteTemplate,
  getActivity,
  getAnnounceGroups,
  getAnnounceHistory,
  getCalendar,
  getCash,
  getClosingReport,
  getFunnel,
  getGroupHealth,
  getMemberFeed,
  getMemberStatement,
  getReliability,
  getReminders,
  getSalary,
  getSettlement,
  getTemplates,
  saveSalary,
  saveTemplate,
  searchMembers,
  sendAnnouncement,
  sendReminders,
  setCashStart,
  setDefaultPercent,
} from "../controllers/moreController.js";

const router = express.Router();

router.get("/member-feed", getMemberFeed);
router.get("/reminders", getReminders);
router.post("/reminders/send", sendReminders);
router.get("/group-health", getGroupHealth);
router.get("/closing", getClosingReport);
router.get("/activity", getActivity);
router.get("/calendar", getCalendar);
router.get("/funnel", getFunnel);
router.get("/members/search", searchMembers);
router.get("/members/:userid/statement", getMemberStatement);
router.get("/cash", getCash);
router.post("/cash/handover", addHandover);
router.delete("/cash/handover/:id", deleteHandover);
router.post("/cash/start", setCashStart);
router.get("/salary", getSalary);
router.post("/salary", saveSalary);
router.post("/salary/default", setDefaultPercent);
router.get("/reliability", getReliability);
router.get("/announce/groups", getAnnounceGroups);
router.get("/announce/history", getAnnounceHistory);
router.post("/announce", sendAnnouncement);
router.get("/announce/templates", getTemplates);
router.post("/announce/templates", saveTemplate);
router.delete("/announce/templates/:id", deleteTemplate);
router.delete("/announce/history/:id", deleteAnnouncement);
router.get("/settlement/:id", getSettlement);

export default router;
