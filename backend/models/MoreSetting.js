import mongoose from "mongoose";

/* Small key/value settings used only by the admin "More" page
   (cash tracking start date, default incentive %). */
const moreSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.MoreSetting || mongoose.model("MoreSetting", moreSettingSchema);
