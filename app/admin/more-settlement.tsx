import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Bar, Btn, Card, GREEN, INK, MUTED, MoreScreen, Pill, RED, SearchBox, SectionTitle, State, Stat, StatRow, callPhone, rupees, shareText, sharePdf, short, useFetch } from "../../components/moreKit";

/* GROUP SETTLEMENT: pick a group, see every member's paid / pending / penalty and the auction winners */

export default function Settlement() {
  const params = useLocalSearchParams<{ id?: string }>();
  const [id, setId] = useState<string>(params?.id ? String(params.id) : "");
  const [q, setQ] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);

  const groups = useFetch<any>(id ? null : "/more/group-health");
  const det = useFetch<any>(id ? `/more/settlement/${id}` : null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (groups.data?.items || []).filter((g: any) => !s || String(g.groupId).toLowerCase().includes(s) || String(g.chitId).toLowerCase().includes(s));
  }, [groups.data, q]);

  if (!id) {
    return (
      <MoreScreen title="Group Settlement" subtitle="Choose a group" onRefresh={groups.reload} refreshing={groups.refreshing}>
        <SearchBox value={q} onChange={setQ} placeholder="Search group" />
        <State loading={groups.loading && !groups.data} error={groups.data ? "" : groups.error} empty={!!groups.data && list.length === 0} emptyText="No groups found." onRetry={groups.reload} />
        {list.map((g: any) => (
          <TouchableOpacity key={g._id} activeOpacity={0.85} onPress={() => setId(g._id)}>
            <Card style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", color: INK, fontSize: 15.5 }}>Group {g.groupId}</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>{g.chitId}{g.chitAmount ? ` · ${short(g.chitAmount)}` : ""} · {g.members} members</Text>
              </View>
              <Pill text={`${g.percent}%`} color={g.percent >= 90 ? GREEN : g.percent >= 70 ? "#D97706" : RED} />
              <MaterialIcons name="chevron-right" size={22} color={MUTED} />
            </Card>
          </TouchableOpacity>
        ))}
      </MoreScreen>
    );
  }

  const d = det.data;
  const members = (d?.members || []).filter((m: any) => (!onlyPending || m.pending > 0) && (!q.trim() || m.name.toLowerCase().includes(q.trim().toLowerCase()) || m.phone.includes(q.trim())));
  const pct = d && d.totals.due > 0 ? Math.round((d.totals.paid / d.totals.due) * 100) : 100;

  return (
    <MoreScreen title={d ? `Group ${d.group.groupId}` : "Group Settlement"} subtitle="Settlement summary" onRefresh={det.reload} refreshing={det.refreshing}>
      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <Btn label="Change group" icon="swap-horiz" onPress={() => { setId(""); setQ(""); }} kind="soft" small />
      </View>
      <State loading={det.loading && !d} error={d ? "" : det.error} onRetry={det.reload} />
      {d ? (
        <>
          <Card>
            <Text style={{ fontWeight: "900", color: INK, fontSize: 16 }}>Group {d.group.groupId} · {d.group.chitId}</Text>
            <Text style={{ color: MUTED, fontSize: 12 }}>{d.totals.members} members{d.group.chitAmount ? ` · chit value ${rupees(d.group.chitAmount)}` : ""}</Text>
            <View style={{ marginTop: 10 }}><Bar percent={pct} height={10} color={pct >= 90 ? GREEN : pct >= 70 ? "#D97706" : RED} /></View>
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 6 }}>{pct}% of the amount due so far is collected</Text>
          </Card>
          <StatRow>
            <Stat label="Due so far" value={short(d.totals.due)} />
            <Stat label="Collected" value={short(d.totals.paid)} color={GREEN} />
            <Stat label="Pending" value={short(d.totals.pending)} color={d.totals.pending ? RED : GREEN} />
          </StatRow>
          <StatRow>
            <Stat label="Penalty collected" value={short(d.totals.penalty)} color="#D97706" />
            <Stat label="Up to date" value={`${d.totals.settled}/${d.totals.members}`} color={GREEN} />
          </StatRow>

          {d.winners.length > 0 ? (
            <>
              <SectionTitle>Auction winners</SectionTitle>
              <Card>
                {d.winners.map((w: any, i: number) => (
                  <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderTopWidth: i ? 1 : 0, borderTopColor: "#EEF1EF" }}>
                    <Text style={{ color: INK, flex: 1 }} numberOfLines={1}>{w.date} · {w.name}{w.groupMemberId ? ` (${w.groupMemberId})` : ""}</Text>
                    <Text style={{ fontWeight: "900", color: GREEN }}>{rupees(w.bid)}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <SectionTitle right={<Btn label={onlyPending ? "Show all" : "Pending only"} onPress={() => setOnlyPending((v) => !v)} kind="soft" small />}>Members</SectionTitle>
          <SearchBox value={q} onChange={setQ} placeholder="Search member or phone" />
          {members.map((m: any) => (
            <Card key={m.memberId + m.groupMemberId} style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: INK }} numberOfLines={1}>{m.name}</Text>
                  <Text style={{ color: MUTED, fontSize: 11.5 }}>{m.groupMemberId} · {m.monthsDone}/{m.monthsDue} months paid</Text>
                </View>
                <Pill text={m.pending > 0 ? `Pending ${rupees(m.pending)}` : "Settled"} color={m.pending > 0 ? RED : GREEN} />
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: MUTED, fontSize: 12 }}>Paid {rupees(Math.min(m.paid, m.due))} of {rupees(m.due)}</Text>
                <Text style={{ color: MUTED, fontSize: 12 }}>Penalty {rupees(m.penaltyPaid)}</Text>
              </View>
              {m.phone && m.pending > 0 ? (
                <TouchableOpacity onPress={() => callPhone(m.phone)} style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <MaterialIcons name="call" size={15} color={GREEN} />
                  <Text style={{ color: GREEN, fontWeight: "800", marginLeft: 5, fontSize: 12.5 }}>{m.phone}</Text>
                </TouchableOpacity>
              ) : null}
            </Card>
          ))}
          {members.length === 0 ? <State empty emptyText="No members match." /> : null}
          <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Btn label="Share summary" icon="share" onPress={() => shareText(d.text)} /></View>
            <View style={{ flex: 1 }}><Btn label="Download PDF" icon="picture-as-pdf" kind="outline" onPress={() => sharePdf(`Group Settlement - ${d.group.groupId}`, d.text)} /></View>
          </View>
        </>
      ) : null}
    </MoreScreen>
  );
}
