import React, { useState } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import NativeDateTimePicker from "@react-native-community/datetimepicker";

/* ------------------------------------------------------------------
   DateTimePickerCompat
   Drop-in replacement for @react-native-community/datetimepicker.

   - Android / iOS : renders the real native picker (exactly as before).
   - Web (laptop / desktop browser): the native picker draws nothing,
     so here a small popup with the browser's own calendar / time
     input is shown. Same props, same onChange(event, date) contract:
       OK     -> onChange({ type: "set" }, date)
       Cancel -> onChange({ type: "dismissed" }, undefined)
------------------------------------------------------------------- */

const pad = (n: number) => String(n).padStart(2, "0");

function WebPicker(props: any) {
  const { value, mode = "date", onChange, minimumDate, maximumDate } = props;
  const base: Date = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();

  const toInput = (d: Date) =>
    mode === "time"
      ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
      : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const [text, setText] = useState(toInput(base));

  const dateAttr = (d?: Date) =>
    d instanceof Date && !isNaN(d.getTime()) && mode !== "time" ? toInput(d) : undefined;

  const confirm = () => {
    if (!text) {
      onChange?.({ type: "dismissed" }, undefined);
      return;
    }
    let out: Date;
    if (mode === "time") {
      const [h, m] = text.split(":").map((x: string) => parseInt(x, 10));
      out = new Date(base);
      out.setHours(h || 0, m || 0, 0, 0);
    } else {
      const [y, mo, d] = text.split("-").map((x: string) => parseInt(x, 10));
      // noon, so converting to ISO never shifts the day
      out = new Date(y, (mo || 1) - 1, d || 1, 12, 0, 0, 0);
    }
    onChange?.({ type: "set" }, out);
  };

  const cancel = () => onChange?.({ type: "dismissed" }, undefined);

  return (
    <Modal transparent animationType="fade" visible onRequestClose={cancel}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 340,
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
            {mode === "time" ? "Select time" : "Select date"}
          </Text>

          {React.createElement("input", {
            type: mode === "time" ? "time" : "date",
            value: text,
            min: dateAttr(minimumDate),
            max: dateAttr(maximumDate),
            autoFocus: true,
            onChange: (e: any) => setText(String(e?.target?.value || "")),
            onClick: (e: any) => {
              try {
                e?.currentTarget?.showPicker?.();
              } catch {
                // some browsers only open it from the calendar icon
              }
            },
            style: {
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "12px 10px",
              fontSize: 16,
              fontFamily: "inherit",
              color: "#111827",
              cursor: "pointer",
              outline: "none",
            },
          })}

          <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 16 }}>
            <TouchableOpacity onPress={cancel} style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ color: "#6b7280", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirm}
              style={{
                backgroundColor: "#024e32",
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 22,
                marginLeft: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function DateTimePickerCompat(
  props: React.ComponentProps<typeof NativeDateTimePicker>
) {
  if (Platform.OS === "web") return <WebPicker {...props} />;
  const Native: any = NativeDateTimePicker;
  return <Native {...props} />;
}
