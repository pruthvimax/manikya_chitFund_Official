import DailyDatabase from "../models/DailyDatabase.js";

/* =========================================================
   EMPLOYEE — create a new lead entry
   POST /daily-database
========================================================= */
export const createEntry = async (req, res) => {
  try {
    const {
      empId,
      employeeName,
      name,
      phone,
      occupation,
      workAddress,
      permanentAddress,
      action,
    } = req.body;

    if (!empId || !employeeName || !name || !phone) {
      return res.status(400).json({
        message: "Employee info, name and phone are required",
      });
    }

    const entry = await DailyDatabase.create({
      empId,
      employeeName,
      name,
      phone,
      occupation,
      workAddress,
      permanentAddress,
      action: ["Hot", "Warm", "Cold"].includes(action) ? action : "Warm",
    });

    res.status(201).json(entry);
  } catch (err) {
    console.log("createEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   EMPLOYEE (own entries) / ADMIN (any employee's entries)
   GET /daily-database/employee/:empId
========================================================= */
export const getEntriesByEmployee = async (req, res) => {
  try {
    const { empId } = req.params;
    const entries = await DailyDatabase.find({ empId }).sort({
      createdAt: -1,
    });
    res.json(entries);
  } catch (err) {
    console.log("getEntriesByEmployee error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ADMIN — one row per employee who has submitted at least one
   entry, with counts broken down by Hot/Warm/Cold.
   GET /daily-database/employees-summary
========================================================= */
export const getEmployeesSummary = async (req, res) => {
  try {
    const summary = await DailyDatabase.aggregate([
      {
        $group: {
          _id: "$empId",
          employeeName: { $first: "$employeeName" },
          totalEntries: { $sum: 1 },
          hotCount: { $sum: { $cond: [{ $eq: ["$action", "Hot"] }, 1, 0] } },
          warmCount: { $sum: { $cond: [{ $eq: ["$action", "Warm"] }, 1, 0] } },
          coldCount: { $sum: { $cond: [{ $eq: ["$action", "Cold"] }, 1, 0] } },
          lastEntryAt: { $max: "$createdAt" },
        },
      },
      { $sort: { lastEntryAt: -1 } },
    ]);

    const formatted = summary.map((s) => ({
      empId: s._id,
      employeeName: s.employeeName,
      totalEntries: s.totalEntries,
      hotCount: s.hotCount,
      warmCount: s.warmCount,
      coldCount: s.coldCount,
      lastEntryAt: s.lastEntryAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.log("getEmployeesSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ADMIN ONLY — edit one entry
   PUT /daily-database/:id
========================================================= */
export const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      phone,
      occupation,
      workAddress,
      permanentAddress,
      action,
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (occupation !== undefined) updates.occupation = occupation;
    if (workAddress !== undefined) updates.workAddress = workAddress;
    if (permanentAddress !== undefined)
      updates.permanentAddress = permanentAddress;
    if (["Hot", "Warm", "Cold"].includes(action)) updates.action = action;

    const entry = await DailyDatabase.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!entry) return res.status(404).json({ message: "Entry not found" });

    res.json(entry);
  } catch (err) {
    console.log("updateEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   ADMIN ONLY — delete one entry
   DELETE /daily-database/:id
========================================================= */
export const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await DailyDatabase.findByIdAndDelete(id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    console.log("deleteEntry error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
