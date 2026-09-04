import mongoose from "mongoose";

/* =========================================================
   VACANCY

   A vacancy is ONLY the extra, vacancy-specific information
   the admin publishes on top of an ALREADY EXISTING
   ChitScheme + Group.

   It deliberately stores NOTHING that already lives in
   ChitScheme or Group:

     - chitAmount / durationMonths / daily-weekly-monthly
       amounts  -> read live from ChitScheme (chitId)
     - capacity / member list / member count
       -> read live from Group (groupId): 
          available = group.totalCollections - group.members.length

   Only chitId and groupId are stored as references.
========================================================= */

const vacancySchema = new mongoose.Schema(
  {
    // -> ChitScheme.chitId  (existing chit, never created here)
    chitId: {
      type: String,
      required: true,
      trim: true,
    },

    // -> Group.groupId      (existing group, never created here)
    groupId: {
      type: String,
      required: true,
      trim: true,
    },

    /* ============ VACANCY-SPECIFIC FIELDS ONLY ============ */

    // Maximum bid percentage allowed for this vacancy
    maxBidPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    // Which existing ChitScheme amount column to quote as the
    // subscription: dailyAmount / weeklyAmount / monthlyAmount.
    // The AMOUNT itself is never stored here - it is read from
    // the ChitScheme so it can never go out of sync.
    frequency: {
      type: String,
      enum: ["Daily", "Weekly", "Monthly"],
      required: true,
    },

    // Free-text vacancy details (optional)
    details: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Open", "Closed"],
      default: "Open",
    },
  },
  { timestamps: true }
);

/* One vacancy per existing chit + group pair */
vacancySchema.index({ chitId: 1, groupId: 1 }, { unique: true });

export default mongoose.model("Vacancy", vacancySchema);
