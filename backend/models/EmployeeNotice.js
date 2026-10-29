import mongoose from "mongoose";

/* One notice for one employee (shown in the bell on the employee app).
   Old ones are removed automatically after 30 days. */
const employeeNoticeSchema = new mongoose.Schema(
  {
    emp_id: { type: String, required: true, index: true },
    kind: { type: String, default: "" }, // leave | target | meeting | worksheet | enrollment | commitment | vacancy
    title: { type: String, required: true },
    body: { type: String, default: "" },
    route: { type: String, default: "/employee" },
    refId: { type: String, default: "", index: true }, // id of the leave / target / vacancy ... that caused it
    tone: { type: String, default: "info" }, // good | bad | info
    createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
  },
  { versionKey: false }
);

export default mongoose.model("EmployeeNotice", employeeNoticeSchema);
