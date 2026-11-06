import mongoose from "mongoose";

/* One document per payment an employee collected from a member.
   It only feeds the member's notification list (/api/more/member-feed).
   Nothing in the existing collections is changed. */
const paymentNoticeSchema = new mongoose.Schema(
  {
    userid: { type: String, required: true, index: true }, // the member (same id the app logs in with)
    groupId: { type: String, default: "" }, // group code, e.g. 01B30
    groupMemberId: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    paymentType: { type: String, default: "INSTALLMENT" },
    paymentMode: { type: String, default: "" },
    collectedBy: { type: String, default: "" },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.PaymentNotice || mongoose.model("PaymentNotice", paymentNoticeSchema);
