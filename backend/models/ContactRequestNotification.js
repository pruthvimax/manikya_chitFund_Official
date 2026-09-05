import mongoose from "mongoose";

const contactRequestNotificationSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      required: true,
    },

    memberName: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      default: "",
    },

    aadhaar: {
      type: String,
      required: true,
    },

    address: {
      type: String,
      default: "",
    },

    joiningDate: {
      type: Date,
    },

    chitSchemeId: {
      type: String,
      default: "",
    },

    chitId: {
      type: String,
      default: "",
    },

    chitAmount: {
      type: Number,
      default: 0,
    },

    durationMonths: {
      type: Number,
      default: 0,
    },

    dailyAmount: {
      type: Number,
      default: 0,
    },

    weeklyAmount: {
      type: Number,
      default: 0,
    },

    monthlyAmount: {
      type: Number,
      default: 0,
    },

    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const ContactRequestNotification =
  mongoose.models.ContactRequestNotification ||
  mongoose.model(
    "ContactRequestNotification",
    contactRequestNotificationSchema
  );

export default ContactRequestNotification;