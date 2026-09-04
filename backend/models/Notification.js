import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },

    // AUCTION END DATE
    // Format: DD-MM-YYYY
    auctionEndDate: {
      type: String,
      required: true,
    },

    // AUCTION END TIME
    // Format: HH:MM
    auctionEndTime: {
      type: String,
      required: true,
    },

    // =========================================================
    // BID LIMITS (Admin manually sets)
    // =========================================================

    // Minimum / starting bid amount
    minBidAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Maximum / ending bid amount
    maxBidAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    message: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      default: "active",
    },

    // =========================================================
    // WINNER DETAILS (Admin manually enters after auction ends)
    // =========================================================

    // Winner member name
    winnerName: {
      type: String,
      default: "",
    },

    // Winner member / user ID
    winnerId: {
      type: String,
      default: "",
    },

    // Winner group ID number
    winnerGroupId: {
      type: String,
      default: "",
    },

    // Winner bid amount
    winnerBidAmount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Notification",
  notificationSchema
);