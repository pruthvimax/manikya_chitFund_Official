/**
 * PER-MEMBER DIVIDEND
 *
 * The admin sets one dividend per month for the whole group (collectionPlans.dividend).
 * Admin can also change the dividend of ONE member for ONE month. That value is saved on the
 * member's own month record (collection.dividendOverride). If it is empty, the group's
 * dividend is used, exactly as before.
 */
export const memberDividend = (collection, plan) => {
  const o = collection?.dividendOverride;
  if (typeof o === "number" && Number.isFinite(o) && o >= 0) return o;
  return Number(plan?.dividend || 0);
};

/** copy of the group's plans where `dividend` is this member's own dividend for each month */
export const plansForMember = (plans = [], collections = []) =>
  (plans || []).map((p) => {
    const col = (collections || []).find((c) => Number(c?.index) === Number(p?.monthIndex));
    const plain = typeof p?.toObject === "function" ? p.toObject() : p;
    return { ...plain, dividend: memberDividend(col, p) };
  });

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Rules for changing ONE member's dividend for ONE month.
 *  - 0 .. installment
 *  - going down is always allowed (member pays more)
 *  - going up is allowed only while the member still owes that much (installment - already paid)
 * returns { ok, message?, status?, current, maxAllowed, clear }
 */
export const checkMemberDividend = ({ installment, groupDividend, month, plan, wanted }) => {
  const inst = Number(installment) || 0;
  const w = r2(wanted);
  const current = r2(memberDividend(month, plan));
  const paid = r2(
    (month?.payments || [])
      .filter((p) => p.paymentType !== "PENALTY" && p.paymentType !== "DIVIDEND")
      .reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );
  const maxAllowed = Math.max(r2(inst - paid), 0);

  if (!(inst > 0)) return { ok: false, status: 400, message: "This month has no installment set yet", current, maxAllowed };
  if (!Number.isFinite(w) || w < 0) return { ok: false, status: 400, message: "Enter a valid dividend amount (0 or more)", current, maxAllowed };
  if (w > inst) return { ok: false, status: 400, message: `Dividend cannot be more than the installment (₹${inst})`, current, maxAllowed };
  if (w > current && w > maxAllowed) {
    return {
      ok: false,
      status: 400,
      message: `Dividend can be at most ₹${maxAllowed} for this month (installment ₹${inst}, member already paid ₹${paid}).`,
      current,
      maxAllowed,
    };
  }
  return { ok: true, current, maxAllowed, paid, clear: w === r2(groupDividend), wanted: w };
};
