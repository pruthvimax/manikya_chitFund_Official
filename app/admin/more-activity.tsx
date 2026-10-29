import { MaterialIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Card, Chips, GREEN, INK, MUTED, MoreScreen, State, fmtDateTime, useFetch } from "../../components/moreKit";

/* ACTIVITY LOG: a timeline built from payments, enrollments, leads, leave requests, bids... */

const META: Record<string, { icon: any; color: string; label: string }> = {
  payment: { icon: "payments", color: "#16A34A", label: "Payments" },
  enrollment: { icon: "assignment-ind", color: "#2563EB", label: "Enrollments" },
  interest: { icon: "person-add", color: "#DB2777", label: "Interested" },
  lead: { icon: "whatshot", color: "#EA580C", label: "Leads" },
  leave: { icon: "beach-access", color: "#7C3AED", label: "Leave" },
  bid: { icon: "gavel", color: "#CA8A04", label: "Bids" },
  notice: { icon: "campaign", color: "#0891B2", label: "Auctions" },
};

export default function Activity() {
  const [days, setDays] = useState("3");
  const [type, setType] = useState("all");
  const { data, loading, refreshing, error, reload } = useFetch<any>(`/more/activity?days=${days}`);

  const items = useMemo(() => (data?.items || []).filter((x: any) => type === "all" || x.type === type), [data, type]);
  const opts = [{ key: "all", label: `All${data ? ` (${data.total})` : ""}` }].concat(
    Object.keys(META).map((k) => ({ key: k, label: `${META[k].label}${data?.counts?.[k] ? ` (${data.counts[k]})` : ""}` }))
  );

  return (
    <MoreScreen title="Activity Log" subtitle="What happened lately" onRefresh={reload} refreshing={refreshing}>
      <Chips
        value={days}
        onChange={setDays}
        options={[
          { key: "1", label: "Last 24 hours" },
          { key: "3", label: "3 days" },
          { key: "7", label: "7 days" },
          { key: "30", label: "30 days" },
        ]}
      />
      <Chips value={type} onChange={setType} options={opts} />
      <State loading={loading && !data} error={data ? "" : error} empty={!!data && items.length === 0} emptyText="No activity in this period." onRetry={reload} />
      {items.map((x: any, i: number) => {
        const m = META[x.type] || META.notice;
        return (
          <Card key={i} style={{ marginTop: 8, paddingVertical: 11 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: m.color + "1A", alignItems: "center", justifyContent: "center" }}>
                <MaterialIcons name={m.icon} size={19} color={m.color} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontWeight: "800", color: INK, fontSize: 13.5 }} numberOfLines={1}>
                  {x.title}
                  {x.who ? <Text style={{ color: GREEN }}>  · {x.who}</Text> : null}
                </Text>
                <Text style={{ color: MUTED, fontSize: 11.5 }} numberOfLines={1}>{x.sub}</Text>
              </View>
              <Text style={{ color: MUTED, fontSize: 10.5, marginLeft: 6, textAlign: "right" }}>{fmtDateTime(x.at)}</Text>
            </View>
          </Card>
        );
      })}
      {data && data.total > (data.items || []).length ? (
        <Text style={{ textAlign: "center", color: MUTED, marginTop: 10 }}>Showing the latest {data.items.length} of {data.total}.</Text>
      ) : null}
    </MoreScreen>
  );
}
