import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";

/* =========================================================
   LEAVE INSIGHTS (admin)
   Everything here is worked out from the leave requests the page
   already loads (employee, type, dates, status) - nothing new is
   needed from the server.
   - LeaveChips        : small chips on every request card
                         (clash warning + days already taken this month)
   - LeaveOverviewModal: opened by the calendar button in the page header
                         (tiles, "who is off this week", month calendar,
                          day details, busy-day warning)
========================================================= */

export type LeaveLike = {
  _id: string;
  emp_id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
};

const GREEN = "#024e32";
const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayStart = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtShort = (d: Date) => `${pad(d.getDate())} ${SHORT[d.getMonth()]}`;

/** every calendar day (as a Date) of one request, capped for safety */
const daysOf = (l: LeaveLike): Date[] => {
  const out: Date[] = [];
  const a = dayStart(l.fromDate);
  const b = dayStart(l.toDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return out;
  for (let d = new Date(a), i = 0; d <= b && i < 366; d.setDate(d.getDate() + 1), i++) {
    out.push(new Date(d));
  }
  return out;
};

const counts = (l: LeaveLike) => l.status !== "Rejected";

/** requests (pending or approved) that cover one day */
const offOnDay = (all: LeaveLike[], key: string) =>
  all.filter((l) => counts(l) && daysOf(l).some((d) => keyOf(d) === key));

const uniqueEmployees = (list: LeaveLike[]) => {
  const seen = new Set<string>();
  return list.filter((l) => (seen.has(l.emp_id) ? false : (seen.add(l.emp_id), true)));
};

const nameOf = (l: LeaveLike) => (l.employeeName || l.emp_id || "").trim();

/* ---------------- chips on every request ---------------- */
export function LeaveChips({ leave, all }: { leave: LeaveLike; all: LeaveLike[] }) {
  const info = useMemo(() => {
    const mine = daysOf(leave);
    // other people off on any of these dates
    const clashDays: Record<string, Set<string>> = {};
    all.forEach((o) => {
      if (o._id === leave._id || o.emp_id === leave.emp_id || !counts(o)) return;
      const od = new Set(daysOf(o).map(keyOf));
      mine.forEach((d) => {
        const k = keyOf(d);
        if (od.has(k)) (clashDays[k] = clashDays[k] || new Set()).add(o.emp_id);
      });
    });
    let worstKey = "";
    let worst = 0;
    Object.keys(clashDays).forEach((k) => {
      if (clashDays[k].size > worst) {
        worst = clashDays[k].size;
        worstKey = k;
      }
    });
    // days this employee already took (approved) in the month the request starts
    const from = dayStart(leave.fromDate);
    const m = from.getMonth();
    const y = from.getFullYear();
    let taken = 0;
    all.forEach((o) => {
      if (o._id === leave._id || o.emp_id !== leave.emp_id || o.status !== "Approved") return;
      daysOf(o).forEach((d) => {
        if (d.getMonth() === m && d.getFullYear() === y) taken++;
      });
    });
    return { worst, worstKey, taken, mine: mine.length };
  }, [leave, all]);

  if (leave.status === "Rejected") return null;
  const chip = (bg: string, fg: string, icon: string, text: string, k: string) => (
    <View
      key={k}
      style={{ flexDirection: "row", alignItems: "center", backgroundColor: bg, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginRight: 6, marginTop: 6 }}
    >
      <MaterialIcons name={icon as any} size={12} color={fg} />
      <Text style={{ color: fg, fontSize: 11, fontWeight: "700", marginLeft: 4 }}>{text}</Text>
    </View>
  );
  const dateTxt = info.worstKey ? fmtShort(dayStart(info.worstKey + "T12:00:00")) : "";
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {info.worst > 0
        ? chip("#FEF3C7", "#92400E", "warning", `${info.worst} other${info.worst > 1 ? "s" : ""} off on ${dateTxt}`, "c")
        : chip("#DCFCE7", "#166534", "check-circle", "Nobody else off", "c")}
      {chip("#DBEAFE", "#1E40AF", "event-available", `${info.taken} day${info.taken === 1 ? "" : "s"} taken this month`, "t")}
    </View>
  );
}

/* ---------------- overview (tiles + week + calendar) ---------------- */
const AVATARS = ["#2563EB", "#9333EA", "#F59E0B", "#10B981", "#EF4444", "#0EA5E9", "#DB2777"];
const colorFor = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATARS[h % AVATARS.length];
};

const levelStyle = (n: number) =>
  n >= 3
    ? { bg: "#FEE2E2", fg: "#991B1B" }
    : n === 2
    ? { bg: "#FEF3C7", fg: "#92400E" }
    : n === 1
    ? { bg: "#DCFCE7", fg: "#166534" }
    : { bg: "transparent", fg: "#374151" };

export function LeaveOverviewModal({
  visible,
  onClose,
  leaves,
  onOpenLeave,
}: {
  visible: boolean;
  onClose: () => void;
  leaves: LeaveLike[];
  onOpenLeave: (l: LeaveLike) => void;
}) {
  const today = new Date();
  const todayKey = keyOf(today);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [picked, setPicked] = useState(todayKey);

  const stats = useMemo(() => {
    const pending = leaves.filter((l) => l.status === "Pending").length;
    const offToday = uniqueEmployees(leaves.filter((l) => l.status === "Approved" && daysOf(l).some((d) => keyOf(d) === todayKey))).length;
    let monthDays = 0;
    leaves
      .filter((l) => l.status === "Approved")
      .forEach((l) =>
        daysOf(l).forEach((d) => {
          if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) monthDays++;
        })
      );
    return { pending, offToday, monthDays };
  }, [leaves, todayKey]);

  // who is off this week (Mon-Sun), approved only
  const week = useMemo(() => {
    const dow = (today.getDay() + 6) % 7;
    const mon = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dow);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    const byEmp: Record<string, { name: string; days: Date[] }> = {};
    leaves
      .filter((l) => l.status === "Approved")
      .forEach((l) => {
        const inWeek = daysOf(l).filter((d) => d >= mon && d <= sun);
        if (!inWeek.length) return;
        const e = (byEmp[l.emp_id] = byEmp[l.emp_id] || { name: nameOf(l), days: [] });
        e.days.push(...inWeek);
      });
    return Object.keys(byEmp).map((id) => {
      const e = byEmp[id];
      e.days.sort((a, b) => a.getTime() - b.getTime());
      const hasToday = e.days.some((d) => keyOf(d) === todayKey);
      const first = e.days[0];
      const last = e.days[e.days.length - 1];
      return {
        id,
        name: e.name,
        label: hasToday ? "Today" : keyOf(first) === keyOf(last) ? fmtShort(first) : `${fmtShort(first)} – ${fmtShort(last)}`,
      };
    });
  }, [leaves, todayKey]);

  // month grid (Monday first)
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < lead; i++) arr.push(null);
    for (let d = 1; d <= total; d++) arr.push(d);
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [month]);

  const countOn = (key: string) => uniqueEmployees(offOnDay(leaves, key)).length;
  const dayList = uniqueEmployees(offOnDay(leaves, picked));
  const pickedDate = dayStart(picked + "T12:00:00");
  const busy = dayList.length >= 3;

  const Tile = ({ n, label }: { n: number; label: string }) => (
    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 12, padding: 12, marginHorizontal: 4 }}>
      <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{n}</Text>
      <Text style={{ color: "#C9E4D8", fontSize: 10, fontWeight: "700", marginTop: 2 }}>{label}</Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
        <View style={{ backgroundColor: GREEN, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={onClose} style={{ padding: 4, marginRight: 8 }}>
              <MaterialIcons name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 20, fontWeight: "800" }}>Leave Calendar</Text>
              <Text style={{ color: "#C9E4D8", fontSize: 12 }}>Who is off, and when</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", marginTop: 14, marginHorizontal: -4 }}>
            <Tile n={stats.pending} label="PENDING" />
            <Tile n={stats.offToday} label="OFF TODAY" />
            <Tile n={stats.monthDays} label="DAYS THIS MONTH" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center" }}>
          <View style={{ width: "100%", maxWidth: 560 }}>
            {/* who is off this week */}
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 8 }}>WHO IS OFF THIS WEEK</Text>
            {week.length === 0 ? (
              <Text style={{ color: "#9CA3AF", fontSize: 13, marginBottom: 14 }}>Nobody is on approved leave this week.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {week.map((w) => (
                  <View key={w.id} style={{ alignItems: "center", marginRight: 16, width: 64 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colorFor(w.id), alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{(w.name[0] || "?").toUpperCase()}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#111827", marginTop: 4 }} numberOfLines={1}>{w.name.split(" ")[0]}</Text>
                    <Text style={{ fontSize: 10, color: "#6B7280" }} numberOfLines={1}>{w.label}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* month calendar */}
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5EAE7" }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={{ padding: 6 }}>
                  <MaterialIcons name="chevron-left" size={24} color={GREEN} />
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#111827" }}>
                  {MONTHS[month.getMonth()]} {month.getFullYear()}
                </Text>
                <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={{ padding: 6 }}>
                  <MaterialIcons name="chevron-right" size={24} color={GREEN} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: "row" }}>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <Text key={i} style={{ width: "14.285%", textAlign: "center", fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 6 }}>{d}</Text>
                ))}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {cells.map((d, i) => {
                  if (d === null) return <View key={i} style={{ width: "14.285%", height: 40 }} />;
                  const key = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(d)}`;
                  const n = countOn(key);
                  const st = levelStyle(n);
                  const sel = key === picked;
                  return (
                    <TouchableOpacity key={i} onPress={() => setPicked(key)} activeOpacity={0.7} style={{ width: "14.285%", height: 40, alignItems: "center", justifyContent: "center" }}>
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          backgroundColor: st.bg,
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: sel ? 2 : key === todayKey ? 1 : 0,
                          borderColor: sel ? GREEN : "#9CA3AF",
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: n ? "800" : "500", color: st.fg }}>{d}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={{ flexDirection: "row", marginTop: 10 }}>
                {[
                  ["#DCFCE7", "#166534", "1 off"],
                  ["#FEF3C7", "#92400E", "2 off"],
                  ["#FEE2E2", "#991B1B", "3+ off"],
                ].map(([bg, fg, t]) => (
                  <View key={t} style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 }}>
                    <Text style={{ color: fg, fontSize: 10, fontWeight: "700" }}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* picked day */}
            <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "#E5EAE7", marginTop: 14 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#6B7280", marginBottom: 8 }}>
                {fmtShort(pickedDate).toUpperCase()} · {dayList.length} EMPLOYEE{dayList.length === 1 ? "" : "S"} OFF
              </Text>
              {dayList.length === 0 ? (
                <Text style={{ color: "#9CA3AF", fontSize: 13 }}>Nobody is off on this day.</Text>
              ) : (
                dayList.map((l) => (
                  <TouchableOpacity
                    key={l._id}
                    activeOpacity={0.7}
                    onPress={() => onOpenLeave(l)}
                    style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#F1F5F3" }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" }} numberOfLines={1}>{nameOf(l)}</Text>
                    <View
                      style={{
                        backgroundColor: l.status === "Approved" ? "#DCFCE7" : "#FEF3C7",
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "700", color: l.status === "Approved" ? "#166534" : "#92400E" }}>{l.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            {busy && (
              <View style={{ backgroundColor: "#FFF7E0", borderRadius: 14, padding: 12, marginTop: 14, borderWidth: 1, borderColor: "#FDE7A8" }}>
                <Text style={{ color: "#92400E", fontSize: 12.5, fontWeight: "700" }}>
                  Busy day: {dayList.length} employees are off on {fmtShort(pickedDate)}. Think before approving more.
                </Text>
              </View>
            )}
            <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 12, textAlign: "center" }}>
              Counts include pending and approved requests. Tap a name to open that request.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
