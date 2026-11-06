import Group from "../models/Group.js";
import PushToken from "../models/PushToken.js";
import PaymentNotice from "../models/PaymentNotice.js";
import { sendPush } from "./pushNotifier.js";
import { emitToAll } from "./socket.js";

/* =========================================================
   EMPLOYEE COLLECTED A PAYMENT -> MEMBER GETS A MESSAGE

   Like liveBadges.js this only LISTENS. When the employee app adds a
   payment (POST /api/groups/:groupId/members/:groupMemberId/payments)
   and it was saved, it
     1. stores one small "payment received" message for that member
        (shown in the member's notification list and bell),
     2. sends a phone push notification to that member,
     3. pings connected phones so the bell / list refresh at once.
   No controller or route is changed. A failure here never affects the
   payment itself.

   mount BEFORE the real router:
     app.use("/api/groups", paymentReceivedNotify);
========================================================= */
const PATH = /^\/([^/]+)\/members\/([^/]+)\/payments\/?$/;

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const paymentReceivedNotify = (req, res, next) => {
  if (req.method === "POST") {
    // read now: Express resets req.url once this middleware is done
    const m = PATH.exec(req.path);
    if (m) {
      const groupCode = decodeURIComponent(m[1]);
      const groupMemberId = decodeURIComponent(m[2]);
      const body = { ...(req.body || {}) };

      res.on("finish", () => {
        if (res.statusCode >= 400) return;
        notify(groupCode, groupMemberId, body).catch((e) =>
          console.error("PAYMENT NOTICE ERROR:", e?.message || e)
        );
      });
    }
  }
  next();
};

async function notify(groupCode, groupMemberId, body) {
  const amount = Number(body.amount);
  if (!(amount > 0)) return;

  const group = await Group.findOne({ groupId: groupCode }).lean();
  const member = group?.members?.find((x) => x.groupMemberId === groupMemberId);
  if (!member?.memberId) return;
  const userid = String(member.memberId);

  const isPenalty = String(body.paymentType || "").toUpperCase() === "PENALTY";
  const mode = body.paymentMode || "Cash";
  const by = body.employeeName ? String(body.employeeName) : "our employee";

  const title = `Payment received · ${inr(amount)}`;
  const text =
    `We received ${inr(amount)} ${isPenalty ? "penalty" : "installment"} for Group ${groupCode} ` +
    `(${mode}). Collected by ${by}. Thank you!`;

  await PaymentNotice.create({
    userid,
    groupId: groupCode,
    groupMemberId,
    amount,
    paymentType: isPenalty ? "PENALTY" : "INSTALLMENT",
    paymentMode: mode,
    collectedBy: by,
    title,
    body: text,
  });

  try {
    emitToAll("live:changed", { topic: "notifications", method: "POST" });
  } catch (e) {
    // never let a ping break anything
  }

  const tokens = await PushToken.find({ userid }).lean();
  await sendPush(tokens, { title, body: text, data: { route: "/notifications" } });
}
