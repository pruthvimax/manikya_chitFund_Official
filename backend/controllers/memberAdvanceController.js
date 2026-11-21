import Advance from "../models/Advance.js";

/* GET /api/advance/my/:userid
   The advances of ONE member (what the member sees in the app). Read only. */
export const getMyAdvances = async (req, res) => {
  try {
    const userid = String(req.params.userid || "").trim();
    if (!userid) return res.status(400).json({ success: false, message: "userid required" });

    const list = await Advance.find({ userid }).sort({ paidAt: -1 }).lean();
    const items = list.map((a) => ({
      id: String(a._id),
      groupId: a.groupId,
      groupMemberId: a.groupMemberId,
      amount: a.amount,
      remaining: a.remaining,
      nextMonth: (a.afterMonth || 0) + 1,
      applied: (a.applied || []).map((x) => ({ monthIndex: x.monthIndex, amount: x.amount })),
      paidAt: a.paidAt,
    }));
    const waiting = items.filter((i) => i.remaining > 0);
    res.json({
      success: true,
      items,
      totalRemaining: waiting.reduce((s, i) => s + i.remaining, 0),
    });
  } catch (err) {
    console.error("MY ADVANCE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
