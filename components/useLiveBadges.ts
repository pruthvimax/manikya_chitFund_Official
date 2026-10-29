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
export function useLiveBadges(
  enabled: boolean,
  // gets "event" when the server really announced a change, "other" for
  // reconnect / app-back-in-front (old callers simply ignore the word)
  onChange: (reason?: "event" | "other") => void,
  // optional: called at once (no waiting) with what the server said, e.g. { topic, method: "DELETE", id }
  onEvent?: (payload: any) => void
) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const latestEvent = useRef(onEvent);
  latestEvent.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    let timer: any = null;
    let real = false;
    const fire = (isReal = false) => {
      if (isReal) real = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const reason = real ? "event" : "other";
        real = false;
        try {
          latest.current(reason);
        } catch {
          // ignore
        }
      }, 120);
    };

    const socket: Socket = io(SOCKET_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
    });

    socket.on("live:changed", (payload: any) => {
      try {
        latestEvent.current?.(payload);
      } catch {
        // ignore
      }
      fire(true);
    });
    socket.on("connect", () => fire()); // also runs after every reconnect

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
