import mongoose from "mongoose";
import Group from "../models/Group.js";
import Member from "../models/Member.js";
import PushToken from "../models/PushToken.js";
import PaymentNotice from "../models/PaymentNotice.js";
import Advance from "../models/Advance.js";
import { sendPush } from "../realtime/pushNotifier.js";
import { emitToAll } from "../realtime/socket.js";
import { ADVANCE_TAG, planApplications, planTrim } from "../utils/advanceMath.js";
import { memberDividend, plansForMember } from "../utils/memberDividend.js";

/* =========================================================
   ADVANCE (extra amount)  ->  /api/advance

   - POST /api/advance        employee collected more than the pending installment and chose
                              "keep as advance". The normal payment is saved by the existing
                              payments route; this only records the extra.
   - GET  /api/advance        admin list
   - GET  /api/advance/summary  admin dashboard card

   An advance belongs to ONE group seat. When a month of that group exists (right away, or when
   admin adds the new month collection), it is added as a normal INSTALLMENT payment of that
   month (marked "Advance · <employee>") up to what is pending. The rest waits for the next month.
   Existing payment, penalty and dividend logic is not changed.
========================================================= */

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
const MODES = ["Cash", "UPI", "Cheque", "AC"];

/* one job at a time, so two requests can never add the same advance twice */
let chain = Promise.resolve();
const locked = (fn) => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
};

const tell = async (userid, title, body) => {
  try {
    await PaymentNotice.create({ userid: String(userid), title, body });
    emitToAll("live:changed", { topic: "notifications", method: "POST" });
    const tokens = await PushToken.find({ userid: String(userid) }).lean();
    await sendPush(tokens, { title, body, data: { route: "/notifications" } });
  } catch (e) {
    console.error("ADVANCE NOTICE ERROR:", e?.message || e);
  }
};

const statusOf = (adv) => (adv.remaining <= 0 ? "applied" : adv.applied?.length ? "partial" : "waiting");

/* ---------- add waiting advances to months that exist ---------- */
const applyAdvances = async (groupCode) => {
  const group = await Group.findOne({ groupId: groupCode }).lean();
  if (!group) return [];

  const advances = await Advance.find({ groupId: groupCode, remaining: { $gt: 0 } }).sort({ paidAt: 1, _id: 1 });
  const addedBySeat = {};
  const done = [];

  for (const adv of advances) {
    const seat = (group.members || []).find((m) => m.groupMemberId === adv.groupMemberId);
    if (!seat) continue;
    const added = (addedBySeat[adv.groupMemberId] = addedBySeat[adv.groupMemberId] || {});

    const apps = planApplications({
      remaining: adv.remaining,
      afterMonth: adv.afterMonth,
      plans: plansForMember(group.collectionPlans || [], seat.collections || []),
      collections: seat.collections || [],
      added,
    });
    if (!apps.length) continue;

    const who = adv.employeeName ? `${adv.employeeName}${adv.employeeId ? ` (${adv.employeeId})` : ""}` : "Employee";

    for (const a of apps) {
      await Group.updateOne(
        { _id: group._id },
        {
          $push: {
            "members.$[m].collections.$[c].payments": {
              amount: a.take,
              paidAt: adv.paidAt, // the day the money was really received
              paymentType: "INSTALLMENT",
              paymentMode: MODES.includes(adv.paymentMode) ? adv.paymentMode : "Cash",
              employeeId: adv.employeeId || "",
              employeeName: adv.employeeName || "",
              employeePhone: adv.employeePhone || "",
              collectedBy: `${ADVANCE_TAG}${who}`,
            },
          },
        },
        { arrayFilters: [{ "m.groupMemberId": adv.groupMemberId }, { "c.index": a.monthIndex }] }
      );

      adv.remaining = num(adv.remaining - a.take);
      adv.applied.push({ monthIndex: a.monthIndex, amount: a.take, at: new Date() });
      done.push({ userid: adv.userid, groupCode, ...a });

      await tell(
        adv.userid,
        `Advance added · ${inr(a.take)}`,
        `${inr(a.take)} from your advance was added to Month ${a.monthIndex} of Group ${groupCode}. ` +
          (a.pendingAfter > 0 ? `You now pay ${inr(a.pendingAfter)} for that month.` : "That month is now fully paid.")
      );
    }
    adv.status = statusOf(adv);
    await adv.save();
  }
  return done;
};

/* ---------- plan / dividend changed: take back what a month no longer needs ---------- */
const rebalanceGroup = async (groupCode) => {
  const group = await Group.findOne({ groupId: groupCode }).lean();
  if (!group) return;

  for (const seat of group.members || []) {
    for (const col of seat.collections || []) {
      const plan = (group.collectionPlans || []).find((p) => Number(p.monthIndex) === Number(col.index));
      if (!plan) continue;
      const trims = planTrim({ plan: { ...plan, dividend: memberDividend(col, plan) }, payments: col.payments || [] });

      for (const t of trims) {
        if (!t.paymentId) continue;
        const filters = [{ "m.groupMemberId": seat.groupMemberId }, { "c.index": col.index }];
        if (t.to > 0) {
          await Group.updateOne(
            { _id: group._id },
            { $set: { "members.$[m].collections.$[c].payments.$[p].amount": t.to } },
            { arrayFilters: [...filters, { "p._id": new mongoose.Types.ObjectId(t.paymentId) }] }
          );
        } else {
          await Group.updateOne(
            { _id: group._id },
            { $pull: { "members.$[m].collections.$[c].payments": { _id: new mongoose.Types.ObjectId(t.paymentId) } } },
            { arrayFilters: filters }
          );
        }

        // give it back to the advance it came from
        const adv = await Advance.findOne({
          groupId: groupCode,
          groupMemberId: seat.groupMemberId,
          paidAt: new Date(t.paidAt),
          "applied.monthIndex": col.index,
        });
        if (adv) {
          adv.remaining = num(adv.remaining + t.cut);
          let left = t.cut;
          adv.applied = adv.applied
            .map((x) => {
              if (x.monthIndex !== col.index || left <= 0) return x;
              const cut = Math.min(left, x.amount);
              left = num(left - cut);
              return { monthIndex: x.monthIndex, amount: num(x.amount - cut), at: x.at };
            })
            .filter((x) => x.amount > 0);
          adv.status = statusOf(adv);
          await adv.save();
        }
      }
    }
  }
};

/** called after admin adds / edits a month collection or its dividend */
export const runAdvanceSync = (groupCode) =>
  locked(async () => {
    await rebalanceGroup(groupCode);
    const done = await applyAdvances(groupCode);
    if (done.length) emitToAll("live:changed", { topic: "advance", method: "POST" });
    return done;
  });

/* ---------- POST /api/advance ---------- */
export const createAdvance = async (req, res) => {
  try {
    const { groupId, groupMemberId, monthIndex, amount, paymentMode, employeeId, employeeName, employeePhone, memberName } = req.body || {};
    const extra = num(amount);
    if (!groupId || !groupMemberId || !(extra > 0)) {
      return res.status(400).json({ success: false, message: "groupId, groupMemberId and a positive amount are required" });
    }

    const group = await Group.findOne({ groupId: String(groupId) }).lean();
    const seat = group?.members?.find((m) => m.groupMemberId === groupMemberId);
    if (!seat) return res.status(404).json({ success: false, message: "Member not found in this group" });

    const result = await locked(async () => {
      const adv = await Advance.create({
        userid: String(seat.memberId),
        memberName: memberName || "",
        groupId: String(groupId),
        groupMemberId,
        amount: extra,
        remaining: extra,
        afterMonth: Number(monthIndex) || 0,
        paymentMode: MODES.includes(paymentMode) ? paymentMode : "Cash",
        employeeId: employeeId || "",
        employeeName: employeeName || "",
        employeePhone: employeePhone || "",
        paidAt: new Date(),
      });

      await tell(
        seat.memberId,
        `Advance received · ${inr(extra)}`,
        `We received an extra ${inr(extra)} for Group ${groupId}. It is saved as your advance and will be added to your next month's installment automatically. Collected by ${employeeName || "our employee"}.`
      );

      const applied = await applyAdvances(String(groupId)); // right away, if the next month already exists
      emitToAll("live:changed", { topic: "advance", method: "POST" });
      const fresh = await Advance.findById(adv._id).lean();
      return { advance: fresh, applied: applied.filter((x) => String(x.userid) === String(seat.memberId)) };
    });

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error("CREATE ADVANCE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- GET /api/advance ---------- */
const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const buildSummary = (list) => {
  const waiting = list.filter((a) => a.remaining > 0);
  const som = startOfMonth().getTime();
  let appliedThisMonth = 0;
  list.forEach((a) =>
    (a.applied || []).forEach((x) => {
      if (x.at && new Date(x.at).getTime() >= som) appliedThisMonth += Number(x.amount) || 0;
    })
  );

  const byEmp = {};
  waiting.forEach((a) => {
    const key = a.employeeId || a.employeeName || "Employee";
    byEmp[key] = byEmp[key] || { id: a.employeeId || "", name: a.employeeName || "Employee", held: 0 };
    byEmp[key].held = num(byEmp[key].held + a.remaining);
  });

  return {
    held: num(waiting.reduce((s, a) => s + a.remaining, 0)),
    waitingCount: waiting.length,
    members: new Set(waiting.map((a) => String(a.userid))).size,
    appliedThisMonth: num(appliedThisMonth),
    byEmployee: Object.values(byEmp).sort((a, b) => b.held - a.held),
  };
};

export const getAdvanceSummary = async (req, res) => {
  try {
    const list = await Advance.find({}).lean();
    res.json({ success: true, ...buildSummary(list) });
  } catch (err) {
    console.error("ADVANCE SUMMARY ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const listAdvances = async (req, res) => {
  try {
    const status = String(req.query.status || "all").toLowerCase();
    const list = await Advance.find({}).sort({ paidAt: -1 }).lean();

    const ids = [...new Set(list.map((a) => String(a.userid)))];
    const members = ids.length ? await Member.find({ userid: { $in: ids } }).select("userid username").lean() : [];
    const nameOf = Object.fromEntries(members.map((m) => [String(m.userid), m.username]));

    let rows = list.map((a) => ({
      id: String(a._id),
      userid: a.userid,
      memberName: a.memberName || nameOf[String(a.userid)] || a.userid,
      groupId: a.groupId,
      groupMemberId: a.groupMemberId,
      amount: a.amount,
      remaining: a.remaining,
      status: a.remaining <= 0 ? "applied" : a.applied?.length ? "partial" : "waiting",
      afterMonth: a.afterMonth,
      nextMonth: (a.afterMonth || 0) + 1,
      applied: a.applied || [],
      employeeName: a.employeeName,
      employeeId: a.employeeId,
      paymentMode: a.paymentMode,
      paidAt: a.paidAt,
    }));

    if (status === "waiting") rows = rows.filter((r) => r.remaining > 0);
    if (status === "applied") rows = rows.filter((r) => r.remaining <= 0 || r.applied.length > 0);

    res.json({ success: true, items: rows, ...buildSummary(list) });
  } catch (err) {
    console.error("LIST ADVANCE ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
