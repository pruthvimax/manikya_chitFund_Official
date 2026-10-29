import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AMBER, Bar, Card, Chips, GREEN, INK, MUTED, MoreScreen, Pill, RED, SearchBox, State, Stat, StatRow, short, useFetch } from "../../components/moreKit";

/* GROUP HEALTH: how well every group is collecting (months already due) */

const colorOf = (h: string) => (h === "Healthy" ? GREEN : h === "Watch" ? AMBER : h === "At risk" ? RED : MUTED);

export default function GroupHealth() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const { data, loading, refreshing, error, reload } = useFetch<any>("/more/group-health");

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.items || []).filter((g: any) => (tab === "all" || g.health === tab) && (!s || String(g.groupId).toLowerCase().includes(s) || String(g.chitId).toLowerCase().includes(s)));
  }, [data, tab, q]);

  return (
    <MoreScreen title="Group Health" subtitle="Collection % of each group" onRefresh={reload} refreshing={refreshing}>
      {data ? (
        <StatRow>
          <Stat label="Healthy" value={String(data.healthy)} color={GREEN} sub="90%+" />
          <Stat label="Watch" value={String(data.watch)} color={AMBER} sub="70-89%" />
          <Stat label="At risk" value={String(data.risk)} color={RED} sub="below 70%" />
        </StatRow>
      ) : null}
      <SearchBox value={q} onChange={setQ} placeholder="Search group or scheme" />
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { key: "all", label: "All" },
          { key: "At risk", label: "At risk" },
          { key: "Watch", label: "Watch" },
          { key: "Healthy", label: "Healthy" },
          { key: "New", label: "New" },
        ]}
      />
      <State loading={loading && !data} error={data ? "" : error} empty={!!data && items.length === 0} emptyText="No groups found." onRetry={reload} />
      {items.map((g: any) => (
        <TouchableOpacity
          key={g._id}
          activeOpacity={0.85}
          onPress={() => router.push({ pathname: "/admin/more-settlement", params: { id: g._id } } as any)}
        >
          <Card style={{ marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: INK, fontSize: 16 }}>Group {g.groupId}</Text>
                <Text style={{ color: MUTED, fontSize: 11.5 }}>{g.chitId}{g.chitAmount ? ` · ${short(g.chitAmount)}` : ""} · {g.members} members</Text>
              </View>
              <Pill text={g.health} color={colorOf(g.health)} solid />
            </View>
            <View style={{ marginTop: 10 }}>
              <Bar percent={g.percent} color={colorOf(g.health)} height={9} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ fontWeight: "900", color: colorOf(g.health), fontSize: 13 }}>{g.percent}% collected</Text>
              <Text style={{ color: MUTED, fontSize: 12 }}>Pending {short(g.pending)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
              <Text style={{ color: MUTED, fontSize: 12 }}>{g.overdueMembers} overdue members</Text>
              <Text style={{ color: MUTED, fontSize: 12 }}>This month {short(g.monthCollected)}</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </MoreScreen>
  );
}
