import { Stack } from "expo-router";
import "./global.css";
import React from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    console.log("========== APP CRASH ==========");
    console.log(error?.message || String(error));
    console.log(info?.componentStack || "");
    console.log("===============================");
  }

  render() {
    if (this.state.error) {
      return (
        <ScrollView
          style={{ flex: 1, backgroundColor: "#fff", padding: 20, paddingTop: 60 }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: "#b91c1c" }}>
            App Error
          </Text>
          <Text style={{ marginTop: 10, color: "#111", fontSize: 14 }}>
            {this.state.error?.message || String(this.state.error)}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{
              marginTop: 20,
              backgroundColor: "#024e32",
              padding: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center", fontWeight: "600" }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}></Stack>
    </RootErrorBoundary>
  );
}
