import mongoose from "mongoose";

/* =========================================================
   SPIN ANNOUNCEMENT
   The admin tells a group's members WHEN the live spin will
   start. One active record per auction notification. The
   reminder worker (realtime/spinReminders.js) reads it to send
   the 10 min / 5 min / 2 min / 1 min / 30 sec reminders.
========================================================= */
const spinAnnouncementSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    groupMongoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    groupCode: { type: String, default: "" },

    // what the admin typed (India time)
    spinDate: { type: String, required: true }, // DD-MM-YYYY
    spinTime: { type: String, required: true }, // HH:MM (24 hour)
    spinAt: { type: Date, required: true },

    status: {
      type: String,
      enum: ["active", "cancelled", "done"],
      default: "active",
      index: true,
    },

    // which messages have already gone out
    sent: {
      now: { type: Boolean, default: false },
      m10: { type: Boolean, default: false },
      m1: { type: Boolean, default: false },
      m5: { type: Boolean, default: false },
      m2: { type: Boolean, default: false },
      s30: { type: Boolean, default: false },
    },
    notifiedCount: { type: Number, default: 0 },

    // true  = the server starts the spin by itself when spinAt arrives
    // false = it waits for the admin to press Start (manual spin)
    autoSpin: { type: Boolean, default: false },
    // auto spin only: "" = random draw, otherwise the member the admin picked
    autoTargetId: { type: String, default: "" },
    autoSpinTriggered: { type: Boolean, default: false },
    autoSpinResult: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("SpinAnnouncement", spinAnnouncementSchema);
