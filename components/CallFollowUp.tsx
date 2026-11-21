import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";

/* ADMIN LEDGER (Overdue members): "call this member on this day".
   The member said "I will pay on that day, call me then" -> the admin saves a call date and an
   optional note. It shows on the member's row. It is saved on the server (same on every admin device)
   and is removed by itself some days after the call date. Nothing else in the app uses it. */

const GREEN = "#024e32";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const pad = (n: number) => String(n).padStart(2, "0");
const keyOfDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (k: string) => new Date(`${k}T00:00:00`);
const nice = (k: string) => parse(k).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
const short = (k: string) => parse(k).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" });

export type FollowUp = { groupId: string; groupMemberId: string; memberName?: string; callDate: string; note: string };
export type FollowTarget = { groupId: string; groupMemberId: string; memberName: string; pending?: number };

const idOf = (g: string, m: string) => `${g}|${m || ""}`;

/* ---------- data ---------- */
export function useFollowUps(enabled: boolean, refreshKey?: any) {
  const [map, setMap] = useState<Record<string, FollowUp>>({});

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/call-followup`);
      if (!res.ok) return;
      const d = await res.json();
      const m: Record<string, FollowUp> = {};
      (Array.isArray(d?.items) ? d.items : []).forEach((x: any) => (m[idOf(x.groupId, x.groupMemberId)] = x));
      setMap(m);
    } catch {
      // keep what we have
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refreshKey, refresh]);

  const save = async (t: FollowTarget, callDate: string, note: string): Promise<string> => {
    try {
      const res = await fetch(`${BACKEND_URL}/call-followup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: t.groupId, groupMemberId: t.groupMemberId, memberName: t.memberName, callDate, note }),
      });
      const d = await res.json().catch(() => null);
      if (res.status === 404 || !d) return "Call follow-up is not on the server yet. Copy the new backend files and redeploy.";
      if (!res.ok || !d.success) return d?.message || "Could not save";
      setMap((p) => ({ ...p, [idOf(t.groupId, t.groupMemberId)]: d.item }));
      return "";
    } catch {
      return "Could not reach the server";
    }
  };

  const remove = async (t: FollowTarget): Promise<string> => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/call-followup?groupId=${encodeURIComponent(t.groupId)}&groupMemberId=${encodeURIComponent(t.groupMemberId || "")}`,
        { method: "DELETE" }
      );
      if (!res.ok) return "Could not remove";
      setMap((p) => {
        const n = { ...p };
        delete n[idOf(t.groupId, t.groupMemberId)];
        return n;
      });
      return "";
    } catch {
      return "Could not reach the server";
    }
  };

  return { get: (g: string, m: string) => map[idOf(g, m)], save, remove };
}

/* ---------- the line under a member's name ---------- */
export function FollowUpLine({ fu, onPress }: { fu?: FollowUp; onPress: () => void }) {
  if (!fu) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", marginTop: 5, paddingVertical: 3 }}>
        <MaterialIcons name="event" size={14} color={GREEN} />
        <Text style={{ color: GREEN, fontWeight: "800", fontSize: 11.5, marginLeft: 4 }}>Set call date</Text>
      </TouchableOpacity>
    );
  }
  const today = keyOfDate(new Date());
  const isToday = fu.callDate === today;
  const passed = fu.callDate < today;
  const days = Math.round((parse(fu.callDate).getTime() - parse(today).getTime()) / 86400000);
  const bg = isToday ? "#FFF8E1" : passed ? "#FEF2F2" : "#ECFDF5";
  const border = isToday ? "#F5C84B" : passed ? "#FCA5A5" : "#A7F3D0";
  const fg = isToday ? "#92400E" : passed ? "#B91C1C" : "#065F46";
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ marginTop: 6, backgroundColor: bg, borderWidth: isToday ? 1.5 : 1, borderColor: border, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <MaterialIcons name={isToday ? "phone-in-talk" : "event"} size={14} color={fg} />
        {isToday ? (
          <View style={{ backgroundColor: "#F5C84B", borderRadius: 99, paddingHorizontal: 7, paddingVertical: 1, marginLeft: 5 }}>
            <Text style={{ color: "#4A3300", fontSize: 9, fontWeight: "900", letterSpacing: 0.5 }}>CALL TODAY</Text>
          </View>
        ) : null}
        <Text style={{ color: fg, fontWeight: "900", fontSize: 12, marginLeft: 5 }}>
          {isToday ? short(fu.callDate) : passed ? `Call date passed · ${short(fu.callDate)}` : `Call on ${short(fu.callDate)}`}
        </Text>
        {!isToday && !passed ? <Text style={{ color: fg, fontSize: 11, marginLeft: 5, opacity: 0.8 }}>({days === 1 ? "tomorrow" : `in ${days} days`})</Text> : null}
        <Text style={{ color: fg, fontWeight: "900", fontSize: 11, marginLeft: "auto" as any }}>Edit</Text>
      </View>
      {fu.note ? (
        <Text style={{ color: fg, fontSize: 11.5, marginTop: 3 }} numberOfLines={2}>
          “{fu.note}”
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

/* ---------- popup ---------- */
export function FollowUpModal({
  target,
  existing,
  onSave,
  onRemove,
  onClose,
}: {
  target: FollowTarget | null;
  existing?: FollowUp;
  onSave: (t: FollowTarget, date: string, note: string) => Promise<string>;
  onRemove: (t: FollowTarget) => Promise<string>;
  onClose: () => void;
}) {
  const today = keyOfDate(new Date());
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [pick, setPick] = useState(false);
  const [ym, setYm] = useState(today.slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!target) return;
    const d = existing?.callDate && existing.callDate >= today ? existing.callDate : today;
    setDate(existing?.callDate || d);
    setNote(existing?.note || "");
    setPick(false);
    setYm((existing?.callDate || d).slice(0, 7));
    setErr("");
    setBusy(false);
  }, [target?.groupId, target?.groupMemberId]);

  if (!target) return null;

  const tomorrow = keyOfDate(new Date(Date.now() + 86400000));
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7)) - 1;
  const firstDow = new Date(y, mo, 1).getDay();
  const dim = new Date(y, mo + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const shift = (n: number) => {
    const nd = new Date(y, mo + n, 1);
    setYm(`${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`);
  };

  const go = async (fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setErr("");
    const e = await fn();
    setBusy(false);
    if (e) setErr(e);
    else onClose();
  };

  const chip = (label: string, on: boolean, press: () => void) => (
    <TouchableOpacity
      onPress={press}
      activeOpacity={0.8}
      style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: on ? GREEN : "#DDE5E0", backgroundColor: on ? GREEN : "#FFFFFF", marginRight: 8, marginBottom: 8 }}
    >
      <Text style={{ color: on ? "#FFFFFF" : "#0F172A", fontWeight: "800", fontSize: 12.5 }}>{label}</Text>
    </TouchableOpacity>
  );

  const custom = date !== today && date !== tomorrow;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 420, maxHeight: "92%", backgroundColor: "#FFFFFF", borderRadius: 24 }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18 }}>
              <Text style={{ fontSize: 17, fontWeight: "900", color: "#0F172A" }}>Set call date</Text>
              <Text style={{ color: "#64748B", fontSize: 12.5, marginTop: 3 }}>
                {target.memberName} · Group {target.groupId}
                {target.groupMemberId ? ` · No. ${target.groupMemberId}` : ""}
                {target.pending ? ` · ₹${Math.round(target.pending).toLocaleString("en-IN")} pending` : ""}
              </Text>

              <Text style={{ fontSize: 11, fontWeight: "800", color: "#475569", letterSpacing: 0.4, marginTop: 14, marginBottom: 6 }}>CALL ON</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {chip("Today", date === today, () => { setDate(today); setPick(false); })}
                {chip("Tomorrow", date === tomorrow, () => { setDate(tomorrow); setPick(false); })}
                {chip(custom ? short(date) : "Pick date", custom || pick, () => setPick((v) => !v))}
              </View>

              {pick ? (
                <View style={{ backgroundColor: "#F8FAF9", borderRadius: 16, padding: 10, marginTop: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
                    <TouchableOpacity onPress={() => shift(-1)} disabled={ym <= today.slice(0, 7)} style={{ padding: 4, opacity: ym <= today.slice(0, 7) ? 0.25 : 1 }}>
                      <MaterialIcons name="chevron-left" size={24} color={GREEN} />
                    </TouchableOpacity>
                    <Text style={{ flex: 1, textAlign: "center", fontWeight: "900", color: "#0F172A" }}>
                      {MONTHS[mo]} {y}
                    </Text>
                    <TouchableOpacity onPress={() => shift(1)} style={{ padding: 4 }}>
                      <MaterialIcons name="chevron-right" size={24} color={GREEN} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    {WEEK.map((w, i) => (
                      <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800", color: "#64748B" }}>
                        {w}
                      </Text>
                    ))}
                  </View>
                  {Array.from({ length: cells.length / 7 }, (_, r) => (
                    <View key={r} style={{ flexDirection: "row" }}>
                      {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
                        if (!d) return <View key={i} style={{ flex: 1, height: 38 }} />;
                        const k = `${ym}-${pad(d)}`;
                        const past = k < today;
                        const on = k === date;
                        return (
                          <TouchableOpacity
                            key={i}
                            disabled={past}
                            onPress={() => { setDate(k); setPick(false); }}
                            style={{ flex: 1, height: 38, alignItems: "center", justifyContent: "center" }}
                          >
                            <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: on ? GREEN : "transparent", borderWidth: !on && k === today ? 1.5 : 0, borderColor: GREEN }}>
                              <Text style={{ fontSize: 13, fontWeight: past ? "600" : "800", color: on ? "#FFFFFF" : past ? "#C0C9C4" : "#0F172A" }}>{d}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: GREEN, fontWeight: "900", fontSize: 13, marginTop: 2 }}>{nice(date)}</Text>
              )}

              <Text style={{ fontSize: 11, fontWeight: "800", color: "#475569", letterSpacing: 0.4, marginTop: 14, marginBottom: 6 }}>NOTE (OPTIONAL)</Text>
              <TextInput
                value={note}
                onChangeText={(v) => setNote(v.slice(0, 120))}
                placeholder="e.g. Said he will pay after the harvest money"
                placeholderTextColor="#9CA3AF"
                multiline
                style={[{ borderWidth: 1, borderColor: "#DDE5E0", backgroundColor: "#F8FAF9", borderRadius: 12, padding: 11, fontSize: 13.5, color: "#0F172A", minHeight: 64, textAlignVertical: "top" }, { outlineStyle: "none" } as any]}
              />
              <Text style={{ textAlign: "right", fontSize: 11, color: "#9CA3AF", marginTop: 3 }}>{note.length}/120</Text>

              {err ? <Text style={{ color: "#B91C1C", fontWeight: "700", fontSize: 12, marginTop: 6 }}>{err}</Text> : null}

              <View style={{ flexDirection: "row", marginTop: 14 }}>
                {existing ? (
                  <TouchableOpacity
                    onPress={() => go(() => onRemove(target))}
                    disabled={busy}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: "#FCA5A5", alignItems: "center", marginRight: 10 }}
                  >
                    <Text style={{ color: "#B91C1C", fontWeight: "900", fontSize: 13 }}>Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: 12, borderRadius: 13, borderWidth: 1, borderColor: "#DDE5E0", alignItems: "center", marginRight: 10 }}>
                    <Text style={{ color: GREEN, fontWeight: "900", fontSize: 13 }}>Cancel</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => go(() => onSave(target, date, note.trim()))}
                  disabled={busy}
                  style={{ flex: 1.4, paddingVertical: 12, borderRadius: 13, backgroundColor: GREEN, alignItems: "center", opacity: busy ? 0.7 : 1 }}
                >
                  <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13 }}>{busy ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: "#6B7280", fontSize: 11.5, marginTop: 10 }}>
                Saved on the server, so every admin device sees it. It shows on this member's row in the Ledger.
              </Text>
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
