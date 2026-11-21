import React, { useState } from "react";
import { Text, View } from "react-native";
import { AMBER, Card, Chips, GREEN, INK, MUTED, MoreScreen, Pill, SearchBox, SectionTitle, State, Stat, StatRow, fmtDate, rupees, short, useFetch } from "../../components/moreKit";

/* ADVANCE / EXTRA AMOUNT: every extra amount a member paid, which group it belongs to,
   and when it was (or will be) added as installment. */

type Filter = "waiting" | "applied" | "all";

export default function AdvancePage() {
  const { data, loading, refreshing, error, reload } = useFetch<any>("/advance?status=all");
  const [filter, setFilter] = useState<Filter>("waiting");
  const [q, setQ] = useState("");

  const all: any[] = data?.items || [];
  const needle = q.trim().toLowerCase();

  const items = all.filter((a) => {
    if (filter === "waiting" && !(a.remaining > 0)) return false;
    if (filter === "applied" && !(a.remaining <= 0)) return false;
    if (!needle) return true;
    return [a.memberName, a.groupId, a.employeeName, a.userid].some((v) => String(v || "").toLowerCase().includes(needle));
  });

  return (
    <MoreScreen title="Advance / Extra" subtitle="Extra amounts paid by members" onRefresh={reload} refreshing={refreshing}>
      <State loading={loading && !data} error={data ? "" : error} onRetry={reload} />
      {data ? (
        <>
          <StatRow>
            <Stat label="Waiting" value={short(data.held)} color={data.held > 0 ? AMBER : GREEN} sub={`${data.waitingCount} entries`} />
            <Stat label="Added this month" value={short(data.appliedThisMonth)} color={GREEN} />
            <Stat label="Members" value={String(data.members || 0)} />
          </StatRow>

          {data.byEmployee && data.byEmployee.length > 0 ? (
            <>
              <SectionTitle>Advance cash held by employees</SectionTitle>
              <Card>
                {data.byEmployee.map((e: any, i: number) => (
                  <View key={`${e.id}_${i}`} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: "#EEF1EF" }}>
                    <Text style={{ flex: 1, fontWeight: "800", color: INK }} numberOfLines={1}>{e.name}</Text>
                    <Text style={{ fontWeight: "900", color: AMBER }}>{rupees(e.held)}</Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <Chips<Filter>
            options={[
              { key: "waiting", label: "Waiting" },
              { key: "applied", label: "History" },
              { key: "all", label: "All" },
            ]}
            value={filter}
            onChange={setFilter}
          />
          <SearchBox value={q} onChange={setQ} placeholder="Search member, group or employee" />

          {items.length === 0 ? <State empty emptyText={filter === "waiting" ? "No advance waiting. Added ones are in History." : "No advance entries here."} /> : null}
          {items.map((a) => {
            const done = a.remaining <= 0;
            const partial = !done && a.applied && a.applied.length > 0;
            const label = done ? "Added" : partial ? "Part added" : "Waiting";
            const color = done ? GREEN : AMBER;
            return (
              <Card key={a.id} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: INK, fontSize: 15 }} numberOfLines={1}>{a.memberName}</Text>
                    <Text style={{ color: MUTED, fontSize: 11.5 }}>Group {a.groupId} · paid after month {a.afterMonth}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "900", fontSize: 16, color: INK }}>{rupees(a.amount)}</Text>
                    <Pill text={label} color={color} />
                  </View>
                </View>

                <Text style={{ color: MUTED, fontSize: 11.5, marginTop: 8 }}>
                  Collected by {a.employeeName || "-"}{a.paymentMode ? ` · ${a.paymentMode}` : ""} · {fmtDate(a.paidAt)}
                </Text>

                {!done ? (
                  <Text style={{ color: AMBER, fontSize: 12, fontWeight: "800", marginTop: 6 }}>
                    {rupees(a.remaining)} will be added to Month {a.nextMonth} automatically when you add that month's collection.
                  </Text>
                ) : null}

                {a.applied && a.applied.length > 0
                  ? a.applied.map((x: any, i: number) => (
                      <Text key={i} style={{ color: GREEN, fontSize: 12, fontWeight: "800", marginTop: 4 }}>
                        {rupees(x.amount)} added to Month {x.monthIndex}{x.at ? ` · ${fmtDate(x.at)}` : ""}
                      </Text>
                    ))
                  : null}
              </Card>
            );
          })}
        </>
      ) : null}
    </MoreScreen>
  );
}
