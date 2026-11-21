import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import BACKEND_URL from "../config";
import { inr } from "./memberLedgers";

/* MEMBER: shows the extra amount (advance) the member paid and what is still waiting to be
   added to the coming months. Read only. If the server has nothing (or is not updated yet)
   nothing is shown, so the page looks exactly as before. */

export default function MyAdvanceNote({ userid, groupId }: { userid: string; groupId?: string }) {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    let live = true;
    if (!userid) return;
    fetch(`${BACKEND_URL}/advance/my/${encodeURIComponent(userid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d && Array.isArray(d.items)) setItems(d.items);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userid]);

  const waiting = items.filter((i) => Number(i.remaining) > 0 && (!groupId || i.groupId === groupId));
  if (!waiting.length) return null;
  const total = waiting.reduce((s, i) => s + Number(i.remaining || 0), 0);

  return (
    <View style={{ backgroundColor: "#ECFDF5", borderRadius: 12, padding: 11, marginTop: 10, borderWidth: 1, borderColor: "#A7F3D0" }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <MaterialIcons name="savings" size={16} color="#047857" />
        <Text style={{ color: "#065F46", fontWeight: "900", fontSize: 12.5, marginLeft: 6 }}>Advance amount {inr(total)}</Text>
      </View>
      <Text style={{ color: "#047857", fontSize: 11.5, marginTop: 3 }}>
        You paid extra. It will be added automatically to your next month(s), so you pay less then.
      </Text>
    </View>
  );
}
