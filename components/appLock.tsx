import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";

/* =========================================================
   APP LOCK (member side, optional)

   - Off by default. A member who wants it goes to Profile > App Lock
     and sets a 4 digit PIN. A member who does not want it does nothing.
   - When it is on, the app asks for the PIN when it is opened, and when
     it is opened again after being away for more than 30 seconds.
   - Forgot PIN: the member types their login password (checked with the
     existing member login, nothing new on the server), then sets a new PIN.
     They are not logged out.
   - The PIN is kept on the phone only (as a scrambled value, not the digits).
   - Admin and employee logins are never locked.
   - Switch the whole feature off with APP_LOCK_ENABLED = false.
========================================================= */

export const APP_LOCK_ENABLED = true;

const BRAND = "#024e32";
const RELOCK_AFTER_MS = 30000;
const MAX_TRIES = 5;
const WAIT_MS = 30000;

type Lock = { salt: string; hash: string };

const hashPin = (pin: string, salt: string) => {
  const s = `${salt}:${pin}`;
  let h = 2166136261;
  for (let r = 0; r < 2000; r++) {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    h = (h + r) >>> 0;
  }
  return h.toString(16);
};

const keyFor = (uid: string) => `appLock_${uid}`;

async function memberId(): Promise<string> {
  try {
    const raw = await AsyncStorage.getItem("loggedUser");
    const id = raw ? JSON.parse(raw)?.userid : "";
    return id ? String(id) : "";
  } catch {
    return "";
  }
}

async function readLock(uid: string): Promise<Lock | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(uid));
    const v = raw ? JSON.parse(raw) : null;
    return v?.salt && v?.hash ? v : null;
  } catch {
    return null;
  }
}

async function saveLock(uid: string, pin: string) {
  const salt = Math.random().toString(36).slice(2) + Date.now().toString(36);
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify({ salt, hash: hashPin(pin, salt) }));
}

const clearLock = (uid: string) => AsyncStorage.removeItem(keyFor(uid)).catch(() => {});
const pinMatches = (lock: Lock | null, pin: string) => !!lock && hashPin(pin, lock.salt) === lock.hash;

/* ---------- number pad ---------- */
function PinPad({ title, sub, error, disabled, onComplete }: { title: string; sub?: string; error?: string; disabled?: boolean; onComplete: (pin: string) => void }) {
  const [pin, setPin] = useState("");

  const press = (d: string) => {
    if (disabled) return;
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => setPin(""), 120);
      onComplete(next);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "<"];
  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A", textAlign: "center" }}>{title}</Text>
      {sub ? <Text style={{ fontSize: 12.5, color: "#64748B", marginTop: 4, textAlign: "center" }}>{sub}</Text> : null}
      <View style={{ flexDirection: "row", marginTop: 18, marginBottom: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: 16, height: 16, borderRadius: 8, marginHorizontal: 9, borderWidth: 2, borderColor: BRAND, backgroundColor: i < pin.length ? BRAND : "transparent" }} />
        ))}
      </View>
      <Text style={{ minHeight: 18, color: "#B91C1C", fontWeight: "700", fontSize: 12.5, marginBottom: 6, textAlign: "center" }}>{error || ""}</Text>
      <View style={{ width: 240, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        {keys.map((k, i) =>
          k === "" ? (
            <View key={i} style={{ width: 68, height: 68, marginBottom: 12 }} />
          ) : (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              disabled={disabled}
              onPress={() => (k === "<" ? setPin((p) => p.slice(0, -1)) : press(k))}
              style={{ width: 68, height: 68, borderRadius: 34, marginBottom: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", opacity: disabled ? 0.45 : 1, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 }}
            >
              {k === "<" ? <MaterialIcons name="backspace" size={22} color="#334155" /> : <Text style={{ fontSize: 24, fontWeight: "700", color: "#0F172A" }}>{k}</Text>}
            </TouchableOpacity>
          )
        )}
      </View>
    </View>
  );
}

/* ---------- the lock screen (mounted once in the root layout) ---------- */
export function AppLockGate() {
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState<"pin" | "password" | "new" | "confirm">("pin");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const firstPin = useRef("");
  const [error, setError] = useState("");
  const [waitUntil, setWaitUntil] = useState(0);
  const [, setTick] = useState(0);
  const lockRef = useRef<Lock | null>(null);
  const uidRef = useRef("");
  const fails = useRef(0);
  const leftAt = useRef(0);

  const check = useCallback(async () => {
    const uid = await memberId();
    uidRef.current = uid;
    if (!uid) return;
    const lock = await readLock(uid);
    lockRef.current = lock;
    if (lock) {
      setError("");
      setMode("pin");
      setPw("");
      setLocked(true);
    }
  }, []);

  useEffect(() => {
    if (!APP_LOCK_ENABLED) return;
    check();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        if (leftAt.current && Date.now() - leftAt.current > RELOCK_AFTER_MS) check();
        leftAt.current = 0;
      } else if (!leftAt.current) {
        leftAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [check]);

  // the Android back button must not skip the lock
  useEffect(() => {
    if (!locked) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [locked]);

  // count down the wait after too many wrong tries
  useEffect(() => {
    if (!waitUntil) return;
    const id = setInterval(() => {
      if (Date.now() >= waitUntil) {
        setWaitUntil(0);
        setError("");
        clearInterval(id);
      } else setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [waitUntil]);

  if (!APP_LOCK_ENABLED || !locked) return null;

  const waiting = waitUntil > Date.now();

  const onPin = (pin: string) => {
    if (waiting) return;
    if (pinMatches(lockRef.current, pin)) {
      fails.current = 0;
      setError("");
      setLocked(false);
      return;
    }
    fails.current += 1;
    if (fails.current >= MAX_TRIES) {
      fails.current = 0;
      setWaitUntil(Date.now() + WAIT_MS);
      setError("Too many wrong tries. Wait 30 seconds.");
    } else {
      setError(`Wrong PIN. ${MAX_TRIES - fails.current} tries left.`);
    }
  };

  const forgot = () => {
    setError("");
    setPw("");
    setMode("password");
  };

  const backToPin = () => {
    setError("");
    setPw("");
    firstPin.current = "";
    setMode("pin");
  };

  // same check as the login screen (POST /members/login); nothing is saved from it
  const verifyPassword = async () => {
    if (!pw || busy) return;
    setBusy(true);
    setError("");
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(`${BACKEND_URL}/members/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid: uidRef.current, password: pw }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        setPw("");
        setMode("new");
      } else {
        const j = await res.json().catch(() => null);
        setError(res.status === 401 ? "Incorrect password" : j?.message || "Could not verify. Try again.");
      }
    } catch {
      setError("Could not reach the server. Check your internet.");
    }
    setBusy(false);
  };

  const onNewPin = async (pin: string) => {
    if (mode === "new") {
      firstPin.current = pin;
      setError("");
      setMode("confirm");
      return;
    }
    if (pin !== firstPin.current) {
      firstPin.current = "";
      setMode("new");
      setError("The two PINs were different. Start again.");
      return;
    }
    await saveLock(uidRef.current, pin);
    lockRef.current = await readLock(uidRef.current);
    fails.current = 0;
    setWaitUntil(0);
    setError("");
    setMode("pin");
    setLocked(false);
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999, backgroundColor: "#F4F7F5", alignItems: "center", justifyContent: "center", padding: 24 }]}>
      <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: BRAND, alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
        <MaterialIcons name="lock" size={30} color="#FFFFFF" />
      </View>
      {mode === "pin" ? (
        <>
          <PinPad title="Enter your PIN" sub="Manikya Chits is locked" error={error} disabled={waiting} onComplete={onPin} />
          <TouchableOpacity onPress={forgot} style={{ marginTop: 10, padding: 10 }}>
            <Text style={{ color: BRAND, fontWeight: "800" }}>Forgot PIN?</Text>
          </TouchableOpacity>
        </>
      ) : mode === "password" ? (
        <View style={{ width: "100%", maxWidth: 320, alignItems: "center" }}>
          <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A", textAlign: "center" }}>Enter your login password</Text>
          <Text style={{ fontSize: 12.5, color: "#64748B", marginTop: 4, textAlign: "center" }}>The password you use to log in. Then you can set a new PIN.</Text>
          <TextInput
            value={pw}
            onChangeText={(v) => {
              setPw(v);
              if (error) setError("");
            }}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Password"
            placeholderTextColor="#94A3B8"
            onSubmitEditing={verifyPassword}
            style={{ width: "100%", marginTop: 16, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1.5, borderColor: "#CBD5E1", paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#0F172A" }}
          />
          <Text style={{ minHeight: 18, color: "#B91C1C", fontWeight: "700", fontSize: 12.5, marginTop: 8, textAlign: "center" }}>{error}</Text>
          <TouchableOpacity onPress={verifyPassword} disabled={busy || !pw} style={{ width: "100%", marginTop: 8, backgroundColor: BRAND, borderRadius: 12, paddingVertical: 13, alignItems: "center", opacity: busy || !pw ? 0.6 : 1 }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 15 }}>Continue</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={backToPin} style={{ marginTop: 8, padding: 10 }}>
            <Text style={{ color: "#64748B", fontWeight: "800" }}>Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <PinPad title={mode === "new" ? "Create a new 4 digit PIN" : "Enter the new PIN again"} error={error} onComplete={onNewPin} />
          <TouchableOpacity onPress={backToPin} style={{ marginTop: 10, padding: 10 }}>
            <Text style={{ color: "#64748B", fontWeight: "800" }}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

/* ---------- the card inside the Profile page ---------- */
type Purpose = "on" | "change" | "off";
type Stage = "verify" | "new" | "confirm";

export function AppLockCard() {
  const [uid, setUid] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState<Purpose>("on");
  const [stage, setStage] = useState<Stage>("new");
  const [error, setError] = useState("");
  const firstPin = useRef("");

  const load = useCallback(async () => {
    const id = await memberId();
    setUid(id);
    setEnabled(!!id && !!(await readLock(id)));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!APP_LOCK_ENABLED || !uid) return null;

  const start = (p: Purpose) => {
    setPurpose(p);
    setStage(p === "on" ? "new" : "verify");
    setError("");
    firstPin.current = "";
    setOpen(true);
  };

  const close = () => setOpen(false);

  const onPin = async (pin: string) => {
    if (stage === "verify") {
      const lock = await readLock(uid);
      if (!pinMatches(lock, pin)) return setError("Wrong PIN. Try again.");
      setError("");
      if (purpose === "off") {
        await clearLock(uid);
        setEnabled(false);
        return close();
      }
      return setStage("new");
    }
    if (stage === "new") {
      firstPin.current = pin;
      setError("");
      return setStage("confirm");
    }
    if (pin !== firstPin.current) {
      firstPin.current = "";
      setStage("new");
      return setError("The two PINs were different. Start again.");
    }
    await saveLock(uid, pin);
    setEnabled(true);
    close();
  };

  const title = stage === "verify" ? "Enter your current PIN" : stage === "new" ? (purpose === "change" ? "Enter a new PIN" : "Create a 4 digit PIN") : "Enter the PIN again";

  return (
    <View style={{ marginTop: 16, backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#d4af37", borderRadius: 12, padding: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginRight: 12, backgroundColor: "#fef3c7" }}>
          <MaterialIcons name="phonelink-lock" size={20} color="#b45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "600", color: "#92400e" }}>App Lock</Text>
          <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {enabled ? "On: PIN is asked when the app opens" : "Off: set a PIN only if you want it"}
          </Text>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: enabled ? "#dcfce7" : "#e5e7eb" }}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: enabled ? "#166534" : "#4b5563" }}>{enabled ? "ON" : "OFF"}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", marginTop: 12 }}>
        {enabled ? (
          <>
            <TouchableOpacity onPress={() => start("change")} style={{ flex: 1, backgroundColor: BRAND, borderRadius: 10, paddingVertical: 11, alignItems: "center", marginRight: 8 }}>
              <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Change PIN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => start("off")} style={{ flex: 1, borderWidth: 1.5, borderColor: "#B91C1C", borderRadius: 10, paddingVertical: 11, alignItems: "center" }}>
              <Text style={{ color: "#B91C1C", fontWeight: "800" }}>Turn off</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={() => start("on")} style={{ flex: 1, backgroundColor: BRAND, borderRadius: 10, paddingVertical: 11, alignItems: "center" }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Set App Lock</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <View style={{ width: "100%", maxWidth: 340, backgroundColor: "#F4F7F5", borderRadius: 22, paddingVertical: 22, alignItems: "center" }}>
            <PinPad title={title} sub={stage === "verify" ? "To continue, confirm it is you" : undefined} error={error} onComplete={onPin} />
            <TouchableOpacity onPress={close} style={{ padding: 8 }}>
              <Text style={{ color: "#64748B", fontWeight: "800" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
