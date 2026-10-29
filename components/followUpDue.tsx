import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";
import { daysBetween, followUpState, formatFollowUp, toDateStr, todayStr } from "./followUp";
import { useLiveBadges } from "./useLiveBadges";

/* =========================================================
   "FOLLOW-UPS DUE" card with a direct CALL button.
   Used on the employee home (that employee's leads) and on the
   admin dashboard (every employee's leads).

   Reads  GET /daily-database/follow-ups/due/:empId
          GET /daily-database/follow-ups/due-all
   Marks  PUT /daily-database/follow-ups/:id/done  (existing route)
========================================================= */

export type DueItem = {
  _id: string;
  empId: string;
  employeeName: string;
  name: string;
  phone: string;
  telephone: string;
  occupation: string;
  action: "Hot" | "Warm" | "Cold" | string;
  followUpDate: string;
  overdueDays: number;
};

/* Works even before the newest backend is deployed: builds the same list from
   the existing Daily Leads routes (entries of one employee / of every employee). */
const toItem = (e: any, today: string): DueItem => ({
  _id: String(e._id),
  empId: String(e.empId || ""),
  employeeName: String(e.employeeName || ""),
  name: String(e.name || ""),
  phone: String(e.phone || ""),
  telephone: String(e.telephone || ""),
  occupation: String(e.occupation || ""),
  action: String(e.action || "Warm"),
  followUpDate: String(e.followUpDate || ""),
  overdueDays: Math.max(0, daysBetween(String(e.followUpDate || today), today)),
});

const dueFromEntries = (entries: any[], today: string): DueItem[] =>
  entries
    .filter((e) => {
      const st = followUpState(e, today);
      return st === "today" || st === "overdue";
    })
    .map((e) => toItem(e, today))
    .sort((a, b) => (a.followUpDate < b.followUpDate ? -1 : a.followUpDate > b.followUpDate ? 1 : 0));

const fallbackEmployee = async (empId: string) => {
  const today = todayStr();
  const res = await fetch(`${BACKEND_URL}/daily-database/employee/${encodeURIComponent(empId)}`);
  const list = await res.json();
  const entries: any[] = Array.isArray(list) ? list : [];
  const items = dueFromEntries(entries, today);
  const leadsToday = entries.filter((e) => e.createdAt && toDateStr(new Date(e.createdAt)) === today).length;
  return { items, total: items.length, leadsToday };
};

const fallbackAdmin = async () => {
  const today = todayStr();
  const res = await fetch(`${BACKEND_URL}/daily-database/employees-summary`);
  const summary = await res.json();
  const emps: any[] = (Array.isArray(summary) ? summary : []).slice(0, 40);
  const all = await Promise.all(
    emps.map((e) =>
      fetch(`${BACKEND_URL}/daily-database/employee/${encodeURIComponent(e.empId)}`)
        .then((r) => r.json())
        .catch(() => [])
    )
  );
  const items = dueFromEntries(all.flat().filter(Boolean), today);
  return { items, total: items.length, leadsToday: 0 };
};

export function useDueFollowUps(scope: "employee" | "admin") {
  const [items, setItems] = useState<DueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [leadsToday, setLeadsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [empId, setEmpId] = useState("");

  const refresh = useCallback(async () => {
    try {
      let url = `${BACKEND_URL}/daily-database/follow-ups/due-all?today=${todayStr()}`;
      let emp: any = null;
      if (scope === "employee") {
        const stored = await AsyncStorage.getItem("employee");
        emp = stored ? JSON.parse(stored) : null;
        if (!emp?.emp_id) return;
        setEmpId(emp.emp_id);
        url = `${BACKEND_URL}/daily-database/follow-ups/due/${encodeURIComponent(emp.emp_id)}?today=${todayStr()}`;
      }

      let data: any = null;
      try {
        const res = await fetch(url);
        if (res.ok) data = await res.json();
      } catch {
        data = null;
      }
      // newest backend route not there yet -> build the list from the older routes
      if (!data || !Array.isArray(data.items)) {
        data = scope === "employee" ? await fallbackEmployee(emp.emp_id) : await fallbackAdmin();
      }

      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotal(Number(data?.total) || 0);
      setLeadsToday(Number(data?.leadsToday) || 0);
    } catch {
      // a nice-to-have card, never break the screen
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  useLiveBadges(true, refresh);

  const markDone = useCallback(
    async (id: string) => {
      // remove at once, put it back if the server says no
      const before = items;
      setItems((cur) => cur.filter((x) => x._id !== id));
      setTotal((t) => Math.max(0, t - 1));
      try {
        const res = await fetch(`${BACKEND_URL}/daily-database/follow-ups/${id}/done`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scope === "employee" ? { empId } : {}),
        });
        if (!res.ok) throw new Error("failed");
      } catch {
        setItems(before);
        refresh();
      }
    },
    [items, scope, empId, refresh]
  );

  return { items, total, leadsToday, loading, refresh, markDone };
}

const ACTION: Record<string, { bg: string; fg: string }> = {
  Hot: { bg: "#FEE2E2", fg: "#B91C1C" },
  Warm: { bg: "#FEF3C7", fg: "#B45309" },
  Cold: { bg: "#DBEAFE", fg: "#1D4ED8" },
};

const call = (phone: string) => {
  const clean = String(phone || "").replace(/[^\d+]/g, "");
  if (!clean) return;
  Linking.openURL(`tel:${clean}`).catch(() => {});
};

export function FollowUpDueCard({
  items,
  total,
  loading,
  onDone,
  showEmployee,
  onSeeAll,
  max = 4,
}: {
  items: DueItem[];
  total: number;
  loading: boolean;
  onDone: (id: string) => void;
  showEmployee?: boolean;
  onSeeAll?: () => void;
  max?: number;
}) {
  const shown = items.slice(0, max);

  // nothing due -> the card is not shown at all
  if (!loading && items.length === 0) return null;

  return (
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
            backgroundColor: "#FEF3C7",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialIcons name="phone-in-talk" size={18} color="#B45309" />
        </View>
        <Text style={{ marginLeft: 10, flex: 1, fontSize: 15, fontWeight: "900", color: "#111827" }}>
          Follow-ups due
        </Text>
        {total > 0 ? (
          <View style={{ backgroundColor: "#DC2626", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 12 }}>{total}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color="#024e32" style={{ marginVertical: 18 }} />
      ) : shown.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <MaterialIcons name="check-circle" size={30} color="#16A34A" />
          <Text style={{ color: "#374151", fontWeight: "800", marginTop: 6 }}>All caught up</Text>
          <Text style={{ color: "#9CA3AF", fontSize: 12, marginTop: 2 }}>No follow-ups due today</Text>
        </View>
      ) : (
        shown.map((it, i) => {
          const a = ACTION[it.action] || ACTION.Warm;
          const overdue = it.overdueDays > 0;
          return (
            <View
              key={it._id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: "#F3F4F6",
                marginTop: i === 0 ? 8 : 0,
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: a.bg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: a.fg, fontWeight: "900", fontSize: 15 }}>
                  {(it.name || "?").trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontWeight: "800", color: "#111827", fontSize: 14, flexShrink: 1 }} numberOfLines={1}>
                    {it.name}
                  </Text>
                  <View style={{ backgroundColor: a.bg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1, marginLeft: 6 }}>
                    <Text style={{ color: a.fg, fontSize: 10, fontWeight: "900" }}>{it.action}</Text>
                  </View>
                </View>
                <Text style={{ color: overdue ? "#B91C1C" : "#6B7280", fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>
                  {overdue ? `Overdue ${it.overdueDays}d · ` : "Today · "}
                  {formatFollowUp(it.followUpDate)}
                  {showEmployee && it.employeeName ? ` · ${it.employeeName}` : ""}
                </Text>
                <Text style={{ color: "#6B7280", fontSize: 11.5 }} numberOfLines={1}>
                  {it.phone}
                  {it.occupation ? ` · ${it.occupation}` : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onDone(it._id)}
                activeOpacity={0.8}
                accessibilityLabel="Mark follow-up done"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "#F3F4F6",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                }}
              >
                <MaterialIcons name="done" size={18} color="#4B5563" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => call(it.phone)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#024e32",
                  borderRadius: 999,
                  paddingHorizontal: 13,
                  paddingVertical: 8,
                }}
              >
                <MaterialIcons name="call" size={15} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12.5, marginLeft: 4 }}>Call</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}

      {onSeeAll && total > 0 ? (
        <TouchableOpacity onPress={onSeeAll} style={{ alignItems: "center", paddingTop: 8 }}>
          <Text style={{ color: "#024e32", fontWeight: "800", fontSize: 12.5 }}>
            {total > shown.length ? `See all ${total} follow-ups` : "Open Daily Leads"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/* ---------- admin dashboard section (every employee's due follow-ups) ---------- */
export function AdminFollowUpsSection() {
  const router = useRouter();
  const d = useDueFollowUps("admin");
  if (!d.loading && d.items.length === 0) return null;
  return (
    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
      <FollowUpDueCard
        items={d.items}
        total={d.total}
        loading={d.loading}
        onDone={d.markDone}
        showEmployee
        onSeeAll={() => router.push("/admin/dailyDatabaseEmployees" as any)}
      />
    </View>
  );
}
