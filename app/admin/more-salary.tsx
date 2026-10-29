import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Btn, Card, Field, GREEN, INK, MUTED, MonthBar, MoreScreen, Pill, RED, SearchBox, State, Stat, StatRow, api, monthKey, rupees, say, shareText, short, useFetch } from "../../components/moreKit";

/* SALARY & INCENTIVE SHEET: base salary + (collected x %) + bonus - deduction, per employee per month */

type Draft = { base: string; pct: string; bonus: string; ded: string; note: string };

export default function Salary() {
  const [month, setMonth] = useState(() => new Date());
  const [q, setQ] = useState("");
  const [open, setOpen] = useState("");
  const [draft, setDraft] = useState<Draft>({ base: "", pct: "", bonus: "", ded: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [pctOpen, setPctOpen] = useState(false);
  const [defPct, setDefPct] = useState("");
  const { data, loading, refreshing, error, reload } = useFetch<any>(`/more/salary?month=${monthKey(month)}`);

  useEffect(() => setOpen(""), [month]);

  const items = (data?.items || []).filter((e: any) => !q.trim() || e.name.toLowerCase().includes(q.trim().toLowerCase()) || String(e.empId).toLowerCase().includes(q.trim().toLowerCase()));

  const edit = (e: any) => {
    if (open === e.empId) return setOpen("");
    setOpen(e.empId);
    setDraft({ base: String(e.baseSalary || ""), pct: String(e.incentivePercent ?? ""), bonus: String(e.bonus || ""), ded: String(e.deduction || ""), note: e.note || "" });
  };

  const save = async (e: any, paid?: boolean) => {
    setBusy(true);
    try {
      await api("/more/salary", "POST", {
        empId: e.empId,
        month: monthKey(month),
        baseSalary: Number(draft.base) || 0,
        incentivePercent: Number(draft.pct) || 0,
        bonus: Number(draft.bonus) || 0,
        deduction: Number(draft.ded) || 0,
        note: draft.note,
        ...(typeof paid === "boolean" ? { paid } : {}),
      });
      setOpen("");
      reload();
    } catch (err: any) {
      say("Could not save", err?.message || "Try again");
    } finally {
      setBusy(false);
    }
  };

  const togglePaid = async (e: any) => {
    try {
      await api("/more/salary", "POST", {
        empId: e.empId,
        month: monthKey(month),
        baseSalary: e.baseSalary,
        incentivePercent: e.incentivePercent,
        bonus: e.bonus,
        deduction: e.deduction,
        note: e.note,
        paid: !e.paid,
      });
      reload();
    } catch (err: any) {
      say("Could not save", err?.message || "Try again");
    }
  };

  const saveDefault = async () => {
    try {
      await api("/more/salary/default", "POST", { percent: Number(defPct) || 0 });
      setPctOpen(false);
      reload();
    } catch (err: any) {
      say("Could not save", err?.message || "Try again");
    }
  };

  const sheetText = () =>
    [
      `Manikya Chits - Salary sheet ${monthKey(month)}`,
      ...(data?.items || []).filter((e: any) => e.status === "active" || e.saved).map((e: any) => `${e.name}: ${rupees(e.net)} (base ${rupees(e.baseSalary)} + incentive ${rupees(e.incentive)}${e.bonus ? ` + bonus ${rupees(e.bonus)}` : ""}${e.deduction ? ` - ${rupees(e.deduction)}` : ""})${e.paid ? " PAID" : ""}`),
      `Total: ${rupees(data?.totalNet || 0)}`,
    ].join("\n");

  return (
    <MoreScreen title="Salary & Incentive" subtitle="Monthly sheet" onRefresh={reload} refreshing={refreshing}>
      <MonthBar value={month} onChange={setMonth} />
      {data ? (
        <>
          <StatRow>
            <Stat label="Total payable" value={short(data.totalNet)} color={GREEN} />
            <Stat label="Paid" value={short(data.totalPaid)} />
            <Stat label="Default %" value={`${data.defaultPercent}%`} sub="of collection" />
          </StatRow>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <View style={{ flex: 1 }}><Btn label="Change default %" icon="percent" kind="soft" small onPress={() => { setDefPct(String(data.defaultPercent)); setPctOpen((v) => !v); }} /></View>
            <View style={{ flex: 1 }}><Btn label="Share sheet" icon="share" small onPress={() => shareText(sheetText())} /></View>
          </View>
          {pctOpen ? (
            <Card>
              <Text style={{ color: MUTED, fontSize: 12 }}>Used for any employee whose salary line is not saved yet this month.</Text>
              <Field label="Incentive % of collection" value={defPct} onChangeText={setDefPct} numeric placeholder="1" />
              <View style={{ marginTop: 10 }}><Btn label="Save" onPress={saveDefault} small /></View>
            </Card>
          ) : null}
        </>
      ) : null}
      <SearchBox value={q} onChange={setQ} placeholder="Search employee" />
      <State loading={loading && !data} error={data ? "" : error} empty={!!data && items.length === 0} emptyText="No employees found." onRetry={reload} />
      {items.map((e: any) => {
        const on = open === e.empId;
        const live = on
          ? (e.collected * (Number(draft.pct) || 0)) / 100 + (Number(draft.base) || 0) + (Number(draft.bonus) || 0) - (Number(draft.ded) || 0)
          : e.net;
        return (
          <Card key={e.empId} style={{ marginTop: 10, opacity: e.status === "inactive" && !e.saved ? 0.6 : 1 }}>
            <TouchableOpacity activeOpacity={0.85} onPress={() => edit(e)}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", color: INK, fontSize: 15 }} numberOfLines={1}>{e.name}</Text>
                  <Text style={{ color: MUTED, fontSize: 11.5 }}>{e.empId} · collected {rupees(e.collected)} ({e.payments} payments)</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontWeight: "900", fontSize: 16, color: GREEN }}>{rupees(live)}</Text>
                  <Pill text={e.paid ? "Paid" : e.saved ? "Saved" : "Not saved"} color={e.paid ? GREEN : e.saved ? "#2563EB" : "#D97706"} />
                </View>
              </View>
              <Text style={{ color: MUTED, fontSize: 11.5, marginTop: 6 }}>
                Base {rupees(e.baseSalary)} + incentive {rupees(e.incentive)} ({e.incentivePercent}%){e.bonus ? ` + bonus ${rupees(e.bonus)}` : ""}{e.deduction ? ` − ${rupees(e.deduction)}` : ""}
              </Text>
            </TouchableOpacity>
            {on ? (
              <View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field style={{ flex: 1 }} label="Base salary (₹)" value={draft.base} onChangeText={(t) => setDraft({ ...draft, base: t })} numeric />
                  <Field style={{ flex: 1 }} label="Incentive %" value={draft.pct} onChangeText={(t) => setDraft({ ...draft, pct: t })} numeric />
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field style={{ flex: 1 }} label="Bonus (₹)" value={draft.bonus} onChangeText={(t) => setDraft({ ...draft, bonus: t })} numeric />
                  <Field style={{ flex: 1 }} label="Deduction (₹)" value={draft.ded} onChangeText={(t) => setDraft({ ...draft, ded: t })} numeric />
                </View>
                <Field label="Note (optional)" value={draft.note} onChangeText={(t) => setDraft({ ...draft, note: t })} maxLength={200} />
                <View style={{ marginTop: 12 }}><Btn label="Save salary line" icon="check" onPress={() => save(e)} busy={busy} /></View>
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                <Btn label={e.paid ? "Mark as not paid" : "Mark as paid"} icon={e.paid ? "undo" : "done-all"} kind={e.paid ? "outline" : "soft"} color={e.paid ? RED : GREEN} small disabled={!e.saved} onPress={() => togglePaid(e)} />
                {!e.saved ? <Text style={{ color: MUTED, fontSize: 11, marginTop: 4 }}>Tap the card and save the salary line first.</Text> : null}
              </View>
            )}
          </Card>
        );
      })}
    </MoreScreen>
  );
}
