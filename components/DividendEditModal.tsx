import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

/* =========================================================
   EDIT DIVIDEND (admin, Group Members -> Payment History)
   Changes the dividend of ONE member for ONE month. Other members keep the
   group's dividend. Same rules as the server:
   - can go down any time (member pays more)
   - can go up only while the member still owes that much for the month
   - never above the installment
========================================================= */

const BRAND = "#024e32";
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export type DividendEditInfo = {
  memberName: string;
  monthIndex: number;
  installment: number; // month installment (full)
  paid: number; // installment paid so far (no penalty, no dividend)
  groupDividend: number; // the group's dividend of the month
  current: number; // this member's dividend now
  edited: boolean; // true if this member already has his own dividend
};

type Props = {
  visible: boolean;
  info: DividendEditInfo | null;
  busy: boolean;
  error: string;
  onSave: (dividend: number) => void;
  onClose: () => void;
};

export default function DividendEditModal({ visible, info, busy, error, onSave, onClose }: Props) {
  const [text, setText] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (visible && info) {
      setText(String(info.current));
      setLocalError("");
    }
  }, [visible, info]);

  if (!info) return null;

  const maxUp = Math.max(info.installment - info.paid, 0);
  const highest = Math.min(Math.max(info.current, maxUp), info.installment);
  const wanted = Number(text);
  const valid = text.trim() !== "" && isFinite(wanted) && wanted >= 0;
  const memberPays = valid ? Math.max(info.installment - wanted - info.paid, 0) : null;

  const save = () => {
    if (!valid) {
      setLocalError("Enter a valid amount (0 or more)");
      return;
    }
    if (wanted > highest) {
      setLocalError(`Highest allowed is ${inr(highest)}`);
      return;
    }
    setLocalError("");
    onSave(Math.round(wanted * 100) / 100);
  };

  const shown = localError || error;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: "#fff", width: "90%", maxWidth: 460, borderRadius: 18, padding: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#1f2937" }}>Edit Dividend</Text>
              <TouchableOpacity onPress={onClose} disabled={busy}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: "#f9fafb", borderRadius: 12, padding: 14, marginBottom: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>Only for this member and this month</Text>
              <Text style={{ fontWeight: "800", color: "#111827", fontSize: 16, marginTop: 2 }}>
                {info.memberName} · Month {info.monthIndex}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                <Text style={{ color: "#6b7280", fontSize: 13 }}>Installment</Text>
                <Text style={{ fontWeight: "700", color: "#111827" }}>{inr(info.installment)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ color: "#6b7280", fontSize: 13 }}>Group dividend</Text>
                <Text style={{ fontWeight: "700", color: "#111827" }}>{inr(info.groupDividend)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ color: "#6b7280", fontSize: 13 }}>This member now</Text>
                <Text style={{ fontWeight: "700", color: "#2563eb" }}>
                  {inr(info.current)}
                  {info.edited ? " (edited)" : ""}
                </Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                <Text style={{ color: "#6b7280", fontSize: 13 }}>Already paid</Text>
                <Text style={{ fontWeight: "700", color: "#16a34a" }}>{inr(info.paid)}</Text>
              </View>
            </View>

            <Text style={{ color: "#374151", fontWeight: "700", marginBottom: 6 }}>New dividend (₹)</Text>
            <TextInput
              value={text}
              onChangeText={(v) => {
                setText(v.replace(/[^0-9.]/g, ""));
                setLocalError("");
              }}
              keyboardType="numeric"
              placeholder="Enter dividend"
              editable={!busy}
              style={{
                borderWidth: 2,
                borderColor: BRAND,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 20,
                fontWeight: "800",
                color: BRAND,
              }}
            />
            <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 6 }}>
              You can set it from ₹0 up to {inr(highest)}.
              {memberPays !== null ? ` Member will pay ${inr(memberPays)} for this month.` : ""}
            </Text>

            {!!shown && (
              <View style={{ backgroundColor: "#fef2f2", borderRadius: 10, padding: 10, marginTop: 10 }}>
                <Text style={{ color: "#b91c1c", fontSize: 13 }}>{shown}</Text>
              </View>
            )}

            <View style={{ flexDirection: "row", marginTop: 16, gap: 10 }}>
              <TouchableOpacity
                onPress={onClose}
                disabled={busy}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: "#f3f4f6", alignItems: "center" }}
              >
                <Text style={{ color: "#374151", fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={save}
                disabled={busy}
                style={{ flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: BRAND, alignItems: "center", opacity: busy ? 0.7 : 1 }}
              >
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>Save</Text>}
              </TouchableOpacity>
            </View>

            {info.edited && !busy && (
              <TouchableOpacity onPress={() => onSave(info.groupDividend)} style={{ alignItems: "center", paddingTop: 12 }}>
                <Text style={{ color: "#2563eb", fontWeight: "700", fontSize: 13 }}>
                  Use the group dividend ({inr(info.groupDividend)})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
