import MoreSetting from "../models/MoreSetting.js";

/* Should members see the Group ID? (admin switch on the Chit Schemes page)
   GET /api/group-id-setting         -> { success, show }
   PUT /api/group-id-setting {show}  -> { success, show }
   show = false (default)  -> members see the chit value
   show = true             -> members see the Group ID
   Saved in the existing MoreSetting collection under one key. */

const KEY = "showGroupIdToMembers";

export const getGroupIdSetting = async (req, res) => {
  try {
    const doc = await MoreSetting.findOne({ key: KEY }).lean();
    res.json({ success: true, show: doc?.value === true });
  } catch (err) {
    console.error("GROUP ID SETTING GET ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const setGroupIdSetting = async (req, res) => {
  try {
    const raw = req.body?.show;
    const show = raw === true || raw === "true";
    await MoreSetting.findOneAndUpdate({ key: KEY }, { $set: { value: show } }, { upsert: true, new: true });
    res.json({ success: true, show });
  } catch (err) {
    console.error("GROUP ID SETTING SET ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
