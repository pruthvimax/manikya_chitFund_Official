import express from "express";
import {
  addScheme,
  getSchemes,
  deleteScheme,
} from "../controllers/chitSchemeController.js";

const router = express.Router();

router.post("/add", addScheme);
router.get("/", getSchemes);
router.delete("/:id", deleteScheme);

export default router;
