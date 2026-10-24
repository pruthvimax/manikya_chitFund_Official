import Group from "../models/Group.js";
import PushToken from "../models/PushToken.js";
import { sendPush } from "./pushNotifier.js";

/* =========================================================
   SHARED HELPERS FOR "SPIN STARTS AT ..." NOTIFICATIONS
   (used by spinAnnounceController.js and spinReminders.js)
   Only READS Group / PushToken and sends a push.
========================================================= */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* "DD-MM-YYYY" + "HH:MM" (India time) -> Date.
   Works the same on any server time zone (Render is UTC). */
export const parseIstDateTime = (dateString, timeString) => {
  const d = String(dateString || "").trim().split("-");
  const t = String(timeString || "").trim().split(":");
  if (d.length !== 3 || t.length !== 2) return null;

  const [day, month, year, hours, minutes] = [...d, ...t].map(Number);
  if (![day, month, year, hours, minutes].every(Number.isInteger)) return null;
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  const utc = Date.UTC(year, month - 1, day, hours, minutes, 0, 0);
  const check = new Date(utc);
  // reject 31-02 style dates that roll over
  if (check.getUTCDate() !== day || check.getUTCMonth() !== month - 1) return null;

  return new Date(utc - IST_OFFSET_MS);
};

/* "25 Oct 2026" and "06:30 PM" from what the admin typed */
export const prettySpinDate = (dateString) => {
  const [day, month, year] = String(dateString).split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
};

export const prettySpinTime = (timeString) => {
  const [h, m] = String(timeString).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
};

/* the ready-made messages */
export const buildSpinMessage = (kind, { groupCode, spinDate, spinTime }) => {
  const date = prettySpinDate(spinDate);
  const time = prettySpinTime(spinTime);

  const LEFT_TEXT = {
    m10: "10 minutes",
    m5: "5 minutes",
    m2: "2 minutes",
    m1: "1 minute",
    s30: "30 seconds",
  };

  if (kind === "s30" || kind === "m1") {
    return {
      title: `Spin starts in ${LEFT_TEXT[kind]}!`,
      body: `Group ${groupCode}: the live spin begins at ${time}. Open the app now.`,
    };
  }
  if (LEFT_TEXT[kind]) {
    return {
      title: `Spin starts in ${LEFT_TEXT[kind]}`,
      body: `Group ${groupCode}: the live spin begins at ${time}. Get ready!`,
    };
  }
  return {
    title: `Group ${groupCode} - live spin scheduled`,
    body: `The live spin will start on ${date} at ${time}. Be ready!`,
  };
};

/* push to every member of that group */
export const notifyGroupMembers = async (groupMongoId, message, route = "/auctionroom") => {
  const group = await Group.findById(groupMongoId).lean();
  if (!group) return 0;

  const userids = (group.members || []).map((m) => String(m.memberId));
  if (userids.length === 0) return 0;

  const tokens = await PushToken.find({ userid: { $in: userids } }).lean();
  if (tokens.length === 0) return 0;

  const { sent } = await sendPush(tokens, {
    title: message.title,
    body: message.body,
    data: { route },
  });
  return sent || 0;
};
