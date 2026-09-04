import Meeting from "../models/Meeting.js";

// Create new meeting
export const createMeeting = async (req, res) => {
  try {
    const {
      emp_id,
      employeeName,
      meetingType,
      duration,
      startTime,
      endTime,
      meetingDate,
      promotionPlans,
      membersPresent,
      agenda,
      outcome,
    } = req.body;

    const meeting = new Meeting({
      emp_id,
      employeeName,
      meetingType,
      duration,
      startTime,
      endTime,
      meetingDate,
      promotionPlans,
      membersPresent,
      agenda: agenda || "",
      outcome: outcome || "",
    });

    await meeting.save();

    res.status(201).json({
      success: true,
      message: "Meeting recorded successfully",
      meeting,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to record meeting",
    });
  }
};

// Get employee's meetings
export const getEmployeeMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      emp_id: req.params.emp_id,
    }).sort({ meetingDate: -1, createdAt: -1 });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load meetings",
    });
  }
};

// Get all meetings (admin)
export const getAllMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find().sort({
      meetingDate: -1,
      createdAt: -1,
    });

    res.json(meetings);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load meetings",
    });
  }
};

// Update meeting
export const updateMeeting = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: Date.now(),
    };

    const updatedMeeting = await Meeting.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedMeeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.json({
      success: true,
      message: "Meeting updated successfully",
      meeting: updatedMeeting,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update meeting",
    });
  }
};

// Delete meeting
export const deleteMeeting = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedMeeting = await Meeting.findByIdAndDelete(id);

    if (!deletedMeeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete meeting",
    });
  }
};

// Update meeting status (admin)
export const updateMeetingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedMeeting = await Meeting.findByIdAndUpdate(
      id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedMeeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.json({
      success: true,
      message: `Meeting ${status.toLowerCase()}`,
      meeting: updatedMeeting,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update meeting status",
    });
  }
};