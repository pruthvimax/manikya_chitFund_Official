import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../../config";

/* =========================================================
   WAIVED PENALTIES  (route: /admin/penaltyWaivers)

   Audit list of every member + month where the admin switched
   the penalty OFF (or later back ON): who did it, when, and how
   much penalty the member had already paid at that moment.
   Read-only - the ON / OFF button stays in Group Members.
========================================================= */

const GREEN = "#024E32";

type Row = {
  groupId: string;
  chitId: string;
  memberId: string;
  memberName: string;
  groupMemberId: string;
  monthIndex: number;
  waivedNow: boolean;
  waivedBy: string;
  waivedAt: string | null;
  penaltyPaid: number;
  log: { action: string; by: string; at: string; penaltyPaidAtThatTime: number }[];
};

const fmt = (d: any) => {
  if (!d) return "-";
  const x = new Date(d);
  if (isNaN(x.getTime())) return "-";
  return x.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* Grey placeholder cards (same shape as a real row) while the list loads */
const CACHE_KEY = "penaltyWaiversCache";

function SkeletonRows() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const bar = (w: number | string, h: number, mt = 0) => (
    <View
      style={{
        width: w as any,
        height: h,
        marginTop: mt,
        borderRadius: 6,
        backgroundColor: "#E5E7EB",
      }}
    />
  );

  return (
    <Animated.View style={{ padding: 16, opacity: pulse }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: "white",
            borderRadius: 16,
            padding: 14,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              {bar("70%", 15)}
              {bar("90%", 11, 8)}
            </View>
            <View style={{ width: 84, height: 22, borderRadius: 999, backgroundColor: "#E5E7EB" }} />
          </View>
          {bar("55%", 11, 12)}
          {bar("80%", 10, 10)}
        </View>
      ))}
    </Animated.View>
  );
}

export default function PenaltyWaivers() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const load = useCallback(async () => {
    try {
      setError("");
      const res = await fetch(`${BACKEND_URL}/penalty-waivers`);
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Could not load the list");
      }
      setRows(Array.isArray(data.rows) ? data.rows : []);
      // keep a copy so the next visit shows the list instantly
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.rows || [])).catch(() => {});
    } catch (e: any) {
      setError(e?.message || "Could not load the list");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // show the last saved list right away (if any), then refresh from the server
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setRows((prev) => (prev.length ? prev : parsed));
            setLoading(false);
          }
        }
      } catch {
        // no cache - the skeleton shows instead
      }
    })();
    load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyActive && !r.waivedNow) return false;
      if (!q) return true;
      return (
        String(r.groupId).toLowerCase().includes(q) ||
        String(r.groupMemberId).toLowerCase().includes(q) ||
        String(r.memberId).toLowerCase().includes(q) ||
        String(r.memberName).toLowerCase().includes(q)
      );
    });
  }, [rows, query, onlyActive]);

  const totalPaidKept = shown.reduce((s, r) => s + (r.penaltyPaid || 0), 0);

  // same breakpoint the other admin pages (Groups, Enrollments ...) use for
  // their header, so this header looks identical on phone / tablet / desktop
  const { width: screenWidth } = useWindowDimensions();
  const isDesktopOrLaptop = screenWidth >= 768;

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/admin" as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7F6" }}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      <View
        style={{
          backgroundColor: GREEN,
          // same spacing as the Groups / Enrollments headers. Root is a plain
          // View (not SafeAreaView) so iPhone adds no extra top gap.
          paddingHorizontal: isDesktopOrLaptop ? 32 : 20,
          paddingTop: isDesktopOrLaptop ? 80 : 64,
          paddingBottom: isDesktopOrLaptop ? 32 : 24,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={isDesktopOrLaptop ? { padding: 8 } : { marginTop: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={isDesktopOrLaptop ? 30 : 26} color="white" />
        </TouchableOpacity>
        <View style={{ marginLeft: 16, marginTop: 4, flex: 1 }}>
          <Text style={{ color: "white", fontSize: isDesktopOrLaptop ? 30 : 24, fontWeight: "700" }}>
            Waived Penalties
          </Text>
          <Text style={{ color: "#D1FAE5", fontSize: 12, marginTop: 1 }}>
            Penalty switched OFF by admin
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search group, member ID or name"
          placeholderTextColor="#9CA3AF"
          style={{
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "#E5E7EB",
            borderRadius: 12,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: "#111827",
          }}
        />

        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {[
            { label: "Currently OFF", value: true },
            { label: "All history", value: false },
          ].map((o) => (
            <TouchableOpacity
              key={o.label}
              onPress={() => setOnlyActive(o.value)}
              activeOpacity={0.8}
              style={{
                paddingVertical: 7,
                paddingHorizontal: 14,
                borderRadius: 999,
                marginRight: 8,
                backgroundColor: onlyActive === o.value ? GREEN : "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: onlyActive === o.value ? "white" : "#374151",
                }}
              >
                {o.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 10 }}>
          {shown.length} month{shown.length === 1 ? "" : "s"} · penalty already
          paid and kept: ₹{totalPaidKept}
        </Text>
      </View>

      {loading ? (
        <SkeletonRows />
      ) : error ? (
        <View style={{ padding: 24, alignItems: "center" }}>
          <Text style={{ color: "#B91C1C", textAlign: "center" }}>{error}</Text>
          <TouchableOpacity
            onPress={() => {
              setLoading(true);
              load();
            }}
            style={{
              marginTop: 12,
              backgroundColor: GREEN,
              paddingVertical: 9,
              paddingHorizontal: 18,
              borderRadius: 999,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(r) => `${r.groupId}-${r.groupMemberId}-${r.monthIndex}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#9CA3AF", marginTop: 40 }}>
              No waived penalties
            </Text>
          }
          renderItem={({ item: r }) => (
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontWeight: "800", color: "#111827", fontSize: 15 }}>
                    {r.memberName || "Member"} · {r.groupMemberId}
                  </Text>
                  <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
                    Group {r.groupId} · Month {r.monthIndex} · ID {r.memberId}
                  </Text>
                </View>
                <View
                  style={{
                    paddingVertical: 4,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: r.waivedNow ? "#DBEAFE" : "#F3F4F6",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: r.waivedNow ? "#1D4ED8" : "#6B7280",
                    }}
                  >
                    {r.waivedNow ? "PENALTY OFF" : "BACK ON"}
                  </Text>
                </View>
              </View>

              <Text style={{ color: "#374151", fontSize: 13, marginTop: 8 }}>
                Penalty already paid (kept): ₹{r.penaltyPaid}
              </Text>
              {r.waivedNow ? (
                <Text style={{ color: "#374151", fontSize: 13, marginTop: 2 }}>
                  Switched OFF by {r.waivedBy || "Admin"} on {fmt(r.waivedAt)}
                </Text>
              ) : null}

              {r.log && r.log.length > 0 ? (
                <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 6 }}>
                  {r.log.map((l, i) => (
                    <Text key={i} style={{ color: "#6B7280", fontSize: 11, marginTop: 2 }}>
                      {l.action === "WAIVED" ? "OFF" : "ON"} · {l.by || "Admin"} ·{" "}
                      {fmt(l.at)} · paid ₹{l.penaltyPaidAtThatTime || 0}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
