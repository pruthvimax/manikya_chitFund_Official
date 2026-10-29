import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Platform, StyleSheet, Text, View } from "react-native";

/* =========================================================
   ANIMATED OPENING SCREEN
   Shown once each time the app is opened (phone only), on top of the app, then fades away.
   Same MCPL logo as the native opening screen, so the hand-over from the store splash is smooth.
   Nothing here touches the app's own screens or logic.
   Switch it off with SHOW_ANIMATED_SPLASH = false.
========================================================= */

export const SHOW_ANIMATED_SPLASH = true;

const BRAND = "#024e32";
const LEAF = "#8DC63F";
const ORANGE = "#C86400";
// Kept short on purpose so opening the app never feels slow (tap anywhere to skip).
const FADE_START = 2100; // ms after which the screen fades away
const FADE_TIME = 350;

let alreadyShown = false; // once per app start

const LEAVES = [
  { left: "22%", top: "60%", delay: 500, color: LEAF },
  { left: "74%", top: "56%", delay: 700, color: BRAND },
  { left: "38%", top: "70%", delay: 900, color: LEAF },
  { left: "62%", top: "66%", delay: 1100, color: ORANGE },
  { left: "14%", top: "48%", delay: 1300, color: BRAND },
];

function Leaf({ left, top, delay, color }: { left: string; top: string; delay: number; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1800, delay, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [t, delay]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: left as any,
        top: top as any,
        width: 14,
        height: 22,
        backgroundColor: color,
        borderTopLeftRadius: 14,
        borderBottomRightRadius: 14,
        opacity: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.75, 0] }),
        transform: [
          { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [40, -120] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "160deg"] }) },
        ],
      }}
    />
  );
}

function Ripple({ delay, color }: { delay: number; color: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1200, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t, delay]);
  return (
    <Animated.View
      style={{
        position: "absolute",
        left: "50%",
        top: "42%",
        width: 120,
        height: 120,
        marginLeft: -60,
        marginTop: -60,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: color,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 3.4] }) }],
      }}
    />
  );
}

function RiseIn({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 600, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t, delay]);
  return (
    <Animated.View style={[{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

export default function AnimatedSplash() {
  const enabled = SHOW_ANIMATED_SPLASH && Platform.OS !== "web" && !alreadyShown;
  const [done, setDone] = useState(!enabled);
  const logo = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<any>(null);
  const skip = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setDone(true));
  };

  useEffect(() => {
    if (!enabled) return;
    alreadyShown = true;
    Animated.timing(logo, { toValue: 1, duration: 700, delay: 50, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
    Animated.timing(bar, { toValue: 1, duration: 1100, delay: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    const timer = (timerRef.current = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: FADE_TIME, useNativeDriver: true }).start(() => setDone(true));
    }, FADE_START));
    return () => clearTimeout(timer);
  }, [enabled]);

  if (done) return null;

  return (
    <Animated.View
      pointerEvents="auto"
      onTouchStart={skip}
      style={[StyleSheet.absoluteFill, { backgroundColor: "#FFFFFF", opacity: fade, zIndex: 9999, elevation: 9999 }]}
    >
      {/* soft green glow behind the logo */}
      <View style={{ position: "absolute", left: "50%", top: "42%", width: 420, height: 420, marginLeft: -210, marginTop: -210, borderRadius: 210, backgroundColor: "#F1FAF4" }} />

      <Ripple delay={250} color={LEAF} />
      <Ripple delay={450} color={BRAND} />
      {LEAVES.map((l, i) => (
        <Leaf key={i} {...l} />
      ))}

      <Animated.View
        style={{
          position: "absolute",
          left: "50%",
          top: "42%",
          width: 230,
          height: 161,
          marginLeft: -115,
          marginTop: -80,
          opacity: logo.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
          transform: [{ scale: logo.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
        }}
      >
        <Image source={require("../assets/images/manikyaChits.png")} style={{ width: 230, height: 161 }} resizeMode="contain" />
      </Animated.View>

      <RiseIn delay={550} style={{ position: "absolute", left: 0, right: 0, top: "62%", alignItems: "center" }}>
        <Text style={{ fontSize: 25, fontWeight: "900", color: BRAND, letterSpacing: 1.5 }}>MANIKYA CHITS</Text>
      </RiseIn>
      <RiseIn delay={700} style={{ position: "absolute", left: 0, right: 0, top: "67.5%", alignItems: "center" }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: ORANGE, letterSpacing: 3 }}>YOUR FUTURE · OUR PRIDE</Text>
      </RiseIn>

      {/* thin loading bar */}
      <View style={{ position: "absolute", left: "50%", bottom: 90, width: 120, marginLeft: -60, height: 4, borderRadius: 4, backgroundColor: "#E2EEE7", overflow: "hidden" }}>
        <Animated.View
          style={{
            width: 120,
            height: 4,
            backgroundColor: BRAND,
            transform: [{ translateX: bar.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }],
          }}
        />
      </View>
    </Animated.View>
  );
}
