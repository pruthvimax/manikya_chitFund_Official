import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import connectDB from "./config/db.js";

// Load environment variables
dotenv.config();

// ROUTES - Make sure each is imported only ONCE
import adminRoutes from "./routes/adminRoutes.js";
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
import outstandingRoutes from "./routes/outstandingRoutes.js";
import targetRoutes from "./routes/targetRoutes.js";
import workSheetRoutes from "./routes/workSheetRoutes.js";
import bidRoutes from "./routes/bidRoutes.js";

const app = express();

// ----------------- DEBUG ENV VARIABLES -----------------
console.log("TWILIO_ACCOUNT_SID:", process.env.TWILIO_ACCOUNT_SID ? "Loaded ✅" : "Missing ❌");
console.log("TWILIO_AUTH_TOKEN:", process.env.TWILIO_AUTH_TOKEN ? "Loaded ✅" : "Missing ❌");
console.log("TWILIO_WHATSAPP_FROM:", process.env.TWILIO_WHATSAPP_FROM);

// ----------------- MIDDLEWARE -----------------
app.use(cors());
app.use(express.json());

// ----------------- DATABASE CONNECTION -----------------
connectDB().then((connected) => {
  if (connected) {
    console.log("✅ MongoDB Connected Successfully");
  } else {
    console.warn("⚠️ MongoDB connection unavailable; continuing without database access");
  }
});

// ----------------- ROUTES -----------------
app.use("/api/chitscheme", chitSchemeRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/employee", employeeRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/member-interest", memberInterestRoutes); // Make sure this line exists
app.use("/api/member-history", memberHistoryRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/outstanding", outstandingRoutes);
app.use("/api/leave-request", leaveRequestRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/commitment", commitmentRoutes);
app.use("/api/worksheet", workSheetRoutes);
app.use("/api/enrollment", enrollmentRoutes);
app.use("/api/target", targetRoutes);
app.use("/api/bids", bidRoutes);

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
    }
  });
});

// ----------------- SERVER -----------------
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend running on http://${HOST}:${PORT}`);
  console.log(`🌐 Access from LAN using your laptop IP: http://<YOUR_LAN_IP>:${PORT}`);
});