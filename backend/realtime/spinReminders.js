import SpinAnnouncement from "../models/SpinAnnouncement.js";
import { findSession } from "./spinnerCore.js";
import { buildSpinMessage, notifyGroupMembers } from "./spinAnnounce.js";

/* =========================================================
   SPIN REMINDER WORKER
   Every 5 seconds: looks at active "spin starts at" announcements
   and sends the reminders to that group's members:
   10 minutes, 5 minutes, 2 minutes, 1 minute and 30 seconds before.
   Each reminder is claimed in the database first, so it can never
   go out twice. A reminder that is already too late (server was
   asleep) is skipped instead of sending a wrong "10 minutes" text.
========================================================= */

const CHECK_EVERY_MS = 5 * 1000;
const ONE_MIN_MS = 60 * 1000;

// biggest first
const STAGES = [
  { field: "m10", kind: "m10", ms: 10 * 60 * 1000 },
  { field: "m5", kind: "m5", ms: 5 * 60 * 1000 },
  { field: "m2", kind: "m2", ms: 2 * 60 * 1000 },
  { field: "m1", kind: "m1", ms: 60 * 1000 },
  { field: "s30", kind: "s30", ms: 30 * 1000 },
];

const claim = async (id, field) => {
  // $ne:true also matches announcements saved before this field existed
  const res = await SpinAnnouncement.findOneAndUpdate(
    { _id: id, status: "active", [`sent.${field}`]: { $ne: true } },
    { $set: { [`sent.${field}`]: true } },
    { new: true }
  );
  return res;
};

const tick = async () => {
  const now = Date.now();

  const list = await SpinAnnouncement.find({
    status: "active",
    spinAt: { $gt: new Date(now - 2 * ONE_MIN_MS) },
  }).lean();

  for (const a of list) {
    try {
      const spinAt = new Date(a.spinAt).getTime();
      const left = spinAt - now;

      // the spin already happened -> stop
      if (await findSession(a.notificationId)) {
        await SpinAnnouncement.updateOne({ _id: a._id }, { $set: { status: "done" } });
        continue;
      }

      const info = { groupCode: a.groupCode, spinDate: a.spinDate, spinTime: a.spinTime };

      // every reminder whose moment has come and was not sent yet
      const due = STAGES.filter((st) => left <= st.ms && !a.sent?.[st.field]);
      if (due.length > 0) {
        const imminent = due[due.length - 1]; // the smallest one = the right one now
        let sendIt = false;

        for (const st of due) {
          const claimed = await claim(a._id, st.field);
          if (claimed && st === imminent) sendIt = true;
        }

        // only send it if it is still on time (not minutes late)
        const lateBy = imminent.ms - left;
        const tolerance = Math.min(60 * 1000, imminent.ms / 2);
        if (sendIt && left > 0 && lateBy <= tolerance) {
          await notifyGroupMembers(a.groupMongoId, buildSpinMessage(imminent.kind, info));
        }
      }

      if (left < -ONE_MIN_MS) {
        await SpinAnnouncement.updateOne({ _id: a._id }, { $set: { status: "done" } });
      }
    } catch (err) {
      console.error("SPIN REMINDER ERROR:", err?.message || err);
    }
  }
};

let timer = null;

export const startSpinReminders = () => {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => console.error("SPIN REMINDER TICK ERROR:", err?.message || err));
  }, CHECK_EVERY_MS);
  console.log("⏰ Spin reminder worker started");
};
