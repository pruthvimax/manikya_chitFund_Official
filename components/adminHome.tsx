import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  GestureResponderEvent,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import BACKEND_URL from "../config";

// =========================================================
// NEW ADMIN DASHBOARD LOOK (used by app/admin/index.tsx only when
// USE_NEW_ADMIN_DESIGN is true). It only READS data from routes the
// admin app already uses. No existing logic is changed.
// =========================================================

export const COLORS = {
  primary: "#024e32",
  bg: "#f7f9f8",
  border: "#e8f0eb",
};

const TINTS = [
  { bg: "#eaf4ef", fg: "#024e32" },
  { bg: "#e8f1fb", fg: "#1d6fd0" },
  { bg: "#fdf4e3", fg: "#b57e10" },
  { bg: "#f3ecfb", fg: "#7b3fd1" },
  { bg: "#fdeaea", fg: "#c0392b" },
  { bg: "#e6f7f1", fg: "#0f8f6c" },
];
const TICKET_ACCENTS = ["#0284c7", "#7c3aed", "#b45309", "#e11d48", "#0f8f6c"];
const KPI_RING_COLORS = ["#fbbf24", "#38bdf8", "#f472b6", "#a78bfa"];

const STAT_ITEMS = [
  { key: "chits", label: "Total Chits", icon: "account-balance-wallet", route: "/admin/chitSchemes" },
  { key: "groups", label: "Total Groups", icon: "group-work", route: "/admin/groups" },
  { key: "members", label: "Total Members", icon: "people", route: "/admin/membersView" },
  { key: "employees", label: "Total Employees", icon: "badge", route: "/admin/employeesView" },
] as const;

type StatKey = (typeof STAT_ITEMS)[number]["key"];
type Stats = Record<StatKey, number>;

/* ---------------- MENU (same pages as the current dashboard) ---------------- */

type MenuItem = {
  title: string;
  subtitle?: string;
  icon: any;
  route: string;
  badge?: "vacancy" | "contact";
  section: string;
};

const MENU_ITEMS: MenuItem[] = [
  { title: "Chit Schemes", icon: "account-balance-wallet", route: "/admin/chitSchemes", section: "Chit Operations" },
  { title: "Groups", icon: "group-work", route: "/admin/groups", section: "Chit Operations" },
  {
    title: "Ledger",
    subtitle: "Collections, ranking & overdue (password)",
    icon: "menu-book",
    route: "/admin/ledger",
    section: "Chit Operations",
  },
  {
    title: "Waived Penalties",
    subtitle: "Penalty OFF list for audit",
    icon: "gavel",
    route: "/admin/penaltyWaivers",
    section: "Chit Operations",
  },
  { title: "Members", icon: "people", route: "/admin/membersView", section: "People" },
  { title: "Intrested Members", icon: "person-add", route: "/admin/interestedMembers", section: "People" },
  { title: "Member History", icon: "history", route: "/admin/memberHistory", section: "People" },
  { title: "Employees", icon: "badge", route: "/admin/employeesView", section: "People" },
  { title: "Employee Performance", icon: "trending-up", route: "/admin/employeeprogress", section: "People" },
  {
    title: "Daily Leads",
    subtitle: "Employee field-visit leads",
    icon: "whatshot",
    route: "/admin/dailyDatabaseEmployees",
    section: "People",
  },
  { title: "Vacancies", icon: "event-seat", route: "/admin/vacancies", badge: "vacancy", section: "Requests & Alerts" },
  {
    title: "Vacancy Notifications",
    icon: "notifications-active",
    route: "/admin/vacancyNotifications?from=index",
    badge: "vacancy",
    section: "Requests & Alerts",
  },
  { title: "Notifications", icon: "notifications", route: "/admin/notifications", section: "Requests & Alerts" },
  {
    title: "Contact Requests",
    subtitle: "Newly commenced Groups Requests",
    icon: "support-agent",
    route: "/admin/contactRequests",
    badge: "contact",
    section: "Requests & Alerts",
  },
  {
    title: "More",
    subtitle: "12 extra tools: reminders, cash, salary...",
    icon: "apps",
    route: "/admin/more",
    section: "More Tools",
  },
  { title: "Profile", icon: "person", route: "/admin/profile", section: "Account" },
];

const MENU_SECTIONS = (() => {
  const order: string[] = [];
  const by = new Map<string, { item: MenuItem; index: number }[]>();
  MENU_ITEMS.forEach((item, index) => {
    if (!by.has(item.section)) {
      by.set(item.section, []);
      order.push(item.section);
    }
    by.get(item.section)!.push({ item, index });
  });
  return order.map((section) => ({ section, items: by.get(section)! }));
})();

/* ---------------- SMALL ANIMATED PIECES ---------------- */

function CountUpText({
  value,
  formatter,
  style,
  numberOfLines,
}: {
  value: number;
  formatter: (n: number) => string;
  style?: any;
  numberOfLines?: number;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = Date.now();
    let raf = 0;
    const step = () => {
      const p = Math.min((Date.now() - start) / 650, 1);
      setDisplay(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
      else prev.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {formatter(display)}
    </Text>
  );
}

function Reveal({ anim, children }: { anim: Animated.Value; children: React.ReactNode }) {
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function LivePulseDot({ color = "#22c55e", size = 8 }: { color?: string; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

function SlideInCard({ anim, children, style }: { anim: Animated.Value; children: React.ReactNode; style?: any }) {
  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

function FloatBob({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob, delay]);
  return (
    <Animated.View style={{ transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>
      {children}
    </Animated.View>
  );
}

function PressScale({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </TouchableOpacity>
  );
}

/* ---------------- DONUT ---------------- */

function DonutArc({
  size,
  strokeWidth,
  startDeg,
  sweepDeg,
  color,
  animated,
}: {
  size: number;
  strokeWidth: number;
  startDeg: number;
  sweepDeg: number;
  color: string;
  animated: Animated.Value;
}) {
  const targetPct = Math.max(0, Math.min(100, (sweepDeg / 360) * 100));
  useEffect(() => {
    Animated.timing(animated, {
      toValue: targetPct,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetPct, animated]);

  const rightRotate = animated.interpolate({ inputRange: [0, 50, 100], outputRange: ["-135deg", "45deg", "45deg"] });
  const leftRotate = animated.interpolate({ inputRange: [0, 50, 100], outputRange: ["-135deg", "-135deg", "45deg"] });

  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, width: size, height: size, transform: [{ rotate: `${startDeg}deg` }] }}
    >
      <View style={{ position: "absolute", left: size / 2, top: 0, width: size / 2, height: size, overflow: "hidden" }}>
        <Animated.View
          style={{
            position: "absolute",
            left: -size / 2,
            top: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: "transparent",
            borderTopColor: color,
            borderRightColor: color,
            transform: [{ rotate: rightRotate }],
          }}
        />
      </View>
      <View style={{ position: "absolute", left: 0, top: 0, width: size / 2, height: size, overflow: "hidden" }}>
        <Animated.View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: "transparent",
            borderBottomColor: color,
            borderLeftColor: color,
            transform: [{ rotate: leftRotate }],
          }}
        />
      </View>
    </View>
  );
}

function OverviewDonut({
  size = 168,
  strokeWidth = 20,
  segments,
  total,
}: {
  size?: number;
  strokeWidth?: number;
  segments: { key: string; label: string; value: number; color: string }[];
  total: number;
}) {
  const animValues = useRef(segments.map(() => new Animated.Value(0))).current;
  const GAP_DEG = 5;
  const safeTotal = Math.max(1, total);

  let cursor = 0;
  const arcs = segments.map((seg, i) => {
    const ideal = (seg.value / safeTotal) * 360;
    const hitStart = cursor;
    cursor += ideal;
    return {
      ...seg,
      startDeg: hitStart + GAP_DEG / 2,
      sweepDeg: Math.max(0, ideal - GAP_DEG),
      hitStart,
      hitSweep: ideal,
      anim: animValues[i],
    };
  });

  const [active, setActive] = useState<{ key: string; label: string; value: number; color: string } | null>(null);
  const bubble = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;
    bubble.setValue(0);
    Animated.spring(bubble, { toValue: 1, useNativeDriver: true, friction: 7, tension: 90 }).start();
    const t = setTimeout(() => setActive(null), 2200);
    return () => clearTimeout(t);
  }, [active, bubble]);

  const onPress = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    const dx = locationX - size / 2;
    const dy = locationY - size / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < size / 2 - strokeWidth - 14 || dist > size / 2 + 10) {
      setActive(null);
      return;
    }
    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (angle < 0) angle += 360;
    const hit = arcs.find((a) => angle >= a.hitStart && angle < a.hitStart + a.hitSweep);
    if (!hit) return;
    setActive((prev) => (prev?.key === hit.key ? null : { key: hit.key, label: hit.label, value: hit.value, color: hit.color }));
  };

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {active && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -14,
            zIndex: 10,
            opacity: bubble,
            transform: [
              { scale: bubble.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
              { translateY: bubble.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
            ],
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#1c2b24",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 7,
              elevation: 4,
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: active.color, marginRight: 6 }} />
            <Text allowFontScaling={false} style={{ color: "#fff", fontSize: 11, fontWeight: "700", marginRight: 6 }}>
              {active.label}
            </Text>
            <Text allowFontScaling={false} style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>
              {active.value}
            </Text>
          </View>
        </Animated.View>
      )}

      <TouchableOpacity activeOpacity={1} onPress={onPress} style={{ width: size, height: size }}>
        <View
          style={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: "rgba(2,78,50,0.06)",
          }}
        />
        {arcs.map((arc) => (
          <DonutArc
            key={arc.key}
            size={size}
            strokeWidth={strokeWidth}
            startDeg={arc.startDeg}
            sweepDeg={arc.sweepDeg}
            color={arc.color}
            animated={arc.anim}
          />
        ))}
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#8a938d", fontSize: 12, fontWeight: "700", letterSpacing: 0.5 }}>TOTAL</Text>
          <CountUpText
            value={total}
            formatter={(n) => String(Math.round(n))}
            style={{ color: COLORS.primary, fontSize: 32, fontWeight: "800", marginTop: 2 }}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
}

/* ---------------- DATA (read only, existing routes) ---------------- */

const isAuctionLive = (a: any) => {
  if (!a || a.winnerName || !a.auctionEndDate || !a.auctionEndTime) return false;
  try {
    const [d, m, y] = String(a.auctionEndDate).split("-").map((n: string) => parseInt(n, 10));
    const [hh, mm] = String(a.auctionEndTime).split(":").map((n: string) => parseInt(n, 10));
    const t = new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
    return !isNaN(t) && t - Date.now() > 0;
  } catch {
    return false;
  }
};

const countOf = async (path: string) => {
  try {
    const res = await fetch(`${BACKEND_URL}${path}`);
    const data = res.ok ? await res.json() : [];
    return Array.isArray(data) ? data.length : 0;
  } catch {
    return 0;
  }
};

export function useAdminOverview(enabled: boolean) {
  const [stats, setStats] = useState<Stats>({ chits: 0, groups: 0, members: 0, employees: 0 });
  const [liveAuctions, setLiveAuctions] = useState<any[]>([]);
  const [closedAuctions, setClosedAuctions] = useState<any[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || busy.current) return;
    busy.current = true;
    try {
      const [chits, groups, members, employees] = await Promise.all([
        countOf("/chitscheme"),
        countOf("/groups/admin/all"),
        countOf("/members"),
        countOf("/employee"),
      ]);
      setStats({ chits, groups, members, employees });

      try {
        const res = await fetch(`${BACKEND_URL}/notifications`);
        const data = res.ok ? await res.json() : [];
        const all = Array.isArray(data) ? data : [];
        const live = all.filter(isAuctionLive);
        const closed = all
          .filter((a: any) => !!a.winnerName)
          .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 15);

        const withBids = await Promise.all(
          live.map(async (item: any) => {
            const gid = item.groupId?._id || "";
            let highestBid = 0;
            if (gid) {
              try {
                const bRes = await fetch(
                  `${BACKEND_URL}/bids/live?groupId=${encodeURIComponent(gid)}` +
                    `&auctionDate=${encodeURIComponent(item.auctionEndDate || "")}` +
                    `&auctionTime=${encodeURIComponent(item.auctionEndTime || "")}`
                );
                const bData = bRes.ok ? await bRes.json() : [];
                const bids = Array.isArray(bData) ? bData : Array.isArray(bData?.bids) ? bData.bids : [];
                highestBid = bids.reduce((best: number, b: any) => Math.max(best, Number(b.bidAmount || 0)), 0);
              } catch {}
            }
            return { ...item, highestBid };
          })
        );
        withBids.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setLiveAuctions(withBids);
        setClosedAuctions(closed);
      } catch (e) {
        console.log("Live bids load error:", e);
      }
    } finally {
      busy.current = false;
      setBidsLoading(false);
    }
  }, [enabled]);

  useFocusEffect(
    useCallback(() => {
      load();
      const t = setInterval(load, 60000);
      return () => clearInterval(t);
    }, [load])
  );

  return { stats, liveAuctions, closedAuctions, bidsLoading, reload: load };
}

/* ---------------- HEADER ---------------- */

export function AdminHeader({
  scrollY,
  onLogout,
  bellCount = 0,
  onBell,
}: {
  scrollY: Animated.Value;
  onLogout: () => void;
  bellCount?: number;
  onBell?: () => void;
}) {
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 550, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [headerAnim]);

  const clamp = (out: number[]) => scrollY.interpolate({ inputRange: [0, 70], outputRange: out, extrapolate: "clamp" });
  const subtitleOpacity = clamp([1, 0]);
  const titleShift = clamp([0, -11]);
  const iconScale = clamp([1, 0.82]);
  const circlesOpacity = clamp([1, 0.3]);

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        overflow: "hidden",
        backgroundColor: COLORS.primary,
        paddingTop: 56,
        paddingBottom: 22,
        paddingHorizontal: 20,
        opacity: headerAnim,
        transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: "rgba(255,255,255,0.08)",
          top: -70,
          right: -50,
          opacity: circlesOpacity,
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          width: 130,
          height: 130,
          borderRadius: 65,
          backgroundColor: "rgba(255,255,255,0.05)",
          bottom: -60,
          left: -30,
          opacity: circlesOpacity,
        }}
      />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Animated.View
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
              backgroundColor: "rgba(255,255,255,0.15)",
              transform: [{ scale: iconScale }],
            }}
          >
            <MaterialIcons name="business-center" size={22} color="#fff" />
          </Animated.View>

          <Animated.View style={{ transform: [{ translateY: titleShift }] }}>
            <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.5 }}>MANIKYA CHITS</Text>
            <Animated.Text
              style={{
                color: "rgba(255,255,255,0.65)",
                fontSize: 10,
                fontWeight: "600",
                letterSpacing: 2,
                opacity: subtitleOpacity,
              }}
            >
              ADMIN CONTROL PANEL
            </Animated.Text>
          </Animated.View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {onBell && (
            <TouchableOpacity
              onPress={onBell}
              activeOpacity={0.7}
              style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.15)",
                marginRight: 10,
              }}
            >
              <MaterialIcons name="notifications" size={22} color="white" />
              {bellCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    minWidth: 20,
                    height: 20,
                    paddingHorizontal: 4,
                    borderRadius: 10,
                    backgroundColor: "#ef4444",
                    borderWidth: 1.5,
                    borderColor: "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                    {bellCount > 9 ? "9+" : bellCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={onLogout}
            activeOpacity={0.7}
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.15)",
            }}
          >
            <MaterialIcons name="logout" size={21} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

/* ---------------- BELL SHEET (interested / vacancy / contact) ---------------- */

const timeAgo = (iso?: string | null) => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!t) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

export function AdminAlertsSheet({
  visible,
  onClose,
  interestedCount,
  vacancyCount,
  contactCount,
  onClear,
  times,
}: {
  visible: boolean;
  onClose: () => void;
  interestedCount: number;
  vacancyCount: number;
  contactCount: number;
  onClear?: () => void;
  /** when the newest waiting item of each kind came in (ISO text) */
  times?: { interested?: string | null; vacancy?: string | null; contact?: string | null };
}) {
  const router = useRouter();
  // re-draw every 30 s so "2 min ago" keeps moving while the sheet is open
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, [visible]);
  const rows = [
    {
      key: "interested",
      title: "Interested Members",
      sub: "New members waiting to be contacted",
      icon: "person-add",
      color: "#1d6fd0",
      soft: "#e8f1fb",
      count: interestedCount,
      route: "/admin/interestedMembers",
    },
    {
      key: "vacancy",
      title: "Vacancy Notifications",
      sub: "New vacancy requests",
      icon: "notifications-active",
      color: "#b57e10",
      soft: "#fdf4e3",
      count: vacancyCount,
      route: "/admin/vacancyNotifications?from=index",
    },
    {
      key: "contact",
      title: "Contact Requests",
      sub: "Newly commenced groups requests",
      icon: "support-agent",
      color: "#c0392b",
      soft: "#fdeaea",
      count: contactCount,
      route: "/admin/contactRequests",
    },
  ];
  const total = interestedCount + vacancyCount + contactCount;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.primary }}>Notifications</Text>
              <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                {total > 0 ? `${total} waiting for you` : "You are all caught up"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.8}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}
            >
              <MaterialIcons name="close" size={18} color="#374151" />
            </TouchableOpacity>
          </View>

          <View style={{ padding: 16 }}>
            {rows.map((r) => (
              <TouchableOpacity
                key={r.key}
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  router.push(r.route as any);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: r.count > 0 ? r.soft : COLORS.border,
                  backgroundColor: r.count > 0 ? "#fff" : "#fafdfb",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    backgroundColor: r.soft,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <MaterialIcons name={r.icon as any} size={22} color={r.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: "700", fontSize: 14 }}>{r.title}</Text>
                  <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>{r.sub}</Text>
                  {r.count > 0 && !!timeAgo((times as any)?.[r.key]) && (
                    <Text style={{ color: r.color, fontSize: 11, fontWeight: "600", marginTop: 3 }}>
                      {timeAgo((times as any)?.[r.key])}
                    </Text>
                  )}
                </View>
                {r.count > 0 ? (
                  <View
                    style={{
                      minWidth: 26,
                      height: 26,
                      paddingHorizontal: 7,
                      borderRadius: 13,
                      backgroundColor: "#ef4444",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{r.count > 99 ? "99+" : r.count}</Text>
                  </View>
                ) : (
                  <MaterialIcons name="chevron-right" size={22} color="#cbd5d0" />
                )}
              </TouchableOpacity>
            ))}

            {onClear && total > 0 && (
              <TouchableOpacity
                onPress={onClear}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#DC2626",
                  borderRadius: 16,
                  paddingVertical: 13,
                  marginTop: 4,
                }}
              >
                <MaterialIcons name="delete-sweep" size={18} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14, marginLeft: 6 }}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

/* ---------------- LOGOUT MODAL (new look, same actions) ---------------- */

export function AdminLogoutModal({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }}>
        <View style={{ backgroundColor: "#fff", width: "100%", maxWidth: 384, borderRadius: 24, padding: 24, alignItems: "center" }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fef2f2", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <MaterialIcons name="logout" size={30} color="#dc2626" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "700", color: "#1f2937", textAlign: "center" }}>Logout Confirmation</Text>
          <Text style={{ color: "#6b7280", textAlign: "center", marginTop: 8, lineHeight: 20 }}>
            Are you sure you want to logout as Admin?
          </Text>
          <View style={{ flexDirection: "row", marginTop: 24, width: "100%" }}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              style={{ flex: 1, backgroundColor: "#f3f4f6", paddingVertical: 12, borderRadius: 16, marginRight: 8 }}
            >
              <Text style={{ textAlign: "center", fontWeight: "600", color: "#374151" }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.8}
              style={{ flex: 1, backgroundColor: "#dc2626", paddingVertical: 12, borderRadius: 16, marginLeft: 8 }}
            >
              <Text style={{ textAlign: "center", fontWeight: "600", color: "#fff" }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------------- HERO + OVERVIEW ---------------- */

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};

export function AdminHeroAndOverview({
  stats,
  refreshing,
  onRefresh,
}: {
  stats: Stats;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const router = useRouter();
  const heroAnim = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const refreshSpin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(120),
      Animated.spring(heroAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 6 }),
    ]).start();
  }, [heroAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(sheen, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [sheen]);

  useEffect(() => {
    if (!refreshing) {
      refreshSpin.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(refreshSpin, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [refreshing, refreshSpin]);

  const total = STAT_ITEMS.reduce((sum, it) => sum + stats[it.key], 0);

  return (
    <View>
      {/* HERO */}
      <View style={{ paddingHorizontal: 20 }}>
        <Reveal anim={heroAnim}>
          <View style={{ backgroundColor: COLORS.primary, borderRadius: 28, overflow: "hidden", padding: 18 }}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -40,
                bottom: -40,
                width: 90,
                backgroundColor: "rgba(255,255,255,0.08)",
                transform: [
                  { translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-260, 420] }) },
                  { rotate: "18deg" },
                ],
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <View>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" }}>{greeting()},</Text>
                <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 1 }}>Admin</Text>
              </View>
              <PressScale
                onPress={onRefresh}
                style={{
                  backgroundColor: "rgba(255,255,255,0.14)",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Animated.View
                  style={{ transform: [{ rotate: refreshSpin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}
                >
                  <MaterialIcons name="refresh" size={14} color="#fff" />
                </Animated.View>
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", marginLeft: 5 }}>Refresh</Text>
              </PressScale>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <LivePulseDot color="#4ade80" size={8} />
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "500", marginLeft: 8 }}>
                System is live & synced
              </Text>
            </View>
          </View>
        </Reveal>
      </View>

      {/* OVERVIEW */}
      <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
        <Reveal anim={heroAnim}>
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 28,
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.05,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.primary, marginBottom: 16 }}>Overview</Text>
            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <OverviewDonut
                size={168}
                strokeWidth={20}
                total={total}
                segments={STAT_ITEMS.map((it, idx) => ({
                  key: it.key,
                  label: it.label,
                  value: stats[it.key],
                  color: KPI_RING_COLORS[idx % KPI_RING_COLORS.length],
                }))}
              />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 }}>
              {STAT_ITEMS.map((item, idx) => (
                <View key={item.key} style={{ width: "50%", paddingHorizontal: 4, marginBottom: 8 }}>
                  <PressScale onPress={() => router.push(item.route as any)} style={{ width: "100%" }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#fafdfb",
                        borderRadius: 16,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                      }}
                    >
                      <View
                        style={{
                          width: 4,
                          height: 30,
                          borderRadius: 2,
                          backgroundColor: KPI_RING_COLORS[idx % KPI_RING_COLORS.length],
                          marginRight: 9,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text allowFontScaling={false} numberOfLines={1} style={{ color: "#6b7a73", fontSize: 10.5, fontWeight: "600" }}>
                          {item.label}
                        </Text>
                        <CountUpText
                          value={stats[item.key]}
                          formatter={(n) => String(Math.round(n))}
                          style={{ color: COLORS.primary, fontSize: 17, fontWeight: "800", marginTop: 1 }}
                        />
                      </View>
                      <MaterialIcons name={item.icon} size={15} color={KPI_RING_COLORS[idx % KPI_RING_COLORS.length]} />
                    </View>
                  </PressScale>
                </View>
              ))}
            </View>
          </View>
        </Reveal>
      </View>
    </View>
  );
}

/* ---------------- LIVE BIDS ---------------- */

const formatAmount = (n: number) => (n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "No bids");

export function LiveBidsSection({
  liveAuctions,
  closedAuctions,
  loading,
}: {
  liveAuctions: any[];
  closedAuctions: any[];
  loading: boolean;
}) {
  const router = useRouter();
  const [historyVisible, setHistoryVisible] = useState(false);
  const [bidListVisible, setBidListVisible] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [bidList, setBidList] = useState<any[]>([]);
  const [bidListLoading, setBidListLoading] = useState(false);

  const animsRef = useRef<Map<string, Animated.Value>>(new Map());
  const getAnim = (id: string) => {
    let v = animsRef.current.get(id);
    if (!v) {
      v = new Animated.Value(0);
      animsRef.current.set(id, v);
    }
    return v;
  };

  useEffect(() => {
    if (liveAuctions.length === 0) return;
    const anims = liveAuctions.map((i) => getAnim(String(i._id)));
    anims.forEach((a) => a.setValue(0));
    Animated.stagger(
      90,
      anims.map((a) => Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }))
    ).start();
  }, [liveAuctions.length]);

  const goToBidRoom = (item: any) => {
    router.push({
      pathname: "/admin/bidroom",
      params: {
        notificationId: item._id,
        groupId: item.groupId?._id || "",
        groupCode: item.groupId?.groupId || "",
        auctionEndDate: item.auctionEndDate || "",
        auctionEndTime: item.auctionEndTime || "",
        minBidAmount: String(item.minBidAmount ?? ""),
        maxBidAmount: String(item.maxBidAmount ?? ""),
        winnerName: item.winnerName || "",
        winnerId: item.winnerId || "",
        winnerGroupId: item.winnerGroupId || "",
        winnerBidAmount: String(item.winnerBidAmount ?? ""),
      },
    } as any);
  };

  const openBidList = async (item: any) => {
    setSelected(item);
    setBidListVisible(true);
    setBidListLoading(true);
    try {
      const gid = item.groupId?._id || "";
      const res = await fetch(
        `${BACKEND_URL}/bids/live?groupId=${encodeURIComponent(gid)}` +
          `&auctionDate=${encodeURIComponent(item.auctionEndDate || "")}` +
          `&auctionTime=${encodeURIComponent(item.auctionEndTime || "")}`
      );
      const data = res.ok ? await res.json() : [];
      const list = Array.isArray(data) ? data : Array.isArray(data?.bids) ? data.bids : [];
      list.sort((a: any, b: any) => Number(b.bidAmount || 0) - Number(a.bidAmount || 0));
      setBidList(list);
    } catch {
      setBidList([]);
    } finally {
      setBidListLoading(false);
    }
  };

  // nothing live right now (or still loading) -> the whole Live Bids section is not shown
  if (liveAuctions.length === 0) return null;

  const box = { marginHorizontal: 20, backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center" as const, borderWidth: 1, borderColor: COLORS.border };

  return (
    <View style={{ marginTop: 28, marginBottom: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="confirmation-number" size={18} color={COLORS.primary} />
          <Text style={{ fontSize: 14, fontWeight: "700", marginLeft: 6, color: COLORS.primary }}>Live Bids</Text>
          {liveAuctions.length > 0 && (
            <View style={{ marginLeft: 8, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: "#fee2e2" }}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#dc2626" }}>{liveAuctions.length} live</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setHistoryVisible(true)} activeOpacity={0.7} style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="history" size={16} color={COLORS.primary} />
          <Text style={{ fontSize: 12, fontWeight: "600", marginLeft: 4, color: COLORS.primary }}>History</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={box}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : liveAuctions.length === 0 ? (
        <View style={box}>
          <MaterialIcons name="gavel" size={26} color="#9ca3af" />
          <Text style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>No live bids right now</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 8 }}>
          {liveAuctions.map((item, idx) => {
            const accent = TICKET_ACCENTS[idx % TICKET_ACCENTS.length];
            const code = String(item.groupId?.groupId || "--").slice(0, 2).toUpperCase();
            return (
              <SlideInCard key={item._id} anim={getAnim(String(item._id))} style={{ marginRight: 12 }}>
                <FloatBob delay={idx * 160}>
                  <View
                    style={{
                      width: 190,
                      backgroundColor: "#fff",
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      overflow: "hidden",
                      shadowColor: COLORS.primary,
                      shadowOpacity: 0.07,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 2,
                    }}
                  >
                    <View style={{ height: 6, backgroundColor: accent }} />
                    <View style={{ padding: 14 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                        <View>
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              backgroundColor: `${accent}1f`,
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Text style={{ color: accent, fontWeight: "800", fontSize: 13 }}>{code}</Text>
                          </View>
                          <View style={{ position: "absolute", top: -1, right: -1 }}>
                            <LivePulseDot size={8} />
                          </View>
                        </View>
                        <Text style={{ color: "#9ca3af", fontSize: 9 }} numberOfLines={1}>
                          ends {item.auctionEndTime || "-"}
                        </Text>
                      </View>
                      <Text style={{ color: "#1f2937", fontWeight: "700", fontSize: 12, marginBottom: 10 }} numberOfLines={1}>
                        Group {item.groupId?.groupId || "-"}
                      </Text>
                      <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8, marginBottom: 10 }}>
                        <Text style={{ color: "#9ca3af", fontSize: 9, letterSpacing: 1 }}>HIGHEST BID</Text>
                        <CountUpText
                          value={item.highestBid || 0}
                          formatter={formatAmount}
                          style={{ color: accent, fontWeight: "800", fontSize: 16, marginTop: 2 }}
                          numberOfLines={1}
                        />
                      </View>
                      <PressScale
                        onPress={() => openBidList(item)}
                        style={{ backgroundColor: COLORS.primary, borderRadius: 999, paddingVertical: 7, alignItems: "center" }}
                      >
                        <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>View Bids</Text>
                      </PressScale>
                    </View>
                  </View>
                </FloatBob>
              </SlideInCard>
            );
          })}
        </ScrollView>
      )}

      {/* HISTORY POPUP */}
      <Modal visible={historyVisible} transparent animationType="fade" onRequestClose={() => setHistoryVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", maxHeight: "75%" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.primary }}>Auction History</Text>
              <TouchableOpacity
                onPress={() => setHistoryVisible(false)}
                activeOpacity={0.8}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}
              >
                <MaterialIcons name="close" size={18} color="#374151" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {closedAuctions.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <MaterialIcons name="history" size={30} color="#9ca3af" />
                  <Text style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>No closed auctions yet</Text>
                </View>
              ) : (
                closedAuctions.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    onPress={() => {
                      setHistoryVisible(false);
                      goToBidRoom(item);
                    }}
                    activeOpacity={0.8}
                    style={{ borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#fafdfb" }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ color: "#1f2937", fontWeight: "600", fontSize: 14 }}>Group {item.groupId?.groupId || "-"}</Text>
                      <Text style={{ color: "#9ca3af", fontSize: 10 }}>{item.auctionEndDate || "-"}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                      <MaterialIcons name="emoji-events" size={14} color="#d97706" />
                      <Text style={{ color: "#b45309", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>{item.winnerName}</Text>
                      {item.winnerBidAmount > 0 && (
                        <Text style={{ color: "#6b7280", fontSize: 12, marginLeft: 8 }}>
                          ₹{Number(item.winnerBidAmount).toLocaleString("en-IN")}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* BID LIST POPUP */}
      <Modal visible={bidListVisible} transparent animationType="fade" onRequestClose={() => setBidListVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden", maxHeight: "80%" }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10, backgroundColor: "#eaf9f0" }}>
                    <MaterialIcons name="gavel" size={18} color="#16a34a" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: "#111827", fontSize: 16, fontWeight: "700" }} numberOfLines={1}>
                      Group {selected?.groupId?.groupId || "-"}
                    </Text>
                    <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 2 }}>
                      {selected?.auctionEndDate || "-"} • {selected?.auctionEndTime || "-"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setBidListVisible(false)}
                  activeOpacity={0.8}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}
                >
                  <MaterialIcons name="close" size={18} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {bidListLoading ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>Loading bids...</Text>
                </View>
              ) : bidList.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <MaterialIcons name="gavel" size={28} color="#9ca3af" />
                  <Text style={{ color: "#6b7280", fontSize: 14, marginTop: 8 }}>No bids yet</Text>
                </View>
              ) : (
                bidList.map((bid, index) => {
                  const top = index === 0;
                  return (
                    <View
                      key={bid._id || index}
                      style={{
                        borderRadius: 16,
                        padding: 14,
                        marginBottom: 10,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        borderWidth: 1,
                        borderColor: top ? "#fde68a" : COLORS.border,
                        backgroundColor: top ? "#fffbeb" : "#fafdfb",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#1f2937", fontWeight: "600", fontSize: 14 }} numberOfLines={1}>
                          {bid.customerName || bid.groupMemberId || "Member"}
                        </Text>
                        <Text style={{ color: "#9ca3af", fontSize: 10, marginTop: 2 }}>{bid.groupMemberId || "-"}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        {top && (
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
                            <MaterialIcons name="emoji-events" size={12} color="#d97706" />
                            <Text style={{ color: "#b45309", fontSize: 9, fontWeight: "700", marginLeft: 4 }}>HIGHEST</Text>
                          </View>
                        )}
                        <Text style={{ fontWeight: "800", fontSize: 14, color: top ? "#b45309" : COLORS.primary }}>
                          ₹{Number(bid.bidAmount || 0).toLocaleString("en-IN")}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
              {selected && (
                <TouchableOpacity
                  onPress={() => {
                    setBidListVisible(false);
                    goToBidRoom(selected);
                  }}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 12,
                    borderRadius: 16,
                    marginTop: 4,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <MaterialIcons name="open-in-new" size={15} color={COLORS.primary} />
                  <Text style={{ fontSize: 12, fontWeight: "600", marginLeft: 6, color: COLORS.primary }}>Open Full Bid Room</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ---------------- GROUPED MENU ---------------- */

function MenuCardNew({
  item,
  index,
  anim,
  badgeCount,
}: {
  item: MenuItem;
  index: number;
  anim: Animated.Value;
  badgeCount: number;
}) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;
  const tint = TINTS[index % TINTS.length];

  return (
    <Animated.View
      style={{
        width: "48%",
        marginBottom: 16,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }, { scale }],
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={() => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 0 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start()}
        onPress={() => router.push(item.route as any)}
        style={{
          backgroundColor: "#fff",
          borderRadius: 24,
          alignItems: "center",
          paddingTop: 24,
          paddingBottom: 20,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          shadowColor: COLORS.primary,
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
            backgroundColor: tint.bg,
          }}
        >
          <MaterialIcons name={item.icon} size={28} color={tint.fg} />
          {badgeCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                minWidth: 20,
                height: 20,
                paddingHorizontal: 4,
                borderRadius: 10,
                backgroundColor: "#ef4444",
                borderWidth: 1,
                borderColor: "#fff",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13.5, fontWeight: "600", textAlign: "center", color: COLORS.primary }} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={{ color: "#9ca3af", fontSize: 10, textAlign: "center", marginTop: 4, lineHeight: 16 }}>{item.subtitle}</Text>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function AdminMenuSections({
  vacancyCount,
  contactCount,
}: {
  vacancyCount: number;
  contactCount: number;
}) {
  const anims = useRef(MENU_ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(520),
      Animated.stagger(
        60,
        anims.map((a) => Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 7 }))
      ),
    ]).start();
  }, [anims]);

  return (
    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
      {MENU_SECTIONS.map((group) => (
        <View key={group.section} style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: COLORS.primary, marginRight: 8 }} />
            <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.primary }}>{group.section}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            {group.items.map(({ item, index }) => (
              <MenuCardNew
                key={item.route}
                item={item}
                index={index}
                anim={anims[index]}
                badgeCount={item.badge === "vacancy" ? vacancyCount : item.badge === "contact" ? contactCount : 0}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
