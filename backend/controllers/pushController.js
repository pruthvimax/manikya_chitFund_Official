import PushToken from "../models/PushToken.js";

const looksLikeExpoToken = (t) =>
  typeof t === "string" && /^(Exponent|Expo)PushToken\[.+\]$/.test(t);

/* POST /api/push/register   { userid, token, platform } */
export const registerPushToken = async (req, res) => {
  try {
    const userid = String(req.body?.userid || "").trim();
    const token = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "").trim();

    if (!userid || !looksLikeExpoToken(token)) {
      return res.status(400).json({ message: "userid and a valid token are required" });
    }

    // same phone, new login -> the token simply moves to the new member
    await PushToken.findOneAndUpdate(
      { token },
      { $set: { userid, platform } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("PUSH REGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* POST /api/push/unregister  { token }   (on logout) */
export const unregisterPushToken = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (token) await PushToken.deleteOne({ token });
    return res.json({ success: true });
  } catch (err) {
    console.error("PUSH UNREGISTER ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

/* POST /api/push/badge  { token, count }  - the phone reports its real count */
export const setPushBadge = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const count = Math.max(0, Math.floor(Number(req.body?.count) || 0));
    if (token) await PushToken.updateOne({ token }, { $set: { badge: count } });
    return res.json({ success: true });
  } catch (err) {
    console.error("PUSH BADGE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
