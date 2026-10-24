import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { io, Socket } from "socket.io-client";
import { SOCKET_ORIGIN } from "./spinner/spinnerApi";

/**
 * Calls `onChange` right away when the server says something changed
 * (new notification, new vacancy ...), when the socket reconnects, and
 * when the app comes back to the foreground.
 *
 * It does not count anything itself. The page passes its OWN existing
 * count functions, so the numbers always come from the same logic as
 * before - this only makes them run instantly.
 */
export function useLiveBadges(enabled: boolean, onChange: () => void) {
  const latest = useRef(onChange);
  latest.current = onChange;

  useEffect(() => {
    if (!enabled) return;

    let timer: any = null;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          latest.current();
        } catch {
          // ignore
        }
      }, 400);
    };

    const socket: Socket = io(SOCKET_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
    });

    socket.on("live:changed", fire);
    socket.on("connect", fire); // also runs after every reconnect

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fire();
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
      socket.off();
      socket.disconnect();
    };
  }, [enabled]);
}
