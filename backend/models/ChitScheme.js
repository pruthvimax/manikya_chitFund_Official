import mongoose from "mongoose";

const chitSchemeSchema = new mongoose.Schema(
  {
    chitId: {
      type: String,
      required: true,
      unique: true,
    },
    chitAmount: {
      type: Number,
      required: true,
    },
    durationMonths: {
      type: Number,
      required: true,
    },
    dailyAmount: {
      type: Number,
      required: true,
    },
    weeklyAmount: {
      type: Number,
      required: true,
    },
    monthlyAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChitScheme", chitSchemeSchema);
