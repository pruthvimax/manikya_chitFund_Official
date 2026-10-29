import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, ScrollView, Text, TouchableOpacity, View } from "react-native";
import BACKEND_URL from "../config";

/* =========================================================
   Employee "Chit Schemes" - compact card design (replaces the table).
   Switch back with USE_NEW_EMPLOYEE_DESIGN = false
   (components/memberDesign.ts).
========================================================= */

const GREEN = "#024e32";
const GREEN_SOFT = "#e6f2ec";
const GOLD = "#e8a317";

const money = (v: any) => `₹${parseInt(String(v || 0), 10).toLocaleString("en-IN")}`;

/* 100000 -> "1L", 2500000 -> "25L", 10000000 -> "1Cr", 50000 -> "50K" */
const shortAmt = (v: any) => {
  const n = Number(v || 0);
  const fmt = (x: number) => String(Math.round(x * 10) / 10).replace(/\.0$/, "");
  if (n >= 10000000) return `${fmt(n / 10000000)}Cr`;
  if (n >= 100000) return `${fmt(n / 100000)}L`;
  if (n >= 1000) return `${fmt(n / 1000)}K`;
  return String(n);
};

const COLS = [
  { key: "dailyAmount", label: "Daily", icon: "today", color: "#1d6fd0", soft: "#e8f1fb" },
  { key: "weeklyAmount", label: "Weekly", icon: "date-range", color: "#7c3aed", soft: "#f1eafe" },
  { key: "monthlyAmount", label: "Monthly", icon: "event-available", color: "#b57e10", soft: "#fdf2d9" },
] as const;

type Tag = "popular" | "trending" | null;
type Stat = { members: number; groups: number };

const TAGS = {
  popular: { label: "Popular", icon: "local-fire-department", color: "#e11d48", soft: "#fff1f2", bar: "#f0b429" },
  trending: { label: "Trending", icon: "trending-up", color: "#7c3aed", soft: "#f5f0ff", bar: "#9b7bf5" },
} as const;

/* one card slides up + fades in, one after another */
function Reveal({ index, children }: { index: number; children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 380,
      delay: Math.min(index, 8) * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={{
        opacity: v,
        transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

/* glossy gold coin with the short amount */
function Coin({ label }: { label: string }) {
  return (
    <LinearGradient
      colors={["#fff4c7", "#f7c948", "#d9961a"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.85)",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
      }}
    >
      <View
        style={{
          width: 37,
          height: 37,
          borderRadius: 19,
          borderWidth: 1.5,
          borderColor: "rgba(150,90,0,0.55)",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.28)",
        }}
      >
        <Text style={{ color: "#7a4a00", fontWeight: "900", fontSize: label.length > 3 ? 11 : 14 }}>{label}</Text>
      </View>
    </LinearGradient>
  );
}

function Chip({ icon, text }: { icon?: any; text: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.16)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.22)",
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 8,
        marginRight: 6,
        marginTop: 5,
      }}
    >
      {!!icon && <MaterialIcons name={icon} size={11} color="#ffe29a" style={{ marginRight: 3 }} />}
      <Text style={{ fontSize: 11, color: "#fff", fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

/* corner tag with a light that sweeps across it, flame / arrow pulses */
function TagBadge({ tag }: { tag: "popular" | "trending" }) {
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.25, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, []);
  const T = TAGS[tag];
  const dark = tag === "popular";
  return (
    <LinearGradient
      colors={tag === "popular" ? ["#ffe08a", "#f59e0b"] : ["#b79cff", "#7c3aed"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.7)",
      }}
    >
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <MaterialIcons name={T.icon as any} size={14} color={dark ? "#7c2d00" : "#fff"} />
      </Animated.View>
      <Text style={{ color: dark ? "#6b2500" : "#fff", fontSize: 11, fontWeight: "900", marginLeft: 3, letterSpacing: 0.4 }}>
        {T.label.toUpperCase()}
      </Text>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -6,
          bottom: -6,
          width: 14,
          backgroundColor: "rgba(255,255,255,0.55)",
          transform: [
            { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-30, 110] }) },
            { rotate: "20deg" },
          ],
        }}
      />
    </LinearGradient>
  );
}

/* members bar: how full this scheme is compared with the busiest one */
function PopularityBar({ ratio, color }: { ratio: number; color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: ratio, duration: 900, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [ratio]);
  return (
    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(2,78,50,0.12)", overflow: "hidden" }}>
      <Animated.View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
          width: w.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}

function SchemeCard({
  s,
  tag,
  stat,
  maxMembers,
  onAction,
  actionLabel,
}: {
  s: any;
  tag: Tag;
  stat?: Stat;
  maxMembers: number;
  onAction?: () => void;
  actionLabel?: string;
}) {
  const t = tag ? TAGS[tag] : null;
  const ratio = stat && maxMembers > 0 ? Math.max(0.06, stat.members / maxMembers) : 0;
  return (
    <View
      style={{
        borderRadius: 20,
        backgroundColor: "#fff",
        marginBottom: 14,
        overflow: "hidden",
        borderWidth: t ? 1.5 : 1,
        borderColor: t ? t.bar : "#dbe9e2",
        shadowColor: t ? t.bar : GREEN,
        shadowOpacity: t ? 0.35 : 0.14,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 5,
      }}
    >
      {/* ---------- green header ---------- */}
      <LinearGradient
        colors={["#046b43", "#024e32", "#012f1f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 12, paddingTop: 11, paddingBottom: 11, overflow: "hidden" }}
      >
        {/* soft decorative rings */}
        <View style={{ position: "absolute", right: -28, top: -34, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.07)" }} />
        <View style={{ position: "absolute", right: 34, bottom: -46, width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(245,196,81,0.10)" }} />

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Coin label={shortAmt(s.chitAmount)} />
          <View style={{ flex: 1, marginLeft: 11 }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }} numberOfLines={1}>
              {money(s.chitAmount)}
              <Text style={{ fontSize: 12, fontWeight: "800", color: "#ffd76a" }}>  CHIT</Text>
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              <Chip icon="confirmation-number" text={String(s.chitId)} />
              <Chip icon="schedule" text={`${s.durationMonths} months`} />
            </View>
          </View>
        </View>

        {tag && (
          <View style={{ position: "absolute", top: 9, right: 10 }}>
            <TagBadge tag={tag} />
          </View>
        )}
      </LinearGradient>

      {/* ---------- amount tiles ---------- */}
      <View style={{ flexDirection: "row", paddingHorizontal: 10, paddingTop: 10, paddingBottom: 9 }}>
        {COLS.map((c, i) => (
          <View
            key={c.key}
            style={{
              flex: 1,
              marginLeft: i === 0 ? 0 : 7,
              backgroundColor: c.soft,
              borderRadius: 13,
              paddingVertical: 7,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: "#fff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name={c.icon as any} size={12} color={c.color} />
              </View>
              <Text style={{ marginLeft: 5, fontSize: 10.5, color: c.color, fontWeight: "800", letterSpacing: 0.3 }}>
                {c.label.toUpperCase()}
              </Text>
            </View>
            <Text style={{ marginTop: 4, fontSize: 15, fontWeight: "900", color: "#0f172a" }} numberOfLines={1} adjustsFontSizeToFit>
              {money((s as any)[c.key])}
            </Text>
          </View>
        ))}
      </View>

      {/* ---------- members strip ---------- */}
      {!!stat && stat.members > 0 && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingBottom: 10,
          }}
        >
          <MaterialIcons name="groups" size={16} color={t ? t.color : GREEN} />
          <Text style={{ marginLeft: 5, marginRight: 8, fontSize: 11.5, fontWeight: "700", color: "#374151" }}>
            {stat.members} member{stat.members > 1 ? "s" : ""} · {stat.groups} group{stat.groups > 1 ? "s" : ""}
          </Text>
          <PopularityBar ratio={ratio} color={t ? t.color : GREEN} />
        </View>
      )}

      {/* ---------- optional button (member side: Contact for Details) ---------- */}
      {!!onAction && (
        <TouchableOpacity activeOpacity={0.9} onPress={onAction} style={{ marginHorizontal: 10, marginBottom: 10 }}>
          <LinearGradient
            colors={["#ff9a1f", "#f2601c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              shadowColor: "#f2601c",
              shadowOpacity: 0.35,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 4,
              paddingVertical: 7,
              paddingLeft: 16,
              paddingRight: 7,
              borderRadius: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="support-agent" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14, marginLeft: 8 }}>{actionLabel || "Contact"}</Text>
            </View>
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcons name="arrow-forward" size={18} color="#e8570f" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ---------------- the list ---------------- */

const POP_KEY = "schemePopularity_v1";
type Filter = "all" | "popular" | "trending";

export function SchemeCards({
  schemes,
  onAction,
  actionLabel,
  hero,
}: {
  schemes: any[];
  onAction?: (s: any) => void;
  actionLabel?: string;
  hero?: { title: string; subtitle: string };
}) {
  // members / groups per chit scheme, from the groups list the app already has
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(POP_KEY);
        if (cached && alive) setStats(JSON.parse(cached));
      } catch {
        // ignore
      }
      try {
        const res = await fetch(`${BACKEND_URL}/groups`);
        if (!res.ok) return;
        const list = await res.json();
        if (!Array.isArray(list)) return;
        const next: Record<string, Stat> = {};
        list.forEach((g: any) => {
          const id = String(g?.chitId ?? "");
          if (!id) return;
          const cur = next[id] || { members: 0, groups: 0 };
          cur.members += Number(g?.memberCount ?? g?.members?.length ?? 0) || 0;
          cur.groups += 1;
          next[id] = cur;
        });
        if (alive) setStats(next);
        AsyncStorage.setItem(POP_KEY, JSON.stringify(next)).catch(() => {});
      } catch {
        // badges are optional - the cards still show without them
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // most members = Popular, the next two = Trending (only when they really have members)
  const tags = useMemo(() => {
    const ranked = schemes
      .map((s) => ({ id: String(s.chitId), members: stats[String(s.chitId)]?.members || 0 }))
      .filter((r) => r.members > 0)
      .sort((a, b) => b.members - a.members);
    const out: Record<string, Tag> = {};
    ranked.forEach((r, i) => {
      if (i === 0) out[r.id] = "popular";
      else if (i <= 2) out[r.id] = "trending";
    });
    return out;
  }, [schemes, stats]);

  const counts = useMemo(() => {
    const vals = Object.values(tags);
    return {
      all: schemes.length,
      popular: vals.filter((x) => x === "popular").length,
      trending: vals.filter((x) => x === "trending").length,
    };
  }, [tags, schemes]);

  const maxMembers = useMemo(
    () => Math.max(0, ...schemes.map((s) => stats[String(s.chitId)]?.members || 0)),
    [schemes, stats]
  );

  const shown = useMemo(
    () => (filter === "all" ? schemes : schemes.filter((s) => tags[String(s.chitId)] === filter)),
    [filter, schemes, tags]
  );

  const CHIPS: { key: Filter; label: string; icon?: any }[] = [
    { key: "all", label: "All" },
    { key: "popular", label: "Popular", icon: "local-fire-department" },
    { key: "trending", label: "Trending", icon: "trending-up" },
  ];

  return (
    <View style={{ paddingBottom: 24, backgroundColor: "#f3f8f5", minHeight: 400 }}>
      {/* optional banner on top (member side) */}
      {!!hero && (
        <LinearGradient
          colors={["#046b43", "#024e32", "#012f1f"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ marginHorizontal: 14, marginTop: 10, borderRadius: 20, padding: 14, overflow: "hidden" }}
        >
          <View style={{ position: "absolute", right: -26, top: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" }} />
          <View style={{ position: "absolute", right: 50, bottom: -48, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(245,196,81,0.12)" }} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.15)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <MaterialIcons name="spa" size={24} color="#ffe29a" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{hero.title}</Text>
              <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 12, marginTop: 2 }}>{hero.subtitle}</Text>
            </View>
            <View style={{ alignItems: "center", backgroundColor: "#f5c451", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: "#4a2c00", fontSize: 20, fontWeight: "900" }}>{schemes.length}</Text>
              <Text style={{ color: "#4a2c00", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 }}>SCHEMES</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 8 }}>
        {CHIPS.map((c) => {
          const on = filter === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              activeOpacity={0.85}
              onPress={() => setFilter(c.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                marginRight: 8,
                backgroundColor: on ? GREEN : "#fff",
                borderWidth: 1.2,
                borderColor: on ? GREEN : "#cfdcd5",
              }}
            >
              {!!c.icon && <MaterialIcons name={c.icon} size={14} color={on ? "#fff" : GREEN} style={{ marginRight: 3 }} />}
              <Text style={{ color: on ? "#fff" : GREEN, fontWeight: "700", fontSize: 13 }}>
                {c.label}
                <Text style={{ fontWeight: "600", opacity: 0.8 }}>  {counts[c.key]}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 14, marginTop: 10 }}>
        {shown.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 36 }}>
            <MaterialIcons name="hourglass-empty" size={40} color="#b8c4be" />
            <Text style={{ marginTop: 8, color: "#6b7f76" }}>No {filter} schemes right now</Text>
          </View>
        ) : (
          shown.map((s, i) => (
            <Reveal key={`${filter}-${s._id || i}`} index={i}>
              <SchemeCard s={s} tag={tags[String(s.chitId)] || null} stat={stats[String(s.chitId)]} maxMembers={maxMembers} onAction={onAction ? () => onAction(s) : undefined} actionLabel={actionLabel} />
            </Reveal>
          ))
        )}
      </View>
    </View>
  );
}

/* ---------------- loading placeholder (cards) ---------------- */
export function SchemeCardsSkeleton() {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{ opacity: pulse, paddingHorizontal: 14, paddingBottom: 24 }}>
      <View style={{ flexDirection: "row", marginBottom: 14 }}>
        {[70, 96, 100].map((w, i) => (
          <View key={i} style={{ width: w, height: 32, borderRadius: 16, backgroundColor: "#e5e7eb", marginRight: 8 }} />
        ))}
      </View>
      {[1, 2, 3, 4].map((k) => (
        <View key={k} style={{ borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 12, overflow: "hidden" }}>
          <View style={{ height: 4, backgroundColor: "#d1d5db" }} />
          <View style={{ flexDirection: "row", padding: 12 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#e5e7eb" }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ height: 18, width: 150, borderRadius: 6, backgroundColor: "#e5e7eb" }} />
              <View style={{ height: 14, width: 110, borderRadius: 6, backgroundColor: "#f0f1f3", marginTop: 8 }} />
            </View>
          </View>
          <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingBottom: 14 }}>
            {[1, 2, 3].map((t) => (
              <View key={t} style={{ flex: 1, height: 34, borderRadius: 8, backgroundColor: "#f3f4f6", marginLeft: t === 1 ? 0 : 10 }} />
            ))}
          </View>
        </View>
      ))}
    </Animated.View>
  );
}
