import { emitToAll } from "./socket.js";

/* =========================================================
   EMPLOYEE ACCESS PING

   Like liveBadges.js this only LISTENS. When the admin edits or deletes
   an employee (Account Status / Feature Control / Vacancy Access are
   saved with PUT /api/employee/:emp_id), it tells the phones
   "employee:access" with that emp_id. The employee's app then re-checks
   its access at once: logs out if the account was disabled or deleted,
   and updates the Collection / Payment History / Member History /
   Vacancy access without waiting.
   No controller or route is changed.
========================================================= */
export const employeeAccessMiddleware = (req, res, next) => {
  if (req.method === "PUT" || req.method === "DELETE") {
    const m = /^\/([^/]+)\/?$/.exec(req.path);
    if (m) {
      const empId = decodeURIComponent(m[1]);
      res.on("finish", () => {
        if (res.statusCode >= 400) return;
        try {
          emitToAll("employee:access", { topic: "employee-access", empId, method: req.method });
        } catch {
          // never let a ping break a request
        }
      });
    }
  }
  next();
};
