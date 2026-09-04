import mongoose from "mongoose";

/* ================= PAYMENT ================= */
const paymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },

  paidAt: {
    type: Date,
    default: Date.now,
  },

  collectedBy: {
    type: String,
  },

  employeeId: {
    type: String,
    default: "",
  },

  employeeName: {
    type: String,
    default: "",
  },

  paymentMode: {
    type: String,
    enum: ["Cash", "UPI", "Cheque", "AC"],
    default: "Cash",
  },

  paymentType: {
    type: String,
    enum: ["INSTALLMENT", "PENALTY"],
    default: "INSTALLMENT",
  },
});


/* ================= COLLECTION ================= */
const collectionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },

    // ❗ NOT required (added later when plan is set)
    installmentAmount: { type: Number },
    endDate: { type: Date },

    amount: { type: Number, default: null },
    payments: { type: [paymentSchema], default: [] },

    penalty: {
      percentage: { type: Number, default: 6 },
      amount: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

/* ================= GROUP MEMBER ================= */
const groupMemberSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true },
    groupMemberId: { type: String, required: true },
    collections: { type: [collectionSchema], default: [] },
  },
  { _id: false }
);

/* ================= GROUP ================= */
const groupSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true },
    chitId: { type: String, required: true },
    totalCollections: { type: Number, required: true },

    members: { type: [groupMemberSchema], default: [] },

    // Admin plan (source of truth)
    collectionPlans: [
      {
        monthIndex: Number,
        startDate: Date,
        endDate: Date,
        installmentAmount: Number,
        dividend: { type: Number, default: 0 },
      },
    ],
  },
  { timestamps: true }
);

groupSchema.index({ groupId: 1, chitId: 1 }, { unique: true });

export default mongoose.model("Group", groupSchema);
