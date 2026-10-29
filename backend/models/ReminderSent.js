import mongoose from "mongoose";

/* One line each time the admin sends a payment reminder to a member from the
   "Reminder Centre". It keeps the card text as it was sent, so the member's
   bell page shows it until the member clears it. Removed by itself after 90 days. */
const reminderSentSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true, index: true },
    sentAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 },
    items: {
      type: [
        {
          groupId: String,
          groupMemberId: String,
          status: String,
          pending: Number,
          months: Number,
          dueText: String,
          days: Number,
          sentence: String,
          _id: false,
        },
      ],
      default: [],
    },
  },
  { versionKey: false }
);

export default mongoose.models.ReminderSent || mongoose.model("ReminderSent", reminderSentSchema);
