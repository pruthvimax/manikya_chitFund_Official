import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmployeeBell } from "./employeeNotices";
import { FollowUpDueCard, useDueFollowUps } from "./followUpDue";
import { MonthlyTargetCard, useMonthlyTarget } from "./monthlyTargetCard";
import { useTodayCollection } from "./useTodayCollection";

/* =========================================================
   EMPLOYEE HOME - NEW DESIGN
   Only the LOOK lives here. app/employee/index.tsx keeps the session,
   access checks, bell, push, logout and everything else, and passes
   what is needed in. Switch: USE_NEW_EMPLOYEE_HOME_DESIGN in
   components/memberDesign.ts
========================================================= */

const GREEN = "#024e32";
const GREEN_DARK = "#021F15";
const GOLD = "#D4AF37";

type Props = {
  employeeName: string;
  bellCount: number;
  onBell: () => void;
  onLogout: () => void;
  featureAccess: boolean;
  loadingAccess: boolean;
  canViewVacancy: boolean;
  showAccessDenied: () => void;
  followUpDueCount: number;
  vacancyBadge: number;
  onVacancyOpen: () => void;
  refreshing: boolean;
  onRefresh: () => void;
};

const MENU: { title: string; icon: any; route: string; bg: string; fg: string }[] = [
  { title: "Profile", icon: "person", route: "/employee/profile", bg: "#DCFCE7", fg: "#15803D" },
  { title: "Reference", icon: "handshake", route: "/employee/reference", bg: "#DBEAFE", fg: "#1D4ED8" },
  { title: "Collection", icon: "attach-money", route: "/employee/collections", bg: "#FEF3C7", fg: "#B45309" },
  { title: "Chit Schemes", icon: "account-balance-wallet", route: "/employee/chitscheme", bg: "#F3E8FF", fg: "#7E22CE" },
  { title: "Member History", icon: "people", route: "/employee/member-history", bg: "#FFE4E6", fg: "#BE123C" },
  { title: "Contact", icon: "contact-phone", route: "/employee/contact", bg: "#CCFBF1", fg: "#0F766E" },
  { title: "Payment History", icon: "history", route: "/employee/paymentHistory", bg: "#E0F2FE", fg: "#0369A1" },
  { title: "Work Tracker", icon: "assignment", route: "/employee/workTracker", bg: "#FEF9C3", fg: "#A16207" },
  { title: "Daily Leads", icon: "whatshot", route: "/employee/dailyDatabase", bg: "#FFEDD5", fg: "#C2410C" },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default function EmployeeHomeNew(p: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // status bar / notch height (iOS notch, Android status bar), a small gap on web
  const topPad =
    Platform.OS === "web"
      ? 16
      : Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0, 20) + 6;

  const due = useDueFollowUps("employee");
  const target = useMonthlyTarget();
  const today$ = useTodayCollection();

  // same rule as the old menu cards
  const blocked = (route: string) =>
    (!p.featureAccess || p.loadingAccess) &&
    (route.includes("collections") || route.includes("paymentHistory") || route.includes("member-history"));

  const go = (route: string, onOpen?: () => void) => {
    if (p.loadingAccess) return;
    if (blocked(route)) {
      p.showAccessDenied();
      return;
    }
    if (onOpen) onOpen();
    router.push(route as any);
  };

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const tiles: { icon: string; color: string; label: string; value: string }[] = [
    {
      icon: "currency-rupee",
      color: "#15803D",
      label: "TODAY'S COLLECTION",
      value: `₹${today$.amount.toLocaleString("en-IN")}`,
    },
    { icon: "check-circle", color: "#0EA5E9", label: "PAYMENTS", value: String(today$.count) },
    {
      icon: "phone-in-talk",
      color: "#F59E0B",
      label: "FOLLOW-UPS DUE",
      value: String(Math.max(p.followUpDueCount, due.total)),
    },
  ];

  const quick = [
    { icon: "payments", label: "Collect\npayment", route: "/employee/collections", colors: ["#03402A", GREEN], fg: "#FFFFFF" },
    { icon: "whatshot", label: "Add\nlead", route: "/employee/dailyDatabase", colors: ["#B8902A", GOLD], fg: GREEN_DARK },
    { icon: "assignment", label: "Work\ntracker", route: "/employee/workTracker", colors: ["#1D4ED8", "#3B82F6"], fg: "#FFFFFF" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

      {/* ---------- HEADER (compact, always visible) ---------- */}
      <LinearGradient
        colors={[GREEN_DARK, "#03402A", GREEN]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad, paddingBottom: 14, paddingHorizontal: 16, overflow: "hidden" }}
      >
        <View
          style={{
            position: "absolute",
            right: -50,
            top: -40,
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: "rgba(212,175,55,0.14)",
          }}
        />
        <View style={{ width: "100%", maxWidth: 900, alignSelf: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {/* avatar with the first letter of the name */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: GOLD,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(255,255,255,0.35)",
              }}
            >
              <Text style={{ color: GREEN_DARK, fontWeight: "900", fontSize: 19 }}>
                {(p.employeeName || "E").trim().charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ color: "#BFE3D0", fontSize: 11.5 }}>{greeting()},</Text>
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "900", marginTop: -1 }} numberOfLines={1}>
                {p.employeeName}
              </Text>
              <Text style={{ color: "#BFE3D0", fontSize: 10.5, marginTop: 1 }} numberOfLines={1}>
                {today}
              </Text>
            </View>

            <EmployeeBell count={p.bellCount} onPress={p.onBell} />
            <TouchableOpacity
              onPress={p.onLogout}
              activeOpacity={0.85}
              accessibilityLabel="Exit"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="logout" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={p.refreshing}
            onRefresh={() => {
              p.onRefresh();
              due.refresh();
              target.refresh();
              today$.refresh();
            }}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        <View style={{ width: "100%", maxWidth: 900, alignSelf: "center", paddingHorizontal: 14 }}>
          {/* ---------- today tiles ---------- */}
          <View style={{ flexDirection: "row", marginTop: 14 }}>
            {tiles.map((t, i) => (
              <View
                key={t.label}
                style={{
                  flex: 1,
                  marginLeft: i === 0 ? 0 : 8,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "#EEF1EF",
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    backgroundColor: t.color + "22",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons name={t.icon as any} size={16} color={t.color} />
                </View>
                <Text style={{ fontSize: 9, letterSpacing: 0.5, color: "#6B7280", fontWeight: "800", marginTop: 7 }}>
                  {t.label}
                </Text>
                <Text
                  style={{ fontSize: 19, color: "#111827", fontWeight: "900", marginTop: 1 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {t.value}
                </Text>
              </View>
            ))}
          </View>

          {/* ---------- monthly target ---------- */}
          <View style={{ marginTop: 12 }}>
            <MonthlyTargetCard data={target.data} onOpen={() => router.push("/employee/my-targets" as any)} />
          </View>

          {/* ---------- follow-ups due (call directly) ---------- */}
          {due.loading || due.items.length > 0 ? (
          <View style={{ marginTop: 12 }}>
            <FollowUpDueCard
              items={due.items}
              total={due.total}
              loading={due.loading}
              onDone={due.markDone}
              onSeeAll={() => go("/employee/dailyDatabase")}
            />
          </View>
          ) : null}

          {/* ---------- quick actions ---------- */}
          <Text style={{ marginTop: 16, fontSize: 15, fontWeight: "900", color: "#111827" }}>Quick actions</Text>
          <View style={{ flexDirection: "row", marginTop: 8 }}>
            {quick.map((q, i) => (
              <TouchableOpacity
                key={q.label}
                onPress={() => go(q.route)}
                activeOpacity={0.88}
                style={{ flex: 1, marginLeft: i === 0 ? 0 : 8 }}
              >
                <LinearGradient
                  colors={q.colors as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ borderRadius: 16, paddingVertical: 12, alignItems: "center" }}
                >
                  <MaterialIcons name={q.icon as any} size={22} color={q.fg} />
                  <Text style={{ color: q.fg, fontWeight: "800", fontSize: 12, textAlign: "center", marginTop: 4, lineHeight: 16 }}>
                    {q.label}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* ---------- menu ---------- */}
          <Text style={{ marginTop: 16, fontSize: 15, fontWeight: "900", color: "#111827" }}>Menu</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginTop: 6 }}>
            {[
              ...MENU,
              ...(p.canViewVacancy
                ? [{ title: "Vacancy", icon: "event-seat", route: "/employee/vacancy", bg: "#FCE7F3", fg: "#BE185D" }]
                : []),
            ].map((m) => {
              const isBlocked = blocked(m.route);
              const badge =
                m.title === "Daily Leads" ? p.followUpDueCount : m.title === "Vacancy" ? p.vacancyBadge : 0;
              return (
                <View key={m.title} style={{ width: "33.333%", padding: 4 }}>
                  <TouchableOpacity
                    onPress={() => go(m.route, m.title === "Vacancy" ? p.onVacancyOpen : undefined)}
                    activeOpacity={0.88}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 16,
                      paddingVertical: 12,
                      paddingHorizontal: 4,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#EEF1EF",
                      shadowColor: "#000",
                      shadowOpacity: 0.05,
                      shadowRadius: 6,
                      shadowOffset: { width: 0, height: 2 },
                      elevation: 2,
                      opacity: isBlocked ? 0.55 : 1,
                    }}
                  >
                    {badge > 0 ? (
                      <View
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 8,
                          minWidth: 20,
                          height: 20,
                          borderRadius: 10,
                          paddingHorizontal: 5,
                          backgroundColor: "#DC2626",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1.5,
                          borderColor: "#FFFFFF",
                          zIndex: 5,
                        }}
                      >
                        <Text style={{ color: "#FFFFFF", fontSize: 10.5, fontWeight: "900" }}>
                          {badge > 99 ? "99+" : badge}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 13,
                        backgroundColor: isBlocked ? "#F3F4F6" : m.bg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name={m.icon} size={22} color={isBlocked ? "#9CA3AF" : m.fg} />
                    </View>
                    <Text
                      style={{
                        marginTop: 7,
                        fontSize: 11.5,
                        fontWeight: "800",
                        textAlign: "center",
                        color: isBlocked ? "#9CA3AF" : "#111827",
                      }}
                      numberOfLines={2}
                    >
                      {m.title}
                    </Text>
                    {isBlocked ? (
                      <Text style={{ fontSize: 9.5, color: "#EF4444", fontWeight: "800", marginTop: 2 }}>Disabled</Text>
                    ) : null}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* ---------- footer ---------- */}
          <View style={{ alignItems: "center", marginTop: 22 }}>
            <Text style={{ color: GREEN, fontWeight: "900", fontSize: 14 }}>MANIKYA CHITS PVT LTD</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 11.5, marginTop: 3, textAlign: "center" }}>
              Employee Portal v2.0
            </Text>
            <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 2, textAlign: "center" }}>
              © {new Date().getFullYear()} All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
