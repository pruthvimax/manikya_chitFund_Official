import mongoose from "mongoose";

/* =========================================================
   DAILY DATABASE (employee field-visit lead entries)

   Each entry is one prospective customer an employee met during
   the day — name, phone, occupation, where they work/run their
   shop, their permanent address, and a Hot/Warm/Cold follow-up
   rating the employee assigns on the spot.

   empId + employeeName are both stored on the entry itself (not
   just a reference) so the admin "employees summary" list can be
   built with a single aggregate query, without an extra join back
   to the Employee collection every time.
========================================================= */

const dailyDatabaseSchema = new mongoose.Schema(
  {
    empId: { type: String, required: true, index: true, trim: true },
    employeeName: { type: String, required: true, trim: true },

    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    occupation: { type: String, trim: true, default: "" },
    workAddress: { type: String, trim: true, default: "" },
    permanentAddress: { type: String, trim: true, default: "" },

    action: {
      type: String,
      enum: ["Hot", "Warm", "Cold"],
      default: "Warm",
    },
  },
  { timestamps: true }
);

export default mongoose.model("DailyDatabase", dailyDatabaseSchema);
