import SpinAnnouncement from "../models/SpinAnnouncement.js";
import { startSpin } from "../controllers/spinnerController.js";

/* =========================================================
   AUTO SPIN WORKER
   When the admin chose "Auto spin" for an announced spin time, this
   starts the spin by itself the moment that time arrives. It uses the
   very same startSpin() the admin's Start button uses, so the members'
   spin page opens and the normal 5-second countdown runs as always.

   - checks every second
   - each announcement is claimed in the database first, so it can
     never start twice (even with two server instances)
   - if the server was asleep it still starts, up to 30 minutes late
   - manual announcements (autoSpin false) are never touched
   - the winner follows "Members on the wheel": the member the admin picked,
     or a secure RANDOM pick when "Random draw" was left selected.
     At least 8 full wheel turns
========================================================= */

const CHECK_EVERY_MS = 1000;
const MAX_LATE_MS = 30 * 60 * 1000;
const AUTO_DURATION_SEC = 9;
const AUTO_ROTATIONS = 8; // "at least 8 turns"

const runStart = (notificationId, targetGroupMemberId) =>
  new Promise((resolve) => {
    let code = 200;
    const res = {
      status(c) {
        code = c;
        return res;
      },
      json(body) {
        resolve({ code, body });
        return res;
      },
    };
    startSpin(
      {
        body: {
          notificationId: String(notificationId),
          // "" = random draw, otherwise the member the admin picked
          targetGroupMemberId: targetGroupMemberId || undefined,
          durationSec: AUTO_DURATION_SEC,
          rotations: AUTO_ROTATIONS,
        },
        query: {},
        headers: {},
      },
      res
    ).catch((err) => resolve({ code: 500, body: { message: err?.message || "error" } }));
  });

let running = false;

const tick = async () => {
  if (running) return;
  running = true;
  try {
    const now = Date.now();
    const due = await SpinAnnouncement.find({
      status: { $in: ["active", "done"] },
      autoSpin: true,
      autoSpinTriggered: { $ne: true },
      spinAt: { $lte: new Date(now), $gt: new Date(now - MAX_LATE_MS) },
    })
      .select("_id notificationId autoTargetId")
      .lean();

    for (const a of due) {
      // claim it first: only one worker can ever start this spin
      const claimed = await SpinAnnouncement.findOneAndUpdate(
        { _id: a._id, autoSpinTriggered: { $ne: true } },
        { $set: { autoSpinTriggered: true } },
        { new: true }
      );
      if (!claimed) continue;

      try {
        const { code, body } = await runStart(a.notificationId, a.autoTargetId);
        const ok = code >= 200 && code < 300 && body?.success;
        await SpinAnnouncement.updateOne(
          { _id: a._id },
          {
            $set: {
              autoSpinResult: ok ? "started" : `failed: ${body?.message || code}`,
              ...(ok ? { status: "done" } : {}),
            },
          }
        );
        console.log(
          ok
            ? `🎡 Auto spin started for ${claimed.groupCode}`
            : `⚠️ Auto spin could not start for ${claimed.groupCode}: ${body?.message || code}`
        );
      } catch (err) {
        console.error("AUTO SPIN ERROR:", err?.message || err);
      }
    }
  } finally {
    running = false;
  }
};

let timer = null;

export const startAutoSpin = () => {
  if (timer) return;
  timer = setInterval(() => {
    tick().catch((err) => console.error("AUTO SPIN TICK ERROR:", err?.message || err));
  }, CHECK_EVERY_MS);
  console.log("🎡 Auto spin worker started");
};
