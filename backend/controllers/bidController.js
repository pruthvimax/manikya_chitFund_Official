import mongoose from "mongoose";
import Bid from "../models/Bid.js";
import Group from "../models/Group.js";
import Member from "../models/Member.js";
import Notification from "../models/Notification.js";
/* =========================================================
   RESOLVE GROUP
   Accepts:
   - MongoDB _id
   - Public groupId such as "01B30"
========================================================= */

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
  }).lean();
};

/* =========================================================
   DATE HELPERS
========================================================= */

/*
  Converts:
  DD-MM-YYYY + HH:MM
  into JavaScript Date

  Example:
  16-08-2026 + 21:30
  => Aug 16 2026 21:30 local time
*/

const createDateTime = (dateString, timeString) => {
  if (!dateString || !timeString) return null;

  const dateParts = String(dateString)
    .trim()
    .split("-");

  const timeParts = String(timeString)
    .trim()
    .split(":");

  if (
    dateParts.length !== 3 ||
    timeParts.length !== 2
  ) {
    return null;
  }

  const day = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const year = Number(dateParts[2]);

  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);

  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    return null;
  }

  if (
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12 ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const result = new Date(
    year,
    month - 1,
    day,
    hours,
    minutes,
    0,
    0
  );

  return result;
};

/* =========================================================
   CUSTOMER - PLACE BID
========================================================= */

export const placeBid = async (req, res) => {
  try {
    const {
      groupId,
      memberId,
      groupMemberId,
      bidAmount,
      auctionDate,
      auctionTime,
    } = req.body;

    console.log("========== PLACE BID ==========");
    console.log("groupId:", groupId);
    console.log("memberId:", memberId);
    console.log("groupMemberId:", groupMemberId);
    console.log("bidAmount:", bidAmount);
    console.log("auctionDate:", auctionDate);
    console.log("auctionTime:", auctionTime);
    console.log("================================");

    /* ================= VALIDATION ================= */

    if (
      !groupId ||
      !memberId ||
      !groupMemberId ||
      bidAmount === undefined ||
      !auctionDate ||
      !auctionTime
    ) {
      return res.status(400).json({
        message:
          "groupId, memberId, bidAmount, auctionDate and auctionTime are required",
      });
    }

    const amount = Number(bidAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: "Invalid bid amount",
      });
    }

    /* ================= GROUP ================= */

    console.log("🔎 Searching Group with:");
    console.log("groupId:", groupId);

    const group = await resolveGroup(groupId);

    console.log("🔎 GROUP RESULT:", group);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    /* =====================================================
       FIND ACTIVE AUCTION NOTIFICATION

       Notification stores:
       auctionEndDate
       auctionEndTime
    ===================================================== */

    /*
       IMPORTANT:
       A group can have MANY auctions, so "the latest active
       notification" is NOT necessarily the auction the member
       is bidding on.

       We therefore first look up the notification that matches
       the auction identity sent with this bid:

         groupId + auctionEndDate + auctionEndTime

       Only when that exact auction cannot be found do we fall
       back to the previous behaviour (latest active
       notification), so single-auction groups and older data
       keep working exactly as before.
    */

    let notification = await Notification.findOne({
      groupId: group._id,
      auctionEndDate: String(auctionDate || "").trim(),
      auctionEndTime: String(auctionTime || "").trim(),
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    if (!notification) {
      notification = await Notification.findOne({
        groupId: group._id,
        status: "active",
      })
        .sort({
          createdAt: -1,
        })
        .lean();
    }

    console.log(
      "========== AUCTION VALIDATION =========="
    );

    console.log(
      "Bid auctionDate:",
      auctionDate
    );

    console.log(
      "Bid auctionTime:",
      auctionTime
    );

    console.log(
      "Notification:",
      notification?._id || "NONE"
    );

    console.log(
      "Notification auctionEndDate:",
      notification?.auctionEndDate
    );

    console.log(
      "Notification auctionEndTime:",
      notification?.auctionEndTime
    );

    /* =====================================================
       AUCTION END DATE + TIME CHECK
    ===================================================== */

    if (notification) {
      const auctionEndDate =
        notification.auctionEndDate ||
        notification.auctionDate;

      const auctionEndTime =
        notification.auctionEndTime;

      if (
        auctionEndDate &&
        auctionEndTime
      ) {
        const auctionEndDateTime =
          createDateTime(
            auctionEndDate,
            auctionEndTime
          );

        if (!auctionEndDateTime) {
          return res.status(400).json({
            message:
              "Invalid auction end date or time.",
          });
        }

        const now = new Date();

        console.log(
          "Auction End:",
          auctionEndDateTime.toString()
        );

        console.log(
          "Current Time:",
          now.toString()
        );

        console.log(
          "Auction Live:",
          now < auctionEndDateTime
        );

        console.log(
          "========================================"
        );

        /*
          IMPORTANT:
          Only close bidding when BOTH
          date and time have passed.
        */

        if (now >= auctionEndDateTime) {
          return res.status(400).json({
            message:
              "Auction has ended. Bidding is closed.",
            auctionEnded: true,
          });
        }
      }
    } else {
      console.warn(
        "⚠️ No active auction notification found."
      );
    }

    /* =====================================================
       MEMBER IN GROUP
    ===================================================== */

const groupMember =
  group.members?.find(
    (member) =>
      String(member.memberId) ===
        String(memberId) &&
      String(member.groupMemberId) ===
        String(groupMemberId)
  );


    if (!groupMember) {
      return res.status(404).json({
        message:
          "Member is not part of this group",
      });
    }

    /* =====================================================
    PREVIOUS WINNER CHECK

   IMPORTANT:
   Check EXACT groupMemberId.

   Example:

   7899 / M01 -> won -> blocked
   7899 / M02 -> not won -> allowed
===================================================== */
const previousWinner =
  await Notification.findOne({
    groupId: group._id,
    winnerGroupId:
      String(groupMember.groupMemberId),
  })
    .sort({
      createdAt: -1,
    })
    .lean();

if (previousWinner) {
  console.log(
    "⛔ PREVIOUS WINNER BLOCKED"
  );

  console.log(
    "Member ID:",
    memberId
  );

  console.log(
    "Group Member ID:",
    groupMember.groupMemberId
  );

  return res.status(403).json({
    success: false,
    alreadyWinner: true,
    message:
      `Group Member ${groupMember.groupMemberId} ` +
      `has already won an auction and cannot bid again.`,
  });
}

    /* =====================================================
       PENDING INSTALLMENT CHECK

       RULE:
       An installment counts against the member the moment
       its START DATE has arrived (today or earlier) -
       whether that is the CURRENT period or an older
       OVERDUE one. It is ignored ONLY while its start date
       is still strictly in the future (not due yet).

       todayForCheck is `new Date()` taken fresh on THIS
       request, so a long-running auction that crosses into
       a newly-due installment gets blocked starting with the
       very next bid attempt, even if the screen was opened
       earlier and showed bidding as allowed at the time.
    ===================================================== */

    const todayForCheck = new Date();

    let hasPendingInstallment = false;

    for (const col of groupMember.collections || []) {
const plan = (group.collectionPlans || []).find(
  (p) =>
    String(p.monthIndex) ===
    String(col.index)
);

      if (!plan) continue;

      const installmentAmount =
        Number(
          plan.installmentAmount ||
            col.installmentAmount ||
            0
        );

      if (installmentAmount <= 0) continue;

      /*
        Same calculation as admin Group Members page:
        - Dividend counts towards the installment
        - PENALTY payments are NOT installment payments
      */
      const planDividend = Number(
        plan.dividend || 0
      );

      const installmentPaid = (col.payments || [])
        .filter(
          (p) =>
            p.paymentType !== "PENALTY" &&
            p.paymentType !== "DIVIDEND"
        )
        .reduce(
          (sum, p) => sum + Number(p.amount || 0),
          0
        );

      const totalPaid =
        planDividend + installmentPaid;

      if (totalPaid >= installmentAmount) continue;

      /*
        Determine whether this installment's period has
        started yet. Prefer startDate; fall back to endDate
        only if startDate is missing.
      */
      const referenceDate =
        plan.startDate || plan.endDate;

      if (!referenceDate) continue;

      const startOrDueDate = new Date(referenceDate);

      if (Number.isNaN(startOrDueDate.getTime())) continue;

      /*
        Still in the future - hasn't started yet.
        Does NOT block bidding.
      */
      if (startOrDueDate > todayForCheck) {
        continue;
      }

      /*
        Started (today or earlier) and unpaid -
        blocks bidding, whether it's this month's
        installment or an older overdue one.
      */

      console.log(
        "⛔ PENDING INSTALLMENT BLOCK:"
      );
      console.log(
        "  Member:",
        memberId
      );
      console.log(
        "  Month index:",
        col.index
      );
      console.log(
        "  Installment:",
        installmentAmount
      );
      console.log(
        "  Start date:",
        plan.startDate
      );
      console.log(
        "  End date:",
        plan.endDate
      );
      console.log(
        "  Dividend:",
        planDividend
      );
      console.log(
        "  Installment paid:",
        installmentPaid
      );
      console.log(
        "  Total paid:",
        totalPaid
      );

      hasPendingInstallment = true;
      break;
    }

    if (hasPendingInstallment) {
      return res.status(403).json({
        success: false,
        installmentPending: true,
        message:
          "You have pending installment payment(s). Please clear your pending installment(s) to participate in bidding.",
      });
    }

    /* =====================================================
       MEMBER
    ===================================================== */

    const member =
      await Member.findOne({
        userid: memberId,
      });

    if (!member) {
      return res.status(404).json({
        message: "Member not found",
      });
    }

    if (
      member.status &&
      member.status !== "active"
    ) {
      return res.status(403).json({
        message:
          "Member account is inactive",
      });
    }

    /* =====================================================
       HIGHEST BID
    ===================================================== */

   /* =====================================================
   HIGHEST BID + ADMIN BID LIMITS
===================================================== */

const highestBid =
  await Bid.findOne({
    groupId: group.groupId,
    auctionDate: auctionDate,
    auctionTime: auctionTime,
  })
    .sort({
      bidAmount: -1,
    })
    .lean();

const adminMinBid = Number(
  notification?.minBidAmount
);

const adminMaxBid = Number(
  notification?.maxBidAmount
);

/* =====================================================
   ADMIN BID LIMIT VALIDATION
===================================================== */

if (
  !Number.isFinite(adminMinBid) ||
  !Number.isFinite(adminMaxBid) ||
  adminMinBid <= 0 ||
  adminMaxBid <= 0 ||
  adminMinBid > adminMaxBid
) {
  return res.status(400).json({
    message:
      "Auction bid limits are not configured correctly by admin.",
  });
}

/* =====================================================
   MINIMUM / STARTING BID
===================================================== */

if (amount < adminMinBid) {
  return res.status(400).json({
    message:
      `Your bid must be at least ₹${adminMinBid.toLocaleString("en-IN")}.`,
    minBidAmount: adminMinBid,
    maxBidAmount: adminMaxBid,
  });
}

/* =====================================================
   MAXIMUM BID
===================================================== */

if (amount > adminMaxBid) {
  return res.status(400).json({
    message:
      `Your bid cannot be higher than the maximum bid of ₹${adminMaxBid.toLocaleString("en-IN")}.`,
    minBidAmount: adminMinBid,
    maxBidAmount: adminMaxBid,
  });
}

/* =====================================================
   HIGHEST BID RULE

   Before maximum:
   New bid must be higher than current highest.

   When maximum is reached:
   Another member can also bid the same maximum.
===================================================== */

if (
  highestBid &&
  Number(highestBid.bidAmount) < adminMaxBid &&
  amount <= Number(highestBid.bidAmount)
) {
  return res.status(400).json({
    message:
      `Your bid must be higher than the current highest bid of ₹${Number(
        highestBid.bidAmount
      ).toLocaleString("en-IN")}`,
    highestBid:
      highestBid.bidAmount,
    minBidAmount: adminMinBid,
    maxBidAmount: adminMaxBid,
  });
}
    /* =====================================================
       CREATE BID
    ===================================================== */

    const newBid =
      await Bid.create({
        groupId:
          group.groupId,

        chitId:
          group.chitId,

        memberId:
          member.userid,

        groupMemberId:
          groupMember.groupMemberId,

        bidAmount:
          amount,

        auctionDate:
          auctionDate,

        auctionTime:
          auctionTime,

        bidTime:
          new Date(),
      });

    console.log(
      "✅ BID CREATED:",
      newBid._id
    );

    return res.status(201).json({
      success: true,
      message:
        "Bid placed successfully",

      bid: {
        _id: newBid._id,
        groupId:
          newBid.groupId,
        chitId:
          newBid.chitId,
        memberId:
          newBid.memberId,
        groupMemberId:
          newBid.groupMemberId,
        bidAmount:
          newBid.bidAmount,
        auctionDate:
          newBid.auctionDate,
        auctionTime:
          newBid.auctionTime,
        bidTime:
          newBid.bidTime,
      },
    });
  } catch (error) {
    console.error(
      "❌ PLACE BID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error:
        error.message,
    });
  }
};

/* =========================================================
   ADMIN - GET AUCTION BIDS

   ONLY UPDATE:
   auctionDate is now optional.

   If frontend sends auctionDate:
      use frontend auctionDate.

   If frontend does NOT send auctionDate:
      get it from active Notification.

   Everything else remains the same.
========================================================= */

/* =========================================================
   ADMIN - GET AUCTION BIDS

   Supports:
   - MongoDB group _id
   - Public groupId like 01B30
   - auctionDate from frontend
   - auctionEndDate from notification
   - existing old auctionDate field

   EXISTING BID LOGIC IS PRESERVED.
========================================================= */

export const getAuctionBids = async (req, res) => {
  try {
    const {
      groupId,
      auctionDate,
      auctionTime,
      auctionEndTime,
    } = req.query;

    console.log(
      "========== GET AUCTION BIDS =========="
    );

    console.log("groupId:", groupId);
    console.log(
      "auctionDate from frontend:",
      auctionDate
    );
    console.log(
      "auctionTime from frontend:",
      auctionTime
    );
    console.log(
      "auctionEndTime:",
      auctionEndTime
    );

    /* =====================================================
       GROUP ID REQUIRED
    ===================================================== */

    if (!groupId) {
      return res.status(400).json({
        success: false,
        message: "groupId is required",
      });
    }

    /* =====================================================
       RESOLVE GROUP
    ===================================================== */

    const auctionGroup = await resolveGroup(groupId);

    if (!auctionGroup) {
      console.log("❌ GROUP NOT FOUND");

      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    console.log("✅ GROUP FOUND");
    console.log(
      "MongoDB _id:",
      String(auctionGroup._id)
    );
    console.log(
      "Public groupId:",
      auctionGroup.groupId
    );

    /* =====================================================
       GET ACTIVE AUCTION NOTIFICATION

       IMPORTANT:
       We DO NOT filter notification by auctionDate.

       This supports both:
       - auctionEndDate
       - old auctionDate
    ===================================================== */

    const notification =
      await Notification.findOne({
        groupId: auctionGroup._id,
        status: "active",
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    console.log(
      "Notification:",
      notification?._id || "NONE"
    );

    console.log(
      "Notification auctionEndDate:",
      notification?.auctionEndDate
    );

    console.log(
      "Notification auctionDate:",
      notification?.auctionDate
    );

    console.log(
      "Notification auctionEndTime:",
      notification?.auctionEndTime
    );

    /* =====================================================
       RESOLVE AUCTION DATE

       Priority:

       1. Frontend auctionDate
       2. notification.auctionEndDate
       3. notification.auctionDate
       4. latest bid auctionDate

       This prevents "auctionDate: null".
    ===================================================== */

    let finalAuctionDate = null;

    if (
      auctionDate &&
      String(auctionDate).trim()
    ) {
      finalAuctionDate =
        String(auctionDate).trim();
    }

    if (
      !finalAuctionDate &&
      notification?.auctionEndDate
    ) {
      finalAuctionDate =
        String(
          notification.auctionEndDate
        ).trim();
    }

    if (
      !finalAuctionDate &&
      notification?.auctionDate
    ) {
      finalAuctionDate =
        String(
          notification.auctionDate
        ).trim();
    }

    /* =====================================================
       IF STILL NO DATE, USE LATEST BID DATE

       This is especially important for your existing
       bids because they already contain auctionDate.
    ===================================================== */

    if (!finalAuctionDate) {
      const latestBid =
        await Bid.findOne({
          groupId:
            String(auctionGroup.groupId),
        })
          .sort({
            bidTime: -1,
          })
          .lean();

      if (latestBid?.auctionDate) {
        finalAuctionDate =
          String(
            latestBid.auctionDate
          ).trim();

        console.log(
          "✅ Auction date resolved from latest bid:",
          finalAuctionDate
        );
      }
    }

    console.log(
      "FINAL AUCTION DATE:",
      finalAuctionDate
    );

    /* =====================================================
       IF NO DATE CAN BE FOUND
    ===================================================== */

    if (!finalAuctionDate) {
      console.log(
        "❌ Could not determine auction date"
      );

      return res.status(200).json({
        success: true,
        bids: [],
        totalBids: 0,
        groupId:
          String(auctionGroup.groupId),
        auctionDate: null,
        auctionEndDate:
          notification?.auctionEndDate ||
          notification?.auctionDate ||
          null,
        auctionEndTime:
          notification?.auctionEndTime ||
          auctionEndTime ||
          null,
      });
    }

    /* =====================================================
       BID QUERY

       YOUR EXISTING BID MODEL STORES:

       groupId = public group code
       auctionDate = auction date
    ===================================================== */

    const query = {
      groupId:
        String(auctionGroup.groupId),

      auctionDate:
        String(finalAuctionDate),
    };

    /* =====================================================
       OPTIONAL AUCTION TIME FILTER

       EXISTING LOGIC PRESERVED
    ===================================================== */

    if (
      auctionTime &&
      String(auctionTime).trim()
    ) {
      query.auctionTime =
        String(auctionTime).trim();
    }

    /*
      If auctionEndTime is provided and
      auctionTime is not provided, get bids
      up to the auction end time.
    */

    if (
      auctionEndTime &&
      !auctionTime
    ) {
      const timeRegex =
        /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

      if (
        timeRegex.test(
          String(auctionEndTime)
        )
      ) {
        query.auctionTime = {
          $lte:
            String(auctionEndTime),
        };
      }
    }

    console.log(
      "FINAL BID QUERY:",
      query
    );

    /* =====================================================
       GET BIDS

       HIGHEST BID FIRST
    ===================================================== */

    const bids =
      await Bid.find(query)
        .sort({
          bidAmount: -1,
          bidTime: 1,
        })
        .lean();

    console.log(
      "TOTAL BIDS:",
      bids.length
    );

    console.log(
      "BIDS FOUND:",
      bids.map((bid) => ({
        id: bid._id,
        memberId: bid.memberId,
        groupMemberId:
          bid.groupMemberId,
        bidAmount:
          bid.bidAmount,
        auctionDate:
          bid.auctionDate,
        auctionTime:
          bid.auctionTime,
      }))
    );

    /* =====================================================
       GET MEMBER IDS
    ===================================================== */

    const memberIds = [
      ...new Set(
        bids.map(
          (bid) =>
            String(
              bid.memberId
            )
        )
      ),
    ];

    /* =====================================================
       GET MEMBER DETAILS
    ===================================================== */

    const members =
      await Member.find(
        {
          userid: {
            $in: memberIds,
          },
        },
        {
          userid: 1,
          username: 1,
          phone: 1,
        }
      ).lean();

    /* =====================================================
       MEMBER MAP
    ===================================================== */

    const memberMap = {};

    members.forEach(
      (member) => {
        memberMap[
          String(
            member.userid
          )
        ] = member;
      }
    );

    /* =====================================================
       FORMAT BIDS

       This is what admin/bidroom.tsx receives.
    ===================================================== */

    const result =
      bids.map((bid) => {
        const member =
          memberMap[
            String(
              bid.memberId
            )
          ];

        return {
          _id:
            bid._id,

          groupId:
            bid.groupId,

          chitId:
            bid.chitId,

          memberId:
            bid.memberId,

          groupMemberId:
            bid.groupMemberId,

          customerName:
            member?.username ||
            "Unknown",

          phone:
            member?.phone ||
            "-",

          bidAmount:
            Number(
              bid.bidAmount || 0
            ),

          auctionDate:
            bid.auctionDate,

          auctionTime:
            bid.auctionTime,

          bidTime:
            bid.bidTime,

          createdAt:
            bid.createdAt,
        };
      });

    /* =====================================================
       RESPONSE

       auctionEndDate supports the NEW frontend.

       We don't remove auctionDate because your existing
       frontend/customer logic may still use it.
    ===================================================== */

    /* =====================================================
       DESCRIBE THE AUCTION BEING VIEWED

       "notification" above is the LATEST active notification of
       the group. When the caller told us exactly which auction
       it is looking at (groupId + auctionDate + auctionTime) we
       must describe THAT auction instead, otherwise an older or
       ended auction shows the newest auction's end date/time in
       the admin header.
    ===================================================== */

    let viewedNotification = notification;

    if (
      finalAuctionDate &&
      auctionTime &&
      String(auctionTime).trim()
    ) {
      const exactNotification =
        await Notification.findOne({
          groupId: auctionGroup._id,
          auctionEndDate: String(finalAuctionDate).trim(),
          auctionEndTime: String(auctionTime).trim(),
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      if (exactNotification) {
        viewedNotification = exactNotification;
      }
    }

    const resolvedEndDate =
      viewedNotification?.auctionEndDate ||
      viewedNotification?.auctionDate ||
      finalAuctionDate ||
      null;

    const resolvedEndTime =
      viewedNotification?.auctionEndTime ||
      auctionTime ||
      auctionEndTime ||
      null;

    console.log(
      "========== FINAL AUCTION RESPONSE =========="
    );

    console.log(
      "Group:",
      auctionGroup.groupId
    );

    console.log(
      "Auction date:",
      finalAuctionDate
    );

    console.log(
      "Auction end date:",
      resolvedEndDate
    );

    console.log(
      "Auction end time:",
      resolvedEndTime
    );

    console.log(
      "Total bids:",
      result.length
    );

    console.log(
      "============================================"
    );

    return res.json({
      success: true,

      bids:
        result,

      totalBids:
        result.length,

      groupId:
        String(
          auctionGroup.groupId
        ),

      auctionDate:
        finalAuctionDate,

      auctionEndDate:
        resolvedEndDate,

      auctionEndTime:
        resolvedEndTime,
    });
  } catch (error) {
    console.error(
      "❌ GET AUCTION BIDS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
      error:
        error.message,
    });
  }
};

/* =========================================================
   CUSTOMER - BID HISTORY
========================================================= */

export const getCustomerBidHistory =
  async (req, res) => {
    try {
      const {
        groupId,
        memberId,
      } = req.query;

      if (
        !groupId ||
        !memberId
      ) {
        return res.status(400).json({
          message:
            "groupId and memberId are required",
        });
      }

      const bids =
        await Bid.find({
          groupId:
            String(groupId),

          memberId:
            String(memberId),
        })
          .sort({
            bidTime: -1,
          })
          .lean();

      const member =
        await Member.findOne(
          {
            userid:
              String(memberId),
          },
          {
            userid: 1,
            username: 1,
            phone: 1,
          }
        ).lean();

      return res.json({
        memberId:
          memberId,

        customerName:
          member?.username ||
          "Unknown",

        phone:
          member?.phone ||
          "-",

        bids:
          bids,
      });
    } catch (error) {
      console.error(
        "❌ CUSTOMER BID HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Server error",
        error:
          error.message,
      });
    }
  };

/* =========================================================
   CUSTOMER - LIVE AUCTION BIDS

   AUCTION IDENTITY:
     groupId + auctionDate + auctionTime

   The same group can have MANY auctions, so the group id alone
   is NOT an auction. The bid chat must therefore be filtered by
   the exact groupId + auctionDate + auctionTime combination.

   If auctionDate or auctionTime is missing we return an EMPTY
   list. We never fall back to the group's older bids, and we
   never fall back to the "latest active notification", because
   that is exactly what leaked auction 1's bids into auction 2.
========================================================= */

export const getCustomerAuctionBids =
  async (req, res) => {
    try {
      const {
        groupId,
        auctionDate,
        auctionTime,
        auctionEndDate,
        auctionEndTime,
      } = req.query;

      console.log(
        "========== GET CUSTOMER AUCTION BIDS =========="
      );

      console.log(
        "groupId received:",
        groupId
      );

      console.log(
        "auctionDate received:",
        auctionDate
      );

      console.log(
        "auctionTime received:",
        auctionTime
      );

      if (!groupId) {
        return res.status(400).json({
          success: false,
          message:
            "groupId is required",
        });
      }

      /* ================= GROUP ================= */

      const group =
        await resolveGroup(
          groupId
        );

      if (!group) {
        return res.status(404).json({
          success: false,
          message:
            "Group not found",
        });
      }

      const publicGroupId =
        String(group.groupId);

      console.log(
        "✅ GROUP FOUND"
      );

      console.log(
        "MongoDB _id:",
        String(group._id)
      );

      console.log(
        "Public groupId:",
        publicGroupId
      );

      /* =====================================================
         RESOLVE THE AUCTION IDENTITY

         The existing frontend approach is preserved:
           auctionDate || auctionEndDate
           auctionTime || auctionEndTime
      ===================================================== */

      const finalAuctionDate =
        String(
          auctionDate ||
            auctionEndDate ||
            ""
        ).trim();

      const finalAuctionTime =
        String(
          auctionTime ||
            auctionEndTime ||
            ""
        ).trim();

      console.log(
        "FINAL AUCTION DATE:",
        finalAuctionDate || "(none)"
      );

      console.log(
        "FINAL AUCTION TIME:",
        finalAuctionTime || "(none)"
      );

      /* =====================================================
         NO AUCTION IDENTITY -> NO BIDS

         IMPORTANT:
         A missing auction date/time must NEVER show the
         previous auction's bids.
      ===================================================== */

      if (
        !finalAuctionDate ||
        !finalAuctionTime
      ) {
        console.log(
          "❌ auctionDate/auctionTime missing - returning empty bid list"
        );

        return res.status(200).json({
          success: true,

          bids: [],

          totalBids: 0,

          groupId:
            publicGroupId,

          auctionDate:
            finalAuctionDate ||
            null,

          auctionTime:
            finalAuctionTime ||
            null,

          auctionEndDate:
            finalAuctionDate ||
            null,

          auctionEndTime:
            finalAuctionTime ||
            null,

          message:
            "auctionDate and auctionTime are required to load the bid chat",
        });
      }

      /* =====================================================
         NOTIFICATION FOR **THIS** AUCTION ONLY

         We look the notification up by its own auction identity
         instead of "latest active notification for the group",
         so a newer auction of the same group cannot hijack it.
      ===================================================== */

      const notification =
        await Notification.findOne({
          groupId:
            group._id,

          auctionEndDate:
            finalAuctionDate,

          auctionEndTime:
            finalAuctionTime,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      console.log(
        "Notification:",
        notification?._id ||
          "none"
      );

      /* =====================================================
         BID QUERY - EXACT AUCTION

         groupId + auctionDate + auctionTime
      ===================================================== */

      const query = {
        groupId:
          publicGroupId,

        auctionDate:
          finalAuctionDate,

        auctionTime:
          finalAuctionTime,
      };

      console.log(
        "FINAL LIVE BID QUERY:",
        query
      );

      const currentBids =
        await Bid.find(query)
          .sort({
            bidTime: -1,
          })
          .lean();

      console.log(
        "Current auction bids:",
        currentBids.length
      );

      /* =====================================================
         FORMAT CUSTOMER RESPONSE
      ===================================================== */

      const formattedBids =
        currentBids.map(
          (bid) => ({
            _id:
              bid._id,

            groupId:
              bid.groupId,

            memberId:
              bid.memberId,

            groupMemberId:
              bid.groupMemberId,

            bidAmount:
              Number(
                bid.bidAmount ||
                  0
              ),

            bidTime:
              bid.bidTime,

            auctionDate:
              bid.auctionDate,

            auctionTime:
              bid.auctionTime,
          })
        );

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,

        bids:
          formattedBids,

        totalBids:
          formattedBids.length,

        groupId:
          publicGroupId,

        auctionDate:
          finalAuctionDate,

        auctionTime:
          finalAuctionTime,

        /*
          IMPORTANT:
          Frontend can use auctionEndDate/auctionEndTime
          even though the DB fields are auctionDate/auctionTime.
        */

        auctionEndDate:
          notification?.auctionEndDate ||
          finalAuctionDate,

        auctionEndTime:
          notification?.auctionEndTime ||
          finalAuctionTime,
      });
    } catch (error) {
      console.error(
        "❌ LIVE BIDS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error",
        error:
          error.message,
      });
    }
  };

/* =========================================================
   ADMIN - ADD BID
========================================================= */

export const adminAddBid =
  async (req, res) => {
    try {
      const {
  groupId,
  memberId,
  groupMemberId,
  bidAmount,
  auctionDate,
  auctionTime,
} = req.body;

      console.log(
        "========== ADMIN ADD BID =========="
      );

      console.log(
        "groupId:",
        groupId
      );

      console.log(
        "memberId:",
        memberId
      );

      console.log(
        "bidAmount:",
        bidAmount
      );

      console.log(
        "auctionDate:",
        auctionDate
      );

      console.log(
        "auctionTime:",
        auctionTime
      );

      /* ================= VALIDATION ================= */

      if (
        !groupId ||
        !memberId ||
        !groupMemberId ||
        bidAmount === undefined ||
        !auctionDate ||
        !auctionTime
      ) {
        return res.status(400).json({
          message:
            "groupId, memberId, bidAmount, auctionDate and auctionTime are required",
        });
      }

      const amount =
        Number(bidAmount);

      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {
        return res.status(400).json({
          message:
            "Invalid bid amount",
        });
      }

      /* ================= GROUP ================= */

      const group =
        await resolveGroup(
          groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found",
        });
      }

      /* ================= MEMBER ================= */

const groupMember =
  group.members?.find(
    (member) =>
      String(member.memberId) ===
        String(memberId) &&
      String(member.groupMemberId) ===
        String(groupMemberId)
  );

      if (!groupMember) {
        return res.status(404).json({
          message:
            "Member is not part of this group",
        });
      }

      const member =
        await Member.findOne({
          userid:
            memberId,
        });

      if (!member) {
        return res.status(404).json({
          message:
            "Member not found",
        });
      }

      /* ================= HIGHEST BID ================= */

      const highestBid =
        await Bid.findOne({
          groupId:
            group.groupId,

          auctionDate:
            auctionDate,
        })
          .sort({
            bidAmount: -1,
          })
          .lean();

      if (
        highestBid &&
        amount <=
          Number(
            highestBid.bidAmount
          )
      ) {
        return res.status(400).json({
          message:
            `Bid must be higher than current highest bid of ₹${Number(
              highestBid.bidAmount
            ).toLocaleString(
              "en-IN"
            )}`,

          highestBid:
            highestBid.bidAmount,
        });
      }

      /* ================= CREATE ================= */

      const newBid =
        await Bid.create({
          groupId:
            group.groupId,

          chitId:
            group.chitId,

          memberId:
            member.userid,

          groupMemberId:
            groupMember.groupMemberId,

          bidAmount:
            amount,

          auctionDate:
            auctionDate,

          auctionTime:
            auctionTime,

          bidTime:
            new Date(),
        });

      console.log(
        "✅ ADMIN BID CREATED:",
        newBid._id
      );

      return res.status(201).json({
        success: true,

        message:
          "Bid added successfully",

        bid:
          newBid,
      });
    } catch (error) {
      console.error(
        "❌ ADMIN ADD BID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error",

        error:
          error.message,
      });
    }
  };

/* =========================================================
   ADMIN - DELETE BID
========================================================= */

export const deleteBid =
  async (req, res) => {
    try {
      const {
        bidId,
      } = req.params;

      console.log(
        "========== DELETE BID =========="
      );

      console.log(
        "bidId:",
        bidId
      );

      if (!bidId) {
        return res.status(400).json({
          message:
            "Bid ID is required",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          String(bidId)
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid bid ID",
        });
      }

      const deletedBid =
        await Bid.findByIdAndDelete(
          bidId
        );

      if (!deletedBid) {
        return res.status(404).json({
          message:
            "Bid not found",
        });
      }

      console.log(
        "✅ BID DELETED:",
        bidId
      );

      return res.json({
        success: true,

        message:
          "Bid deleted successfully",

        bidId:
          bidId,
      });
    } catch (error) {
      console.error(
        "❌ DELETE BID ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Server error",

        error:
          error.message,
      });
    }
  };