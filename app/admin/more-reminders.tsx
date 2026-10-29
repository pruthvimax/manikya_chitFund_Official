import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  AMBER, Btn, Card, Chips, GREEN, INK, MUTED, MoreScreen, Pill, RED, SearchBox, State, Stat, StatRow,
  api, ask, callPhone, rupees, say, short, useFetch,
} from "../../components/moreKit";

/* REMINDER CENTRE: members with a pending / soon-due installment + one-tap push reminder */

type Row = {
  memberId: string; memberName: string; phone: string; groupId: string; groupMemberId: string;
  pending: number; overdue: number; dueSoon: number; status: "overdue" | "due-soon"; daysLate: number;
};

export default function Reminders() {
  const [days, setDays] = useState("3");
  const [tab, setTab] = useState<"all" | "overdue" | "due-soon">("all");
  const [grp, setGrp] = useState(""); // "" = all groups
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const { data, loading, refreshing, error, reload } = useFetch<any>(`/more/reminders?days=${days}`);

  const items: Row[] = useMemo(() => {
    const all: Row[] = data?.items || [];
    const s = q.trim().toLowerCase();
    return all.filter((r) => (!grp || r.groupId === grp) && (tab === "all" || r.status === tab) && (!s || r.memberName.toLowerCase().includes(s) || r.phone.includes(s) || r.groupId.toLowerCase().includes(s)));
  }, [data, tab, q, grp]);

  // groups that have someone to remind, with how many
  const groupOptions = useMemo(() => {
    const cnt: Record<string, number> = {};
    (data?.items || []).forEach((r: Row) => {
      cnt[r.groupId] = (cnt[r.groupId] || 0) + 1;
    });
    return [{ key: "", label: `All groups (${(data?.items || []).length})` }].concat(
      Object.keys(cnt)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((g) => ({ key: g, label: `Group ${g} (${cnt[g]})` }))
    );
  }, [data]);

  const ids = Object.keys(picked).filter((k) => picked[k]);
  const toggle = (id: string) => setPicked((p) => ({ ...p, [id]: !p[id] }));
  const pickAllShown = () => {
    const next: Record<string, boolean> = { ...picked };
    const allOn = items.every((i) => next[i.memberId]);
    items.forEach((i) => (next[i.memberId] = !allOn));
    setPicked(next);
  };

  const sendTo = (memberIds: string[], groupId: string) => {
    if (memberIds.length === 0) return say("Choose members", "Tick at least one member first.");
    const where = groupId ? ` for Group ${groupId}` : "";
    ask("Send reminder", `Send a phone notification${where} to ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}?`, "Send", async () => {
      setBusy(true);
      try {
        const r = await api("/more/reminders/send", "POST", { memberIds, days: Number(days), groupId });
        say("Sending", `${r.reachable} of ${r.selected} members have the app notifications on. The reminder is also saved on every selected member's bell page.`);
        setPicked({});
      } catch (e: any) {
        say("Could not send", e?.message || "Try again");
      } finally {
        setBusy(false);
      }
    });
  };

  const send = () => sendTo(ids, grp);
  // one tap: everybody shown in this group, no ticking
  const sendGroup = () => sendTo(Array.from(new Set(items.map((i) => i.memberId))), grp);

  return (
    <MoreScreen title="Reminder Centre" subtitle="Who needs a reminder" onRefresh={reload} refreshing={refreshing}>
      <Chips
        value={days}
        onChange={setDays}
        options={[
          { key: "0", label: "Overdue only" },
          { key: "3", label: "Due in 3 days" },
          { key: "7", label: "Due in 7 days" },
          { key: "15", label: "Due in 15 days" },
        ]}
      />
      {data ? (
        <StatRow>
          <Stat label="Overdue" value={String(data.overdueCount)} color={RED} />
          <Stat label="Due soon" value={String(data.dueSoonCount)} color={AMBER} />
          <Stat label="Amount" value={short(data.total)} color={GREEN} />
        </StatRow>
      ) : null}
      <Chips value={grp} onChange={(g) => { setGrp(g); setPicked({}); }} options={groupOptions} />
      {grp && items.length > 0 ? (
        <Btn label={`Send to all ${tab === "all" ? "" : tab === "overdue" ? "overdue " : "due-soon "}in Group ${grp} (${new Set(items.map((i) => i.memberId)).size})`} icon="send" onPress={sendGroup} busy={busy} />
      ) : null}
      <SearchBox value={q} onChange={setQ} placeholder="Search name, phone or group" />
      <Chips
        value={tab}
        onChange={setTab}
        options={[
          { key: "all", label: "All" },
          { key: "overdue", label: "Overdue" },
          { key: "due-soon", label: "Due soon" },
        ]}
      />
      <State loading={loading && !data} error={data ? "" : error} empty={!!data && items.length === 0} emptyText="No members to remind. All clear!" onRetry={reload} />
      {items.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <Btn label={items.every((i) => picked[i.memberId]) ? "Untick all shown" : "Tick all shown"} onPress={pickAllShown} kind="soft" small />
          </View>
          <View style={{ flex: 1 }}>
            <Btn label={`Send reminder (${ids.length})`} onPress={send} icon="notifications-active" busy={busy} disabled={ids.length === 0} small />
          </View>
        </View>
      ) : null}
      {items.slice(0, 200).map((r) => {
        const on = !!picked[r.memberId];
        return (
          <TouchableOpacity key={r.groupId + r.memberId} activeOpacity={0.85} onPress={() => toggle(r.memberId)}>
            <Card style={{ borderColor: on ? GREEN : "#EEF1EF", borderWidth: on ? 2 : 1, marginTop: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name={on ? "check-box" : "check-box-outline-blank"} size={22} color={on ? GREEN : "#9CA3AF"} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontWeight: "900", color: INK, fontSize: 14.5 }} numberOfLines={1}>{r.memberName}</Text>
                  <Text style={{ color: MUTED, fontSize: 11.5 }}>Group {r.groupId} · {r.groupMemberId}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "900", color: r.status === "overdue" ? RED : AMBER, fontSize: 15 }}>{rupees(r.pending)}</Text>
                  <Pill text={r.status === "overdue" ? `${r.daysLate} days late` : "Due soon"} color={r.status === "overdue" ? RED : AMBER} />
                </View>
              </View>
              {r.phone ? (
                <TouchableOpacity onPress={() => callPhone(r.phone)} style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                  <MaterialIcons name="call" size={15} color={GREEN} />
                  <Text style={{ color: GREEN, fontWeight: "800", marginLeft: 5, fontSize: 12.5 }}>{r.phone}</Text>
                </TouchableOpacity>
              ) : null}
            </Card>
          </TouchableOpacity>
        );
      })}
      {items.length > 200 ? <Text style={{ textAlign: "center", color: MUTED, marginTop: 10 }}>Showing 200 of {items.length}. Use search to narrow down.</Text> : null}
    </MoreScreen>
  );
}
