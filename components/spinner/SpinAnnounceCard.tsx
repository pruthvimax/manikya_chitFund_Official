import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BACKEND_URL from "../../config";

/* =========================================================
   "SPIN STARTS AT ..." ANNOUNCEMENT  (admin spinner page)

   The admin picks the date + time the live spin will start and taps
   Send. Members of this group get a phone notification right away,
   then automatic reminders 10 min, 5 min, 2 min, 1 min and 30 sec before.
   The wording is ready-made (shown in the preview below).

   Separate from the spin itself: nothing here starts the spin or
   changes the auction.
========================================================= */

const GREEN = "#024E32";
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Identity = {
  notificationId?: string;
  groupId?: string;
  auctionEndDate?: string;
  auctionEndTime?: string;
};

type Announcement = {
  status: "active" | "cancelled" | "done";
  spinDateText: string;
  spinTimeText: string;
  spinAt: number;
  sent: { now: boolean; m10: boolean; m5?: boolean; m2?: boolean; m1: boolean; s30?: boolean };
  notifiedCount: number;
  autoSpin?: boolean;
  autoTargetId?: string;
};

type Props = {
  identity: Identity;
  adminKey: string;
  groupCode: string;
  defaultDate?: string; // DD-MM-YYYY, usually the auction end date
  targetId?: string | null; // "Members on the wheel": null = random draw
  targetLabel?: string; // text for the picked member
  onInvalidKey: () => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

type PickedDate = { d: number; m: number; y: number };
type PickedTime = { h: number; min: number; ap: "AM" | "PM" }; // h = 1..12

const parseDMY = (v?: string): PickedDate | null => {
  const [d, m, y] = String(v || "").split("-").map(Number);
  if (![d, m, y].every(Number.isInteger) || !d || !m || !y) return null;
  return { d, m, y };
};

const dateKey = (x: PickedDate) => x.y * 10000 + x.m * 100 + x.d;

const prettyDate = (x: PickedDate) => `${x.d} ${MONTHS[x.m - 1]} ${x.y}`;
const prettyTime = (x: PickedTime) => `${pad2(x.h)}:${pad2(x.min)} ${x.ap}`;

// what the server expects: DD-MM-YYYY and HH:MM (24 hour)
const toServerDate = (x: PickedDate) => `${pad2(x.d)}-${pad2(x.m)}-${x.y}`;
const toServerTime = (x: PickedTime) => {
  const h24 = x.ap === "PM" ? (x.h % 12) + 12 : x.h % 12;
  return `${pad2(h24)}:${pad2(x.min)}`;
};

const toQuery = (obj: Record<string, string | undefined>) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

const confirmDialog = (title: string, message: string, okLabel: string, ok: () => void) => {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) ok();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: okLabel, onPress: ok },
  ]);
};

/* ---------------- tap-to-choose field ---------------- */
function PickerField({
  icon,
  value,
  placeholder,
  onPress,
}: {
  icon: any;
  value: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderColor: value ? GREEN : "#D1D5DB",
        backgroundColor: value ? "#F0FDF4" : "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <MaterialIcons name={icon} size={19} color={value ? GREEN : "#6B7280"} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={{
          marginLeft: 8,
          flex: 1,
          fontSize: 14,
          fontWeight: value ? "800" : "500",
          color: value ? "#111827" : "#9CA3AF",
        }}
      >
        {value || placeholder}
      </Text>
    </TouchableOpacity>
  );
}

const sheetOverlay = {
  flex: 1,
  backgroundColor: "rgba(15, 23, 42, 0.55)",
  alignItems: "center" as const,
  justifyContent: "center" as const,
  padding: 20,
};

const sheetCard = {
  width: "100%" as const,
  maxWidth: 360,
  backgroundColor: "#FFFFFF",
  borderRadius: 24,
  padding: 18,
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 10 },
  elevation: 14,
};

/* ---------------- calendar ---------------- */
function DatePickerModal({
  visible,
  selected,
  minDate,
  onClose,
  onPick,
}: {
  visible: boolean;
  selected: PickedDate | null;
  minDate: PickedDate | null;
  onClose: () => void;
  onPick: (d: PickedDate) => void;
}) {
  const now = new Date();
  const today: PickedDate = { d: now.getDate(), m: now.getMonth() + 1, y: now.getFullYear() };
  // earliest day that can be chosen: today, or the auction end day if later
  const earliest = minDate && dateKey(minDate) > dateKey(today) ? minDate : today;

  const [view, setView] = useState({ m: earliest.m, y: earliest.y });

  useEffect(() => {
    if (visible) {
      const base = selected || earliest;
      setView({ m: base.m, y: base.y });
    }
  }, [visible]);

  const first = new Date(view.y, view.m - 1, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(view.y, view.m, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const canGoPrev = view.y * 12 + view.m > earliest.y * 12 + earliest.m;
  const go = (delta: number) => {
    const total = view.y * 12 + (view.m - 1) + delta;
    setView({ y: Math.floor(total / 12), m: (total % 12) + 1 });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={sheetOverlay} onPress={onClose}>
        <Pressable style={sheetCard} onPress={(e) => e.stopPropagation()}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <TouchableOpacity
              onPress={() => go(-1)}
              disabled={!canGoPrev}
              style={{ padding: 6, opacity: canGoPrev ? 1 : 0.25 }}
              accessibilityLabel="Previous month"
            >
              <MaterialIcons name="chevron-left" size={28} color={GREEN} />
            </TouchableOpacity>
            <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "800", color: "#111827" }}>
              {FULL_MONTHS[view.m - 1]} {view.y}
            </Text>
            <TouchableOpacity onPress={() => go(1)} style={{ padding: 6 }} accessibilityLabel="Next month">
              <MaterialIcons name="chevron-right" size={28} color={GREEN} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", marginTop: 4 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
              <Text
                key={i}
                style={{ width: "14.2857%", textAlign: "center", color: "#9CA3AF", fontSize: 12, fontWeight: "700" }}
              >
                {w}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
            {cells.map((day, i) => {
              if (day === null) return <View key={i} style={{ width: "14.2857%", height: 42 }} />;
              const value: PickedDate = { d: day, m: view.m, y: view.y };
              const disabled = dateKey(value) < dateKey(earliest);
              const isSel = selected ? dateKey(selected) === dateKey(value) : false;
              const isToday = dateKey(today) === dateKey(value);
              return (
                <View key={i} style={{ width: "14.2857%", height: 42, alignItems: "center", justifyContent: "center" }}>
                  <TouchableOpacity
                    disabled={disabled}
                    onPress={() => onPick(value)}
                    activeOpacity={0.7}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSel ? GREEN : "transparent",
                      borderWidth: isToday && !isSel ? 1.5 : 0,
                      borderColor: GREEN,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14.5,
                        fontWeight: isSel || isToday ? "800" : "600",
                        color: isSel ? "#FFFFFF" : disabled ? "#D1D5DB" : "#111827",
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <TouchableOpacity onPress={onClose} style={{ alignItems: "center", paddingTop: 12, paddingBottom: 2 }}>
            <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------------- time: hour / minute / AM-PM ---------------- */
const ITEM_H = 46;

function TimeColumn({
  title,
  items,
  selectedIndex,
  onSel,
  label,
}: {
  title: string;
  items: any[];
  selectedIndex: number;
  onSel: (x: any) => void;
  label: (x: any) => string;
}) {
  const ref = useRef<ScrollView>(null);

  // start with the chosen value in view
  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: Math.max(0, selectedIndex * ITEM_H - ITEM_H * 1.5), animated: false });
    }, 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={{ flex: 1, marginHorizontal: 4 }}>
      <Text style={{ textAlign: "center", color: "#6B7280", fontSize: 12, fontWeight: "700", marginBottom: 6 }}>
        {title}
      </Text>
      <View style={{ height: 210, backgroundColor: "#F9FAFB", borderRadius: 14 }}>
        <ScrollView
          ref={ref}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 6 }}
        >
          {items.map((x, idx) => {
            const sel = idx === selectedIndex;
            return (
              <TouchableOpacity
                key={String(x)}
                onPress={() => onSel(x)}
                activeOpacity={0.7}
                style={{
                  height: ITEM_H - 4,
                  marginVertical: 2,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: sel ? GREEN : "transparent",
                }}
              >
                <Text style={{ fontSize: 17, fontWeight: sel ? "800" : "600", color: sel ? "#FFFFFF" : "#374151" }}>
                  {label(x)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function TimePickerModal({
  visible,
  selected,
  onClose,
  onPick,
}: {
  visible: boolean;
  selected: PickedTime | null;
  onClose: () => void;
  onPick: (t: PickedTime) => void;
}) {
  const [h, setH] = useState(6);
  const [min, setMin] = useState(0);
  const [ap, setAp] = useState<"AM" | "PM">("PM");
  const [openKey, setOpenKey] = useState(0);

  useEffect(() => {
    if (visible) {
      const t = selected || { h: 6, min: 0, ap: "PM" as const };
      setH(t.h);
      setMin(t.min);
      setAp(t.ap);
      // rebuild the lists so each one opens scrolled to its chosen value
      setOpenKey((k) => k + 1);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={sheetOverlay} onPress={onClose}>
        <Pressable style={sheetCard} onPress={(e) => e.stopPropagation()}>
          <Text style={{ textAlign: "center", fontSize: 30, fontWeight: "800", color: GREEN }}>
            {pad2(h)}:{pad2(min)} {ap}
          </Text>

          <View style={{ flexDirection: "row", marginTop: 14 }}>
            <TimeColumn
              key={`h${openKey}`}
              title="Hour"
              items={HOURS}
              selectedIndex={HOURS.indexOf(h)}
              onSel={setH}
              label={(x) => pad2(x)}
            />
            <TimeColumn
              key={`m${openKey}`}
              title="Minute"
              items={MINUTES}
              selectedIndex={min}
              onSel={setMin}
              label={(x) => pad2(x)}
            />
            <TimeColumn
              key={`a${openKey}`}
              title="AM / PM"
              items={["AM", "PM"]}
              selectedIndex={ap === "AM" ? 0 : 1}
              onSel={setAp}
              label={(x) => x}
            />
          </View>

          <TouchableOpacity
            onPress={() => onPick({ h, min, ap })}
            activeOpacity={0.85}
            style={{ marginTop: 16, backgroundColor: GREEN, borderRadius: 14, paddingVertical: 14, alignItems: "center" }}
          >
            <Text style={{ color: "white", fontWeight: "800", fontSize: 15.5 }}>Set time</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ alignItems: "center", paddingTop: 12, paddingBottom: 2 }}>
            <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function SpinAnnounceCard({
  identity,
  adminKey,
  groupCode,
  defaultDate,
  targetId,
  targetLabel,
  onInvalidKey,
}: Props) {
  const [pickedDate, setPickedDate] = useState<PickedDate | null>(null);
  const [pickedTime, setPickedTime] = useState<PickedTime | null>(null);
  // the admin must choose this first: Auto spin or Manual spin
  const [spinMode, setSpinMode] = useState<"auto" | "manual" | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [current, setCurrent] = useState<Announcement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // the parent passes a new function every render; keep the latest one in a
  // ref so it does not make this card reload over and over
  const invalidKeyRef = useRef(onInvalidKey);
  invalidKeyRef.current = onInvalidKey;

  const call = useCallback(
    async (method: "GET" | "POST", path: string, body?: any) => {
      const url =
        method === "GET"
          ? `${BACKEND_URL}/spinner/${path}?${toQuery(identity)}`
          : `${BACKEND_URL}/spinner/${path}`;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-spinner-key": adminKey,
        },
        body: method === "POST" ? JSON.stringify({ ...identity, ...body }) : undefined,
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (res.status === 401) {
        invalidKeyRef.current();
        throw new Error("The admin key was not accepted.");
      }
      if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
      return json;
    },
    [identity, adminKey]
  );

  const load = useCallback(async () => {
    try {
      const json = await call("GET", "announce");
      setCurrent(json.announcement || null);
    } catch {
      // keep what is shown
    }
  }, [call]);

  useEffect(() => {
    load();
  }, [load]);

  // keep the "sent / pending" ticks fresh while reminders are still due
  useEffect(() => {
    if (!current || current.status !== "active") return;
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [current, load]);

  const canSend = Boolean(spinMode && pickedDate && pickedTime) && !busy;

  const send = async () => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      if (!spinMode || !pickedDate || !pickedTime) return;
      const json = await call("POST", "announce", {
        spinDate: toServerDate(pickedDate),
        spinTime: toServerTime(pickedTime),
        autoSpin: spinMode === "auto",
        targetGroupMemberId: spinMode === "auto" && targetId ? targetId : undefined,
      });
      setCurrent(json.announcement || null);
      setInfo(
        json.notified > 0
          ? `Notification sent to ${json.notified} phone${json.notified === 1 ? "" : "s"}.`
          : "Saved. No member phones with notifications turned on were found yet."
      );
    } catch (e: any) {
      setError(e?.message || "Could not send the notification");
    } finally {
      setBusy(false);
    }
  };

  const onSend = () => {
    if (!canSend || !pickedDate || !pickedTime) return;
    confirmDialog(
      current?.status === "active" ? "Change the spin time?" : "Notify the members?",
      `Members of Group ${groupCode || "-"} will get: "The live spin will start on ${prettyDate(
        pickedDate
      )} at ${prettyTime(pickedTime)}."\n\n${
        spinMode === "auto"
          ? `AUTO SPIN: the spin will start by itself when the time ends (5 second countdown). Winner: ${
              targetId ? `${targetLabel || targetId} (admin selected)` : "Random draw"
            }. You do not need to press Start.`
          : "MANUAL SPIN: after the time ends, it waits for you to press Start."
      }\n\nReminders go out 10 min, 5 min, 2 min, 1 min and 30 sec before.`,
      "Send",
      send
    );
  };

  const cancel = async () => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await call("POST", "announce/cancel");
      setInfo("Reminders cancelled.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Could not cancel");
    } finally {
      setBusy(false);
    }
  };

  const onCancel = () =>
    confirmDialog(
      "Cancel the reminders?",
      "No more reminders will be sent for this spin time. Notifications already sent cannot be taken back.",
      "Cancel reminders",
      cancel
    );

  const active = current?.status === "active" ? current : null;

  const Tick = ({ done, label }: { done: boolean; label: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
      <MaterialIcons
        name={done ? "check-circle" : "schedule"}
        size={16}
        color={done ? "#15803D" : "#9CA3AF"}
      />
      <Text style={{ marginLeft: 8, fontSize: 12.5, color: done ? "#166534" : "#6B7280" }}>
        {label}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "#EEF1EF",
        padding: 18,
        marginTop: 16,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 12,
            backgroundColor: "#EAF5EF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <MaterialIcons name="campaign" size={22} color={GREEN} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
            Announce spin time
          </Text>
          <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 2, lineHeight: 17 }}>
            Notify Group {groupCode || "-"} members when the live spin will start.
          </Text>
        </View>
      </View>

      {/* ---------- current status ---------- */}
      {active ? (
        <View
          style={{
            marginTop: 14,
            backgroundColor: "#F0FDF4",
            borderColor: "#BBF7D0",
            borderWidth: 1,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <Text style={{ color: "#166534", fontWeight: "800", fontSize: 14 }}>
            Spin scheduled: {active.spinDateText} at {active.spinTimeText}
          </Text>
          <Text style={{ color: "#166534", fontSize: 12.5, marginTop: 4, fontWeight: "700" }}>
            {active.autoSpin
              ? `Auto spin - starts by itself when the time ends. Winner: ${
                  active.autoTargetId ? `${active.autoTargetId} (admin selected)` : "Random draw"
                }`
              : "Manual spin - waits for you to press Start"}
          </Text>
          <Tick
            done={active.sent.now}
            label={
              active.notifiedCount > 0
                ? `Notified now (${active.notifiedCount} phone${active.notifiedCount === 1 ? "" : "s"})`
                : "Notified now"
            }
          />
          <Tick done={active.sent.m10} label="Reminder 10 minutes before" />
          <Tick done={Boolean(active.sent.m5)} label="Reminder 5 minutes before" />
          <Tick done={Boolean(active.sent.m2)} label="Reminder 2 minutes before" />
          <Tick done={active.sent.m1} label="Reminder 1 minute before" />
          <Tick done={Boolean(active.sent.s30)} label="Reminder 30 seconds before" />
        </View>
      ) : null}

      {/* ---------- Auto / Manual spin (choose this first) ---------- */}
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 14, marginBottom: 6 }}>
        1. Choose how the spin starts
      </Text>
      <View style={{ flexDirection: "row", backgroundColor: "#F3F4F6", borderRadius: 14, padding: 4 }}>
        {(
          [
            { key: "auto", label: "Auto spin", icon: "bolt" },
            { key: "manual", label: "Manual spin", icon: "touch-app" },
          ] as const
        ).map((opt) => {
          const on = spinMode === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSpinMode(opt.key)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 11,
                borderRadius: 11,
                backgroundColor: on ? GREEN : "transparent",
              }}
            >
              <MaterialIcons name={opt.icon} size={18} color={on ? "#FFFFFF" : "#6B7280"} />
              <Text
                style={{
                  marginLeft: 6,
                  fontWeight: "800",
                  fontSize: 13.5,
                  color: on ? "#FFFFFF" : "#374151",
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={{ color: "#6B7280", fontSize: 11.5, marginTop: 6, lineHeight: 16 }}>
        {spinMode === "auto"
          ? `The spin starts by itself when the time ends, with a 5 second countdown. Winner: ${
              targetId ? `${targetLabel || targetId} (admin selected)` : "Random draw"
            } - change it in "Members on the wheel" above. The Spin settings below are not used.`
          : spinMode === "manual"
          ? "After the time ends it waits for you. Press Start in the Spin settings below."
          : "Select Auto spin or Manual spin first, then set the date and time."}
      </Text>

      {/* ---------- date + time (tap to choose) ---------- */}
      <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 14 }}>2. Set the date and time</Text>
      <View
        pointerEvents={spinMode ? "auto" : "none"}
        style={{ flexDirection: "row", marginTop: 6, opacity: spinMode ? 1 : 0.45 }}
      >
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 6 }}>Spin date</Text>
          <PickerField
            icon="event"
            value={pickedDate ? prettyDate(pickedDate) : ""}
            placeholder="Select date"
            onPress={() => setDateOpen(true)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 6 }}>Spin time</Text>
          <PickerField
            icon="schedule"
            value={pickedTime ? prettyTime(pickedTime) : ""}
            placeholder="Select time"
            onPress={() => setTimeOpen(true)}
          />
        </View>
      </View>

      {/* ---------- ready-made message preview ---------- */}
      <View
        style={{
          marginTop: 14,
          backgroundColor: "#F3F4F6",
          borderRadius: 14,
          padding: 12,
        }}
      >
        <Text style={{ color: "#6B7280", fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>
          MESSAGE MEMBERS WILL GET
        </Text>
        <Text style={{ color: "#111827", fontWeight: "800", marginTop: 6, fontSize: 14 }}>
          Group {groupCode || "-"} - live spin scheduled
        </Text>
        <Text style={{ color: "#374151", marginTop: 2, fontSize: 13, lineHeight: 18 }}>
          The live spin will start on {pickedDate ? prettyDate(pickedDate) : "DD Mon YYYY"} at{" "}
          {pickedTime ? prettyTime(pickedTime) : "HH:MM AM/PM"}. Be ready!
        </Text>
        <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 12, lineHeight: 17 }}>
          Then automatic reminders at 10 min, 5 min, 2 min, 1 min and 30 sec before the spin.
        </Text>
        {spinMode === "auto" ? (
          <Text style={{ color: "#166534", marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: "700" }}>
            Members also see: the spin starts automatically when the time ends, with a 5 second countdown.
          </Text>
        ) : null}
      </View>

      {/* the winner choice made in "Members on the wheel" (kept in view here so it is never forgotten) */}
      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: targetId ? "#FFFBEB" : "#F3F4F6",
          borderRadius: 12,
          padding: 10,
        }}
      >
        <MaterialIcons name={targetId ? "person-pin" : "shuffle"} size={18} color="#374151" />
        <Text style={{ marginLeft: 8, flex: 1, fontSize: 12.5, color: "#374151", lineHeight: 17 }}>
          Winner for the spin:{" "}
          <Text style={{ fontWeight: "800" }}>
            {targetId ? `${targetLabel || targetId} (admin selected)` : "Random draw"}
          </Text>
          {" "}- change it in "Members on the wheel" above.
        </Text>
      </View>

      {error ? (
        <Text style={{ color: "#B91C1C", marginTop: 10, fontWeight: "600" }}>{error}</Text>
      ) : null}
      {info ? (
        <Text style={{ color: "#15803D", marginTop: 10, fontWeight: "600" }}>{info}</Text>
      ) : null}

      <TouchableOpacity
        onPress={onSend}
        disabled={!canSend}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
        style={{
          marginTop: 14,
          borderRadius: 16,
          paddingVertical: 15,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          backgroundColor: canSend ? GREEN : "#9CA3AF",
        }}
      >
        {busy ? (
          <ActivityIndicator color="white" />
        ) : (
          <MaterialIcons name="notifications-active" size={20} color="white" />
        )}
        <Text style={{ color: "white", fontSize: 15.5, fontWeight: "800", marginLeft: 8 }}>
          {active ? "Update time & notify again" : "Send notification"}
        </Text>
      </TouchableOpacity>

      {active ? (
        <TouchableOpacity
          onPress={onCancel}
          disabled={busy}
          activeOpacity={0.7}
          style={{ marginTop: 10, alignItems: "center", paddingVertical: 8 }}
        >
          <Text style={{ color: "#B91C1C", fontWeight: "700", fontSize: 13.5 }}>
            Cancel reminders
          </Text>
        </TouchableOpacity>
      ) : null}

      <DatePickerModal
        visible={dateOpen}
        selected={pickedDate}
        minDate={parseDMY(defaultDate)}
        onClose={() => setDateOpen(false)}
        onPick={(d) => {
          setPickedDate(d);
          setDateOpen(false);
        }}
      />
      <TimePickerModal
        visible={timeOpen}
        selected={pickedTime}
        onClose={() => setTimeOpen(false)}
        onPick={(t) => {
          setPickedTime(t);
          setTimeOpen(false);
        }}
      />
    </View>
  );
}
