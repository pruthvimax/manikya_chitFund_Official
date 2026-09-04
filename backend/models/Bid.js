import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    groupId: {
      type: String,
      required: true,
      index: true,
    },

    chitId: {
      type: String,
      required: true,
    },

    memberId: {
      type: String,
      required: true,
      index: true,
    },

    groupMemberId: {
      type: String,
      required: true,
    },

    bidAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    auctionDate: {
      type: String,
      required: true,
    },

    auctionTime: {
      type: String,
      required: true,
    },

    bidTime: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Bid =
  mongoose.models.Bid ||
  mongoose.model("Bid", bidSchema);

export default Bid;