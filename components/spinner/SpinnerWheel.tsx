import React, { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";

/* =========================================================
   SPINNER WHEEL  - "Game Show" look

   Layers, back to front:
     1. static  : soft shadow, gold frame with a dark bulb channel
     2. rotating: slices (domed gradients), labels, rim pegs
     3. static  : glass reflection, inner ring, hub with a star
     4. static  : chasing marquee bulbs (blink faster while spinning)
     5. static  : ruby pointer that flicks every time a peg passes

   Slice 0 starts at the top and slices go clockwise - this matches
   spinnerMath.ts. The wheel is rotated with an Animated.Value in
   degrees; everything else is decoration.
========================================================= */

export type WheelPhase = "idle" | "countdown" | "spinning" | "done";

type Props = {
  labels: string[];
  size: number;
  rotation: Animated.Value; // degrees, clockwise
  highlightIndex?: number | null; // winning slice (others dim)
  phase?: WheelPhase;
  pointerTilt?: Animated.Value; // degrees, driven by the parent
  centerOverlay?: React.ReactNode; // e.g. the countdown number
};

const PALETTE = [
  { bg: "#046C45", fg: "#FFFFFF" },
  { bg: "#EBC85A", fg: "#1B2A22" },
  { bg: "#0C9A62", fg: "#FFFFFF" },
  { bg: "#F7E7AE", fg: "#1B2A22" },
  { bg: "#035A3B", fg: "#FFFFFF" },
  { bg: "#D4AF37", fg: "#1B2A22" },
  { bg: "#10B070", fg: "#FFFFFF" },
  { bg: "#C99A1F", fg: "#1B2A22" },
];

const polar = (cx: number, cy: number, r: number, angleDeg: number) => {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
};

const slicePath = (cx: number, cy: number, r: number, startDeg: number, endDeg: number) => {
  const s = polar(cx, cy, r, startDeg);
  const e = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
};

// darken (t < 0) or lighten (t > 0) a #rrggbb colour
const mix = (hex: string, t: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const target = t < 0 ? 0 : 255;
    const k = Math.abs(t);
    return Math.round(v + (target - v) * k);
  });
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
};

const starPoints = (cx: number, cy: number, outer: number, inner: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * 36 * Math.PI) / 180;
    pts.push(`${cx + r * Math.sin(a)},${cy - r * Math.cos(a)}`);
  }
  return pts.join(" ");
};

const BULBS = 24;

function SpinnerWheelBase({
  labels,
  size,
  rotation,
  highlightIndex,
  phase = "idle",
  pointerTilt,
  centerOverlay,
}: Props) {
  const count = Math.max(labels.length, 1);
  const c = size / 2;
  const rim = size / 2 - 2;
  const rimW = size * 0.095;
  const inner = rim - rimW;
  const r = inner - 3;
  const seg = 360 / count;

  const pointerW = size * 0.13;
  const pointerH = size * 0.17;
  const top = pointerH * 0.42; // wheel sits this far below the container top
  const bottomPad = size * 0.05;

  const fontSize = Math.max(
    9,
    Math.min(22, ((2 * Math.PI * r * 0.6) / count) * 0.8, size * 0.07)
  );

  /* ----- slice colours: never two equal colours side by side ----- */
  const slices = useMemo(() => {
    return labels.map((label, i) => {
      let k = i % PALETTE.length;
      if (count > 1 && i === count - 1 && k === 0) k = 3; // last slice would touch slice 0
      const color = PALETTE[k];
      const start = i * seg;
      const end = (i + 1) * seg;
      return { label, i, k, start, end, mid: start + seg / 2, color };
    });
  }, [labels, seg, count]);

  const usedColors = useMemo(
    () => Array.from(new Set(slices.map((s) => s.k))),
    [slices]
  );

  /* ----- marquee bulbs ----- */
  const blink = useRef(new Animated.Value(0)).current;
  const sync = phase === "done";

  useEffect(() => {
    const dur =
      phase === "spinning" ? 140 : phase === "countdown" ? 260 : phase === "done" ? 520 : 780;
    blink.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, {
          toValue: 1,
          duration: dur,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(blink, {
          toValue: 0,
          duration: dur,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [phase, blink]);

  const opA = blink.interpolate({ inputRange: [0, 1], outputRange: [0.22, 1] });
  const opB = sync ? opA : blink.interpolate({ inputRange: [0, 1], outputRange: [1, 0.22] });

  const bulbD = size * 0.03;
  const halo = bulbD * 2.8;
  const bulbR = rim - rimW / 2;
  const bulbs = useMemo(
    () =>
      Array.from({ length: BULBS }, (_, i) => {
        const p = polar(c, c, bulbR, (i * 360) / BULBS);
        return { i, x: p.x, y: p.y };
      }),
    [c, bulbR]
  );

  /* ----- wheel + pointer animation ----- */
  const spin = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend",
  });

  const ownTilt = useRef(new Animated.Value(0)).current;
  const tilt = pointerTilt || ownTilt;
  const tiltDeg = tilt.interpolate({
    inputRange: [-40, 40],
    outputRange: ["-40deg", "40deg"],
    extrapolate: "clamp",
  });

  const dimOthers = highlightIndex !== null && highlightIndex !== undefined;
  const hubR = size * 0.1;

  return (
    <View style={{ width: size, height: top + size + bottomPad }}>
      {/* ============ 1. static back: shadow + frame ============ */}
      <View style={{ position: "absolute", top, width: size, height: size + bottomPad }}>
        <Svg width={size} height={size + bottomPad}>
          <Defs>
            <LinearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFF3B0" />
              <Stop offset="0.45" stopColor="#D4AF37" />
              <Stop offset="0.75" stopColor="#F3DC8A" />
              <Stop offset="1" stopColor="#8A6D1D" />
            </LinearGradient>
            <LinearGradient id="channel" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#06402B" />
              <Stop offset="1" stopColor="#021510" />
            </LinearGradient>
          </Defs>

          {/* soft ground shadow */}
          <Ellipse cx={c} cy={size + bottomPad * 0.45} rx={size * 0.4} ry={bottomPad * 0.5} fill="rgba(0,0,0,0.28)" />
          <Ellipse cx={c} cy={size + bottomPad * 0.45} rx={size * 0.3} ry={bottomPad * 0.34} fill="rgba(0,0,0,0.22)" />

          <Circle cx={c} cy={c} r={rim} fill="url(#frame)" />
          <Circle cx={c} cy={c} r={rim - rimW * 0.15} fill="url(#channel)" />
          <Circle cx={c} cy={c} r={inner + rimW * 0.15} fill="url(#frame)" />
          <Circle cx={c} cy={c} r={inner} fill="#031C13" />
          <Circle cx={c} cy={c} r={rim - 1} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.2} />
        </Svg>
      </View>

      {/* ============ 2. rotating: slices, labels, pegs ============ */}
      <Animated.View
        style={{
          position: "absolute",
          top,
          width: size,
          height: size,
          transform: [{ rotate: spin }],
        }}
      >
        <Svg width={size} height={size}>
          <Defs>
            {usedColors.map((k) => (
              <RadialGradient
                key={`g${k}`}
                id={`sg${k}`}
                cx={c}
                cy={c}
                r={r}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={mix(PALETTE[k].bg, -0.42)} />
                <Stop offset="0.6" stopColor={PALETTE[k].bg} />
                <Stop offset="1" stopColor={mix(PALETTE[k].bg, 0.16)} />
              </RadialGradient>
            ))}
          </Defs>

          {count === 1 ? (
            <Circle cx={c} cy={c} r={r} fill="url(#sg0)" />
          ) : (
            slices.map((s) => {
              const isWin = dimOthers && highlightIndex === s.i;
              return (
                <Path
                  key={`p-${s.i}`}
                  d={slicePath(c, c, r, s.start, s.end)}
                  fill={`url(#sg${s.k})`}
                  fillOpacity={dimOthers && !isWin ? 0.42 : 1}
                  stroke={isWin ? "#FFF3B0" : "rgba(255,255,255,0.4)"}
                  strokeWidth={isWin ? 3.5 : 1}
                />
              );
            })
          )}

          {/* labels, written along the radius */}
          {slices.map((s) => {
            const isWin = dimOthers && highlightIndex === s.i;
            return (
              <G key={`t-${s.i}`} transform={`rotate(${s.mid - 90} ${c} ${c})`}>
                <SvgText
                  x={c + r - size * 0.045}
                  y={c + fontSize * 0.35}
                  fontSize={isWin ? fontSize * 1.1 : fontSize}
                  fontWeight="800"
                  fill={s.color.fg}
                  fillOpacity={dimOthers && !isWin ? 0.55 : 1}
                  textAnchor="end"
                >
                  {s.label}
                </SvgText>
              </G>
            );
          })}

          {/* pegs on the slice borders */}
          {slices.map((s) => {
            const p = polar(c, c, r - size * 0.012, s.start);
            const pr = Math.max(2.4, size * 0.0095);
            return (
              <G key={`peg-${s.i}`}>
                <Circle cx={p.x} cy={p.y} r={pr} fill="#FFF3B0" stroke="#8A6D1D" strokeWidth={0.8} />
                <Circle cx={p.x - pr * 0.25} cy={p.y - pr * 0.25} r={pr * 0.35} fill="#FFFFFF" />
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* ============ 3. static front: gloss, inner ring, hub ============ */}
      <View pointerEvents="none" style={{ position: "absolute", top, width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient
              id="gloss"
              cx={c - r * 0.3}
              cy={c - r * 0.42}
              r={r * 1.05}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
              <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.06" />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#FFF3B0" />
              <Stop offset="0.45" stopColor="#D4AF37" />
              <Stop offset="0.75" stopColor="#F3DC8A" />
              <Stop offset="1" stopColor="#8A6D1D" />
            </LinearGradient>
            <RadialGradient id="hubg" cx="50%" cy="38%" r="70%">
              <Stop offset="0" stopColor="#0E6B45" />
              <Stop offset="1" stopColor="#021A12" />
            </RadialGradient>
          </Defs>

          <Circle cx={c} cy={c} r={r} fill="url(#gloss)" />
          <Circle cx={c} cy={c} r={r} fill="none" stroke="#D4AF37" strokeWidth={2} />

          {/* hub */}
          <Circle cx={c} cy={c} r={hubR * 1.18} fill="rgba(0,0,0,0.28)" />
          <Circle cx={c} cy={c} r={hubR} fill="url(#frame)" />
          <Circle cx={c} cy={c} r={hubR * 0.78} fill="url(#hubg)" stroke="#FFF3B0" strokeWidth={1.2} />
          <Polygon points={starPoints(c, c, hubR * 0.52, hubR * 0.22)} fill="#F6E7A8" />
        </Svg>
      </View>

      {/* ============ 4. marquee bulbs ============ */}
      <View pointerEvents="none" style={{ position: "absolute", top, width: size, height: size }}>
        {bulbs.map((b) => (
          <Animated.View
            key={b.i}
            style={{
              position: "absolute",
              left: b.x - halo / 2,
              top: b.y - halo / 2,
              width: halo,
              height: halo,
              alignItems: "center",
              justifyContent: "center",
              opacity: b.i % 2 === 0 ? opA : opB,
            }}
          >
            <View
              style={{
                position: "absolute",
                width: halo,
                height: halo,
                borderRadius: halo / 2,
                backgroundColor: "rgba(255,226,120,0.38)",
              }}
            />
            <View
              style={{
                width: bulbD,
                height: bulbD,
                borderRadius: bulbD / 2,
                backgroundColor: "#FFF8D2",
                borderWidth: 1,
                borderColor: "#E9C46A",
              }}
            />
          </Animated.View>
        ))}
      </View>

      {/* ============ centre overlay (countdown number) ============ */}
      {centerOverlay ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top,
            width: size,
            height: size,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {centerOverlay}
        </View>
      ) : null}

      {/* ============ 5. pointer ============ */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: (size - pointerW) / 2,
          width: pointerW,
          height: pointerH,
        }}
      >
        <Animated.View
          style={{
            width: pointerW,
            height: pointerH,
            transform: [{ translateY: -pointerH / 2 }, { rotate: tiltDeg }, { translateY: pointerH / 2 }],
          }}
        >
          <Svg width={pointerW} height={pointerH}>
            <Defs>
              <LinearGradient id="frame2" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FFF3B0" />
                <Stop offset="0.5" stopColor="#D4AF37" />
                <Stop offset="1" stopColor="#8A6D1D" />
              </LinearGradient>
              <LinearGradient id="pin" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#FF6B6B" />
                <Stop offset="0.55" stopColor="#D62828" />
                <Stop offset="1" stopColor="#7F1414" />
              </LinearGradient>
            </Defs>
            <Polygon
              points={`${pointerW * 0.08},${pointerH * 0.14} ${pointerW * 0.92},${pointerH * 0.14} ${pointerW / 2},${pointerH}`}
              fill="url(#pin)"
              stroke="#FFF3B0"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <Polygon
              points={`${pointerW * 0.22},${pointerH * 0.22} ${pointerW * 0.46},${pointerH * 0.22} ${pointerW * 0.46},${pointerH * 0.62}`}
              fill="rgba(255,255,255,0.35)"
            />
            <Circle cx={pointerW / 2} cy={pointerH * 0.15} r={pointerW * 0.2} fill="url(#frame2)" stroke="#8A6D1D" strokeWidth={1} />
            <Circle cx={pointerW / 2} cy={pointerH * 0.15} r={pointerW * 0.08} fill="#7F1414" />
          </Svg>
        </Animated.View>
      </View>
    </View>
  );
}

export default memo(SpinnerWheelBase);
