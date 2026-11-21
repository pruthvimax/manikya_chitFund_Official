/* =========================================================
   PER-MEMBER DIVIDEND
   The group has one dividend per month (collection plan). Admin can change the
   dividend of ONE member for ONE month; the server keeps it on that member's month
   record as `dividendOverride`. When it is not set, the group's dividend is used
   exactly as before.
========================================================= */

/** member's month record (collection) + the group's dividend for that month */
export const memberDividend = (collection: any, groupDividend: any): number => {
  const o = collection?.dividendOverride;
  if (typeof o === "number" && isFinite(o) && o >= 0) return o;
  return Number(groupDividend || 0);
};

/** ledger row from /groups/account-copy (the server already put the member's own dividend in it) */
export const memberRowDividend = (row: any, plan: any): number => {
  if (typeof row?.dividend === "number" && isFinite(row.dividend)) return row.dividend;
  return Number(plan?.dividend || 0);
};
