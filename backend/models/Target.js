import mongoose from "mongoose";

const targetSchema = new mongoose.Schema({
  // Employee Details
  emp_id: {
    type: String,
    required: true,
  },
  employeeName: {
    type: String,
    required: true,
  },
  
  // Target Details - Most fields are now optional with defaults
  date: {
    type: Date,
    default: Date.now,
  },
  customerName: {
    type: String,
    default: "Monthly Target", // Default for admin-created targets
  },
  phoneNumber: {
    type: String,
    default: "0000000000",
  },
  chitAmount: {
    type: String,
    required: true, // This is the main target amount field
  },
  durationOfPayment: {
    type: String,
    default: "N/A", // Default for admin-created targets
  },
  totalEnroll: {
    type: Number,
    default: 0,
  },
  totalGB: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    default: "Cash",
  },
  collectionAmount: {
    type: Number,
    default: 0,
  },
  backup: {
    type: String,
    default: "",
  },
  
  // Admin Editable Fields
  salaryAmount: {
    type: Number,
    default: 0,
  },
  incentive: {
    type: Number,
    default: 0,
  },
  
  // Status & Approval
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  
  // Edit Tracking
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
  editHistory: [
    {
      field: String,
      oldValue: mongoose.Schema.Types.Mixed,
      newValue: mongoose.Schema.Types.Mixed,
      editedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  
  // Approval Details
  approvedBy: {
    type: String,
  },
  approvedAt: {
    type: Date,
  },
  
  
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  isFrozen: {
  type: Boolean,
  default: false,
},
});

const Target = mongoose.models.Target || mongoose.model("Target", targetSchema);

export default Target;