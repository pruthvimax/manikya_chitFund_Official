import mongoose from "mongoose";

const interestedMemberSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      length: 10,
    },

    email: {
      type: String,
      default: null,
    },

    aadhaarNumber: {
      type: String,
      required: true,
      length: 12,
    },

    address: {
      type: String,
      default: null,
    },

    interestDate: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      default: "pending", // pending | contacted | approved
    },
  },
  { timestamps: true }
);

export default mongoose.model("InterestedMember", interestedMemberSchema);
