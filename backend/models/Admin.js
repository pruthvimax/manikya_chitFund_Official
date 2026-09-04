import mongoose from "mongoose";

const AdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true, unique: true },
  otp: { type: String },        // temporary OTP
  otpExpires: { type: Date },   // expiry timestamp
});

export default mongoose.model("Admin", AdminSchema);
