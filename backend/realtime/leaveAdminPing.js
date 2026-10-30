import { emitToAll } from "./socket.js";

/* =========================================================
   LEAVE REQUEST -> ADMIN LIVE PING

   Like liveBadges.js this only LISTENS. When an employee adds a leave
   request, or one is approved / rejected / deleted, it tells every
   connected phone "something changed" so the admin's bell and the
   "Leave requests" card on the dashboard refresh at once.
   No controller or route is changed.

   mount BEFORE the real router:
     app.use("/api/leave-request", leaveAdminPing);
========================================================= */
export const leaveAdminPing = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT" || req.method === "DELETE") {
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      try {
        emitToAll("live:changed", { topic: "leave", method: req.method });
      } catch (e) {
        // never let a ping break a request
      }
    });
  }
  next();
};
