import mongoose from "mongoose";

/* Saved announcement messages the admin created on the "More > Announcements" page. */
const announcementTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 60 },
    body: { type: String, required: true, maxlength: 240 },
  },
  { timestamps: true }
);

export default mongoose.models.AnnouncementTemplate || mongoose.model("AnnouncementTemplate", announcementTemplateSchema);
