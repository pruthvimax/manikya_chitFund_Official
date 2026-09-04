import Group from "../models/Group.js";

/**
 * GET /api/member/my-outstanding/:memberId
 */
export const getMyOutstanding = async (req, res) => {
  try {
    const { memberId } = req.params;
    const today = new Date();

    let totalOutstanding = 0;
    let dueThisMonth = 0;
    let overdueAmount = 0;
    let chitGroups = [];

    const groups = await Group.find({ "members.memberId": memberId });

    for (const group of groups) {
      const member = group.members.find(m => m.memberId === memberId);
      if (!member) continue;

      for (const col of member.collections) {
        const plan = group.collectionPlans.find(
          p => p.monthIndex === col.index
        );
        if (!plan) continue;

        const installmentAmount = plan.installmentAmount || col.installmentAmount || 0;
        const dueDate = new Date(plan.endDate);

        const paidAmount = col.payments.reduce(
          (sum, p) => sum + p.amount,
          0
        );

        if (paidAmount >= installmentAmount) continue;

        const pendingAmount = installmentAmount - paidAmount;
        totalOutstanding += pendingAmount;

        const isSameMonth =
          dueDate.getMonth() === today.getMonth() &&
          dueDate.getFullYear() === today.getFullYear();

        if (isSameMonth) dueThisMonth += pendingAmount;

        if (today > dueDate) overdueAmount += pendingAmount;

        chitGroups.push({
          groupId: group.groupId,
          chitId: group.chitId,
          dueAmount: pendingAmount,
          dueDate,
          status: today > dueDate ? "overdue" : "pending",
          daysLeft:
            today <= dueDate
              ? Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
              : null,
          daysOverdue:
            today > dueDate
              ? Math.ceil((today - dueDate) / (1000 * 60 * 60 * 24))
              : null,
          lateFee: today > dueDate ? col.penalty?.amount || 0 : 0,
        });
      }
    }

    res.json({
      totalOutstanding,
      dueThisMonth,
      overdueAmount,
      chitGroups,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch outstanding" });
  }
};
