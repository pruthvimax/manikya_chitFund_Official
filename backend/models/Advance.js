import mongoose from "mongoose";

/* One document per extra amount (advance) a member paid to an employee.
   New collection: nothing in the existing collections is changed by this model itself. */
const advanceSchema = new mongoose.Schema(
  {
    userid: { type: String, required: true, index: true }, // the member
    memberName: { type: String, default: "" },
    groupId: { type: String, required: true, index: true }, // group code, e.g. 01B30
    groupMemberId: { type: String, required: true }, // the seat inside that group

    amount: { type: Number, required: true }, // extra amount received
    remaining: { type: Number, required: true }, // still waiting to be added to a month
    afterMonth: { type: Number, default: 0 }, // it was collected while paying this month; goes to later months
    status: { type: String, default: "waiting" }, // waiting | partial | applied

    paymentMode: { type: String, default: "Cash" },
    employeeId: { type: String, default: "" },
    employeeName: { type: String, default: "" },
    employeePhone: { type: String, default: "" },
    paidAt: { type: Date, default: Date.now },

    applied: {
      type: [
        {
          monthIndex: { type: Number },
          amount: { type: Number },
          at: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.models.Advance || mongoose.model("Advance", advanceSchema);
