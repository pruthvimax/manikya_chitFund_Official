import React from "react";
import { ActivityIndicator, SafeAreaView, Text, View } from "react-native";

/* =========================================================
   MemberLoader
   The simple loading indicator used on the member pages instead of
   card-shaped skeletons: a green spinner and ONE line of text
   (same look as the Vacancy / My Chits pages).
   fullScreen = used when the whole page is still loading.
========================================================= */
export default function MemberLoader({
  text = "Loading...",
  fullScreen = false,
}: {
  text?: string;
  fullScreen?: boolean;
}) {
  const body = (
    <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 70 }}>
      <ActivityIndicator size="large" color="#024e32" />
      <Text style={{ marginTop: 16, fontSize: 15, fontWeight: "800", color: "#024e32" }}>{text}</Text>
    </View>
  );
  if (!fullScreen) return body;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff", justifyContent: "center" }}>{body}</SafeAreaView>
  );
}
