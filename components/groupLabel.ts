import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import BACKEND_URL from "../config";

/* =========================================================
   MEMBER SIDE: show the CHIT VALUE instead of the Group ID.

   HIDE_GROUP_ID = true   -> member pages show the chit value (e.g. "₹5 Lakh")
   HIDE_GROUP_ID = false  -> member pages show the Group ID again, exactly as before

   The value is set by the admin switch on the Chit Schemes page ("Show Group ID to members").
   Until the server answers (or if it cannot be reached) the last known answer is used;
   the very first time it is "hidden".

   Only what is SHOWN is changed. The Group ID is still used inside the app to find the right
   chit, month, payment, bid ... nothing else depends on this file.
   (Admin and employee pages do not use this file.)
========================================================= */
export let HIDE_GROUP_ID = true;

const trim = (n: number) => (n % 1 === 0 ? String(n) : n.toFixed(1).replace(/\.0$/, ""));

/** 500000 -> "₹5 Lakh" */
export const chitValueText = (v: any): string => {
  const n = Number(v) || 0;
  if (n <= 0) return "";
  if (n >= 10000000) return `₹${trim(n / 10000000)} Cr`;
  if (n >= 100000) return `₹${trim(n / 100000)} Lakh`;
  return `₹${n.toLocaleString("en-IN")}`;
};

/** "2 lakh" / "25 lakh" / "1.2 cr" -> a number (same rule as My Chits) */
const parseLabel = (label: any): number => {
  if (!label) return 0;
  const s = String(label).toLowerCase().trim();
  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return 0;
  if (s.includes("cr")) return num * 10000000;
  if (s.includes("lakh") || s.includes("lac") || s.includes("l")) return num * 100000;
  if (s.includes("k")) return num * 1000;
  return num > 0 ? num : 0;
};

/* what we know: chit scheme value by chitId, and which chit a group belongs to */
let schemeAmount: Record<string, number> = {};
let groupChit: Record<string, string> = {};
let busy: Promise<void> | null = null;
let version = 0;
const subs = new Set<() => void>();

const key = (v: any) => String(v ?? "").trim().toLowerCase();

const fetchSchemes = async (): Promise<any[]> => {
  for (const url of [`${BACKEND_URL}/chitscheme`, `${BACKEND_URL}/chitschemes`]) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // try the next one
    }
  }
  return [];
};

/* ---------- the admin switch ---------- */
const SETTING_CACHE = "groupIdSettingShow";
let lastSettingFetch = 0;

const applySetting = (show: boolean) => {
  const hide = !show;
  if (hide === HIDE_GROUP_ID) return;
  HIDE_GROUP_ID = hide;
  version += 1;
  subs.forEach((f) => f());
};

// last known answer, so the page does not flash the other text while the server answers
AsyncStorage.getItem(SETTING_CACHE)
  .then((v) => {
    if (v === "true" || v === "false") applySetting(v === "true");
  })
  .catch(() => {});

/** asks the server for the switch (at most every 15 seconds) */
export const refreshGroupIdSetting = async (force = false): Promise<void> => {
  const now = Date.now();
  if (!force && now - lastSettingFetch < 15000) return;
  lastSettingFetch = now;
  try {
    const res = await fetch(`${BACKEND_URL}/group-id-setting`);
    if (!res.ok) return;
    const d = await res.json();
    if (typeof d?.show !== "boolean") return;
    AsyncStorage.setItem(SETTING_CACHE, String(d.show)).catch(() => {});
    applySetting(d.show);
  } catch {
    // keep the last known answer
  }
};

/** loads the chit values once (and again when asked); safe to call many times */
export const ensureGroupLabels = (force = false): Promise<void> => {
  if (busy) return busy;
  if (!force && Object.keys(groupChit).length) return Promise.resolve();
  busy = (async () => {
    try {
      const stored = await AsyncStorage.getItem("loggedUser");
      const uid = stored ? JSON.parse(stored)?.userid : "";
      const [schemes, chits] = await Promise.all([
        fetchSchemes(),
        uid
          ? fetch(`${BACKEND_URL}/groups/my-chits/${uid}`)
              .then((r) => r.json())
              .catch(() => [])
          : Promise.resolve([]),
      ]);
      const sa: Record<string, number> = {};
      schemes.forEach((s: any) => {
        const a = Number(s?.chitAmount) || 0;
        if (a > 0) sa[key(s.chitId)] = a;
      });
      const gc: Record<string, string> = {};
      const ga: Record<string, number> = {};
      (Array.isArray(chits) ? chits : []).forEach((c: any) => {
        if (c?.groupId) {
          gc[String(c.groupId)] = String(c.chitId || "");
          if (Number(c.chitAmount) > 0) ga[String(c.groupId)] = Number(c.chitAmount);
        }
      });
      schemeAmount = { ...sa };
      groupChit = gc;
      Object.keys(ga).forEach((g) => (schemeAmount[`group:${g}`] = ga[g]));
      version += 1;
      subs.forEach((f) => f());
    } catch {
      // nothing: the label falls back to "Chit"
    } finally {
      busy = null;
    }
  })();
  return busy;
};

/** what to show in place of the Group ID. hint = anything the page already knows about that chit */
export const groupLabel = (groupId: any, hint?: { chitAmount?: any; chitId?: any }): string => {
  if (!HIDE_GROUP_ID) return String(groupId ?? "");
  const g = String(groupId ?? "");
  const cid = hint?.chitId ?? groupChit[g];
  const value =
    Number(hint?.chitAmount) ||
    schemeAmount[`group:${g}`] ||
    (cid ? schemeAmount[key(cid)] : 0) ||
    parseLabel(cid) ||
    0;
  return chitValueText(value) || "Chit";
};

/** "Group 01B30" -> the chit value when hidden; otherwise the old text with its prefix */
export const groupPrefixed = (prefix: string, groupId: any, hint?: { chitAmount?: any; chitId?: any }): string =>
  HIDE_GROUP_ID ? groupLabel(groupId, hint) : `${prefix}${groupId ?? ""}`;

/** use inside a member page: gives groupLabel and makes the page refresh once the values are loaded */
export const useGroupLabel = () => {
  const [v, setV] = useState(version);
  useEffect(() => {
    const f = () => setV(version);
    subs.add(f);
    refreshGroupIdSetting();
    ensureGroupLabels();
    return () => {
      subs.delete(f);
    };
  }, []);
  // a new function each time the values change, so memo lists that use it refresh too
  return useCallback((groupId: any, hint?: { chitAmount?: any; chitId?: any }) => groupLabel(groupId, hint), [v]);
};
