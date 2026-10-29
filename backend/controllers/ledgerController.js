import bcrypt from "bcryptjs";
import Group from "../models/Group.js";
import Member from "../models/Member.js";
import LedgerSetting from "../models/LedgerSetting.js";

/* =========================================================
   LEDGER (admin only, behind a password)

   POST /api/ledger/verify            { password }
   POST /api/ledger/change-password   { oldPassword, newPassword }
   GET  /api/ledger/summary?month=YYYY-MM     header x-ledger-password

   The page password is 7259 until it is changed in the app. After a
   change it is kept as a hash in the "ledgersettings" collection.
   RESET: delete that one document in MongoDB -> back to the default
   (the LEDGER_PASSWORD environment variable, or 7259 if not set).

   Read only: nothing about groups, members or payments is changed.
========================================================= */

const DEFAULT_PASSWORD = String(process.env.LEDGER_PASSWORD || "7259");
const IST_MS = 5.5 * 60 * 60 * 1000;

/* ---------- password check (+ a small brute-force lock) ---------- */
const fails = new Map(); // ip -> { n, until }
const MAX_FAILS = 5;
const LOCK_MS = 5 * 60 * 1000;

const ipOf = (req) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();

const lockedFor = (ip) => {
  const f = fails.get(ip);
  return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 1000) : 0;
};

const passwordOk = async (plain) => {
  const doc = await LedgerSetting.findOne({ key: "ledger" }).lean();
  if (doc?.passwordHash) return bcrypt.compare(String(plain || ""), doc.passwordHash);
  return String(plain || "") === DEFAULT_PASSWORD;
};

const check = async (req, res, plain) => {
  const ip = ipOf(req);
  const wait = lockedFor(ip);
  if (wait) {
    res.status(429).json({ success: false, message: `Too many wrong tries. Try again in ${Math.ceil(wait / 60)} min.` });
    return false;
  }
  if (await passwordOk(plain)) {
    fails.delete(ip);
    return true;
  }
  const f = fails.get(ip) || { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= MAX_FAILS) {
    f.n = 0;
    f.until = Date.now() + LOCK_MS;
  }
  fails.set(ip, f);
  res.status(401).json({ success: false, message: "Wrong password" });
  return false;
};

export const verifyLedgerPassword = async (req, res) => {
  try {
    if (!(await check(req, res, req.body?.password))) return;
    res.json({ success: true });
  } catch (err) {
    console.error("LEDGER VERIFY ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changeLedgerPassword = async (req, res) => {
  try {
    const next = String(req.body?.newPassword || "").trim();
    if (!/^\d{4,8}$/.test(next)) {
      return res.status(400).json({ success: false, message: "New password must be 4 to 8 digits." });
    }
    if (!(await check(req, res, req.body?.oldPassword))) return;

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(next, salt);
    await LedgerSetting.findOneAndUpdate(
      { key: "ledger" },
      { $set: { passwordHash, changedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (err) {
    console.error("LEDGER CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/* ---------- summary ---------- */
// a month's result is kept for a short time so reopening / switching back is instant
const CACHE_MS = 45 * 1000;
const cache = new Map(); // "YYYY-MM" -> { at, body }

const istParts = (date) => {
  const d = new Date(new Date(date).getTime() + IST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate() };
};

export const getLedgerSummary = async (req, res) => {
  try {
    if (!(await check(req, res, req.headers["x-ledger-password"]))) return;

    // month = YYYY-MM (India time), default: this month
    const now = new Date();
    const cur = istParts(now);
    let y = cur.y;
    let m = cur.m;
    const q = /^(\d{4})-(\d{2})$/.exec(String(req.query.month || ""));
    if (q) {
      y = Number(q[1]);
      m = Math.min(Math.max(Number(q[2]) - 1, 0), 11);
    }
    const start = new Date(Date.UTC(y, m, 1) - IST_MS);
    const end = new Date(Date.UTC(y, m + 1, 1) - IST_MS);
    const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const todayStart = new Date(Date.UTC(cur.y, cur.m, cur.day) - IST_MS);

    const cacheKey = `${y}-${String(m + 1).padStart(2, "0")}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS && req.query.fresh !== "1") {
      return res.json(hit.body);
    }

    // only the fields the ledger needs (much less data to read and move)
    const groups = await Group.find(
      {},
      {
        groupId: 1,
        "members.memberId": 1,
        "members.groupMemberId": 1,
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

    let due = 0;
    let collected = 0;
    let paymentCount = 0;
    const days = Array.from({ length: daysInMonth }, (_, i) => ({ d: i + 1, amount: 0 }));
    const emps = new Map(); // key -> { name, empId, amount, count }
    const overdue = new Map(); // groupId|memberId -> row
    const memberIds = new Set();

    for (const g of groups) {
      for (const mem of g.members || []) {
        for (const col of mem.collections || []) {
          const inst = Number(col.installmentAmount) || 0;
          const payments = col.payments || [];

          // collected in the selected month (every payment, with who collected it)
          for (const p of payments) {
            if (!p.paidAt) continue;
            const t = new Date(p.paidAt);
            if (t < start || t >= end) continue;
            const amt = Number(p.amount) || 0;
            collected += amt;
            paymentCount += 1;
            days[istParts(t).day - 1].amount += amt;

            const empId = String(p.employeeId || "").trim();
            const name = String(p.employeeName || p.collectedBy || empId || "").trim() || "Not recorded";
            const key = empId || name.toLowerCase();
            const e = emps.get(key) || { name, empId, amount: 0, count: 0 };
            e.amount += amt;
            e.count += 1;
            emps.set(key, e);
          }

          if (!col.endDate || inst <= 0) continue;
          const endDate = new Date(col.endDate);

          // due in the selected month
          if (endDate >= start && endDate < end) due += inst;

          // overdue right now (installment only; penalty is separate)
          if (endDate < todayStart) {
            const paid = payments
              .filter((p) => p.paymentType !== "PENALTY")
              .reduce((s, p) => s + (Number(p.amount) || 0), 0);
            const pending = Math.max(inst - paid, 0);
            if (pending > 0) {
              const key = `${g.groupId}|${mem.memberId}`;
              const r = overdue.get(key) || {
                groupId: String(g.groupId),
                memberId: String(mem.memberId),
                groupMemberId: String(mem.groupMemberId || ""),
                pending: 0,
                months: 0,
                oldest: endDate,
              };
              r.pending += pending;
              r.months += 1;
              if (endDate < r.oldest) r.oldest = endDate;
              overdue.set(key, r);
              memberIds.add(String(mem.memberId));
            }
          }
        }
      }
    }

    const members = await Member.find({ userid: { $in: Array.from(memberIds) } })
      .select("userid username phone")
      .lean();
    const byId = {};
    members.forEach((x) => {
      byId[x.userid] = x;
    });

    const defaulterRows = Array.from(overdue.values())
      .map((r) => ({
        memberName: byId[r.memberId]?.username || r.memberId,
        phone: byId[r.memberId]?.phone || "",
        groupId: r.groupId,
        groupMemberId: r.groupMemberId,
        pending: r.pending,
        months: r.months,
        daysLate: Math.max(1, Math.round((todayStart.getTime() - new Date(r.oldest).getTime()) / 86400000)),
      }))
      .sort((a, b) => b.daysLate - a.daysLate || b.pending - a.pending);

    const body = {
      success: true,
      month: cacheKey,
      due,
      collected,
      paymentCount,
      percent: due > 0 ? Math.min(100, Math.round((collected / due) * 100)) : 0,
      days,
      employees: Array.from(emps.values()).sort((a, b) => b.amount - a.amount).slice(0, 15),
      defaulters: {
        count: defaulterRows.length,
        total: defaulterRows.reduce((s, r) => s + r.pending, 0),
        items: defaulterRows.slice(0, 1000),
      },
    };
    cache.set(cacheKey, { at: Date.now(), body });
    res.json(body);
  } catch (err) {
    console.error("LEDGER SUMMARY ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
