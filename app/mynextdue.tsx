import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Platform, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navPad } from "../components/memberDesign";
import { AMBER, BRAND, GroupSummary, INK, MUTED, MemberData, OKGREEN, RED, dateText, daysFromToday, inr, loadMemberData } from "../components/memberLedgers";

/* MY NEXT DUE: what to pay next, how far each chit has progressed, and the total still to pay.
   Amounts use the same rule as My Account Copy. Read only: nothing is changed or saved. */

const whenText = (days: number | null) => {
  if (days === null) return "";
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} late`;
  if (days === 0) return "due today";
  return `in ${days} day${days === 1 ? "" : "s"}`;
};
const whenColor = (days: number | null) => (days === null ? MUTED : days < 0 ? RED : days <= 3 ? AMBER : OKGREEN);

export default function MyNextDue() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (force = false) => {
    try {
      setFailed(false);
      const d = await loadMemberData(force);
      if (!d) return router.replace("/");
      setData(d);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const groups = data?.groups || [];
  const withNext = groups.filter((g) => g.next);
  // the most urgent payment: earliest due date (late ones come first)
  const first: GroupSummary | null = withNext.length
    ? [...withNext].sort((a, b) => new Date(a.next!.dueDate || 8.64e15).getTime() - new Date(b.next!.dueDate || 8.64e15).getTime())[0]
    : null;
  const grandDue = groups.reduce((s, g) => s + g.totalDue, 0);

  const openPayments = (g: GroupSummary) => router.push({ pathname: "/myoutstanding", params: { groupId: g.groupId } });

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
      <StatusBar barStyle="light-content" />
      <View style={{ backgroundColor: BRAND, paddingTop: (Platform.OS === "web" ? 14 : insets.top) + 10, paddingBottom: 18, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/menu"))} style={{ padding: 4, marginRight: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "900" }}>My Next Due</Text>
            <Text style={{ color: "#BFE3D1", fontSize: 12, marginTop: 1 }}>What to pay next and how your chits are going</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: navPad(30) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={BRAND} />}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : failed && !data ? (
          <TouchableOpacity onPress={() => { setLoading(true); load(true); }} style={{ padding: 30, alignItems: "center" }}>
            <Text style={{ color: RED, fontWeight: "800" }}>Could not load. Tap to try again.</Text>
          </TouchableOpacity>
        ) : groups.length === 0 ? (
          <Text style={{ color: MUTED, textAlign: "center", marginTop: 50 }}>You are not in any chit group yet.</Text>
        ) : (
          <>
            {/* the most urgent payment */}
            {first ? (
              <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, borderLeftWidth: 5, borderLeftColor: whenColor(daysFromToday(first.next!.dueDate)), shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: "800", color: MUTED, letterSpacing: 0.5 }}>NEXT PAYMENT</Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", marginTop: 4 }}>
                  <Text style={{ fontSize: 28, fontWeight: "900", color: INK }}>{inr(first.next!.due)}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: whenColor(daysFromToday(first.next!.dueDate)), marginLeft: 8, marginBottom: 4 }}>{whenText(daysFromToday(first.next!.dueDate))}</Text>
                </View>
                <Text style={{ color: MUTED, fontSize: 12.5, marginTop: 3 }}>
                  Group {first.groupId} · Month {first.next!.monthIndex} · due {dateText(first.next!.dueDate)}
                </Text>
                <TouchableOpacity onPress={() => openPayments(first)} style={{ alignSelf: "flex-start", marginTop: 12, backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12.5 }}>Open My Live Payments</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ backgroundColor: "#DCFCE7", borderRadius: 16, padding: 16 }}>
                <Text style={{ color: "#166534", fontWeight: "900", fontSize: 16 }}>You are all paid up</Text>
                <Text style={{ color: "#166534", marginTop: 3, fontSize: 12.5 }}>Nothing is pending in any of your groups.</Text>
              </View>
            )}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: MUTED }}>TOTAL DUE (ALL GROUPS)</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: grandDue > 0 ? RED : OKGREEN, marginTop: 2 }}>{inr(grandDue)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 12 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: MUTED }}>MY GROUPS</Text>
                <Text style={{ fontSize: 20, fontWeight: "900", color: INK, marginTop: 2 }}>{groups.length}</Text>
              </View>
            </View>
            <Text style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>Total Due is the same figure as in My Account Copy (it includes months that are not due yet).</Text>

            {/* one card per group */}
            {groups.map((g) => {
              const pct = g.totalMonths ? Math.min(100, Math.round((g.paidMonths / g.totalMonths) * 100)) : 0;
              const days = g.next ? daysFromToday(g.next.dueDate) : null;
              return (
                <View key={`${g.groupId}_${g.groupMemberId}`} style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, marginTop: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 15, fontWeight: "900", color: INK }}>Group {g.groupId}</Text>
                    <View style={{ backgroundColor: "#FFF8E1", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 }}>
                      <Text style={{ color: "#92400E", fontWeight: "800", fontSize: 11 }}>{g.paidMonths} of {g.totalMonths} months paid</Text>
                    </View>
                  </View>
                  {g.groupMemberId ? <Text style={{ color: MUTED, fontSize: 11, marginTop: 2 }}>Member {g.groupMemberId}</Text> : null}
                  <View style={{ height: 8, backgroundColor: "#E2E8F0", borderRadius: 6, marginTop: 10, overflow: "hidden" }}>
                    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: g.next && days !== null && days < 0 ? RED : BRAND }} />
                  </View>
                  <View style={{ flexDirection: "row", marginTop: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: "800", color: MUTED }}>PAID</Text>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: INK }}>{inr(g.totalPaid)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: "800", color: MUTED }}>DIVIDEND</Text>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: INK }}>{inr(g.dividend)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: "800", color: MUTED }}>TOTAL DUE</Text>
                      <Text style={{ fontSize: 14, fontWeight: "900", color: g.totalDue > 0 ? RED : OKGREEN }}>{inr(g.totalDue)}</Text>
                    </View>
                  </View>
                  {g.next ? (
                    <View style={{ marginTop: 10, backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10 }}>
                      <Text style={{ fontSize: 12.5, color: INK }}>
                        Next: <Text style={{ fontWeight: "900" }}>{inr(g.next.due)}</Text> for month {g.next.monthIndex}, due {dateText(g.next.dueDate)}{" "}
                        <Text style={{ fontWeight: "800", color: whenColor(days) }}>({whenText(days)})</Text>
                      </Text>
                      {g.next.pendingPenalty > 0 ? (
                        <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
                          {inr(g.next.pendingInstallment)} installment + {inr(g.next.pendingPenalty)} penalty
                        </Text>
                      ) : null}
                    </View>
                  ) : (
                    <Text style={{ marginTop: 10, color: OKGREEN, fontWeight: "800", fontSize: 12.5 }}>Everything is paid in this group.</Text>
                  )}
                  <View style={{ flexDirection: "row", gap: 16, marginTop: 10 }}>
                    <TouchableOpacity onPress={() => openPayments(g)}>
                      <Text style={{ color: BRAND, fontWeight: "800", fontSize: 12.5 }}>Live payments</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/myaccountcopy")}>
                      <Text style={{ color: BRAND, fontWeight: "800", fontSize: 12.5 }}>Account copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push("/myreceipts")}>
                      <Text style={{ color: BRAND, fontWeight: "800", fontSize: 12.5 }}>Receipts</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
}
