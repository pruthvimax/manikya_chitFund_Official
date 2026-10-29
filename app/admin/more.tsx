import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { GREEN, INK, MUTED, MoreScreen, SectionTitle } from "../../components/moreKit";

/* =========================================================
   MORE  (route: /admin/more)
   One card on the admin home opens this page; the 12 extra admin
   features live inside it. Every feature is read-only except the few
   that write into their own new collections (cash handover, salary
   sheet, announcements).
========================================================= */

type Item = { title: string; sub: string; icon: any; route: string; color: string };
type Section = { name: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    name: "Collections",
    items: [
      { title: "Reminder Centre", sub: "Who must pay now / soon, send reminder", icon: "alarm", route: "/admin/more-reminders", color: "#DC2626" },
      { title: "Group Health", sub: "Collection % of every group", icon: "monitor-heart", route: "/admin/more-groupHealth", color: "#059669" },
      { title: "Daily Closing Report", sub: "Today's money, leads, enrollments", icon: "receipt-long", route: "/admin/more-closing", color: "#2563EB" },
      { title: "Group Settlement", sub: "Member-wise paid, pending, penalty", icon: "balance", route: "/admin/more-settlement", color: "#7C3AED" },
      { title: "Auction Calendar", sub: "Auctions and spins by date", icon: "event", route: "/admin/more-calendar", color: "#D97706" },
    ],
  },
  {
    name: "Members & Leads",
    items: [
      { title: "Member Lookup", sub: "Search a member, full statement", icon: "person-search", route: "/admin/more-member", color: "#0891B2" },
      { title: "Reliability Score", sub: "Who pays on time, who is risky", icon: "verified-user", route: "/admin/more-reliability", color: "#16A34A" },
      { title: "New Member Funnel", sub: "Leads → interested → enrolled", icon: "filter-alt", route: "/admin/more-funnel", color: "#DB2777" },
    ],
  },
  {
    name: "Employees & Money",
    items: [
      { title: "Cash Handover", sub: "Cash held by each employee", icon: "payments", route: "/admin/more-cash", color: "#CA8A04" },
      { title: "Salary & Incentive", sub: "Monthly sheet from collections", icon: "request-quote", route: "/admin/more-salary", color: "#0D9488" },
    ],
  },
  {
    name: "Communication",
    items: [
      { title: "Announcements", sub: "Push message to all / groups", icon: "campaign", route: "/admin/more-announce", color: "#EA580C" },
      { title: "Activity Log", sub: "Everything that happened lately", icon: "history", route: "/admin/more-activity", color: "#475569" },
    ],
  },
];

export default function More() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const cols = width >= 700 ? 3 : 2;
  const gap = 10;
  const inner = Math.min(width, 900) - 28;
  const cardW = (inner - gap * (cols - 1)) / cols;

  return (
    <MoreScreen title="More" subtitle="12 extra admin tools" backTo="/admin">
      {SECTIONS.map((s) => (
        <View key={s.name}>
          <SectionTitle>{s.name}</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap, marginTop: 12 }}>
            {s.items.map((it) => (
              <TouchableOpacity
                key={it.route}
                activeOpacity={0.85}
                onPress={() => router.push(it.route as any)}
                style={{
                  width: cardW,
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
                  minHeight: 126,
                }}
              >
                <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: it.color + "1A", alignItems: "center", justifyContent: "center" }}>
                  <MaterialIcons name={it.icon} size={23} color={it.color} />
                </View>
                <Text style={{ fontSize: 14.5, fontWeight: "900", color: INK, marginTop: 10 }} numberOfLines={2}>
                  {it.title}
                </Text>
                <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }} numberOfLines={3}>
                  {it.sub}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      <Text style={{ textAlign: "center", color: GREEN, fontSize: 11, marginTop: 22, fontWeight: "700" }}>Manikya Chits · Admin tools</Text>
    </MoreScreen>
  );
}
