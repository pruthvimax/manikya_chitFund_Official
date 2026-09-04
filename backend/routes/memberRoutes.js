  import express from "express";

  import {
    addMember,
    getAllMembers,
    getMemberById,
    updateMember,
    deleteMember,
    loginUser,
    getAccountSummary,
    getMyOutstanding,
  } from "../controllers/memberController.js";

  const router = express.Router();


  // ✅ LOGIN FIRST
  router.post("/login", loginUser);

  // ✅ FIXED ROUTES MUST COME BEFORE "/:userid"
  router.get("/account-summary/:userid", getAccountSummary);

  router.get("/my-outstanding/:userid", getMyOutstanding);

  // ADD MEMBER
  router.post("/add", addMember);

  // GET ALL
  router.get("/", getAllMembers);

  // UPDATE
  router.put("/:userid", updateMember);

  // DELETE
  router.delete("/:userid", deleteMember);

  // GET SINGLE MEMBER (KEEP LAST ALWAYS)
  router.get("/:userid", getMemberById);

  export default router;
