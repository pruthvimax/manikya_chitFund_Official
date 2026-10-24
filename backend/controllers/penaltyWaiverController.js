import Group from "../models/Group.js";
import Member from "../models/Member.js";

/**
 * PUT /api/groups/:groupId/members/:groupMemberId/penalty-waiver/:monthIndex
 * body: { waived: true | false, by?: string }
 *
 * Switches the penalty OFF (waived = true) or back ON (waived = false) for
 * ONE member and ONE month. Nothing else is changed: payments (including any
 * penalty the member already paid) stay exactly as they are.
 */
export const setPenaltyWaiver = async (req, res) => {
  try {
    const { groupId, groupMemberId, monthIndex } = req.params;
    const waived = req.body?.waived === true || req.body?.waived === "true";
    const by = String(req.body?.by || "Admin").trim() || "Admin";

    const group = await Group.findOne({ groupId });
    if (!group) return res.status(404).json({ message: "Group not found" });

    const member = group.members.find((m) => m.groupMemberId === groupMemberId);
    if (!member) return res.status(404).json({ message: "Member not found" });

    const month = member.collections.find((c) => c.index === Number(monthIndex));
    if (!month) return res.status(404).json({ message: "Month not found" });

    const penaltyPaid = (month.payments || [])
      .filter((p) => p.paymentType === "PENALTY")
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    month.penaltyWaived = waived;
    month.penaltyWaivedBy = waived ? by : "";
    month.penaltyWaivedAt = waived ? new Date() : null;

    if (!Array.isArray(month.penaltyWaiverLog)) month.penaltyWaiverLog = [];
    month.penaltyWaiverLog.push({
      action: waived ? "WAIVED" : "RESTORED",
      by,
      at: new Date(),
      penaltyPaidAtThatTime: penaltyPaid,
    });

    await group.save();

    return res.json({
      message: waived ? "Penalty switched OFF" : "Penalty switched ON",
      penaltyWaived: waived,
      monthIndex: Number(monthIndex),
      groupMemberId,
    });
  } catch (err) {
    console.error("PENALTY WAIVER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/penalty-waivers
 * Audit list: every month where the admin switched the penalty OFF (or later
 * back ON), with who / when and the penalty already paid at that moment.
 */
export const getPenaltyWaiverReport = async (req, res) => {
  try {
    // Only load groups that really have a waived month / waiver history, and
    // only the few fields this list needs (the full group documents with every
    // payment made this call slow). The per-month filter below is unchanged.
    const groups = await Group.find(
      {
        members: {
          $elemMatch: {
            collections: {
              $elemMatch: {
                $or: [
                  { penaltyWaived: true },
                  { "penaltyWaiverLog.0": { $exists: true } },
                ],
              },
            },
          },
        },
      },
      {
        groupId: 1,
        chitId: 1,
        "members.memberId": 1,
        "members.groupMemberId": 1,
        "members.collections.index": 1,
        "members.collections.penaltyWaived": 1,
        "members.collections.penaltyWaivedBy": 1,
        "members.collections.penaltyWaivedAt": 1,
        "members.collections.penaltyWaiverLog": 1,
        "members.collections.payments.paymentType": 1,
        "members.collections.payments.amount": 1,
      }
    ).lean();

    const rows = [];
    const memberIds = new Set();

    groups.forEach((g) => {
      (g.members || []).forEach((m) => {
        (m.collections || []).forEach((c) => {
          const log = Array.isArray(c.penaltyWaiverLog) ? c.penaltyWaiverLog : [];
          if (!c.penaltyWaived && log.length === 0) return;

          const penaltyPaid = (c.payments || [])
            .filter((p) => p.paymentType === "PENALTY")
            .reduce((sum, p) => sum + (p.amount || 0), 0);

          memberIds.add(String(m.memberId));
          rows.push({
            groupId: g.groupId,
            chitId: g.chitId,
            memberId: m.memberId,
            groupMemberId: m.groupMemberId,
            monthIndex: c.index,
            waivedNow: Boolean(c.penaltyWaived),
            waivedBy: c.penaltyWaivedBy || "",
            waivedAt: c.penaltyWaivedAt || null,
            penaltyPaid,
            log,
          });
        });
      });
    });

    const members = await Member.find(
      { userid: { $in: [...memberIds] } },
      { userid: 1, username: 1 }
    ).lean();
    const nameById = {};
    members.forEach((m) => {
      nameById[String(m.userid)] = m.username || "";
    });

    rows.forEach((r) => {
      r.memberName = nameById[String(r.memberId)] || "";
    });

    rows.sort((a, b) => {
      const ta = a.waivedAt ? new Date(a.waivedAt).getTime() : 0;
      const tb = b.waivedAt ? new Date(b.waivedAt).getTime() : 0;
      return tb - ta;
    });

    return res.json({ success: true, total: rows.length, rows });
  } catch (err) {
    console.error("PENALTY WAIVER REPORT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
