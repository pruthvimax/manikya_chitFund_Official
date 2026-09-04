import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
  // Chit Details
  chitAmount: {
    type: String,
    required: true,
  },
  chitDuration: {
    type: String,
    required: true,
  },
  chitTotalMembers: {
    type: String,
    required: true,
  },
  chitMonthlyAmount: {
    type: String,
    required: true,
  },
  collectionType: {
    type: String,
    enum: ["Daily", "Monthly"],
    required: true,
  },
  
  // Customer Details
  customerName: {
    type: String,
    required: true,
  },
  fatherHusbandName: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  
  // Nominee Details
  nomineeName: {
    type: String,
    required: true,
  },
  nomineeRelationship: {
    type: String,
    required: true,
  },
  nomineeAddress: {
    type: String,
    required: true,
  },
  nomineeAadharNumber: {
    type: String,
    required: true,
  },
  
  // Customer Documents
  aadharNumber: {
    type: String,
    required: true,
  },
  panNumber: {
    type: String,
    required: true,
  },
  occupation: {
    type: String,
    required: true,
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  
  // Enrollment Details
  enrollmentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  enrolledByEmpId: {
    type: String,
    required: true,
  },
  enrolledByEmpName: {
    type: String,
    required: true,
  },
  
  // Payment Details
  advancePaid: {
    type: String,
    required: true,
  },
  paymentType: {
    type: String,
    enum: ["Cash", "Cheque", "NEFT", "Online Banking", "Netbanking"],
    required: true,
  },
  
  // Status
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

const Enrollment = mongoose.models.Enrollment || mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;