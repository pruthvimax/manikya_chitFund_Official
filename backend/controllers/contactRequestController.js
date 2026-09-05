import ContactRequestNotification from "../models/ContactRequestNotification.js";
import Member from "../models/Member.js";


// =====================================================
// MEMBER → SEND CONTACT REQUEST
// =====================================================

export const createContactRequest = async (req, res) => {
  try {
    const {
      userid,
      chitSchemeId,
      chitId,
      chitAmount,
      durationMonths,
      dailyAmount,
      weeklyAmount,
      monthlyAmount,
    } = req.body;

    if (!userid) {
      return res.status(400).json({
        success: false,
        message: "Member userid is required",
      });
    }

    // Get complete member information from DB
    const member = await Member.findOne({
      userid: String(userid),
    }).lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Create notification snapshot
    const notification = await ContactRequestNotification.create({
      memberId: member.userid,
      memberName: member.username,
      phone: member.phone,
      email: member.email || "",
      aadhaar: member.aadhaar,
      address: member.address || "",
      joiningDate: member.joiningDate,

      chitSchemeId: chitSchemeId ? String(chitSchemeId) : "",
      chitId: chitId ? String(chitId) : "",

      chitAmount: Number(chitAmount || 0),
      durationMonths: Number(durationMonths || 0),

      dailyAmount: Number(dailyAmount || 0),
      weeklyAmount: Number(weeklyAmount || 0),
      monthlyAmount: Number(monthlyAmount || 0),

      read: false,
    });

    return res.status(201).json({
      success: true,
      message: "Contact request sent successfully",
      notification,
    });
  } catch (error) {
    console.error("❌ CREATE CONTACT REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create contact request",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN → GET ALL CONTACT REQUESTS
// =====================================================

export const getContactRequests = async (req, res) => {
  try {
    const requests = await ContactRequestNotification.find({})
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      requests,
      total: requests.length,
    });
  } catch (error) {
    console.error("❌ GET CONTACT REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load contact requests",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN DASHBOARD → UNREAD COUNT
// =====================================================

export const getUnreadContactRequestCount = async (req, res) => {
  try {
    const unreadCount =
      await ContactRequestNotification.countDocuments({
        read: false,
      });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error("❌ CONTACT REQUEST COUNT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get unread contact request count",
      error: error.message,
    });
  }
};


// =====================================================
// ADMIN → MARK NOTIFICATION AS READ
// =====================================================

export const markContactRequestAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const request =
      await ContactRequestNotification.findByIdAndUpdate(
        id,
        {
          $set: {
            read: true,
          },
        },
        {
          new: true,
        }
      );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Contact request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact request marked as read",
      request,
    });
  } catch (error) {
    console.error("❌ MARK CONTACT REQUEST READ ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark contact request as read",
      error: error.message,
    });
  }
};

export const deleteContactRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request =
      await ContactRequestNotification.findByIdAndDelete(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Contact request not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contact request deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE CONTACT REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete contact request",
      error: error.message,
    });
  }
};