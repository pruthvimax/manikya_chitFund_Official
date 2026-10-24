import mongoose from "mongoose";

/* One document per phone (Expo push token). */
const pushTokenSchema = new mongoose.Schema(
  {
    userid: { type: String, required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, default: "" },
    // number shown on the app icon; +1 for every push, set by the phone when it syncs
    badge: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("PushToken", pushTokenSchema);
