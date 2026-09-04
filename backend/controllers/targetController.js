import Target from "../models/Target.js";

// ================= CREATE TARGET =================
export const createTarget = async (req, res) => {
  try {
    const {
      emp_id,
      employeeName,
      date,
      customerName,
      phoneNumber,
      paymentMethod,
      chitAmount,
      durationOfPayment,
      totalEnroll,
      totalGB,
      collectionAmount,
      backup,
    } = req.body;

    // ✅ Build target object with defaults for missing fields
    const targetData = {
      emp_id,
      employeeName,
      date: date || new Date(),
      customerName: customerName || "Monthly Target",
      phoneNumber: phoneNumber || "0000000000",
      chitAmount: chitAmount || "0",
      paymentMethod: paymentMethod || "Cash",
      durationOfPayment: durationOfPayment || "N/A",
      totalEnroll: totalEnroll || 0,
      totalGB: totalGB || 0,
      collectionAmount: collectionAmount || 0,
      backup: backup || "",
      status: "Pending",
    };

    const target = new Target(targetData);
    await target.save();

    res.status(201).json({
      success: true,
      message: "Target created successfully",
      target,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to create target",
      error: err.message,
    });
  }
};

// ================= GET EMPLOYEE TARGETS =================
export const getEmployeeTargets = async (req, res) => {
  try {
    const targets = await Target.find({
      emp_id: req.params.emp_id,
    }).sort({ createdAt: -1 });

    res.json(targets);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load targets",
    });
  }
};

// ================= GET ALL TARGETS (ADMIN) =================
export const getAllTargets = async (req, res) => {
  try {
    const { startDate, endDate, emp_id, status } = req.query;
    let filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (emp_id) {
      filter.emp_id = emp_id;
    }

    if (status) {
      filter.status = status;
    }

    const targets = await Target.find(filter).sort({
      date: -1,
      createdAt: -1,
    });

    res.json(targets);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load targets",
    });
  }
};

// ================= UPDATE TARGET =================
export const updateTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingTarget = await Target.findById(id);
    if (!existingTarget) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    // ✅ Admin can edit even after approval, but employee cannot
    const isAdmin = req.headers?.role === "admin" || false;
    
    if (!isAdmin && (existingTarget.status === "Approved" || existingTarget.status === "Rejected")) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit target that is ${existingTarget.status.toLowerCase()}`,
      });
    }

    // Track edit history
    const editHistory = [];
    const fieldsToTrack = [
      "customerName", "phoneNumber", "chitAmount", "durationOfPayment",
      "totalEnroll", "totalGB", "date", "paymentMethod", "collectionAmount", "backup"
    ];

    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined && updateData[field] !== existingTarget[field]) {
        editHistory.push({
          field,
          oldValue: existingTarget[field],
          newValue: updateData[field],
        });
      }
    }

    // MongoDB refuses to $set and $push the SAME path in one update
    // (ConflictingUpdateOperators, code 40). So editHistory is handled
    // one way OR the other, never both:
    //
    //   - request carries editHistory  -> the client is REWRITING the log
    //     (an admin correcting an existing collection line in place).
    //     $set that array and do NOT auto-append, otherwise the correction
    //     would show up as a duplicate line.
    //   - request does not carry it    -> normal edit: append the detected
    //     changes, exactly as before.
    //
    // The push is also skipped when nothing changed; the old code pushed
    // an empty $each on every single update.
    const { editHistory: incomingEditHistory, ...restOfUpdate } = updateData;

    const updateOps = {
      ...restOfUpdate,
      isEdited: editHistory.length > 0 || existingTarget.isEdited,
      editedAt: editHistory.length > 0 ? new Date() : existingTarget.editedAt,
      updatedAt: Date.now(),
    };

    if (incomingEditHistory !== undefined) {
      updateOps.editHistory = incomingEditHistory;
    } else if (editHistory.length > 0) {
      updateOps.$push = { editHistory: { $each: editHistory } };
    }

    const updatedTarget = await Target.findByIdAndUpdate(id, updateOps, {
      new: true,
    });

    res.json({
      success: true,
      message: "Target updated successfully",
      target: updatedTarget,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update target",
    });
  }
};

// ================= UPDATE STATUS (ADMIN) =================
export const updateTargetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;

    const updatedTarget = await Target.findByIdAndUpdate(
      id,
      {
        status,
        approvedBy: status === "Approved" ? approvedBy : undefined,
        approvedAt: status === "Approved" ? new Date() : undefined,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!updatedTarget) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    res.json({
      success: true,
      message: `Target ${status.toLowerCase()}`,
      target: updatedTarget,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update status",
    });
  }
};

// ================= UPDATE SALARY & INCENTIVE (ADMIN) =================
export const updateSalaryAndIncentive = async (req, res) => {
  try {
    const { id } = req.params;
    const { salaryAmount, incentive } = req.body;

    const updatedTarget = await Target.findByIdAndUpdate(
      id,
      {
        salaryAmount: Number(salaryAmount) || 0,
        incentive: Number(incentive) || 0,
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!updatedTarget) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    res.json({
      success: true,
      message: "Salary and incentive updated",
      target: updatedTarget,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to update salary and incentive",
    });
  }
};

// ================= DELETE TARGET (ADMIN) =================
export const deleteTarget = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTarget = await Target.findByIdAndDelete(id);

    if (!deletedTarget) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    res.json({
      success: true,
      message: "Target deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete target",
    });
  }
};
// ================= TOGGLE FREEZE =================
export const toggleFreeze = async (req, res) => {
  try {
    const { id } = req.params;
    const { isFrozen } = req.body; // boolean

    const updatedTarget = await Target.findByIdAndUpdate(
      id,
      { isFrozen: isFrozen === true },
      { new: true }
    );

    if (!updatedTarget) {
      return res.status(404).json({
        success: false,
        message: "Target not found",
      });
    }

    res.json({
      success: true,
      message: `Target ${isFrozen ? 'frozen' : 'unfrozen'} successfully`,
      target: updatedTarget,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to toggle freeze",
    });
  }
};