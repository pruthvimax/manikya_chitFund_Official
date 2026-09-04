import mongoose from "mongoose";

/* =========================================================
   VACANCY SUBSCRIPTION REQUEST

   Created when a MEMBER taps [ Subscribe ].

   IMPORTANT:
   Creating this document does NOT add the member to the
   group. The admin must still add the member manually
   through the EXISTING group-member API. Only after that
   does this request move Pending -> Approved.

   NO member details are copied here. Only memberId
   (= Member.userid) is stored; the name / phone / address
   are read live from the existing Member collection every
   time a request is displayed, so nothing can drift.
========================================================= */

const vacancyRequestSchema = new mongoose.Schema(
  {
    vacancyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vacancy",
      required: true,
    },

    // -> ChitScheme.chitId
    chitId: {
      type: String,
      required: true,
      trim: true,
    },

    // -> Group.groupId
    groupId: {
      type: String,
      required: true,
      trim: true,
    },

    // -> Member.userid  (resolved by the BACKEND, never trusted
    //    from whatever the frontend claims the member is called)
    memberId: {
      type: String,
      required: true,
      trim: true,
    },

    requestDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // Set only after the admin has actually added the member
    // to the group with the existing group-member API.
    approvedGroupMemberId: {
      type: String,
      default: "",
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // Marks whether the admin has opened this request yet
    // (drives the red badge on the Vacancy Notification card).
    seenByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* A member cannot raise two requests for the same vacancy */
vacancyRequestSchema.index(
  { vacancyId: 1, memberId: 1 },
  { unique: true }
);

export default mongoose.model(
  "VacancyRequest",
  vacancyRequestSchema
);
