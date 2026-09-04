import Enrollment from "../models/Enrollment.js";

// Create new enrollment
export const createEnrollment = async (req, res) => {
  try {
    const {
      chitAmount,
      chitDuration,
      chitTotalMembers,
      chitMonthlyAmount,
      collectionType,
      customerName,
      fatherHusbandName,
      address,
      nomineeName,
      nomineeRelationship,
      nomineeAddress,
      nomineeAadharNumber,
      aadharNumber,
      panNumber,
      occupation,
      mobileNumber,
      enrollmentDate,
      enrolledByEmpId,
      enrolledByEmpName,
      advancePaid,
      paymentType,
    } = req.body;

    const enrollment = new Enrollment({
      chitAmount,
      chitDuration,
      chitTotalMembers,
      chitMonthlyAmount,
      collectionType,
      customerName,
      fatherHusbandName,
      address,
      nomineeName,
      nomineeRelationship,
      nomineeAddress,
      nomineeAadharNumber,
      aadharNumber,
      panNumber,
      occupation,
      mobileNumber,
      enrollmentDate,
      enrolledByEmpId,
      enrolledByEmpName,
      advancePaid,
      paymentType,
    });

    await enrollment.save();

    res.status(201).json({
      success: true,
      message: "Enrollment submitted successfully",
      enrollment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to submit enrollment",
    });
  }
};

// Get employee's enrollments
export const getEmployeeEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      enrolledByEmpId: req.params.emp_id,
    }).sort({ enrollmentDate: -1, createdAt: -1 });

    res.json(enrollments);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load enrollments",
    });
  }
};

// Get all enrollments (admin)
export const getAllEnrollments = async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.enrollmentDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (employeeId) {
      filter.enrolledByEmpId = employeeId;
    }

    const enrollments = await Enrollment.find(filter).sort({
      enrollmentDate: -1,
      createdAt: -1,
    });

    res.json(enrollments);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load enrollments",
    });
  }
};

// Update enrollment status (admin only)
export const updateEnrollmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedEnrollment = await Enrollment.findByIdAndUpdate(
      id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!updatedEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    res.json({
      success: true,
      message: `Enrollment ${status.toLowerCase()}`,
      enrollment: updatedEnrollment,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

// Delete enrollment (admin only)
export const deleteEnrollment = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedEnrollment = await Enrollment.findByIdAndDelete(id);

    if (!deletedEnrollment) {
      return res.status(404).json({
        success: false,
        message: "Enrollment not found",
      });
    }

    res.json({
      success: true,
      message: "Enrollment deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete enrollment",
    });
  }
};