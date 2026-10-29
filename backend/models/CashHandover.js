import mongoose from "mongoose";

/* Admin writes here when an employee hands the collected CASH to the office.
   Payments themselves are never changed. */
const cashHandoverSchema = new mongoose.Schema(
  {
    empId: { type: String, default: "", index: true },
    empName: { type: String, default: "" },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, default: "" },
    at: { type: Date, default: Date.now, index: true },
    receivedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

export default mongoose.models.CashHandover || mongoose.model("CashHandover", cashHandoverSchema);
