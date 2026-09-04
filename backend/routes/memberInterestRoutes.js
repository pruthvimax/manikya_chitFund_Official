import express from "express";
import {
  registerInterest,
  getAllInterestedMembers,
  updateInterestStatus,
    deleteInterestedMember, 
} from "../controllers/memberInterestController.js";

const router = express.Router();

/* ✅ TEST ROUTE (Very Important) */
router.get("/test", (req, res) => {
  res.json({
    message: "✅ Member Interest API Working Perfectly",
  });
});

/* ✅ USER FORM SUBMIT */
router.post("/register-interest", registerInterest);

/* ✅ ADMIN FETCH ALL NEW MEMBERS */
router.get("/all-interests", getAllInterestedMembers);

/* ✅ ADMIN UPDATE STATUS */
router.put("/update-status/:id", updateInterestStatus);


// ✅ ADMIN DELETE REQUEST
router.delete("/delete/:id", deleteInterestedMember);

export default router;
