import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgGradient,
  Polygon,
  RadialGradient,
  Stop,
} from "react-native-svg";

/* =========================================================
   WINNER CELEBRATION  - "Gold Medal Ceremony"

   Shown on every phone when the live draw stops.

   Everyone sees the winner's group member ID. The name appears only
   when `isWinner` is true (the server sends the name only to the
   winner's own phone and to the admin).

   Look: dark emerald card with a gold frame, a gold ribbon, a medal
   with laurel branches that holds the winner ID, rotating light
   rays, fireworks, falling confetti, a light sweep across the medal
   and glass number tiles whose amounts count up.

   Only React Native's Animated + react-native-svg are used.
========================================================= */

type Props = {
  visible: boolean;
  onClose: () => void;
  groupMemberId: string;
  memberName?: string;
  isWinner?: boolean;
  winningBid?: number;
  chitValue?: number;
  previousWinningBid?: number;
  modeText?: string;
};

const GOLD = "#F6E7A8";
const GOLD_MID = "#D4AF37";
const GOLD_DARK = "#8A6D1D";
const CONFETTI_COLORS = ["#E9C46A", "#F6E7A8", "#34D399", "#FFFFFF", "#D4AF37", "#FB7185", "#60A5FA"];
const PIECES = 36;
const RAYS = 18;

const rupees = (n?: number) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;

/* ---------- falling confetti ---------- */
function ConfettiPiece({ index, width, height }: { index: number; width: number; height: number }) {
  const fall = useRef(new Animated.Value(0)).current;

  const left = ((index * 37 + 11) % 100) / 100;
  const delay = (index % 10) * 200;
  const duration = 2600 + (index % 5) * 450;
  const size = 6 + (index % 3) * 3;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const turns = 2 + (index % 4);
  const round = index % 3 === 0;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(fall, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, duration, fall]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: -20,
        left: left * width,
        width: size,
        height: round ? size : size * 1.8,
        borderRadius: round ? size / 2 : 2,
        backgroundColor: color,
        opacity: fall.interpolate({ inputRange: [0, 0.05, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        transform: [
          { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
          {
            translateX: fall.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, index % 2 ? 22 : -22, 0],
            }),
          },
          { rotate: fall.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${turns * 360}deg`] }) },
        ],
      }}
    />
  );
}

/* ---------- firework burst ---------- */
const BURST_PARTICLES = 14;

function Burst({ x, y, delay, color, radius }: { x: number; y: number; delay: number; color: string; radius: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.delay(1700),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, t]);

  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: 0, height: 0 }}>
      {Array.from({ length: BURST_PARTICLES }, (_, i) => {
        const a = (i / BURST_PARTICLES) * Math.PI * 2;
        const far = radius * (i % 2 ? 1 : 0.72);
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              width: i % 2 ? 5 : 4,
              height: i % 2 ? 5 : 4,
              borderRadius: 3,
              backgroundColor: i % 3 === 0 ? "#FFFFFF" : color,
              opacity: t.interpolate({ inputRange: [0, 0.08, 0.7, 1], outputRange: [0, 1, 0.9, 0] }),
              transform: [
                { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(a) * far] }) },
                { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(a) * far + 14] }) },
                { scale: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.2, 0.5] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

/* ---------- twinkling sparkle ---------- */
function Sparkle({ left, top, size, delay }: { left: number; top: number; size: number; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 650, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(900),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, t]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top,
        opacity: t,
        transform: [
          { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
          { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] }) },
        ],
      }}
    >
      <MaterialIcons name="auto-awesome" size={size} color={GOLD} />
    </Animated.View>
  );
}

/* ---------- rotating light rays ---------- */
function Rays({ size }: { size: number }) {
  const c = size / 2;
  const polys = useMemo(() => {
    const step = 360 / RAYS;
    const half = step / 4;
    const pt = (deg: number, r: number) => {
      const a = (deg * Math.PI) / 180;
      return `${c + r * Math.sin(a)},${c - r * Math.cos(a)}`;
    };
    return Array.from({ length: RAYS }, (_, i) => {
      const mid = i * step;
      return `${c},${c} ${pt(mid - half, c)} ${pt(mid + half, c)}`;
    });
  }, [c]);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <RadialGradient id="rayfade" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F6E7A8" stopOpacity="0.34" />
          <Stop offset="1" stopColor="#F6E7A8" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {polys.map((points, i) => (
        <Polygon key={i} points={points} fill="url(#rayfade)" />
      ))}
    </Svg>
  );
}

/* ---------- gold ribbon ---------- */
function RibbonShape({ width }: { width: number }) {
  const W = width;
  const H = 52;
  return (
    <Svg width={W} height={H}>
      <Defs>
        <SvgGradient id="band" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF3B0" />
          <Stop offset="0.5" stopColor={GOLD_MID} />
          <Stop offset="1" stopColor="#B8902A" />
        </SvgGradient>
        <SvgGradient id="tail" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#C9A227" />
          <Stop offset="1" stopColor="#7A5F16" />
        </SvgGradient>
      </Defs>
      {/* forked tails */}
      <Polygon points={`0,16 34,16 34,48 0,48 12,32`} fill="url(#tail)" />
      <Polygon points={`${W},16 ${W - 34},16 ${W - 34},48 ${W},48 ${W - 12},32`} fill="url(#tail)" />
      {/* folds */}
      <Polygon points={`26,38 44,38 26,50`} fill="#5E4810" />
      <Polygon points={`${W - 26},38 ${W - 44},38 ${W - 26},50`} fill="#5E4810" />
      {/* main band */}
      <Polygon points={`22,4 ${W - 22},4 ${W - 22},40 22,40`} fill="url(#band)" />
      <Polygon points={`22,4 ${W - 22},4 ${W - 22},7 22,7`} fill="rgba(255,255,255,0.55)" />
    </Svg>
  );
}

/* ---------- medal with laurel wreath ---------- */
function MedalArt({ size }: { size: number }) {
  const c = size / 2;
  const k = size / 230; // everything below is drawn for a 230 canvas

  const teeth = useMemo(() => {
    const n = 32;
    const pts: string[] = [];
    for (let i = 0; i < n * 2; i++) {
      const r = (i % 2 === 0 ? 70 : 65) * k;
      const a = (i / (n * 2)) * Math.PI * 2;
      pts.push(`${c + r * Math.sin(a)},${c - r * Math.cos(a)}`);
    }
    return pts.join(" ");
  }, [c, k]);

  const leaves = useMemo(() => {
    const out: { x: number; y: number; rot: number; fill: string }[] = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const theta = 192 + (i / (n - 1)) * 150; // 192..342 degrees (left side, going up)
      const a = (theta * Math.PI) / 180;
      const R = 90 * k;
      out.push({
        x: c + R * Math.sin(a),
        y: c - R * Math.cos(a),
        rot: theta - 90 - 28, // long axis along the arc, tilted outwards
        fill: i % 2 ? "url(#leafA)" : "url(#leafB)",
      });
    }
    return out;
  }, [c, k]);

  return (
    <Svg width={size} height={size}>
      <Defs>
        <SvgGradient id="rim" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF3B0" />
          <Stop offset="0.5" stopColor={GOLD_MID} />
          <Stop offset="1" stopColor={GOLD_DARK} />
        </SvgGradient>
        <SvgGradient id="leafA" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF3B0" />
          <Stop offset="1" stopColor="#C9A227" />
        </SvgGradient>
        <SvgGradient id="leafB" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E9C46A" />
          <Stop offset="1" stopColor="#8A6D1D" />
        </SvgGradient>
        <RadialGradient id="disc" cx="50%" cy="38%" r="70%">
          <Stop offset="0" stopColor="#0E6B45" />
          <Stop offset="1" stopColor="#03251A" />
        </RadialGradient>
      </Defs>

      {/* laurel: left branch, then mirrored copy for the right branch */}
      <G>
        {leaves.map((l, i) => (
          <Ellipse
            key={`l${i}`}
            cx={l.x}
            cy={l.y}
            rx={6.5 * k}
            ry={15 * k}
            fill={l.fill}
            transform={`rotate(${l.rot} ${l.x} ${l.y})`}
          />
        ))}
      </G>
      <G transform={`translate(${size} 0) scale(-1 1)`}>
        {leaves.map((l, i) => (
          <Ellipse
            key={`r${i}`}
            cx={l.x}
            cy={l.y}
            rx={6.5 * k}
            ry={15 * k}
            fill={l.fill}
            transform={`rotate(${l.rot} ${l.x} ${l.y})`}
          />
        ))}
      </G>

      {/* medal: toothed rim, ring, dark disc */}
      <Polygon points={teeth} fill="url(#rim)" />
      <Circle cx={c} cy={c} r={60 * k} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
      <Circle cx={c} cy={c} r={55 * k} fill={GOLD_DARK} />
      <Circle cx={c} cy={c} r={52 * k} fill="url(#disc)" stroke={GOLD} strokeWidth={1.5} />
    </Svg>
  );
}

/* ---------- reveal wrapper (slides up + fades in) ---------- */
function Reveal({
  reveal,
  order,
  style,
  children,
}: {
  reveal: Animated.Value;
  order: number;
  style?: any;
  children: React.ReactNode;
}) {
  const from = Math.min(order * 0.22, 0.66);
  const to = Math.min(from + 0.34, 1);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: reveal.interpolate({ inputRange: [from, to], outputRange: [0, 1], extrapolate: "clamp" }),
          transform: [
            {
              translateY: reveal.interpolate({ inputRange: [from, to], outputRange: [20, 0], extrapolate: "clamp" }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ---------- glass number tile ---------- */
function Tile({
  icon,
  label,
  value,
  gold,
  compact,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: string;
  gold?: boolean;
  compact?: boolean;
}) {
  const inner = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: compact ? 4 : 8 }}>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: gold ? "rgba(1,40,26,0.18)" : "rgba(246,231,168,0.16)",
          }}
        >
          <MaterialIcons name={icon} size={13} color={gold ? "#01281A" : GOLD} />
        </View>
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={{
            marginLeft: 7,
            flex: 1,
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1,
            color: gold ? "rgba(1,40,26,0.75)" : "rgba(255,255,255,0.62)",
          }}
        >
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        allowFontScaling={false}
        adjustsFontSizeToFit
        numberOfLines={1}
        style={{
          fontSize: compact ? 17 : 22,
          fontWeight: "900",
          color: gold ? "#01281A" : "#FFFFFF",
        }}
      >
        {value}
      </Text>
    </>
  );

  if (gold) {
    return (
      <LinearGradient
        colors={["#FFF3B0", GOLD_MID, "#B8902A"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 18, padding: 13, flex: 1 }}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        borderRadius: 18,
        padding: 13,
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 1,
        borderColor: "rgba(246,231,168,0.32)",
      }}
    >
      {inner}
    </View>
  );
}

export default function WinnerCelebration({
  visible,
  onClose,
  groupMemberId,
  memberName,
  isWinner,
  winningBid,
  chitValue,
  previousWinningBid,
  modeText,
}: Props) {
  const { width, height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(false);

  const pop = useRef(new Animated.Value(0)).current; // card
  const drop = useRef(new Animated.Value(0)).current; // ribbon + medal
  const idPop = useRef(new Animated.Value(0)).current; // winner ID
  const reveal = useRef(new Animated.Value(0)).current; // tiles
  const glow = useRef(new Animated.Value(0)).current; // pulse
  const spin = useRef(new Animated.Value(0)).current; // rays
  const sweep = useRef(new Animated.Value(0)).current; // light sweep
  const count = useRef(new Animated.Value(0)).current; // count-up
  const [shown, setShown] = useState({ bid: 0, chit: 0 });

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => {});
  }, []);

  const bidTarget = Number(winningBid) || 0;
  const chitTarget = Number(chitValue) || 0;

  useEffect(() => {
    if (!visible) {
      [pop, drop, idPop, reveal, count].forEach((v) => v.setValue(0));
      setShown({ bid: 0, chit: 0 });
      return;
    }

    const fast = reduceMotion;

    const listener = count.addListener(({ value }) =>
      setShown({ bid: Math.round(bidTarget * value), chit: Math.round(chitTarget * value) })
    );

    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(fast ? 0 : 200),
        Animated.spring(drop, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(fast ? 0 : 520),
        Animated.spring(idPop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(fast ? 0 : 800),
        Animated.timing(reveal, {
          toValue: 1,
          duration: fast ? 1 : 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.delay(fast ? 0 : 950),
        Animated.timing(count, {
          toValue: 1,
          duration: fast ? 1 : 1300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]),
    ]).start();

    const loops: Animated.CompositeAnimation[] = [];
    if (!fast) {
      loops.push(
        Animated.loop(
          Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: true })
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(glow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(1800),
            Animated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        )
      );
      loops.forEach((l) => l.start());
    }

    return () => {
      count.removeListener(listener);
      loops.forEach((l) => l.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion, bidTarget, chitTarget]);

  const pieces = useMemo(() => Array.from({ length: PIECES }, (_, i) => i), []);

  const cardWidth = Math.min(width - 28, 392);
  const frame = 2;
  const innerWidth = cardWidth - frame * 2;
  const medalSize = Math.max(176, Math.min(230, Math.round(height * 0.285)));
  const discSize = Math.round(104 * (medalSize / 230));
  const raySize = Math.min(cardWidth * 1.3, medalSize * 1.75);
  const ribbonWidth = Math.min(innerWidth - 30, 320);

  const hasPrev = Number(previousWinningBid) > 0;
  const hasChit = chitTarget > 0;
  const showName = Boolean(isWinner) && Boolean(memberName);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        accessibilityViewIsModal
        style={{
          flex: 1,
          backgroundColor: "rgba(1,10,6,0.9)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* soft green spotlight behind the card */}
        <Svg width={width} height={height} style={{ position: "absolute", top: 0, left: 0 }} pointerEvents="none">
          <Defs>
            <RadialGradient id="spot" cx="50%" cy="46%" r="62%">
              <Stop offset="0" stopColor="#12A06A" stopOpacity="0.42" />
              <Stop offset="1" stopColor="#12A06A" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={width / 2} cy={height * 0.46} r={Math.max(width, height) * 0.62} fill="url(#spot)" />
        </Svg>

        {!reduceMotion && (
          <>
            <Burst x={width * 0.16} y={height * 0.18} delay={0} color="#F6E7A8" radius={74} />
            <Burst x={width * 0.84} y={height * 0.26} delay={900} color="#34D399" radius={68} />
            <Burst x={width * 0.5} y={height * 0.07} delay={1700} color="#FB7185" radius={64} />
            {pieces.map((i) => (
              <ConfettiPiece key={i} index={i} width={width} height={height} />
            ))}
          </>
        )}

        <Animated.View
          style={{
            width: cardWidth,
            maxHeight: height - 36,
            borderRadius: 32,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
            opacity: pop,
            shadowColor: GOLD,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 28,
            elevation: 20,
          }}
        >
          {/* gold frame */}
          <LinearGradient
            colors={["#FFF3B0", GOLD_MID, GOLD_DARK, GOLD_MID]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 32, padding: frame }}
          >
            <View style={{ borderRadius: 30, overflow: "hidden", maxHeight: height - 36 - frame * 2 }}>
              <LinearGradient
                colors={["#021F15", "#03402A", "#024E32", "#02281A"]}
                locations={[0, 0.35, 0.65, 1]}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
              >
                <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                  {/* ---------- hero ---------- */}
                  <View style={{ alignItems: "center", paddingTop: 20 }}>
                    {/* rotating rays behind the medal */}
                    <Animated.View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 52 + medalSize / 2 - raySize / 2 + 8,
                        left: (innerWidth - raySize) / 2,
                        width: raySize,
                        height: raySize,
                        transform: [
                          { rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) },
                        ],
                      }}
                    >
                      <Rays size={raySize} />
                    </Animated.View>

                    {!reduceMotion ? (
                      <>
                        <Sparkle left={innerWidth * 0.1} top={70} size={20} delay={0} />
                        <Sparkle left={innerWidth * 0.84} top={96} size={16} delay={450} />
                        <Sparkle left={innerWidth * 0.2} top={210} size={14} delay={900} />
                        <Sparkle left={innerWidth * 0.78} top={228} size={22} delay={1300} />
                        <Sparkle left={innerWidth * 0.5} top={58} size={12} delay={1700} />
                      </>
                    ) : null}

                    {/* ribbon */}
                    <Animated.View
                      style={{
                        width: ribbonWidth,
                        height: 52,
                        alignItems: "center",
                        opacity: drop,
                        transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
                      }}
                    >
                      <RibbonShape width={ribbonWidth} />
                      <Text
                        allowFontScaling={false}
                        accessibilityRole="header"
                        numberOfLines={1}
                        style={{
                          position: "absolute",
                          top: 12,
                          color: "#01281A",
                          fontSize: 14,
                          fontWeight: "900",
                          letterSpacing: 3,
                        }}
                      >
                        CONGRATULATIONS
                      </Text>
                    </Animated.View>

                    {/* medal */}
                    <Animated.View
                      style={{
                        marginTop: 8,
                        width: medalSize,
                        height: medalSize,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: drop,
                        transform: [
                          { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) },
                          { scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) },
                        ],
                      }}
                    >
                      <MedalArt size={medalSize} />

                      {/* light sweep, clipped to the dark disc */}
                      <View
                        pointerEvents="none"
                        style={{
                          position: "absolute",
                          width: discSize,
                          height: discSize,
                          borderRadius: discSize / 2,
                          overflow: "hidden",
                        }}
                      >
                        <Animated.View
                          style={{
                            position: "absolute",
                            top: -10,
                            bottom: -10,
                            width: 34,
                            transform: [
                              { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-60, discSize + 30] }) },
                              { rotate: "18deg" },
                            ],
                          }}
                        >
                          <LinearGradient
                            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.42)", "rgba(255,255,255,0)"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                          />
                        </Animated.View>
                      </View>

                      {/* star on top of the wreath */}
                      <View style={{ position: "absolute", top: 2 }}>
                        <MaterialIcons name="star" size={22} color={GOLD} />
                      </View>

                      {/* label + winner ID inside the disc */}
                      <View
                        style={{
                          position: "absolute",
                          width: discSize,
                          height: discSize,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          allowFontScaling={false}
                          style={{ color: GOLD, fontSize: 9, fontWeight: "800", letterSpacing: 3 }}
                        >
                          WINNER
                        </Text>
                        <Animated.Text
                          allowFontScaling={false}
                          adjustsFontSizeToFit
                          numberOfLines={1}
                          style={{
                            width: discSize - 8,
                            textAlign: "center",
                            color: "#FFFFFF",
                            fontSize: Math.round(
                              discSize *
                                (groupMemberId.length <= 3
                                  ? 0.42
                                  : groupMemberId.length === 4
                                  ? 0.28
                                  : 0.22)
                            ),
                            fontWeight: "900",
                            marginTop: 1,
                            textShadowColor: "rgba(246,231,168,0.85)",
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 14,
                            opacity: idPop,
                            transform: [{ scale: idPop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
                          }}
                        >
                          {groupMemberId}
                        </Animated.Text>
                      </View>
                    </Animated.View>

                    {/* who */}
                    <Animated.View style={{ marginTop: 4, opacity: idPop, alignItems: "center", paddingHorizontal: 18 }}>
                      {showName ? (
                        <>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: "rgba(246,231,168,0.16)",
                              borderWidth: 1,
                              borderColor: "rgba(246,231,168,0.55)",
                              borderRadius: 999,
                              paddingHorizontal: 14,
                              paddingVertical: 7,
                              maxWidth: innerWidth - 40,
                            }}
                          >
                            <MaterialIcons name="person" size={16} color={GOLD} />
                            <Text
                              allowFontScaling={false}
                              numberOfLines={1}
                              style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800", marginLeft: 6, flexShrink: 1 }}
                            >
                              {memberName}
                            </Text>
                          </View>
                          <Text
                            allowFontScaling={false}
                            style={{ color: GOLD, fontSize: 11, fontWeight: "800", letterSpacing: 2.5, marginTop: 8 }}
                          >
                            YOU WON THIS AUCTION
                          </Text>
                        </>
                      ) : (
                        <Text
                          allowFontScaling={false}
                          style={{
                            color: "rgba(255,255,255,0.78)",
                            fontSize: 11,
                            fontWeight: "800",
                            letterSpacing: 2.5,
                            marginTop: 2,
                          }}
                        >
                          {isWinner ? "YOU WON THIS AUCTION" : "AUCTION WINNER"}
                        </Text>
                      )}
                    </Animated.View>
                  </View>

                  {/* ---------- number tiles ---------- */}
                  <View style={{ paddingHorizontal: 18, paddingTop: 18 }}>
                    <Reveal reveal={reveal} order={0} style={{ flexDirection: "row" }}>
                      {hasChit ? (
                        <>
                          <Tile icon="account-balance" label="Chit Value" value={rupees(shown.chit)} />
                          <View style={{ width: 10 }} />
                        </>
                      ) : null}
                      <View style={{ flex: hasChit ? 1.1 : 1, flexDirection: "row" }}>
                        <Tile
                          icon="gavel"
                          label="Winning Bid"
                          value={bidTarget > 0 ? rupees(shown.bid) : "-"}
                          gold
                        />
                      </View>
                    </Reveal>

                    {hasPrev ? (
                      <Reveal reveal={reveal} order={1} style={{ flexDirection: "row", marginTop: 10 }}>
                        <Tile icon="history" label="Previous Winning Bid" value={rupees(previousWinningBid)} compact />
                      </Reveal>
                    ) : null}
                  </View>

                  {modeText ? (
                    <Text
                      allowFontScaling={false}
                      style={{
                        color: "rgba(255,255,255,0.45)",
                        fontSize: 11,
                        fontWeight: "600",
                        textAlign: "center",
                        marginTop: 12,
                      }}
                    >
                      {modeText}
                    </Text>
                  ) : null}

                  <View style={{ padding: 18, paddingTop: 16 }}>
                    <TouchableOpacity
                      onPress={onClose}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel="Close"
                      style={{ borderRadius: 16, overflow: "hidden" }}
                    >
                      <LinearGradient
                        colors={["#FFF3B0", GOLD_MID, "#B8902A"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ paddingVertical: 14, alignItems: "center" }}
                      >
                        <Text
                          allowFontScaling={false}
                          style={{ color: "#01281A", fontWeight: "900", fontSize: 15, letterSpacing: 1 }}
                        >
                          CLOSE
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </LinearGradient>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}
