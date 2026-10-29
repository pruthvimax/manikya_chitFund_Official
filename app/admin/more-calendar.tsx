import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AMBER, BLUE, Card, GREEN, INK, MUTED, MonthBar, MoreScreen, Pill, State, Stat, StatRow, monthKey, rupees, useFetch } from "../../components/moreKit";

/* AUCTION CALENDAR: auctions + live spins of a month, day by day */

const WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export default function Calendar() {
  const [month, setMonth] = useState(() => new Date());
  const [sel, setSel] = useState<string>("");
  const { data, loading, refreshing, error, reload } = useFetch<any>(`/more/calendar?month=${monthKey(month)}`);

  const byDay = useMemo(() => {
    const m: Record<string, any[]> = {};
    (data?.items || []).forEach((i: any) => {
      (m[i.date] = m[i.date] || []).push(i);
    });
    return m;
  }, [data]);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = Array(first.getDay()).fill(null).concat(Array.from({ length: days }, (_, i) => i + 1));
  while (cells.length % 7) cells.push(null);
  const keyOf = (d: number) => `${monthKey(month)}-${String(d).padStart(2, "0")}`;

  const list = sel ? byDay[sel] || [] : data?.items || [];

  return (
    <MoreScreen title="Auction Calendar" subtitle="Auctions & spins" onRefresh={reload} refreshing={refreshing}>
      <MonthBar value={month} onChange={(d) => { setMonth(d); setSel(""); }} />
      {data ? (
        <StatRow>
          <Stat label="This month" value={String(data.total)} />
          <Stat label="Upcoming" value={String(data.upcoming)} color={AMBER} />
        </StatRow>
      ) : null}
      <Card>
        <View style={{ flexDirection: "row" }}>
          {WEEK.map((w, i) => (
            <Text key={i} style={{ flex: 1, textAlign: "center", color: MUTED, fontWeight: "800", fontSize: 11 }}>{w}</Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <View key={r} style={{ flexDirection: "row", marginTop: 6 }}>
            {cells.slice(r * 7, r * 7 + 7).map((d, c) => {
              if (!d) return <View key={c} style={{ flex: 1, height: 44 }} />;
              const k = keyOf(d);
              const ev = byDay[k] || [];
              const on = sel === k;
              const isToday = data?.today === k;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSel(on ? "" : k)}
                  style={{
                    flex: 1,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    backgroundColor: on ? GREEN : isToday ? "#E6F2EC" : "transparent",
                  }}
                >
                  <Text style={{ fontWeight: "800", color: on ? "#FFFFFF" : INK }}>{d}</Text>
                  <View style={{ flexDirection: "row", height: 6, marginTop: 2 }}>
                    {ev.some((e) => e.kind === "auction") ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: on ? "#FFFFFF" : AMBER, marginHorizontal: 1 }} /> : null}
                    {ev.some((e) => e.kind === "spin") ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: on ? "#FFFFFF" : BLUE, marginHorizontal: 1 }} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
          <Text style={{ color: AMBER, fontSize: 11, fontWeight: "800" }}>● Auction</Text>
          <Text style={{ color: BLUE, fontSize: 11, fontWeight: "800" }}>● Spin</Text>
        </View>
      </Card>

      <State loading={loading && !data} error={data ? "" : error} empty={!!data && list.length === 0} emptyText={sel ? "Nothing on this day." : "No auctions this month."} onRetry={reload} />
      {list.map((e: any, i: number) => (
        <Card key={i} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: INK, fontSize: 15 }}>
                {e.kind === "spin" ? "Spin" : "Auction"} · Group {e.group}
              </Text>
              <Text style={{ color: MUTED, fontSize: 12 }}>{e.date.split("-").reverse().join("-")} {e.time}</Text>
            </View>
            <Pill text={e.status || (e.kind === "spin" ? "Spin" : "Auction")} color={e.kind === "spin" ? BLUE : AMBER} />
          </View>
          {e.kind === "auction" && (e.min || e.max) ? (
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>Bid range {rupees(e.min)} – {rupees(e.max)}</Text>
          ) : null}
          {e.winner ? (
            <Text style={{ color: GREEN, fontWeight: "800", fontSize: 12.5, marginTop: 4 }}>Winner: {e.winner}{e.winnerBid ? ` · ${rupees(e.winnerBid)}` : ""}</Text>
          ) : null}
        </Card>
      ))}
    </MoreScreen>
  );
}
