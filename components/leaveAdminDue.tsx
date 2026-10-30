import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";
import { useLiveBadges } from "./useLiveBadges";

/* =========================================================
   NEW LEAVE REQUESTS (admin side)
   - useAdminLeaveBell(): reads the pending leave requests (existing
     GET /leave-request) and keeps the bell numbers (seen / cleared)
     the same way the other bell items work.
   - AdminLeaveRequestsSection: card on the admin dashboard, like the
     "Follow-ups due" card. Tap a request -> Leave Requests page
     (Pending tab) where it is approved / rejected.
========================================================= */

export type PendingLeave = {
  _id: string;
  emp_id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  createdAt: string;
};

const SEEN_KEY = "adminLeaveSeen";
const CLEARED_KEY = "adminLeaveCleared";
const eff = (now: number, base: number) => (now > base ? now - base : 0);

export function useAdminLeaveBell(enabled: boolean) {
  const [items, setItems] = useState<PendingLeave[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [seen, setSeen] = useState(0);
  const [cleared, setCleared] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY).then((v) => v && setSeen(Number(v) || 0)).catch(() => {});
    AsyncStorage.getItem(CLEARED_KEY).then((v) => v && setCleared(Number(v) || 0)).catch(() => {});
  }, []);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`${BACKEND_URL}/leave-request`);
      if (!res.ok) return;
      const json = await res.json();
      const list: PendingLeave[] = (Array.isArray(json) ? json : []).filter(
        (l: any) => l?.status === "Pending"
      );
      if (!mounted.current) return;
      setItems(list);
      setLoaded(true);
    } catch {
      // keep what we have
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
  useLiveBadges(enabled, reload);

  const count = items.length;

  // when requests get handled (count goes down) lower the saved levels too,
  // so the next new request is counted again
  useEffect(() => {
    if (!loaded) return;
    if (seen > count) {
      setSeen(count);
      AsyncStorage.setItem(SEEN_KEY, String(count)).catch(() => {});
    }
    if (cleared > count) {
      setCleared(count);
      AsyncStorage.setItem(CLEARED_KEY, String(count)).catch(() => {});
    }
  }, [loaded, count, seen, cleared]);

  const newest =
    items
      .map((x) => x.createdAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;

  return {
    items,
    loading,
    count,
    /** red number on the bell icon */
    badge: eff(count, Math.max(cleared, seen)),
    /** number shown on the row inside the bell sheet */
    shown: eff(count, cleared),
    time: newest as string | null,
    reload,
    markSeen: () => {
      setSeen(count);
      AsyncStorage.setItem(SEEN_KEY, String(count)).catch(() => {});
    },
    clear: () => {
      setCleared(count);
      AsyncStorage.setItem(CLEARED_KEY, String(count)).catch(() => {});
    },
  };
}

const shortDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const LEAVE_ROUTE = "/admin/leave-requests?filter=Pending";

export function AdminLeaveRequestsSection({
  items,
  loading,
  max = 3,
}: {
  items: PendingLeave[];
  loading: boolean;
  max?: number;
}) {
  const router = useRouter();
  if (!loading && items.length === 0) return null;
  const shown = items.slice(0, max);

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 18,
          padding: 14,
          borderWidth: 1,
          borderColor: "#EEF1EF",
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: "#E0F2FE",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="beach-access" size={18} color="#0369A1" />
          </View>
          <Text style={{ marginLeft: 10, flex: 1, fontSize: 15, fontWeight: "900", color: "#111827" }}>
            New leave requests
          </Text>
          {items.length > 0 ? (
            <View style={{ backgroundColor: "#DC2626", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12 }}>{items.length}</Text>
            </View>
          ) : null}
        </View>

        {loading && items.length === 0 ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator color="#024e32" />
          </View>
        ) : (
          shown.map((l) => (
            <TouchableOpacity
              key={l._id}
              activeOpacity={0.8}
              onPress={() => router.push(`${LEAVE_ROUTE}&id=${l._id}` as any)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 10,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: "#F1F5F3",
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#111827" }} numberOfLines={1}>
                  {l.employeeName || l.emp_id}
                </Text>
                <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }} numberOfLines={1}>
                  {l.leaveType} · {shortDate(l.fromDate)}
                  {shortDate(l.toDate) && shortDate(l.toDate) !== shortDate(l.fromDate)
                    ? ` – ${shortDate(l.toDate)}`
                    : ""}
                </Text>
                {!!l.reason && (
                  <Text style={{ fontSize: 11.5, color: "#9CA3AF", marginTop: 2 }} numberOfLines={1}>
                    {l.reason}
                  </Text>
                )}
              </View>
              <View
                style={{
                  backgroundColor: "#024e32",
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12 }}>Review</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {items.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push(LEAVE_ROUTE as any)}
            style={{ alignItems: "center", paddingTop: 10 }}
          >
            <Text style={{ color: "#024e32", fontWeight: "800", fontSize: 12.5 }}>
              {items.length > shown.length ? `See all ${items.length} requests` : "Open Leave Requests"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
