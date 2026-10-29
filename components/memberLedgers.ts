import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import BACKEND_URL from "../config";
import { cacheGet, cacheSet, groupsKey, ledgerKey } from "../memberCache";

/* =========================================================
   SHARED HELPERS for the member pages "My Next Due" and "My Receipts".
   - Uses the SAME server calls and the SAME cache as My Account Copy,
     so a page that was opened before shows instantly.
   - Amounts follow the My Account Copy rule:
       pending installment = installment (after dividend) - installment paid
       pending penalty     = penalty assessed - penalty paid
       Total Due           = pending installment + pending penalty
   Nothing here is used by any older page.
========================================================= */

export const BRAND = "#024e32";
export const INK = "#0F172A";
export const MUTED = "#64748B";
export const RED = "#DC2626";
export const AMBER = "#D97706";
export const OKGREEN = "#16A34A";

export const inr = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

export const dateText = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** whole days from today to the date: negative = already late */
export const daysFromToday = (v: any): number | null => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return Math.round((startOfDay(d) - startOfDay(new Date())) / 86400000);
};

const sum = (list: any[]) => list.reduce((s, p) => s + (Number(p?.amount) || 0), 0);

export type MonthRow = {
  monthIndex: number;
  dueDate: any;
  installment: number; // after dividend
  instPaid: number;
  penaltyPaid: number;
  pendingInstallment: number;
  pendingPenalty: number;
  due: number; // pending installment + pending penalty
  dividend: number;
  payments: any[];
};

export type GroupSummary = {
  groupId: string;
  groupMemberId: string;
  chitId: string;
  rows: MonthRow[];
  totalMonths: number;
  paidMonths: number;
  totalPaid: number; // installment + penalty paid (dividend not counted)
  dividend: number;
  totalDue: number; // same figure as "Total Due" on My Account Copy
  next: MonthRow | null; // first month that still has something to pay
};

export const summarise = (g: any, ledger: any[]): GroupSummary => {
  const rows: MonthRow[] = (Array.isArray(ledger) ? ledger : [])
    .map((r: any) => {
      const pays = Array.isArray(r.payments) ? r.payments : [];
      const instPaid = sum(pays.filter((p: any) => p.paymentType !== "PENALTY" && p.paymentType !== "DIVIDEND"));
      const penaltyPaid = sum(pays.filter((p: any) => p.paymentType === "PENALTY"));
      const installment = Number(r.installmentAmount) || 0;
      const pendingInstallment = Math.max(installment - instPaid, 0);
      const pendingPenalty = Math.max((Number(r.backendPenaltyDue) || 0) - penaltyPaid, 0);
      return {
        monthIndex: Number(r.monthIndex) || 0,
        dueDate: r.dueDate || null,
        installment,
        instPaid,
        penaltyPaid,
        pendingInstallment,
        pendingPenalty,
        due: pendingInstallment + pendingPenalty,
        dividend: Number(r.dividend) || 0,
        payments: pays,
      };
    })
    .sort((a, b) => a.monthIndex - b.monthIndex);

  return {
    groupId: String(g.groupId),
    groupMemberId: String(g.groupMemberId || ""),
    chitId: String(g.chitId || ""),
    rows,
    totalMonths: rows.length,
    paidMonths: rows.filter((r) => r.instPaid > 0 && r.pendingInstallment === 0).length,
    totalPaid: rows.reduce((s, r) => s + r.instPaid + r.penaltyPaid, 0),
    dividend: rows.reduce((s, r) => s + r.dividend, 0),
    totalDue: rows.reduce((s, r) => s + r.due, 0),
    next: rows.find((r) => r.due > 0) || null,
  };
};

export type MemberData = { userid: string; name: string; groups: GroupSummary[] };

/** loads every chit group of the logged-in member with its ledger (cache first, like My Account Copy) */
export const loadMemberData = async (force = false): Promise<MemberData | null> => {
  const stored = await AsyncStorage.getItem("loggedUser");
  if (!stored) return null;
  const user = JSON.parse(stored);
  const userid = user?.userid;
  if (!userid) return null;

  let list: any = force ? undefined : cacheGet(userid, groupsKey());
  if (!list) {
    const res = await fetch(`${BACKEND_URL}/groups/my-chits/${userid}`);
    list = await res.json();
    if (Array.isArray(list)) cacheSet(userid, groupsKey(), list);
  }
  if (!Array.isArray(list)) list = [];

  const groups = await Promise.all(
    list.map(async (g: any) => {
      const key = ledgerKey(g.groupId, g.groupMemberId || "");
      let data: any = force ? undefined : cacheGet(userid, key);
      if (!data) {
        try {
          const res = await fetch(`${BACKEND_URL}/groups/account-copy/${userid}/${g.groupId}?groupMemberId=${g.groupMemberId || ""}`);
          data = await res.json();
          if (Array.isArray(data?.ledger)) cacheSet(userid, key, data);
        } catch {
          data = null;
        }
      }
      return summarise(g, data?.ledger || []);
    })
  );

  return { userid, name: user?.username || user?.name || String(userid), groups };
};

/* ---------------- PDF ---------------- */
export const esc = (t: any) => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const pdfPage = (title: string, subtitle: string, body: string) => `<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="font-family: Arial, Helvetica, sans-serif; color:#0F172A; padding:24px;">
<div style="border-bottom:3px solid ${BRAND}; padding-bottom:8px; margin-bottom:14px;">
<div style="font-size:12px; color:#64748B; font-weight:bold;">MANIKYA CHITS</div>
<div style="font-size:20px; font-weight:bold; color:${BRAND};">${esc(title)}</div>
<div style="font-size:12px; color:#64748B; margin-top:2px;">${esc(subtitle)}</div>
</div>${body}
<div style="margin-top:18px; font-size:10px; color:#94A3B8;">Generated from the Manikya Chits app on ${esc(dateText(new Date()))}</div>
</body></html>`;

/** phone: saves a PDF and opens the share sheet. web: opens the print dialog (Save as PDF). */
export const savePdf = async (html: string, title: string): Promise<string> => {
  try {
    if (Platform.OS === "web") {
      // web: open a print-ready window (same way the admin pages print); "Print > Save as PDF"
      const w = window.open("", "_blank");
      if (!w) return "Please allow pop-ups to print or save the PDF.";
      w.document.write(html.replace("</body>", `<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script></body>`));
      w.document.close();
      return "";
    }
    const file = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
      return "";
    }
    return "The PDF was created but this phone cannot share files.";
  } catch (e: any) {
    return e?.message || "The PDF could not be created. Try again.";
  }
};
