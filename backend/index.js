import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

// ROUTES - Make sure each is imported only ONCE
import adminRoutes from "./routes/adminRoutes.js";
import ledgerRoutes from "./routes/ledgerRoutes.js";
import moreRoutes from "./routes/moreRoutes.js";
import chitSchemeRoutes from "./routes/chitSchemeRoutes.js";
import commitmentRoutes from "./routes/commitmentRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import leaveRequestRoutes from "./routes/leaveRequestRoutes.js";
import meetingRoutes from "./routes/meetingRoutes.js";
import memberHistoryRoutes from "./routes/memberHistoryRoutes.js";
import memberInterestRoutes from "./routes/memberInterestRoutes.js";
import memberRoutes from "./routes/memberRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import contactRequestRoutes from "./routes/contactRequestRoutes.js";
import outstandingRoutes from "./routes/outstandingRoutes.js";
import targetRoutes from "./routes/targetRoutes.js";
import workSheetRoutes from "./routes/workSheetRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";
import vacancyRoutes from "./routes/vacancyRoutes.js";
import dailyDatabaseRoutes from "./routes/dailyDatabaseRoutes.js";
import http from "http";
import { initSocket } from "./realtime/socket.js";
import spinnerRoutes from "./routes/spinnerRoutes.js";
import penaltyWaiverRoutes, { penaltyWaiverReportRouter } from "./routes/penaltyWaiverRoutes.js";
import { liveBadgeMiddleware } from "./realtime/liveBadges.js";
import { startSpinReminders } from "./realtime/spinReminders.js";
import { startAutoSpin } from "./realtime/autoSpin.js";
import { startFollowUpReminders } from "./realtime/followUpReminders.js";
import { employeeAccessMiddleware } from "./realtime/employeeAccess.js";
import pushRoutes from "./routes/pushRoutes.js";
import dailyFollowUpRoutes from "./routes/dailyFollowUpRoutes.js";
import employeeNoticeRoutes from "./routes/employeeNoticeRoutes.js";
import { employeeNoticeMiddleware, employeeVacancyMiddleware } from "./realtime/employeeNotices.js";


const app = express();

// ----------------- DEBUG ENV VARIABLES -----------------

console.log(
  "TWILIO_ACCOUNT_SID:",
  process.env.TWILIO_ACCOUNT_SID ? "Loaded ✅" : "Missing ❌"
);

console.log(
  "TWILIO_AUTH_TOKEN:",
  process.env.TWILIO_AUTH_TOKEN ? "Loaded ✅" : "Missing ❌"
);

console.log("TWILIO_WHATSAPP_FROM:", process.env.TWILIO_WHATSAPP_FROM);

// ----------------- MIDDLEWARE -----------------

app.use(cors());
app.use(express.json());

// ----------------- DATABASE CONNECTION -----------------

connectDB().then((connected) => {
  if (connected) {
    console.log("✅ MongoDB Connected Successfully");
  } else {
    console.warn(
      "⚠️ MongoDB connection unavailable; continuing without database access"
    );
  }
});

// ----------------- ROUTES -----------------

app.use("/api/chitscheme", chitSchemeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/more", moreRoutes);

app.use("/api/employee", employeeAccessMiddleware);
app.use("/api/employee", employeeRoutes);
app.use("/api/members", memberRoutes);

// live badges: ping phones when an interested-member request is added / changed (admin bell)
app.use("/api/member-interest", liveBadgeMiddleware("interest"));
app.use("/api/member-interest", memberInterestRoutes);
app.use("/api/member-history", memberHistoryRoutes);
// employee bell + push: notices when admin approves/rejects, or a vacancy is published (no logic change)
app.use("/api/leave-request", employeeNoticeMiddleware("leave"));
app.use("/api/target", employeeNoticeMiddleware("target"));
app.use("/api/meeting", employeeNoticeMiddleware("meeting"));
app.use("/api/worksheet", employeeNoticeMiddleware("worksheet"));
app.use("/api/enrollment", employeeNoticeMiddleware("enrollment"));
app.use("/api/commitment", employeeNoticeMiddleware("commitment"));
app.use("/api/vacancy", employeeVacancyMiddleware);
app.use("/api/employee-notices", employeeNoticeRoutes);
// live badges: ping phones after notification / vacancy changes (no logic change)
app.use("/api/notifications", liveBadgeMiddleware("notifications"));
app.use("/api/vacancy", liveBadgeMiddleware("vacancy"));
app.use("/api/contact-requests", liveBadgeMiddleware("contact"));
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/contact-requests", contactRequestRoutes);
app.use("/api/outstanding", outstandingRoutes);
app.use("/api/leave-request", leaveRequestRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/commitment", commitmentRoutes);
app.use("/api/worksheet", workSheetRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/target", targetRoutes);
app.use("/api/bids", bidRoutes);
app.use("/api/vacancy", vacancyRoutes);
// follow-up reminders (Daily Leads): ping phones on any lead change so the
// employee's red badge updates instantly; follow-ups router goes first
app.use("/api/daily-database", liveBadgeMiddleware("followups"));
app.use("/api/daily-database/follow-ups", dailyFollowUpRoutes);
app.use("/api/daily-database", dailyDatabaseRoutes);
app.use("/api/spinner", spinnerRoutes);
app.use("/api/push", pushRoutes);
app.use("/api/groups", penaltyWaiverRoutes);
app.use("/api/penalty-waivers", penaltyWaiverReportRouter);

// ----------------- TEST ROUTE -----------------

app.get("/", (req, res) => {
  res.send("✅ Manikya Backend Running Successfully 🚀");
});

// Test route for leave requests
app.get("/api/check-leave", (req, res) => {
  res.json({
    message: "Leave routes are mounted",
    endpoints: {
      getAll: "/api/leave-request/",
      getEmployee: "/api/leave-request/employee/:emp_id",
      add: "/api/leave-request/add",
      delete: "/api/leave-request/:id",
      updateStatus: "/api/leave-request/:id/status",
    },
  });
});

// ----------------- SERVER -----------------

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

const httpServer = http.createServer(app);
initSocket(httpServer);
startSpinReminders();
startAutoSpin();
startFollowUpReminders();
httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Backend running on http://${HOST}:${PORT}`);
  console.log(
    `🌐 Access from LAN using your laptop IP: http://<YOUR_LAN_IP>:${PORT}`
  );
});
