import { MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { AMBER, Btn, Card, Field, GREEN, INK, MUTED, MoreScreen, Pill, RED, SectionTitle, State, Stat, StatRow, api, ask, fmtDate, fmtDateTime, rupees, say, short, useFetch } from "../../components/moreKit";

/* CASH HANDOVER TRACKER: cash collected by each employee minus the cash handed to the office */

export default function Cash() {
  const { data, loading, refreshing, error, reload } = useFetch<any>("/more/cash");
  const [open, setOpen] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [startDate, setStartDate] = useState("");

  const refresh = () => reload();

  const save = async (e: any) => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return say("Enter amount", "Type the cash amount received from the employee.");
    setBusy(true);
    try {
      await api("/more/cash/handover", "POST", { empId: e.empId, empName: e.name, amount: amt, note });
      setAmount("");
      setNote("");
      setOpen("");
      refresh();
    } catch (err: any) {
      say("Could not save", err?.message || "Try again");
    } finally {
      setBusy(false);
    }
  };

  const remove = (h: any) =>
    ask("Delete this entry?", `${rupees(h.amount)} from ${h.empName || h.empId}`, "Delete", async () => {
      try {
        await api(`/more/cash/handover/${h._id}`, "DELETE");
        refresh();
      } catch (err: any) {
        say("Could not delete", err?.message || "Try again");
      }
    });

  const saveStart = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return say("Date", "Type the date like 2026-10-01 (year-month-day).");
    setBusy(true);
    try {
      await api("/more/cash/start", "POST", { date: startDate });
      setStartOpen(false);
      refresh();
    } catch (err: any) {
      say("Could not save", err?.message || "Try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <MoreScreen title="Cash Handover" subtitle={data ? `Counting from ${fmtDate(data.since + "T05:30:00+05:30")}` : "Cash held by employees"} onRefresh={reload} refreshing={refreshing}>
      <State loading={loading && !data} error={data ? "" : error} onRetry={reload} />
      {data ? (
        <>
          <StatRow>
            <Stat label="Cash collected" value={short(data.totalCash)} />
            <Stat label="Handed over" value={short(data.totalHanded)} color={GREEN} />
            <Stat label="Still with staff" value={short(data.totalHolding)} color={data.totalHolding > 0 ? RED : GREEN} />
          </StatRow>
          <View style={{ flexDirection: "row", marginTop: 10 }}>
            <Btn label="Change start date" icon="event" kind="soft" small onPress={() => { setStartDate(data.since); setStartOpen((v) => !v); }} />
          </View>
          {startOpen ? (
            <Card>
              <Text style={{ color: MUTED, fontSize: 12 }}>Cash before this date is ignored. Use the day you start tracking.</Text>
              <Field label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2026-10-01" />
              <View style={{ marginTop: 10 }}><Btn label="Save date" onPress={saveStart} busy={busy} small /></View>
            </Card>
          ) : null}

          <SectionTitle>Employees</SectionTitle>
          {data.items.length === 0 ? <State empty emptyText="No cash collected since the start date." /> : null}
          {data.items.map((e: any) => {
            const on = open === e.key;
            return (
              <Card key={e.key} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", color: INK, fontSize: 15 }} numberOfLines={1}>{e.name}</Text>
                    <Text style={{ color: MUTED, fontSize: 11.5 }}>Collected {rupees(e.cash)} · Handed {rupees(e.handed)}{e.lastHandover ? ` · last ${fmtDate(e.lastHandover)}` : ""}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "900", fontSize: 16, color: e.holding > 0 ? RED : GREEN }}>{rupees(e.holding)}</Text>
                    <Pill text={e.holding > 0 ? "with employee" : e.holding < 0 ? "extra handed" : "clear"} color={e.holding > 0 ? AMBER : GREEN} />
                  </View>
                </View>
                <View style={{ marginTop: 10 }}>
                  <Btn label={on ? "Close" : "Record handover"} icon={on ? "close" : "add"} kind={on ? "soft" : "solid"} small onPress={() => { setOpen(on ? "" : e.key); setAmount(e.holding > 0 ? String(Math.round(e.holding)) : ""); setNote(""); }} />
                </View>
                {on ? (
                  <View>
                    <Field label="Amount received (₹)" value={amount} onChangeText={setAmount} numeric placeholder="0" />
                    <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. handed to cashier" maxLength={200} />
                    <View style={{ marginTop: 12 }}><Btn label="Save handover" icon="check" onPress={() => save(e)} busy={busy} /></View>
                  </View>
                ) : null}
              </Card>
            );
          })}

          <SectionTitle>Handover history</SectionTitle>
          {data.history.length === 0 ? <State empty emptyText="No handovers recorded yet." /> : null}
          {data.history.length > 0 ? (
            <Card>
              {data.history.map((h: any, i: number) => (
                <View key={h._id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: "#EEF1EF" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: INK }}>{rupees(h.amount)} · {h.empName || h.empId}</Text>
                    <Text style={{ color: MUTED, fontSize: 11 }}>{fmtDateTime(h.at)}{h.note ? ` · ${h.note}` : ""}</Text>
                  </View>
                  <TouchableOpacity onPress={() => remove(h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <MaterialIcons name="delete-outline" size={21} color={RED} />
                  </TouchableOpacity>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </MoreScreen>
  );
}
