import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";

/* =========================================================
   MONTHLY TARGET card for the employee home.
   Reads the SAME data as My Targets (GET /target/employee/:emp_id):
     - target   = this month's entry the admin set (customerName has
                  the word "target"), its chitAmount
     - collected = sum of collectionAmount of this month's customer
                  entries (rejected ones are not counted)
   Nothing is written; it only reads.
========================================================= */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const GREEN = "#024e32";
const GOLD = "#D4AF37";

const amount = (v: any) => {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function useMonthlyTarget() {
  const [data, setData] = useState<{ target: number; collected: number; has: boolean; frozen: boolean } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      const emp = stored ? JSON.parse(stored) : null;
      if (!emp?.emp_id) return;
      const res = await fetch(`${BACKEND_URL}/target/employee/${encodeURIComponent(emp.emp_id)}`);
      if (!res.ok) return;
      const list = await res.json();
      if (!Array.isArray(list)) return;

      const now = new Date();
      const inMonth = (t: any) => {
        const d = t?.date ? new Date(t.date) : null;
        return !!d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      };
      const isTargetDoc = (t: any) => String(t?.customerName || "").toLowerCase().includes("target");

      const monthly = list.find((t) => isTargetDoc(t) && inMonth(t));
      const collected = list
        .filter((t) => !isTargetDoc(t) && inMonth(t) && t.status !== "Rejected")
        .reduce((sum, t) => sum + (Number(t.collectionAmount) || 0), 0);

      setData({
        target: monthly ? amount(monthly.chitAmount) : 0,
        collected,
        has: !!monthly,
        frozen: !!monthly?.isFrozen,
      });
    } catch {
      // a nice-to-have card, never break the screen
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { data, refresh };
}

export function MonthlyTargetCard({ data, onOpen }: { data: ReturnType<typeof useMonthlyTarget>["data"]; onOpen: () => void }) {
  const now = new Date();
  const label = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  const hasTarget = !!data?.has && (data?.target || 0) > 0;
  const pct = hasTarget ? Math.min(100, Math.round(((data?.collected || 0) / (data?.target || 1)) * 100)) : 0;

  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
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
            backgroundColor: "#EAF5EF",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="flag" size={18} color={GREEN} />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827" }}>Monthly target</Text>
          <Text style={{ fontSize: 11, color: "#6B7280" }}>
            {label} · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
          </Text>
        </View>
        {hasTarget ? (
          <Text style={{ fontSize: 15, fontWeight: "900", color: GREEN }}>{pct}%</Text>
        ) : (
          <MaterialIcons name="chevron-right" size={22} color="#9CA3AF" />
        )}
      </View>

      {hasTarget ? (
        <>
          <View style={{ height: 9, backgroundColor: "#E5E7EB", borderRadius: 999, marginTop: 12, overflow: "hidden" }}>
            <LinearGradient
              colors={["#03402A", GOLD]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ width: `${pct}%` as any, height: "100%" }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>
              Collected <Text style={{ color: "#111827", fontWeight: "900" }}>{rupees(data?.collected || 0)}</Text>
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>
              Target <Text style={{ color: "#111827", fontWeight: "900" }}>{rupees(data?.target || 0)}</Text>
            </Text>
          </View>
        </>
      ) : (
        <Text style={{ fontSize: 12.5, color: "#6B7280", marginTop: 10 }}>
          {data ? `No monthly target set for ${label} yet.` : "Loading..."}
        </Text>
      )}
    </TouchableOpacity>
  );
}
