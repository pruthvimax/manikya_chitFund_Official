import { buildSummaryText, getSettings, saveSettings, sendToAdmins } from "../realtime/dailySummary.js";
import Admin from "../models/Admin.js";

/* GET  /api/more/daily-summary          -> settings + who receives it
   POST /api/more/daily-summary          { enabled?, time? }  save settings
   GET  /api/more/daily-summary/preview  -> the message as it would be sent now
   POST /api/more/daily-summary/send     -> send it now to every admin (test) */

export const getDailySummary = async (req, res) => {
  try {
    const settings = await getSettings();
    const admins = await Admin.find({}).select("mobile name").lean();
    res.json({
      success: true,
      settings,
      admins: admins.map((a) => ({ name: a.name || "", mobile: a.mobile })),
    });
  } catch (e) {
    console.error("DAILY SUMMARY GET ERROR:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const saveDailySummary = async (req, res) => {
  try {
    const settings = await saveSettings(req.body || {});
    res.json({ success: true, settings });
  } catch (e) {
    console.error("DAILY SUMMARY SAVE ERROR:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const previewDailySummary = async (req, res) => {
  try {
    res.json({ success: true, text: await buildSummaryText() });
  } catch (e) {
    console.error("DAILY SUMMARY PREVIEW ERROR:", e);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const sendDailySummaryNow = async (req, res) => {
  try {
    const text = await buildSummaryText();
    const result = await sendToAdmins(text);
    res.json({ success: result.sent > 0, text, ...result });
  } catch (e) {
    console.error("DAILY SUMMARY SEND ERROR:", e);
    res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
};
