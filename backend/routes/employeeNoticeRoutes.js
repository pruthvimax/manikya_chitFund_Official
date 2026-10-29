import express from "express";
import EmployeeNotice from "../models/EmployeeNotice.js";
import Vacancy from "../models/Vacancy.js";

const router = express.Router();

/* GET /api/employee-notices/:emp_id  -> latest notices for this employee */
router.get("/:emp_id", async (req, res) => {
  try {
    const list = await EmployeeNotice.find({ emp_id: String(req.params.emp_id) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    /* vacancy notices whose vacancy the admin has deleted are dropped (and
       removed for good) - this also cleans notices made before refId existed */
    const vacNotices = list.filter((n) => n.kind === "vacancy");
    let stale = new Set();
    if (vacNotices.length) {
      const vacancies = await Vacancy.find({}, { _id: 1, groupId: 1 }).lean();
      const ids = new Set(vacancies.map((v) => String(v._id)));
      const groups = new Set(vacancies.map((v) => String(v.groupId)));
      const groupOf = (n) => ((/^Group (.+) has seats open/.exec(n.body || "") || [])[1] || "").trim();
      // newest notice per group (a group has one vacancy at a time)
      const newest = {};
      vacNotices.forEach((n) => {
        const g = groupOf(n);
        const t = new Date(n.createdAt).getTime();
        if (g && t > (newest[g] || 0)) newest[g] = t;
      });
      vacNotices.forEach((n) => {
        let alive;
        if (n.refId) alive = ids.has(String(n.refId));
        else {
          const g = groupOf(n);
          alive = g ? groups.has(g) && new Date(n.createdAt).getTime() >= (newest[g] || 0) : true;
        }
        if (!alive) stale.add(String(n._id));
      });
      if (stale.size) {
        EmployeeNotice.deleteMany({ _id: { $in: [...stale] } }).catch(() => {});
      }
    }
    res.json(list.filter((n) => !stale.has(String(n._id))));
  } catch (err) {
    console.error("EMPLOYEE NOTICES ERROR:", err);
    res.status(500).json({ message: "Failed to load notices" });
  }
});

export default router;
