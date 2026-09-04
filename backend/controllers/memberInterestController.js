import InterestedMember from "../models/InterestedMember.js";


// ✅ REGISTER INTEREST FORM SUBMIT
export const registerInterest = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, aadhaarNumber, address } = req.body;

    // Required Validation
    if (!fullName || !phoneNumber || !aadhaarNumber) {
      return res.status(400).json({
        message: "Full Name, Phone Number, and Aadhaar are required",
      });
    }

    // Phone Validation
    if (phoneNumber.length !== 10) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Aadhaar Validation
    if (aadhaarNumber.length !== 12) {
      return res.status(400).json({ message: "Invalid Aadhaar number" });
    }

    // Check Duplicate Aadhaar or Phone
    const alreadyExists = await InterestedMember.findOne({
      $or: [{ phoneNumber }, { aadhaarNumber }],
    });

    if (alreadyExists) {
      return res.status(400).json({
        message: "User already registered with this phone or Aadhaar",
      });
    }

    // Save in DB
    const newRequest = await InterestedMember.create({
      fullName,
      phoneNumber,
      email: email || null,
      aadhaarNumber,
      address: address || null,
      interestDate: new Date().toISOString().split("T")[0],
      status: "pending",
    });

    res.status(201).json({
      message: "Interest Registered Successfully",
      data: newRequest,
    });
  } catch (error) {
    console.error("Register Interest Error:", error);
    res.status(500).json({
      message: "Server Error",
    });
  }
};



// ✅ ADMIN: GET ALL INTEREST REQUESTS
export const getAllInterestedMembers = async (req, res) => {
  try {
    const members = await InterestedMember.find().sort({ createdAt: -1 });

    res.status(200).json(members);
  } catch (error) {
    console.log("Fetch Interested Members Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};



// ✅ ADMIN: UPDATE STATUS
export const updateInterestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await InterestedMember.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    res.status(200).json({
      message: "Status Updated Successfully",
      updated,
    });
  } catch (error) {
    console.log("Update Status Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ ADMIN: DELETE INTEREST REQUEST
export const deleteInterestedMember = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await InterestedMember.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({
      message: "Request Deleted Successfully",
    });
  } catch (error) {
    console.log("Delete Request Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
