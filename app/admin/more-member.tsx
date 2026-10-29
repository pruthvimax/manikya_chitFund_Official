import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Btn, Card, GREEN, INK, MUTED, MoreScreen, Pill, RED, SearchBox, SectionTitle, State, Stat, StatRow, api, callPhone, fmtDate, rupees, shareText, sharePdf, useFetch } from "../../components/moreKit";

/* MEMBER LOOKUP + STATEMENT: find any member, see every group and payment, share the statement */

export default function MemberLookup() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<string>("");

  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await api(`/more/members/search?q=${encodeURIComponent(s)}`);
        setResults(r.items || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const stmt = useFetch<any>(picked ? `/more/members/${encodeURIComponent(picked)}/statement` : null);
  const d = picked ? stmt.data : null;

  return (
    <MoreScreen title="Member Lookup" subtitle="Search and statement" onRefresh={picked ? stmt.reload : undefined} refreshing={stmt.refreshing}>
      <SearchBox value={q} onChange={(t) => { setQ(t); setPicked(""); }} placeholder="Name, phone or member ID" />
      {!picked && q.trim().length >= 2 ? (
        <>
          <State loading={searching && results.length === 0} empty={!searching && results.length === 0} emptyText="No member found." />
          {results.map((m) => (
            <TouchableOpacity key={m.userid} activeOpacity={0.85} onPress={() => setPicked(m.userid)}>
              <Card style={{ marginTop: 10, flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#E6F2EC", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontWeight: "900", color: GREEN, fontSize: 16 }}>{String(m.username || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: "900", color: INK }}>{m.username}</Text>
                  <Text style={{ color: MUTED, fontSize: 12 }}>{m.phone} · {m.userid}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={MUTED} />
              </Card>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
      {!picked && q.trim().length < 2 ? <State empty emptyText="Type at least 2 letters of a name, a phone number or a member ID." /> : null}

      {picked ? (
        <>
          <State loading={stmt.loading && !d} error={d ? "" : stmt.error} onRetry={stmt.reload} />
          {d ? (
            <>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontWeight: "900", color: "#FFFFFF", fontSize: 20 }}>{String(d.member.username || "?").charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ fontWeight: "900", color: INK, fontSize: 17 }}>{d.member.username}</Text>
                    <Text style={{ color: MUTED, fontSize: 12 }}>ID {d.member.userid}{d.member.joiningDate ? ` · joined ${fmtDate(d.member.joiningDate)}` : ""}</Text>
                  </View>
                  <Pill text={d.member.status || "active"} color={d.member.status === "inactive" ? RED : GREEN} />
                </View>
                {d.member.phone ? (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                    <View style={{ flex: 1 }}><Btn label={d.member.phone} icon="call" onPress={() => callPhone(d.member.phone)} kind="soft" small /></View>
                    <View style={{ flex: 1 }}><Btn label="Share statement" icon="share" onPress={() => shareText(d.text)} small /></View>
                  </View>
                ) : null}
                <View style={{ marginTop: 10 }}><Btn label="Download statement PDF" icon="picture-as-pdf" kind="outline" small onPress={() => sharePdf(`Member Statement - ${d.member.name || ""}`, d.text)} /></View>
                {d.member.address ? <Text style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>{d.member.address}</Text> : null}
              </Card>
              <StatRow>
                <Stat label="Paid" value={rupees(d.totals.paid)} color={GREEN} />
                <Stat label="Pending" value={rupees(d.totals.pending)} color={d.totals.pending ? RED : GREEN} />
                <Stat label="Penalty paid" value={rupees(d.totals.penaltyPaid)} color="#D97706" />
              </StatRow>

              <SectionTitle>Groups ({d.groups.length})</SectionTitle>
              {d.groups.length === 0 ? <State empty emptyText="This member is not in any group." /> : null}
              {d.groups.map((g: any, i: number) => (
                <Card key={g.groupId + i} style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontWeight: "900", color: INK, fontSize: 15 }}>Group {g.groupId} · {g.groupMemberId}</Text>
                    <Pill text={g.pending > 0 ? `Pending ${rupees(g.pending)}` : "Up to date"} color={g.pending > 0 ? RED : GREEN} />
                  </View>
                  <Text style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>Paid {rupees(g.paid)} of {rupees(g.due)} due{g.overdueMonths ? ` · ${g.overdueMonths} month(s) behind` : ""}</Text>
                  {g.nextDue ? <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>Next due {fmtDate(g.nextDue.date)}{g.nextDue.amount ? ` · ${rupees(g.nextDue.amount)}` : ""}</Text> : null}
                </Card>
              ))}

              <SectionTitle>Recent payments</SectionTitle>
              {d.payments.length === 0 ? <State empty emptyText="No payments yet." /> : null}
              {d.payments.length > 0 ? (
                <Card>
                  {d.payments.map((p: any, i: number) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: "#EEF1EF" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "800", color: INK, fontSize: 13 }}>{rupees(p.amount)} {p.type === "PENALTY" ? "· Penalty" : `· Month ${p.month}`}</Text>
                        <Text style={{ color: MUTED, fontSize: 11 }}>Group {p.group} · {p.mode}{p.by ? ` · ${p.by}` : ""}</Text>
                      </View>
                      <Text style={{ color: MUTED, fontSize: 11 }}>{fmtDate(p.at)}</Text>
                    </View>
                  ))}
                </Card>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </MoreScreen>
  );
}
