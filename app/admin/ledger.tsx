import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BACKEND_URL from "../../config";

/* =========================================================
   LEDGER  (route: /admin/ledger)

   Password protected (asked every time the page is opened).
   Shows, for a month: collected vs due, daily collection,
   employee ranking (from "collected by" on every payment) and the
   members who are overdue right now, each with a Call button.
   Read only. The password is checked on the server.
========================================================= */

const GREEN = "#024e32";
const GREEN_DARK = "#021F15";
const GOLD = "#D4AF37";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Summary = {
  month: string;
  due: number;
  collected: number;
  paymentCount: number;
  percent: number;
  days: { d: number; amount: number }[];
  employees: { name: string; empId: string; amount: number; count: number }[];
  defaulters: {
    count: number;
    total: number;
    items: { memberName: string; phone: string; groupId: string; groupMemberId: string; pending: number; months: number; daysLate: number }[];
  };
};

// last result per month (kept while the app is open): reopening shows it at once, then refreshes quietly
const memCache: Record<string, Summary> = {};

const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const short = (n: number) => {
  const v = Math.abs(n || 0);
  if (v >= 10000000) return `₹${+(n / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${+(n / 100000).toFixed(2)} L`;
  if (v >= 1000) return `₹${+(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n || 0)}`;
};
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const say = (title: string, message: string) => {
  if (Platform.OS === "web") (globalThis as any).alert?.(`${title}\n${message}`);
  else {
    const { Alert } = require("react-native");
    Alert.alert(title, message);
  }
};

// iOS number pad has no Return key: this bar above it gives "Done" + the action button
const PIN_BAR = "ledgerPinBar";
const PW_BAR = "ledgerPwBar";

function KeyBar({ id, actionLabel, onAction }: { id: string; actionLabel: string; onAction: () => void }) {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={id}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#F3F4F6",
          borderTopWidth: 1,
          borderTopColor: "#D1D5DB",
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: "#6B7280", fontWeight: "800", fontSize: 16 }}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: GREEN, fontWeight: "900", fontSize: 16 }}>{actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const card = {
  backgroundColor: "#FFFFFF",
  borderRadius: 18,
  padding: 14,
  marginTop: 12,
  borderWidth: 1,
  borderColor: "#EEF1EF",
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
} as const;

export default function Ledger() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const topPad =
    Platform.OS === "web" ? 16 : Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0, 20) + 6;

  const [password, setPassword] = useState(""); // what the admin typed (kept in memory only)
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState("");

  const [month, setMonth] = useState(() => new Date());
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // search inside the Overdue list (name or phone)
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);

  // month + year picker (tap the month name)
  const [pickOpen, setPickOpen] = useState(false);
  const [pickYear, setPickYear] = useState(() => new Date().getFullYear());

  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/admin" as any);
  };

  const load = useCallback(
    async (pw: string, m: Date, silent = false, fresh = false) => {
      const key = monthKey(m);
      if (memCache[key]) {
        setData(memCache[key]); // saved copy first
        silent = true;
      } else if (!silent) {
        setLoading(true);
      }
      setError("");
      try {
        const res = await fetch(`${BACKEND_URL}/ledger/summary?month=${key}${fresh ? "&fresh=1" : ""}`, {
          headers: { "x-ledger-password": pw },
        });
        const json = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setUnlocked(false);
          setGateError("Password changed. Enter it again.");
          return;
        }
        if (!res.ok || !json?.success) throw new Error(json?.message || "Could not load the ledger");
        memCache[key] = json;
        setData(json);
      } catch (e: any) {
        setError(e?.message || "Could not load the ledger");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const unlock = async () => {
    Keyboard.dismiss();
    if (!pin || gateBusy) return;
    setGateBusy(true);
    setGateError("");
    try {
      const res = await fetch(`${BACKEND_URL}/ledger/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pin }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 404 || !json) {
        // the new backend files are not on the server yet (or it was not restarted)
        setGateError("Ledger is not on the server yet. Copy the new backend files and restart the server.");
        return;
      }
      if (!res.ok || !json?.success) {
        setGateError(json?.message || "Wrong password");
        setPin("");
        return;
      }
      setPassword(pin);
      setPin("");
      setUnlocked(true);
      load(pin, month);
    } catch {
      setGateError("Could not reach the server");
    } finally {
      setGateBusy(false);
    }
  };

  const changeMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    if (next > new Date()) return;
    setMonth(next);
    load(password, next);
  };

  const openPicker = () => {
    setPickYear(month.getFullYear());
    setPickOpen(true);
  };

  const pickMonth = (mIdx: number) => {
    const next = new Date(pickYear, mIdx, 1);
    if (next > new Date()) return;
    setPickOpen(false);
    if (monthKey(next) === monthKey(month)) return;
    setMonth(next);
    load(password, next);
  };

  const savePassword = async () => {
    Keyboard.dismiss();
    setPwMsg("");
    if (!/^\d{4,8}$/.test(newPw)) return setPwMsg("New password must be 4 to 8 digits.");
    if (newPw !== newPw2) return setPwMsg("The two new passwords do not match.");
    setPwBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/ledger/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) return setPwMsg(json?.message || "Could not change the password");
      setPassword(newPw);
      setPwOpen(false);
      setOldPw("");
      setNewPw("");
      setNewPw2("");
      say("Password changed", "Use the new password next time you open the Ledger.");
    } catch {
      setPwMsg("Could not reach the server");
    } finally {
      setPwBusy(false);
    }
  };

  const isThisMonth = monthKey(month) === monthKey(new Date());
  const maxDay = Math.max(1, ...(data?.days || []).map((d) => d.amount));
  const topEmp = Math.max(1, ...(data?.employees || []).map((e) => e.amount));

  /* ---------------- shared header ---------------- */
  const Header = ({ sub }: { sub: string }) => (
    <LinearGradient
      colors={[GREEN_DARK, "#03402A", GREEN]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: topPad, paddingBottom: 14, paddingHorizontal: 14, overflow: "hidden" }}
    >
      <View
        style={{ position: "absolute", right: -50, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(212,175,55,0.14)" }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", width: "100%", maxWidth: 900, alignSelf: "center" }}>
        <TouchableOpacity
          onPress={goBack}
          activeOpacity={0.8}
          style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: "#BFE3D0", fontSize: 10.5, letterSpacing: 1, fontWeight: "700" }}>ADMIN</Text>
          <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginTop: -1 }}>Ledger</Text>
          <Text style={{ color: "#BFE3D0", fontSize: 11.5 }}>{sub}</Text>
        </View>
        {unlocked ? (
          <TouchableOpacity
            onPress={() => {
              setPwMsg("");
              setPwOpen(true);
            }}
            activeOpacity={0.85}
            style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 11, paddingHorizontal: 10, paddingVertical: 8 }}
          >
            <MaterialIcons name="vpn-key" size={15} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 11.5, marginLeft: 4 }}>Password</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </LinearGradient>
  );

  /* ---------------- LOCKED ---------------- */
  if (!unlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
        <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
        <Header sub="Password required" />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={{ ...card, width: "100%", maxWidth: 380, alignItems: "center", padding: 22 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#EAF5EF", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="lock" size={32} color={GREEN} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827", marginTop: 12 }}>Ledger is locked</Text>
            <Text style={{ fontSize: 12.5, color: "#6B7280", marginTop: 4, textAlign: "center" }}>
              Enter the ledger password to continue.
            </Text>
            <TextInput
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^\d]/g, "").slice(0, 8))}
              placeholder="• • • •"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              secureTextEntry
              autoFocus
              onSubmitEditing={unlock}
              returnKeyType="done"
              blurOnSubmit
              inputAccessoryViewID={PIN_BAR}
              style={[
                {
                  marginTop: 16,
                  width: "100%",
                  textAlign: "center",
                  fontSize: 24,
                  letterSpacing: 8,
                  fontWeight: "900",
                  color: "#111827",
                  backgroundColor: "#F8FAF9",
                  borderWidth: 1.5,
                  borderColor: gateError ? "#EF4444" : "#E5E7EB",
                  borderRadius: 14,
                  paddingVertical: 12,
                },
                { outlineStyle: "none" } as any,
              ]}
            />
            {gateError ? (
              <Text style={{ color: "#B91C1C", fontWeight: "700", fontSize: 12.5, marginTop: 8, textAlign: "center" }}>{gateError}</Text>
            ) : null}
            <TouchableOpacity
              onPress={unlock}
              disabled={!pin || gateBusy}
              activeOpacity={0.88}
              style={{ marginTop: 16, width: "100%", borderRadius: 14, paddingVertical: 14, alignItems: "center", backgroundColor: pin ? GREEN : "#9CA3AF" }}
            >
              {gateBusy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15 }}>Unlock</Text>}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
        </ScrollView>
        </KeyboardAvoidingView>
        <KeyBar id={PIN_BAR} actionLabel="Unlock" onAction={unlock} />
      </View>
    );
  }

  /* ---------------- UNLOCKED ---------------- */
  const wide = width >= 700;

  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/[^\d]/g, "");
  const allOver = data?.defaulters.items || [];
  const filteredOver = needle
    ? allOver.filter(
        (r) =>
          (r.memberName || "").toLowerCase().includes(needle) ||
          (digits.length > 0 && String(r.phone || "").replace(/[^\d]/g, "").includes(digits))
      )
    : allOver;
  const LIMIT = 30;
  const visibleOver = needle || showAll ? filteredOver : filteredOver.slice(0, LIMIT);

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
      <Header sub={`${MONTHS[month.getMonth()]} ${month.getFullYear()}`} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(password, month, true, true);
            }}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        <View style={{ width: "100%", maxWidth: 900, alignSelf: "center", paddingHorizontal: 14 }}>
          {/* month switch */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="chevron-left" size={24} color={GREEN} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openPicker}
              activeOpacity={0.8}
              style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 }}
            >
              <MaterialIcons name="event" size={17} color={GREEN} />
              <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827", marginHorizontal: 8 }}>
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={20} color={GREEN} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => changeMonth(1)}
              disabled={isThisMonth}
              style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E5E7EB", alignItems: "center", justifyContent: "center", opacity: isThisMonth ? 0.35 : 1 }}
            >
              <MaterialIcons name="chevron-right" size={24} color={GREEN} />
            </TouchableOpacity>
          </View>

          {loading && !data ? <ActivityIndicator color={GREEN} style={{ marginTop: 40 }} /> : null}
          {error ? (
            <View style={{ ...card, backgroundColor: "#FEF2F2", borderColor: "#FECACA" }}>
              <Text style={{ color: "#B91C1C", fontWeight: "700" }}>{error}</Text>
            </View>
          ) : null}

          {data ? (
            <>
              {/* ---------- collected vs due ---------- */}
              <View style={card}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: "900", color: "#111827" }}>Collected vs due</Text>
                  <View style={{ backgroundColor: data.percent >= 80 ? "#DCFCE7" : "#FEF3C7", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: data.percent >= 80 ? "#166534" : "#B45309", fontWeight: "900", fontSize: 12 }}>{data.percent}%</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", marginTop: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700" }}>COLLECTED</Text>
                    <Text style={{ fontSize: 22, fontWeight: "900", color: GREEN }} numberOfLines={1} adjustsFontSizeToFit>
                      {rupees(data.collected)}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6B7280" }}>{data.paymentCount} payments</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "700" }}>DUE THIS MONTH</Text>
                    <Text style={{ fontSize: 22, fontWeight: "900", color: "#111827" }} numberOfLines={1} adjustsFontSizeToFit>
                      {rupees(data.due)}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 9, backgroundColor: "#E5E7EB", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
                  <LinearGradient colors={["#03402A", GOLD]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${data.percent}%` as any, height: "100%" }} />
                </View>

                {/* daily bars */}
                <View style={{ flexDirection: "row", alignItems: "flex-end", height: 86, marginTop: 14 }}>
                  {data.days.map((d) => (
                    <View key={d.d} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                      <View
                        style={{
                          width: "70%",
                          height: Math.max(2, (d.amount / maxDay) * 82),
                          borderRadius: 3,
                          backgroundColor: d.amount === maxDay && d.amount > 0 ? GOLD : d.amount > 0 ? "#03402A" : "#E5E7EB",
                        }}
                      />
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                  <Text style={{ fontSize: 10, color: "#9CA3AF" }}>1</Text>
                  <Text style={{ fontSize: 10, color: "#9CA3AF" }}>Daily collection</Text>
                  <Text style={{ fontSize: 10, color: "#9CA3AF" }}>{data.days.length}</Text>
                </View>
              </View>

              <View style={{ flexDirection: wide ? "row" : "column", alignItems: "flex-start" }}>
                {/* ---------- employee ranking ---------- */}
                <View style={{ ...card, flex: 1, width: "100%", marginRight: wide ? 6 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons name="emoji-events" size={18} color={GOLD} />
                    <Text style={{ marginLeft: 6, fontSize: 15, fontWeight: "900", color: "#111827" }}>Employee ranking</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>By "collected by" on each payment</Text>
                  {data.employees.length === 0 ? (
                    <Text style={{ color: "#9CA3AF", marginTop: 14 }}>No payments in this month.</Text>
                  ) : (
                    data.employees.map((e, i) => (
                      <View key={`${e.empId}${e.name}`} style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: i === 0 ? GOLD : "#F3F4F6",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ fontWeight: "900", fontSize: 12, color: i === 0 ? GREEN_DARK : "#374151" }}>{i + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontWeight: "800", color: "#111827", fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                              {e.name}
                            </Text>
                            <Text style={{ fontWeight: "900", color: GREEN, fontSize: 12.5, marginLeft: 8 }}>{short(e.amount)}</Text>
                          </View>
                          <View style={{ height: 7, backgroundColor: "#E5E7EB", borderRadius: 999, marginTop: 4, overflow: "hidden" }}>
                            <View style={{ width: `${Math.max(3, (e.amount / topEmp) * 100)}%` as any, height: "100%", backgroundColor: i === 0 ? GOLD : "#03402A" }} />
                          </View>
                          <Text style={{ fontSize: 10.5, color: "#9CA3AF", marginTop: 2 }}>{e.count} payments{e.empId ? ` · ${e.empId}` : ""}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* ---------- defaulters ---------- */}
                <View style={{ ...card, flex: 1, width: "100%", marginLeft: wide ? 6 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons name="warning-amber" size={18} color="#DC2626" />
                    <Text style={{ marginLeft: 6, flex: 1, fontSize: 15, fontWeight: "900", color: "#111827" }}>
                      Overdue ({data.defaulters.count})
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "900", color: "#B91C1C" }}>{short(data.defaulters.total)}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Installments past the due date, as of today</Text>

                  {/* search by name or phone number */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 10,
                      backgroundColor: "#F8FAF9",
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      borderRadius: 12,
                      paddingHorizontal: 10,
                    }}
                  >
                    <MaterialIcons name="search" size={18} color="#9CA3AF" />
                    <TextInput
                      value={q}
                      onChangeText={setQ}
                      placeholder="Search by name or phone number"
                      placeholderTextColor="#9CA3AF"
                      returnKeyType="search"
                      style={[{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 13, color: "#111827" }, { outlineStyle: "none" } as any]}
                    />
                    {q ? (
                      <TouchableOpacity onPress={() => setQ("")}>
                        <MaterialIcons name="close" size={17} color="#9CA3AF" />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {needle ? (
                    <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>
                      {filteredOver.length} of {allOver.length} match
                    </Text>
                  ) : null}

                  {filteredOver.length === 0 && needle ? (
                    <Text style={{ color: "#9CA3AF", marginTop: 14 }}>Nobody matches "{q.trim()}".</Text>
                  ) : data.defaulters.items.length === 0 ? (
                    <Text style={{ color: "#16A34A", fontWeight: "800", marginTop: 14 }}>Nobody is overdue.</Text>
                  ) : (
                    visibleOver.map((r, i) => (
                      <View
                        key={`${r.groupId}${r.groupMemberId}${i}`}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "#F3F4F6", marginTop: i === 0 ? 6 : 0 }}
                      >
                        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ color: "#B91C1C", fontWeight: "900" }}>{(r.memberName || "?").charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ fontWeight: "800", color: "#111827", fontSize: 13 }} numberOfLines={1}>
                            {r.memberName}
                          </Text>
                          <Text style={{ fontSize: 11.5, color: "#B91C1C" }} numberOfLines={1}>
                            {rupees(r.pending)} · {r.daysLate} day{r.daysLate === 1 ? "" : "s"} late{r.months > 1 ? ` · ${r.months} months` : ""}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#6B7280" }} numberOfLines={1}>
                            Group {r.groupId}
                            {r.groupMemberId ? ` · No. ${r.groupMemberId}` : ""}
                          </Text>
                        </View>
                        {r.phone ? (
                          <TouchableOpacity
                            onPress={() => Linking.openURL(`tel:${String(r.phone).replace(/[^\d+]/g, "")}`).catch(() => {})}
                            activeOpacity={0.85}
                            style={{ flexDirection: "row", alignItems: "center", backgroundColor: GREEN, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}
                          >
                            <MaterialIcons name="call" size={14} color="#FFFFFF" />
                            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12, marginLeft: 4 }}>Call</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ))
                  )}
                  {!needle && !showAll && filteredOver.length > LIMIT ? (
                    <TouchableOpacity onPress={() => setShowAll(true)} style={{ alignItems: "center", paddingTop: 10 }}>
                      <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12.5 }}>
                        Show all {filteredOver.length}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}

          <View style={{ alignItems: "center", marginTop: 24 }}>
            <Text style={{ color: GREEN, fontWeight: "900", fontSize: 13 }}>MANIKYA CHITS PVT LTD</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 3 }}>Ledger · confidential</Text>
          </View>
        </View>
      </ScrollView>

      {/* ---------- pick month + year ---------- */}
      <Modal visible={pickOpen} transparent animationType="fade" onRequestClose={() => setPickOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setPickOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <TouchableWithoutFeedback>
              <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18 }}>
                <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827", textAlign: "center" }}>Select month and year</Text>

                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                  <TouchableOpacity
                    onPress={() => setPickYear((y) => y - 1)}
                    style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" }}
                  >
                    <MaterialIcons name="chevron-left" size={24} color={GREEN} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: GREEN }}>{pickYear}</Text>
                  <TouchableOpacity
                    onPress={() => setPickYear((y) => y + 1)}
                    disabled={pickYear >= new Date().getFullYear()}
                    style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", opacity: pickYear >= new Date().getFullYear() ? 0.35 : 1 }}
                  >
                    <MaterialIcons name="chevron-right" size={24} color={GREEN} />
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12, marginHorizontal: -4 }}>
                  {MONTHS.map((name, i) => {
                    const future = new Date(pickYear, i, 1) > new Date();
                    const on = pickYear === month.getFullYear() && i === month.getMonth();
                    return (
                      <View key={name} style={{ width: "33.333%", padding: 4 }}>
                        <TouchableOpacity
                          onPress={() => pickMonth(i)}
                          disabled={future}
                          activeOpacity={0.85}
                          style={{
                            paddingVertical: 12,
                            borderRadius: 12,
                            alignItems: "center",
                            backgroundColor: on ? GREEN : "#F8FAF9",
                            borderWidth: 1,
                            borderColor: on ? GREEN : "#E5E7EB",
                            opacity: future ? 0.35 : 1,
                          }}
                        >
                          <Text style={{ fontWeight: "800", fontSize: 13, color: on ? "#FFFFFF" : "#111827" }}>{name.slice(0, 3)}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>

                <TouchableOpacity
                  onPress={() => setPickOpen(false)}
                  style={{ marginTop: 12, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: "#F3F4F6" }}
                >
                  <Text style={{ color: "#374151", fontWeight: "800" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ---------- change password ---------- */}
      <Modal visible={pwOpen} transparent animationType="fade" onRequestClose={() => setPwOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: "#111827" }}>Change ledger password</Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>4 to 8 digits</Text>
            {[
              { v: oldPw, set: setOldPw, ph: "Current password" },
              { v: newPw, set: setNewPw, ph: "New password" },
              { v: newPw2, set: setNewPw2, ph: "Repeat new password" },
            ].map((f) => (
              <TextInput
                key={f.ph}
                value={f.v}
                onChangeText={(t) => f.set(t.replace(/[^\d]/g, "").slice(0, 8))}
                placeholder={f.ph}
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                secureTextEntry
                returnKeyType="done"
                inputAccessoryViewID={PW_BAR}
                style={[
                  { marginTop: 10, backgroundColor: "#F8FAF9", borderWidth: 1.5, borderColor: "#E5E7EB", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, fontSize: 15, color: "#111827" },
                  { outlineStyle: "none" } as any,
                ]}
              />
            ))}
            {pwMsg ? <Text style={{ color: "#B91C1C", fontWeight: "700", fontSize: 12.5, marginTop: 8 }}>{pwMsg}</Text> : null}
            <View style={{ flexDirection: "row", marginTop: 16 }}>
              <TouchableOpacity onPress={() => setPwOpen(false)} style={{ flex: 1, marginRight: 6, backgroundColor: "#F3F4F6", borderRadius: 14, paddingVertical: 13, alignItems: "center" }}>
                <Text style={{ color: "#374151", fontWeight: "800" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={savePassword} disabled={pwBusy} style={{ flex: 1, marginLeft: 6, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}>
                {pwBusy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
          <KeyBar id={PW_BAR} actionLabel="Save" onAction={savePassword} />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
