import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";

/* MY RECEIPTS: calendar to find the receipts of one day faster.
   Days that have a receipt show dots (green = installment, amber = penalty). Tap a day to see only
   that day's receipts. Display only: nothing is changed or saved. */

const GREEN = "#024e32";
const INK = "#0F172A";
const MUTED = "#64748B";
const AMBER = "#D97706";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-20" (the member's own local date) */
export const dayKey = (v: any): string => {
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

type Item = { paidAt: any; type: string };

export default function ReceiptCalendar({
  visible,
  items,
  selected,
  onPick,
  onClose,
}: {
  visible: boolean;
  items: Item[];
  selected: string; // "" = no day chosen
  onPick: (day: string) => void; // "" clears
  onClose: () => void;
}) {
  // day -> what kind of receipts it has
  const byDay = useMemo(() => {
    const m: Record<string, { inst: number; pen: number }> = {};
    items.forEach((r) => {
      const k = dayKey(r.paidAt);
      if (!k) return;
      const e = (m[k] = m[k] || { inst: 0, pen: 0 });
      if (r.type === "Penalty") e.pen += 1;
      else e.inst += 1;
    });
    return m;
  }, [items]);

  const keys = useMemo(() => Object.keys(byDay).sort(), [byDay]);
  const first = keys[0] || dayKey(new Date());
  const last = keys[keys.length - 1] || first;
  const minYM = first.slice(0, 7);
  const maxYM = last.slice(0, 7);

  const start = (selected || last).slice(0, 7);
  const [ym, setYm] = useState(start);
  // when opened again, show the chosen day's month (or the latest receipt month)
  React.useEffect(() => {
    if (visible) setYm((selected || last).slice(0, 7));
  }, [visible]);

  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7)) - 1;
  const firstWeekday = new Date(y, mo, 1).getDay();
  const daysIn = new Date(y, mo + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const shift = (d: number) => {
    const nd = new Date(y, mo + d, 1);
    setYm(`${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`);
  };
  const canPrev = ym > minYM;
  const canNext = ym < maxYM;
  const today = dayKey(new Date());
  const monthCount = keys.filter((k) => k.startsWith(ym)).reduce((s, k) => s + byDay[k].inst + byDay[k].pen, 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 420, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 16 }}>
          {/* month bar */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <TouchableOpacity disabled={!canPrev} onPress={() => shift(-1)} style={{ padding: 6, opacity: canPrev ? 1 : 0.25 }}>
              <MaterialIcons name="chevron-left" size={26} color={GREEN} />
            </TouchableOpacity>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 16, fontWeight: "900", color: INK }}>
                {MONTHS[mo]} {y}
              </Text>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
                {monthCount} receipt{monthCount === 1 ? "" : "s"} this month
              </Text>
            </View>
            <TouchableOpacity disabled={!canNext} onPress={() => shift(1)} style={{ padding: 6, opacity: canNext ? 1 : 0.25 }}>
              <MaterialIcons name="chevron-right" size={26} color={GREEN} />
            </TouchableOpacity>
          </View>

          {/* week days */}
          <View style={{ flexDirection: "row", marginBottom: 4 }}>
            {WEEK.map((w, i) => (
              <Text key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800", color: MUTED }}>
                {w}
              </Text>
            ))}
          </View>

          {/* days */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={{ flexDirection: "row" }}>
              {cells.slice(row * 7, row * 7 + 7).map((d, i) => {
                if (!d) return <View key={i} style={{ flex: 1, height: 46 }} />;
                const k = `${ym}-${pad(d)}`;
                const e = byDay[k];
                const has = !!e;
                const on = selected === k;
                return (
                  <TouchableOpacity
                    key={i}
                    disabled={!has}
                    activeOpacity={0.7}
                    onPress={() => onPick(on ? "" : k)}
                    style={{ flex: 1, height: 46, alignItems: "center", justifyContent: "center" }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: on ? GREEN : "transparent",
                        borderWidth: !on && k === today ? 1.5 : 0,
                        borderColor: GREEN,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: has ? "900" : "600", color: on ? "#FFFFFF" : has ? INK : "#B6C0BB" }}>{d}</Text>
                    </View>
                    {has ? (
                      <View style={{ flexDirection: "row", position: "absolute", bottom: 1 }}>
                        {e.inst > 0 ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? "#FFFFFF" : "#16A34A", marginHorizontal: 1.5 }} /> : null}
                        {e.pen > 0 ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? "#FDE68A" : AMBER, marginHorizontal: 1.5 }} /> : null}
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* legend + buttons */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#16A34A" }} />
            <Text style={{ color: "#15803D", fontWeight: "800", fontSize: 12, marginLeft: 5, marginRight: 14 }}>Installment</Text>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER }} />
            <Text style={{ color: AMBER, fontWeight: "800", fontSize: 12, marginLeft: 5 }}>Penalty</Text>
          </View>
          <View style={{ flexDirection: "row", marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => {
                onPick("");
                onClose();
              }}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: "#DDE5E0", alignItems: "center", marginRight: 8 }}
            >
              <Text style={{ color: GREEN, fontWeight: "900", fontSize: 13 }}>Show all receipts</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: GREEN, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 13 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
