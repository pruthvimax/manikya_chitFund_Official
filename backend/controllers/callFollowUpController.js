import CallFollowUp from "../models/CallFollowUp.js";

/* CALL FOLLOW-UP  ->  /api/call-followup
   GET    /api/call-followup                                   -> { success, items }
   PUT    /api/call-followup  { groupId, groupMemberId, memberName, callDate: "YYYY-MM-DD", note }
   DELETE /api/call-followup?groupId=..&groupMemberId=..
   Used by the admin Ledger (Overdue members). Nothing else reads or changes it. */

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const shape = (d) => ({
  id: String(d._id),
  groupId: d.groupId,
  groupMemberId: d.groupMemberId || "",
  memberName: d.memberName || "",
  callDate: d.callDate,
  note: d.note || "",
  updatedAt: d.updatedAt,
});

export const listFollowUps = async (req, res) => {
  try {
    const items = await CallFollowUp.find({}).sort({ callDate: 1 }).lean();
    res.json({ success: true, items: items.map(shape) });
  } catch (err) {
    console.error("CALL FOLLOWUP LIST ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const saveFollowUp = async (req, res) => {
  try {
    const groupId = String(req.body?.groupId || "").trim();
    const groupMemberId = String(req.body?.groupMemberId || "").trim();
    const callDate = String(req.body?.callDate || "").trim();
    const note = String(req.body?.note || "").trim().slice(0, 120);
    const memberName = String(req.body?.memberName || "").trim().slice(0, 80);
    if (!groupId) return res.status(400).json({ success: false, message: "groupId is required" });
    if (!DAY.test(callDate) || isNaN(new Date(`${callDate}T00:00:00Z`).getTime())) {
      return res.status(400).json({ success: false, message: "Choose a valid call date" });
    }
    const expireAt = new Date(new Date(`${callDate}T00:00:00Z`).getTime() + 45 * 24 * 60 * 60 * 1000);
    const doc = await CallFollowUp.findOneAndUpdate(
      { groupId, groupMemberId },
      { $set: { callDate, note, memberName, expireAt } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    res.json({ success: true, item: shape(doc) });
  } catch (err) {
    console.error("CALL FOLLOWUP SAVE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteFollowUp = async (req, res) => {
  try {
    const groupId = String(req.query?.groupId || "").trim();
    const groupMemberId = String(req.query?.groupMemberId || "").trim();
    if (!groupId) return res.status(400).json({ success: false, message: "groupId is required" });
    await CallFollowUp.deleteOne({ groupId, groupMemberId });
    res.json({ success: true });
  } catch (err) {
    console.error("CALL FOLLOWUP DELETE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
