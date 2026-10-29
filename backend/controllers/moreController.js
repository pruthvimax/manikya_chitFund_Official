import Group from "../models/Group.js";
import Member from "../models/Member.js";
import Employee from "../models/Employee.js";
import ChitScheme from "../models/ChitScheme.js";
import Notification from "../models/Notification.js";
import SpinAnnouncement from "../models/SpinAnnouncement.js";
import DailyDatabase from "../models/DailyDatabase.js";
import InterestedMember from "../models/InterestedMember.js";
import Enrollment from "../models/Enrollment.js";
import LeaveRequest from "../models/LeaveRequest.js";
import Bid from "../models/Bid.js";
import PushToken from "../models/PushToken.js";
import MoreSetting from "../models/MoreSetting.js";
import CashHandover from "../models/CashHandover.js";
import SalarySheet from "../models/SalarySheet.js";
import AnnouncementLog from "../models/AnnouncementLog.js";
import AnnouncementTemplate from "../models/AnnouncementTemplate.js";
import ReminderSent from "../models/ReminderSent.js";
import { sendPush } from "../realtime/pushNotifier.js";
import { emitToAll } from "../realtime/socket.js";
import { computeMemberPenalty } from "../utils/penaltyCalculator.js";

/* =========================================================
   ADMIN "MORE" PAGE (12 features)  ->  /api/more/*

   Almost everything here is READ ONLY: it reads groups, members,
   payments, leads, enrollments ... and calculates. Nothing in the
   existing collections is changed.

   The only things written (all in NEW collections):
     CashHandover   - cash handed over by an employee
     SalarySheet    - salary lines typed by the admin
     MoreSetting    - cash start date, default incentive %
     AnnouncementLog- history of announcements sent
   Push messages are sent with the existing sendPush helper.
========================================================= */

const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v) => Number(v) || 0;
const ymdIST = (date) => new Date(new Date(date).getTime() + IST_MS).toISOString().slice(0, 10);
const todayStartIST = () => {
  const ymd = ymdIST(new Date());
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_MS);
};
const dayRange = (ymd) => {
  const [y, m, d] = String(ymd).split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d) - IST_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
};
const monthRange = (ym) => {
  let y;
  let m;
  const q = /^(\d{4})-(\d{2})$/.exec(String(ym || ""));
  if (q) {
    y = Number(q[1]);
    m = Math.min(Math.max(Number(q[2]) - 1, 0), 11);
  } else {
    const [cy, cm] = ymdIST(new Date()).split("-").map(Number);
    y = cy;
    m = cm - 1;
  }
  const start = new Date(Date.UTC(y, m, 1) - IST_MS);
  const end = new Date(Date.UTC(y, m + 1, 1) - IST_MS);
  return { start, end, key: `${y}-${String(m + 1).padStart(2, "0")}` };
};
const rs = (n) => `Rs ${Math.round(num(n)).toLocaleString("en-IN")}`;
const inr = (n) => `₹${Math.round(num(n)).toLocaleString("en-IN")}`;
const dateText = (d) =>
  new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
// tell every open member app to re-read its bell (the app only re-runs its own counts)
const pingBell = () => {
  try {
    emitToAll("live:changed", { topic: "notifications", method: "POST" });
  } catch {
    /* ignore */
  }
};

const fail = (res, tag, err) => {
  console.error(`MORE ${tag} ERROR:`, err);
  return res.status(500).json({ success: false, message: "Server error" });
};

/* ---------- shared: all groups, only the fields needed (kept 20 s) ---------- */
let gCache = { at: 0, data: null };
const loadGroups = async (fresh = false) => {
  if (!fresh && gCache.data && Date.now() - gCache.at < 20000) return gCache.data;
  const data = await Group.find(
    {},
    {
      groupId: 1,
      chitId: 1,
      totalCollections: 1,
      "collectionPlans.monthIndex": 1,
      "collectionPlans.installmentAmount": 1,
      "collectionPlans.dividend": 1,
      "collectionPlans.endDate": 1,
      "members.collections.penaltyWaived": 1,
      "members.collections.amount": 1,
      "members.memberId": 1,
      "members.groupMemberId": 1,
      "members.collections.index": 1,
      "members.collections.installmentAmount": 1,
      "members.collections.endDate": 1,
      "members.collections.payments.amount": 1,
      "members.collections.payments.paidAt": 1,
      "members.collections.payments.paymentType": 1,
      "members.collections.payments.paymentMode": 1,
      "members.collections.payments.employeeId": 1,
      "members.collections.payments.employeeName": 1,
      "members.collections.payments.collectedBy": 1,
    }
  ).lean();
  gCache = { at: Date.now(), data };
  return data;
};

const instPaid = (col) =>
  (col.payments || []).filter((p) => p.paymentType !== "PENALTY").reduce((s, p) => s + num(p.amount), 0);

const memberMap = async (ids) => {
  const list = Array.from(new Set(ids.map(String))).filter(Boolean);
  if (list.length === 0) return {};
  const rows = await Member.find({ userid: { $in: list } }).select("userid username phone status").lean();
  const by = {};
  rows.forEach((r) => {
    by[r.userid] = r;
  });
  return by;
};

/* every payment, flattened */
const eachPayment = (groups, fn) => {
  for (const g of groups)
    for (const mem of g.members || [])
      for (const col of mem.collections || [])
        for (const p of col.payments || []) if (p.paidAt) fn(p, g, mem, col);
};

const empKeyOf = (p) => {
  const empId = String(p.employeeId || "").trim();
  const name = String(p.employeeName || p.collectedBy || empId || "").trim() || "Not recorded";
  return { key: empId || name.toLowerCase(), empId, name };
};

/* one payment card, written at the moment the reminder is sent (kept until the member clears it) */
const reminderCard = (r) => {
  const today = todayStartIST();
  const overdue = r.status === "overdue";
  const dueText = dateText(r.oldest);
  const days = overdue
    ? Math.max(1, Math.round((today.getTime() - new Date(r.oldest).getTime()) / DAY_MS))
    : Math.max(0, Math.round((new Date(r.oldest).getTime() - today.getTime()) / DAY_MS));
  const amount = r.pending;
  const parts =
    overdue && r.overduePenalty > 0 ? ` (installment ${inr(r.overdueInstallment)} + penalty ${inr(r.overduePenalty)})` : "";
  const sentence = overdue
    ? `Group ${r.groupId}: ${inr(amount)} is due${parts}. Payment was due on ${dueText} (${days} day${days === 1 ? "" : "s"} ago${r.overdueMonths > 1 ? `, ${r.overdueMonths} months pending` : ""}). Please pay at the earliest.`
    : `Group ${r.groupId}: your installment of ${inr(amount)} is due on ${dueText} (${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}). Please keep the payment ready.`;
  return {
    groupId: r.groupId,
    groupMemberId: r.groupMemberId,
    status: r.status,
    pending: amount,
    months: overdue ? r.overdueMonths || 1 : 1,
    dueText,
    days,
    sentence,
  };
};

/* =====================================================
   1) REMINDER CENTRE
   GET  /api/more/reminders?days=3
   POST /api/more/reminders/send   { memberIds: [], days }
===================================================== */
const buildReminders = async (days) => {
  const groups = await loadGroups();
  const limit = new Date(todayStartIST().getTime() + (days + 1) * DAY_MS);
  const today = todayStartIST();
  const rows = new Map();

  for (const g of groups) {
    const planBy = {};
    (g.collectionPlans || []).forEach((p) => {
      planBy[Number(p.monthIndex)] = p;
    });

    for (const mem of g.members || []) {
      // SAME rule as the member's "My Account Copy" page:
      //   installment still due = (installment - dividend) - installment paid
      //   penalty still due     = the app's 6% penalty rule (computeMemberPenalty)
      //   total due             = installment due + penalty due
      const penalty = computeMemberPenalty(mem.collections || [], g.collectionPlans || []).perMonth;

      for (const col of mem.collections || []) {
        const plan = planBy[Number(col.index)] || {};
        const rawInst = num(col.installmentAmount) || num(plan.installmentAmount);
        const endRaw = col.endDate || plan.endDate;
        if (!endRaw || rawInst <= 0) continue;
        const end = new Date(endRaw);

        const effective = Math.max(rawInst - num(plan.dividend), 0);
        const instDue = Math.max(effective - instPaid(col), 0);
        const penDue = end < today ? num(penalty[Number(col.index)]?.pendingPenalty) : 0;
        const monthDue = instDue + penDue;
        if (monthDue <= 0 || end >= limit) continue;

        const key = `${g.groupId}|${mem.memberId}`;
        const r = rows.get(key) || {
          memberId: String(mem.memberId),
          groupId: String(g.groupId),
          groupMemberId: String(mem.groupMemberId || ""),
          pending: 0,
          overdue: 0,
          overdueInstallment: 0,
          overduePenalty: 0,
          overdueMonths: 0,
          dueSoon: 0,
          oldestOverdue: null,
          firstSoon: null,
        };
        if (end < today) {
          r.overdue += monthDue;
          r.overdueInstallment += instDue;
          r.overduePenalty += penDue;
          r.overdueMonths += 1;
          if (!r.oldestOverdue || end < r.oldestOverdue) r.oldestOverdue = end;
        } else {
          r.dueSoon += instDue;
          if (!r.firstSoon || end < r.firstSoon) r.firstSoon = end;
        }
        rows.set(key, r);
      }
    }
  }

  const by = await memberMap(Array.from(rows.values()).map((r) => r.memberId));
  return Array.from(rows.values())
    .map((r) => {
      const isOverdue = r.overdue > 0;
      const oldest = isOverdue ? r.oldestOverdue : r.firstSoon;
      return {
        ...r,
        oldest,
        // the amount shown / sent: what is late now (installment + penalty), otherwise what is due soon
        pending: isOverdue ? r.overdue : r.dueSoon,
        memberName: by[r.memberId]?.username || r.memberId,
        phone: by[r.memberId]?.phone || "",
        status: isOverdue ? "overdue" : "due-soon",
        daysLate: isOverdue ? Math.max(1, Math.round((today.getTime() - new Date(oldest).getTime()) / DAY_MS)) : 0,
      };
    })
    .filter((r) => r.pending > 0)
    .sort((a, b) => (a.status === b.status ? b.pending - a.pending : a.status === "overdue" ? -1 : 1));
};

export const getReminders = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 3, 0), 30);
    const items = await buildReminders(days);
    res.json({
      success: true,
      days,
      overdueCount: items.filter((i) => i.status === "overdue").length,
      dueSoonCount: items.filter((i) => i.status === "due-soon").length,
      total: items.reduce((s, i) => s + i.pending, 0),
      items: items.slice(0, 600),
    });
  } catch (err) {
    fail(res, "REMINDERS", err);
  }
};

export const sendReminders = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.body?.days, 10) || 3, 0), 30);
    const ids = Array.isArray(req.body?.memberIds) ? req.body.memberIds.map(String) : [];
    if (ids.length === 0) return res.status(400).json({ success: false, message: "Choose at least one member." });
    const idSet = new Set(ids);
    // when the admin picked a group, the reminder is only about THAT group
    const onlyGroup = String(req.body?.groupId || "").trim();

    const items = (await buildReminders(days)).filter((i) => idSet.has(i.memberId) && (!onlyGroup || i.groupId === onlyGroup));
    const byMember = new Map();
    items.forEach((i) => {
      if (!byMember.has(i.memberId)) byMember.set(i.memberId, []);
      byMember.get(i.memberId).push(i);
    });

    const tokens = await PushToken.find({ userid: { $in: Array.from(byMember.keys()) } }).lean();
    const tokensBy = new Map();
    tokens.forEach((t) => {
      if (!tokensBy.has(t.userid)) tokensBy.set(t.userid, []);
      tokensBy.get(t.userid).push(t);
    });

    const reachable = Array.from(byMember.keys()).filter((id) => tokensBy.has(id));
    // remember it, so the payment card shows on these members' bell page (selected members only)
    const sentAt = new Date();
    await ReminderSent.insertMany(
      Array.from(byMember.entries()).map(([memberId, list]) => ({
        memberId,
        sentAt,
        items: list.map((i) => reminderCard(i)),
      }))
    );
    pingBell();
    res.json({ success: true, selected: byMember.size, reachable: reachable.length });

    // send in the background (one personal message per member)
    (async () => {
      for (const id of reachable) {
        const list = byMember.get(id);
        const anyOverdue = list.some((i) => i.status === "overdue");
        const lines = list
          .slice(0, 2)
          .map((i) => `Group ${i.groupId}: ${inr(i.pending)} ${i.status === "overdue" ? "overdue since" : "due on"} ${dateText(i.oldest)}`);
        const more = list.length > 2 ? ` +${list.length - 2} more group${list.length - 2 === 1 ? "" : "s"}` : "";
        try {
          await sendPush(tokensBy.get(id), {
            title: anyOverdue ? "Payment reminder" : "Installment due soon",
            body: `${lines.join(" | ")}${more}. Please pay at the earliest.`,
            data: { route: "/notifications" },
          });
        } catch (e) {
          console.error("MORE REMINDER PUSH ERROR:", e?.message || e);
        }
      }
      pingBell();
    })();
  } catch (err) {
    fail(res, "REMINDER SEND", err);
  }
};

/* =====================================================
   2) GROUP HEALTH     GET /api/more/group-health
===================================================== */
export const getGroupHealth = async (req, res) => {
  try {
    const groups = await loadGroups();
    const schemes = await ChitScheme.find({}).select("chitId chitAmount").lean();
    const amountOf = {};
    schemes.forEach((s) => {
      amountOf[s.chitId] = s.chitAmount;
    });
    const today = todayStartIST();
    const monthStart = monthRange().start;

    const items = groups.map((g) => {
      let due = 0;
      let paid = 0;
      let monthCollected = 0;
      let overdueMembers = 0;
      for (const mem of g.members || []) {
        let memberOverdue = false;
        for (const col of mem.collections || []) {
          const inst = num(col.installmentAmount);
          for (const p of col.payments || []) {
            if (p.paidAt && new Date(p.paidAt) >= monthStart) monthCollected += num(p.amount);
          }
          if (!col.endDate || inst <= 0) continue;
          if (new Date(col.endDate) < today) {
            const got = Math.min(instPaid(col), inst);
            due += inst;
            paid += got;
            if (got < inst) memberOverdue = true;
          }
        }
        if (memberOverdue) overdueMembers += 1;
      }
      const percent = due > 0 ? Math.round((paid / due) * 100) : 100;
      return {
        _id: String(g._id),
        groupId: String(g.groupId),
        chitId: String(g.chitId),
        chitAmount: amountOf[g.chitId] || 0,
        members: (g.members || []).length,
        due,
        paid,
        pending: Math.max(due - paid, 0),
        percent,
        overdueMembers,
        monthCollected,
        health: due === 0 ? "New" : percent >= 90 ? "Healthy" : percent >= 70 ? "Watch" : "At risk",
      };
    });
    items.sort((a, b) => a.percent - b.percent);
    res.json({
      success: true,
      count: items.length,
      healthy: items.filter((i) => i.health === "Healthy").length,
      watch: items.filter((i) => i.health === "Watch").length,
      risk: items.filter((i) => i.health === "At risk").length,
      items,
    });
  } catch (err) {
    fail(res, "GROUP HEALTH", err);
  }
};

/* =====================================================
   3) DAILY CLOSING REPORT     GET /api/more/closing?date=YYYY-MM-DD
===================================================== */
export const getClosingReport = async (req, res) => {
  try {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || "")) ? String(req.query.date) : ymdIST(new Date());
    const { start, end } = dayRange(date);
    const groups = await loadGroups(true);

    let total = 0;
    let count = 0;
    let penalty = 0;
    const modes = {};
    const emps = new Map();
    eachPayment(groups, (p) => {
      const t = new Date(p.paidAt);
      if (t < start || t >= end) return;
      const amt = num(p.amount);
      total += amt;
      count += 1;
      if (p.paymentType === "PENALTY") penalty += amt;
      const mode = p.paymentMode || "Cash";
      modes[mode] = (modes[mode] || 0) + amt;
      const { key, empId, name } = empKeyOf(p);
      const e = emps.get(key) || { name, empId, amount: 0, count: 0, cash: 0 };
      e.amount += amt;
      e.count += 1;
      if (mode === "Cash") e.cash += amt;
      emps.set(key, e);
    });

    const [leads, followDone, enrolls, interested, leavesPending, leadsByEmp] = await Promise.all([
      DailyDatabase.countDocuments({ createdAt: { $gte: start, $lt: end } }),
      DailyDatabase.countDocuments({ followUpDoneAt: { $gte: start, $lt: end } }),
      Enrollment.find({ createdAt: { $gte: start, $lt: end } }).select("status enrolledByEmpName").lean(),
      InterestedMember.countDocuments({ createdAt: { $gte: start, $lt: end } }),
      LeaveRequest.countDocuments({ status: "Pending" }),
      DailyDatabase.aggregate([
        { $match: { createdAt: { $gte: start, $lt: end } } },
        { $group: { _id: "$employeeName", n: { $sum: 1 } } },
        { $sort: { n: -1 } },
        { $limit: 10 },
      ]),
    ]);

    const employees = Array.from(emps.values()).sort((a, b) => b.amount - a.amount);
    const body = {
      success: true,
      date,
      total,
      count,
      penalty,
      installments: total - penalty,
      modes,
      employees,
      leads,
      leadsByEmp: leadsByEmp.map((x) => ({ name: x._id || "—", n: x.n })),
      followUpsDone: followDone,
      enrollments: enrolls.length,
      enrollApproved: enrolls.filter((e) => e.status === "Approved").length,
      newInterested: interested,
      leavesPending,
    };
    const lines = [
      `Manikya Chits - Daily closing (${date})`,
      `Collected: ${rs(total)} (${count} payments)`,
      ...Object.keys(modes).map((m) => `  ${m}: ${rs(modes[m])}`),
      ...(penalty ? [`Penalty included: ${rs(penalty)}`] : []),
      "",
      "By employee:",
      ...(employees.length ? employees.map((e) => `  ${e.name}: ${rs(e.amount)} (${e.count})`) : ["  -"]),
      "",
      `New leads: ${leads} | Follow-ups done: ${followDone}`,
      `New enrollments: ${enrolls.length} | New interested: ${interested}`,
    ];
    body.text = lines.join("\n");
    res.json(body);
  } catch (err) {
    fail(res, "CLOSING", err);
  }
};

/* =====================================================
   4) ACTIVITY LOG     GET /api/more/activity?days=3&limit=150
   Built from data that already exists (payments, enrollments, leads...)
===================================================== */
export const getActivity = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 3, 1), 30);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 150, 20), 400);
    const since = new Date(Date.now() - days * DAY_MS);
    const groups = await loadGroups(true);

    const feed = [];
    const memberIds = [];
    eachPayment(groups, (p, g, mem) => {
      const t = new Date(p.paidAt);
      if (t < since) return;
      memberIds.push(mem.memberId);
      const { name } = empKeyOf(p);
      feed.push({
        at: t,
        type: "payment",
        title: `${rs(p.amount)} ${p.paymentType === "PENALTY" ? "penalty" : "collected"}`,
        sub: `Group ${g.groupId} | ${p.paymentMode || "Cash"} | by ${name}`,
        memberId: String(mem.memberId),
      });
    });

    const [enrolls, interested, leads, leaves, bids, notes] = await Promise.all([
      Enrollment.find({ createdAt: { $gte: since } }).select("customerName enrolledByEmpName status createdAt chitAmount").lean(),
      InterestedMember.find({ createdAt: { $gte: since } }).select("fullName phoneNumber status createdAt").lean(),
      DailyDatabase.find({ createdAt: { $gte: since } }).select("name employeeName action createdAt").lean(),
      LeaveRequest.find({ createdAt: { $gte: since } }).select("employeeName leaveType status createdAt").lean(),
      Bid.find({ bidTime: { $gte: since } }).select("groupId memberId bidAmount bidTime").lean(),
      Notification.find({ createdAt: { $gte: since } }).select("groupId auctionEndDate createdAt").lean(),
    ]);

    enrolls.forEach((e) =>
      feed.push({
        at: e.createdAt,
        type: "enrollment",
        title: `Enrollment: ${e.customerName}`,
        sub: `by ${e.enrolledByEmpName} | ${e.status}`,
      })
    );
    interested.forEach((e) =>
      feed.push({
        at: e.createdAt,
        type: "interest",
        title: `Interested: ${e.fullName}`,
        sub: `${e.phoneNumber} | ${e.status}`,
      })
    );
    leads.forEach((e) =>
      feed.push({
        at: e.createdAt,
        type: "lead",
        title: `Lead added: ${e.name}`,
        sub: `by ${e.employeeName} | ${e.action}`,
      })
    );
    leaves.forEach((e) =>
      feed.push({
        at: e.createdAt,
        type: "leave",
        title: `Leave request: ${e.employeeName}`,
        sub: `${e.leaveType} | ${e.status}`,
      })
    );
    bids.forEach((b) => {
      memberIds.push(b.memberId);
      feed.push({
        at: b.bidTime,
        type: "bid",
        title: `Bid ${rs(b.bidAmount)}`,
        sub: `Group ${b.groupId}`,
        memberId: String(b.memberId),
      });
    });
    notes.forEach((n) =>
      feed.push({
        at: n.createdAt,
        type: "notice",
        title: "Auction notification added",
        sub: `Auction end ${n.auctionEndDate}`,
      })
    );

    feed.sort((a, b) => new Date(b.at) - new Date(a.at));
    const top = feed.slice(0, limit);
    const by = await memberMap(top.map((x) => x.memberId).filter(Boolean));
    const items = top.map((x) => ({
      at: x.at,
      type: x.type,
      title: x.title,
      sub: x.sub,
      who: x.memberId ? by[x.memberId]?.username || x.memberId : "",
    }));
    const counts = {};
    feed.forEach((x) => {
      counts[x.type] = (counts[x.type] || 0) + 1;
    });
    res.json({ success: true, days, total: feed.length, counts, items });
  } catch (err) {
    fail(res, "ACTIVITY", err);
  }
};

/* =====================================================
   5) AUCTION CALENDAR     GET /api/more/calendar?month=YYYY-MM
===================================================== */
export const getCalendar = async (req, res) => {
  try {
    const { start, end, key } = monthRange(req.query.month);
    const [yy, mm] = key.split("-");

    const notes = await Notification.find({ auctionEndDate: new RegExp(`^\\d{1,2}-${mm}-${yy}$`) })
      .select("groupId auctionEndDate auctionEndTime minBidAmount maxBidAmount status winnerName winnerBidAmount")
      .lean();
    const spins = await SpinAnnouncement.find({ spinAt: { $gte: start, $lt: end }, status: { $ne: "cancelled" } })
      .select("groupMongoId groupCode spinDate spinTime spinAt status autoSpin")
      .lean();

    const gids = Array.from(new Set([...notes.map((n) => String(n.groupId)), ...spins.map((s) => String(s.groupMongoId))]));
    const gs = gids.length ? await Group.find({ _id: { $in: gids } }).select("groupId chitId").lean() : [];
    const gBy = {};
    gs.forEach((g) => {
      gBy[String(g._id)] = g;
    });

    const items = [];
    notes.forEach((n) => {
      const [d, m, y] = String(n.auctionEndDate).split("-");
      const g = gBy[String(n.groupId)];
      items.push({
        date: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
        time: n.auctionEndTime || "",
        kind: "auction",
        group: g ? String(g.groupId) : "—",
        status: n.winnerName ? "Done" : n.status === "active" ? "Live / open" : n.status || "",
        min: n.minBidAmount || 0,
        max: n.maxBidAmount || 0,
        winner: n.winnerName || "",
        winnerBid: n.winnerBidAmount || 0,
      });
    });
    spins.forEach((s) => {
      const [d, m, y] = String(s.spinDate).split("-");
      items.push({
        date: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
        time: s.spinTime || "",
        kind: "spin",
        group: s.groupCode || String(gBy[String(s.groupMongoId)]?.groupId || "—"),
        status: s.status === "done" ? "Done" : s.autoSpin ? "Auto spin" : "Manual spin",
      });
    });
    items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    const today = ymdIST(new Date());
    res.json({
      success: true,
      month: key,
      today,
      total: items.length,
      upcoming: items.filter((i) => i.date >= today).length,
      items,
    });
  } catch (err) {
    fail(res, "CALENDAR", err);
  }
};

/* =====================================================
   6) NEW MEMBER FUNNEL     GET /api/more/funnel?days=30
===================================================== */
export const getFunnel = async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
    const since = new Date(Date.now() - days * DAY_MS);
    const inRange = { createdAt: { $gte: since } };

    const [leads, leadHot, leadWarm, leadCold, followDone, interested, intByStatus, enrolls, enrByStatus, topLeadEmps, topEnrollEmps] =
      await Promise.all([
        DailyDatabase.countDocuments(inRange),
        DailyDatabase.countDocuments({ ...inRange, action: "Hot" }),
        DailyDatabase.countDocuments({ ...inRange, action: "Warm" }),
        DailyDatabase.countDocuments({ ...inRange, action: "Cold" }),
        DailyDatabase.countDocuments({ ...inRange, followUpDone: true }),
        InterestedMember.countDocuments(inRange),
        InterestedMember.aggregate([{ $match: inRange }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
        Enrollment.countDocuments(inRange),
        Enrollment.aggregate([{ $match: inRange }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
        DailyDatabase.aggregate([
          { $match: inRange },
          { $group: { _id: "$employeeName", n: { $sum: 1 }, hot: { $sum: { $cond: [{ $eq: ["$action", "Hot"] }, 1, 0] } } } },
          { $sort: { n: -1 } },
          { $limit: 8 },
        ]),
        Enrollment.aggregate([
          { $match: inRange },
          {
            $group: {
              _id: "$enrolledByEmpName",
              n: { $sum: 1 },
              approved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
            },
          },
          { $sort: { n: -1 } },
          { $limit: 8 },
        ]),
      ]);

    const pick = (arr, k) => arr.find((x) => String(x._id).toLowerCase() === k)?.n || 0;
    const approved = pick(enrByStatus, "approved");
    const pendingUnattended = await DailyDatabase.countDocuments({
      followUpDone: { $ne: true },
      followUpDate: { $gt: "", $lte: ymdIST(new Date()) },
    });
    const notContacted = await InterestedMember.countDocuments({ status: "pending" });

    res.json({
      success: true,
      days,
      stages: [
        { key: "leads", label: "Leads added (field visits)", n: leads },
        { key: "interested", label: "Interested requests (app)", n: interested },
        { key: "enrolled", label: "Enrollment forms", n: enrolls },
        { key: "approved", label: "Approved", n: approved },
      ],
      leadMix: { hot: leadHot, warm: leadWarm, cold: leadCold },
      followUpsDone: followDone,
      interestedBy: { pending: pick(intByStatus, "pending"), contacted: pick(intByStatus, "contacted"), approved: pick(intByStatus, "approved") },
      enrollBy: { pending: pick(enrByStatus, "pending"), approved, rejected: pick(enrByStatus, "rejected") },
      conversion: interested + leads > 0 ? Math.round((approved / (interested + leads)) * 1000) / 10 : 0,
      notContactedYet: notContacted,
      followUpsDueNow: pendingUnattended,
      bestLeadEmployees: topLeadEmps.map((x) => ({ name: x._id || "—", n: x.n, hot: x.hot })),
      bestEnrollEmployees: topEnrollEmps.map((x) => ({ name: x._id || "—", n: x.n, approved: x.approved })),
    });
  } catch (err) {
    fail(res, "FUNNEL", err);
  }
};

/* =====================================================
   7) MEMBER LOOKUP + STATEMENT
   GET /api/more/members/search?q=
   GET /api/more/members/:userid/statement
===================================================== */
export const searchMembers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (q.length < 2) return res.json({ success: true, items: [] });
    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    const items = await Member.find({ $or: [{ username: rx }, { phone: rx }, { userid: rx }] })
      .select("userid username phone status")
      .limit(25)
      .lean();
    res.json({ success: true, items });
  } catch (err) {
    fail(res, "MEMBER SEARCH", err);
  }
};

export const getMemberStatement = async (req, res) => {
  try {
    const userid = String(req.params.userid || "");
    const member = await Member.findOne({ userid }).select("userid username phone address joiningDate status").lean();
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    const groups = await Group.find({ "members.memberId": userid }).lean();
    const today = todayStartIST();
    const rows = [];
    const recent = [];
    let dueAll = 0;
    let paidAll = 0;
    let penaltyAll = 0;

    for (const g of groups) {
      for (const mem of (g.members || []).filter((m) => String(m.memberId) === userid)) {
        let due = 0;
        let paid = 0;
        let penalty = 0;
        let next = null;
        let overdueMonths = 0;
        for (const col of mem.collections || []) {
          const inst = num(col.installmentAmount);
          const got = instPaid(col);
          penalty += (col.payments || []).filter((p) => p.paymentType === "PENALTY").reduce((s, p) => s + num(p.amount), 0);
          for (const p of col.payments || []) {
            recent.push({
              at: p.paidAt,
              amount: num(p.amount),
              type: p.paymentType || "INSTALLMENT",
              mode: p.paymentMode || "Cash",
              by: p.employeeName || p.collectedBy || "",
              group: String(g.groupId),
              month: col.index,
            });
          }
          if (!col.endDate || inst <= 0) continue;
          const end = new Date(col.endDate);
          if (end < today) {
            due += inst;
            paid += Math.min(got, inst);
            if (got < inst) overdueMonths += 1;
          } else if (!next || end < next.end) {
            next = { end, amount: Math.max(inst - got, 0), month: col.index };
          }
        }
        dueAll += due;
        paidAll += paid;
        penaltyAll += penalty;
        rows.push({
          groupId: String(g.groupId),
          chitId: String(g.chitId),
          groupMemberId: String(mem.groupMemberId || ""),
          due,
          paid,
          pending: Math.max(due - paid, 0),
          penaltyPaid: penalty,
          overdueMonths,
          nextDue: next ? { date: next.end, amount: next.amount, month: next.month } : null,
        });
      }
    }
    recent.sort((a, b) => new Date(b.at) - new Date(a.at));
    const pending = Math.max(dueAll - paidAll, 0);
    const lines = [
      `Manikya Chits - Statement`,
      `Member: ${member.username} (${member.userid})`,
      `Phone: ${member.phone}`,
      "",
      ...rows.map(
        (r) => `Group ${r.groupId} (${r.groupMemberId}): paid ${rs(r.paid)} of ${rs(r.due)}${r.pending ? `, pending ${rs(r.pending)}` : ", up to date"}`
      ),
      "",
      `Total paid: ${rs(paidAll)}`,
      `Total pending: ${rs(pending)}`,
      ...(penaltyAll ? [`Penalty paid: ${rs(penaltyAll)}`] : []),
    ];
    res.json({
      success: true,
      member,
      groups: rows,
      totals: { due: dueAll, paid: paidAll, pending, penaltyPaid: penaltyAll },
      payments: recent.slice(0, 40),
      text: lines.join("\n"),
    });
  } catch (err) {
    fail(res, "MEMBER STATEMENT", err);
  }
};

/* =====================================================
   8) CASH HANDOVER TRACKER
   GET    /api/more/cash
   POST   /api/more/cash/handover   { empId, empName, amount, note }
   DELETE /api/more/cash/handover/:id
   POST   /api/more/cash/start      { date: YYYY-MM-DD }
===================================================== */
const cashStartOf = async () => {
  const doc = await MoreSetting.findOne({ key: "cashStart" }).lean();
  if (doc?.value && /^\d{4}-\d{2}-\d{2}$/.test(doc.value)) return doc.value;
  return `${monthRange().key}-01`;
};

export const getCash = async (req, res) => {
  try {
    const startYmd = await cashStartOf();
    const { start } = dayRange(startYmd);
    const groups = await loadGroups(true);

    const emps = new Map();
    eachPayment(groups, (p) => {
      if ((p.paymentMode || "Cash") !== "Cash") return;
      if (new Date(p.paidAt) < start) return;
      const { key, empId, name } = empKeyOf(p);
      const e = emps.get(key) || { key, empId, name, cash: 0, handed: 0, lastHandover: null, count: 0 };
      e.cash += num(p.amount);
      e.count += 1;
      emps.set(key, e);
    });

    const handovers = await CashHandover.find({ at: { $gte: start } }).sort({ at: -1 }).lean();
    handovers.forEach((h) => {
      const key = String(h.empId || "").trim() || String(h.empName || "").trim().toLowerCase();
      const e = emps.get(key) || { key, empId: h.empId, name: h.empName || h.empId || "—", cash: 0, handed: 0, lastHandover: null, count: 0 };
      e.handed += num(h.amount);
      if (!e.lastHandover) e.lastHandover = h.at;
      emps.set(key, e);
    });

    const items = Array.from(emps.values())
      .map((e) => ({ ...e, holding: e.cash - e.handed }))
      .sort((a, b) => b.holding - a.holding);
    res.json({
      success: true,
      since: startYmd,
      totalCash: items.reduce((s, i) => s + i.cash, 0),
      totalHanded: items.reduce((s, i) => s + i.handed, 0),
      totalHolding: items.reduce((s, i) => s + i.holding, 0),
      items,
      history: handovers.slice(0, 60).map((h) => ({ _id: String(h._id), empId: h.empId, empName: h.empName, amount: h.amount, note: h.note, at: h.at })),
    });
  } catch (err) {
    fail(res, "CASH", err);
  }
};

export const addHandover = async (req, res) => {
  try {
    const amount = num(req.body?.amount);
    if (amount <= 0) return res.status(400).json({ success: false, message: "Enter the amount handed over." });
    const empId = String(req.body?.empId || "").trim();
    const empName = String(req.body?.empName || "").trim();
    if (!empId && !empName) return res.status(400).json({ success: false, message: "Employee is required." });
    const doc = await CashHandover.create({ empId, empName, amount, note: String(req.body?.note || "").slice(0, 200) });
    res.json({ success: true, item: doc });
  } catch (err) {
    fail(res, "CASH ADD", err);
  }
};

export const deleteHandover = async (req, res) => {
  try {
    await CashHandover.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    fail(res, "CASH DELETE", err);
  }
};

export const setCashStart = async (req, res) => {
  try {
    const date = String(req.body?.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ success: false, message: "Date must be YYYY-MM-DD." });
    await MoreSetting.findOneAndUpdate({ key: "cashStart" }, { $set: { value: date } }, { upsert: true });
    res.json({ success: true, since: date });
  } catch (err) {
    fail(res, "CASH START", err);
  }
};

/* =====================================================
   9) SALARY & INCENTIVE SHEET
   GET  /api/more/salary?month=YYYY-MM
   POST /api/more/salary            { empId, month, baseSalary, incentivePercent, bonus, deduction, note, paid }
   POST /api/more/salary/default    { percent }
   Incentive = collected in that month x percent.
===================================================== */
const defaultPercent = async () => {
  const doc = await MoreSetting.findOne({ key: "incentivePercent" }).lean();
  const v = Number(doc?.value);
  return Number.isFinite(v) && v >= 0 ? v : 1;
};

export const getSalary = async (req, res) => {
  try {
    const { start, end, key } = monthRange(req.query.month);
    const groups = await loadGroups(true);
    const collected = new Map(); // empId -> amount
    const counts = new Map();
    eachPayment(groups, (p) => {
      const t = new Date(p.paidAt);
      if (t < start || t >= end) return;
      const id = String(p.employeeId || "").trim();
      if (!id) return;
      collected.set(id, (collected.get(id) || 0) + num(p.amount));
      counts.set(id, (counts.get(id) || 0) + 1);
    });

    const [emps, sheets, defPct] = await Promise.all([
      Employee.find({}).select("emp_id name phone status").lean(),
      SalarySheet.find({ month: key }).lean(),
      defaultPercent(),
    ]);
    const sheetBy = {};
    sheets.forEach((s) => {
      sheetBy[s.empId] = s;
    });

    // last saved base salary of an employee is offered again for a new month
    const olds = await SalarySheet.find({ month: { $ne: key } }).sort({ month: -1 }).select("empId baseSalary").lean();
    const lastBase = {};
    olds.forEach((o) => {
      if (lastBase[o.empId] === undefined) lastBase[o.empId] = o.baseSalary;
    });

    const items = emps.map((e) => {
      const sheet = sheetBy[e.emp_id];
      const coll = collected.get(e.emp_id) || 0;
      const base = sheet ? num(sheet.baseSalary) : num(lastBase[e.emp_id]);
      const pct = sheet ? num(sheet.incentivePercent) : defPct;
      const bonus = sheet ? num(sheet.bonus) : 0;
      const ded = sheet ? num(sheet.deduction) : 0;
      const incentive = Math.round((coll * pct) / 100);
      return {
        empId: e.emp_id,
        name: e.name,
        phone: e.phone,
        status: e.status,
        saved: !!sheet,
        collected: coll,
        payments: counts.get(e.emp_id) || 0,
        baseSalary: base,
        incentivePercent: pct,
        incentive,
        bonus,
        deduction: ded,
        net: base + incentive + bonus - ded,
        note: sheet?.note || "",
        paid: !!sheet?.paid,
        paidAt: sheet?.paidAt || null,
      };
    });
    items.sort((a, b) => (a.status === b.status ? b.collected - a.collected : a.status === "active" ? -1 : 1));
    res.json({
      success: true,
      month: key,
      defaultPercent: defPct,
      totalNet: items.reduce((s, i) => s + i.net, 0),
      totalPaid: items.filter((i) => i.paid).reduce((s, i) => s + i.net, 0),
      items,
    });
  } catch (err) {
    fail(res, "SALARY", err);
  }
};

export const saveSalary = async (req, res) => {
  try {
    const empId = String(req.body?.empId || "").trim();
    const month = monthRange(req.body?.month).key;
    if (!empId) return res.status(400).json({ success: false, message: "Employee is required." });
    const set = {
      baseSalary: Math.max(num(req.body?.baseSalary), 0),
      incentivePercent: Math.min(Math.max(num(req.body?.incentivePercent), 0), 100),
      bonus: Math.max(num(req.body?.bonus), 0),
      deduction: Math.max(num(req.body?.deduction), 0),
      note: String(req.body?.note || "").slice(0, 200),
    };
    if (typeof req.body?.paid === "boolean") {
      set.paid = req.body.paid;
      set.paidAt = req.body.paid ? new Date() : null;
    }
    const doc = await SalarySheet.findOneAndUpdate({ empId, month }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
    res.json({ success: true, item: doc });
  } catch (err) {
    fail(res, "SALARY SAVE", err);
  }
};

export const setDefaultPercent = async (req, res) => {
  try {
    const percent = Math.min(Math.max(num(req.body?.percent), 0), 100);
    await MoreSetting.findOneAndUpdate({ key: "incentivePercent" }, { $set: { value: percent } }, { upsert: true });
    res.json({ success: true, percent });
  } catch (err) {
    fail(res, "SALARY DEFAULT", err);
  }
};

/* =====================================================
   10) MEMBER RELIABILITY SCORE     GET /api/more/reliability
   Every past month of a member is: on time (paid in full by the due
   date, 1 day grace), late (paid in full, but later) or unpaid.
   Score = (on time + half of late) / months x 100.
===================================================== */
export const getReliability = async (req, res) => {
  try {
    const groups = await loadGroups();
    const cutoff = new Date(todayStartIST().getTime() - DAY_MS); // due date + 1 day grace has passed
    const agg = new Map(); // memberId -> stats

    for (const g of groups) {
      for (const mem of g.members || []) {
        for (const col of mem.collections || []) {
          const inst = num(col.installmentAmount);
          if (!col.endDate || inst <= 0) continue;
          const end = new Date(col.endDate);
          if (end >= cutoff) continue;

          const pays = (col.payments || [])
            .filter((p) => p.paymentType !== "PENALTY" && p.paidAt)
            .sort((a, b) => new Date(a.paidAt) - new Date(b.paidAt));
          let run = 0;
          let fullAt = null;
          for (const p of pays) {
            run += num(p.amount);
            if (run >= inst) {
              fullAt = new Date(p.paidAt);
              break;
            }
          }
          const a = agg.get(String(mem.memberId)) || { memberId: String(mem.memberId), onTime: 0, late: 0, unpaid: 0, groups: new Set(), pending: 0 };
          if (fullAt && fullAt.getTime() <= end.getTime() + DAY_MS) a.onTime += 1;
          else if (fullAt) a.late += 1;
          else {
            a.unpaid += 1;
            a.pending += Math.max(inst - run, 0);
          }
          a.groups.add(String(g.groupId));
          agg.set(String(mem.memberId), a);
        }
      }
    }

    const by = await memberMap(Array.from(agg.keys()));
    const grade = (s) => (s >= 85 ? "Excellent" : s >= 65 ? "Good" : s >= 40 ? "Average" : "Risky");
    const items = Array.from(agg.values()).map((a) => {
      const months = a.onTime + a.late + a.unpaid;
      const score = months ? Math.round(((a.onTime + a.late * 0.5) / months) * 100) : 0;
      return {
        memberId: a.memberId,
        name: by[a.memberId]?.username || a.memberId,
        phone: by[a.memberId]?.phone || "",
        score,
        grade: grade(score),
        onTime: a.onTime,
        late: a.late,
        unpaid: a.unpaid,
        months,
        pending: a.pending,
        groups: Array.from(a.groups).slice(0, 4),
      };
    });
    items.sort((a, b) => a.score - b.score || b.pending - a.pending);
    const count = (g) => items.filter((i) => i.grade === g).length;
    res.json({
      success: true,
      total: items.length,
      excellent: count("Excellent"),
      good: count("Good"),
      average: count("Average"),
      risky: count("Risky"),
      items: items.slice(0, 1500),
    });
  } catch (err) {
    fail(res, "RELIABILITY", err);
  }
};

/* =====================================================
   11) ANNOUNCEMENT COMPOSER
   GET  /api/more/announce/groups
   GET  /api/more/announce/history
   POST /api/more/announce  { title, body, audience: all|groups|overdue, groupIds: [] }
===================================================== */
export const getAnnounceGroups = async (req, res) => {
  try {
    const groups = await loadGroups();
    const items = groups
      .map((g) => ({ _id: String(g._id), groupId: String(g.groupId), chitId: String(g.chitId), members: (g.members || []).length }))
      .sort((a, b) => a.groupId.localeCompare(b.groupId, undefined, { numeric: true }));
    const memberTokens = (await PushToken.countDocuments({ userid: { $not: /^emp:/ } })) || 0;
    res.json({ success: true, items, phones: memberTokens });
  } catch (err) {
    fail(res, "ANNOUNCE GROUPS", err);
  }
};

export const getAnnounceHistory = async (req, res) => {
  try {
    const items = await AnnouncementLog.find({}).sort({ createdAt: -1 }).limit(30).lean();
    res.json({ success: true, items });
  } catch (err) {
    fail(res, "ANNOUNCE HISTORY", err);
  }
};

export const sendAnnouncement = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 60);
    const body = String(req.body?.body || "").trim().slice(0, 240);
    const audience = ["all", "groups", "overdue"].includes(req.body?.audience) ? req.body.audience : "all";
    if (!title || !body) return res.status(400).json({ success: false, message: "Title and message are both required." });

    let tokens = [];
    let memberCount = 0;
    let labels = [];
    let recipients = [];

    if (audience === "all") {
      tokens = (await PushToken.find({}).lean()).filter((t) => !String(t.userid).startsWith("emp:"));
      memberCount = new Set(tokens.map((t) => t.userid)).size;
      labels = ["All members"];
    } else if (audience === "groups") {
      const ids = Array.isArray(req.body?.groupIds) ? req.body.groupIds.map(String) : [];
      if (ids.length === 0) return res.status(400).json({ success: false, message: "Choose at least one group." });
      const gs = (await loadGroups()).filter((g) => ids.includes(String(g._id)));
      const userids = new Set();
      gs.forEach((g) => (g.members || []).forEach((m) => userids.add(String(m.memberId))));
      memberCount = userids.size;
      labels = gs.map((g) => String(g.groupId));
      recipients = Array.from(userids);
      tokens = await PushToken.find({ userid: { $in: recipients } }).lean();
    } else {
      // overdue members: of the chosen group(s), or of every group when none is chosen
      const ids = Array.isArray(req.body?.groupIds) ? req.body.groupIds.map(String) : [];
      const gs = ids.length ? (await loadGroups()).filter((g) => ids.includes(String(g._id))) : [];
      const codes = new Set(gs.map((g) => String(g.groupId)));
      const rows = (await buildReminders(0)).filter((r) => r.status === "overdue" && (codes.size === 0 || codes.has(r.groupId)));
      const userids = new Set(rows.map((r) => r.memberId));
      memberCount = userids.size;
      labels = codes.size ? Array.from(codes).map((c) => `Overdue · ${c}`) : ["Overdue members"];
      recipients = Array.from(userids);
      tokens = await PushToken.find({ userid: { $in: recipients } }).lean();
    }

    if (tokens.length === 0) {
      return res.status(400).json({ success: false, message: "No phones to send to (nobody in this audience has the app notifications on)." });
    }
    const r = await sendPush(tokens, { title, body, data: { route: "/notifications" } });
    await AnnouncementLog.create({ title, body, audience, groups: labels, members: memberCount, sent: r?.sent || 0, memberIds: recipients });
    pingBell();
    res.json({ success: true, members: memberCount, phones: tokens.length, sent: r?.sent || 0 });
  } catch (err) {
    fail(res, "ANNOUNCE SEND", err);
  }
};

/* ===== Announcement: saved messages (templates) + delete a sent announcement ===== */
export const getTemplates = async (req, res) => {
  try {
    const items = await AnnouncementTemplate.find({}).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, items });
  } catch (err) {
    fail(res, "ANNOUNCE TEMPLATES", err);
  }
};

export const saveTemplate = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim().slice(0, 60);
    const body = String(req.body?.body || "").trim().slice(0, 240);
    const id = String(req.body?.id || "").trim();
    if (!title || !body) return res.status(400).json({ success: false, message: "Title and message are both required." });
    let doc = null;
    if (id) {
      doc = await AnnouncementTemplate.findByIdAndUpdate(id, { title, body }, { new: true });
      if (!doc) return res.status(404).json({ success: false, message: "Saved message not found." });
    } else {
      doc = await AnnouncementTemplate.create({ title, body });
    }
    res.json({ success: true, item: doc });
  } catch (err) {
    fail(res, "ANNOUNCE TEMPLATE SAVE", err);
  }
};

export const deleteTemplate = async (req, res) => {
  try {
    await AnnouncementTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    fail(res, "ANNOUNCE TEMPLATE DELETE", err);
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    await AnnouncementLog.findByIdAndDelete(req.params.id);
    pingBell();
    res.json({ success: true });
  } catch (err) {
    fail(res, "ANNOUNCE DELETE", err);
  }
};

/* =====================================================
   12) GROUP SETTLEMENT     GET /api/more/settlement/:id   (group _id)
===================================================== */
export const getSettlement = async (req, res) => {
  try {
    const g = await Group.findById(req.params.id).lean();
    if (!g) return res.status(404).json({ success: false, message: "Group not found" });
    const scheme = await ChitScheme.findOne({ chitId: g.chitId }).select("chitAmount durationMonths monthlyAmount").lean();
    const today = todayStartIST();

    const by = await memberMap((g.members || []).map((m) => m.memberId));
    const rows = (g.members || []).map((mem) => {
      let due = 0;
      let paid = 0;
      let penalty = 0;
      let future = 0;
      let monthsDone = 0;
      let monthsDue = 0;
      for (const col of mem.collections || []) {
        const inst = num(col.installmentAmount);
        const got = instPaid(col);
        penalty += (col.payments || []).filter((p) => p.paymentType === "PENALTY").reduce((s, p) => s + num(p.amount), 0);
        if (!col.endDate || inst <= 0) continue;
        if (new Date(col.endDate) < today) {
          monthsDue += 1;
          due += inst;
          paid += Math.min(got, inst);
          if (got >= inst) monthsDone += 1;
        } else {
          future += Math.max(inst - got, 0);
          paid += Math.min(got, inst);
        }
      }
      return {
        memberId: String(mem.memberId),
        groupMemberId: String(mem.groupMemberId || ""),
        name: by[mem.memberId]?.username || String(mem.memberId),
        phone: by[mem.memberId]?.phone || "",
        due,
        paid,
        penaltyPaid: penalty,
        monthsDue,
        monthsDone,
        pending: Math.max(due - Math.min(paid, due), 0),
        remaining: future,
        settled: due > 0 && Math.min(paid, due) >= due,
      };
    });

    const winners = await Notification.find({ groupId: g._id, winnerName: { $ne: "" } })
      .select("auctionEndDate winnerName winnerId winnerGroupId winnerBidAmount")
      .lean();

    const totals = {
      members: rows.length,
      due: rows.reduce((s, r) => s + r.due, 0),
      paid: rows.reduce((s, r) => s + Math.min(r.paid, r.due), 0),
      pending: rows.reduce((s, r) => s + r.pending, 0),
      penalty: rows.reduce((s, r) => s + r.penaltyPaid, 0),
      remaining: rows.reduce((s, r) => s + r.remaining, 0),
      settled: rows.filter((r) => r.settled).length,
    };
    const lines = [
      `Manikya Chits - Settlement for Group ${g.groupId}`,
      `Members: ${totals.members} | Fully paid up to date: ${totals.settled}`,
      `Due so far: ${rs(totals.due)} | Collected: ${rs(totals.paid)} | Pending: ${rs(totals.pending)}`,
      `Penalty collected: ${rs(totals.penalty)}`,
      "",
      ...rows.filter((r) => r.pending > 0).map((r) => `${r.name} (${r.groupMemberId}): pending ${rs(r.pending)}`),
    ];
    res.json({
      success: true,
      group: { _id: String(g._id), groupId: String(g.groupId), chitId: String(g.chitId), chitAmount: scheme?.chitAmount || 0, months: g.totalCollections },
      totals,
      members: rows.sort((a, b) => b.pending - a.pending || a.name.localeCompare(b.name)),
      winners: winners.map((w) => ({ date: w.auctionEndDate, name: w.winnerName, groupMemberId: w.winnerGroupId, bid: w.winnerBidAmount })),
      text: lines.join("\n"),
    });
  } catch (err) {
    fail(res, "SETTLEMENT", err);
  }
};

/* =====================================================
   MEMBER BELL FEED     GET /api/more/member-feed?userid=
   Used by the MEMBER app (bell count + notification page).
   Shows what the admin really sent to THIS member: the payment reminders
   (a card per group, kept until the member clears it on the phone) and
   the announcements meant for them.
===================================================== */
export const getMemberFeed = async (req, res) => {
  try {
    const userid = String(req.query.userid || "").trim();
    if (!userid) return res.status(400).json({ success: false, message: "userid is required" });

    const since = new Date(Date.now() - 90 * DAY_MS);
    const sent = await ReminderSent.find({ memberId: userid, sentAt: { $gte: since } }).sort({ sentAt: -1 }).limit(60).lean();

    // newest reminder per group wins
    const dues = [];
    const seen = new Set();
    for (const doc of sent) {
      for (const it of doc.items || []) {
        const key = `${it.groupId}|${it.groupMemberId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        dues.push({
          key: `due-${it.groupId}-${it.groupMemberId}`,
          groupId: it.groupId,
          groupMemberId: it.groupMemberId,
          status: it.status,
          pending: it.pending,
          months: it.months || 1,
          dueText: it.dueText,
          days: it.days,
          sentence: it.sentence,
          at: new Date(doc.sentAt).toISOString(),
        });
      }
    }

    const logs = await AnnouncementLog.find({ createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(80).lean();
    const announcements = logs
      .filter((l) => l.audience === "all" || (l.memberIds || []).includes(userid))
      .slice(0, 30)
      .map((l) => ({ id: String(l._id), title: l.title, body: l.body, at: l.createdAt }));

    res.json({ success: true, dues, announcements });
  } catch (err) {
    fail(res, "MEMBER FEED", err);
  }
};
