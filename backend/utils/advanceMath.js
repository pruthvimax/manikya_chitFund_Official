/* =========================================================
   ADVANCE (extra amount) MATH - pure functions, no database.

   Same rule as everywhere else in the app:
     pending installment of a month
       = (installmentAmount - dividend of that month) - payments that are not PENALTY
   An advance is only ever added up to that pending amount, so a month can
   never be over-paid by it, and what is left over stays as advance.
========================================================= */

export const ADVANCE_TAG = "Advance · ";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const up = (v) => String(v || "").toUpperCase();

export const installmentPaid = (payments = []) =>
  round2(
    (Array.isArray(payments) ? payments : [])
      .filter((p) => up(p?.paymentType) !== "PENALTY" && up(p?.paymentType) !== "DIVIDEND")
      .reduce((s, p) => s + (Number(p?.amount) || 0), 0)
  );

export const isAdvancePayment = (p) => String(p?.collectedBy || "").startsWith(ADVANCE_TAG);

/** what is still to pay for a month (never below 0); `extra` = amounts already planned in this run */
export const netDue = (plan, payments = [], extra = 0) =>
  Math.max(
    round2((Number(plan?.installmentAmount) || 0) - (Number(plan?.dividend) || 0) - installmentPaid(payments) - (Number(extra) || 0)),
    0
  );

/**
 * Where does the remaining advance go?  Months AFTER the month it was collected for,
 * oldest first, only months that already have an admin plan, only up to what is pending.
 * `added` = { [monthIndex]: amount } already planned for this seat in this run (updated here).
 */
export const planApplications = ({ remaining, afterMonth, plans, collections, added = {} }) => {
  let rem = round2(remaining);
  const out = [];
  const months = (plans || [])
    .filter((p) => (Number(p?.installmentAmount) || 0) > 0 && Number(p.monthIndex) > Number(afterMonth || 0))
    .sort((a, b) => a.monthIndex - b.monthIndex);

  for (const plan of months) {
    if (rem <= 0) break;
    const col = (collections || []).find((c) => Number(c.index) === Number(plan.monthIndex));
    if (!col) continue;
    const already = added[plan.monthIndex] || 0;
    const due = netDue(plan, col.payments, already);
    if (due <= 0) continue;
    const take = round2(Math.min(rem, due));
    out.push({ monthIndex: plan.monthIndex, take, pendingAfter: round2(due - take) });
    added[plan.monthIndex] = round2(already + take);
    rem = round2(rem - take);
  }
  return out;
};

/**
 * Plan or dividend of a month changed. If the month now has MORE paid than due and part of
 * that was paid from an advance, give that part back (latest advance payment first).
 * Returns [{ paymentId, paidAt, from, to, cut }]
 */
export const planTrim = ({ plan, payments }) => {
  const base = Math.max(round2((Number(plan?.installmentAmount) || 0) - (Number(plan?.dividend) || 0)), 0);
  let excess = round2(installmentPaid(payments) - base);
  if (excess <= 0) return [];

  const adv = (payments || [])
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => isAdvancePayment(p) && up(p.paymentType) !== "PENALTY")
    .sort((a, b) => new Date(b.p.paidAt).getTime() - new Date(a.p.paidAt).getTime() || b.i - a.i);

  const out = [];
  for (const { p } of adv) {
    if (excess <= 0) break;
    const cut = round2(Math.min(excess, Number(p.amount) || 0));
    if (cut <= 0) continue;
    out.push({ paymentId: p._id ? String(p._id) : "", paidAt: p.paidAt, from: round2(p.amount), to: round2(p.amount - cut), cut });
    excess = round2(excess - cut);
  }
  return out;
};
