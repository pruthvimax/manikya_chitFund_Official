import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const employeeSchema = new mongoose.Schema({
  emp_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  featureAccess: {
  type: Boolean,
  default: true,
},
  createdAt: { type: Date, default: Date.now },
});

/* ✅ HASH PASSWORD BEFORE SAVE */
employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

/* ✅ METHOD TO COMPARE PASSWORD */
employeeSchema.methods.comparePassword = async function (inputPassword) {
  return await bcrypt.compare(inputPassword, this.password);
};

/* ✅ FIX OVERWRITE ERROR */
const Employee =
  mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

export default Employee;