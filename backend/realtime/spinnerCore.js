import crypto from "crypto";
import mongoose from "mongoose";
import Bid from "../models/Bid.js";
import ChitScheme from "../models/ChitScheme.js";
import Group from "../models/Group.js";
import Member from "../models/Member.js";
import Notification from "../models/Notification.js";
import SpinSession from "../models/SpinSession.js";

/* =========================================================
   SHARED HELPERS FOR THE SPINNER FEATURE
   (used by spinnerController.js and realtime/socket.js)

   Nothing here changes existing bidding or winner logic. It only
   READS Notification, Bid, Group and Member records.
========================================================= */

/* ---------- admin key ---------- */

export const isSpinnerKeyConfigured = () =>
  Boolean(String(process.env.SPINNER_ADMIN_KEY || "").trim());

export const isValidSpinnerKey = (candidate) => {
  const expected = String(process.env.SPINNER_ADMIN_KEY || "").trim();
  if (!expected || !candidate) return false;

  // Hash both sides so timingSafeEqual always gets equal-length buffers.
  const a = crypto.createHash("sha256").update(String(candidate).trim()).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
};

/* ---------- date helper (same format as bidController) ---------- */

// "DD-MM-YYYY" + "HH:MM" -> Date (server local time, exactly like placeBid)
export const createDateTime = (dateString, timeString) => {
  if (!dateString || !timeString) return null;

  const d = String(dateString).trim().split("-");
  const t = String(timeString).trim().split(":");
  if (d.length !== 3 || t.length !== 2) return null;

  const day = Number(d[0]);
  const month = Number(d[1]);
  const year = Number(d[2]);
  const hours = Number(t[0]);
  const minutes = Number(t[1]);

  if (![day, month, year, hours, minutes].every(Number.isInteger)) return null;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

export const getAuctionEnd = (notification) =>
  createDateTime(
    notification?.auctionEndDate || notification?.auctionDate,
    notification?.auctionEndTime
  );

/* ---------- load auction ---------- */

/*
  Accepts EITHER:
    - notificationId
    - groupId (Mongo _id or public code) + auctionEndDate + auctionEndTime
  Returns { notification, group } or null.
*/
export const loadAuction = async (src = {}) => {
  let notification = null;

  const notificationId = src.notificationId
    ? String(src.notificationId).trim()
    : "";

  if (notificationId && mongoose.Types.ObjectId.isValid(notificationId)) {
    notification = await Notification.findById(notificationId).lean();
  } else if (src.groupId && src.auctionEndDate && src.auctionEndTime) {
    const value = String(src.groupId).trim();
    const conditions = [{ groupId: value }];
    if (mongoose.Types.ObjectId.isValid(value)) {
      conditions.push({ _id: new mongoose.Types.ObjectId(value) });
    }

    const foundGroup = await Group.findOne({ $or: conditions }).lean();
    if (!foundGroup) return null;

    notification = await Notification.findOne({
      groupId: foundGroup._id,
      auctionEndDate: String(src.auctionEndDate).trim(),
      auctionEndTime: String(src.auctionEndTime).trim(),
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  if (!notification) return null;

  const group = await Group.findById(notification.groupId).lean();
  if (!group) return null;

  return { notification, group };
};

/* ---------- extra numbers for the winner card ---------- */

/*
  chitValue          : the scheme's chit amount for this group
  previousWinningBid : winning bid of the most recent EARLIER auction
                       of the same group (0 when there is none)
  Read-only lookups. If anything fails the value is 0 and the spin
  still works.
*/
export const loadResultExtras = async (notification, group) => {
  let chitValue = 0;
  let previousWinningBid = 0;
  let auctionNumber = 0;

  try {
    const scheme = await ChitScheme.findOne({
      chitId: String(group?.chitId || ""),
    }).lean();
    chitValue = Number(scheme?.chitAmount) || 0;
  } catch (err) {
    console.error("SPINNER chit value lookup failed:", err?.message);
  }

  try {
    const filter = {
      groupId: notification.groupId,
      _id: { $ne: notification._id },
      winnerBidAmount: { $gt: 0 },
    };
    if (notification.createdAt) filter.createdAt = { $lt: notification.createdAt };

    const previous = await Notification.findOne(filter)
      .sort({ createdAt: -1 })
      .lean();
    previousWinningBid = Number(previous?.winnerBidAmount) || 0;
  } catch (err) {
    console.error("SPINNER previous bid lookup failed:", err?.message);
  }

  /*
    auctionNumber : which month / auction this is (1, 2, 3 ...).
    It is the group's month (collection plan) that the auction end date
    falls in. If the plans do not tell, it is the count of this group's
    auctions up to this one.
  */
  try {
    const [dd, mm, yyyy] = String(notification.auctionEndDate || "")
      .trim()
      .split("-")
      .map(Number);
    const auctionDay = new Date(yyyy, (mm || 1) - 1, dd || 1, 12, 0, 0, 0).getTime();

    const plans = [...(group?.collectionPlans || [])]
      .filter((p) => Number(p.monthIndex) > 0)
      .sort((a, b) => Number(a.monthIndex) - Number(b.monthIndex));

    const inside = plans.find((p) => {
      if (!p.startDate || !p.endDate) return false;
      const start = new Date(p.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(p.endDate);
      end.setHours(23, 59, 59, 999);
      return auctionDay >= start.getTime() && auctionDay <= end.getTime();
    });

    if (inside) {
      auctionNumber = Number(inside.monthIndex) || 0;
    } else if (Number.isFinite(auctionDay)) {
      const next = plans.find((p) => p.endDate && new Date(p.endDate).getTime() >= auctionDay);
      if (next) auctionNumber = Number(next.monthIndex) || 0;
    }

    if (!auctionNumber) {
      const countFilter = { groupId: notification.groupId };
      if (notification.createdAt) countFilter.createdAt = { $lte: notification.createdAt };
      auctionNumber = await Notification.countDocuments(countFilter);
    }
  } catch (err) {
    console.error("SPINNER auction number lookup failed:", err?.message);
  }

  return { chitValue, previousWinningBid, auctionNumber };
};

/* ---------- who may watch ---------- */

export const isMemberOfGroup = (group, userid) =>
  Boolean(userid) &&
  (group?.members || []).some((m) => String(m.memberId) === String(userid));

/* ---------- candidate selection ---------- */

/*
  PURE function (no database), so it can be tested on its own.

  bids          : Bid records of ONE auction
  maxBidAmount  : the admin's maximum bid for this auction

  Rule:
    1. Everyone who bid the maximum amount is a candidate.
    2. If nobody reached the maximum, everyone tied at the highest
       bid is a candidate (usedFallback = true).
    3. A member (groupMemberId) appears only once.
*/
export const selectCandidatePool = (bids, maxBidAmount) => {
  const list = Array.isArray(bids) ? bids : [];
  if (list.length === 0) {
    return { pool: [], usedFallback: false, topBidAmount: 0 };
  }

  const amounts = list.map((b) => Number(b.bidAmount) || 0);
  const topBidAmount = Math.max(...amounts);
  const max = Number(maxBidAmount) || 0;

  let pool = max > 0 ? list.filter((b) => Number(b.bidAmount) >= max) : [];
  let usedFallback = false;

  if (pool.length === 0) {
    pool = list.filter((b) => Number(b.bidAmount) === topBidAmount);
    usedFallback = true;
  }

  // one entry per groupMemberId (earliest bid wins the tie)
  const sorted = [...pool].sort(
    (a, b) => new Date(a.bidTime || 0) - new Date(b.bidTime || 0)
  );
  const seen = new Set();
  const unique = [];
  for (const bid of sorted) {
    const key = String(bid.groupMemberId);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(bid);
  }

  return { pool: unique, usedFallback, topBidAmount };
};

/*
  Reads trusted database records and returns the spinner candidates.
  Re-checks the existing "previous winner cannot bid again" rule and
  that the member really belongs to the group (this also covers bids
  added by the admin).
*/
export const buildCandidates = async (notification, group) => {
  const bids = await Bid.find({
    groupId: String(group.groupId),
    auctionDate: String(notification.auctionEndDate || "").trim(),
    auctionTime: String(notification.auctionEndTime || "").trim(),
  })
    .sort({ bidAmount: -1, bidTime: 1 })
    .lean();

  const { pool, usedFallback, topBidAmount } = selectCandidatePool(
    bids,
    notification.maxBidAmount
  );

  // previous winners of THIS group (other auctions)
  const previous = await Notification.find(
    {
      groupId: group._id,
      _id: { $ne: notification._id },
      winnerGroupId: { $exists: true, $ne: "" },
    },
    { winnerGroupId: 1 }
  ).lean();
  const previousWinnerIds = new Set(
    previous.map((n) => String(n.winnerGroupId).trim())
  );

  const memberKeys = new Set(
    (group.members || []).map(
      (m) => `${String(m.memberId)}|${String(m.groupMemberId)}`
    )
  );

  const eligible = pool.filter(
    (b) =>
      memberKeys.has(`${String(b.memberId)}|${String(b.groupMemberId)}`) &&
      !previousWinnerIds.has(String(b.groupMemberId).trim())
  );

  const members = await Member.find(
    { userid: { $in: [...new Set(eligible.map((b) => String(b.memberId)))] } },
    { userid: 1, username: 1 }
  ).lean();
  const nameById = {};
  members.forEach((m) => {
    nameById[String(m.userid)] = m.username || "";
  });

  const candidates = eligible
    .map((b) => ({
      memberId: String(b.memberId),
      groupMemberId: String(b.groupMemberId),
      memberName: nameById[String(b.memberId)] || "",
      bidAmount: Number(b.bidAmount) || 0,
      bidTime: b.bidTime || null,
    }))
    // fixed, repeatable wheel order: MB01, MB02, MB10 ...
    .sort((a, b) =>
      a.groupMemberId.localeCompare(b.groupMemberId, undefined, {
        numeric: true,
      })
    );

  return {
    candidates,
    usedFallback,
    topBidAmount,
    totalBids: bids.length,
  };
};

/* ---------- state sent to devices ---------- */

const statusOf = (session, now = Date.now()) => {
  if (now < new Date(session.startsAt).getTime()) return "starting";
  if (now < new Date(session.endsAt).getTime()) return "spinning";
  return "completed";
};

/*
  What members receive. Wheel labels are groupMemberId only.
  The `mode` is ALWAYS included so every screen can show how the
  winner was chosen.
*/
export const toPublicState = (session, viewer = {}) => {
  const now = Date.now();
  // The winner (and only the winner) gets to see his own name.
  const isWinner =
    Boolean(viewer?.userid) &&
    String(session.winner.memberId) === String(viewer.userid);
  return {
    exists: true,
    notificationId: String(session.notificationId),
    groupId: session.groupId,
    auctionEndDate: session.auctionEndDate,
    auctionEndTime: session.auctionEndTime,
    status: statusOf(session, now),
    mode: session.mode,
    candidates: session.candidates.map((c) => ({
      groupMemberId: c.groupMemberId,
    })),
    winnerIndex: session.winnerIndex,
    winner: {
      groupMemberId: session.winner.groupMemberId,
      // Everyone sees the group member ID. The name is sent only to
      // the winner himself.
      memberName: isWinner ? session.winner.memberName || "" : "",
      bidAmount: session.winner.bidAmount || 0,
      isWinner,
    },
    chitValue: session.chitValue || 0,
    previousWinningBid: session.previousWinningBid || 0,
    auctionNumber: session.auctionNumber || 0,
    rotations: session.rotations,
    durationMs: session.durationMs,
    seed: session.seed,
    startsAt: new Date(session.startsAt).getTime(),
    endsAt: new Date(session.endsAt).getTime(),
    serverTime: now,
  };
};

// Admin gets the same state plus the audit trail.
export const toAdminState = (session) => ({
  ...toPublicState(session),
  // the admin may see the winner's name
  winner: {
    groupMemberId: session.winner.groupMemberId,
    memberName: session.winner.memberName || "",
    bidAmount: session.winner.bidAmount || 0,
    isWinner: false,
  },
  startedBy: session.startedBy,
  usedFallback: Boolean(session.usedFallback),
  audit: (session.audit || []).map((a) => ({
    event: a.event,
    at: a.at,
    by: a.by,
    detail: a.detail,
  })),
});

export const findSession = async (notificationId) =>
  SpinSession.findOne({ notificationId }).lean();
