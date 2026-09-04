import mongoose from "mongoose";

const receiptCounterSchema = new mongoose.Schema({
  _id: { type: String }, // DDMMYY-GRPID
  seq: { type: Number, default: 0 },
});

export default mongoose.model("ReceiptCounter", receiptCounterSchema);
