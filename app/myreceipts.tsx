import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Platform, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { navPad } from "../components/memberDesign";
import { BRAND, INK, MUTED, MemberData, MonthRow, RED, dateText, esc, inr, loadMemberData, pdfPage, savePdf } from "../components/memberLedgers";

/* MY RECEIPTS: every payment the member made (all groups) with a PDF for one payment or the whole statement.
   Read only: nothing is changed or saved. */

type Rec = {
  key: string;
  groupId: string;
  groupMemberId: string;
  month: number;
  amount: number;
  type: string; // Installment | Penalty
  paidAt: any;
  mode: string;
  by: string;
  phone: string;
  row: MonthRow; // the month this payment belongs to (for the totals printed on the receipt)
};

const timeText = (v: any) => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const PAGE = 25;

/* The receipt shows the same lines, in the same order, as the employee's Payment Receipt
   (Member ID, Month, Due Date, Installment, Paid Today, Pending Installment, TOTAL DUE, Payment Mode, Collected By). */
const COMPANY = "MANIKYA CHITS PVT LTD";
const ADDRESS = "#102 Shri Siddivinayaka Complex, In Front of Government Hospital, JC Road, Sagara, Shivamogga, Karnataka - 577401";
const PHONE = "+91 7259201729";

type Line = { label: string; value: string; strong?: boolean };

const receiptSections = (r: Rec): Line[][] => {
  const m = r.row;
  const pendingInst = m.pendingInstallment + m.pendingPenalty; // penalty is shown inside Pending Installment, as on the employee receipt
  const paidToday: Line[] = [];
  if (r.type === "Installment") paidToday.push({ label: "Paid Today (Inst)", value: inr(r.amount) });
  else paidToday.push({ label: "Paid Today (Penalty)", value: inr(r.amount) });
  if (pendingInst > 0) paidToday.push({ label: "Pending Installment", value: inr(pendingInst), strong: true });
  return [
    [
      { label: "Member ID", value: r.groupMemberId || "-" },
      { label: "Group", value: r.groupId },
      { label: "Month", value: `M${r.month}` },
      { label: "Due Date", value: dateText(m.dueDate) },
    ],
    [{ label: "Installment", value: inr(m.installment) }],
    paidToday,
    [{ label: "TOTAL DUE", value: inr(m.due), strong: true }],
    [
      { label: "Payment Mode", value: r.mode || "-" },
      { label: "Collected By", value: r.by + (r.phone ? ` (${r.phone})` : "") },
    ],
  ];
};

const receiptHtml = (r: Rec, who: string) => {
  const secs = receiptSections(r)
    .map(
      (sec) =>
        `<table style="width:100%; border-collapse:collapse; border-top:1px dashed #94A3B8; margin:6px 0;">${sec
          .map(
            (l) =>
              `<tr style="font-size:${l.strong ? 15 : 13.5}px; ${l.strong ? "font-weight:bold; color:#024e32;" : "color:#334155;"}"><td style="padding:4px 0; text-align:left;">${esc(l.label)}</td><td style="padding:4px 0; font-weight:bold; text-align:right;">${esc(l.value)}</td></tr>`
          )
          .join("")}</table>`
    )
    .join("");
  const when = `${dateText(r.paidAt)}${timeText(r.paidAt) ? " | " + timeText(r.paidAt) : ""}`;
  return `<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0; padding:24px; background:#EEF3F0; font-family: Arial, Helvetica, sans-serif;">
<div style="max-width:380px; margin:0 auto; background:#FFFFFF; border-radius:16px; overflow:hidden; border:1px solid #D7E5DD;">
<div style="background:#024e32; color:#FFFFFF; text-align:center; padding:20px 16px 16px;">
<div style="font-size:18px; font-weight:bold; letter-spacing:1px;">${esc(COMPANY)}</div>
<div style="font-size:9px; opacity:.85; margin-top:5px; line-height:1.4;">${esc(ADDRESS)}</div>
<div style="font-size:10px; opacity:.9; margin-top:3px;">Ph: ${esc(PHONE)}</div>
<div style="display:inline-block; margin-top:12px; background:#D4AF37; color:#1F2937; font-size:11px; font-weight:bold; padding:4px 14px; border-radius:99px; letter-spacing:1px;">PAYMENT RECEIPT</div>
</div>
<div style="text-align:center; padding:18px 16px 6px;">
<div style="width:46px; height:46px; line-height:46px; border-radius:50%; background:#DCFCE7; color:#16A34A; font-size:26px; margin:0 auto; font-weight:bold;">&#10003;</div>
<div style="font-size:30px; font-weight:bold; color:#0F172A; margin-top:8px;">${esc(inr(r.amount))}</div>
<div style="font-size:12px; color:#16A34A; font-weight:bold; margin-top:2px;">Payment received</div>
<div style="font-size:12px; color:#475569; margin-top:8px; font-weight:bold;">Date: ${esc(when)}</div>
<div style="font-size:12px; color:#64748B; margin-top:2px;">${esc(who)}</div>
</div>
<div style="padding:4px 20px 6px;">${secs}</div>
<div style="text-align:center; padding:12px 16px 18px; background:#F8FAFC; border-top:1px dashed #94A3B8;">
<div style="font-size:14px; font-weight:bold; color:#024e32;">Thank you</div>
<div style="font-size:10px; color:#64748B; margin-top:5px;">Computer generated receipt · No signature required</div>
</div>
</div></body></html>`;
};

export default function MyReceipts() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [group, setGroup] = useState("ALL");
  const [shown, setShown] = useState(PAGE);
  const [note, setNote] = useState("");

  const load = useCallback(async (force = false) => {
    try {
      setFailed(false);
      const d = await loadMemberData(force);
      if (!d) return router.replace("/");
      setData(d);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const all: Rec[] = useMemo(() => {
    const out: Rec[] = [];
    (data?.groups || []).forEach((g) =>
      g.rows.forEach((r) =>
        r.payments.forEach((p: any, i: number) => {
          if (p.paymentType === "DIVIDEND") return; // a dividend is not a payment
          const amount = Number(p.amount) || 0;
          if (amount <= 0) return;
          out.push({
            key: `${g.groupId}_${g.groupMemberId}_${r.monthIndex}_${i}`,
            groupId: g.groupId,
            groupMemberId: g.groupMemberId,
            month: r.monthIndex,
            amount,
            type: p.paymentType === "PENALTY" ? "Penalty" : "Installment",
            paidAt: p.paidAt,
            mode: String(p.paymentMode || "").trim(),
            // same as the employee Payment History card: collectedBy, "System" when empty
            by: String(p.collectedBy || "System").trim(),
            phone: String(p.employeePhone || "").trim(),
            row: r,
          });
        })
      )
    );
    return out.sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime());
  }, [data]);

  const codes = useMemo(() => Array.from(new Set((data?.groups || []).map((g) => g.groupId))), [data]);
  const list = group === "ALL" ? all : all.filter((r) => r.groupId === group);
  const total = list.reduce((s, r) => s + r.amount, 0);

  const who = data?.name || "";

  const [open, setOpen] = useState<Rec | null>(null);

  const receiptPdf = async (r: Rec) => {
    setNote((await savePdf(receiptHtml(r, who), `Receipt ${r.groupId} month ${r.month}`)) || "");
  };

  const statementPdf = async () => {
    const rows = list
      .map(
        (r) => `<tr>
<td style="padding:6px 8px; border-bottom:1px solid #E2E8F0;">${esc(dateText(r.paidAt))}</td>
<td style="padding:6px 8px; border-bottom:1px solid #E2E8F0;">${esc(r.groupId)}</td>
<td style="padding:6px 8px; border-bottom:1px solid #E2E8F0;">${r.month}</td>
<td style="padding:6px 8px; border-bottom:1px solid #E2E8F0;">${esc(r.type)}</td>
<td style="padding:6px 8px; border-bottom:1px solid #E2E8F0;">${esc(r.mode || "-")}</td>
<td style="padding:6px 8px; border-bottom:1px solid #E2E8F0;">${esc(r.by)}</td>
<td style="padding:6px 8px; border-bottom:1px solid #E2E8F0; text-align:right; font-weight:bold;">${esc(inr(r.amount))}</td></tr>`
      )
      .join("");
    const body = `<table style="width:100%; border-collapse:collapse; font-size:12.5px;">
<tr style="background:#F1F5F9; text-align:left;"><th style="padding:7px 8px;">Date</th><th style="padding:7px 8px;">Group</th><th style="padding:7px 8px;">Month</th><th style="padding:7px 8px;">Type</th><th style="padding:7px 8px;">Mode</th><th style="padding:7px 8px;">Collected by</th><th style="padding:7px 8px; text-align:right;">Amount</th></tr>
${rows}
<tr><td colspan="6" style="padding:10px 8px; font-weight:bold; text-align:right;">Total paid</td><td style="padding:10px 8px; font-weight:bold; text-align:right;">${esc(inr(total))}</td></tr>
</table>`;
    setNote(
      (await savePdf(
        pdfPage("Payment Statement", `${who}${group === "ALL" ? " · all groups" : " · Group " + group}`, body),
        "Payment statement"
      )) || ""
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
      <StatusBar barStyle="light-content" />
      <View style={{ backgroundColor: BRAND, paddingTop: (Platform.OS === "web" ? 14 : insets.top) + 10, paddingBottom: 18, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/menu"))} style={{ padding: 4, marginRight: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "900" }}>My Receipts</Text>
            <Text style={{ color: "#BFE3D1", fontSize: 12, marginTop: 1 }}>Every payment you made, with PDF</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: navPad(30) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={BRAND} />}
      >
        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: "center" }}>
            <ActivityIndicator color={BRAND} />
          </View>
        ) : failed && !data ? (
          <TouchableOpacity onPress={() => { setLoading(true); load(true); }} style={{ padding: 30, alignItems: "center" }}>
            <Text style={{ color: RED, fontWeight: "800" }}>Could not load. Tap to try again.</Text>
          </TouchableOpacity>
        ) : all.length === 0 ? (
          <Text style={{ color: MUTED, textAlign: "center", marginTop: 50 }}>No payments are recorded yet.</Text>
        ) : (
          <>
            {codes.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {["ALL", ...codes].map((c) => {
                  const on = group === c;
                  return (
                    <TouchableOpacity
                      key={c}
                      onPress={() => { setGroup(c); setShown(PAGE); }}
                      style={{ paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, marginRight: 8, backgroundColor: on ? BRAND : "#FFFFFF", borderWidth: 1, borderColor: on ? BRAND : "#DDE5E0" }}
                    >
                      <Text style={{ fontWeight: "800", fontSize: 12.5, color: on ? "#FFFFFF" : INK }}>{c === "ALL" ? "All groups" : c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : null}

            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10.5, fontWeight: "800", color: MUTED }}>TOTAL PAID ({list.length} PAYMENTS)</Text>
                <Text style={{ fontSize: 22, fontWeight: "900", color: INK, marginTop: 2 }}>{inr(total)}</Text>
              </View>
              <TouchableOpacity onPress={statementPdf} style={{ backgroundColor: BRAND, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center" }}>
                <MaterialIcons name="picture-as-pdf" size={17} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 12.5, marginLeft: 5 }}>Statement PDF</Text>
              </TouchableOpacity>
            </View>
            {note ? <Text style={{ color: RED, fontSize: 12, marginTop: 8 }}>{note}</Text> : null}

            {list.slice(0, shown).map((r) => (
              <View key={r.key} style={{ backgroundColor: "#FFFFFF", borderRadius: 14, padding: 13, marginTop: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "900", color: INK, fontSize: 14 }}>Group {r.groupId} · Month {r.month}</Text>
                  <View style={{ backgroundColor: r.type === "Penalty" ? "#FEF3C7" : "#DCFCE7", borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 }}>
                    <Text style={{ fontWeight: "900", fontSize: 12, color: r.type === "Penalty" ? "#92400E" : "#166534" }}>{inr(r.amount)}</Text>
                  </View>
                </View>
                <Text style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
                  {dateText(r.paidAt)}{timeText(r.paidAt) ? `, ${timeText(r.paidAt)}` : ""} · {r.type}
                  {r.mode ? ` · ${r.mode}` : ""}
                  {r.by ? ` · ${r.by}` : ""}
                </Text>
                <View style={{ flexDirection: "row", gap: 18, marginTop: 8 }}>
                  <TouchableOpacity onPress={() => setOpen(r)} style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons name="receipt-long" size={16} color={BRAND} />
                    <Text style={{ marginLeft: 4, color: BRAND, fontWeight: "800", fontSize: 12.5 }}>View receipt</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => receiptPdf(r)} style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialIcons name="picture-as-pdf" size={16} color={BRAND} />
                    <Text style={{ marginLeft: 4, color: BRAND, fontWeight: "800", fontSize: 12.5 }}>PDF</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {list.length > shown ? (
              <TouchableOpacity onPress={() => setShown((n) => n + PAGE)} style={{ alignItems: "center", paddingVertical: 14 }}>
                <Text style={{ color: BRAND, fontWeight: "900" }}>Show more ({list.length - shown} left)</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
      <Modal visible={!!open} transparent animationType="slide" onRequestClose={() => setOpen(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "center", padding: 16 }}>
          {open ? (
            <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, overflow: "hidden", maxHeight: "92%", width: "100%", maxWidth: 420, alignSelf: "center" }}>
              <ScrollView>
                <View style={{ backgroundColor: BRAND, alignItems: "center", paddingTop: 20, paddingBottom: 16, paddingHorizontal: 16 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "900", letterSpacing: 1 }}>{COMPANY}</Text>
                  <Text style={{ color: "#CDE8DA", fontSize: 9.5, textAlign: "center", marginTop: 5, lineHeight: 14 }}>{ADDRESS}</Text>
                  <Text style={{ color: "#CDE8DA", fontSize: 10.5, marginTop: 3 }}>Ph: {PHONE}</Text>
                  <View style={{ backgroundColor: "#D4AF37", borderRadius: 99, paddingHorizontal: 14, paddingVertical: 4, marginTop: 12 }}>
                    <Text style={{ color: "#1F2937", fontWeight: "900", fontSize: 11, letterSpacing: 1 }}>PAYMENT RECEIPT</Text>
                  </View>
                </View>
                <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 6, paddingHorizontal: 16 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#DCFCE7", alignItems: "center", justifyContent: "center" }}>
                    <MaterialIcons name="check" size={28} color="#16A34A" />
                  </View>
                  <Text style={{ fontSize: 30, fontWeight: "900", color: INK, marginTop: 8 }}>{inr(open.amount)}</Text>
                  <Text style={{ color: "#16A34A", fontWeight: "800", fontSize: 12.5, marginTop: 2 }}>Payment received</Text>
                  <Text style={{ color: "#475569", fontWeight: "800", fontSize: 12, marginTop: 8 }}>
                    Date: {dateText(open.paidAt)}{timeText(open.paidAt) ? ` | ${timeText(open.paidAt)}` : ""}
                  </Text>
                  <Text style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{who}</Text>
                </View>
                <View style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
                  {receiptSections(open).map((sec, si) => (
                    <View key={si} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#94A3B8", borderStyle: "dashed" }}>
                      {sec.map((l) => (
                        <View key={l.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                          <Text style={{ fontSize: l.strong ? 15 : 13.5, fontWeight: l.strong ? "900" : "500", color: l.strong ? BRAND : "#334155" }}>{l.label}</Text>
                          <Text style={{ fontSize: l.strong ? 15 : 13.5, fontWeight: "800", color: l.strong ? BRAND : INK, maxWidth: "60%", textAlign: "right" }}>{l.value}</Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
                <View style={{ alignItems: "center", paddingVertical: 14, backgroundColor: "#F8FAFC", borderTopWidth: 1, borderTopColor: "#94A3B8", borderStyle: "dashed" }}>
                  <Text style={{ color: BRAND, fontWeight: "900", fontSize: 14 }}>Thank you</Text>
                  <Text style={{ color: MUTED, fontSize: 10.5, marginTop: 4 }}>Computer generated receipt · No signature required</Text>
                </View>
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
                <TouchableOpacity onPress={() => setOpen(null)} style={{ flex: 1, borderWidth: 1, borderColor: BRAND, borderRadius: 12, paddingVertical: 11, alignItems: "center" }}>
                  <Text style={{ color: BRAND, fontWeight: "900" }}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => receiptPdf(open)} style={{ flex: 1, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 11, flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
                  <MaterialIcons name="picture-as-pdf" size={17} color="#FFFFFF" />
                  <Text style={{ color: "#FFFFFF", fontWeight: "900", marginLeft: 6 }}>Download PDF</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
