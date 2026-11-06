import twilio from "twilio";
import Admin from "../models/Admin.js";
import Group from "../models/Group.js";
import LeaveRequest from "../models/LeaveRequest.js";
import MoreSetting from "../models/MoreSetting.js";
import Notification from "../models/Notification.js";
import { computeMemberPenalty } from "../utils/penaltyCalculator.js";

/* =========================================================
   DAILY SUMMARY (WhatsApp to the admins)

   Every evening at the chosen time (default 8:00 PM India time) every admin
   in the "admins" collection gets one WhatsApp message: money collected today,
   overdue members, pending leave requests, top collector, tomorrow's auctions.

   - It is OFF until an admin switches it ON (Admin > More > Daily Summary).
   - Read only: nothing about groups, members or payments is changed.
   - Uses the same Twilio settings as the admin login OTP.
========================================================= */

const KEY = "dailySummary";
const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const num = (v) => Number(v) || 0;
const pad = (n) => String(n).padStart(2, "0");

export const DEFAULTS = { enabled: false, time: "20:00", lastSent: "" };

const istNow = () => {
  const d = new Date(Date.now() + IST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), hh: d.getUTCHours(), mm: d.getUTCMinutes() };
};
const dayKey = (p) => `${p.y}-${pad(p.m + 1)}-${pad(p.day)}`;

export const getSettings = async () => {
  const doc = await MoreSetting.findOne({ key: KEY }).lean();
  return { ...DEFAULTS, ...(doc?.value || {}) };
};

export const saveSettings = async (patch) => {
  const cur = await getSettings();
  const next = { ...cur };
  if (typeof patch.enabled === "boolean") next.enabled = patch.enabled;
  if (typeof patch.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(patch.time)) next.time = patch.time;
  // switching ON (or changing the time) after today's time has passed: first message is tomorrow,
  // not a surprise message right now
  const now = istNow();
  const [h, m] = next.time.split(":").map(Number);
  if (next.enabled && now.hh * 60 + now.mm >= h * 60 + m) next.lastSent = dayKey(now);
  await MoreSetting.findOneAndUpdate({ key: KEY }, { $set: { value: next } }, { upsert: true });
  return next;
};

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const lakh = (n) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : n >= 100000 ? `₹${(n / 100000).toFixed(2)} L` : rupees(n));

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ---------- build the message ---------- */
export const buildSummaryText = async () => {
  const now = istNow();
  const start = new Date(Date.UTC(now.y, now.m, now.day) - IST_MS);
  const end = new Date(start.getTime() + DAY_MS);

  const groups = await Group.find(
    {},
    {
      groupId: 1,
      "collectionPlans.monthIndex": 1,
      "collectionPlans.installmentAmount": 1,
      "collectionPlans.dividend": 1,
      "collectionPlans.endDate": 1,
      "members.memberId": 1,
      "members.groupMemberId": 1,
      "members.collections.index": 1,
      "members.collections.amount": 1,
      "members.collections.penaltyWaived": 1,
      "members.collections.installmentAmount": 1,
      "members.collections.endDate": 1,
      "members.collections.payments.amount": 1,
      "members.collections.payments.paidAt": 1,
      "members.collections.payments.paymentType": 1,
      "members.collections.payments.employeeId": 1,
      "members.collections.payments.employeeName": 1,
      "members.collections.payments.collectedBy": 1,
    }
  ).lean();

  let collected = 0;
  let count = 0;
  const emps = new Map();
  let overdueMembers = 0;
  let overdueTotal = 0;

  for (const g of groups) {
    const planBy = {};
    (g.collectionPlans || []).forEach((p) => {
      planBy[Number(p.monthIndex)] = p;
    });
    for (const mem of g.members || []) {
      const penalty = computeMemberPenalty(mem.collections || [], g.collectionPlans || []).perMonth;
      let total = 0;
      let overdue = false;
      for (const col of mem.collections || []) {
        const plan = planBy[Number(col.index)] || {};
        const payments = col.payments || [];
        for (const p of payments) {
          if (!p.paidAt) continue;
          const t = new Date(p.paidAt);
          if (t < start || t >= end) continue;
          const amt = num(p.amount);
          collected += amt;
          count += 1;
          const name = String(p.employeeName || p.collectedBy || p.employeeId || "").trim() || "Not recorded";
          emps.set(name, (emps.get(name) || 0) + amt);
        }
        const raw = num(col.installmentAmount) || num(plan.installmentAmount);
        if (raw <= 0) continue;
        const paid = payments
          .filter((p) => p.paymentType !== "PENALTY" && p.paymentType !== "DIVIDEND")
          .reduce((s, p) => s + num(p.amount), 0);
        const pending = Math.max(raw - num(plan.dividend) - paid, 0) + num(penalty[Number(col.index)]?.pendingPenalty);
        total += pending;
        const endRaw = col.endDate || plan.endDate;
        if (endRaw && new Date(endRaw) < start && pending > 0) overdue = true;
      }
      if (overdue && total > 0) {
        overdueMembers += 1;
        overdueTotal += total;
      }
    }
  }

  let top = null;
  emps.forEach((amt, name) => {
    if (!top || amt > top.amt) top = { name, amt };
  });

  const pendingLeaves = await LeaveRequest.countDocuments({ status: "Pending" });

  // tomorrow's auctions that are still open (DD-MM-YYYY)
  const t = new Date(Date.UTC(now.y, now.m, now.day + 1));
  const tomorrow = `${pad(t.getUTCDate())}-${pad(t.getUTCMonth() + 1)}-${t.getUTCFullYear()}`;
  const auctions = await Notification.find({ auctionEndDate: tomorrow, $or: [{ winnerName: "" }, { winnerName: { $exists: false } }] })
    .select("groupId auctionEndTime")
    .lean();
  const codeBy = {};
  groups.forEach((g) => {
    codeBy[String(g._id)] = String(g.groupId);
  });

  const lines = [];
  lines.push(`📊 *Manikya Chits* · ${now.day} ${MONTH_NAMES[now.m]}`);
  lines.push("");
  lines.push(`Collected today: *${rupees(collected)}* (${count} payment${count === 1 ? "" : "s"})`);
  lines.push(`Overdue now: *${overdueMembers} member${overdueMembers === 1 ? "" : "s"}* · ${lakh(overdueTotal)}`);
  lines.push(`Leave requests pending: *${pendingLeaves}*`);
  lines.push(top ? `Top collector: *${top.name}* · ${rupees(top.amt)}` : "Top collector: no payments today");
  if (auctions.length) {
    lines.push(
      `Auction tomorrow: ${auctions
        .map((a) => `${codeBy[String(a.groupId)] || "Group"}${a.auctionEndTime ? ` ${a.auctionEndTime}` : ""}`)
        .join(", ")}`
    );
  } else {
    lines.push("Auction tomorrow: none");
  }
  return lines.join("\n");
};

/* ---------- send ---------- */
const normalize = (value) => {
  let c = String(value || "").trim().replace(/[^\d+]/g, "");
  if (!c) return null;
  if (c.startsWith("+")) return c;
  if (c.length === 10) return `+91${c}`;
  return `+${c}`;
};

export const sendToAdmins = async (text) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) throw new Error("Twilio WhatsApp is not configured on the server");
  const client = twilio(sid, token);
  const admins = await Admin.find({}).select("mobile name").lean();
  const result = { sent: 0, failed: [] };
  for (const a of admins) {
    const to = normalize(a.mobile);
    if (!to) continue;
    try {
      await client.messages.create({ from, to: `whatsapp:${to}`, body: text });
      result.sent += 1;
    } catch (e) {
      result.failed.push({ name: a.name || a.mobile, error: e?.message || "failed" });
    }
  }
  return result;
};

/* ---------- scheduler: checks once a minute ---------- */
let running = false;
const tick = async () => {
  if (running) return;
  running = true;
  try {
    const s = await getSettings();
    if (!s.enabled) return;
    const now = istNow();
    const [h, m] = String(s.time || "20:00").split(":").map(Number);
    if (now.hh * 60 + now.mm < h * 60 + m) return;
    if (s.lastSent === dayKey(now)) return;
    // mark first, so a slow send can never go out twice
    await MoreSetting.findOneAndUpdate({ key: KEY }, { $set: { value: { ...s, lastSent: dayKey(now) } } }, { upsert: true });
    const text = await buildSummaryText();
    const r = await sendToAdmins(text);
    console.log("DAILY SUMMARY sent:", r.sent, "failed:", r.failed.length);
  } catch (e) {
    console.error("DAILY SUMMARY ERROR:", e?.message || e);
  } finally {
    running = false;
  }
};

export const startDailySummary = () => {
  setInterval(tick, 60 * 1000);
  console.log("📊 Daily summary scheduler started (off until switched ON)");
};
