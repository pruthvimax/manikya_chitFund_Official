import ReceiptCounter from "../models/ReceiptCounter.js";

export async function generateReceiptNo(groupCode) {
  const now = new Date();

  const DD = String(now.getDate()).padStart(2, "0");
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const YY = String(now.getFullYear()).slice(-2);

  const datePart = `${DD}${MM}${YY}`;
  const key = `${datePart}-${groupCode}`;

  const counter = await ReceiptCounter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  const seq = String(counter.seq).padStart(3, "0");

  return `MNK-${datePart}-${groupCode}-${seq}`;
}
