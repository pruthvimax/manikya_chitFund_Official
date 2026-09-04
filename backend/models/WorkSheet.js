import mongoose from "mongoose";

const workSheetSchema = new mongoose.Schema({
  emp_id: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  phoneFollowupsCount: {
    type: Number,
    required: true,
    min: 0,
  },
  phoneFollowupsCustomers: {
    type: String, // Comma separated customer names
    required: true,
  },
  customerVisitsCount: {
    type: Number,
    required: true,
    min: 0,
  },
  customerVisitsDetails: {
    type: String, // Customer names and addresses
    required: true,
  },
  gpsPhotosCount: {
    type: Number,
    required: true,
    min: 0,
  },
  notes: {
    type: String,
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

// Ensure one entry per employee per day
workSheetSchema.index({ emp_id: 1, date: 1 }, { unique: true });

const WorkSheet = mongoose.models.WorkSheet || mongoose.model("WorkSheet", workSheetSchema);

export default WorkSheet;