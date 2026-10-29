import DailyDatabase from "../models/DailyDatabase.js";

/* =========================================================
   DAILY LEADS - FOLLOW-UP REMINDERS

   A lead can carry a "follow-up date" (date only, YYYY-MM-DD).
   When that day comes (or has passed) and the employee has not
   marked it done, it counts as "due" and the employee gets a
   red badge + a "Follow-ups due" list.

   Dates are plain strings so there is no time-zone shifting:
   "2026-11-05" is always 5 Nov, for everyone. String comparison
   works because the format is year-month-day.
========================================================= */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// "today" in India time, used only when the phone does not send its own
const todayIST = () =>
  new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const resolveToday = (value) =>
  DATE_RE.test(String(value || "")) ? String(value) : todayIST();

/* =========================================================
   EMPLOYEE - how many follow-ups are due (for the red badge)
   GET /daily-database/follow-ups/count/:empId?today=YYYY-MM-DD
========================================================= */
export const getFollowUpCount = async (req, res) => {
  try {
    const { empId } = req.params;
    const today = resolveToday(req.query.today);

    const [todayCount, overdueCount] = await Promise.all([
      DailyDatabase.countDocuments({
        empId,
        followUpDone: { $ne: true },
        followUpDate: today,
      }),
      DailyDatabase.countDocuments({
        empId,
        followUpDone: { $ne: true },
        followUpDate: { $gt: "", $lt: today },
      }),
    ]);

    res.json({
      today,
      todayCount,
      overdueCount,
      dueCount: todayCount + overdueCount,
    });
  } catch (err) {
    console.log("getFollowUpCount error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   EMPLOYEE - mark one follow-up as done
   PUT /daily-database/follow-ups/:id/done   body: { empId }

   Employees can only mark done. Changing the date itself is an
   admin-only action (PUT /daily-database/:id).
========================================================= */
export const markFollowUpDone = async (req, res) => {
  try {
    const { id } = req.params;
    const { empId } = req.body || {};

    const entry = await DailyDatabase.findById(id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });

    // an employee may only close their own lead
    if (empId && entry.empId !== empId) {
      return res.status(403).json({ message: "Not your lead" });
    }

    if (!entry.followUpDate) {
      return res
        .status(400)
        .json({ message: "This lead has no follow-up date" });
    }

    entry.followUpDone = true;
    entry.followUpDoneAt = new Date();
    await entry.save();

    res.json(entry);
  } catch (err) {
    console.log("markFollowUpDone error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================================================
   FOLLOW-UPS DUE - LIST (for the "Follow-ups due" cards with a Call button)

   EMPLOYEE  GET /daily-database/follow-ups/due/:empId?today=YYYY-MM-DD
             that employee's due follow-ups (today + overdue, not done)
   ADMIN     GET /daily-database/follow-ups/due-all?today=YYYY-MM-DD
             every employee's due follow-ups

   Oldest (most overdue) first. Only a few fields go out - enough to
   show the name and make the call.
========================================================= */
const toDueItem = (e, today) => ({
  _id: String(e._id),
  empId: e.empId,
  employeeName: e.employeeName || "",
  name: e.name || "",
  phone: e.phone || "",
  telephone: e.telephone || "",
  occupation: e.occupation || "",
  action: e.action || "Warm",
  followUpDate: e.followUpDate || "",
  overdueDays: Math.max(
    0,
    Math.round(
      (new Date(`${today}T00:00:00Z`).getTime() -
        new Date(`${e.followUpDate}T00:00:00Z`).getTime()) /
        86400000
    )
  ),
});

const dueFilter = (today) => ({
  followUpDone: { $ne: true },
  followUpDate: { $gt: "", $lte: today },
});

export const getDueFollowUps = async (req, res) => {
  try {
    const { empId } = req.params;
    const today = resolveToday(req.query.today);

    const [list, leadsToday] = await Promise.all([
      DailyDatabase.find({ empId, ...dueFilter(today) })
        .sort({ followUpDate: 1, createdAt: 1 })
        .limit(100)
        .lean(),
      DailyDatabase.countDocuments({
        empId,
        createdAt: { $gte: new Date(`${today}T00:00:00+05:30`) },
      }),
    ]);

    res.json({
      today,
      total: list.length,
      leadsToday,
      items: list.map((e) => toDueItem(e, today)),
    });
  } catch (err) {
    console.log("getDueFollowUps error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getDueFollowUpsAll = async (req, res) => {
  try {
    const today = resolveToday(req.query.today);

    const [list, total] = await Promise.all([
      DailyDatabase.find(dueFilter(today))
        .sort({ followUpDate: 1, createdAt: 1 })
        .limit(100)
        .lean(),
      DailyDatabase.countDocuments(dueFilter(today)),
    ]);

    res.json({
      today,
      total,
      items: list.map((e) => toDueItem(e, today)),
    });
  } catch (err) {
    console.log("getDueFollowUpsAll error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
