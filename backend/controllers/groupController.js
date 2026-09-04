import Group from "../models/Group.js";
import Member from "../models/Member.js";

/* ================= COPY PLAN TO MEMBER COLLECTIONS ================= */
export const syncCollectionPlanToMembers = async (
  groupId,
  chitId,
  monthIndex,
  installmentAmount,
  endDate,
  dividend
) => {
  await Group.updateOne(
    { groupId, chitId },
    {
      $set: {
        "members.$[].collections.$[c].installmentAmount": installmentAmount,
        "members.$[].collections.$[c].endDate": endDate,
        "members.$[].collections.$[c].dividend": dividend || 0,
      },
    },
    {
      arrayFilters: [{ "c.index": monthIndex }],
    }
  );
};


/* ===== CREATE GROUP ===== */
export const createGroup = async (req, res) => {
  try {
    const { groupId, chitId, totalCollections } = req.body;
    if (!groupId || !chitId || !totalCollections)
      return res.status(400).json({ message: "Invalid input" });

    const group = new Group({ groupId, chitId, totalCollections });
    await group.save();

    res.status(201).json(group);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ===== GET GROUPS BY CHIT ===== */
export const getGroupsByChit = async (req, res) => {
  res.json(await Group.find({ chitId: req.params.chitId }));
};

/* ===== ADD MEMBER (ADMIN) ===== */
export const addMemberToGroup = async (req, res) => {
  try {
    const { memberId, groupMemberId } = req.body;
    const group = await Group.findOne({ groupId: req.params.groupId });
    if (!group) return res.status(404).json({ message: "Group not found" });

    const member = await Member.findOne({ userid: memberId });
    if (!member) return res.status(404).json({ message: "Member not found" });

    const collections = [];
    for (let i = 1; i <= group.totalCollections; i++) {
      collections.push({
        index: i,
        amount: null,
        payments: [],
      });
    }

    group.members.push({ memberId, groupMemberId, collections });
    await group.save();

    res.json({ message: "Member added successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

/* ===== GET GROUP MEMBERS ===== */
export const getGroupMembers = async (req, res) => {
  const group = await Group.findOne({ groupId: req.params.groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  const membersDb = await Member.find(
    { userid: { $in: group.members.map((m) => m.memberId) } },
    { userid: 1, username: 1, phone: 1 }
  );

  const map = {};
  membersDb.forEach((m) => {
    map[m.userid] = { name: m.username, phone: m.phone };
  });

  res.json({
    totalCollections: group.totalCollections,
    collectionPlans: group.collectionPlans,
    groupMembers: group.members.map((m) => ({
      ...m.toObject(),
      memberName: map[m.memberId]?.name || "Unknown",
      phone: map[m.memberId]?.phone || "-",
    })),
  });
};

/* ===== SET COLLECTION PLAN (ADMIN) ===== */
export const setCollectionPlanForGroup = async (req, res) => {
  const { groupId } = req.params;
  const { monthIndex, startDate, endDate, installmentAmount, dividend } = req.body;

  const group = await Group.findOne({ groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  const existing = group.collectionPlans.find(
    (p) => p.monthIndex === monthIndex
  );

 if (existing) {
  existing.startDate = startDate;
  existing.endDate = endDate;
  existing.installmentAmount = installmentAmount;
  existing.dividend = Number(dividend) || 0;   // ✅ ADD THIS
} else {
  group.collectionPlans.push({
    monthIndex,
    startDate,
    endDate,
    installmentAmount,
    dividend: Number(dividend) || 0,   // ✅ ADD THIS
  });
}


  await group.save();

  // ✅ THIS LINE IS THE FIX (DO NOT MOVE IT)
await syncCollectionPlanToMembers(
  groupId,
  group.chitId,
  monthIndex,
  installmentAmount,
  endDate,
  dividend
);

  res.json({ message: "Collection plan saved" });
};



/* ===== GET COLLECTION PLAN BY MONTH ===== */
export const getCollectionPlanByMonth = async (req, res) => {
  const group = await Group.findOne({ groupId: req.params.groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  res.json(
    group.collectionPlans.find(
      (p) => p.monthIndex === Number(req.params.monthIndex)
    ) || null
  );
};

/* ===== UPDATE DIVIDEND FOR COLLECTION MONTH (ADMIN) ===== */
export const updateDividendForMonth = async (req, res) => {
  try {
    const { groupId, monthIndex } = req.params;
    const { dividend } = req.body;

    if (dividend === undefined) {
      return res.status(400).json({
        message: "Dividend amount is required",
      });
    }

    const group = await Group.findOne({ groupId });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const plan = group.collectionPlans.find(
      (p) => p.monthIndex === Number(monthIndex)
    );

    if (!plan) {
      return res.status(404).json({
        message: `Collection plan not found for month ${monthIndex}`,
      });
    }

    // ✅ ONLY update dividend
    plan.dividend = Number(dividend);

    await group.save();

    res.json({
      message: "Dividend updated successfully",
      monthIndex: Number(monthIndex),
      dividend: plan.dividend,
    });
  } catch (err) {
    console.error("❌ Update Dividend Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ===== EMPLOYEE: ADD PAYMENT ===== */
export const addPaymentToMember = async (req, res) => {
  const { groupId, groupMemberId } = req.params;
  const {
  monthIndex,
  amount,
  paymentType,
  paymentMode,
  employeeId,
  employeeName,
} = req.body;

  const group = await Group.findOne({ groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  const member = group.members.find(
    (m) => m.groupMemberId === groupMemberId
  );
  if (!member)
    return res.status(404).json({ message: "Member not found" });

  const month = member.collections.find(
    (c) => c.index === Number(monthIndex)
  );
  if (!month) return res.status(404).json({ message: "Month not found" });

  const newPayment = {
    amount,

    paymentType: paymentType || "INSTALLMENT",

    paymentMode: paymentMode || "Cash",

    employeeId: employeeId || "",

    employeeName: employeeName || "",

    paidAt: new Date(),

    collectedBy:
      employeeName && employeeId
        ? `${employeeName} (${employeeId})`
        : "Employee",
  };

  month.payments.push(newPayment);

  await group.save();

  res.json({
    message: "Payment added successfully",
    payment: newPayment,
  });
};


/* ===== EMPLOYEE: GROUP LIST ===== */
export const getAllGroups = async (req, res) => {
  const groups = await Group.find({}, {
    groupId: 1,
    chitId: 1,
    totalCollections: 1,
    members: 1,
  });

  res.json(
    groups.map((g) => ({
      groupId: g.groupId,
      chitId: g.chitId,
      totalCollections: g.totalCollections,
      memberCount: g.members.length,
    }))
  );
};

/* ===== UPDATE MEMBER COLLECTIONS (ADMIN EDIT) ===== */
export const updateGroupMember = async (req, res) => {
  const { groupId, groupMemberId } = req.params;
  const { collections } = req.body;

  const group = await Group.findOne({ groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  const member = group.members.find(
    (m) => m.groupMemberId === groupMemberId
  );
  if (!member)
    return res.status(404).json({ message: "Group member not found" });

  member.collections = collections;
  await group.save();

  res.json({ message: "Updated successfully" });
};

/* ===== REMOVE MEMBER FROM GROUP ===== */
export const removeMemberFromGroup = async (req, res) => {
  const { groupId, groupMemberId } = req.params;

  const group = await Group.findOne({ groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  group.members = group.members.filter(
    (m) => m.groupMemberId !== groupMemberId
  );

  await group.save();
  res.json({ message: "Member removed" });
};

export const getAllGroupsForAdmin = async (req, res) => {
  try {
    const groups = await Group.find({}, { groupId: 1, chitId: 1 });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ===== ADMIN / EMPLOYEE: UPDATE PAYMENT (BY INDEX) ===== */
export const updatePaymentByIndex = async (req, res) => {
  const { groupId, groupMemberId, paymentIndex } = req.params;
  const { monthIndex, amount, paidAt } = req.body;

  const group = await Group.findOne({ groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  const member = group.members.find(
    (m) => m.groupMemberId === groupMemberId
  );
  if (!member) return res.status(404).json({ message: "Member not found" });

  const month = member.collections.find(
    (c) => c.index === Number(monthIndex)
  );
  if (!month) return res.status(404).json({ message: "Month not found" });

  if (!month.payments[paymentIndex])
    return res.status(404).json({ message: "Payment not found" });

 month.payments[paymentIndex].amount = amount;
if (paidAt) month.payments[paymentIndex].paidAt = paidAt;

if (!month.payments[paymentIndex].paymentType) {
  month.payments[paymentIndex].paymentType = "INSTALLMENT";
}


  await group.save();
  res.json({ message: "Payment updated successfully" });
};

/* ===== ADMIN / EMPLOYEE: DELETE PAYMENT (BY INDEX) ===== */
export const deletePaymentByIndex = async (req, res) => {
  const { groupId, groupMemberId, paymentIndex, monthIndex } = req.params;

  const group = await Group.findOne({ groupId });
  if (!group) return res.status(404).json({ message: "Group not found" });

  const member = group.members.find(
    (m) => m.groupMemberId === groupMemberId
  );
  if (!member) return res.status(404).json({ message: "Member not found" });

  const month = member.collections.find(
    (c) => c.index === Number(monthIndex)
  );
  if (!month) return res.status(404).json({ message: "Month not found" });

  if (!month.payments[paymentIndex])
    return res.status(404).json({ message: "Payment not found" });

  month.payments.splice(paymentIndex, 1);
  await group.save();

  res.json({ message: "Payment deleted successfully" });
};

/* ================= USER: MY CHITS ================= */
export const getMyChits = async (req, res) => {
  try {
    const { userid } = req.params;

    console.log("🔥 My Chits API hit for user:", userid);

    const groups = await Group.find(
      { "members.memberId": userid },
      {
        groupId: 1,
        chitId: 1,
        totalCollections: 1,
        members: 1,
        collectionPlans: 1,
      }
    );

    if (!groups || groups.length === 0) {
      return res.json([]);
    }

    const result = [];

    for (const group of groups) {
      // Find ALL members with this memberId
      const memberEntries = group.members.filter(
        (m) => m.memberId === userid
      );

      if (!memberEntries || memberEntries.length === 0) continue;

      // Loop through each member entry
      for (const member of memberEntries) {
        if (!member || !member.collections) continue;

        const paidMonths = member.collections.filter(
          (c) => c.payments && c.payments.length > 0
        ).length;

        const nextCollection = member.collections.find(
          (c) => !c.payments || c.payments.length === 0
        );

        let installmentAmount = 0;
        let dividend = 0;

        if (nextCollection) {
          installmentAmount = nextCollection.installmentAmount || 0;

          const plan = group.collectionPlans.find(
            (p) => p.monthIndex === nextCollection.index
          );

          dividend = plan?.dividend || 0;
        }

        const effectiveInstallment = Math.max(
          installmentAmount - dividend,
          0
        );

        result.push({
          groupId: group.groupId,
          groupMemberId: member.groupMemberId,
          chitId: group.chitId,
          totalMonths: group.totalCollections,
          paidMonths,
          pendingMonths: group.totalCollections - paidMonths,
          installmentAmount: effectiveInstallment,
          dividend,
          status:
            paidMonths >= group.totalCollections
              ? "COMPLETED"
              : "ACTIVE",
          uniqueKey: `${group.groupId}_${member.groupMemberId}`,
          displayLabel: `${group.groupId} - ${group.chitId} (Member: ${member.groupMemberId})`
        });
      }
    }

    // ✅ Send unique results - no duplicates
    res.json(result);
  } catch (err) {
    console.error("❌ My Chits Controller Error:", err);
    res.status(500).json({
      message: err.message,
      stack: err.stack,
    });
  }
};
/* ================= USER: MY ACCOUNT COPY ================= */
/* ================= USER: MY ACCOUNT COPY ================= */
export const getMyAccountCopy = async (req, res) => {
  try {
    const { userid, groupId } = req.params;
    // ✅ Get groupMemberId from query params (optional)
    const { groupMemberId } = req.query;

    const group = await Group.findOne(
      { groupId },
      {
        groupId: 1,
        chitId: 1,
        groupName: 1,
        members: 1,
        collectionPlans: 1,
      }
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // ✅ Find specific member entry by memberId AND groupMemberId
    let member;
    if (groupMemberId) {
      // If groupMemberId provided, find exact match
      member = group.members.find(
        (m) => m.memberId === userid && m.groupMemberId === groupMemberId
      );
    } else {
      // Fallback: find first match (backward compatibility)
      member = group.members.find(
        (m) => m.memberId === userid
      );
    }

    if (!member) {
      return res.status(404).json({ message: "Member not found in group" });
    }

    const ledger = member.collections.map((c) => {
      let payments = [...(c.payments || [])];

      const plan = group.collectionPlans?.find(
        (p) => p.monthIndex === c.index
      );

      const dividend = plan?.dividend || 0;

      // ✅ Inject dividend as virtual payment
      if (dividend > 0) {
        payments.unshift({
          amount: dividend,
          paidAt: plan?.startDate || new Date(),
          paymentType: "DIVIDEND",
          collectedBy: "System",
        });
      }

      const paidAmount = payments.reduce(
        (sum, p) => sum + (p.amount || 0),
        0
      );

      const paymentDates = payments.map((p) => p.paidAt);

      const effectiveInstallment = Math.max(
        (c.installmentAmount || plan?.installmentAmount || 0) - dividend,
        0
      );

      const penaltyPaid = (c.payments || [])
        .filter(p => p.paymentType === "PENALTY")
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      let status = "DUE";
      const today = new Date();

      if (paidAmount >= effectiveInstallment && paidAmount > 0) {
        status = "PAID";
      } else if (c.endDate && today > new Date(c.endDate)) {
        status = "OVERDUE";
      }

      return {
        monthIndex: c.index,
        installmentAmount: effectiveInstallment,
        dividend,
        payments,
        paidAmount,
        penaltyAmount: penaltyPaid,
        paymentDates,
        dueDate: c.endDate || null,
        status,
      };
    });

    res.json({
      groupId: group.groupId,
      groupMemberId: member.groupMemberId, // ✅ Include this in response
      chitId: group.chitId,
      groupName: group.groupName || "—",
      ledger,
    });
  } catch (err) {
    console.error("❌ Account Copy Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/* ===== DELETE GROUP (ADMIN) ===== */
export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    // Find group
    const group = await Group.findOne({ groupId });

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Delete group completely
    await Group.deleteOne({ groupId });

    res.json({ message: "Group deleted successfully" });
  } catch (err) {
    console.error("❌ Delete Group Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
