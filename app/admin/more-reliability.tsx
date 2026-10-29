import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AMBER, Bar, BLUE, Card, Chips, GREEN, INK, MUTED, MoreScreen, Pill, RED, SearchBox, State, Stat, StatRow, callPhone, rupees, useFetch } from "../../components/moreKit";

/* RELIABILITY SCORE: share of past months a member paid in full and on time */

const colorOf = (g: string) => (g === "Excellent" ? GREEN : g === "Good" ? BLUE : g === "Average" ? AMBER : RED);

export default function Reliability() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const { data, loading, refreshing, error, reload } = useFetch<any>("/more/reliability");

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.items || []).filter((m: any) => (tab === "all" || m.grade === tab) && (!s || m.name.toLowerCase().includes(s) || m.phone.includes(s) || m.groups.join(" ").toLowerCase().includes(s)));
  }, [data, tab, q]);

  return (
    <MoreScreen title="Reliability Score" subtitle="On-time payment record" onRefresh={reload} refreshing={refreshing}>
      {data ? (
        <>
          <StatRow>
            <Stat label="Excellent" value={String(data.excellent)} color={GREEN} sub="85+" />
            <Stat label="Good" value={String(data.good)} color={BLUE} sub="65-84" />
            <Stat label="Average" value={String(data.average)} color={AMBER} sub="40-64" />
            <Stat label="Risky" value={String(data.risky)} color={RED} sub="below 40" />
          </StatRow>
          <Text style={{ color: MUTED, fontSize: 11.5, marginTop: 8 }}>
            Each past month counts: paid in full by the due date = full point, paid in full but late = half, not paid = zero.
          </Text>
        </>
      ) : null}
      <SearchBox value={q} onChange={setQ} placeholder="Search name, phone or group" />
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { key: "all", label: "Riskiest first" },
          { key: "Risky", label: "Risky" },
          { key: "Average", label: "Average" },
          { key: "Good", label: "Good" },
          { key: "Excellent", label: "Excellent" },
        ]}
      />
      <State loading={loading && !data} error={data ? "" : error} empty={!!data && items.length === 0} emptyText="No members to show." onRetry={reload} />
      {items.slice(0, 200).map((m: any) => (
        <Card key={m.memberId} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 3, borderColor: colorOf(m.grade), alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontWeight: "900", color: colorOf(m.grade), fontSize: 15 }}>{m.score}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: "900", color: INK }} numberOfLines={1}>{m.name}</Text>
              <Text style={{ color: MUTED, fontSize: 11.5 }}>Group {m.groups.join(", ")}</Text>
            </View>
            <Pill text={m.grade} color={colorOf(m.grade)} solid />
          </View>
          <View style={{ marginTop: 10 }}><Bar percent={m.score} color={colorOf(m.grade)} /></View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 7 }}>
            <Text style={{ color: GREEN, fontSize: 12, fontWeight: "800" }}>{m.onTime} on time</Text>
            <Text style={{ color: AMBER, fontSize: 12, fontWeight: "800" }}>{m.late} late</Text>
            <Text style={{ color: RED, fontSize: 12, fontWeight: "800" }}>{m.unpaid} unpaid</Text>
            {m.pending > 0 ? <Text style={{ color: MUTED, fontSize: 12 }}>{rupees(m.pending)} pending</Text> : null}
          </View>
          {m.phone ? (
            <TouchableOpacity onPress={() => callPhone(m.phone)} style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
              <MaterialIcons name="call" size={15} color={GREEN} />
              <Text style={{ color: GREEN, fontWeight: "800", marginLeft: 5, fontSize: 12.5 }}>{m.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </Card>
      ))}
      {items.length > 200 ? <Text style={{ textAlign: "center", color: MUTED, marginTop: 10 }}>Showing 200 of {items.length}. Use search to narrow down.</Text> : null}
    </MoreScreen>
  );
}
