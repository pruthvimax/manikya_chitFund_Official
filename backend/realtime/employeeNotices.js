import EmployeeNotice from "../models/EmployeeNotice.js";
import Employee from "../models/Employee.js";
import PushToken from "../models/PushToken.js";
import { emitToAll } from "./socket.js";
import { sendPush, waitAndCheckVacancy } from "./pushNotifier.js";

/* =========================================================
   EMPLOYEE NOTIFICATIONS (bell + phone notification bar)

   Like liveBadges.js this only LISTENS. When the admin approves /
   rejects something an employee sent (leave, target, meeting, work
   sheet, enrollment, commitment) or a new vacancy is published, it
     1. saves a small notice for that employee,
     2. pings the phones so the bell number goes up at once,
     3. sends a push to that employee's phone (works when app is closed).
   No existing controller or route is changed.

   Employee phones register their push token with the id
   "emp:<emp_id>", so they never mix with member phones.
========================================================= */

const KINDS = {
  leave: { key: "leave", empField: "emp_id", label: "Leave request", route: "/employee/leaveRequest" },
  target: { key: "target", empField: "emp_id", label: "Target", route: "/employee/my-targets" },
  meeting: { key: "meeting", empField: "emp_id", label: "Meeting", route: "/employee/meeting-history" },
  worksheet: { key: "workSheet", empField: "emp_id", label: "Work sheet", route: "/employee/workSheet-history" },
  enrollment: { key: "enrollment", empField: "enrolledByEmpId", label: "Enrollment", route: "/employee/enrollment-history" },
  commitment: { key: "commitment", empField: "emp_id", label: "Commitment", route: "/employee/commitments" },
};

const GOOD = new Set(["Approved", "Completed"]);
const BAD = new Set(["Rejected", "Cancelled"]);

const pushToEmployees = async (empIds, payload) => {
  const ids = empIds.map((e) => `emp:${e}`);
  const tokens = await PushToken.find({ userid: { $in: ids } }).lean();
  await sendPush(tokens, payload);
};

const addNotice = async (empId, notice) => {
  await EmployeeNotice.create({ emp_id: String(empId), ...notice });
};

/* admin deleted the thing that caused a notice -> remove its notices too */
const removeNoticesOnDelete = (kind, req, res) => {
  const m = /^\/([^/]+)\/?$/.exec(req.path);
  if (!m) return;
  const refId = decodeURIComponent(m[1]);
  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    EmployeeNotice.deleteMany({ kind, refId })
      .then(() => {
        try {
          emitToAll("live:changed", { topic: "employee" });
        } catch {}
      })
      .catch((e) => console.error("EMPLOYEE NOTICE DELETE ERROR:", e?.message || e));
  });
};

/* mount BEFORE the real router:  app.use("/api/target", employeeNoticeMiddleware("target")) */
export const employeeNoticeMiddleware = (kind) => (req, res, next) => {
  const cfg = KINDS[kind];
  if (cfg && req.method === "DELETE") {
    removeNoticesOnDelete(kind, req, res);
    return next();
  }
  if (!cfg || req.method !== "PUT" || !/^\/[^/]+\/status\/?$/.test(req.path)) return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.locals.empNoticeBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (res.statusCode >= 400) return;
    (async () => {
      const doc = res.locals.empNoticeBody?.[cfg.key];
      const empId = doc?.[cfg.empField];
      const status = String(doc?.status || "");
      if (!empId || !(GOOD.has(status) || BAD.has(status))) return;

      const word = status.toLowerCase();
      const notice = {
        kind,
        title: `${cfg.label} ${word}`,
        body: `Your ${cfg.label.toLowerCase()} was ${word} by the admin.`,
        route: cfg.route,
        tone: GOOD.has(status) ? "good" : "bad",
        refId: String(doc?._id || ""),
      };
      await addNotice(empId, notice);
      try {
        emitToAll("live:changed", { topic: "employee" });
      } catch {}
      await pushToEmployees([empId], { title: notice.title, body: notice.body, data: { route: notice.route } });
    })().catch((e) => console.error("EMPLOYEE NOTICE ERROR:", e?.message || e));
  });

  next();
};

/* mount BEFORE the vacancy router: a new vacancy goes to employees who have Vacancy Access ON */
export const employeeVacancyMiddleware = (req, res, next) => {
  if (req.method === "DELETE") {
    removeNoticesOnDelete("vacancy", req, res);
    return next();
  }
  if (req.method !== "POST" || req.path !== "/") return next();

  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.locals.empVacancyBody = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    if (res.statusCode !== 201) return;
    (async () => {
      const vacancy = res.locals.empVacancyBody?.vacancy;
      if (!vacancy || vacancy.status === "Closed") return;

      const employees = await Employee.find({ canViewVacancy: true }, { emp_id: 1 }).lean();
      const ids = employees.map((e) => e.emp_id).filter(Boolean);
      if (ids.length === 0) return;

      const notice = {
        kind: "vacancy",
        title: "New vacancy available",
        body: `Group ${vacancy.groupId} has seats open.`,
        route: "/employee/vacancy",
        tone: "info",
        refId: String(vacancy._id || ""),
      };
      await EmployeeNotice.insertMany(ids.map((id) => ({ emp_id: String(id), ...notice })));
      try {
        emitToAll("live:changed", { topic: "employee" });
      } catch {}
      // phone alert only if the admin did not delete the vacancy right away
      if (!(await waitAndCheckVacancy(vacancy))) return;
      await pushToEmployees(ids, { title: notice.title, body: notice.body, data: { route: notice.route } });
    })().catch((e) => console.error("EMPLOYEE VACANCY NOTICE ERROR:", e?.message || e));
  });

  next();
};
