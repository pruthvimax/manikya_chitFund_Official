import Member from "../models/Member.js";
import bcrypt from "bcryptjs";
import Group from "../models/Group.js";
  

/* ================= ADD MEMBER ================= */
export const addMember = async (req, res) => {
  try {
    const {
      userid,
      username,
      email,
      phone,
      password,
      address,
      aadhaar,
      status,
    } = req.body;

    if (!userid || !username || !phone || !password || !address || !aadhaar) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    if (aadhaar.length !== 12) {
      return res.status(400).json({ message: "Aadhaar must be 12 digits" });
    }

    const exists = await Member.findOne({ userid });
    if (exists) {
      return res.status(400).json({ message: "Member ID already exists" });
    }

    const newMember = new Member({
      userid,
      username,
      email,
      phone,
      password, // ✅ plain text (new users)
      address,
      aadhaar,
      status: status || "active",
    });

    await newMember.save();

    res.status(201).json({
      message: "Member Added Successfully",
      member: newMember,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= GET ALL MEMBERS ================= */
export const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find();
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= GET MEMBER BY USERID ================= */
export const getMemberById = async (req, res) => {
  try {
    const member = await Member.findOne({ userid: req.params.userid });
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }
    res.json(member);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= UPDATE MEMBER ================= */
export const updateMember = async (req, res) => {
  try {
    const member = await Member.findOne({ userid: req.params.userid });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    member.username = req.body.username ?? member.username;
    member.email = req.body.email ?? member.email;
    member.phone = req.body.phone ?? member.phone;
    member.address = req.body.address ?? member.address;
    member.status = req.body.status ?? member.status;

    // ✅ HANDLE PASSWORD
    if (req.body.password && req.body.password.trim() !== "") {
      member.password = req.body.password; // middleware will hash
    }

    await member.save();

    res.json({ message: "Member Updated", member });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= DELETE MEMBER ================= */
export const deleteMember = async (req, res) => {
  try {
    await Member.findOneAndDelete({ userid: req.params.userid });
    res.json({ message: "Member Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};

/* ================= MEMBER LOGIN ================= */
export const loginUser = async (req, res) => {
  try {
    const { userid, password } = req.body;

    if (!userid || !password) {
      return res.status(400).json({ message: "UserID & Password required" });
    }

    const member = await Member.findOne({ userid });

    if (!member) {
      return res.status(404).json({ message: "User not found" });
    }

    if (member.status !== "active") {
      return res.status(403).json({ message: "Account is inactive" });
    }

   const isMatch = password === member.password;

    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    member.lastLogin = new Date();
    await member.save();

    res.json({
      message: "Login successful",
      member: {
        userid: member.userid,
        username: member.username,
        phone: member.phone,
        status: member.status,
        lastLogin: member.lastLogin,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
};



/* ================= MEMBER ACCOUNT SUMMARY ================= */
export const getAccountSummary = async (req, res) => {
  try {
    const { userid } = req.params;

    const member = await Member.findOne({ userid });
    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const groups = await Group.find(
      { "members.memberId": userid },
      { members: 1, totalCollections: 1 }
    );

    let totalInvestment = 0;
    let activeChits = 0;

    for (const group of groups) {
      const m = group.members.find((x) => x.memberId === userid);
      if (!m) continue;

      let paidMonths = 0;

      m.collections.forEach((c) => {
        c.payments.forEach((p) => {
          totalInvestment += p.amount || 0;
        });

        if (c.payments.length > 0) {
          paidMonths++;
        }
      });

      if (paidMonths < group.totalCollections) {
        activeChits++;
      }
    }

    res.json({
      totalInvestment,
      activeChits,
      lastLogin: member.lastLogin || null,
    });
  } catch (err) {
    console.error("❌ Account Summary Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};



/* ================= USER: MY OUTSTANDING ================= */
export const getMyOutstanding = async (req, res) => {
  try {
    const { userid } = req.params;

    const groups = await Group.find({
      "members.memberId": userid,
    });

    let totalOutstanding = 0;
    let overdueAmount = 0;
    let dueThisMonth = 0;
    const chitGroups = [];

    const today = new Date();

    for (const group of groups) {
      const member = group.members.find(
        (m) => m.memberId === userid
      );

      if (!member) continue;

      for (const c of member.collections) {
        const paidAmount = c.payments.reduce(
          (sum, p) => sum + (p.amount || 0),
          0
        );

        const plan = group.collectionPlans.find(
          (p) => p.monthIndex === c.index
        );

        const installment =
          c.installmentAmount ||
          plan?.installmentAmount ||
          0;

        const balance = installment - paidAmount;

        if (balance <= 0) continue;

        totalOutstanding += balance;

        let status = "pending";
        let daysLeft = null;
        let daysOverdue = null;
        let lateFee = 0;

        if (c.endDate) {
          const dueDate = new Date(c.endDate);

          if (today > dueDate) {
            status = "overdue";
            daysOverdue = Math.ceil(
              (today - dueDate) / (1000 * 60 * 60 * 24)
            );

            lateFee = Math.round(balance * 0.06);
            overdueAmount += balance + lateFee;
          } else {
            daysLeft = Math.ceil(
              (dueDate - today) / (1000 * 60 * 60 * 24)
            );
            dueThisMonth += balance;
          }

          chitGroups.push({
            groupId: group.groupId,
            dueAmount: balance,
            dueDate,
            status,
            daysLeft,
            daysOverdue,
            lateFee,
          });
        }
      }
    }

    res.json({
      totalOutstanding,
      dueThisMonth,
      overdueAmount,
      chitGroups,
    });
  } catch (err) {
    console.error("❌ Outstanding Error:", err);
    res.status(500).json({ message: err.message });
  }
};
