import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
  userid: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  aadhaar: { type: String, required: true },
  joiningDate: { type: Date, default: Date.now },
  lastLogin: { type: Date }, // ✅ NEW (real-time login)
  status: { type: String, enum: ["active", "inactive"], default: "active" },
});

// ✅ ONLY THIS
const Member =
  mongoose.models.Member || mongoose.model("Member", memberSchema);

// ✅ EXPORT THIS (NOT mongoose.model again)
export default Member;