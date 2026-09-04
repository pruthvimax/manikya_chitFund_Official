import mongoose from "mongoose";

const commitmentSchema = new mongoose.Schema({
  emp_id: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  customerType: {
    type: String,
    enum: ["Hot", "Warm", "Cold"],
    required: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  commitmentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  commitmentTime: {
    type: String, // Format: "10:00 AM"
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Completed", "Cancelled"],
    default: "Pending",
  },
  followUpDate: {
    type: Date,
  },
  notes: {
    type: String,
    default: "",
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

const Commitment = mongoose.models.Commitment || mongoose.model("Commitment", commitmentSchema);

export default Commitment;