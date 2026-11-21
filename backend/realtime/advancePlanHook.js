import { runAdvanceSync } from "../controllers/advanceController.js";

/* =========================================================
   ADMIN ADDED / CHANGED A MONTH COLLECTION  ->  ADD WAITING ADVANCES

   Like liveBadges.js this only LISTENS. After the existing route has saved
   a collection plan (POST /api/groups/:groupId/collection-plan) or a month's
   dividend (PUT /api/groups/:groupId/collection-plan/:month/dividend), it adds
   the waiting advances of that group to the months that now exist, and takes
   back anything a month no longer needs. No controller or route is changed.

   mount BEFORE the real router:
     app.use("/api/groups", advancePlanHook);
========================================================= */
const PATH = /^\/([^/]+)\/collection-plan(?:\/[^/]+\/dividend)?\/?$/;

export const advancePlanHook = (req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    const m = PATH.exec(req.path); // read now: Express resets req.url later
    if (m) {
      const groupCode = decodeURIComponent(m[1]);
      res.on("finish", () => {
        if (res.statusCode >= 400) return;
        runAdvanceSync(groupCode).catch((e) => console.error("ADVANCE SYNC ERROR:", e?.message || e));
      });
    }
  }
  next();
};
