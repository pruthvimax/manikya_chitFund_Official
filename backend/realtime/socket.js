import { Server } from "socket.io";
import {
  findSession,
  isMemberOfGroup,
  isValidSpinnerKey,
  loadAuction,
  toAdminState,
  toPublicState,
} from "./spinnerCore.js";

/* =========================================================
   SOCKET.IO FOR THE LIVE SPINNER

   - Each auction has its own room:  spinner:<notificationId>
   - A device joins only after the server checks that the member
     belongs to that group (or the admin key is valid), so nothing
     is broadcast to unrelated groups.
   - Animation frames are NOT sent. Only one "spinner:start"
     message is sent; every device animates locally.
========================================================= */

let io = null;

export const roomFor = (notificationId) => `spinner:${String(notificationId)}`;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: "*" },
    // helps clients that sit behind strict proxies
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`🔌 phone connected (${io.engine.clientsCount} online)`);
    socket.on("disconnect", () => {
      console.log(`🔌 phone disconnected (${io.engine.clientsCount} online)`);
    });
    /*
      payload: {
        notificationId?  | groupId + auctionEndDate + auctionEndTime,
        userid?          (member)
        adminKey?        (admin)
      }
      ack({ ok, notificationId, state })
    */
    socket.on("spinner:join", async (payload = {}, ack) => {
      const reply = typeof ack === "function" ? ack : () => {};

      try {
        const found = await loadAuction(payload);
        if (!found) return reply({ ok: false, message: "Auction not found" });

        const { notification, group } = found;
        const isAdmin = isValidSpinnerKey(payload.adminKey);

        if (!isAdmin && !isMemberOfGroup(group, payload.userid)) {
          return reply({ ok: false, message: "Not allowed" });
        }

        await socket.join(roomFor(notification._id));

        // remembered so the spin result can be personalised per device
        socket.data.userid = isAdmin ? "" : String(payload.userid || "");
        socket.data.isAdmin = isAdmin;

        // Reconnecting devices get the current state immediately.
        const session = await findSession(notification._id);
        const state = session
          ? isAdmin
            ? toAdminState(session)
            : toPublicState(session, { userid: payload.userid })
          : null;

        reply({ ok: true, notificationId: String(notification._id), state });
      } catch (err) {
        console.error("❌ spinner:join error:", err);
        reply({ ok: false, message: "Server error" });
      }
    });
  });

  console.log("🔌 Socket.IO ready (live spinner)");
  return io;
};

// Tiny "something changed" ping to every connected phone (live badges).
export const emitToAll = (event, payload) => {
  if (!io) return;
  console.log(`📣 live ping "${payload?.topic}" sent to ${io.engine.clientsCount} phone(s)`);
  io.emit(event, payload);
};

// Broadcast to everyone watching ONE auction only.
export const emitToAuction = (notificationId, event, payload) => {
  if (!io) return;
  io.to(roomFor(notificationId)).emit(event, payload);
};

/*
  Sends the spin to every device watching ONE auction, one message
  per device, so the winner's own phone also receives his name while
  everybody else gets only the group member ID.
*/
export const emitSpinStart = async (notificationId, session) => {
  if (!io) return;
  const sockets = await io.in(roomFor(notificationId)).fetchSockets();
  for (const s of sockets) {
    const state = s.data?.isAdmin
      ? toAdminState(session)
      : toPublicState(session, { userid: s.data?.userid });
    s.emit("spinner:start", { state });
  }
};
