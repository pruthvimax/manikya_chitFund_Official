import mongoose from "mongoose";
import Bid from "../models/Bid.js";
import Group from "../models/Group.js";
import Notification from "../models/Notification.js";

/* ============================================================
   HELPER: RESOLVE GROUP
   ============================================================ */

const resolveGroup = async (value) => {
  if (!value) return null;

  const conditions = [
    {
      groupId: String(value),
    },
  ];

  if (mongoose.Types.ObjectId.isValid(String(value))) {
    conditions.push({
      _id: new mongoose.Types.ObjectId(String(value)),
    });
  }

  return Group.findOne({
    $or: conditions,
  });
};

/* ============================================================
   ADMIN: ADD NOTIFICATION
============================================================ */

export const addNotification = async (req, res) => {
  try {
    const {
      groupId,
      auctionEndDate,
      auctionEndTime,
      message,

      // NEW: ADMIN BID LIMITS
      minBidAmount,
      maxBidAmount,

      winnerName,
      winnerId,
      winnerGroupId,
      winnerBidAmount,
    } = req.body;

    console.log("========== ADD NOTIFICATION ==========");
    console.log("groupId:", groupId);
    console.log("auctionEndDate:", auctionEndDate);
    console.log("auctionEndTime:", auctionEndTime);
    console.log("message:", message);

    // NEW
    console.log("minBidAmount:", minBidAmount);
    console.log("maxBidAmount:", maxBidAmount);

    console.log("winnerName:", winnerName);
    console.log("winnerGroupId:", winnerGroupId);
    console.log("winnerBidAmount:", winnerBidAmount);

    /* ================= VALIDATION ================= */

    if (
      !groupId ||
      !auctionEndDate ||
      !auctionEndTime ||
      !message ||
      minBidAmount === undefined ||
      maxBidAmount === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    /* ================= BID LIMIT VALIDATION ================= */

    const numericMinBid = Number(minBidAmount);
    const numericMaxBid = Number(maxBidAmount);

    if (
      !Number.isFinite(numericMinBid) ||
      !Number.isFinite(numericMaxBid) ||
      numericMinBid <= 0 ||
      numericMaxBid <= 0 ||
      numericMinBid > numericMaxBid
    ) {
      return res.status(400).json({
        message:
          "Invalid bid limits. Start bid must be greater than 0 and not greater than end bid.",
      });
    }

    /* ================= DATE VALIDATION ================= */

    const dateRegex =
      /^([0-2][0-9]|3[0-1])-(0[1-9]|1[0-2])-\d{4}$/;

    if (!dateRegex.test(String(auctionEndDate))) {
      return res.status(400).json({
        message: "Invalid date format. Use DD-MM-YYYY",
      });
    }

    /* ================= TIME VALIDATION ================= */

    const timeRegex =
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(String(auctionEndTime))) {
      return res.status(400).json({
        message: "Invalid time format. Use HH:MM",
      });
    }

    /* ================= GROUP ================= */

    const group = await resolveGroup(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    console.log("✅ Group found:", group._id);

    /* ========================================================
       CREATE NOTIFICATION

       IMPORTANT:
       auctionEndDate -> stores END DATE
       auctionEndTime -> stores END TIME
    ======================================================== */

    const notification = new Notification({
      groupId: group._id,

      auctionEndDate: String(auctionEndDate),

      auctionEndTime: String(auctionEndTime),

      // NEW: ADMIN BID LIMITS
      minBidAmount: numericMinBid,

      maxBidAmount: numericMaxBid,

      message: String(message).trim(),

      status: "active",

      winnerName: winnerName ? String(winnerName).trim() : "",

      winnerId: winnerId ? String(winnerId).trim() : "",

      winnerGroupId: winnerGroupId
        ? String(winnerGroupId).trim()
        : "",

      winnerBidAmount: winnerBidAmount
        ? Number(winnerBidAmount)
        : 0,
    });

    await notification.save();

    console.log(
      "✅ Notification created:",
      notification._id
    );

    await notification.populate(
      "groupId",
      "groupId groupName"
    );

    return res.status(201).json({
      success: true,
      message: "Notification created successfully",

      data: {
        _id: notification._id,

        groupId: notification.groupId,

        auctionEndDate:
          notification.auctionEndDate,

        auctionEndTime:
          notification.auctionEndTime,

        // NEW
        minBidAmount:
          notification.minBidAmount,

        maxBidAmount:
          notification.maxBidAmount,

        message: notification.message,

        status: notification.status,

        winnerName: notification.winnerName,

        winnerId: notification.winnerId,

        winnerGroupId:
          notification.winnerGroupId,

        winnerBidAmount:
          notification.winnerBidAmount,

        createdAt:
          notification.createdAt,

        updatedAt:
          notification.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "❌ Add notification error:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================================================
   ADMIN: GET ALL NOTIFICATIONS
============================================================ */

export const getNotifications = async (req, res) => {
  try {
    const notifications =
      await Notification.find()
        .populate(
          "groupId",
          "groupId groupName"
        )
        .sort({
          createdAt: -1,
        });

    const formattedNotifications =
      notifications.map((notification) => ({
        _id: notification._id,

        groupId: notification.groupId,

        auctionEndDate:
          notification.auctionEndDate,

        auctionEndTime:
          notification.auctionEndTime,

        // NEW
        minBidAmount:
          notification.minBidAmount,

        maxBidAmount:
          notification.maxBidAmount,

        message:
          notification.message,

        status:
          notification.status,

        winnerName:
          notification.winnerName,

        winnerId:
          notification.winnerId,

        winnerGroupId:
          notification.winnerGroupId,

        winnerBidAmount:
          notification.winnerBidAmount,

        createdAt:
          notification.createdAt,

        updatedAt:
          notification.updatedAt,
      }));

    return res.json(
      formattedNotifications
    );
  } catch (error) {
    console.error(
      "❌ Get notifications error:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================================================
   ADMIN: UPDATE NOTIFICATION
============================================================ */

export const updateNotification = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const {
      groupId,
      auctionEndDate,
      auctionEndTime,
      message,
      status,

      // NEW
      minBidAmount,
      maxBidAmount,

      winnerName,
      winnerId,
      winnerGroupId,
      winnerBidAmount,
    } = req.body;

    console.log(
      "========== UPDATE NOTIFICATION =========="
    );

    console.log(
      "notification id:",
      id
    );

    console.log(
      "groupId:",
      groupId
    );

    console.log(
      "auctionEndDate:",
      auctionEndDate
    );

    console.log(
      "auctionEndTime:",
      auctionEndTime
    );

    // NEW
    console.log(
      "minBidAmount:",
      minBidAmount
    );

    console.log(
      "maxBidAmount:",
      maxBidAmount
    );

    console.log(
      "winnerName:",
      winnerName
    );

    console.log(
      "winnerGroupId:",
      winnerGroupId
    );

    console.log(
      "winnerBidAmount:",
      winnerBidAmount
    );

    /* ================= VALIDATION ================= */

    if (
      !groupId ||
      !auctionEndDate ||
      !auctionEndTime ||
      !message ||
      minBidAmount === undefined ||
      maxBidAmount === undefined
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    /* ================= BID LIMIT VALIDATION ================= */

    const numericMinBid = Number(minBidAmount);
    const numericMaxBid = Number(maxBidAmount);

    if (
      !Number.isFinite(numericMinBid) ||
      !Number.isFinite(numericMaxBid) ||
      numericMinBid <= 0 ||
      numericMaxBid <= 0 ||
      numericMinBid > numericMaxBid
    ) {
      return res.status(400).json({
        message:
          "Invalid bid limits. Start bid must be greater than 0 and not greater than end bid.",
      });
    }

    /* ================= DATE ================= */

    const dateRegex =
      /^([0-2][0-9]|3[0-1])-(0[1-9]|1[0-2])-\d{4}$/;

    if (!dateRegex.test(String(auctionEndDate))) {
      return res.status(400).json({
        message: "Invalid date format. Use DD-MM-YYYY",
      });
    }

    /* ================= TIME ================= */

    const timeRegex =
      /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(String(auctionEndTime))) {
      return res.status(400).json({
        message: "Invalid time format. Use HH:MM",
      });
    }

    /* ================= GROUP ================= */

    const group =
      await resolveGroup(groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    /* =========================================================
       REMEMBER THE AUCTION IDENTITY BEFORE THE UPDATE

       A Bid stores the auction it belongs to as:

         groupId + auctionDate + auctionTime

       which is the notification's auctionEndDate/auctionEndTime
       at the moment the bid was placed. If the admin edits the
       auction (for example to extend the date or time) the
       notification moves but the bids keep the OLD values, so
       they no longer belong to any auction and disappear from
       every screen.

       Nothing is ever deleted - the bids are simply orphaned -
       so we keep the old identity here and move the bids with
       the auction after the update succeeds.
    ========================================================= */

    const previousNotification =
      await Notification.findById(id).lean();

    const previousAuctionDate =
      String(
        previousNotification?.auctionEndDate || ""
      ).trim();

    const previousAuctionTime =
      String(
        previousNotification?.auctionEndTime || ""
      ).trim();

    /* ================= UPDATE ================= */

    const updated =
      await Notification.findByIdAndUpdate(
        id,
        {
          groupId: group._id,

          auctionEndDate:
            String(auctionEndDate),

          auctionEndTime:
            String(auctionEndTime),

          // NEW
          minBidAmount:
            numericMinBid,

          maxBidAmount:
            numericMaxBid,

          message:
            String(message).trim(),

          status:
            status || "active",

          winnerName:
            winnerName !== undefined
              ? String(winnerName).trim()
              : "",

          winnerId:
            winnerId !== undefined
              ? String(winnerId).trim()
              : "",

          winnerGroupId:
            winnerGroupId !== undefined
              ? String(winnerGroupId).trim()
              : "",

          winnerBidAmount:
            winnerBidAmount !== undefined
              ? Number(winnerBidAmount)
              : 0,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updated) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    /* =========================================================
       KEEP THE EXISTING BIDS WITH THEIR AUCTION

       If the auction date/time changed, the bids that were
       placed in THIS auction are moved to the new identity so
       the bid chat and the bid history stay exactly as they
       were. No bid is created, deleted or altered in any other
       way - only the auction date/time label it carries.
    ========================================================= */

    const newAuctionDate =
      String(updated.auctionEndDate || "").trim();

    const newAuctionTime =
      String(updated.auctionEndTime || "").trim();

    let movedBids = 0;
    let bidMoveSkippedReason = null;

    const publicGroupId = String(group.groupId);

    const auctionIdentityChanged =
      previousAuctionDate &&
      previousAuctionTime &&
      (previousAuctionDate !== newAuctionDate ||
        previousAuctionTime !== newAuctionTime);

    if (auctionIdentityChanged) {
      /*
        SAFETY CHECK:
        Never merge two auctions. If another notification of the
        same group already uses the new date/time, we leave the
        bids where they are instead of mixing two bid chats.
      */
      const clashingNotification =
        await Notification.findOne({
          _id: { $ne: updated._id },
          groupId: updated.groupId,
          auctionEndDate: newAuctionDate,
          auctionEndTime: newAuctionTime,
        }).lean();

      if (clashingNotification) {
        bidMoveSkippedReason =
          "Another auction of this group already uses this date and time, " +
          "so the existing bids were left on the old auction to avoid " +
          "mixing two bid chats.";

        console.warn(
          "⚠️ BID MOVE SKIPPED:",
          bidMoveSkippedReason
        );
      } else {
        const bidResult =
          await Bid.updateMany(
            {
              groupId: publicGroupId,
              auctionDate: previousAuctionDate,
              auctionTime: previousAuctionTime,
            },
            {
              $set: {
                auctionDate: newAuctionDate,
                auctionTime: newAuctionTime,
              },
            }
          );

        movedBids =
          bidResult?.modifiedCount ?? 0;

        console.log(
          "========== AUCTION EDITED =========="
        );
        console.log(
          "Group:",
          String(group.groupId)
        );
        console.log(
          "Old auction:",
          previousAuctionDate,
          previousAuctionTime
        );
        console.log(
          "New auction:",
          newAuctionDate,
          newAuctionTime
        );
        console.log(
          "Bids moved with the auction:",
          movedBids
        );
        console.log(
          "===================================="
        );
      }
    }

    await updated.populate(
      "groupId",
      "groupId groupName"
    );

    return res.json({
      success: true,

      message:
        "Notification updated successfully",

      /* How many existing bids stayed with this auction */
      movedBids,

      bidMoveSkippedReason,

      data: {
        _id: updated._id,

        groupId: updated.groupId,

        auctionEndDate:
          updated.auctionEndDate,

        auctionEndTime:
          updated.auctionEndTime,

        // NEW
        minBidAmount:
          updated.minBidAmount,

        maxBidAmount:
          updated.maxBidAmount,

        message:
          updated.message,

        status:
          updated.status,

        winnerName:
          updated.winnerName,

        winnerId:
          updated.winnerId,

        winnerGroupId:
          updated.winnerGroupId,

        winnerBidAmount:
          updated.winnerBidAmount,

        createdAt:
          updated.createdAt,

        updatedAt:
          updated.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "❌ Update notification error:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================================================
   ADMIN: DELETE NOTIFICATION
============================================================ */

export const deleteNotification = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    console.log(
      "========== DELETE NOTIFICATION =========="
    );

    console.log(
      "notification id:",
      id
    );

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        message: "Invalid notification ID",
      });
    }

    const notification =
      await Notification.findByIdAndDelete(
        id
      );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    console.log(
      "✅ Notification deleted:",
      id
    );

    return res.json({
      success: true,

      message:
        "Notification deleted successfully",

      data: notification,
    });
  } catch (error) {
    console.error(
      "❌ Delete notification error:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};

/* ============================================================
   ADMIN: DELETE WINNER ONLY
   ============================================================ */

export const deleteWinner = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("========== DELETE WINNER ==========");
    console.log("notification id:", id);

    // Validate notification ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    // Find the auction notification
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Clear ONLY winner information
    notification.winnerName = "";
    notification.winnerId = "";
    notification.winnerGroupId = "";
    notification.winnerBidAmount = 0;

    await notification.save();

    console.log("✅ Winner deleted successfully");
    console.log("Notification:", id);

    return res.status(200).json({
      success: true,
      message: "Winner deleted successfully",

      data: {
        _id: notification._id,
        winnerName: notification.winnerName,
        winnerId: notification.winnerId,
        winnerGroupId: notification.winnerGroupId,
        winnerBidAmount: notification.winnerBidAmount,
      },
    });

  } catch (error) {
    console.error("❌ Delete winner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete winner",
      error: error.message,
    });
  }
};

/* ============================================================
   USER: GET NOTIFICATIONS FOR SPECIFIC USER
============================================================ */

export const getUserNotifications = async (
  req,
  res
) => {
  try {
    const { userid } = req.params;

    console.log(
      "➡️ userid received:",
      userid
    );

    if (!userid) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    /* ================= FIND ALL USER GROUPS =================

       A member can belong to MULTIPLE groups
       (e.g. 01B30 and 02B30), so we must find
       ALL groups containing this member and return
       notifications for every one of them.
    ======================================================== */

    const groups =
      await Group.find({
        "members.memberId": userid,
      });

    if (!groups || groups.length === 0) {
      console.log(
        "❌ Groups not found for userid:",
        userid
      );

      return res.json([]);
    }

    const groupIds = groups.map(
      (group) => group._id
    );

    console.log(
      "✅ Groups found:",
      groupIds.join(", ")
    );

    /* ================= NOTIFICATIONS ================= */

    const notifications =
      await Notification.find({
        groupId: { $in: groupIds },
        status: "active",
      })
        .populate(
          "groupId",
          "groupId groupName"
        )
        .sort({
          createdAt: -1,
        });

    const formattedNotifications =
      notifications.map((notification) => ({
        _id: notification._id,

        groupId: notification.groupId,

        auctionEndDate:
          notification.auctionEndDate,

        auctionEndTime:
          notification.auctionEndTime,

        // NEW: SEND BID LIMITS TO MEMBER
        minBidAmount:
          notification.minBidAmount,

        maxBidAmount:
          notification.maxBidAmount,

        message:
          notification.message,

        status:
          notification.status,

        winnerName:
          notification.winnerName,

        winnerId:
          notification.winnerId,

        winnerGroupId:
          notification.winnerGroupId,

        winnerBidAmount:
          notification.winnerBidAmount,

        createdAt:
          notification.createdAt,

        updatedAt:
          notification.updatedAt,
      }));

    console.log(
      "✅ Notifications count:",
      formattedNotifications.length
    );

    return res.json(
      formattedNotifications
    );
  } catch (error) {
    console.error(
      "🔥 User notification error:",
      error
    );

    return res.status(500).json({
      message: error.message,
    });
  }
};