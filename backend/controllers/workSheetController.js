import WorkSheet from "../models/WorkSheet.js";

// Create new work sheet
export const createWorkSheet = async (req, res) => {
  try {
    const {
      emp_id,
      employeeName,
      date,
      phoneFollowupsCount,
      phoneFollowupsCustomers,
      customerVisitsCount,
      customerVisitsDetails,
      gpsPhotosCount,
      notes,
    } = req.body;

    // Check if work sheet already exists for this employee on this date
    const existingWorkSheet = await WorkSheet.findOne({
      emp_id,
      date: new Date(date),
    });

    if (existingWorkSheet) {
      return res.status(400).json({
        success: false,
        message: "Work sheet already submitted for today",
      });
    }

    const workSheet = new WorkSheet({
      emp_id,
      employeeName,
      date,
      phoneFollowupsCount,
      phoneFollowupsCustomers,
      customerVisitsCount,
      customerVisitsDetails,
      gpsPhotosCount,
      notes: notes || "",
    });

    await workSheet.save();

    res.status(201).json({
      success: true,
      message: "Work sheet submitted successfully",
      workSheet,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to submit work sheet",
    });
  }
};

// Get employee's work sheets
export const getEmployeeWorkSheets = async (req, res) => {
  try {
    const workSheets = await WorkSheet.find({
      emp_id: req.params.emp_id,
    }).sort({ date: -1, createdAt: -1 });

    res.json(workSheets);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load work sheets",
    });
  }
};

// Get all work sheets (admin)
export const getAllWorkSheets = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (employeeId) {
      filter.emp_id = employeeId;
    }

    const workSheets = await WorkSheet.find(filter).sort({
      date: -1,
      createdAt: -1,
    });

    res.json(workSheets);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load work sheets",
    });
  }
};

// Update work sheet status (admin only)
export const updateWorkSheetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedWorkSheet = await WorkSheet.findByIdAndUpdate(
      id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedWorkSheet) {
      return res.status(404).json({
        success: false,
        message: "Work sheet not found",
      });
    }

    res.json({
      success: true,
      message: `Work sheet ${status.toLowerCase()}`,
      workSheet: updatedWorkSheet,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

// Delete work sheet (admin only)
export const deleteWorkSheet = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedWorkSheet = await WorkSheet.findByIdAndDelete(id);

    if (!deletedWorkSheet) {
      return res.status(404).json({
        success: false,
        message: "Work sheet not found",
      });
    }

    res.json({
      success: true,
      message: "Work sheet deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete work sheet",
    });
  }
};