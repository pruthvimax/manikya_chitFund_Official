import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

/* =========================================================
   ADMIN "CHIT SCHEMES" - NEW DESIGN
   Only the LOOK lives here. app/admin/chitSchemes.tsx keeps all the
   data / add / delete logic and passes it in, so nothing about how
   schemes are loaded, added or deleted changes.
   Switch: USE_NEW_ADMIN_SCHEMES_DESIGN in components/memberDesign.ts
========================================================= */

const GREEN = "#024e32";
const GREEN_DARK = "#021F15";
const GOLD = "#D4AF37";

const num = (v: any) => {
  const n = parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
};
const rupees = (v: any) => `₹${num(v).toLocaleString("en-IN")}`;
const compact = (v: any) => {
  const n = num(v);
  if (n >= 10000000) return `${+(n / 10000000).toFixed(2)} Crore`;
  if (n >= 100000) return `${+(n / 100000).toFixed(2)} Lakh`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}K`;
  return String(n);
};

type Props = {
  schemes: any[];
  chitId: string;
  chitAmount: string;
  durationMonths: string;
  dailyAmount: string;
  weeklyAmount: string;
  monthlyAmount: string;
  setChitId: (v: string) => void;
  setChitAmount: (v: string) => void;
  setDurationMonths: (v: string) => void;
  setDailyAmount: (v: string) => void;
  setWeeklyAmount: (v: string) => void;
  setMonthlyAmount: (v: string) => void;
  message: string;
  messageType: "success" | "error";
  deleteMessage: string;
  confirmModalVisible: boolean;
  setConfirmModalVisible: (v: boolean) => void;
  deleteModalVisible: boolean;
  schemeToDelete: any;
  onSubmit: () => void;
  onAdd: () => void;
  onAskDelete: (scheme: any) => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  onBack: () => void;
};

/* ---------- card that slides in ---------- */
function Enter({ index, children, style }: { index: number; children: React.ReactNode; style?: any }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 55,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ---------- labelled input with an icon ---------- */
function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  numeric,
  hint,
  width,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  numeric?: boolean;
  hint?: string;
  width: string;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ width: width as any, paddingHorizontal: 5, marginBottom: 12 }}>
      <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#6B7280", marginBottom: 6 }}>{label}</Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: focus ? "#F0FDF4" : "#F8FAF9",
          borderWidth: 1.5,
          borderColor: focus ? GREEN : "#E5E7EB",
          borderRadius: 14,
          paddingHorizontal: 10,
        }}
      >
        <MaterialIcons name={icon} size={18} color={focus ? GREEN : "#9CA3AF"} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={numeric ? "number-pad" : "default"}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={[
            { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 14.5, color: "#111827", fontWeight: "600" },
            { outlineStyle: "none" } as any,
          ]}
        />
      </View>
      {hint ? <Text style={{ fontSize: 11, color: GREEN, marginTop: 4, fontWeight: "700" }}>{hint}</Text> : null}
    </View>
  );
}

/* ---------- little amount tile inside a scheme card ---------- */
function Tile({ icon, label, value, accent }: { icon: any; label: string; value: string; accent: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F8FAF9",
        borderRadius: 11,
        paddingVertical: 6,
        paddingHorizontal: 6,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#EEF1EF",
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 7,
          backgroundColor: accent + "22",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={icon} size={13} color={accent} />
      </View>
      <Text style={{ fontSize: 9, color: "#6B7280", fontWeight: "700", marginTop: 4, letterSpacing: 0.4 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 12.5, color: "#111827", fontWeight: "800", marginTop: 1 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

export default function AdminSchemesView(p: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // header starts under the status bar / notch on iOS and Android, tidy on web
  const topPad =
    Platform.OS === "web"
      ? 18
      : Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0, 20) + 8;
  const wide = width >= 680;
  const cols = width >= 1100 ? 3 : width >= 600 ? 2 : 1;
  const scrollY = useRef(new Animated.Value(0)).current;
  const STATS_H = 50;
  const statsHeight = scrollY.interpolate({ inputRange: [0, 70], outputRange: [STATS_H + 12, 0], extrapolate: "clamp" });
  const statsOpacity = scrollY.interpolate({ inputRange: [0, 45], outputRange: [1, 0], extrapolate: "clamp" });
  const [formOpen, setFormOpen] = useState(false);
  const [search, setSearch] = useState("");

  const stats = useMemo(() => {
    const list = p.schemes || [];
    const top = list.reduce((m, s) => Math.max(m, num(s.chitAmount)), 0);
    const avg = list.length ? Math.round(list.reduce((a, s) => a + num(s.durationMonths), 0) / list.length) : 0;
    return { count: list.length, top, avg };
  }, [p.schemes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return p.schemes || [];
    return (p.schemes || []).filter(
      (s) =>
        String(s.chitId || "").toLowerCase().includes(q) ||
        String(s.chitAmount || "").includes(q) ||
        String(s.durationMonths || "").includes(q)
    );
  }, [p.schemes, search]);

  // keep the form open when a message just came back (success closes it)
  useEffect(() => {
    if (p.message && p.messageType === "success") setFormOpen(false);
  }, [p.message, p.messageType]);

  const fieldW = wide ? "33.33%" : "50%";

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
      <StatusBar barStyle="light-content" backgroundColor="#021F15" />
        {/* ---------- HEADER (stays on top; the stat tiles fold away while scrolling) ---------- */}
        <LinearGradient
          colors={[GREEN_DARK, "#03402A", GREEN]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: topPad, paddingBottom: 16, paddingHorizontal: 14, overflow: "hidden" }}
        >
          <View
            style={{
              position: "absolute",
              right: -50,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: "rgba(212,175,55,0.14)",
            }}
          />
          <View
            style={{
              position: "absolute",
              left: -30,
              bottom: -60,
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: "rgba(255,255,255,0.06)",
            }}
          />
          <View style={{ width: "100%", maxWidth: 1200, alignSelf: "center" }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={p.onBack}
                activeOpacity={0.8}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: "rgba(255,255,255,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "900" }}>Chit Schemes</Text>
                <Text style={{ color: "#BFE3D0", fontSize: 11, marginTop: 1 }} numberOfLines={1}>
                  Create and manage chit plans
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFormOpen((v) => !v)}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: GOLD,
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  borderRadius: 11,
                }}
              >
                <MaterialIcons name={formOpen ? "close" : "add"} size={16} color={GREEN_DARK} />
                <Text style={{ color: GREEN_DARK, fontWeight: "900", marginLeft: 3, fontSize: 12 }}>
                  {formOpen ? "Close" : "New"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* stats */}
            <Animated.View style={{ height: statsHeight, opacity: statsOpacity, overflow: "hidden" }}>
            <View style={{ flexDirection: "row", marginTop: 12, height: STATS_H }}>
              {[
                { icon: "layers", label: "SCHEMES", value: String(stats.count) },
                { icon: "workspace-premium", label: "HIGHEST CHIT", value: stats.top ? compact(stats.top) : "-" },
                { icon: "schedule", label: "AVG MONTHS", value: stats.avg ? String(stats.avg) : "-" },
              ].map((t, i) => (
                <View
                  key={t.label}
                  style={{
                    flex: 1,
                    marginLeft: i === 0 ? 0 : 8,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.2)",
                    borderRadius: 12,
                    paddingVertical: 7,
                    paddingHorizontal: 10,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons name={t.icon as any} size={12} color={GOLD} />
                    <Text style={{ color: "#BFE3D0", fontSize: 9, fontWeight: "800", letterSpacing: 0.6, marginLeft: 4 }}>
                      {t.label}
                    </Text>
                  </View>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "900", marginTop: 2 }} numberOfLines={1}>
                    {t.value}
                  </Text>
                </View>
              ))}
            </View>
            </Animated.View>
          </View>
        </LinearGradient>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
      >

        <View style={{ width: "100%", maxWidth: 1200, alignSelf: "center", paddingHorizontal: 14 }}>
          {/* ---------- MESSAGES ---------- */}
          {p.message ? (
            <View
              style={{
                marginTop: 14,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: p.messageType === "success" ? "#DCFCE7" : "#FEE2E2",
                borderWidth: 1,
                borderColor: p.messageType === "success" ? "#86EFAC" : "#FCA5A5",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <MaterialIcons
                name={p.messageType === "success" ? "check-circle" : "error"}
                size={20}
                color={p.messageType === "success" ? "#15803D" : "#B91C1C"}
              />
              <Text
                style={{
                  marginLeft: 8,
                  flex: 1,
                  fontWeight: "700",
                  color: p.messageType === "success" ? "#166534" : "#991B1B",
                }}
              >
                {p.message}
              </Text>
            </View>
          ) : null}
          {p.deleteMessage ? (
            <View
              style={{
                marginTop: 12,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#DBEAFE",
                borderWidth: 1,
                borderColor: "#93C5FD",
                borderRadius: 14,
                padding: 12,
              }}
            >
              <MaterialIcons name="delete-sweep" size={20} color="#1D4ED8" />
              <Text style={{ marginLeft: 8, flex: 1, fontWeight: "700", color: "#1E3A8A" }}>{p.deleteMessage}</Text>
            </View>
          ) : null}

          {/* ---------- ADD FORM ---------- */}
          {formOpen ? (
            <Enter index={0} style={{ marginTop: 14 }}>
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 22,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: "#EEF1EF",
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 3,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: "#EAF5EF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="add-card" size={21} color={GREEN} />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: "#111827" }}>Add a new scheme</Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>All fields are required</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 }}>
                  <Field width={fieldW} label="Chit ID" icon="tag" placeholder="e.g. CH-5L" value={p.chitId} onChangeText={p.setChitId} />
                  <Field
                    width={fieldW}
                    label="Chit Amount"
                    icon="account-balance"
                    placeholder="500000"
                    numeric
                    value={p.chitAmount}
                    onChangeText={p.setChitAmount}
                    hint={num(p.chitAmount) ? `${rupees(p.chitAmount)} (${compact(p.chitAmount)})` : undefined}
                  />
                  <Field
                    width={fieldW}
                    label="Duration (Months)"
                    icon="event"
                    placeholder="20"
                    numeric
                    value={p.durationMonths}
                    onChangeText={p.setDurationMonths}
                  />
                  <Field width={fieldW} label="Daily Amount" icon="today" placeholder="0" numeric value={p.dailyAmount} onChangeText={p.setDailyAmount} />
                  <Field width={fieldW} label="Weekly Amount" icon="date-range" placeholder="0" numeric value={p.weeklyAmount} onChangeText={p.setWeeklyAmount} />
                  <Field width={fieldW} label="Monthly Amount" icon="calendar-month" placeholder="0" numeric value={p.monthlyAmount} onChangeText={p.setMonthlyAmount} />
                </View>

                <TouchableOpacity onPress={p.onSubmit} activeOpacity={0.88} style={{ marginTop: 4 }}>
                  <LinearGradient
                    colors={["#03402A", GREEN]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 15,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="check" size={20} color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15.5, marginLeft: 8 }}>
                      Add Chit Scheme
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Enter>
          ) : null}

          {/* ---------- SEARCH + COUNT ---------- */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#111827", flex: 1 }}>
              All Chit Schemes{" "}
              <Text style={{ color: GREEN }}>({filtered.length}{search ? ` of ${p.schemes.length}` : ""})</Text>
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: 8,
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E5E7EB",
              paddingHorizontal: 10,
            }}
          >
            <MaterialIcons name="search" size={20} color="#9CA3AF" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by Chit ID, amount or months"
              placeholderTextColor="#9CA3AF"
              style={[{ flex: 1, paddingVertical: 9, paddingHorizontal: 8, fontSize: 13, color: "#111827" }, { outlineStyle: "none" } as any]}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch("")}>
                <MaterialIcons name="close" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* ---------- SCHEME CARDS ---------- */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginTop: 6 }}>
            {filtered.map((s, i) => (
              <Enter key={s._id || i} index={i + 1} style={{ width: `${100 / cols}%` as any, padding: 4 }}>
                <View
                  style={{
                    backgroundColor: "#FFFFFF",
                    borderRadius: 16,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: "#EEF1EF",
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: 3,
                  }}
                >
                  {/* top band */}
                  <LinearGradient
                    colors={[GREEN_DARK, "#03402A", GREEN]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "rgba(212,175,55,0.22)",
                          borderWidth: 1,
                          borderColor: "rgba(212,175,55,0.6)",
                          borderRadius: 999,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                        }}
                      >
                        <MaterialIcons name="confirmation-number" size={11} color="#F6E7A8" />
                        <Text style={{ color: "#F6E7A8", fontWeight: "900", fontSize: 11.5, marginLeft: 4 }}>
                          {s.chitId}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }} />
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: "rgba(255,255,255,0.14)",
                          borderRadius: 999,
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                        }}
                      >
                        <MaterialIcons name="schedule" size={11} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 11, marginLeft: 3 }}>
                          {s.durationMonths} months
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: "#BFE3D0", fontSize: 9.5, fontWeight: "800", letterSpacing: 1, marginTop: 8 }}>
                      CHIT AMOUNT
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "900" }}>{rupees(s.chitAmount)}</Text>
                      <Text style={{ color: GOLD, fontSize: 11.5, fontWeight: "800", marginLeft: 7, marginBottom: 3 }}>
                        {compact(s.chitAmount)}
                      </Text>
                    </View>
                  </LinearGradient>

                  {/* tiles */}
                  <View style={{ flexDirection: "row", padding: 8 }}>
                    <Tile icon="today" label="DAILY" value={rupees(s.dailyAmount)} accent="#0EA5E9" />
                    <View style={{ width: 6 }} />
                    <Tile icon="date-range" label="WEEKLY" value={rupees(s.weeklyAmount)} accent="#8B5CF6" />
                    <View style={{ width: 6 }} />
                    <Tile icon="calendar-month" label="MONTHLY" value={rupees(s.monthlyAmount)} accent="#F59E0B" />
                  </View>

                  {/* delete */}
                  <TouchableOpacity
                    onPress={() => p.onAskDelete(s)}
                    activeOpacity={0.85}
                    style={{
                      marginHorizontal: 8,
                      marginBottom: 8,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingVertical: 7,
                      borderRadius: 11,
                      backgroundColor: "#FEF2F2",
                      borderWidth: 1,
                      borderColor: "#FECACA",
                    }}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#DC2626" />
                    <Text style={{ color: "#DC2626", fontWeight: "800", marginLeft: 5, fontSize: 12 }}>
                      Delete scheme
                    </Text>
                  </TouchableOpacity>
                </View>
              </Enter>
            ))}
          </View>

          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <View
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 37,
                  backgroundColor: "#EAF5EF",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="account-balance-wallet" size={36} color={GREEN} />
              </View>
              <Text style={{ color: "#374151", fontWeight: "800", fontSize: 15, marginTop: 12 }}>
                {search ? "No scheme matches your search" : "No chit schemes added yet"}
              </Text>
              {!search ? (
                <Text style={{ color: "#6B7280", fontSize: 12.5, marginTop: 4 }}>Tap "New" to add the first one</Text>
              ) : null}
            </View>
          ) : null}

          {/* ---------- FOOTER ---------- */}
          <View style={{ alignItems: "center", marginTop: 26 }}>
            <Text style={{ color: GREEN, fontWeight: "900", fontSize: 14 }}>MANIKYA CHITS PVT LTD</Text>
            <Text style={{ color: "#9CA3AF", fontSize: 11.5, marginTop: 4, textAlign: "center" }}>
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>
          </View>
        </View>
      </Animated.ScrollView>

      {/* ---------- CONFIRM ADD ---------- */}
      <Modal visible={p.confirmModalVisible} transparent animationType="fade" onRequestClose={() => p.setConfirmModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20 }}>
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "#EAF5EF", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="check-circle" size={38} color={GREEN} />
              </View>
              <Text style={{ fontSize: 19, fontWeight: "900", color: "#111827", marginTop: 10 }}>Confirm Addition</Text>
              <Text style={{ color: "#6B7280", fontSize: 13, marginTop: 4, textAlign: "center" }}>
                Are you sure you want to add this chit scheme?
              </Text>
            </View>
            <View style={{ backgroundColor: "#F8FAF9", borderRadius: 16, padding: 14, marginTop: 14 }}>
              {[
                ["Chit ID", p.chitId],
                ["Amount", rupees(p.chitAmount)],
                ["Duration", `${p.durationMonths} months`],
              ].map(([k, v]) => (
                <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                  <Text style={{ color: "#6B7280", fontWeight: "700" }}>{k}</Text>
                  <Text style={{ color: "#111827", fontWeight: "900" }}>{v}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => p.setConfirmModalVisible(false)}
                style={{ flex: 1, marginRight: 6, backgroundColor: "#F3F4F6", borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
              >
                <Text style={{ color: "#374151", fontWeight: "800" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={p.onAdd}
                style={{ flex: 1, marginLeft: 6, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- CONFIRM DELETE ---------- */}
      <Modal visible={p.deleteModalVisible} transparent animationType="fade" onRequestClose={p.onCancelDelete}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 20 }}>
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name="warning" size={36} color="#DC2626" />
              </View>
              <Text style={{ fontSize: 19, fontWeight: "900", color: "#111827", marginTop: 10 }}>Confirm Delete</Text>
              <Text style={{ color: "#6B7280", fontSize: 13.5, marginTop: 6, textAlign: "center", lineHeight: 20 }}>
                Are you sure you want to delete chit scheme{" "}
                <Text style={{ color: GREEN, fontWeight: "900" }}>"{p.schemeToDelete?.chitId}"</Text>? This action cannot be undone.
              </Text>
            </View>
            <View style={{ flexDirection: "row", marginTop: 18 }}>
              <TouchableOpacity
                onPress={p.onCancelDelete}
                style={{ flex: 1, marginRight: 6, backgroundColor: "#F3F4F6", borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
              >
                <Text style={{ color: "#374151", fontWeight: "800" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={p.onDelete}
                style={{ flex: 1, marginLeft: 6, backgroundColor: "#DC2626", borderRadius: 14, paddingVertical: 13, alignItems: "center" }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "900" }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
