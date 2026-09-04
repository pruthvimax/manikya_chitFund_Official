import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  emp_id: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  meetingType: {
    type: String,
    enum: ["Morning", "Afternoon", "Evening"],
    required: true,
  },
  duration: {
    type: String, // Free text like "20 mins", "30 mins"
    required: true,
  },
  startTime: {
    type: String, // Format: "09:00 AM"
    required: true,
  },
  endTime: {
    type: String, // Format: "10:00 AM"
    required: true,
  },
  meetingDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  promotionPlans: {
    type: String, // Textarea for detailed plan
    required: true,
  },
  membersPresent: {
    type: String, // Comma separated names or text
    required: true,
  },
  agenda: {
    type: String, // Topics discussed
    default: "",
  },
  outcome: {
    type: String, // Meeting decisions
    default: "",
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Meeting = mongoose.models.Meeting || mongoose.model("Meeting", meetingSchema);

export default Meeting;