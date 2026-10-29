import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, Text, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";
import { cacheGet, cacheSet } from "../memberCache";

/* QUICK ACTIONS (member home, new design): "Live Vacancies" in a small strip under Live Auctions.
   Every open vacancy is shown as a small card (scroll sideways); tap one, or "See all", to open the Vacancies page.
   Read only; uses the same /vacancy/open call and cache as the Vacancies page. */

const BRAND = "#024e32";
const GOLD = "#D4AF37";
// each card gets its own colour so the strip looks lively
const CARD_GRADS: [string, string][] = [
  ["#0ea5e9", "#2563eb"],
  ["#8b5cf6", "#6d28d9"],
  ["#f59e0b", "#d97706"],
  ["#f43f5e", "#be123c"],
  ["#10b981", "#047857"],
];

function PulseDot() {
  const a = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.35, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ade80", opacity: a, marginRight: 6 }} />;
}

const inr = (n: any) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const short = (n: any) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${+(v / 10000000).toFixed(2)}Cr`;
  if (v >= 100000) return `₹${+(v / 100000).toFixed(2)}L`;
  if (v >= 1000) return `₹${+(v / 1000).toFixed(1)}K`;
  return `₹${v}`;
};

export function QuickActionsSection({ wide }: { wide: string }) {
  const router = useRouter();
  const [list, setList] = useState<any[] | null>(null);
  const [seenAt, setSeenAt] = useState<number>(0); // when the Vacancies page was last opened

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const stored = await AsyncStorage.getItem("loggedUser");
          const uid = stored ? JSON.parse(stored)?.userid : "";
          // same rule as the other vacancy badges: only vacancies published after the Vacancies page was last opened are "new"
          const seenStr = await AsyncStorage.getItem("lastSeenVacancyAt");
          if (alive) setSeenAt(seenStr ? new Date(seenStr).getTime() : 0);
          // show the last known list at once, then refresh it
          const cached = uid ? cacheGet(uid, "vacancies:open") : undefined;
          if (alive && Array.isArray(cached)) setList(cached);
          const url = uid ? `${BACKEND_URL}/vacancy/open?userid=${encodeURIComponent(uid)}` : `${BACKEND_URL}/vacancy/open`;
          const res = await fetch(url);
          if (!res.ok) return;
          const data = await res.json();
          const fresh = Array.isArray(data) ? data : [];
          if (uid) cacheSet(uid, "vacancies:open", fresh);
          if (alive) setList(fresh);
        } catch {
          /* keep what is shown */
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const open = () => router.push("/vacancy");
  const count = list?.length || 0;
  const isNew = (v: any) => (v?.createdAt ? new Date(v.createdAt).getTime() : 0) > seenAt;
  const newCount = (list || []).filter(isNew).length;

  return (
    <View className={`self-center mt-7 ${wide}`}>
      {/* header: same style as "Live Auctions" */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <PulseDot />
          <MaterialIcons name="event-seat" size={18} color={BRAND} />
          <Text style={{ color: BRAND, fontWeight: "700", fontSize: 16, marginLeft: 6 }}>Live Vacancies</Text>
          {newCount > 0 ? (
            <View style={{ marginLeft: 8, height: 20, borderRadius: 10, backgroundColor: GOLD, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 }}>
              <Text style={{ color: "#1F2937", fontSize: 10.5, fontWeight: "900" }}>{newCount > 99 ? "99+" : newCount} NEW</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={open} activeOpacity={0.7}>
          <Text style={{ color: BRAND, fontSize: 12, fontWeight: "600" }}>See all →</Text>
        </TouchableOpacity>
      </View>

      {list === null ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e8f0eb", padding: 18 }}>
          <Text style={{ color: "#6b7280", fontSize: 13 }}>Checking vacancies…</Text>
        </View>
      ) : count === 0 ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e8f0eb", padding: 20, alignItems: "center" }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: "#eef5f1", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
            <MaterialIcons name="event-seat" size={21} color={BRAND} />
          </View>
          <Text style={{ color: "#4b5563", fontSize: 14, fontWeight: "500" }}>No vacancies right now</Text>
          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4, textAlign: "center" }}>New seats will show up here</Text>
        </View>
      ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
            {list.map((v: any, i: number) => {
              const seats = Number(v.availableSeats || 0);
              const grad = CARD_GRADS[i % CARD_GRADS.length];
              const hot = seats > 0 && seats <= 2;
              const fresh = isNew(v);
              return (
                <TouchableOpacity
                  key={String(v._id || i)}
                  activeOpacity={0.85}
                  onPress={open}
                  style={{ width: 158, marginRight: 12, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#e8f0eb", overflow: "hidden", shadowColor: "#0b3324", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 5 }}
                >
                  <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingHorizontal: 10, paddingVertical: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
                      <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12.5 }} numberOfLines={1}>{v.groupId}</Text>
                      {fresh ? (
                        <View style={{ marginLeft: 5, backgroundColor: GOLD, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ color: "#1F2937", fontSize: 8, fontWeight: "900" }}>NEW</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={{ backgroundColor: hot ? "#FEF08A" : "rgba(255,255,255,0.25)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                      <Text style={{ color: hot ? "#92400E" : "#FFFFFF", fontSize: 9.5, fontWeight: "900" }}>
                        {hot ? `ONLY ${seats} LEFT` : `${seats} SEAT${seats === 1 ? "" : "S"}`}
                      </Text>
                    </View>
                  </LinearGradient>
                  <View style={{ paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10 }}>
                    <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 }}>CHIT VALUE</Text>
                    <Text style={{ color: "#0f172a", fontWeight: "900", fontSize: 20, marginTop: 1 }} numberOfLines={1}>{short(v.chitAmount)}</Text>
                    <View style={{ height: 1, backgroundColor: "#E2E8F0", marginVertical: 7 }} />
                    <Text style={{ color: "#334155", fontSize: 11, fontWeight: "700" }} numberOfLines={1}>
                      {inr(v.subscriptionAmount)}
                      <Text style={{ color: "#94a3b8", fontWeight: "600" }}>{v.frequency ? ` / ${String(v.frequency).toLowerCase()}` : ""}</Text>
                    </Text>
                    {v.durationMonths ? <Text style={{ color: "#94a3b8", fontSize: 10, marginTop: 1 }} numberOfLines={1}>{v.durationMonths} months</Text> : null}
                    <View style={{ marginTop: 9, backgroundColor: BRAND, borderRadius: 999, paddingVertical: 6, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.3 }}>View vacancy</Text>
                      <MaterialIcons name="arrow-forward" size={12} color={GOLD} style={{ marginLeft: 4 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
    </View>
  );
}
