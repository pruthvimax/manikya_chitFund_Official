import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Bar, BLUE, Btn, Card, GREEN, INK, MUTED, MoreScreen, SectionTitle, State, Stat, StatRow, fmtDate, rupees, shareText, sharePdf, short, useFetch, ymd } from "../../components/moreKit";

/* DAILY CLOSING REPORT: one day's money, leads and enrollments, shareable as text */

export default function Closing() {
  const [day, setDay] = useState(() => new Date());
  const key = ymd(day);
  const isToday = key === ymd(new Date());
  const { data, loading, refreshing, error, reload } = useFetch<any>(`/more/closing?date=${key}`);

  const step = (n: number) => {
    const d = new Date(day.getFullYear(), day.getMonth(), day.getDate() + n);
    if (d > new Date()) return;
    setDay(d);
  };
  const topEmp = Math.max(1, ...((data?.employees || []).map((e: any) => e.amount)));

  return (
    <MoreScreen title="Daily Closing Report" subtitle={fmtDate(key + "T05:30:00+05:30")} onRefresh={reload} refreshing={refreshing}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#EEF1EF", padding: 6 }}>
        <TouchableOpacity onPress={() => step(-1)} style={{ padding: 8 }}>
          <MaterialIcons name="chevron-left" size={26} color={GREEN} />
        </TouchableOpacity>
        <Text style={{ fontSize: 15, fontWeight: "900", color: INK }}>{isToday ? "Today" : fmtDate(key + "T05:30:00+05:30")}</Text>
        <TouchableOpacity onPress={() => step(1)} disabled={isToday} style={{ padding: 8, opacity: isToday ? 0.25 : 1 }}>
          <MaterialIcons name="chevron-right" size={26} color={GREEN} />
        </TouchableOpacity>
      </View>
      <State loading={loading && !data} error={data ? "" : error} onRetry={reload} />
      {data ? (
        <>
          <StatRow>
            <Stat label="Collected" value={rupees(data.total)} color={GREEN} sub={`${data.count} payments`} flex={1.4} />
            <Stat label="Penalty" value={rupees(data.penalty)} color="#D97706" />
          </StatRow>
          <StatRow>
            {Object.keys(data.modes || {}).length === 0 ? <Stat label="Modes" value="—" /> : null}
            {Object.keys(data.modes || {}).map((m) => (
              <Stat key={m} label={m} value={short(data.modes[m])} color={BLUE} />
            ))}
          </StatRow>

          <SectionTitle>By employee</SectionTitle>
          <Card>
            {(data.employees || []).length === 0 ? <Text style={{ color: MUTED }}>No collection on this day.</Text> : null}
            {(data.employees || []).map((e: any, i: number) => (
              <View key={e.name + i} style={{ marginTop: i ? 12 : 0 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontWeight: "800", color: INK, flex: 1 }} numberOfLines={1}>{e.name}</Text>
                  <Text style={{ fontWeight: "900", color: GREEN }}>{rupees(e.amount)}</Text>
                </View>
                <View style={{ marginTop: 5 }}>
                  <Bar percent={(e.amount / topEmp) * 100} />
                </View>
                <Text style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>{e.count} payments · cash {rupees(e.cash)}</Text>
              </View>
            ))}
          </Card>

          <SectionTitle>Leads & enrollments</SectionTitle>
          <StatRow>
            <Stat label="New leads" value={String(data.leads)} />
            <Stat label="Follow-ups done" value={String(data.followUpsDone)} color={GREEN} />
          </StatRow>
          <StatRow>
            <Stat label="Enrollments" value={String(data.enrollments)} sub={`${data.enrollApproved} approved`} />
            <Stat label="New interested" value={String(data.newInterested)} />
          </StatRow>
          {(data.leadsByEmp || []).length > 0 ? (
            <Card>
              <Text style={{ fontWeight: "900", color: GREEN, marginBottom: 6 }}>Leads by employee</Text>
              {data.leadsByEmp.map((l: any, i: number) => (
                <View key={l.name + i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                  <Text style={{ color: INK }}>{l.name}</Text>
                  <Text style={{ fontWeight: "900", color: INK }}>{l.n}</Text>
                </View>
              ))}
            </Card>
          ) : null}
          {data.leavesPending > 0 ? <Text style={{ color: "#D97706", fontWeight: "800", marginTop: 12 }}>{data.leavesPending} leave request(s) waiting for approval</Text> : null}

          <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}><Btn label="Share this report" icon="share" onPress={() => shareText(data.text)} /></View>
            <View style={{ flex: 1 }}><Btn label="Download PDF" icon="picture-as-pdf" kind="outline" onPress={() => sharePdf("Daily Closing Report", data.text)} /></View>
          </View>
        </>
      ) : null}
    </MoreScreen>
  );
}
