import twilio from "twilio";
import Admin from "../models/Admin.js";

const normalizePhoneNumber = (value) => {
  if (!value) return null;

  let cleaned = String(value).trim();
  cleaned = cleaned.replace(/[^\d+]/g, "");

  if (!cleaned) return null;

  if (cleaned.startsWith("00")) {
    cleaned = `+${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `+91${cleaned.slice(1)}`;
  }

  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  return `+${cleaned}`;
};

const sendOtpNotification = async (mobile, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials are not configured");
  }

  const client = twilio(accountSid, authToken);
  const normalizedPhone = normalizePhoneNumber(mobile);

  if (!normalizedPhone) {
    throw new Error("A valid mobile number is required");
  }

  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;
  const smsFrom = process.env.TWILIO_SMS_FROM || process.env.TWILIO_WHATSAPP_FROM;
  const messageBody = `🔐 Your Manikya Chits Admin OTP is: ${otp}\nValid for ${process.env.OTP_EXPIRY_MINUTES || 2} minutes.`;

  const attempts = [];

  if (whatsappFrom) {
    attempts.push({
      type: "whatsapp",
      payload: {
        from: whatsappFrom,
        to: `whatsapp:${normalizedPhone}`,
        body: messageBody,
      },
    });
  }

  if (smsFrom) {
    attempts.push({
      type: "sms",
      payload: {
        from: smsFrom,
        to: normalizedPhone,
        body: messageBody,
      },
    });
  }

  if (attempts.length === 0) {
    throw new Error("Twilio sender number is not configured");
  }

  let lastError = null;

  for (const attempt of attempts) {
    try {
      const result = await client.messages.create(attempt.payload);
      return { success: true, channel: attempt.type, sid: result.sid };
    } catch (error) {
      lastError = error;
      console.warn(`Twilio ${attempt.type} failed:`, error.message);
    }
  }

  throw new Error(lastError?.message || "Twilio message delivery failed");
};

// ---------------- SEND OTP ----------------
export const sendOtp = async (req, res) => {
  try {
    console.log("---- SEND OTP CALLED ----");
    console.log("Request body:", req.body);

    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile required" });
    }

    console.log("Mobile from frontend:", mobile);

    const normalizedPhone = normalizePhoneNumber(mobile);
    const cleanMobile = normalizedPhone?.replace(/^\+91/, "") || mobile.replace("+91", "");
    console.log("Mobile after cleaning:", cleanMobile);

    const admin = await Admin.findOne({ mobile: cleanMobile });

    console.log("Admin found:", admin);

    if (!admin) {
      return res
        .status(400)
        .json({ message: "This number is not registered as Admin" });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    admin.otp = otp;
    admin.otpExpires =
      Date.now() +
      parseInt(process.env.OTP_EXPIRY_MINUTES || "2") * 60 * 1000;

    await admin.save();

    console.log("Generated OTP:", otp);

    console.log("Sending OTP to:", normalizedPhone);

    const delivery = await sendOtpNotification(normalizedPhone, otp);

    console.log(`OTP sent successfully via ${delivery.channel}`);

    return res.json({
      message: delivery.channel === "sms"
        ? "OTP sent successfully via SMS"
        : "OTP sent successfully via WhatsApp",
    });

  } catch (error) {
    console.error("SEND OTP ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// ---------------- VERIFY OTP ----------------
export const verifyOtp = async (req, res) => {
  try {
    console.log("---- VERIFY OTP CALLED ----");

    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({
        message: "Mobile and OTP required",
      });
    }

    const cleanMobile = mobile.replace("+91", "");

    const admin = await Admin.findOne({ mobile: cleanMobile });

    if (!admin) {
      return res.status(400).json({ message: "Admin not found" });
    }

    if (admin.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (Date.now() > admin.otpExpires) {
      return res.status(400).json({ message: "OTP expired" });
    }

    admin.otp = null;
    admin.otpExpires = null;

    await admin.save();

    console.log("OTP verified successfully");

    return res.json({ message: "Login Successful!" });

  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};


// ---------------- ADMIN PROFILE ----------------
export const getAdminProfile = async (req, res) => {
  try {
    const cleanMobile = req.params.mobile.replace("+91", "");

    const admin = await Admin.findOne({ mobile: cleanMobile });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    return res.json(admin);

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};