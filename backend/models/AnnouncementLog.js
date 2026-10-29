import mongoose from "mongoose";

/* History of the push announcements sent from the admin "More" page. */
const announcementLogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    audience: { type: String, default: "all" }, // all | groups | overdue
    groups: { type: [String], default: [] },
    members: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    // the members it was meant for (group / overdue announcements); "all" needs none
    memberIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.AnnouncementLog || mongoose.model("AnnouncementLog", announcementLogSchema);
