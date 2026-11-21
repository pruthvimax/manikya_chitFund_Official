import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Platform, Text, TouchableOpacity, View } from "react-native";

/* =========================================================
   EXTRA AMOUNT POPUP (employee Collect Payment)

   Shown when the employee types MORE than the pending installment.
   Yes  -> the pending installment is collected as usual AND the extra is saved
           as an advance for this group only (added to the next month automatically).
   No   -> only the pending installment is collected (the extra is given back).
   Switch the feature off with EXTRA_AMOUNT_ADVANCE = false (the old
   "You can pay maximum" message then comes back).
========================================================= */

export const EXTRA_AMOUNT_ADVANCE = true;

const BRAND = "#024e32";
const GOLD = "#d4af37";
const inr = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

type Props = {
  visible: boolean;
  memberName?: string;
  groupCode?: string;
  monthIndex: number;
  pending: number;
  amount: number;
  onYes: () => void;
  onNo: () => void;
  onClose: () => void;
};

export default function ExtraAmountModal({ visible, memberName, groupCode, monthIndex, pending, amount, onYes, onNo, onClose }: Props) {
  const slide = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const extra = Math.max(amount - pending, 0);
  const share = amount > 0 ? Math.min(Math.max(pending / amount, 0), 1) : 1;

  useEffect(() => {
    if (!visible) return;
    slide.setValue(0);
    pop.setValue(0);
    bar.setValue(0);
    Animated.parallel([
      Animated.spring(slide, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(180),
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(260),
        Animated.timing(bar, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      ]),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible, slide, pop, bar, glow]);

  const translateY = slide.interpolate({ inputRange: [0, 1], outputRange: [420, 0] });
  const popScale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const iconScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const barWidth = bar.interpolate({ inputRange: [0, 1], outputRange: ["0%", `${share * 100}%`] });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(2,20,12,0.6)", justifyContent: "flex-end", alignItems: "center" }}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />

        <Animated.View
          style={{
            width: "100%",
            maxWidth: 520,
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            borderBottomLeftRadius: Platform.OS === "web" ? 30 : 0,
            borderBottomRightRadius: Platform.OS === "web" ? 30 : 0,
            paddingHorizontal: 20,
            paddingBottom: 24,
            paddingTop: 0,
            marginBottom: Platform.OS === "web" ? 24 : 0,
            transform: [{ translateY }],
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 24,
          }}
        >
          {/* glowing icon */}
          <Animated.View style={{ alignSelf: "center", marginTop: -34, transform: [{ scale: iconScale }] }}>
            <LinearGradient
              colors={["#f5d76e", GOLD]}
              style={{ width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#FFFFFF" }}
            >
              <MaterialIcons name="auto-awesome" size={32} color="#7a5b00" />
            </LinearGradient>
          </Animated.View>

          <Text style={{ textAlign: "center", fontSize: 21, fontWeight: "900", color: "#0F172A", marginTop: 10 }}>Extra amount received</Text>
          <Text style={{ textAlign: "center", fontSize: 12.5, color: "#64748B", marginTop: 3 }}>
            {memberName ? `${memberName} · ` : ""}Group {groupCode} · Month {monthIndex}
          </Text>

          {/* ₹10,000 + ₹5,000 = ₹15,000 */}
          <Animated.View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, transform: [{ scale: popScale }], opacity: pop }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#0F172A" }}>{inr(pending)}</Text>
              <Text style={{ fontSize: 11.5, color: "#64748B" }}>Installment</Text>
            </View>
            <Text style={{ fontSize: 20, color: "#94A3B8" }}>+</Text>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#B8860B" }}>{inr(extra)}</Text>
              <Text style={{ fontSize: 11.5, color: "#64748B" }}>Extra</Text>
            </View>
            <Text style={{ fontSize: 20, color: "#94A3B8" }}>=</Text>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#166534" }}>{inr(amount)}</Text>
              <Text style={{ fontSize: 11.5, color: "#64748B" }}>Received</Text>
            </View>
          </Animated.View>

          {/* split bar */}
          <View style={{ height: 14, borderRadius: 9, backgroundColor: GOLD, overflow: "hidden", marginTop: 12 }}>
            <Animated.View style={{ height: 14, width: barWidth, backgroundColor: BRAND }} />
          </View>

          <View style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14 }}>
            <Text style={{ color: "#166534", fontSize: 12.5, lineHeight: 18 }}>
              The extra <Text style={{ fontWeight: "900" }}>{inr(extra)}</Text> will be saved as an{" "}
              <Text style={{ fontWeight: "900" }}>advance for Group {groupCode} only</Text> and added to the next month automatically. It must not stay with the employee.
            </Text>
          </View>

          <TouchableOpacity activeOpacity={0.88} onPress={onYes} style={{ marginTop: 16 }}>
            <LinearGradient
              colors={[BRAND, "#04784a"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 16, paddingVertical: 15, alignItems: "center" }}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15.5 }}>Yes, collect {inr(amount)} with advance</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onNo}
            style={{ marginTop: 10, borderRadius: 16, borderWidth: 2, borderColor: "#E5E7EB", paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#374151", fontWeight: "800", fontSize: 14 }}>No, collect only {inr(pending)}</Text>
            <Text style={{ color: "#94A3B8", fontSize: 11.5, marginTop: 2 }}>Give {inr(extra)} back to the member</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={{ alignItems: "center", paddingTop: 12 }}>
            <Text style={{ color: "#64748B", fontWeight: "800" }}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}
