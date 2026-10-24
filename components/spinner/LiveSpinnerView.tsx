import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import SpinnerWheel from "./SpinnerWheel";
import WinnerCelebration from "./WinnerCelebration";
import type { SpinState } from "./spinnerApi";
import { computeTotalRotation, rotationAt } from "./spinnerMath";

/* =========================================================
   LIVE SPINNER VIEW  (used by the admin screen and the member screen)

   The animation runs locally on each device. It is a pure function
   of the shared state and the server-synchronised clock:

       rotation = totalRotation * easeOutQuart(elapsed / duration)

   so every device ends on exactly the same slice, and a phone that
   joins or reconnects half-way through simply starts from where the
   wheel should be right now.
========================================================= */

type Props = {
  state: SpinState | null;
  serverNow: () => number;
  size?: number;
  waitingText?: string;
  onFinished?: () => void;
};

type Phase = "idle" | "countdown" | "spinning" | "done";

const MODE_TEXT: Record<string, string> = {
  RANDOM: "",
  ADMIN_SELECTED: "",
};

/* ---------- twinkling stars in the background ---------- */
const STARS = [
  [6, 5, 3], [92, 8, 2.5], [10, 22, 2], [90, 26, 2], [5, 40, 2],
  [94, 44, 2.5], [8, 62, 2.5], [91, 66, 2], [6, 84, 2], [26, 93, 3],
  [48, 96, 2], [69, 92, 2.5], [92, 86, 3], [16, 52, 1.8], [84, 55, 1.8],
];

function Star({ x, y, d, i }: { x: number; y: number; d: number; i: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay((i * 230) % 1800),
        Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [i, t]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: d * 2,
        height: d * 2,
        borderRadius: d,
        backgroundColor: "#FFF3B0",
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.9] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.3] }) }],
      }}
    />
  );
}

/* ---------- big countdown number in the middle of the wheel ---------- */
function CountdownBadge({ value, size }: { value: number; size: number }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
  }, [value, pop]);
  const d = size * 0.34;
  return (
    <Animated.View
      style={{
        width: d,
        height: d,
        borderRadius: d / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(2,26,18,0.92)",
        borderWidth: 3,
        borderColor: "#F6E7A8",
        opacity: pop,
        transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
      }}
    >
      <Text
        allowFontScaling={false}
        style={{
          color: "#FFFFFF",
          fontSize: d * 0.6,
          fontWeight: "900",
          textShadowColor: "rgba(246,231,168,0.9)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 12,
        }}
      >
        {value}
      </Text>
    </Animated.View>
  );
}

export default function LiveSpinnerView({
  state,
  serverNow,
  size = 300,
  waitingText = "Waiting for the admin to start the spin",
  onFinished,
}: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const pointerTilt = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = useState<Phase>("idle");
  const [countdown, setCountdown] = useState(0);
  const [resultOpen, setResultOpen] = useState(false);
  const finishedKey = useRef<string>("");

  const labels = useMemo(
    () =>
      state && state.candidates.length > 0
        ? state.candidates.map((c) => c.groupMemberId)
        : ["", "", "", "", "", "", "", ""],
    [state]
  );

  const total = useMemo(
    () =>
      state
        ? computeTotalRotation({
            count: state.candidates.length,
            winnerIndex: state.winnerIndex,
            rotations: state.rotations,
            seed: state.seed,
          })
        : 0,
    [state]
  );

  useEffect(() => {
    let raf = 0;
    let cancelled = false;

    /* ---------- no spin yet: slow idle turn ---------- */
    if (!state) {
      setPhase("idle");
      let angle = 0;
      const idle = () => {
        if (cancelled) return;
        angle = (angle + 0.25) % 360;
        rotation.setValue(angle);
        raf = requestAnimationFrame(idle);
      };
      raf = requestAnimationFrame(idle);
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }

    /* ---------- a spin exists ---------- */
    const key = `${state.notificationId}:${state.startsAt}`;
    let lastPhase: Phase | null = null;
    let lastCount = -1;

    const tick = () => {
      if (cancelled) return;
      const now = serverNow();

      if (now < state.startsAt) {
        if (lastPhase !== "countdown") {
          lastPhase = "countdown";
          setPhase("countdown");
        }
        const secs = Math.ceil((state.startsAt - now) / 1000);
        if (secs !== lastCount) {
          lastCount = secs;
          setCountdown(secs);
        }
        rotation.setValue(0);
        pointerTilt.setValue(0);
        raf = requestAnimationFrame(tick);
        return;
      }

      const angle = rotationAt({
        now,
        startsAt: state.startsAt,
        durationMs: state.durationMs,
        total,
      });
      rotation.setValue(angle);

      if (now < state.endsAt) {
        if (lastPhase !== "spinning") {
          lastPhase = "spinning";
          setPhase("spinning");
        }
        // the pointer is kicked by every peg that passes it
        if (state.candidates.length > 1) {
          const segDeg = 360 / state.candidates.length;
          const frac = (((angle % segDeg) + segDeg) % segDeg) / segDeg;
          pointerTilt.setValue(26 * Math.pow(Math.max(0, 1 - frac / 0.38), 2));
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      // finished
      pointerTilt.setValue(0);
      if (lastPhase !== "done") {
        lastPhase = "done";
        setPhase("done");
        setResultOpen(true); // open the congratulation popup
        if (finishedKey.current !== key) {
          finishedKey.current = key;
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            ).catch(() => {});
          }
          onFinished?.();
        }
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.notificationId, state?.startsAt, state?.durationMs, total]);

  const showWinner = phase === "done" && state;
  const winnerLabel = state?.winner?.groupMemberId || "";

  const headline =
    phase === "idle"
      ? waitingText
      : phase === "countdown"
      ? countdown > 5
        ? "Get ready…"
        : `Spin starts in ${countdown}`
      : phase === "spinning"
      ? "Spinning…"
      : "We have a winner";

  return (
    <LinearGradient
      colors={["#00110B", "#01281A", "#035A3B", "#01281A"]}
      locations={[0, 0.35, 0.7, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        borderRadius: 30,
        paddingTop: 22,
        paddingBottom: 24,
        paddingHorizontal: 14,
        alignItems: "center",
        overflow: "hidden",
        borderWidth: 1.5,
        borderColor: "rgba(246,231,168,0.45)",
      }}
    >
      {/* twinkling stars */}
      {STARS.map(([x, y, d], i) => (
        <Star key={i} x={x} y={y} d={d} i={i} />
      ))}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 14,
          paddingVertical: 5,
          borderRadius: 999,
          backgroundColor: "rgba(246,231,168,0.12)",
          borderWidth: 1,
          borderColor: "rgba(246,231,168,0.4)",
        }}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: phase === "spinning" ? "#FB7185" : "#4ADE80",
            marginRight: 7,
          }}
        />
        <Text
          allowFontScaling={false}
          accessibilityRole="header"
          style={{
            color: "#F6E7A8",
            fontSize: 11,
            fontWeight: "800",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          Manikya Chits · Live Draw
        </Text>
      </View>

      <Text
        allowFontScaling={false}
        accessibilityLiveRegion="polite"
        style={{
          color: phase === "done" ? "#F6E7A8" : "#FFFFFF",
          fontSize: phase === "done" ? 26 : 20,
          fontWeight: "900",
          marginTop: 12,
          marginBottom: 14,
          textAlign: "center",
          textShadowColor: "rgba(246,231,168,0.55)",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 14,
        }}
      >
        {headline}
      </Text>

      {/* warm glow behind the wheel */}
      <View style={{ alignItems: "center", justifyContent: "center" }}>
        <Svg
          width={size * 1.7}
          height={size * 1.7}
          pointerEvents="none"
          style={{ position: "absolute" }}
        >
          <Defs>
            <RadialGradient id="wheelglow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F6E7A8" stopOpacity={phase === "spinning" ? "0.5" : "0.3"} />
              <Stop offset="0.55" stopColor="#12A06A" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#12A06A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={size * 0.85} cy={size * 0.85} r={size * 0.85} fill="url(#wheelglow)" />
        </Svg>

        <SpinnerWheel
          labels={labels}
          size={size}
          rotation={rotation}
          highlightIndex={showWinner ? state!.winnerIndex : null}
          phase={phase}
          pointerTilt={pointerTilt}
          centerOverlay={
            phase === "countdown" && countdown > 0 && countdown <= 5 ? (
              <CountdownBadge value={countdown} size={size} />
            ) : null
          }
        />
      </View>

      {/* The mode is always shown, so everyone sees how the winner is chosen. */}
      {state ? (
        <View
          style={{
            marginTop: 18,
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.14)",
            borderWidth: 1,
            borderColor: "rgba(246,231,168,0.5)",
          }}
        >
          <Text
            allowFontScaling={false}
            style={{ color: "#F6E7A8", fontSize: 12, fontWeight: "700" }}
          >
            {MODE_TEXT[state.mode] ? `${MODE_TEXT[state.mode]} · ` : ""}
            {state.candidates.length} eligible
          </Text>
        </View>
      ) : null}

      {showWinner ? (
        <View
          style={{
            marginTop: 20,
            width: "100%",
            maxWidth: 360,
            backgroundColor: "#FFFFFF",
            borderRadius: 22,
            paddingVertical: 18,
            paddingHorizontal: 16,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 6,
          }}
        >
          <Text
            allowFontScaling={false}
            style={{
              color: "#6B7280",
              fontSize: 11,
              fontWeight: "700",
              letterSpacing: 2,
            }}
          >
            WINNER
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              color: "#024E32",
              fontSize: 40,
              fontWeight: "900",
              marginTop: 4,
            }}
          >
            {winnerLabel}
          </Text>
          {state?.winner?.memberName ? (
            <Text
              allowFontScaling={false}
              style={{
                color: "#1F2937",
                fontSize: 16,
                fontWeight: "600",
                marginTop: 2,
              }}
            >
              {state.winner.memberName}
            </Text>
          ) : null}
          {state?.winner?.bidAmount ? (
            <Text
              allowFontScaling={false}
              style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}
            >
              Bid ₹{Number(state.winner.bidAmount).toLocaleString("en-IN")}
            </Text>
          ) : null}
          {Number(state?.chitValue) > 0 ? (
            <Text
              allowFontScaling={false}
              style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}
            >
              Chit value ₹{Number(state?.chitValue).toLocaleString("en-IN")}
            </Text>
          ) : null}
          {Number(state?.previousWinningBid) > 0 ? (
            <Text
              allowFontScaling={false}
              style={{ color: "#6B7280", fontSize: 13, marginTop: 4 }}
            >
              Previous winning bid ₹
              {Number(state?.previousWinningBid).toLocaleString("en-IN")}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={() => setResultOpen(true)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Show congratulations"
            style={{
              marginTop: 16,
              alignSelf: "stretch",
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              backgroundColor: "#024E32",
              borderWidth: 2,
              borderColor: "#D4AF37",
              alignItems: "center",
            }}
          >
            <Text
              allowFontScaling={false}
              style={{ color: "#F6E7A8", fontSize: 15, fontWeight: "900", letterSpacing: 0.5 }}
            >
              🎉 SHOW CONGRATULATIONS
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <WinnerCelebration
        visible={Boolean(showWinner) && resultOpen}
        onClose={() => setResultOpen(false)}
        groupMemberId={winnerLabel}
        memberName={state?.winner?.memberName}
        isWinner={Boolean(state?.winner?.isWinner)}
        winningBid={state?.winner?.bidAmount}
        chitValue={state?.chitValue}
        previousWinningBid={state?.previousWinningBid}
        auctionNumber={state?.auctionNumber}
        modeText={state ? MODE_TEXT[state.mode] || "" : ""}
      />
    </LinearGradient>
  );
}
