import { Stack } from "expo-router";
import "./global.css";
import React from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";
import GlobalSpinAutoOpen from "../components/spinner/GlobalSpinAutoOpen";
import AnimatedSplash from "../components/AnimatedSplash";
import MemberBottomNav from "../components/MemberBottomNav";
import { Platform, View } from "react-native";
import { navTouchHandlers } from "../components/navScrollBus";

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
      {/* the Stack fills the screen; the member bottom navigation (when shown) sits under it */}
      <View style={{ flex: 1 }} {...navTouchHandlers}>
        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Android only: quick fade between the member pages (smooth like iPhone).
                iPhone keeps its normal slide. Other pages are not touched. */}
            {Platform.OS === "android" &&
              [
                "menu",
                "mychits",
                "newgroups",
                "auctionroom",
                "bidroom",
                "myaccountcopy",
                "myoutstanding",
                "vacancy",
                "contact",
                "notifications",
                "myprofile",
              ].map((name) => (
                <Stack.Screen key={name} name={name} options={{ animation: "fade", animationDuration: 180 }} />
              ))}
          </Stack>
        </View>
        <MemberBottomNav />
      </View>
      {/* opens the live spin by itself for members when the admin starts it */}
      <GlobalSpinAutoOpen />
      {/* animated opening screen: shown once when the app opens, then fades away */}
      <AnimatedSplash />
    </RootErrorBoundary>
  );
}
