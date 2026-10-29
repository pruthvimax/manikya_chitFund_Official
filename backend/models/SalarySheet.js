import mongoose from "mongoose";

/* One salary line per employee per month (admin typed values only). */
const salarySheetSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true },
    month: { type: String, required: true }, // YYYY-MM
    baseSalary: { type: Number, default: 0 },
    incentivePercent: { type: Number, default: 1 },
    bonus: { type: Number, default: 0 },
    deduction: { type: Number, default: 0 },
    note: { type: String, default: "" },
    paid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

salarySheetSchema.index({ empId: 1, month: 1 }, { unique: true });

export default mongoose.models.SalarySheet || mongoose.model("SalarySheet", salarySheetSchema);
