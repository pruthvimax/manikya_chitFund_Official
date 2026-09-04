import mongoose from "mongoose";

const leaveRequestSchema = new mongoose.Schema({
  emp_id: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  leaveType: {
    type: String,
    required: true,
  },
  fromDate: {
    type: Date,
    required: true,
  },
  toDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    required: true,
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
});

const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model("LeaveRequest", leaveRequestSchema);

export default LeaveRequest;