import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

/* =========================================================
   FOLLOW-UP DATE helpers + small UI pieces, shared by
   app/employee/dailyDatabase.tsx and app/admin/dailyDatabaseDetail.tsx

   A follow-up date is stored as a plain "YYYY-MM-DD" string
   (date only), so there is never a time-zone shift.
========================================================= */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function parseDateStr(s?: string): Date {
  if (!s || !DATE_RE.test(s)) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* "2026-11-05" -> "05 Nov 2026" */
export function formatFollowUp(s?: string): string {
  if (!s || !DATE_RE.test(s)) return "";
  const [y, m, d] = s.split("-").map(Number);
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`;
}

export type FollowUpState = "none" | "done" | "overdue" | "today" | "upcoming";

export function followUpState(entry: any, today: string = todayStr()): FollowUpState {
  const d = entry?.followUpDate;
  if (!d) return "none";
  if (entry.followUpDone) return "done";
  if (d < today) return "overdue";
  if (d === today) return "today";
  return "upcoming";
}

/* whole days between two YYYY-MM-DD strings (b - a) */
export function daysBetween(a: string, b: string): number {
  const ms = parseDateStr(b).getTime() - parseDateStr(a).getTime();
  return Math.round(ms / 86400000);
}

/* ================= CHIP (shows the follow-up status) ================= */
export function FollowUpChip({ entry }: { entry: any }) {
  const today = todayStr();
  const state = followUpState(entry, today);
  if (state === "none") return null;

  const cfg = {
    done: { bg: "#dcfce7", fg: "#166534", icon: "check-circle", text: `Follow-up done · ${formatFollowUp(entry.followUpDate)}` },
    overdue: {
      bg: "#fee2e2",
      fg: "#b91c1c",
      icon: "warning",
      text: `Follow-up overdue (${daysBetween(entry.followUpDate, today)}d) · ${formatFollowUp(entry.followUpDate)}`,
    },
    today: { bg: "#ffedd5", fg: "#c2410c", icon: "notifications-active", text: "Follow up TODAY" },
    upcoming: { bg: "#dbeafe", fg: "#1d4ed8", icon: "event", text: `Follow-up · ${formatFollowUp(entry.followUpDate)}` },
  }[state];

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: cfg.bg,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <MaterialIcons name={cfg.icon as any} size={13} color={cfg.fg} />
      <Text style={{ color: cfg.fg, fontSize: 11, fontWeight: "700", marginLeft: 4 }}>
        {cfg.text}
      </Text>
    </View>
  );
}

/* ================= DATE FIELD (tap to pick a date, optional) ================= */
export function FollowUpDateField({
  label,
  value,
  onChange,
  minToday,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** employee form: do not allow a date before today */
  minToday?: boolean;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date>(new Date());

  const minimumDate = minToday
    ? (() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
      })()
    : undefined;

  const open = () => {
    let start = value ? parseDateStr(value) : new Date();
    if (minimumDate && start < minimumDate) start = minimumDate;
    setTemp(start);
    setShow(true);
  };

  const handleChange = (event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShow(false);
      if (event?.type === "set" && date) onChange(toDateStr(date));
      return;
    }
    if (date) setTemp(date);
  };

  return (
    <View className="mb-4">
      <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">{label}</Text>

      {Platform.OS === "web" ? (
        /* Desktop / browser: the browser's own calendar popup
           (<input type="date">), opens on click anywhere in the field. */
        <View className="flex-row items-center border border-gray-300 bg-white rounded-xl px-3">
          <MaterialIcons name="event" size={20} color="#6b7280" />
          {React.createElement("input", {
            type: "date",
            value: value || "",
            min: minToday ? todayStr() : undefined,
            onChange: (e: any) => {
              const v = String(e?.target?.value || "");
              if (v && minToday && v < todayStr()) return; // no past dates
              onChange(v);
            },
            onClick: (e: any) => {
              try {
                e?.currentTarget?.showPicker?.();
              } catch {
                // some browsers only open it from the small calendar icon
              }
            },
            style: {
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 16,
              padding: "12px 8px",
              marginLeft: 4,
              color: value ? "#111827" : "#9ca3af",
              fontFamily: "inherit",
              cursor: "pointer",
              minWidth: 0,
            },
          })}
          {!!value && (
            <TouchableOpacity onPress={() => onChange("")} hitSlop={10}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <TouchableOpacity
          onPress={open}
          activeOpacity={0.8}
          className="flex-row items-center border border-gray-300 bg-white rounded-xl px-3 py-3"
        >
          <MaterialIcons name="event" size={20} color="#6b7280" />
          <Text
            className={`flex-1 text-base ml-2 ${value ? "text-gray-900" : "text-gray-400"}`}
          >
            {value ? formatFollowUp(value) : "Select follow-up date"}
          </Text>
          {!!value && (
            <TouchableOpacity onPress={() => onChange("")} hitSlop={10}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}

      {!!hint && <Text className="text-gray-400 text-[11px] mt-1 ml-1">{hint}</Text>}

      {show && Platform.OS === "android" && (
        <DateTimePicker
          value={temp}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          onChange={handleChange}
        />
      )}

      {show && Platform.OS === "ios" && (
        <View className="bg-white rounded-xl border border-gray-200 p-2 mt-2">
          <DateTimePicker
            value={temp}
            mode="date"
            display="spinner"
            themeVariant="light"
            textColor="#111827"
            minimumDate={minimumDate}
            onChange={handleChange}
          />
          <TouchableOpacity
            onPress={() => {
              onChange(toDateStr(temp));
              setShow(false);
            }}
            className="bg-[#024e32] py-2 rounded-lg mt-2"
          >
            <Text className="text-white text-center font-semibold">Done</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShow(false)} className="py-2 mt-1">
            <Text className="text-gray-500 text-center">Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
