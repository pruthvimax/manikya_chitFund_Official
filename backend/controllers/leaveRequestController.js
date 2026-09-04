import LeaveRequest from "../models/LeaveRequest.js";

export const createLeaveRequest = async (req, res) => {
  try {
    const {
      emp_id,
      employeeName,
      leaveType,
      fromDate,
      toDate,
      reason,
    } = req.body;

    const leave = new LeaveRequest({
      emp_id,
      employeeName,
      leaveType,
      fromDate,
      toDate,
      reason,
    });

    await leave.save();

    res.status(201).json({
      success: true,
      message: "Leave request submitted",
      leave,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to submit leave request",
    });
  }
};

export const getEmployeeLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({
      emp_id: req.params.emp_id,
    }).sort({ createdAt: -1 });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load leave requests",
    });
  }
};

export const getAllLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().sort({
      createdAt: -1,
    });

    res.json(leaves);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load leave requests",
    });
  }
};

// Add delete function
export const deleteLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedLeave = await LeaveRequest.findByIdAndDelete(id);
    
    if (!deletedLeave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }
    
    res.json({
      success: true,
      message: "Leave request deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete leave request",
    });
  }
};

// Add status update function
export const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const updatedLeave = await LeaveRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!updatedLeave) {
      return res.status(404).json({
        success: false,
        message: "Leave request not found",
      });
    }
    
    res.json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`,
      leave: updatedLeave,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update leave request status",
    });
  }
};