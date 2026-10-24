import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * "Turn on notifications?" pop-up shown BEFORE the phone's own permission
 * box, the first time a member logs in on a freshly installed app.
 *
 *   <PushPermissionPrompt />            -> mounted once (member menu screen)
 *   askPushPermission({canAskAgain})    -> called by usePushNotifications
 *
 * Allow    -> returns true, the hook then shows the phone's permission box.
 * Not now  -> returns false, no permission box, never asked again on this
 *             install (a fresh install / reinstall asks again).
 *
 * If this component is not mounted for any reason, askPushPermission
 * falls back to `true`, so the app behaves exactly as before.
 */

const SHOWN_KEY = "pushPromptShown";

type Show = (resolve: (allow: boolean) => void, canAskAgain: boolean) => void;
let showPrompt: Show | null = null;

export const askPushPermission = async (
  opts: { canAskAgain?: boolean } = {}
): Promise<boolean> => {
  // already asked once on this install -> don't nag
  try {
    if ((await AsyncStorage.getItem(SHOWN_KEY)) === "1") return false;
  } catch {
    // storage unavailable: just show it
  }

  // give the pop-up a moment to mount, then fall back to the old behaviour
  for (let i = 0; i < 15 && !showPrompt; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!showPrompt) return true;

  return new Promise<boolean>((resolve) => {
    showPrompt!(resolve, opts.canAskAgain !== false);
  });
};

const GREEN = "#024e32";
const GREEN_LIGHT = "#0a8f5a";

const BENEFITS = [
  {
    icon: "gavel",
    tint: "#DCFCE7",
    color: "#15803D",
    title: "Auction alerts",
    text: "Know the moment a new auction opens for your group.",
  },
  {
    icon: "event-seat",
    tint: "#DBEAFE",
    color: "#1D4ED8",
    title: "New vacancies",
    text: "Never miss an open seat in a chit group.",
  },
  {
    icon: "looks-one",
    tint: "#FEF3C7",
    color: "#B45309",
    title: "Number on the app icon",
    text: "See what is new at a glance, without opening the app.",
  },
] as const;

export default function PushPermissionPrompt() {
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const resolver = useRef<((allow: boolean) => void) | null>(null);

  // entrance
  const card = useRef(new Animated.Value(0)).current;
  // looping bell + rings
  const swing = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    showPrompt = (resolve, again) => {
      resolver.current = resolve;
      setCanAskAgain(again);
      setVisible(true);
    };
    return () => {
      showPrompt = null;
      if (resolver.current) {
        resolver.current(false);
        resolver.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    card.setValue(0);
    Animated.spring(card, {
      toValue: 1,
      friction: 7,
      tension: 70,
      useNativeDriver: true,
    }).start();

    const bell = Animated.loop(
      Animated.sequence([
        Animated.timing(swing, { toValue: 1, duration: 140, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(swing, { toValue: -1, duration: 280, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(swing, { toValue: 1, duration: 280, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(swing, { toValue: 0, duration: 140, easing: Easing.linear, useNativeDriver: true }),
        Animated.delay(1400),
      ])
    );

    const pulse = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const r1 = pulse(ring1, 0);
    const r2 = pulse(ring2, 900);
    bell.start();
    r1.start();
    r2.start();

    return () => {
      bell.stop();
      r1.stop();
      r2.stop();
    };
  }, [visible]);

  const finish = useCallback((allow: boolean) => {
    // remember that we asked, so this never repeats on this install
    AsyncStorage.setItem(SHOWN_KEY, "1").catch(() => {});

    const done = resolver.current;
    resolver.current = null;

    Animated.timing(card, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      done?.(allow);
    });
  }, []);

  const onAllow = useCallback(() => {
    if (!canAskAgain) {
      // the phone will not show its box again -> send them to Settings
      Linking.openSettings().catch(() => {});
      finish(false);
      return;
    }
    finish(true);
  }, [canAskAgain, finish]);

  const rotate = swing.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-18deg", "18deg"],
  });

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => finish(false)}
    >
      <View style={s.overlay}>
        <Animated.View
          style={[
            s.card,
            {
              maxHeight: Math.max(height - 48, 300),
              opacity: card,
              transform: [
                { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) },
                { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
              ],
            },
          ]}
        >
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
          {/* ---------- header ---------- */}
          <LinearGradient
            colors={[GREEN, GREEN_LIGHT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <View style={[s.blob, { width: 150, height: 150, top: -60, right: -40 }]} />
            <View style={[s.blob, { width: 90, height: 90, bottom: -34, left: -20 }]} />

            <View style={s.bellWrap}>
              <Animated.View style={[s.ring, ringStyle(ring1)]} />
              <Animated.View style={[s.ring, ringStyle(ring2)]} />
              <View style={s.bellCircle}>
                <Animated.View style={{ transform: [{ rotate }] }}>
                  <MaterialIcons name="notifications-active" size={44} color={GREEN} />
                </Animated.View>
              </View>
              <View style={s.dot}>
                <Text style={s.dotText}>1</Text>
              </View>
            </View>

            <Text style={s.title} maxFontSizeMultiplier={1.2}>
              Stay in the loop
            </Text>
            <Text style={s.subtitle} maxFontSizeMultiplier={1.2}>
              Allow notifications so Manikya Chits can tell you what matters, right when it happens.
            </Text>
          </LinearGradient>

          {/* ---------- body ---------- */}
          <View style={s.body}>
            {BENEFITS.map((b) => (
              <View key={b.title} style={s.row}>
                <View style={[s.chip, { backgroundColor: b.tint }]}>
                  <MaterialIcons name={b.icon as any} size={20} color={b.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle} maxFontSizeMultiplier={1.2}>
                    {b.title}
                  </Text>
                  <Text style={s.rowText} maxFontSizeMultiplier={1.2}>
                    {b.text}
                  </Text>
                </View>
              </View>
            ))}

            {!canAskAgain ? (
              <View style={s.note}>
                <MaterialIcons name="settings" size={16} color="#B45309" />
                <Text style={s.noteText} maxFontSizeMultiplier={1.2}>
                  Notifications are switched off for this app. Tap below and turn them on in Settings.
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={onAllow}
              accessibilityRole="button"
              accessibilityLabel="Allow notifications"
              style={({ pressed }) => [s.allowWrap, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]}
            >
              <LinearGradient
                colors={[GREEN, GREEN_LIGHT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.allow}
              >
                <MaterialIcons name={canAskAgain ? "check-circle" : "settings"} size={20} color="#fff" />
                <Text style={s.allowText} maxFontSizeMultiplier={1.2}>
                  {canAskAgain ? "Allow notifications" : "Open Settings"}
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => finish(false)}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              style={({ pressed }) => [s.later, pressed && { opacity: 0.6 }]}
            >
              <Text style={s.laterText} maxFontSizeMultiplier={1.2}>
                Not now
              </Text>
            </Pressable>

            <Text style={s.foot} maxFontSizeMultiplier={1.2}>
              You can change this any time in your phone's Settings.
            </Text>
          </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2, 20, 12, 0.66)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
  header: {
    alignItems: "center",
    paddingTop: 30,
    paddingBottom: 26,
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  bellWrap: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  ring: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#ffffff",
  },
  bellCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  dot: {
    position: "absolute",
    top: 4,
    right: 6,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 5,
    borderRadius: 12,
    backgroundColor: "#EF4444",
    borderWidth: 2.5,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  dotText: { color: "#fff", fontSize: 12, fontWeight: "800", lineHeight: 15 },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  subtitle: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 6,
  },
  body: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 18 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  chip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowTitle: { color: "#111827", fontSize: 14.5, fontWeight: "700", lineHeight: 19 },
  rowText: { color: "#6B7280", fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  note: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  noteText: { color: "#92400E", fontSize: 12, lineHeight: 16, marginLeft: 8, flex: 1 },
  allowWrap: {
    marginTop: 6,
    borderRadius: 18,
    shadowColor: GREEN,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  allow: {
    height: 54,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  allowText: { color: "#fff", fontSize: 16.5, fontWeight: "800", marginLeft: 8 },
  later: { height: 46, alignItems: "center", justifyContent: "center", marginTop: 6 },
  laterText: { color: "#6B7280", fontSize: 15, fontWeight: "700" },
  foot: { color: "#9CA3AF", fontSize: 11.5, textAlign: "center", lineHeight: 15, marginTop: 2 },
});
