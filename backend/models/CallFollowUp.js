import mongoose from "mongoose";

/* "Call this member on this day" - set by the admin in the Ledger overdue list.
   One per group seat. Removed by itself 45 days after the call date. */
const callFollowUpSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true }, // group code, e.g. 01B30
    groupMemberId: { type: String, default: "" }, // the seat inside that group
    memberName: { type: String, default: "" },
    callDate: { type: String, required: true }, // YYYY-MM-DD
    note: { type: String, default: "" }, // optional
    expireAt: { type: Date, required: true },
  },
  { timestamps: true }
);

callFollowUpSchema.index({ groupId: 1, groupMemberId: 1 }, { unique: true });
callFollowUpSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.CallFollowUp || mongoose.model("CallFollowUp", callFollowUpSchema);
