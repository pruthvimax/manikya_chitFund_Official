import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  AuctionIdentity,
  SOCKET_ORIGIN,
  SpinState,
  fetchSpinState,
} from "./spinnerApi";

/* =========================================================
   useSpinnerSession

   Keeps one device in sync with the spin of ONE auction:
   - asks the server for the current state (works after a refresh,
     a reconnect or a server restart)
   - listens for the live "spinner:start" message (Socket.IO)
   - falls back to a light HTTP poll while the spin is not finished,
     so a blocked websocket never leaves a phone behind
   - estimates the difference between the phone clock and the
     server clock so every phone animates against the same time
========================================================= */

type Options = AuctionIdentity & {
  userid?: string;
  adminKey?: string;
  enabled?: boolean;
};

export function useSpinnerSession(opts: Options) {
  const {
    notificationId,
    groupId,
    auctionEndDate,
    auctionEndTime,
    userid,
    adminKey,
    enabled = true,
  } = opts;

  const [state, setState] = useState<SpinState | null>(null);
  const [auctionEnded, setAuctionEnded] = useState(false);
  const [resolvedNotificationId, setResolvedNotificationId] = useState(
    notificationId || ""
  );
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const offsetRef = useRef(0);
  const stateRef = useRef<SpinState | null>(null);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  // The first spin of an auction never changes, so keep what we have
  // and only accept a state that is new or more complete.
  const acceptState = useCallback((incoming: SpinState | null) => {
    if (!incoming) return;
    const current = stateRef.current;
    if (
      current &&
      current.notificationId === incoming.notificationId &&
      current.startsAt === incoming.startsAt &&
      // keep the richer admin version if we already have it
      (current.audit || !incoming.audit)
    ) {
      stateRef.current = { ...incoming, audit: current.audit || incoming.audit };
      setState({ ...incoming, audit: current.audit || incoming.audit });
      return;
    }
    stateRef.current = incoming;
    setState(incoming);
  }, []);

  const refetch = useCallback(async () => {
    try {
      const result = await fetchSpinState(
        { notificationId, groupId, auctionEndDate, auctionEndTime, userid },
        adminKey
      );
      offsetRef.current = result.clockOffset;
      setAuctionEnded(result.auctionEnded);
      if (result.notificationId) setResolvedNotificationId(result.notificationId);
      acceptState(result.state);
      setError("");
      return result;
    } catch (e: any) {
      setError(e?.message || "Could not reach the server");
      return null;
    } finally {
      setLoading(false);
    }
  }, [
    notificationId,
    groupId,
    auctionEndDate,
    auctionEndTime,
    userid,
    adminKey,
    acceptState,
  ]);

  /* ---------- first load + light polling fallback ---------- */
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    refetch();

    const timer = setInterval(() => {
      if (cancelled) return;
      const s = stateRef.current;
      // once the spin is over there is nothing more to learn
      if (s && Date.now() + offsetRef.current > s.endsAt + 1000) return;
      refetch();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, refetch]);

  /* ---------- live socket ---------- */
  useEffect(() => {
    if (!enabled) return;
    if (!notificationId && !(groupId && auctionEndDate && auctionEndTime)) return;
    if (!userid && !adminKey) return;

    let socket: Socket | null = io(SOCKET_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 800,
      reconnectionDelayMax: 4000,
    });

    const join = () => {
      socket?.emit(
        "spinner:join",
        {
          notificationId,
          groupId,
          auctionEndDate,
          auctionEndTime,
          userid,
          adminKey,
        },
        (ack: any) => {
          if (ack?.ok) {
            setConnected(true);
            if (ack.notificationId) setResolvedNotificationId(ack.notificationId);
            if (ack.state) acceptState(ack.state as SpinState);
            // re-measure the clock gap after every (re)connect
            refetch();
          } else {
            setConnected(false);
          }
        }
      );
    };

    socket.on("connect", join); // runs again after every reconnect
    socket.on("disconnect", () => setConnected(false));
    socket.on("spinner:start", (payload: { state: SpinState }) => {
      if (payload?.state) {
        acceptState(payload.state);
        setAuctionEnded(true);
      }
    });

    return () => {
      socket?.off("connect", join);
      socket?.disconnect();
      socket = null;
    };
  }, [
    enabled,
    notificationId,
    groupId,
    auctionEndDate,
    auctionEndTime,
    userid,
    adminKey,
    acceptState,
    refetch,
  ]);

  return {
    state,
    auctionEnded,
    notificationId: resolvedNotificationId,
    connected,
    loading,
    error,
    serverNow,
    refetch,
  };
}
