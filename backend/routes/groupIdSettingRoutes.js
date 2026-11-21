import express from "express";
import { getGroupIdSetting, setGroupIdSetting } from "../controllers/groupIdSettingController.js";

const router = express.Router();

router.get("/", getGroupIdSetting);
router.put("/", setGroupIdSetting);

export default router;
