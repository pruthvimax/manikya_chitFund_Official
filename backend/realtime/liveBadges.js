import { emitToAll } from "./socket.js";
import { notifyNewNotification, notifyNewVacancy } from "./pushNotifier.js";

/**
 * LIVE BADGES + PUSH (instant bell / vacancy count on the member app)
 *
 * This middleware does NOT change any controller or route. It only
 * listens: when a POST / PUT / DELETE on the watched path finishes
 * successfully, it
 *   1. sends a tiny "something changed" ping to every connected phone
 *      (the phone re-runs its own existing count function), and
 *   2. for a NEW notification / NEW vacancy, sends a push notification
 *      (works even when the app is closed).
 * It only reads the response that was already sent.
 */
const CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const liveBadgeMiddleware = (topic) => (req, res, next) => {
  if (CHANGING.has(req.method)) {
    // path relative to the mount ("/" = create). Read now: Express resets
    // req.url once this middleware is done.
    const mountedPath = req.path;

    // remember the JSON that the controller sends (read only)
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      res.locals.liveBody = body;
      return originalJson(body);
    };

    res.on("finish", () => {
      if (res.statusCode >= 400) return;

      try {
        // a deleted record also tells which one, so phones can drop it at once
        const del = req.method === "DELETE" ? /^\/([^/]+)\/?$/.exec(mountedPath) : null;
        emitToAll("live:changed", {
          topic,
          method: req.method,
          ...(del ? { id: decodeURIComponent(del[1]) } : {}),
        });
      } catch (e) {
        // never let a ping break a request
      }

      // push only for a freshly created record (POST to the root path)
      if (req.method === "POST" && mountedPath === "/" && res.statusCode === 201) {
        const body = res.locals.liveBody;
        let job = null;
        if (topic === "notifications") job = notifyNewNotification(body?.data);
        if (topic === "vacancy") job = notifyNewVacancy(body?.vacancy);
        if (job && typeof job.catch === "function") {
          job.catch((e) => console.error("PUSH JOB ERROR:", e?.message || e));
        }
      }
    });
  }
  next();
};
