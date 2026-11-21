import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import BACKEND_URL from "../config";

/* ADMIN (Chit Schemes page): one switch "Show Group ID to members".
   OFF (default) -> member pages show the chit value (e.g. "₹5 Lakh").
   ON            -> member pages show the Group ID.
   Saved on the server, so it is the same for every member. Admin and employee pages are not affected. */

const GREEN = "#024e32";

export default function GroupIdToggleCard() {
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`${BACKEND_URL}/group-id-setting`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d && typeof d.show === "boolean") setShow(d.show);
      })
      .catch(() => {})
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);

  const change = async (value: boolean) => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const before = show;
    setShow(value);
    try {
      const res = await fetch(`${BACKEND_URL}/group-id-setting`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show: value }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.success) throw new Error("failed");
      setShow(!!d.show);
      setNote({ ok: true, text: d.show ? "Members now see the Group ID." : "Members now see the chit value." });
    } catch {
      setShow(before);
      setNote({ ok: false, text: "Could not save. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={{
        marginTop: 14,
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: "#EEF1EF",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#EAF5EF", alignItems: "center", justifyContent: "center" }}>
          <MaterialIcons name="visibility" size={20} color={GREEN} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 14.5, fontWeight: "900", color: "#111827" }}>Show Group ID to members</Text>
          <Text style={{ fontSize: 11.5, color: "#6B7280", marginTop: 2 }}>
            {show ? "ON: members see the Group ID" : "OFF: members see the chit value"}
          </Text>
        </View>
        {!loaded || busy ? (
          <ActivityIndicator color={GREEN} style={{ marginRight: 8 }} />
        ) : null}
        <Switch
          value={show}
          disabled={!loaded || busy}
          onValueChange={change}
          trackColor={{ false: "#CBD5E1", true: "#86C9A8" }}
          thumbColor={show ? GREEN : "#F8FAFC"}
        />
      </View>
      {note ? (
        <Text style={{ marginTop: 8, fontSize: 12, fontWeight: "700", color: note.ok ? "#166534" : "#B91C1C" }}>{note.text}</Text>
      ) : null}
    </View>
  );
}
