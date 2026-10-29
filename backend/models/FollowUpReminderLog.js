import mongoose from "mongoose";

/* One document per employee per day: which due follow-ups were already
   pushed to that employee's phone today, so nothing is sent twice. */
const schema = new mongoose.Schema(
  {
    empId: { type: String, required: true },
    day: { type: String, required: true }, // YYYY-MM-DD (India time)
    notifiedIds: { type: [String], default: [] },
  },
  { timestamps: true }
);
schema.index({ empId: 1, day: 1 }, { unique: true });
// the log only matters for the day itself; clean up after 3 days
schema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * 24 * 60 * 60 });

export default mongoose.model("FollowUpReminderLog", schema);
