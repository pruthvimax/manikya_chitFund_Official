import crypto from "crypto";
import SpinSession from "../models/SpinSession.js";
import { emitSpinStart } from "../realtime/socket.js";
import {
  buildCandidates,
  findSession,
  getAuctionEnd,
  isMemberOfGroup,
  isSpinnerKeyConfigured,
  isValidSpinnerKey,
  loadAuction,
  loadResultExtras,
  toAdminState,
  toPublicState,
} from "../realtime/spinnerCore.js";

/* =========================================================
   ADMIN GUARD

   Every admin spinner route must send the header
       x-spinner-key: <SPINNER_ADMIN_KEY>
   The key lives only in the server environment (Render env var).
========================================================= */
export const requireSpinnerAdmin = (req, res, next) => {
  if (!isSpinnerKeyConfigured()) {
    return res.status(503).json({
      success: false,
      message: "Spinner admin key is not configured on the server.",
    });
  }

  if (!isValidSpinnerKey(req.headers["x-spinner-key"])) {
    return res.status(401).json({
      success: false,
      message: "Invalid spinner admin key.",
    });
  }

  next();
};

const LEAD_TIME_MS = 2500; // time for the start message to reach every phone
const MIN_DURATION_MS = 6000;
const MAX_DURATION_MS = 20000;
const MIN_ROTATIONS = 4;
const MAX_ROTATIONS = 12;

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
};

/* =========================================================
   ADMIN - GET CANDIDATES (+ current spin, if any)
   GET /api/spinner/candidates?notificationId=...
========================================================= */
export const getSpinnerCandidates = async (req, res) => {
  try {
    const found = await loadAuction(req.query);
    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });
    }

    const { notification, group } = found;

    const auctionEnd = getAuctionEnd(notification);
    const auctionEnded = Boolean(auctionEnd) && Date.now() >= auctionEnd.getTime();

    const { candidates, usedFallback, topBidAmount, totalBids } =
      await buildCandidates(notification, group);

    const session = await findSession(notification._id);

    return res.json({
      success: true,
      notificationId: String(notification._id),
      groupId: group.groupId,
      auctionEndDate: notification.auctionEndDate,
      auctionEndTime: notification.auctionEndTime,
      auctionEndsAt: auctionEnd ? auctionEnd.getTime() : null,
      auctionEnded,
      maxBidAmount: Number(notification.maxBidAmount) || 0,
      topBidAmount,
      usedFallback,
      totalBids,
      candidates,
      winnerAlreadyRecorded: Boolean(
        String(notification.winnerGroupId || "").trim()
      ),
      session: session ? toAdminState(session) : null,
      serverTime: Date.now(),
    });
  } catch (err) {
    console.error("❌ SPINNER CANDIDATES ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================================================
   ADMIN - START SPIN
   POST /api/spinner/start
   body: {
     notificationId,
     targetGroupMemberId?,   // omit  => random draw
     durationSec?, rotations?
   }
========================================================= */
export const startSpin = async (req, res) => {
  try {
    const found = await loadAuction(req.body);
    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });
    }

    const { notification, group } = found;

    /* 1. auction must be closed for bidding */
    const auctionEnd = getAuctionEnd(notification);
    if (!auctionEnd) {
      return res.status(400).json({
        success: false,
        message: "Auction end date/time is invalid.",
      });
    }
    if (Date.now() < auctionEnd.getTime()) {
      return res.status(400).json({
        success: false,
        message: "The auction is still running. Spin is available after bidding ends.",
        auctionEndsAt: auctionEnd.getTime(),
      });
    }

    /* 2. a winner must not already be recorded for this auction */
    if (String(notification.winnerGroupId || "").trim()) {
      return res.status(409).json({
        success: false,
        message: "A winner is already recorded for this auction.",
      });
    }

    /* 3. only one spin per auction */
    const existing = await findSession(notification._id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "This auction has already been spun.",
        session: toAdminState(existing),
      });
    }

    /* 4. candidates come from trusted database records only */
    const { candidates, usedFallback } = await buildCandidates(
      notification,
      group
    );

    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No eligible members to spin.",
      });
    }

    /* 5. decide the winner on the server */
    const rawTarget = String(req.body.targetGroupMemberId || "").trim();

    let winnerIndex;
    let mode;

    if (rawTarget) {
      winnerIndex = candidates.findIndex((c) => c.groupMemberId === rawTarget);
      if (winnerIndex < 0) {
        return res.status(400).json({
          success: false,
          message: "Selected member is not an eligible candidate.",
        });
      }
      mode = "ADMIN_SELECTED";
    } else {
      winnerIndex = crypto.randomInt(0, candidates.length); // cryptographically secure
      mode = "RANDOM";
    }

    const winner = candidates[winnerIndex];

    const durationMs = Math.round(
      clamp(req.body.durationSec, MIN_DURATION_MS / 1000, MAX_DURATION_MS / 1000, 9) * 1000
    );
    const rotations = Math.round(
      clamp(req.body.rotations, MIN_ROTATIONS, MAX_ROTATIONS, 6)
    );
    const seed = crypto.randomInt(0, 1000000) / 1000000;

    const { chitValue, previousWinningBid } = await loadResultExtras(
      notification,
      group
    );

    const now = Date.now();
    const startsAt = new Date(now + LEAD_TIME_MS);
    const endsAt = new Date(now + LEAD_TIME_MS + durationMs);

    /* 6. save. The unique index on notificationId makes this atomic. */
    let session;
    try {
      session = await SpinSession.create({
        notificationId: notification._id,
        groupObjectId: group._id,
        groupId: String(group.groupId),
        chitId: String(group.chitId || ""),
        auctionEndDate: String(notification.auctionEndDate).trim(),
        auctionEndTime: String(notification.auctionEndTime).trim(),
        maxBidAmount: Number(notification.maxBidAmount) || 0,
        chitValue,
        previousWinningBid,
        usedFallback,
        candidates,
        winnerIndex,
        winner,
        mode,
        rotations,
        durationMs,
        seed,
        startsAt,
        endsAt,
        startedBy: "admin",
        audit: [
          {
            event: "SPIN_STARTED",
            by: "admin",
            detail:
              `mode=${mode}; candidates=${candidates.length}; ` +
              `winner=${winner.groupMemberId}; ` +
              (mode === "ADMIN_SELECTED"
                ? "winner chosen by admin before the spin"
                : "winner chosen by server secure random"),
          },
        ],
      });
    } catch (err) {
      if (err?.code === 11000) {
        // another request won the race
        const other = await findSession(notification._id);
        return res.status(409).json({
          success: false,
          message: "This auction has already been spun.",
          session: other ? toAdminState(other) : null,
        });
      }
      throw err;
    }

    /* 7. tell everybody watching THIS auction */
    await emitSpinStart(notification._id, session);

    return res.status(201).json({
      success: true,
      session: toAdminState(session),
    });
  } catch (err) {
    console.error("❌ SPINNER START ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================================================
   MEMBER / ADMIN - GET CURRENT STATE
   GET /api/spinner/state?userid=...&groupId=...&auctionEndDate=...&auctionEndTime=...
   (or ?notificationId=...)
   Members must belong to the group. Admin sends x-spinner-key.
========================================================= */
export const getSpinnerState = async (req, res) => {
  try {
    const found = await loadAuction(req.query);
    if (!found) {
      return res
        .status(404)
        .json({ success: false, message: "Auction not found" });
    }

    const { notification, group } = found;

    const isAdmin = isValidSpinnerKey(req.headers["x-spinner-key"]);
    if (!isAdmin && !isMemberOfGroup(group, req.query.userid)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }

    const auctionEnd = getAuctionEnd(notification);
    const auctionEnded = Boolean(auctionEnd) && Date.now() >= auctionEnd.getTime();

    const session = await findSession(notification._id);

    if (!session) {
      return res.json({
        success: true,
        exists: false,
        notificationId: String(notification._id),
        auctionEnded,
        serverTime: Date.now(),
      });
    }

    return res.json({
      success: true,
      auctionEnded,
      ...(isAdmin
        ? toAdminState(session)
        : toPublicState(session, { userid: req.query.userid })),
    });
  } catch (err) {
    console.error("❌ SPINNER STATE ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
