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
    // FIXED: this field didn't exist on the schema at all -- even
    // though the frontend sends `telephone`, and the controller now
    // passes it through, Mongoose silently drops any field that isn't
    // declared here. This is the piece that actually makes it save.
    // Optional (no `required`), since it's the landline/telephone
    // number employees fill in only when they have one -- not every
    // lead will have one, unlike the mandatory Phone Number above.
    telephone: { type: String, trim: true, default: "" },
    occupation: { type: String, trim: true, default: "" },
    workAddress: { type: String, trim: true, default: "" },
    permanentAddress: { type: String, trim: true, default: "" },

    action: {
      type: String,
      enum: ["Hot", "Warm", "Cold"],
      default: "Warm",
    },

    // FOLLOW-UP: the date (date only, "YYYY-MM-DD") the lead asked to be
    // contacted again. Kept as a plain string so there is no time-zone
    // shift. followUpDone is set by the employee ("Mark done"); when the
    // admin changes the date it is reset to pending again.
    followUpDate: { type: String, trim: true, default: "" },
    followUpDone: { type: Boolean, default: false },
    followUpDoneAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("DailyDatabase", dailyDatabaseSchema);