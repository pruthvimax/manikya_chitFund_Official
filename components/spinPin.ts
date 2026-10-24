import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

/**
 * "Pin the spin time" for members.
 *
 * Pinning puts a sticky note in the phone's notification bar
 * ("Group Ram - live spin: 24 Oct at 07:40 PM") and sets 3 reminders on
 * the phone itself: 1 hour before, 30 minutes before and at the start.
 * (The 10-minute and 1-minute alerts already come from the server.)
 *
 * Everything runs on the phone, so it works without opening the app and
 * even if the server is asleep. If `expo-notifications` is missing, every
 * function just returns { ok:false } and nothing breaks.
 */
let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

/* Android only: a notification with a LIVE TICKING COUNTDOWN (chronometer).
   Needs the optional `@notifee/react-native` package in a development /
   store build. In Expo Go, or if it is not installed, this stays null and
   the normal pinned note is used instead. */
let notifee: any = null;
let NotifeeImportance: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require("@notifee/react-native");
  notifee = mod.default || mod;
  NotifeeImportance = mod.AndroidImportance;
} catch {
  notifee = null;
}

const KEY = "pinnedSpins";
const NOTIFEE_CHANNEL = "spin-countdown";

export type PinInfo = {
  groupKey: string;
  spinAt: number;
  spinDateText: string;
  spinTimeText: string;
  groupCode: string;
  route: string; // where a tap on the notification goes
  stickyId?: string;
  notifeeId?: string;
  reminderIds: string[];
};

const readAll = async (): Promise<Record<string, PinInfo>> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
};

const writeAll = async (all: Record<string, PinInfo>) => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
};

const dateTrigger = (date: Date) => ({
  type: Notifications?.SchedulableTriggerInputTypes?.DATE ?? "date",
  date,
  channelId: "default",
});

const clearPin = async (pin?: PinInfo) => {
  if (pin?.notifeeId && notifee) {
    try {
      await notifee.cancelNotification(pin.notifeeId);
    } catch {
      // ignore
    }
  }
  if (!pin || !Notifications) return;
  for (const id of pin.reminderIds || []) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // ignore
    }
  }
  if (pin.stickyId) {
    try {
      await Notifications.dismissNotificationAsync(pin.stickyId);
    } catch {
      // ignore
    }
  }
};

export const getPins = readAll;

export const isPinned = async (groupKey: string) => {
  const all = await readAll();
  return Boolean(all[groupKey]);
};

export const unpinSpin = async (groupKey: string) => {
  const all = await readAll();
  await clearPin(all[groupKey]);
  delete all[groupKey];
  await writeAll(all);
};

export const pinSpin = async (info: {
  groupKey: string;
  spinAt: number;
  spinDateText: string;
  spinTimeText: string;
  groupCode: string;
  route: string;
}): Promise<{ ok: boolean; reason?: string }> => {
  if (!Notifications || Platform.OS === "web") {
    return { ok: false, reason: "Pinning works in the mobile app." };
  }

  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== "granted") {
      return { ok: false, reason: "Please allow notifications in your phone settings." };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Manikya Chits",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#024E32",
        showBadge: true,
      });
    }

    const now = Date.now();
    if (!(info.spinAt > now)) return { ok: false, reason: "This spin time has already started." };

    // replace an older pin of the same group
    const all = await readAll();
    await clearPin(all[info.groupKey]);

    const data = { route: info.route, kind: "spin-pin" };
    const title = `Group ${info.groupCode} - live spin`;
    const when = `${info.spinDateText} at ${info.spinTimeText}`;

    // Android + notifee: ONE note with a ticking countdown in the bar
    let notifeeId: string | undefined;
    if (Platform.OS === "android" && notifee) {
      try {
        await notifee.requestPermission();
        await notifee.createChannel({
          id: NOTIFEE_CHANNEL,
          name: "Live spin countdown",
          importance: NotifeeImportance?.DEFAULT ?? 3,
        });
        const id = `spinpin-${info.groupKey}`;
        await notifee.displayNotification({
          id,
          title: `${title}`,
          body: `Starts ${when}`,
          data: { route: info.route, kind: "spin-pin" },
          android: {
            channelId: NOTIFEE_CHANNEL,
            ongoing: true,
            autoCancel: false,
            showChronometer: true,
            chronometerDirection: "down",
            timestamp: info.spinAt,
            // goes away by itself a minute after the spin starts
            timeoutAfter: Math.max(60 * 1000, info.spinAt - now + 60 * 1000),
            color: "#7e22ce",
            pressAction: { id: "default" },
          },
        });
        notifeeId = id;
      } catch (e: any) {
        console.log("Notifee countdown failed, using normal note:", e?.message || e);
        notifeeId = undefined;
      }
    }

    // sticky note in the notification bar (tries the Android channel first,
    // then the plain way, so it also works where the channel form is refused)
    let stickyId: string | undefined;
    let stickyError = "";
    const stickyContent = {
      title: `📌 ${title}`,
      body: `Starts ${when}`,
      data,
      sticky: true,
      autoDismiss: false,
    };
    const stickyTriggers: any[] = Platform.OS === "android" ? [{ channelId: "default" }, null] : [null];
    for (const trig of notifeeId ? [] : stickyTriggers) {
      try {
        stickyId = await Notifications.scheduleNotificationAsync({ content: stickyContent, trigger: trig });
        break;
      } catch (e: any) {
        stickyError = String(e?.message || e);
      }
    }

    // reminders on the phone itself
    const steps: { ms: number; body: string }[] = [
      { ms: 60 * 60 * 1000, body: `Starts in 1 hour (${when})` },
      { ms: 30 * 60 * 1000, body: `Starts in 30 minutes (${when})` },
      { ms: 0, body: "The live spin is starting now. Open the app!" },
    ];
    const reminderIds: string[] = [];
    for (const step of steps) {
      const at = info.spinAt - step.ms;
      if (at <= now + 5000) continue;
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: { title, body: step.body, data },
          trigger: dateTrigger(new Date(at)),
        });
        reminderIds.push(id);
      } catch {
        // ignore this one
      }
    }

    if (!stickyId && !notifeeId && reminderIds.length === 0) {
      return { ok: false, reason: `Phone refused the notification. ${stickyError}`.trim() };
    }

    all[info.groupKey] = { ...info, stickyId, notifeeId, reminderIds };
    await writeAll(all);
    return { ok: true };
  } catch (e) {
    console.log("Pin spin error:", e);
    return { ok: false, reason: `Could not pin: ${String((e as any)?.message || e)}` };
  }
};

/**
 * Call with the latest spin announcements from the server (only after a
 * successful load, never with an empty list from a failed request).
 *  - spin time over            -> removes the pin
 *  - admin cancelled           -> removes the pin
 *  - admin changed the time    -> pins again with the new time
 */
export const syncPins = async (announcements: any[]) => {
  const all = await readAll();
  const keys = Object.keys(all);
  if (keys.length === 0) return;

  for (const key of keys) {
    const pin = all[key];
    const current = announcements.find((a) => String(a.groupMongoId) === key);

    // spin time is over, or the admin cancelled it
    if (!(pin.spinAt > Date.now() - 60 * 1000) || !current) {
      await unpinSpin(key);
      continue;
    }

    if (Number(current.spinAt) !== pin.spinAt) {
      if (Number(current.spinAt) > Date.now()) {
        await pinSpin({
          groupKey: key,
          spinAt: Number(current.spinAt),
          spinDateText: current.spinDateText,
          spinTimeText: current.spinTimeText,
          groupCode: pin.groupCode,
          route: pin.route,
        });
      } else {
        await unpinSpin(key);
      }
    }
  }
};
