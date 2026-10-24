import mongoose from "mongoose";

/* =========================================================
   SPIN SESSION

   One document per auction (Notification). The unique index on
   notificationId is what makes the spin atomic: if two requests
   try to start the spin at the same moment, MongoDB lets exactly
   one insert succeed and the other gets a duplicate-key error.

   This model is NEW. It does not touch Bid, Notification, Group
   or Member records.
========================================================= */

const candidateSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true },
    groupMemberId: { type: String, required: true },
    memberName: { type: String, default: "" },
    bidAmount: { type: Number, default: 0 },
    bidTime: { type: Date },
  },
  { _id: false }
);

const auditSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: String, default: "admin" },
    detail: { type: String, default: "" },
  },
  { _id: false }
);

const spinSessionSchema = new mongoose.Schema(
  {
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      unique: true,
    },

    groupObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    // Public group code, e.g. "01B30"
    groupId: { type: String, required: true },
    chitId: { type: String, default: "" },

    auctionEndDate: { type: String, required: true },
    auctionEndTime: { type: String, required: true },

    maxBidAmount: { type: Number, default: 0 },

    // Shown on the winner card. Saved when the spin starts.
    chitValue: { type: Number, default: 0 },
    previousWinningBid: { type: Number, default: 0 },
    // which month / auction this is (1, 2, 3 ...)
    auctionNumber: { type: Number, default: 0 },

    // true when nobody reached the maximum bid and the highest-bid
    // tie was used instead
    usedFallback: { type: Boolean, default: false },

    // Wheel order is fixed and saved, so every device draws the
    // same wheel.
    candidates: { type: [candidateSchema], default: [] },

    winnerIndex: { type: Number, required: true },
    winner: { type: candidateSchema, required: true },

    // RANDOM          -> server picked with a secure random number
    // ADMIN_SELECTED  -> admin chose the member before the spin
    mode: {
      type: String,
      enum: ["RANDOM", "ADMIN_SELECTED"],
      required: true,
    },

    // Animation settings (every device animates locally from these)
    rotations: { type: Number, required: true },
    durationMs: { type: Number, required: true },
    seed: { type: Number, required: true }, // 0..1, stop position inside the winning slice
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },

    startedBy: { type: String, default: "admin" },

    audit: { type: [auditSchema], default: [] },
  },
  { timestamps: true }
);

const SpinSession =
  mongoose.models.SpinSession ||
  mongoose.model("SpinSession", spinSessionSchema);

export default SpinSession;
