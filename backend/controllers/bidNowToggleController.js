import mongoose from "mongoose";
import Notification from "../models/Notification.js";

/**
 * PUT /api/notifications/:id/bid-now
 * body: { enabled: true | false }
 *
 * Admin switch for ONE auction notification:
 *   enabled = true  -> members can use the Bid Now page (as always)
 *   enabled = false -> the Bid Now page is closed for this auction; members see the live video link
 * Nothing else of the notification is changed (bids, winner, dates stay as they are).
 */
export const setBidNowEnabled = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const raw = req.body?.enabled;
    if (raw === undefined || raw === null) {
      return res.status(400).json({ message: "enabled (true or false) is required" });
    }
    const enabled = !(raw === false || raw === "false" || raw === 0 || raw === "0");

    const updated = await Notification.findByIdAndUpdate(
      id,
      { $set: { bidNowEnabled: enabled } },
      { new: true, timestamps: false }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Notification not found" });

    return res.json({
      success: true,
      message: enabled ? "Bid Now page is ON for members" : "Bid Now page is OFF for members",
      _id: updated._id,
      bidNowEnabled: updated.bidNowEnabled !== false,
    });
  } catch (err) {
    console.error("BID NOW TOGGLE ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
