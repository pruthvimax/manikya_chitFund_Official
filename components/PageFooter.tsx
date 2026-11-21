import React from "react";
import { Text, View } from "react-native";

/* Text footer at the end of a page (same look as the footer on the other pages):
   MANIKYA CHITS PVT LTD + a short line + copyright. Display only. */
export default function PageFooter({ note }: { note?: string }) {
  return (
    <View style={{ marginTop: 28, marginBottom: 14, width: "100%" }}>
      <View style={{ borderTopWidth: 1, borderTopColor: "#E5E7EB", paddingTop: 16, alignItems: "center" }}>
        <Text style={{ color: "#024e32", fontWeight: "800", fontSize: 15 }}>MANIKYA CHITS PVT LTD</Text>
        {note ? <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, textAlign: "center" }}>{note}</Text> : null}
        <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 4, textAlign: "center" }}>
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>
      </View>
    </View>
  );
}
