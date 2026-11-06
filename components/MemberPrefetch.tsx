import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import BACKEND_URL from "../config";
import { loadMemberData } from "./memberLedgers";

/* =========================================================
   FASTER MEMBER PAGES (warm-up, nothing is shown, nothing is changed)

   1. The moment the app opens it sends one tiny request to the server so
      the server wakes up while the opening screen is playing (the hosting
      server sleeps when idle, and the first request used to wait for it).
   2. When the member reaches Home it quietly loads the member's chits and
      account ledgers in the background, using the SAME existing function
      My Next Due / My Receipts use (loadMemberData). That fills the shared
      member cache, so My Chits, My Account Copy, My Outstanding, My Next
      Due and My Receipts open at once instead of waiting for the server.
      It re-loads fresh data every time the member comes back to Home
      (at most once every 20 seconds).

   No page, calculation or server file is changed. A failure here is ignored.
   Switch it off with MEMBER_PREFETCH_ENABLED = false.
========================================================= */

export const MEMBER_PREFETCH_ENABLED = true;
const MIN_GAP_MS = 20000;

export default function MemberPrefetch() {
  const pathname = usePathname();
  const lastRun = useRef(0);

  // wake the server as soon as the app opens
  useEffect(() => {
    if (!MEMBER_PREFETCH_ENABLED) return;
    fetch(BACKEND_URL.replace(/\/api\/?$/, "/")).catch(() => {});
  }, []);

  // member Home reached (after login or when the app opens): warm the data
  useEffect(() => {
    if (!MEMBER_PREFETCH_ENABLED || pathname !== "/menu") return;
    if (Date.now() - lastRun.current < MIN_GAP_MS) return;
    // small delay so Home's own requests go first
    const id = setTimeout(() => {
      lastRun.current = Date.now();
      loadMemberData(true).catch(() => {});
    }, 700);
    return () => clearTimeout(id);
  }, [pathname]);

  return null;
}
