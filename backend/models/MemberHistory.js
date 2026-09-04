import mongoose from "mongoose";

const memberHistorySchema = new mongoose.Schema(
  {
    userid: { type: String, required: true },

    // EXISTING FIELD (DO NOT CHANGE)
    // We will now use values:
    // INSTALLMENT_PAYMENT | PENALTY_PAYMENT | CHIT | UPDATE
    type: { type: String, required: true },

    title: { type: String },
    description: { type: String },

    amount: { type: Number },

    status: { type: String }, // success, pending, failed

    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("MemberHistory", memberHistorySchema);
