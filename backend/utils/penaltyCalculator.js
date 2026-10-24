/**
 * SINGLE POINT FOR THE PENALTY RULE (backend)
 *
 * Same rule the app pages use today:
 *  - 6% of the installment still unpaid when the month's due date has passed
 *  - plus 6% of earlier months' installment that was still unpaid at the
 *    moment THIS month's due date passed (frozen, so it never moves later)
 *  - admin can switch the penalty OFF for one member + month
 *    (collection.penaltyWaived). Penalty already paid stays; nothing more is due.
 *
 * Pure functions - no database access.
 */

export const PENALTY_PERCENT = 6;

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const isAfterDate = (d, now) => {
  if (!d) return false;
  const x = new Date(d);
  if (isNaN(x.getTime())) return false;
  return now.getTime() > endOfDay(x).getTime();
};

const sum = (list) => list.reduce((s, n) => s + Number(n || 0), 0);

/**
 * collections : member.collections (plain objects or mongoose subdocs)
 * plans       : group.collectionPlans (array)
 * returns     : { perMonth: { [monthIndex]: {...} }, totalPenaltyDue, totalPenaltyPending }
 */
export const computeMemberPenalty = (collections = [], plans = [], now = new Date()) => {
  const planByMonth = {};
  (plans || []).forEach((p) => {
    planByMonth[Number(p.monthIndex)] = p;
  });

  const rows = (collections || [])
    .map((c) => {
      const plan = planByMonth[Number(c.index)] || {};
      const installment = Number(plan.installmentAmount ?? c.installmentAmount ?? c.amount ?? 0);
      const dividend = Number(plan.dividend || 0);
      const endDate = plan.endDate || c.endDate || null;
      const payments = Array.isArray(c.payments) ? c.payments : [];
      return { c, index: Number(c.index), installment, dividend, endDate, payments };
    })
    .filter((r) => r.installment)
    .sort((a, b) => a.index - b.index);

  // unpaid installment of `row` using only payments made on/before cutoff
  const pendingAsOf = (row, cutoff) => {
    const effective = Math.max(row.installment - row.dividend, 0);
    const paid = row.payments
      .filter((p) => p.paymentType !== "PENALTY" && p.paymentType !== "DIVIDEND")
      .filter((p) => {
        if (!cutoff) return true;
        const t = new Date(p.paidAt || p.date).getTime();
        return t <= endOfDay(cutoff).getTime();
      });
    return Math.max(effective - sum(paid.map((p) => p.amount)), 0);
  };

  const perMonth = {};
  let totalPenaltyDue = 0;
  let totalPenaltyPending = 0;

  rows.forEach((row, i) => {
    const penaltyPaid = sum(
      row.payments.filter((p) => p.paymentType === "PENALTY").map((p) => p.amount)
    );

    let computed = 0;
    if (row.endDate && isAfterDate(row.endDate, now)) {
      const own = pendingAsOf(row, row.endDate);
      let carried = 0;
      for (let j = 0; j < i; j++) carried += pendingAsOf(rows[j], row.endDate);
      computed = Math.round(((own + carried) * PENALTY_PERCENT) / 100);
    }

    const waived = Boolean(row.c.penaltyWaived);
    const penaltyDue = waived ? penaltyPaid : computed;
    const pendingPenalty = Math.max(penaltyDue - penaltyPaid, 0);

    perMonth[row.index] = {
      index: row.index,
      computedPenalty: computed, // what it would be if ON
      penaltyDue, // after waiver
      penaltyPaid,
      pendingPenalty,
      waived,
    };
    totalPenaltyDue += penaltyDue;
    totalPenaltyPending += pendingPenalty;
  });

  return { perMonth, totalPenaltyDue, totalPenaltyPending };
};
