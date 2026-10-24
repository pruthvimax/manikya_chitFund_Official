import Group from "../models/Group.js";
import PushToken from "../models/PushToken.js";

/* =========================================================
   PUSH NOTIFICATIONS (phone shows a notification + icon number
   even when the app is closed). Uses Expo's free push service.
   Nothing here changes any existing controller: it only reads
   the finished response (see liveBadges.js) and sends a push.
========================================================= */

const EXPO_URL = process.env.EXPO_PUSH_URL || "https://exp.host/--/api/v2/push/send";

const chunk = (list, size) => {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

/* tokens: PushToken docs. Each gets its own badge number (stored + 1). */
export const sendPush = async (tokens, { title, body, data }) => {
  if (!Array.isArray(tokens) || tokens.length === 0) return { sent: 0 };

  const ops = tokens.map((t) => ({
    updateOne: { filter: { _id: t._id }, update: { $inc: { badge: 1 } } },
  }));
  await PushToken.bulkWrite(ops);

  const messages = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data: data || {},
    sound: "default",
    priority: "high",
    channelId: "default",
    badge: (t.badge || 0) + 1,
  }));

  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  let sent = 0;
  const dead = [];

  for (const part of chunk(messages, 100)) {
    try {
      const res = await fetch(EXPO_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(part),
      });
      const json = await res.json().catch(() => null);
      const tickets = Array.isArray(json?.data) ? json.data : [];
      tickets.forEach((tk, i) => {
        if (tk?.status === "ok") sent += 1;
        else if (tk?.details?.error === "DeviceNotRegistered") dead.push(part[i].to);
      });
    } catch (err) {
      console.error("PUSH SEND ERROR:", err?.message || err);
    }
  }

  // phones that uninstalled the app: stop sending to them
  if (dead.length) await PushToken.deleteMany({ token: { $in: dead } });

  console.log(`📲 push "${title}": sent ${sent}/${tokens.length}`);
  return { sent };
};

/* admin added an auction notification -> only that group's members */
export const notifyNewNotification = async (data) => {
  if (!data?.groupId) return;

  const group = await Group.findById(data.groupId).lean();
  if (!group) return;

  const userids = (group.members || []).map((m) => String(m.memberId));
  if (userids.length === 0) return;

  const tokens = await PushToken.find({ userid: { $in: userids } }).lean();

  await sendPush(tokens, {
    title: `Group ${group.groupId} - new auction`,
    body: data.message
      ? String(data.message).slice(0, 120)
      : "A new auction notification has been added.",
    data: { route: "/auctionroom" },
  });
};

/* admin published a vacancy -> everybody except members already in that group */
export const notifyNewVacancy = async (vacancy) => {
  if (!vacancy || vacancy.status === "Closed") return;

  const group = await Group.findOne({
    groupId: String(vacancy.groupId),
    chitId: String(vacancy.chitId),
  }).lean();

  const alreadyIn = new Set(
    (group?.members || []).map((m) => String(m.memberId))
  );

  const all = await PushToken.find({}).lean();
  const tokens = all.filter((t) => !alreadyIn.has(String(t.userid)));

  await sendPush(tokens, {
    title: "New vacancy available",
    body: `Group ${vacancy.groupId} has seats open. Tap to view.`,
    data: { route: "/vacancy" },
  });
};
