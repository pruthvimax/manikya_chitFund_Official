import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform } from "react-native";
import { io, Socket } from "socket.io-client";
import BACKEND_URL from "../config";
import { SOCKET_ORIGIN } from "./spinner/spinnerApi";

/* =========================================================
   EMPLOYEE ACCESS WATCHER

   Keeps the employee app in step with what the admin switches in
   Employee Details:
     - Account Status OFF (or the employee deleted) -> logged out at once
     - Feature Control   -> Collection / Payment History / Member History
                            are blocked / opened at once
     - Vacancy Access    -> Vacancy opens / closes at once

   It listens for the server's "employee:access" ping, and also re-checks
   when the app comes to the front and every 20 seconds as a safety net.
   It only READS (/employee/check-status/:emp_id); nothing is written.
========================================================= */

export type EmployeeAccess = { featureAccess: boolean; canViewVacancy: boolean };

let lastAccess: EmployeeAccess | null = null;
const listeners = new Set<(a: EmployeeAccess) => void>();

const publish = (a: EmployeeAccess) => {
  lastAccess = a;
  listeners.forEach((l) => {
    try {
      l(a);
    } catch {
      // ignore
    }
  });
};

/* pages read the newest access here (null until the first check) */
export function useEmployeeAccess(): EmployeeAccess | null {
  const [value, setValue] = useState<EmployeeAccess | null>(lastAccess);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

const notify = (title: string, message: string) => {
  if (Platform.OS === "web") {
    (globalThis as any).alert?.(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// pages that need "Feature Control" ON
const FEATURE_PAGES = ["/employee/collections", "/employee/collectPayment", "/employee/paymentHistory", "/employee/member-history", "/employee/groupMembers"];

/* mount ONCE, in app/employee/_layout.tsx */
export function useEmployeeAccessWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const busy = useRef(false);

  const check = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) return; // not logged in
      const emp = JSON.parse(stored);
      if (!emp?.emp_id) return;

      let res: Response;
      try {
        res = await fetch(`${BACKEND_URL}/employee/check-status/${encodeURIComponent(emp.emp_id)}`);
      } catch {
        return; // offline: keep things as they are
      }

      const here = pathRef.current || "";
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      // deleted, or account switched off -> log out now
      if (res.status === 404 || (res.ok && data && data.status && data.status !== "active")) {
        await AsyncStorage.removeItem("employee");
        notify(
          res.status === 404 ? "Account removed" : "Account disabled",
          res.status === 404
            ? "This employee account no longer exists."
            : "Your account was disabled by the admin. You have been logged out."
        );
        router.replace("/employee/login" as any);
        return;
      }
      if (!res.ok || !data) return;

      const access: EmployeeAccess = {
        featureAccess: data.featureAccess !== undefined ? !!data.featureAccess : true,
        canViewVacancy: data.canViewVacancy !== undefined ? !!data.canViewVacancy : false,
      };
      const before = lastAccess;
      publish(access);

      // standing on a page that was just switched off -> back to the dashboard
      if (!access.featureAccess && FEATURE_PAGES.some((p) => here.startsWith(p))) {
        notify("Access Denied", "This feature was disabled by your administrator.");
        router.replace("/employee" as any);
      } else if (!access.canViewVacancy && here.startsWith("/employee/vacancy") && (before ? before.canViewVacancy : true)) {
        notify("Access Denied", "Vacancy access was disabled by your administrator.");
        router.replace("/employee" as any);
      }
    } finally {
      busy.current = false;
    }
  }, [router]);

  useEffect(() => {
    check();

    let timer: any = null;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(check, 100);
    };

    const socket: Socket = io(SOCKET_ORIGIN, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
    });
    socket.on("employee:access", soon);
    socket.on("connect", soon);

    const poll = setInterval(check, 20000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") soon();
    });

    return () => {
      clearTimeout(timer);
      clearInterval(poll);
      sub.remove();
      socket.off("employee:access", soon);
      socket.off("connect", soon);
      socket.disconnect();
    };
  }, [check]);
}
