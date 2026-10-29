import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BACKEND_URL from "../config";

/* =========================================================
   SHARED PIECES for the admin "More" screens (app/admin/more*.tsx).
   Nothing here is used by any older page.
========================================================= */

export const GREEN = "#024e32";
export const GREEN_DARK = "#021F15";
export const GOLD = "#D4AF37";
export const BG = "#F4F7F5";
export const INK = "#0F172A";
export const MUTED = "#64748B";
export const RED = "#DC2626";
export const AMBER = "#D97706";
export const BLUE = "#2563EB";

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const rupees = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
export const short = (n: number) => {
  const v = Math.abs(n || 0);
  if (v >= 10000000) return `₹${+(n / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${+(n / 100000).toFixed(2)} L`;
  if (v >= 1000) return `₹${+(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n || 0)}`;
};
export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const ymd = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;

export const fmtDate = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};
export const fmtDateTime = (v: any) => {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });
};

export const say = (title: string, message: string) => {
  if (Platform.OS === "web") (globalThis as any).alert?.(`${title}\n${message}`);
  else {
    const { Alert } = require("react-native");
    Alert.alert(title, message);
  }
};

/* yes / no question that also works in the browser */
export const ask = (title: string, message: string, yesLabel: string, onYes: () => void) => {
  if (Platform.OS === "web") {
    if ((globalThis as any).confirm?.(`${title}\n${message}`)) onYes();
    return;
  }
  const { Alert } = require("react-native");
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: yesLabel, onPress: onYes },
  ]);
};

export const callPhone = (phone: string) => {
  const p = String(phone || "").replace(/[^\d+]/g, "");
  if (p) Linking.openURL(`tel:${p}`).catch(() => {});
};

export const shareText = async (text: string) => {
  try {
    if (Platform.OS === "web") {
      const nav: any = (globalThis as any).navigator;
      if (nav?.share) await nav.share({ text });
      else if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(text);
        say("Copied", "The text is copied. Paste it in WhatsApp or anywhere.");
      }
      return;
    }
    await Share.share({ message: text });
  } catch {
    /* closed by the user */
  }
};

/* Turns a report's plain text into a PDF. Phone: saves a PDF and opens the share sheet. Web: opens the print dialog (Save as PDF). */
export const sharePdf = async (title: string, text: string) => {
  try {
    const esc = (t: string) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = `<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#0F172A; padding:24px;">
<div style="border-bottom:3px solid #024e32; padding-bottom:8px; margin-bottom:14px;">
<div style="font-size:12px; color:#64748B; font-weight:bold;">MANIKYA CHITS</div>
<div style="font-size:20px; font-weight:bold; color:#024e32;">${esc(title)}</div>
</div>
<div style="white-space:pre-wrap; font-size:13px; line-height:1.55;">${esc(text)}</div>
</body></html>`;
    if (Platform.OS === "web") {
      // web: open a print-ready window (same way the admin pages print); "Print > Save as PDF"
      const w = window.open("", "_blank");
      if (!w) return say("PDF not created", "Please allow pop-ups to print or save the PDF.");
      w.document.write(html.replace("</body>", `<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script></body>`));
      w.document.close();
      return;
    }
    const file = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
    else say("PDF ready", "The PDF was created but this phone cannot share files.");
  } catch (e: any) {
    say("PDF not created", e?.message || "Try again");
  }
};

/* ---------------- server calls ---------------- */
const mem: Record<string, any> = {};

export async function api(path: string, method: "GET" | "POST" | "DELETE" = "GET", body?: any) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!json) throw new Error("This feature is not on the server yet. Copy the new backend files and restart the server.");
  if (!res.ok || !json.success) throw new Error(json.message || "Something went wrong");
  return json;
}

/* GET with a saved copy: reopening shows the last result at once, then refreshes quietly */
export function useFetch<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(path && mem[path] ? mem[path] : null);
  const [loading, setLoading] = useState(!!path && !mem[path]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const reqId = useRef(0);

  const run = useCallback(
    async (manual = false) => {
      if (!path) return;
      const id = ++reqId.current;
      if (manual) setRefreshing(true);
      else if (!mem[path]) setLoading(true);
      setError("");
      try {
        const json = await api(path);
        mem[path] = json;
        if (id === reqId.current) setData(json);
      } catch (e: any) {
        if (id === reqId.current) setError(e?.message || "Could not reach the server");
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path]
  );

  useEffect(() => {
    if (!path) return;
    setData(mem[path] || null);
    run();
  }, [path, run]);

  return { data, loading, refreshing, error, reload: () => run(true), silent: () => run(false) };
}

/* ---------------- layout ---------------- */
export const cardStyle = {
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

export const DONE_BAR = "moreDoneBar";

/* iOS number pad has no Return key: this bar gives a Done button */
export function DoneBar() {
  if (Platform.OS !== "ios") return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          backgroundColor: "#F3F4F6",
          borderTopWidth: 1,
          borderTopColor: "#D1D5DB",
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ color: GREEN, fontWeight: "900", fontSize: 16 }}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

export function MoreScreen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing,
  right,
  backTo,
  top,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  right?: React.ReactNode;
  backTo?: string;
  top?: React.ReactNode; // fixed block under the header (month bar, tabs...)
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPad =
    Platform.OS === "web" ? 16 : Math.max(insets.top, Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0, 20) + 6;
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace((backTo || "/admin/more") as any);
  };
  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />
      <LinearGradient
        colors={[GREEN_DARK, "#03402A", GREEN]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: topPad, paddingBottom: 14, paddingHorizontal: 14, overflow: "hidden" }}
      >
        <View style={{ position: "absolute", right: -50, top: -40, width: 170, height: 170, borderRadius: 85, backgroundColor: "rgba(212,175,55,0.14)" }} />
        <View style={{ flexDirection: "row", alignItems: "center", width: "100%", maxWidth: 900, alignSelf: "center" }}>
          <TouchableOpacity
            onPress={goBack}
            activeOpacity={0.8}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}
          >
            <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: "#BFE3D0", fontSize: 10.5, letterSpacing: 1, fontWeight: "700" }}>ADMIN · MORE</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "900", marginTop: -1 }} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ color: "#BFE3D0", fontSize: 11.5 }} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      </LinearGradient>
      {top}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={GREEN} colors={[GREEN]} /> : undefined}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40, width: "100%", maxWidth: 900, alignSelf: "center" }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      <DoneBar />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[cardStyle, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, marginBottom: -2 }}>
      <Text style={{ fontSize: 14, fontWeight: "900", color: GREEN }}>{children}</Text>
      {right}
    </View>
  );
}

export function Stat({ label, value, color = INK, sub, flex = 1 }: { label: string; value: string; color?: string; sub?: string; flex?: number }) {
  return (
    <View style={{ flex, backgroundColor: "#FFFFFF", borderRadius: 14, padding: 11, borderWidth: 1, borderColor: "#EEF1EF" }}>
      <Text style={{ fontSize: 10.5, fontWeight: "800", color: MUTED, letterSpacing: 0.4 }} numberOfLines={1}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 18, fontWeight: "900", color, marginTop: 3 }} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={{ fontSize: 10.5, color: MUTED, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>{children}</View>;
}

export function Pill({ text, color = GREEN, solid = false }: { text: string; color?: string; solid?: boolean }) {
  return (
    <View style={{ backgroundColor: solid ? color : color + "1A", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: solid ? "#FFFFFF" : color, fontSize: 10.5, fontWeight: "900" }}>{text}</Text>
    </View>
  );
}

export function Bar({ percent, color = GREEN, height = 8 }: { percent: number; color?: string; height?: number }) {
  const p = Math.max(0, Math.min(100, percent || 0));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: "#E8EEEA", overflow: "hidden" }}>
      <View style={{ width: `${p}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Btn({
  label,
  onPress,
  icon,
  busy,
  kind = "solid",
  color = GREEN,
  disabled,
  small,
}: {
  label: string;
  onPress: () => void;
  icon?: any;
  busy?: boolean;
  kind?: "solid" | "soft" | "outline";
  color?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  const solid = kind === "solid";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={busy || disabled}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: solid ? color : kind === "soft" ? color + "18" : "#FFFFFF",
        borderWidth: kind === "outline" ? 1.5 : 0,
        borderColor: color,
        borderRadius: 12,
        paddingHorizontal: small ? 12 : 16,
        paddingVertical: small ? 8 : 12,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={solid ? "#FFFFFF" : color} />
      ) : (
        <>
          {icon ? <MaterialIcons name={icon} size={small ? 15 : 17} color={solid ? "#FFFFFF" : color} style={{ marginRight: 5 }} /> : null}
          <Text style={{ color: solid ? "#FFFFFF" : color, fontWeight: "900", fontSize: small ? 12 : 14 }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  numeric,
  multiline,
  maxLength,
  style,
}: {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
  maxLength?: number;
  style?: any;
}) {
  return (
    <View style={[{ marginTop: 10 }, style]}>
      {label ? <Text style={{ fontSize: 11, fontWeight: "800", color: MUTED, marginBottom: 4 }}>{label}</Text> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={numeric ? "numeric" : "default"}
        inputAccessoryViewID={numeric && Platform.OS === "ios" ? DONE_BAR : undefined}
        multiline={multiline}
        maxLength={maxLength}
        style={{
          backgroundColor: "#F8FAF9",
          borderWidth: 1,
          borderColor: "#DDE5E0",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: multiline ? 10 : 10,
          minHeight: multiline ? 84 : undefined,
          textAlignVertical: multiline ? "top" : "center",
          fontSize: 15,
          color: INK,
        }}
      />
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10, gap: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <TouchableOpacity
            key={o.key}
            onPress={() => onChange(o.key)}
            activeOpacity={0.85}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: on ? GREEN : "#FFFFFF",
              borderWidth: 1,
              borderColor: on ? GREEN : "#DDE5E0",
            }}
          >
            <Text style={{ color: on ? "#FFFFFF" : INK, fontWeight: "800", fontSize: 12.5 }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export function MonthBar({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const now = new Date();
  const isNow = monthKey(value) === monthKey(now);
  const step = (delta: number) => {
    const next = new Date(value.getFullYear(), value.getMonth() + delta, 1);
    if (next > now) return;
    onChange(next);
  };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#EEF1EF", paddingVertical: 6, paddingHorizontal: 6 }}>
      <TouchableOpacity onPress={() => step(-1)} style={{ padding: 8 }}>
        <MaterialIcons name="chevron-left" size={26} color={GREEN} />
      </TouchableOpacity>
      <Text style={{ fontSize: 15, fontWeight: "900", color: INK }}>
        {MONTHS[value.getMonth()]} {value.getFullYear()}
      </Text>
      <TouchableOpacity onPress={() => step(1)} disabled={isNow} style={{ padding: 8, opacity: isNow ? 0.25 : 1 }}>
        <MaterialIcons name="chevron-right" size={26} color={GREEN} />
      </TouchableOpacity>
    </View>
  );
}

/* loading / error / empty */
export function State({
  loading,
  error,
  empty,
  emptyText = "Nothing to show.",
  onRetry,
}: {
  loading?: boolean;
  error?: string;
  empty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
}) {
  if (loading)
    return (
      <View style={{ alignItems: "center", paddingVertical: 50 }}>
        <ActivityIndicator size="large" color={GREEN} />
        <Text style={{ color: MUTED, marginTop: 10, fontWeight: "700" }}>Loading…</Text>
      </View>
    );
  if (error)
    return (
      <Card style={{ alignItems: "center" }}>
        <MaterialIcons name="cloud-off" size={30} color={RED} />
        <Text style={{ color: RED, fontWeight: "800", textAlign: "center", marginTop: 6 }}>{error}</Text>
        {onRetry ? (
          <View style={{ marginTop: 10 }}>
            <Btn label="Try again" onPress={onRetry} small />
          </View>
        ) : null}
      </Card>
    );
  if (empty)
    return (
      <View style={{ alignItems: "center", paddingVertical: 36 }}>
        <MaterialIcons name="inbox" size={34} color="#B6C2BC" />
        <Text style={{ color: MUTED, marginTop: 6, fontWeight: "700", textAlign: "center" }}>{emptyText}</Text>
      </View>
    );
  return null;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (t: string) => void; placeholder: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE5E0", borderRadius: 14, paddingHorizontal: 12, marginTop: 12 }}>
      <MaterialIcons name="search" size={20} color={MUTED} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        style={{ flex: 1, paddingVertical: 11, paddingHorizontal: 8, fontSize: 15, color: INK }}
        autoCorrect={false}
      />
      {value ? (
        <TouchableOpacity onPress={() => onChange("")}>
          <MaterialIcons name="close" size={18} color={MUTED} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
