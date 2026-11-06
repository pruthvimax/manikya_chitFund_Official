import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Bar, Card, GOLD, GREEN, INK, MUTED, MoreScreen, SearchBox, SectionTitle, State, Stat, StatRow, short, useFetch } from "../../components/moreKit";

/* AUCTION INSIGHTS: how every group's auctions went (read only).
   discount % = winning bid / chit value. Numbers come from finished auctions
   (winner entered) and the group's dividends. */

type Trend = { n: number; date: string; pct: number; bid: number; winner: string };

function TrendBars({ trend, highestN }: { trend: Trend[]; highestN: number }) {
  const max = Math.max(1, ...trend.map((t) => t.pct));
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", height: 84, marginTop: 8 }}>
      {trend.map((t, i) => {
        const isHigh = t.n === highestN;
        const isLast = i === trend.length - 1;
        return (
          <View key={t.n} style={{ flex: 1, alignItems: "center", marginHorizontal: 4 }}>
            <Text style={{ fontSize: 10, color: MUTED, marginBottom: 2 }}>{t.pct}%</Text>
            <View
              style={{
                width: "100%",
                height: Math.max(6, (t.pct / max) * 56),
                borderRadius: 6,
                backgroundColor: isHigh ? GREEN : isLast ? GOLD : "#BFE3D0",
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

export default function AuctionInsights() {
  const [q, setQ] = useState("");
  const { data, loading, refreshing, error, reload } = useFetch<any>("/more/auction-insights");

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.items || []).filter(
      (g: any) => !s || String(g.groupId).toLowerCase().includes(s) || String(g.chitId).toLowerCase().includes(s)
    );
  }, [data, q]);

  const maxAvg = Math.max(1, ...(data?.items || []).map((g: any) => g.avgPct));

  return (
    <MoreScreen title="Auction Insights" subtitle="Discounts and winners by group" onRefresh={reload} refreshing={refreshing}>
      {data ? (
        <StatRow>
          <Stat label="Auctions done" value={String(data.overall.auctions)} />
          <Stat label="Avg discount" value={`${data.overall.avgPct}%`} color={GREEN} />
          <Stat label="Never bid" value={String(data.overall.neverBid)} color="#D97706" sub="members" />
        </StatRow>
      ) : null}
      <SearchBox value={q} onChange={setQ} placeholder="Search group or scheme" />
      <State loading={loading && !data} error={data ? "" : error} empty={!!data && items.length === 0} emptyText="No groups found." onRetry={reload} />

      {items.length > 0 ? <SectionTitle>Average discount</SectionTitle> : null}
      {items.map((g: any) => (
        <Card key={g.groupId} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: INK, fontSize: 16 }}>Group {g.groupId}</Text>
              <Text style={{ color: MUTED, fontSize: 11.5 }}>
                {g.chitId}
                {g.chitAmount ? ` · ${short(g.chitAmount)}` : ""} · {g.members} members · {g.auctions} auction{g.auctions === 1 ? "" : "s"} done
              </Text>
            </View>
            <Text style={{ fontWeight: "900", color: GREEN, fontSize: 18 }}>{g.auctions ? `${g.avgPct}%` : "—"}</Text>
          </View>
          <View style={{ marginTop: 8 }}>
            <Bar percent={g.auctions ? Math.min(100, (g.avgPct / maxAvg) * 100) : 0} color={GREEN} height={9} />
          </View>

          {g.trend && g.trend.length > 0 ? (
            <>
              <TrendBars trend={g.trend} highestN={g.highestAuction} />
              <Text style={{ color: MUTED, fontSize: 11, marginTop: 6 }}>
                Discount % of last {g.trend.length} auction{g.trend.length === 1 ? "" : "s"} · highest {g.highestPct}% (auction {g.highestAuction})
              </Text>
            </>
          ) : (
            <Text style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>No finished auction yet.</Text>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#EEF1EF" }}>
            <Text style={{ color: MUTED, fontSize: 12 }}>Dividend given {short(g.dividendGiven)}</Text>
            <Text style={{ color: MUTED, fontSize: 12 }}>Never bid {g.neverBid}</Text>
          </View>
        </Card>
      ))}
      <Text style={{ color: MUTED, fontSize: 11, textAlign: "center", marginTop: 14 }}>
        Discount % = winning bid ÷ chit value. Only finished auctions (winner entered) are counted.
      </Text>
    </MoreScreen>
  );
}
