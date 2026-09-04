import Commitment from "../models/Commitment.js";

// Create new commitment
export const createCommitment = async (req, res) => {
  try {
    const {
      emp_id,
      employeeName,
      customerType,
      customerName,
      phoneNumber,
      address,
      commitmentDate,
      commitmentTime,
      purpose,
      followUpDate,
      notes,
    } = req.body;

    const commitment = new Commitment({
      emp_id,
      employeeName,
      customerType,
      customerName,
      phoneNumber,
      address,
      commitmentDate,
      commitmentTime,
      purpose,
      followUpDate: followUpDate || null,
      notes: notes || "",
    });

    await commitment.save();

    res.status(201).json({
      success: true,
      message: "Commitment added successfully",
      commitment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to add commitment",
    });
  }
};

// Get employee's commitments
export const getEmployeeCommitments = async (req, res) => {
  try {
    const commitments = await Commitment.find({
      emp_id: req.params.emp_id,
    }).sort({ commitmentDate: -1, createdAt: -1 });

    res.json(commitments);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load commitments",
    });
  }
};

// Get all commitments (admin)
export const getAllCommitments = async (req, res) => {
  try {
    const commitments = await Commitment.find().sort({
      commitmentDate: -1,
      createdAt: -1,
    });

    res.json(commitments);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load commitments",
    });
  }
};

// Update commitment status only
export const updateCommitmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedCommitment = await Commitment.findByIdAndUpdate(
      id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedCommitment) {
      return res.status(404).json({
        success: false,
        message: "Commitment not found",
      });
    }

    res.json({
      success: true,
      message: `Commitment ${status.toLowerCase()}`,
      commitment: updatedCommitment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

// Delete commitment (admin only)
export const deleteCommitment = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedCommitment = await Commitment.findByIdAndDelete(id);

    if (!deletedCommitment) {
      return res.status(404).json({
        success: false,
        message: "Commitment not found",
      });
    }

    res.json({
      success: true,
      message: "Commitment deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete commitment",
    });
  }
};