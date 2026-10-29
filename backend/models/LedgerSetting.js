import mongoose from "mongoose";

/* One document: the Ledger page password (stored as a hash).
   No document = the default password (env LEDGER_PASSWORD, else 7259).
   Delete this document in MongoDB to reset to the default. */
const schema = new mongoose.Schema(
  {
    key: { type: String, default: "ledger", unique: true },
    passwordHash: { type: String, default: "" },
    changedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("LedgerSetting", schema);
