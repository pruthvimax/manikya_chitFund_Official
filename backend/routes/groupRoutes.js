  import express from "express";
  import Group from "../models/Group.js";
  import { getMyAccountCopy } from "../controllers/groupController.js";
  import ChitScheme from "../models/ChitScheme.js";

  import {
    // USER
    getMyChits,

    // ADMIN
    createGroup,
    getGroupsByChit,
    deleteGroup,
    addMemberToGroup,
    getGroupMembers,
    updateGroupMember,
    removeMemberFromGroup,
    setCollectionPlanForGroup,
    getCollectionPlanByMonth,
    updateDividendForMonth,
    updatePaymentByIndex,
    deletePaymentByIndex,

    // EMPLOYEE
    getAllGroups,
    addPaymentToMember,

    // ADMIN EXTRA
    getAllGroupsForAdmin,
  } from "../controllers/groupController.js";

  const router = express.Router();


  /* ================= GET GROUP BY PUBLIC GROUP ID ================= */
  // Used by member bid room to fetch chit amount for a group
router.get("/group-id/:groupId", async (req, res) => {
  try {
    const group = await Group.findOne(
      { groupId: String(req.params.groupId) },
      {
        groupId: 1,
        chitId: 1,
        totalCollections: 1,
        collectionPlans: 1,
        members: 1, 
      }
    ).lean();

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    // Get the exact chit scheme using group's chitId
    const chitScheme = await ChitScheme.findOne(
      { chitId: String(group.chitId) },
      {
        chitId: 1,
        chitAmount: 1,
      }
    ).lean();

    if (!chitScheme) {
      return res.status(404).json({
        message: "Chit scheme not found",
      });
    }

    res.json({
      ...group,

      // Exact chit amount from ChitScheme
      chitAmount: chitScheme.chitAmount,
    });
  } catch (err) {
    console.error(
      "❌ GET GROUP BY GROUP ID ERROR:",
      err
    );

    res.status(500).json({
      message: "Failed to fetch group",
    });
  }
});

  /* ================= USER: ACCOUNT COPY ================= */
  // ✅ Updated to accept groupMemberId as query parameter
  router.get(
    "/account-copy/:userid/:groupId",
    getMyAccountCopy
  );
    
  /* ================= USER ROUTES ================= */
  router.get("/my-chits/:userid", getMyChits);

  /* ================= ADMIN ROUTES ================= */
  router.get("/admin/all", getAllGroupsForAdmin);
  router.post("/add", createGroup);
  router.delete("/:groupId", deleteGroup);


  /* ================= EMPLOYEE ROUTES ================= */
  router.get("/", getAllGroups);
  router.post(
    "/:groupId/members/:groupMemberId/payments",
    addPaymentToMember
  );

  /* ================= ADMIN / COMMON ================= */
  router.get("/:chitId", getGroupsByChit);
  router.post("/:groupId/members", addMemberToGroup);
  router.get("/:groupId/members", getGroupMembers);
  router.put("/:groupId/members/:groupMemberId", updateGroupMember);
  router.delete("/:groupId/members/:groupMemberId", removeMemberFromGroup);

  /* ================= COLLECTION PLAN ================= */
  router.post("/:groupId/collection-plan", setCollectionPlanForGroup);
  router.get("/:groupId/collection-plan/:monthIndex", getCollectionPlanByMonth);

  /* ================= COLLECTION PLAN – DIVIDEND UPDATE ================= */
  router.put(
    "/:groupId/collection-plan/:monthIndex/dividend",
    updateDividendForMonth
  );


  /* ================= PAYMENT EDIT ================= */
  router.put(
    "/:groupId/members/:groupMemberId/payments/:monthIndex/:paymentIndex",
    updatePaymentByIndex
  );
  router.delete(
    "/:groupId/members/:groupMemberId/payments/:monthIndex/:paymentIndex",
    deletePaymentByIndex
  );

  
  export default router;
