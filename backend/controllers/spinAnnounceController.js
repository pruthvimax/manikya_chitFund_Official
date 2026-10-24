import Group from "../models/Group.js";
import Notification from "../models/Notification.js";
import SpinAnnouncement from "../models/SpinAnnouncement.js";
import {
  findSession,
  getAuctionEnd,
  loadAuction,
} from "../realtime/spinnerCore.js";
import {
  buildSpinMessage,
  notifyGroupMembers,
  parseIstDateTime,
  prettySpinDate,
  prettySpinTime,
} from "../realtime/spinAnnounce.js";

/* =========================================================
   "SPIN STARTS AT ..." ANNOUNCEMENT  (admin, needs x-spinner-key)

   POST /api/spinner/announce          set / change the spin time + notify now
   GET  /api/spinner/announce          current announcement for an auction
   POST /api/spinner/announce/cancel   stop the reminders

   Does not touch bidding, winners or the spin itself.
========================================================= */

const MIN_LEAD_MS = 60 * 1000;
const TEN_MIN_MS = 10 * 60 * 1000;

const toClient = (a) =>
  a
    ? {
        id: String(a._id),
        status: a.status,
        spinDate: a.spinDate,
        spinTime: a.spinTime,
        spinDateText: prettySpinDate(a.spinDate),
        spinTimeText: prettySpinTime(a.spinTime),
        spinAt: new Date(a.spinAt).getTime(),
        sent: {
          now: Boolean(a.sent?.now),
          m10: Boolean(a.sent?.m10),
          m1: Boolean(a.sent?.m1),
          m5: Boolean(a.sent?.m5),
          m2: Boolean(a.sent?.m2),
          s30: Boolean(a.sent?.s30),
        },
        notifiedCount: a.notifiedCount || 0,
      }
    : null;

export const getSpinAnnouncement = async (req, res) => {
  try {
    const found = await loadAuction(req.query);
    if (!found) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const a = await SpinAnnouncement.findOne({
      notificationId: found.notification._id,
      status: { $in: ["active", "done"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, announcement: toClient(a), serverTime: Date.now() });
  } catch (err) {
    console.error("❌ SPIN ANNOUNCE GET ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const announceSpin = async (req, res) => {
  try {
    const found = await loadAuction(req.body);
    if (!found) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }
    const { notification, group } = found;

    if (await findSession(notification._id)) {
      return res
        .status(409)
        .json({ success: false, message: "This auction has already been spun." });
    }

    const spinDate = String(req.body?.spinDate || "").trim();
    const spinTime = String(req.body?.spinTime || "").trim();
    const spinAt = parseIstDateTime(spinDate, spinTime);

    if (!spinAt) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid date (DD-MM-YYYY) and time (HH:MM, 24 hour).",
      });
    }

    const now = Date.now();
    if (spinAt.getTime() < now + MIN_LEAD_MS) {
      return res.status(400).json({
        success: false,
        message: "The spin time must be at least 1 minute from now.",
      });
    }

    const auctionEnd = getAuctionEnd(notification);
    if (auctionEnd && spinAt.getTime() < auctionEnd.getTime()) {
      return res.status(400).json({
        success: false,
        message: `The spin time must be after the auction end (${notification.auctionEndDate} ${notification.auctionEndTime}).`,
      });
    }

    // a new time replaces the old one: stop the old reminders
    await SpinAnnouncement.updateMany(
      { notificationId: notification._id, status: "active" },
      { $set: { status: "cancelled" } }
    );

    const leftMs = spinAt.getTime() - now;
    const doc = await SpinAnnouncement.create({
      notificationId: notification._id,
      groupMongoId: group._id,
      groupCode: String(group.groupId),
      spinDate,
      spinTime,
      spinAt,
      status: "active",
      // reminders that no longer make sense are marked as already sent
      sent: {
        now: true,
        m10: leftMs < TEN_MIN_MS + MIN_LEAD_MS,
        m5: leftMs <= 5 * 60 * 1000,
        m2: leftMs <= 2 * 60 * 1000,
        m1: leftMs <= 60 * 1000,
        s30: leftMs <= 30 * 1000,
      },
    });

    const message = buildSpinMessage("now", {
      groupCode: doc.groupCode,
      spinDate,
      spinTime,
    });
    const notified = await notifyGroupMembers(group._id, message);

    doc.notifiedCount = notified;
    await doc.save();

    return res.json({
      success: true,
      announcement: toClient(doc),
      notified,
      message,
    });
  } catch (err) {
    console.error("❌ SPIN ANNOUNCE ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/* =========================================================
   MEMBER - SPIN ANNOUNCEMENTS FOR THE NOTIFICATION LIST
   GET /api/spinner/announcements?userid=...
   Only the member's own groups; cancelled ones are left out.
========================================================= */
export const getMemberSpinAnnouncements = async (req, res) => {
  try {
    const userid = String(req.query?.userid || "").trim();
    if (!userid) return res.json([]);

    const groups = await Group.find({ "members.memberId": userid })
      .select("_id groupId")
      .lean();
    if (groups.length === 0) return res.json([]);

    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const list = await SpinAnnouncement.find({
      groupMongoId: { $in: groups.map((g) => g._id) },
      status: { $in: ["active", "done"] },
      spinAt: { $gt: since },
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const notes = await Notification.find({
      _id: { $in: list.map((a) => a.notificationId) },
    })
      .select("auctionEndDate auctionEndTime")
      .lean();
    const noteMap = {};
    notes.forEach((n) => {
      noteMap[String(n._id)] = n;
    });

    return res.json(
      list.map((a) => ({
        id: String(a._id),
        groupMongoId: String(a.groupMongoId),
        groupCode: a.groupCode,
        auctionEndDate: noteMap[String(a.notificationId)]?.auctionEndDate || "",
        auctionEndTime: noteMap[String(a.notificationId)]?.auctionEndTime || "",
        spinDateText: prettySpinDate(a.spinDate),
        spinTimeText: prettySpinTime(a.spinTime),
        spinAt: new Date(a.spinAt).getTime(),
        createdAt: a.createdAt,
      }))
    );
  } catch (err) {
    console.error("❌ SPIN ANNOUNCEMENTS (member) ERROR:", err);
    return res.json([]);
  }
};

export const cancelSpinAnnouncement = async (req, res) => {
  try {
    const found = await loadAuction(req.body);
    if (!found) {
      return res.status(404).json({ success: false, message: "Auction not found" });
    }

    const result = await SpinAnnouncement.updateMany(
      { notificationId: found.notification._id, status: "active" },
      { $set: { status: "cancelled" } }
    );

    return res.json({ success: true, cancelled: result.modifiedCount || 0 });
  } catch (err) {
    console.error("❌ SPIN ANNOUNCE CANCEL ERROR:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
