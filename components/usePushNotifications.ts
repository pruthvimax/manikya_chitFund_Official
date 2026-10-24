import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import BACKEND_URL from "../config";
import { askPushPermission } from "./PushPermissionPrompt";

/**
 * Push notifications for the member app.
 *  - asks the member for notification permission (once, after login)
 *  - gives the backend this phone's push token
 *  - keeps the number on the app icon equal to `badgeTotal`
 *  - opens the right screen when a notification is tapped
 *
 * `expo-notifications` is loaded safely: if the package is not installed
 * yet, this hook simply does nothing and the app keeps working.
 */
let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false, // the badge number is managed below
    }),
  });
}

const post = async (path: string, body: any) => {
  try {
    await fetch(`${BACKEND_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // ignore (offline)
  }
};

export const PUSH_TOKEN_KEY = "pushToken";

export function usePushNotifications(userid: string, badgeTotal: number) {
  const router = useRouter();
  const tokenRef = useRef<string>("");

  /* permission + token */
  useEffect(() => {
    if (!Notifications || !userid) return;
    let cancelled = false;

    (async () => {
      try {
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Manikya Chits",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#024E32",
            showBadge: true,
          });
        }

        let { status, canAskAgain } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          // ADDED: friendly pop-up first (Allow / Not now). Only "Allow"
          // continues to the phone's own permission box.
          const allow = await askPushPermission({ canAskAgain });
          if (!allow || cancelled) return;

          const asked = await Notifications.requestPermissionsAsync();
          status = asked.status;
        }
        if (status !== "granted" || cancelled) return;

        const projectId =
          (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
          (Constants as any)?.easConfig?.projectId;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          projectId ? { projectId } : undefined
        );
        const token = tokenData?.data;
        if (!token || cancelled) return;

        tokenRef.current = token;
        await post("/push/register", { userid, token, platform: Platform.OS });
      } catch (e) {
        console.log("Push setup skipped:", (e as any)?.message || e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userid]);

  /* number on the app icon */
  useEffect(() => {
    if (!Notifications || !userid) return;
    const n = Math.max(0, Number(badgeTotal) || 0);
    Notifications.setBadgeCountAsync(n).catch(() => {});
    if (tokenRef.current) post("/push/badge", { token: tokenRef.current, count: n });
  }, [badgeTotal, userid]);

  /* tap on a notification -> open the screen */
  useEffect(() => {
    if (!Notifications) return;
    const sub = Notifications.addNotificationResponseReceivedListener((resp: any) => {
      const route = resp?.notification?.request?.content?.data?.route;
      if (route) {
        try {
          router.push(route as any);
        } catch {
          // ignore
        }
      }
    });
    return () => sub.remove();
  }, []);

  /* for logout: stop pushes to this phone */
  return {
    unregister: async () => {
      if (tokenRef.current) {
        await post("/push/unregister", { token: tokenRef.current });
        tokenRef.current = "";
      }
      if (Notifications) Notifications.setBadgeCountAsync(0).catch(() => {});
    },
  };
}
