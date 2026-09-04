import MemberHistory from "../models/MemberHistory.js";

export const getMemberHistory = async (req, res) => {
  try {
    const { userid } = req.params;

    const history = await MemberHistory.find({ userid }).sort({ date: -1 });

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};
