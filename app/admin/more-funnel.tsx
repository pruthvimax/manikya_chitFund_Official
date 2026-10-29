import React, { useState } from "react";
import { Text, View } from "react-native";
import { AMBER, Bar, BLUE, Card, Chips, GREEN, INK, MUTED, MoreScreen, RED, SectionTitle, State, Stat, StatRow, useFetch } from "../../components/moreKit";

/* NEW MEMBER FUNNEL: leads -> interested -> enrollment -> approved */

export default function Funnel() {
  const [days, setDays] = useState("30");
  const { data, loading, refreshing, error, reload } = useFetch<any>(`/more/funnel?days=${days}`);
  const top = Math.max(1, ...((data?.stages || []).map((s: any) => s.n)));
  const colors = [BLUE, "#DB2777", AMBER, GREEN];

  return (
    <MoreScreen title="New Member Funnel" subtitle="From first visit to approved" onRefresh={reload} refreshing={refreshing}>
      <Chips
        value={days}
        onChange={setDays}
        options={[
          { key: "7", label: "7 days" },
          { key: "30", label: "30 days" },
          { key: "90", label: "90 days" },
          { key: "365", label: "1 year" },
        ]}
      />
      <State loading={loading && !data} error={data ? "" : error} onRetry={reload} />
      {data ? (
        <>
          <Card style={{ marginTop: 4 }}>
            {data.stages.map((s: any, i: number) => (
              <View key={s.key} style={{ marginTop: i ? 14 : 0 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "800", color: INK, fontSize: 13 }}>{s.label}</Text>
                  <Text style={{ fontWeight: "900", color: colors[i] }}>{s.n}</Text>
                </View>
                <View style={{ marginTop: 5 }}>
                  <Bar percent={(s.n / top) * 100} color={colors[i]} height={11} />
                </View>
              </View>
            ))}
          </Card>
          <StatRow>
            <Stat label="Conversion" value={`${data.conversion}%`} color={GREEN} sub="approved / (leads + interested)" />
            <Stat label="Not contacted" value={String(data.notContactedYet)} color={RED} sub="interested requests" />
          </StatRow>
          <StatRow>
            <Stat label="Follow-ups due" value={String(data.followUpsDueNow)} color={AMBER} sub="today or late" />
            <Stat label="Follow-ups done" value={String(data.followUpsDone)} color={GREEN} />
          </StatRow>

          <SectionTitle>Lead temperature</SectionTitle>
          <StatRow>
            <Stat label="Hot" value={String(data.leadMix.hot)} color={RED} />
            <Stat label="Warm" value={String(data.leadMix.warm)} color={AMBER} />
            <Stat label="Cold" value={String(data.leadMix.cold)} color={BLUE} />
          </StatRow>

          <SectionTitle>Interested requests</SectionTitle>
          <StatRow>
            <Stat label="Pending" value={String(data.interestedBy.pending)} color={AMBER} />
            <Stat label="Contacted" value={String(data.interestedBy.contacted)} color={BLUE} />
            <Stat label="Approved" value={String(data.interestedBy.approved)} color={GREEN} />
          </StatRow>

          <SectionTitle>Enrollment forms</SectionTitle>
          <StatRow>
            <Stat label="Pending" value={String(data.enrollBy.pending)} color={AMBER} />
            <Stat label="Approved" value={String(data.enrollBy.approved)} color={GREEN} />
            <Stat label="Rejected" value={String(data.enrollBy.rejected)} color={RED} />
          </StatRow>

          <SectionTitle>Best sources</SectionTitle>
          <Card>
            <Text style={{ fontWeight: "900", color: GREEN, marginBottom: 6 }}>Most leads added</Text>
            {data.bestLeadEmployees.length === 0 ? <Text style={{ color: MUTED }}>No leads in this period.</Text> : null}
            {data.bestLeadEmployees.map((e: any, i: number) => (
              <View key={e.name + i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ color: INK, flex: 1 }} numberOfLines={1}>{i + 1}. {e.name}</Text>
                <Text style={{ color: MUTED }}>{e.hot} hot · </Text>
                <Text style={{ fontWeight: "900", color: INK }}>{e.n}</Text>
              </View>
            ))}
            <Text style={{ fontWeight: "900", color: GREEN, marginTop: 14, marginBottom: 6 }}>Most enrollments</Text>
            {data.bestEnrollEmployees.length === 0 ? <Text style={{ color: MUTED }}>No enrollments in this period.</Text> : null}
            {data.bestEnrollEmployees.map((e: any, i: number) => (
              <View key={e.name + i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                <Text style={{ color: INK, flex: 1 }} numberOfLines={1}>{i + 1}. {e.name}</Text>
                <Text style={{ color: MUTED }}>{e.approved} approved · </Text>
                <Text style={{ fontWeight: "900", color: INK }}>{e.n}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </MoreScreen>
  );
}
