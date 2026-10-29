import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BACKEND_URL from "../config";
import { useLiveBadges } from "./useLiveBadges";
import { usePushNotifications } from "./usePushNotifications";

/**
 * Employee notifications (bell + list + red Clear + phone push).
 *
 * NEW file only - the employee screens keep all their old logic.
 * Clear is local to this phone: nothing is deleted from the server.
 */

export type EmpNotice = {
  _id: string;
  kind?: string;
  title: string;
  body?: string;
  route?: string;
  refId?: string;
  tone?: "good" | "bad" | "info" | string;
  createdAt: string;
};

const clearedKey = (id: string) => `empNoticeClearedAt_${id}`;
const followKey = (id: string) => `empFollowCleared_${id}`;
const cacheKey = (id: string) => `empNoticeCache_${id}`;
const seenKey = (id: string) => `empSeen_${id}`;

/* What the employee has already looked at (hides the red numbers only;
   the list itself is emptied by Clear). */
type Seen = { bellAt: number; followN: number; bellVac: string[]; cardAt: number; cardVac: string[] };
const NO_SEEN: Seen = { bellAt: 0, followN: 0, bellVac: [], cardAt: 0, cardVac: [] };

export function useEmployeeNotices(followUpDue: number) {
  const [empId, setEmpId] = useState("");
  const [items, setItems] = useState<EmpNotice[]>([]);
  const [clearedAt, setClearedAt] = useState(0);
  const [followCleared, setFollowCleared] = useState(0);
  // null = not checked yet, true = notice service answered, string = why it did not
  const [serverOk, setServerOk] = useState<boolean | null>(null);
  const [serverErr, setServerErr] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);
  // groups that really have an open vacancy right now (null = not known yet)
  const [openGroups, setOpenGroups] = useState<string[] | null>(null);
  const [seenVac, setSeenVac] = useState<string[]>([]);
  const [seen, setSeen] = useState<Seen>(NO_SEEN);
  const idRef = useRef("");

  const load = useCallback(async () => {
    const id = idRef.current;
    if (!id) return;
    // the notice list and the open-vacancy list load side by side (faster)
    const loadNotices = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/employee-notices/${id}`);
      if (!res.ok) {
        setServerOk(false);
        setServerErr(`HTTP ${res.status}`);
      } else {
        const data = await res.json();
        if (Array.isArray(data)) {
          setServerOk(true);
          setItems(data);
          AsyncStorage.setItem(cacheKey(id), JSON.stringify(data)).catch(() => {});
        } else {
          setServerOk(false);
          setServerErr("unexpected reply");
        }
      }
    } catch (e: any) {
      setServerOk(false);
      setServerErr("cannot reach server");
    }
    };
    // keep the Vacancy page's saved list warm so it opens instantly
    const loadVac = async () => {
    try {
      const [v, n] = await Promise.all([
        fetch(`${BACKEND_URL}/vacancy/employee-open?emp_id=${encodeURIComponent(id)}`),
        fetch(`${BACKEND_URL}/notifications`),
      ]);
      if (v.ok) {
        const vd = await v.json();
        if (Array.isArray(vd)) {
          setOpenIds(vd.map((x: any) => String(x?._id ?? x?.id ?? "")).filter(Boolean));
          setOpenGroups(vd.map((x: any) => String(x?.groupId ?? "").trim()).filter(Boolean));
          AsyncStorage.setItem(`empVacancies_${id}`, JSON.stringify(vd)).catch(() => {});
        }
      }
      if (n.ok) {
        const nd = await n.json();
        if (Array.isArray(nd))
          AsyncStorage.setItem("empVacancyNotifs", JSON.stringify(nd)).catch(() => {});
      }
    } catch {
      // ignore
    }
    };
    await Promise.all([loadNotices(), loadVac()]);
  }, []);

  /* who is logged in + saved state, then first load */
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("employee");
        if (!stored) return;
        const id = String(JSON.parse(stored)?.emp_id || "");
        if (!id) return;
        idRef.current = id;
        setEmpId(id);
        const [c, f, cached, sv] = await Promise.all([
          AsyncStorage.getItem(clearedKey(id)),
          AsyncStorage.getItem(followKey(id)),
          AsyncStorage.getItem(cacheKey(id)),
          AsyncStorage.getItem(`empVacSeen_${id}`),
        ]);
        try {
          if (sv) setSeenVac(JSON.parse(sv));
        } catch {
          // ignore
        }
        try {
          const sn = await AsyncStorage.getItem(seenKey(id));
          if (sn) setSeen({ ...NO_SEEN, ...JSON.parse(sn) });
        } catch {
          // ignore
        }
        setClearedAt(Number(c) || 0);
        setFollowCleared(Number(f) || 0);
        if (cached) {
          try {
            setItems(JSON.parse(cached));
          } catch {
            // ignore
          }
        }
        load();
      } catch {
        // ignore
      }
    })();
  }, [load]);

  /* instant refresh when the server says something changed */
  useLiveBadges(!!empId, load);

  // A vacancy notice is hidden once its vacancy is gone (admin deleted it).
  // The phone checks this itself, so it works even before the server cleans up.
  const visible = useMemo(() => {
    const groupOf = (n: EmpNotice) => (/^Group (.+) has seats open/.exec(n.body || "") || [])[1]?.trim() || "";
    // newest vacancy notice per group: a group only has one vacancy at a time,
    // so older notices of the same group belong to vacancies deleted earlier
    const newestForGroup: Record<string, number> = {};
    items.forEach((n) => {
      if (n.kind !== "vacancy") return;
      const g = groupOf(n);
      const t = new Date(n.createdAt).getTime();
      if (g && t > (newestForGroup[g] || 0)) newestForGroup[g] = t;
    });
    return items.filter((n) => {
      const t = new Date(n.createdAt).getTime();
      if (t <= clearedAt) return false;
      if (n.kind === "vacancy") {
        if (n.refId && openIds.length > 0) {
          if (!openIds.includes(String(n.refId))) return false;
        } else {
          const g = groupOf(n);
          if (g && openGroups && !openGroups.includes(g)) return false;
          if (g && t < (newestForGroup[g] || 0)) return false;
        }
      }
      return true;
    });
  }, [items, clearedAt, openGroups, openIds]);
  const followShown = followUpDue > followCleared ? followUpDue : 0;
  const latestMs = useMemo(
    () => items.reduce((m, n) => Math.max(m, new Date(n.createdAt).getTime() || 0), 0),
    [items]
  );
  // Fallback that needs no backend change: if the notice service is not
  // answering, show open vacancies the employee has not cleared yet.
  const newVacancies = serverOk === false ? openIds.filter((x) => !seenVac.includes(x)).length : 0;

  /* red numbers (disappear once the bell / the Vacancy card was opened) */
  const bellFrom = Math.max(clearedAt, seen.bellAt);
  const bellNotices = visible.filter((n) => new Date(n.createdAt).getTime() > bellFrom).length;
  const bellFollow = followShown > 0 && followUpDue > seen.followN ? 1 : 0;
  const bellVacancy =
    serverOk === false && openIds.some((x) => !seenVac.includes(x) && !seen.bellVac.includes(x)) ? 1 : 0;
  const unread = bellNotices + bellFollow + bellVacancy;

  const cardFrom = Math.max(clearedAt, seen.cardAt);
  const vacancyBadge =
    serverOk === false
      ? openIds.filter((x) => !seenVac.includes(x) && !seen.cardVac.includes(x)).length
      : visible.filter((n) => n.kind === "vacancy" && new Date(n.createdAt).getTime() > cardFrom).length;

  const saveSeen = useCallback((next: Seen) => {
    setSeen(next);
    if (idRef.current)
      AsyncStorage.setItem(seenKey(idRef.current), JSON.stringify(next)).catch(() => {});
  }, []);

  /* bell opened -> only the BELL number goes away; the Vacancy card number
     stays until the employee opens the Vacancy page */
  const markBellSeen = useCallback(() => {
    saveSeen({
      ...seen,
      bellAt: Math.max(seen.bellAt, latestMs),
      followN: followUpDue,
      bellVac: openIds,
    });
  }, [seen, latestMs, followUpDue, openIds, saveSeen]);

  /* Vacancy card tapped -> its number goes away */
  const markVacancySeen = useCallback(() => {
    saveSeen({ ...seen, cardAt: Math.max(seen.cardAt, latestMs), cardVac: openIds });
  }, [seen, latestMs, openIds, saveSeen]);

  const clear = useCallback(async () => {
    const now = latestMs > 0 ? latestMs : Date.now();
    setClearedAt(now);
    setFollowCleared(followUpDue);
    setSeenVac(openIds);
    if (idRef.current) {
      AsyncStorage.setItem(`empVacSeen_${idRef.current}`, JSON.stringify(openIds)).catch(() => {});
      AsyncStorage.setItem(clearedKey(idRef.current), String(now)).catch(() => {});
      AsyncStorage.setItem(followKey(idRef.current), String(followUpDue)).catch(() => {});
    }
  }, [followUpDue, openIds, latestMs]);

  /* phone notification bar + icon number (employee tokens use "emp:<id>") */
  const { unregister } = usePushNotifications(empId ? `emp:${empId}` : "", unread);

  return {
    empId,
    visible,
    followShown,
    newVacancies,
    vacancyBadge,
    serverOk,
    serverErr,
    unread,
    markBellSeen,
    markVacancySeen,
    clear,
    reload: load,
    unregister,
  };
}

/* ---------------- bell button (sits in the green header) ---------------- */
export function EmployeeBell({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        width: 38,
        height: 38,
        borderRadius: 10,
        backgroundColor: "rgba(255,255,255,0.2)",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
      }}
    >
      <MaterialIcons name="notifications" size={21} color="#fff" />
      {count > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            backgroundColor: "#DC2626",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: "#024e32",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800" }}>
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

const TONE: Record<string, { bg: string; fg: string; icon: any }> = {
  good: { bg: "#DCFCE7", fg: "#15803D", icon: "check-circle" },
  bad: { bg: "#FEE2E2", fg: "#B91C1C", icon: "cancel" },
  info: { bg: "#E0F2FE", fg: "#0369A1", icon: "notifications-active" },
};
const KIND_ICON: Record<string, any> = {
  vacancy: "event-seat",
  leave: "beach-access",
  target: "flag",
  meeting: "groups",
  worksheet: "assignment",
  enrollment: "how-to-reg",
  commitment: "handshake",
};

/* ---------------- list sheet with red Clear ---------------- */
export function EmployeeNoticeSheet({
  visible,
  onClose,
  notices,
  followShown,
  newVacancies = 0,
  serverOk = null,
  serverErr = "",
  onClear,
}: {
  visible: boolean;
  onClose: () => void;
  notices: EmpNotice[];
  followShown: number;
  newVacancies?: number;
  serverOk?: boolean | null;
  serverErr?: string;
  onClear: () => void;
}) {
  const router = useRouter();
  const total = notices.length + (followShown > 0 ? 1 : 0) + (newVacancies > 0 ? 1 : 0);

  const open = (route?: string) => {
    onClose();
    if (route) {
      setTimeout(() => {
        try {
          router.push(route as any);
        } catch {
          // ignore
        }
      }, 120);
    }
  };

  const Row = ({
    tone,
    icon,
    title,
    body,
    time,
    route,
  }: {
    tone: string;
    icon: any;
    title: string;
    body?: string;
    time?: string;
    route?: string;
  }) => {
    const t = TONE[tone] || TONE.info;
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => open(route)}
        style={{
          flexDirection: "row",
          padding: 12,
          borderRadius: 14,
          backgroundColor: "#F8FAF9",
          marginBottom: 10,
          borderWidth: 1,
          borderColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: t.bg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name={icon} size={20} color={t.fg} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>{title}</Text>
          {!!body && (
            <Text style={{ fontSize: 12.5, color: "#4B5563", marginTop: 2 }}>{body}</Text>
          )}
          {!!time && (
            <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{time}</Text>
          )}
        </View>
        <MaterialIcons name="chevron-right" size={20} color="#9CA3AF" style={{ alignSelf: "center" }} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: 24,
            maxHeight: "78%",
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 42,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#D1D5DB",
              marginBottom: 12,
            }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: "800", color: "#024e32" }}>
              Notifications
            </Text>
            {total > 0 && (
              <TouchableOpacity
                onPress={onClear}
                activeOpacity={0.85}
                style={{
                  backgroundColor: "#DC2626",
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12.5 }}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {serverOk === false && (
            <View
              style={{
                backgroundColor: "#FEF3C7",
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
              }}
            >
              <Text style={{ fontSize: 12, color: "#92400E" }}>
                Notification service not reachable ({serverErr}). Showing open vacancies only.
                Update and restart the backend to get all notifications.
              </Text>
            </View>
          )}

          {total === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 36 }}>
              <MaterialIcons name="notifications-none" size={44} color="#9CA3AF" />
              <Text style={{ marginTop: 8, color: "#6B7280", fontSize: 14 }}>
                You're all caught up
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {followShown > 0 && (
                <Row
                  tone="info"
                  icon="phone-in-talk"
                  title={`${followShown} follow-up${followShown > 1 ? "s" : ""} due`}
                  body="Daily Leads follow-ups due today or overdue."
                  route="/employee/dailyDatabase"
                />
              )}
              {newVacancies > 0 && (
                <Row
                  tone="info"
                  icon="event-seat"
                  title={`${newVacancies} vacanc${newVacancies > 1 ? "ies" : "y"} available`}
                  body="Seats are open - tap to view."
                  route="/employee/vacancy"
                />
              )}
              {notices.map((n) => (
                <Row
                  key={n._id}
                  tone={String(n.tone || "info")}
                  icon={KIND_ICON[String(n.kind)] || TONE[String(n.tone)]?.icon || "notifications"}
                  title={n.title}
                  body={n.body}
                  time={ago(n.createdAt)}
                  route={n.route}
                />
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
