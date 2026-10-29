import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config";

// =========================================================
// NEW MENU-PAGE PARTS (hero, stat cards, live auctions).
// Used only by app/menu.tsx when USE_NEW_MEMBER_DESIGN is true.
// It only READS data from existing backend routes. Nothing is changed.
// =========================================================

export const PALETTE = {
  brand: "#024e32",
  brandSoft: "#eef5f1",
  indigo: "#4f46e5",
  indigoSoft: "#eef2ff",
  emerald: "#059669",
  emeraldSoft: "#ecfdf5",
  amber: "#b45309",
  amberSoft: "#fffbeb",
  violet: "#7c3aed",
  sky: "#0284c7",
  rose: "#e11d48",
};

const TICKET_ACCENTS = [PALETTE.sky, PALETTE.violet, PALETTE.amber, PALETTE.rose];
const TICKET_GRADIENTS: [string, string][] = [
  ["#0ea5e9", "#0369a1"],
  ["#8b5cf6", "#6d28d9"],
  ["#f59e0b", "#b45309"],
  ["#f43f5e", "#be123c"],
];

type Summary = { numberOfChits: number; totalSavings: number; totalInvested: number; dividendEarned: number };
const EMPTY: Summary = { numberOfChits: 0, totalSavings: 0, totalInvested: 0, dividendEarned: 0 };

const cache: { userid: string | null; summary: Summary | null; auctions: any[] } = {
  userid: null,
  summary: null,
  auctions: [],
};
const CACHE_KEY = "homeDataCache_v1";

export const formatINR = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

const paidAmount = (payments: any[]) =>
  !Array.isArray(payments)
    ? 0
    : payments.filter((p: any) => p.paymentType !== "DIVIDEND").reduce((s, p) => s + (p.amount || 0), 0);

const auctionsForGroup = (all: any[], groupId: string) =>
  all
    .filter((n: any) => String(n.groupId?.groupId || n.groupId) === String(groupId))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const isLive = (a: any) => {
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

// ---------------------------------------------------------
// DATA HOOK
// ---------------------------------------------------------
export function useHomeChitsData(userid: string | null, enabled: boolean) {
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [auctions, setAuctions] = useState<any[]>([]);
  const busy = useRef(false);
  const lastLoadAt = useRef(0);

  const load = useCallback(
    async (force: boolean = false) => {
      if (!enabled || !userid || busy.current) return;
      // coming back to the menu again and again must not re-download everything
      // each time (this kept the phone busy and made taps feel stuck)
      if (!force && Date.now() - lastLoadAt.current < 60000 && cache.userid === userid && cache.summary) {
        setSummary(cache.summary);
        setAuctions(cache.auctions);
        setLoading(false);
        return;
      }
      busy.current = true;
      try {
        let have = false;
        if (!force && cache.userid === userid && cache.summary) {
          setSummary(cache.summary);
          setAuctions(cache.auctions);
          setLoading(false);
          have = true;
        } else if (!force) {
          try {
            const raw = await AsyncStorage.getItem(CACHE_KEY);
            const p = raw ? JSON.parse(raw) : null;
            if (p?.userid === userid && p?.savingsSummary) {
              setSummary(p.savingsSummary);
              setAuctions(Array.isArray(p.liveAuctions) ? p.liveAuctions : []);
              setLoading(false);
              have = true;
            }
          } catch {}
        }
        if (!have) setLoading(true);

        const res = await fetch(`${BACKEND_URL}/groups/my-chits/${userid}`);
        if (!res.ok) return;
        const data = await res.json();
        const chits: any[] = Array.isArray(data) ? data : Array.isArray(data?.chits) ? data.chits : [];

        const save = (s: Summary, a: any[]) => {
          setSummary(s);
          setAuctions(a);
          cache.userid = userid;
          cache.summary = s;
          cache.auctions = a;
          AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ userid, savingsSummary: s, liveAuctions: a })).catch(() => {});
        };

        if (chits.length === 0) {
          save(EMPTY, []);
          return;
        }

        let notifications: any[] = [];
        try {
          const nRes = await fetch(`${BACKEND_URL}/notifications`);
          const nData = await nRes.json();
          notifications = Array.isArray(nData) ? nData : [];
        } catch {}

        let totalInvested = 0;
        let dividendEarned = 0;
        const found: any[] = [];

        await Promise.all(
          chits.map(async (chit: any) => {
            const groupId = chit.groupId;
            const groupMemberId = chit.groupMemberId || "";
            try {
              const lRes = await fetch(
                `${BACKEND_URL}/groups/account-copy/${userid}/${groupId}?groupMemberId=${groupMemberId}`
              );
              const lData = lRes.ok ? await lRes.json() : { ledger: [] };
              const ledger = Array.isArray(lData.ledger) ? lData.ledger : [];
              totalInvested += ledger.reduce((s: number, r: any) => s + paidAmount(r.payments || []), 0);

              const divs = await Promise.all(
                ledger.map(async (r: any) => {
                  try {
                    const pRes = await fetch(`${BACKEND_URL}/groups/${groupId}/collection-plan/${r.monthIndex}`);
                    if (!pRes.ok) return 0;
                    const plan = await pRes.json();
                    return Number(plan?.dividend || 0);
                  } catch {
                    return 0;
                  }
                })
              );
              dividendEarned += divs.reduce((s, d) => s + d, 0);

              const latest = auctionsForGroup(notifications, groupId)[0] || null;
              if (latest && isLive(latest)) {
                const groupMongoId = latest.groupId?._id || chit.groupMongoId || "";
                let currentBid = 0;
                try {
                  const bRes = await fetch(
                    `${BACKEND_URL}/bids/live?groupId=${encodeURIComponent(groupMongoId)}` +
                      `&auctionDate=${encodeURIComponent(latest.auctionEndDate || "")}` +
                      `&auctionTime=${encodeURIComponent(latest.auctionEndTime || "")}`
                  );
                  const bData = await bRes.json();
                  const bids = Array.isArray(bData) ? bData : Array.isArray(bData?.bids) ? bData.bids : [];
                  currentBid = bids.reduce((best: number, b: any) => Math.max(best, Number(b.bidAmount || 0)), 0);
                } catch {}
                found.push({
                  key: `${groupId}-${groupMemberId}`,
                  groupId,
                  groupMemberId,
                  groupMongoId,
                  currentBid,
                  minBidAmount: Number(latest.minBidAmount || 0),
                  auctionEndDate: latest.auctionEndDate || "",
                  auctionEndTime: latest.auctionEndTime || "",
                });
              }
            } catch (e) {
              console.log("Home chits aggregate error:", e);
            }
          })
        );

        save(
          {
            numberOfChits: chits.length,
            totalInvested,
            dividendEarned,
            totalSavings: totalInvested + dividendEarned,
          },
          found
        );
      } catch (e) {
        console.log("Home chits data load error:", e);
      } finally {
        busy.current = false;
        lastLoadAt.current = Date.now();
        setLoading(false);
      }
    },
    [userid, enabled]
  );

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return { summary, loading, auctions, reload: () => load(true) };
}

// ---------------------------------------------------------
// SMALL PIECES
// ---------------------------------------------------------
function CountUpText({
  value,
  formatter,
  style,
}: {
  value: number;
  formatter: (n: number) => string;
  style?: any;
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
    <Text style={style} numberOfLines={1}>
      {formatter(display)}
    </Text>
  );
}

function StatCard({
  label,
  value,
  iconName,
  accent,
  accentSoft,
  formatter,
  loading,
  onPress,
}: {
  label: string;
  value: number;
  iconName: any;
  accent: string;
  accentSoft: string;
  formatter: (n: number) => string;
  loading: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: "#e8f0eb",
        shadowColor: "#0b3324",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
        minHeight: 96,
        justifyContent: "space-between",
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 11,
          backgroundColor: accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name={iconName} size={19} color={accent} />
      </View>
      <View>
        <Text style={{ color: "#94a3b8", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Text>
        {loading ? (
          <Text style={{ color: "#1f2d28", fontSize: 17, fontWeight: "800", marginTop: 3 }}>…</Text>
        ) : (
          <CountUpText
            value={value}
            formatter={formatter}
            style={{ color: "#1f2d28", fontSize: 17, fontWeight: "800", marginTop: 3, letterSpacing: -0.4 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

function LiveDot() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#16a34a", opacity, marginRight: 4 }}
    />
  );
}

function AuctionCountdown({ endDate, endTime }: { endDate: string; endTime: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    const tick = () => {
      try {
        const [d, m, y] = String(endDate).split("-").map((n) => parseInt(n, 10));
        const [hh, mm] = String(endTime).split(":").map((n) => parseInt(n, 10));
        const diff = new Date(y, m - 1, d, hh, mm, 0, 0).getTime() - Date.now();
        if (diff <= 0) return setRemaining("Ended");
        setRemaining(
          `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m ${Math.floor((diff % 60000) / 1000)}s`
        );
      } catch {
        setRemaining("");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate, endTime]);
  if (!remaining) return null;
  const ended = remaining === "Ended";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: ended ? "#fef2f2" : "#fff7ed",
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: ended ? "#fecaca" : "#fed7aa",
      }}
    >
      <MaterialIcons name="timer" size={10} color={ended ? "#dc2626" : "#ea580c"} />
      <Text style={{ fontSize: 10, fontWeight: "800", marginLeft: 3, color: ended ? "#dc2626" : "#ea580c" }}>
        {remaining}
      </Text>
    </View>
  );
}

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
};

// ---------------------------------------------------------
// HERO + THREE STAT CARDS
// ---------------------------------------------------------
export function HomeHero({
  username,
  summary,
  loading,
  wide,
}: {
  username: string;
  summary: Summary;
  loading: boolean;
  wide: string; // width class from the menu page
}) {
  const router = useRouter();
  const appear = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 520, useNativeDriver: true }).start();
  }, [appear]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [ring]);

  const spin = ring.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View>
      <View className={`self-center mt-5 ${wide}`}>
      <Animated.View
        style={{
          opacity: appear,
          transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }],
        }}
      >
        <View style={{ backgroundColor: PALETTE.brand, borderRadius: 28, overflow: "hidden", padding: 22 }}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -50,
              right: -40,
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: "rgba(255,255,255,0.07)",
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: -60,
              left: -30,
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -46,
              right: -46,
              width: 190,
              height: 190,
              borderRadius: 95,
              borderWidth: 2,
              borderStyle: "dashed",
              borderColor: "rgba(255,255,255,0.28)",
              transform: [{ rotate: spin }],
            }}
          />

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" }}>{greeting()},</Text>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 1 }} numberOfLines={1}>
                {username}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.14)",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <MaterialIcons name="verified" size={13} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", marginLeft: 4 }}>Member</Text>
            </View>
          </View>

          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600", marginBottom: 2 }}>
            Total Savings
          </Text>
          {loading ? (
            <Text style={{ color: "#fff", fontSize: 38, fontWeight: "800" }}>…</Text>
          ) : (
            <CountUpText
              value={summary.totalSavings}
              formatter={formatINR}
              style={{ color: "#fff", fontSize: 38, fontWeight: "800", letterSpacing: -0.6 }}
            />
          )}
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="savings" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600", marginLeft: 6 }}>
              Invested + dividend earned
            </Text>
          </View>
        </View>
      </Animated.View>
      </View>

      <View className={`self-center mt-4 ${wide}`}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard
            onPress={() => router.push("/mychits")}
            label="Chits"
            value={summary.numberOfChits}
            iconName="folder"
            accent={PALETTE.indigo}
            accentSoft={PALETTE.indigoSoft}
            formatter={(n) => String(Math.round(n))}
            loading={loading}
          />
          <StatCard
            onPress={() => router.push("/myaccountcopy")}
            label="Invested"
            value={summary.totalInvested}
            iconName="trending-up"
            accent={PALETTE.emerald}
            accentSoft={PALETTE.emeraldSoft}
            formatter={formatINR}
            loading={loading}
          />
          <StatCard
            onPress={() => router.push("/myaccountcopy")}
            label="Dividend"
            value={summary.dividendEarned}
            iconName="military-tech"
            accent={PALETTE.amber}
            accentSoft={PALETTE.amberSoft}
            formatter={formatINR}
            loading={loading}
          />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------
// LIVE AUCTIONS (small ticket cards)
// ---------------------------------------------------------
export function LiveAuctionsSection({
  auctions,
  loading,
  userid,
  wide,
  desktop,
}: {
  auctions: any[];
  loading: boolean;
  userid: string | null;
  wide: string;
  desktop: boolean;
}) {
  const router = useRouter();

  const openBidNow = (a: any) =>
    router.push({
      pathname: "/bidnow",
      params: {
        groupId: a.groupMongoId || "",
        groupCode: a.groupId || "",
        auctionEndDate: a.auctionEndDate || "",
        auctionEndTime: a.auctionEndTime || "",
        userid: userid || "",
      },
    } as any);

  return (
    <View className={`self-center mt-7 ${wide}`}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialIcons name="confirmation-number" size={18} color={PALETTE.brand} />
          <Text style={{ color: PALETTE.brand, fontWeight: "700", fontSize: 16, marginLeft: 6 }}>Live Auctions</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/auctionroom")} activeOpacity={0.7}>
          <Text style={{ color: PALETTE.brand, fontSize: 12, fontWeight: "600" }}>See all →</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e8f0eb", padding: 20, flexDirection: "row", alignItems: "center" }}>
          <ActivityIndicator size="small" color={PALETTE.brand} />
          <Text style={{ color: "#6b7280", fontSize: 14, marginLeft: 12 }}>Checking for live auctions…</Text>
        </View>
      ) : auctions.length === 0 ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#e8f0eb", padding: 24, alignItems: "center" }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: PALETTE.brandSoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <MaterialIcons name="event-busy" size={22} color={PALETTE.brand} />
          </View>
          <Text style={{ color: "#4b5563", fontSize: 14, fontWeight: "500" }}>No live auctions right now</Text>
          <Text style={{ color: "#9ca3af", fontSize: 12, marginTop: 4, textAlign: "center" }}>
            Check back soon — bids you can join will show up here
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
          {auctions.map((a, idx) => {
            const accent = TICKET_ACCENTS[idx % TICKET_ACCENTS.length];
            const grad = TICKET_GRADIENTS[idx % TICKET_GRADIENTS.length];
            return (
              <View
                key={a.key}
                style={{
                  flexDirection: "row",
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#e8f0eb",
                  overflow: "hidden",
                  marginRight: 12,
                  width: desktop ? 220 : 196,
                  shadowColor: "#0b3324",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.1,
                  shadowRadius: 14,
                  elevation: 5,
                }}
              >
                <View style={{ width: 46, backgroundColor: grad[1], alignItems: "center", justifyContent: "center", paddingVertical: 12 }}>
                  <MaterialIcons name="confirmation-number" size={15} color="#fff" />
                  <Text
                    numberOfLines={1}
                    style={{
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: "800",
                      marginTop: 10,
                      transform: [{ rotate: "-90deg" }],
                      width: 68,
                      textAlign: "center",
                      letterSpacing: 1,
                    }}
                  >
                    {a.groupId}
                  </Text>
                </View>
                <View style={{ width: 1 }}>
                  <View style={{ flex: 1, borderLeftWidth: 1, borderStyle: "dashed", borderColor: "#dbe5df" }} />
                </View>
                <View style={{ flex: 1, padding: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ color: PALETTE.brand, fontWeight: "800", fontSize: 11, flex: 1, marginRight: 4 }} numberOfLines={1}>
                      {a.groupMemberId ? `M ${a.groupMemberId}` : "Your chit"}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: "#ecfdf5",
                        borderRadius: 999,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderWidth: 1,
                        borderColor: "rgba(34,197,94,0.25)",
                      }}
                    >
                      <LiveDot />
                      <Text style={{ color: "#15803d", fontSize: 8, fontWeight: "800", letterSpacing: 0.4 }}>LIVE</Text>
                    </View>
                  </View>
                  <AuctionCountdown endDate={a.auctionEndDate} endTime={a.auctionEndTime} />
                  <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "600" }}>MIN BID</Text>
                  <Text style={{ color: "#334155", fontSize: 10.5, fontWeight: "700", marginBottom: 6 }}>
                    {formatINR(a.minBidAmount)}
                  </Text>
                  <Text style={{ color: "#94a3b8", fontSize: 9, fontWeight: "600" }}>CURRENT</Text>
                  <Text style={{ fontWeight: "800", fontSize: 13, marginBottom: 8, color: accent }} numberOfLines={1}>
                    {formatINR(a.currentBid)}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openBidNow(a)}
                    style={{ backgroundColor: PALETTE.brand, borderRadius: 999, paddingVertical: 6, alignItems: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.3 }}>Bid Now →</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
