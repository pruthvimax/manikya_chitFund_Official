import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";
import { useLiveBadges } from "./useLiveBadges";

/* =========================================================
   ADVANCE / EXTRA AMOUNT (admin side)
   - AdvanceCard: dashboard card. Shows the advance money waiting for the
     next month and how much of it each employee still holds.
     Tap -> Advance list page (/admin/more-advance).
   The card is always shown so the page can be opened (0 until the first advance).
========================================================= */

export const ADVANCE_ROUTE = "/admin/more-advance";

type Summary = {
  held: number;
  waitingCount: number;
  members: number;
  appliedThisMonth: number;
  byEmployee: { id: string; name: string; held: number }[];
};

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;

export function useAdvanceSummary(enabled: boolean = true) {
  const [data, setData] = useState<Summary | null>(null);
  const [everAny, setEverAny] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(`${BACKEND_URL}/advance/summary`);
      if (!res.ok) return;
      const json = await res.json();
      if (!json?.success || !mounted.current) return;
      setData(json);
      if (json.waitingCount > 0 || json.appliedThisMonth > 0) setEverAny(true);
    } catch {
      // keep what we have (older server without advance -> card just stays hidden)
    }
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
  useLiveBadges(enabled, reload);

  return { data, everAny };
}

export function AdvanceCard() {
  const router = useRouter();
  const { data: live } = useAdvanceSummary(true);
  const data: Summary = live || { held: 0, waitingCount: 0, members: 0, appliedThisMonth: 0, byEmployee: [] };

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push(ADVANCE_ROUTE as any)}
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
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="savings" size={18} color="#B45309" />
          </View>
          <Text style={{ marginLeft: 10, flex: 1, fontSize: 15, fontWeight: "900", color: "#111827" }}>Advance / extra amount</Text>
          {data.waitingCount > 0 ? (
            <View style={{ backgroundColor: "#D97706", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12 }}>{data.waitingCount}</Text>
            </View>
          ) : null}
          <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
        </View>

        <View style={{ flexDirection: "row", marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: data.held > 0 ? "#B45309" : "#024e32" }}>{inr(data.held)}</Text>
            <Text style={{ fontSize: 11.5, color: "#6B7280" }}>waiting for next month</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={{ fontSize: 20, fontWeight: "900", color: "#024e32" }}>{inr(data.appliedThisMonth)}</Text>
            <Text style={{ fontSize: 11.5, color: "#6B7280" }}>added this month</Text>
          </View>
        </View>

        {data.byEmployee.length > 0 ? (
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F3" }}>
            <Text style={{ fontSize: 11.5, color: "#6B7280", marginBottom: 4 }}>Advance cash held by employees</Text>
            {data.byEmployee.slice(0, 3).map((e, i) => (
              <View key={`${e.id}_${i}`} style={{ flexDirection: "row", paddingVertical: 2 }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: "#111827" }} numberOfLines={1}>{e.name}</Text>
                <Text style={{ fontSize: 13, fontWeight: "900", color: "#B45309" }}>{inr(e.held)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}
