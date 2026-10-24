import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_ORIGIN, fetchSpinState } from "./spinnerApi";

/* =========================================================
   GlobalSpinAutoOpen  (mounted once, in the root layout)

   When the admin starts a live spin, the server sends a tiny
   "spinner:live" ping. A member who belongs to that group gets the
   live spin page opened automatically - whichever page of the app
   he is on (menu, notifications, bid room ...). The page then shows
   the 5 second "Spin starts in 5" countdown, the same as the admin.

   - Does nothing for the admin app / admin pages.
   - Checks with the server that this member really belongs to the
     group before opening anything (the ping carries no winner).
   - Does nothing if the live spin page is already open (for
     example the Bid Room's own auto-open got there first).
========================================================= */

export default function GlobalSpinAutoOpen() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const doneRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let socket: Socket | null = null;
    let dead = false;

    try {
      socket = io(SOCKET_ORIGIN, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1500,
        reconnectionDelayMax: 10000,
      });

      socket.on("spinner:live", async (p: any) => {
        try {
          if (dead || !p?.notificationId) return;

          const key = `${p.notificationId}:${p.startsAt}`;
          if (doneRef.current.has(key)) return;

          // admin phone / admin pages never auto-open as a member
          if ((await AsyncStorage.getItem("adminSession")) === "true") return;
          if (String(pathRef.current || "").startsWith("/admin")) return;

          const raw = await AsyncStorage.getItem("loggedUser");
          if (!raw) return;
          const userid = String(JSON.parse(raw)?.userid || "");
          if (!userid) return;

          // is this member in that group, and is the spin still on?
          const result = await fetchSpinState({
            notificationId: String(p.notificationId),
            userid,
          });
          const st = result.state;
          if (!st || st.status === "completed") return;

          doneRef.current.add(key);

          // give the Bid Room's own auto-open a moment to go first
          await new Promise((r) => setTimeout(r, 700));
          if (dead) return;
          if (String(pathRef.current || "").includes("spinnerLive")) return;

          router.push({
            pathname: "/spinnerLive",
            params: {
              groupId: String(p.groupMongoId || ""),
              groupCode: String(p.groupCode || ""),
              auctionEndDate: String(p.auctionEndDate || ""),
              auctionEndTime: String(p.auctionEndTime || ""),
              userid,
            },
          } as any);
        } catch {
          // not a member / offline -> nothing to do
        }
      });
    } catch {
      socket = null;
    }

    return () => {
      dead = true;
      try {
        socket?.disconnect();
      } catch {
        // ignore
      }
    };
  }, [router]);

  return null;
}
