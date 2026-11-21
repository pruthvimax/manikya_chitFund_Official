import Group from "../models/Group.js";
import { emitToAll } from "../realtime/socket.js";
import { runAdvanceSync } from "./advanceController.js";
import { checkMemberDividend } from "../utils/memberDividend.js";

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * PUT /api/groups/:groupId/members/:groupMemberId/dividend/:monthIndex
 * body: { dividend: number, by?: string }
 *
 * Changes the dividend of ONE member for ONE month (other members keep the group's dividend).
 * - the dividend can go down (member pays more) or up (member pays less)
 * - it can never be more than the month's installment, and never more than what the member
 *   still owes for that month (installment - already paid), so a paid installment cannot be
 *   pushed above the installment amount.
 * - setting it back to the group's dividend removes the change.
 * Payments are never touched.
 */
export const setMemberDividend = async (req, res) => {
  try {
    const { groupId, groupMemberId, monthIndex } = req.params;
    const by = String(req.body?.by || "Admin").trim() || "Admin";
    const wanted = r2(req.body?.dividend);

    if (req.body?.dividend === undefined || req.body?.dividend === null || req.body?.dividend === "" || !Number.isFinite(wanted) || wanted < 0) {
      return res.status(400).json({ message: "Enter a valid dividend amount (0 or more)" });
    }

    const group = await Group.findOne({ groupId }).lean();
    if (!group) return res.status(404).json({ message: "Group not found" });

    const plan = (group.collectionPlans || []).find((p) => Number(p.monthIndex) === Number(monthIndex));
    const member = (group.members || []).find((m) => m.groupMemberId === groupMemberId);
    if (!member) return res.status(404).json({ message: "Member not found" });
    const month = (member.collections || []).find((c) => Number(c.index) === Number(monthIndex));
    if (!month) return res.status(404).json({ message: "Month not found" });

    const installment = Number(plan?.installmentAmount ?? month.installmentAmount ?? 0);
    const groupDividend = Number(plan?.dividend || 0);

    const check = checkMemberDividend({ installment, groupDividend, month, plan, wanted });
    if (!check.ok) {
      return res.status(check.status || 400).json({ message: check.message, maxAllowed: check.maxAllowed });
    }
    const current = check.current;

    const clear = check.clear;
    const set = {
      "members.$[m].collections.$[c].dividendOverride": clear ? null : wanted,
      "members.$[m].collections.$[c].dividendEditedBy": clear ? "" : by,
      "members.$[m].collections.$[c].dividendEditedAt": clear ? null : new Date(),
    };

    await Group.updateOne(
      { _id: group._id },
      {
        $set: set,
        $push: { "members.$[m].collections.$[c].dividendLog": { from: current, to: wanted, by, at: new Date() } },
      },
      { arrayFilters: [{ "m.groupMemberId": groupMemberId }, { "c.index": Number(monthIndex) }] }
    );

    try {
      await runAdvanceSync(groupId);
    } catch (e) {
      console.error("MEMBER DIVIDEND ADVANCE SYNC ERROR:", e?.message || e);
    }
    try {
      emitToAll("live:changed", { topic: "groups", method: "PUT" });
    } catch {}

    return res.json({
      message: "Dividend updated",
      groupMemberId,
      monthIndex: Number(monthIndex),
      dividend: wanted,
      groupDividend,
      overridden: !clear,
    });
  } catch (err) {
    console.error("MEMBER DIVIDEND ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
