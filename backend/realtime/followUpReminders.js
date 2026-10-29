import DailyDatabase from "../models/DailyDatabase.js";
import FollowUpReminderLog from "../models/FollowUpReminderLog.js";
import PushToken from "../models/PushToken.js";
import { sendPush } from "./pushNotifier.js";

/* =========================================================
   FOLLOW-UP DUE -> PHONE NOTIFICATION (employee side)

   Every minute: finds Daily Leads whose follow-up date is today (or
   already passed) and not marked done, and sends the employee ONE push
   for the follow-ups that are due, e.g.
       "3 follow-ups due" / "Suresh, Meena, Ravi"
   It shows in the phone's notification bar even when the app is closed,
   and tapping it opens Daily Leads.

   - starts at REMIND_FROM_HOUR_IST (9:00 AM India time) on the due day
   - each follow-up is pushed once (tracked in FollowUpReminderLog), so
     restarts never repeat it; a lead that was not done is pushed again
     on the NEXT day as an overdue reminder
   - a follow-up added later the same day with today's date is pushed
     the moment it is saved
   Only reads leads and sends a push; no existing controller changes.
========================================================= */

const CHECK_EVERY_MS = 60 * 1000;
const REMIND_FROM_HOUR_IST = 9;

const istNow = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000);

const tick = async () => {
  const ist = istNow();
  if (ist.getUTCHours() < REMIND_FROM_HOUR_IST) return;
  const today = ist.toISOString().slice(0, 10);

  const due = await DailyDatabase.find({
    followUpDone: { $ne: true },
    followUpDate: { $gt: "", $lte: today },
  })
    .select("_id empId name followUpDate")
    .sort({ followUpDate: 1 })
    .lean();
  if (due.length === 0) return;

  const byEmp = new Map();
  for (const d of due) {
    if (!byEmp.has(d.empId)) byEmp.set(d.empId, []);
    byEmp.get(d.empId).push(d);
  }

  for (const [empId, list] of byEmp) {
    try {
      const log = await FollowUpReminderLog.findOneAndUpdate(
        { empId, day: today },
        { $setOnInsert: { empId, day: today } },
        { upsert: true, new: true }
      );
      const seen = new Set(log.notifiedIds || []);
      const fresh = list.filter((d) => !seen.has(String(d._id)));
      if (fresh.length === 0) continue;

      // claim them first, then send
      await FollowUpReminderLog.updateOne(
        { _id: log._id },
        { $addToSet: { notifiedIds: { $each: fresh.map((d) => String(d._id)) } } }
      );

      const tokens = await PushToken.find({ userid: `emp:${empId}` }).lean();
      if (tokens.length === 0) continue;

      const names = fresh.map((d) => d.name).filter(Boolean);
      const shown = names.slice(0, 3).join(", ");
      const more = names.length > 3 ? ` +${names.length - 3} more` : "";
      const overdue = fresh.some((d) => d.followUpDate < today);
      await sendPush(tokens, {
        title: `${fresh.length} follow-up${fresh.length === 1 ? "" : "s"} ${overdue ? "due / overdue" : "due today"}`,
        body: `${shown}${more}. Tap to call.`,
        data: { route: "/employee/dailyDatabase" },
      });
    } catch (err) {
      console.error("FOLLOW-UP REMINDER ERROR:", err?.message || err);
    }
  }
};

let timer = null;

export const startFollowUpReminders = () => {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => console.error("FOLLOW-UP REMINDER TICK ERROR:", err?.message || err));
  }, CHECK_EVERY_MS);
  console.log("📞 Follow-up reminder worker started");
};
