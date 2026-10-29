import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import BACKEND_URL from "../../config";
import { useLiveBadges } from "../../components/useLiveBadges";

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Dimensions,
  RefreshControl,
} from "react-native";
import { USE_NEW_ADMIN_DESIGN } from "../../components/memberDesign";
import { AdminFollowUpsSection } from "../../components/followUpDue";
import {
  AdminAlertsSheet,
  AdminHeader,
  AdminHeroAndOverview,
  AdminLogoutModal,
  AdminMenuSections,
  LiveBidsSection,
  useAdminOverview,
} from "../../components/adminHome";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = 132;
const CARD_GAP = 14;

/* Group Capacity is kept here (in memory while the app is open, and saved on
   the phone) so coming back to this page shows the gauges instantly. They
   are then refreshed quietly in the background - no loading flash. */
const CAPACITY_CACHE_KEY = "adminGroupCapacityCache";
let groupCapacityMemory: any[] | null = null;
let capacityInFlight = false;

/* =========================================================
   CAPACITY CAPSULE — glass-tube battery gauge that fills from
   the bottom to `pct`, with measurement ticks, liquid surface
   highlight and a gloss stripe down the side.
========================================================= */

function CapacityCapsule({
  width = 62,
  height = 92,
  pct,
  color,
}: {
  width?: number;
  height?: number;
  pct: number;
  color: string;
}) {
  const fillAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: Math.max(0, Math.min(100, pct)),
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct]);

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, height],
  });

  return (
    <View
      style={{
        width,
        height,
        borderRadius: width / 2,
        backgroundColor: "#f1f5f3",
        overflow: "hidden",
        justifyContent: "flex-end",
        borderWidth: 1.5,
        borderColor: "#e2ece7",
      }}
    >
      {/* LIQUID FILL */}
      <Animated.View
        style={{
          width: "100%",
          height: fillHeight,
          backgroundColor: color,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 5,
            width: "100%",
            backgroundColor: "rgba(255,255,255,0.5)",
          }}
        />
      </Animated.View>

      {/* MEASUREMENT TICKS */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: "space-evenly",
          alignItems: "center",
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: "42%",
              height: 1,
              backgroundColor: "rgba(2,78,50,0.08)",
            }}
          />
        ))}
      </View>

      {/* GLASS GLOSS */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 10,
          bottom: 10,
          left: 9,
          width: 5,
          borderRadius: 3,
          backgroundColor: "rgba(255,255,255,0.55)",
        }}
      />
    </View>
  );
}

/* =========================================================
   STAT CELL — used inside the dark summary strip
========================================================= */

function StatCell({
  value,
  label,
  accent = "#ffffff",
}: {
  value: number | string;
  label: string;
  accent?: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: accent, fontSize: 22, fontWeight: "800" }}>
        {value}
      </Text>
      <Text
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 9.5,
          marginTop: 3,
          fontWeight: "700",
          letterSpacing: 0.8,
        }}
      >
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

export default function AdminIndex() {
  const router = useRouter();

  // ✅ LOGOUT MODAL STATE
  const [logoutVisible, setLogoutVisible] = useState(false);

  /* =========================================================
     VACANCY SUBSCRIPTION REQUEST BADGE
  ========================================================= */

  const [newRequestCount, setNewRequestCount] = useState(0);

  /* =========================================================
     CONTACT REQUEST BADGE
  ========================================================= */

  const [contactRequestCount, setContactRequestCount] = useState(0);

  const loadContactRequestCount = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/contact-requests/unread-count`);

      if (!res.ok) return;

      const data = await res.json();

      setContactRequestCount(Number(data?.unreadCount || 0));
    } catch (error) {
      console.log("Contact request count load error:", error);
    }
  }, []);

  /* NEW look only: bell count for Interested Members (pending ones) */
  const [interestedCount, setInterestedCount] = useState(0);
  const [bellVisible, setBellVisible] = useState(false);

  // "Clear" on the bell: hides what is waiting right now (kept on this phone only,
  // nothing is deleted). New items that arrive later show up again.
  const BELL_CLEARED_KEY = "adminBellCleared";
  const [bellBase, setBellBase] = useState({ interested: 0, vacancy: 0, contact: 0 });
  useEffect(() => {
    AsyncStorage.getItem(BELL_CLEARED_KEY)
      .then((v) => {
        if (v) setBellBase({ interested: 0, vacancy: 0, contact: 0, ...JSON.parse(v) });
      })
      .catch(() => {});
  }, []);
  const loadInterestedCount = useCallback(async () => {
    if (!USE_NEW_ADMIN_DESIGN) return;
    try {
      const res = await fetch(`${BACKEND_URL}/member-interest/all-interests`);
      if (!res.ok) return;
      const json = await res.json();
      const list = Array.isArray(json) ? json : [];
      setInterestedCount(list.filter((m: any) => m?.status === "pending").length);
    } catch (error) {
      console.log("Interested count load error:", error);
    }
  }, []);

  const loadRequestCount = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/vacancy/requests/count`);

      if (!res.ok) return;

      const data = await res.json();

      setNewRequestCount(Number(data?.unseenCount || 0));
    } catch (error) {
      console.log("Vacancy request count load error:", error);
    }
  }, []);

  /* =========================================================
     GROUP CAPACITY (BATTERY GAUGES) — how many member slots
     each group still needs, drawn as a fill-level capsule
     (green = full, amber = mostly filled, red = well short).
  ========================================================= */

  const [groupCapacity, setGroupCapacity] = useState<
    {
      id: string;
      code: string;
      chitId: string;
      needed: number;
      filled: number;
      vacancy: number;
    }[]
  >(groupCapacityMemory ?? []);
  const [groupCapacityLoading, setGroupCapacityLoading] = useState(
    groupCapacityMemory === null
  );

  // first open after the app was closed: show the last saved gauges at once
  useEffect(() => {
    if (groupCapacityMemory !== null) return;
    AsyncStorage.getItem(CAPACITY_CACHE_KEY)
      .then((saved) => {
        if (!saved || groupCapacityMemory !== null) return;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGroupCapacity(parsed);
          setGroupCapacityLoading(false);
        }
      })
      .catch(() => {});
  }, []);

  const loadGroupCapacity = useCallback(async () => {
    if (capacityInFlight) return;
    capacityInFlight = true;
    try {
      // only show the loading state the very first time; after that the
      // old gauges stay on screen while the new numbers load behind them
      if (groupCapacityMemory === null) setGroupCapacityLoading(true);
      const chitRes = await fetch(`${BACKEND_URL}/chitscheme`);
      const chitData = chitRes.ok ? await chitRes.json() : [];
      const chits = Array.isArray(chitData) ? chitData : [];

      const perChit = await Promise.all(
        chits.map(async (c: any) => {
          const chitId = c.chitId || c.chit_id || c._id;
          try {
            const gRes = await fetch(
              `${BACKEND_URL}/groups/${encodeURIComponent(chitId)}`
            );
            const gData = gRes.ok ? await gRes.json() : [];
            const groups = Array.isArray(gData) ? gData : [];
            return groups.map((g: any) => {
              const needed = Number(g.totalCollections || 0);
              const filled = Array.isArray(g.members) ? g.members.length : 0;
              return {
                id: String(g._id || g.groupId),
                code: String(g.groupId),
                chitId: String(chitId),
                needed,
                filled,
                vacancy: Math.max(0, needed - filled),
              };
            });
          } catch (error) {
            console.log("Group capacity per-chit load error:", error);
            return [];
          }
        })
      );

      const nextCapacity = perChit.flat();
      // a failed / empty reply never wipes numbers we already have
      if (nextCapacity.length > 0 || groupCapacityMemory === null) {
        groupCapacityMemory = nextCapacity;
        setGroupCapacity(nextCapacity);
        AsyncStorage.setItem(
          CAPACITY_CACHE_KEY,
          JSON.stringify(nextCapacity)
        ).catch(() => {});
      }
    } catch (error) {
      console.log("Group capacity load error:", error);
      if (groupCapacityMemory === null) setGroupCapacity([]);
    } finally {
      capacityInFlight = false;
      setGroupCapacityLoading(false);
    }
  }, []);

  /* =========================================================
     LOAD BADGES WHEN ADMIN DASHBOARD IS OPENED/FOCUSED
  ========================================================= */

  useFocusEffect(
    useCallback(() => {
      loadRequestCount();
      loadContactRequestCount();
      loadInterestedCount();
      loadGroupCapacity();
    }, [loadRequestCount, loadContactRequestCount, loadInterestedCount, loadGroupCapacity])
  );

  // LIVE BADGES: re-run the SAME count functions above the moment the server
  // says a vacancy request / contact request changed (no manual refresh).
  useLiveBadges(true, () => {
    loadRequestCount();
    loadContactRequestCount();
    loadInterestedCount(); // bell count (new look)
    loadGroupCapacity(); // vacancies / seats may have changed
  });

  // keep Group Capacity up to date while this page is open (quiet, no spinner)
  useFocusEffect(
    useCallback(() => {
      const timer = setInterval(loadGroupCapacity, 60000);
      return () => clearInterval(timer);
    }, [loadGroupCapacity])
  );

  // ✅ FINAL LOGOUT FUNCTION (ALL DEVICES)
  const confirmLogout = async () => {
    try {
      await AsyncStorage.removeItem("adminInfo");
      await AsyncStorage.removeItem("adminToken");
      await AsyncStorage.removeItem("adminSession");

      setLogoutVisible(false);

      router.replace("/admin/login");
    } catch (err) {
      console.log("Logout Error:", err);
    }
  };

  /* =========================================================
     DERIVED SUMMARY NUMBERS FOR THE CAPACITY STRIP
  ========================================================= */

  /* NEW look only: extra read-only data + pull to refresh (does not touch the logic above) */
  const NEW = USE_NEW_ADMIN_DESIGN;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const overview = useAdminOverview(NEW);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      loadRequestCount(),
      loadContactRequestCount(),
      loadInterestedCount(),
      loadGroupCapacity(),
      overview.reload(),
    ]);
    setRefreshing(false);
  }, [loadRequestCount, loadContactRequestCount, loadInterestedCount, loadGroupCapacity, overview.reload]);
  const eff = (now: number, base: number) => (now > base ? now - base : 0);

  // Opening the bell makes its red number disappear (the list inside stays
  // until "Clear"). Only items that arrive after that raise the number again.
  const SEEN_KEY = "adminBellSeen";
  const [bellSeen, setBellSeen] = useState({ interested: 0, vacancy: 0, contact: 0 });
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY)
      .then((v) => {
        if (v) setBellSeen({ interested: 0, vacancy: 0, contact: 0, ...JSON.parse(v) });
      })
      .catch(() => {});
  }, []);
  // when the newest waiting item of each kind arrived (from the lists the
  // pages already use - nothing new is needed on the server)
  const [bellTimes, setBellTimes] = useState<{ interested?: string | null; vacancy?: string | null; contact?: string | null }>({});
  const loadBellTimes = useCallback(async () => {
    const newest = (list: any[]) =>
      list
        .map((x) => x?.createdAt)
        .filter(Boolean)
        .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
    try {
      const [i, v, c] = await Promise.all([
        fetch(`${BACKEND_URL}/member-interest/all-interests`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch(`${BACKEND_URL}/vacancy/requests?status=Pending`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
        fetch(`${BACKEND_URL}/contact-requests`).then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
      ]);
      setBellTimes({
        interested: newest((Array.isArray(i) ? i : []).filter((m: any) => m?.status === "pending")),
        vacancy: newest(((v as any)?.requests || []).filter((m: any) => m?.seenByAdmin === false || m?.seenByAdmin === undefined)),
        contact: newest(((c as any)?.requests || []).filter((m: any) => m?.read === false)),
      });
    } catch {
      // ignore - times are optional
    }
  }, []);
  useEffect(() => {
    if (bellVisible) loadBellTimes();
  }, [bellVisible, interestedCount, newRequestCount, contactRequestCount, loadBellTimes]);

  const openBell = () => {
    const next = { interested: interestedCount, vacancy: newRequestCount, contact: contactRequestCount };
    setBellSeen(next);
    AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next)).catch(() => {});
    setBellVisible(true);
  };
  useEffect(() => {
    const next = {
      interested: Math.min(bellSeen.interested, interestedCount),
      vacancy: Math.min(bellSeen.vacancy, newRequestCount),
      contact: Math.min(bellSeen.contact, contactRequestCount),
    };
    if (
      next.interested !== bellSeen.interested ||
      next.vacancy !== bellSeen.vacancy ||
      next.contact !== bellSeen.contact
    ) {
      setBellSeen(next);
      AsyncStorage.setItem(SEEN_KEY, JSON.stringify(next)).catch(() => {});
    }
  }, [interestedCount, newRequestCount, contactRequestCount, bellSeen]);
  const bellBadge =
    eff(interestedCount, Math.max(bellBase.interested, bellSeen.interested)) +
    eff(newRequestCount, Math.max(bellBase.vacancy, bellSeen.vacancy)) +
    eff(contactRequestCount, Math.max(bellBase.contact, bellSeen.contact));
  const bellInterested = eff(interestedCount, bellBase.interested);
  const bellVacancy = eff(newRequestCount, bellBase.vacancy);
  const bellContact = eff(contactRequestCount, bellBase.contact);

  // when items get handled (count goes down) lower the saved level too,
  // so the next new one is counted
  useEffect(() => {
    const next = {
      interested: Math.min(bellBase.interested, interestedCount),
      vacancy: Math.min(bellBase.vacancy, newRequestCount),
      contact: Math.min(bellBase.contact, contactRequestCount),
    };
    if (
      next.interested !== bellBase.interested ||
      next.vacancy !== bellBase.vacancy ||
      next.contact !== bellBase.contact
    ) {
      setBellBase(next);
      AsyncStorage.setItem(BELL_CLEARED_KEY, JSON.stringify(next)).catch(() => {});
    }
  }, [interestedCount, newRequestCount, contactRequestCount, bellBase]);

  const clearBell = () => {
    const next = { interested: interestedCount, vacancy: newRequestCount, contact: contactRequestCount };
    setBellBase(next);
    AsyncStorage.setItem(BELL_CLEARED_KEY, JSON.stringify(next)).catch(() => {});
    setBellVisible(false);
  };

  const ScrollComp: any = NEW ? Animated.ScrollView : ScrollView;
  const newScrollProps: any = NEW
    ? {
        onScroll: Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true }),
        scrollEventThrottle: 16,
        refreshControl: (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#024e32" colors={["#024e32"]} />
        ),
      }
    : {};

  const totalGroups = groupCapacity.length;
  const fullGroups = groupCapacity.filter(
    (g) => g.needed > 0 && g.vacancy === 0
  ).length;
  const totalOpenSlots = groupCapacity.reduce((sum, g) => sum + g.vacancy, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      {NEW ? (
        <>
          <AdminHeader
            scrollY={scrollY}
            onLogout={() => setLogoutVisible(true)}
            bellCount={bellBadge}
            onBell={openBell}
          />
          <AdminAlertsSheet
            visible={bellVisible}
            onClose={() => setBellVisible(false)}
            interestedCount={bellInterested}
            vacancyCount={bellVacancy}
            contactCount={bellContact}
            onClear={clearBell}
            times={bellTimes}
          />
        </>
      ) : (
      <View
        className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50"
        style={{
          shadowColor: "#024e32",
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">
              MANIKYA CHITS
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 10.5,
                fontWeight: "700",
                letterSpacing: 2.4,
                marginTop: 2,
              }}
            >
              ADMIN CONSOLE
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setLogoutVisible(true)}
            activeOpacity={0.75}
            style={{
              padding: 9,
              borderRadius: 14,
              backgroundColor: "rgba(255,255,255,0.12)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
            }}
          >
            <MaterialIcons name="logout" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* =====================================================
          LOGOUT CONFIRM MODAL
      ===================================================== */}

      {NEW ? (
        <AdminLogoutModal
          visible={logoutVisible}
          onCancel={() => setLogoutVisible(false)}
          onConfirm={confirmLogout}
        />
      ) : (
      <Modal visible={logoutVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-80 rounded-2xl p-6">
            <Text className="text-xl font-bold text-gray-800 text-center">
              Logout Confirmation
            </Text>

            <Text className="text-gray-600 text-center mt-3">
              Are you sure you want to logout as Admin?
            </Text>

            <View className="flex-row mt-6">
              <TouchableOpacity
                onPress={() => setLogoutVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl mr-2"
              >
                <Text className="text-center font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmLogout}
                className="flex-1 bg-red-600 py-3 rounded-xl ml-2"
              >
                <Text className="text-center font-semibold text-white">
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      )}

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollComp
        className="flex-1"
        contentContainerStyle={{
          paddingTop: NEW ? 142 : 116,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
        {...newScrollProps}
      >
        {/* ===================================================
            LOGO
        =================================================== */}

        {NEW ? (
          <>
            <AdminHeroAndOverview
              stats={overview.stats}
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
            <LiveBidsSection
              liveAuctions={overview.liveAuctions}
              closedAuctions={overview.closedAuctions}
              loading={overview.bidsLoading}
            />
            <AdminFollowUpsSection />
          </>
        ) : (
        <View className="items-center mt-4">
          <Image
            source={require("../../assets/images/manikyaChits.png")}
            style={{ width: 150, height: 150 }}
            resizeMode="contain"
          />
        </View>
        )}

        {/* ===================================================
            DASHBOARD MENU
        =================================================== */}

        {NEW ? (
          <AdminMenuSections vacancyCount={newRequestCount} contactCount={contactRequestCount} />
        ) : (
        <View className="flex-row flex-wrap justify-between px-5 mt-6 pb-6">
          <MenuCard
            title="Chit Schemes"
            icon="account-balance-wallet"
            route="/admin/chitSchemes"
          />

          <MenuCard title="Groups" icon="group-work" route="/admin/groups" />

          <MenuCard title="Ledger" icon="menu-book" route="/admin/ledger" />

          <MenuCard title="More" icon="apps" route="/admin/more" />

          <MenuCard
            title="Vacancies"
            icon="event-seat"
            route="/admin/vacancies"
            badgeCount={newRequestCount}
          />

          <MenuCard
            title="Vacancy Notifications"
            icon="notifications-active"
            route="/admin/vacancyNotifications?from=index"
            badgeCount={newRequestCount}
          />

          <MenuCard
            title="Intrested Members"
            icon="person-add"
            route="/admin/interestedMembers"
          />

          <MenuCard
            title="Members"
            icon="people"
            route="/admin/membersView"
          />

          <MenuCard
            title="Member History"
            icon="history"
            route="/admin/memberHistory"
          />

          <MenuCard
            title="Employees"
            icon="badge"
            route="/admin/employeesView"
          />

          <MenuCard
            title="Employee Performance"
            icon="trending-up"
            route="/admin/employeeprogress"
          />

          <MenuCard
            title="Daily Leads"
            subtitle="Employee field-visit leads"
            icon="whatshot"
            route="/admin/dailyDatabaseEmployees"
          />

          <MenuCard
            title="Notifications"
            icon="notifications"
            route="/admin/notifications"
          />

          <MenuCard
            title="Contact Requests"
            subtitle="Newly commenced Groups Requests"
            icon="support-agent"
            route="/admin/contactRequests"
            badgeCount={contactRequestCount}
          />

          <MenuCard
            title="Waived Penalties"
            subtitle="Penalty OFF list for audit"
            icon="gavel"
            route="/admin/penaltyWaivers"
          />

          <MenuCard title="Profile" icon="person" route="/admin/profile" />
        </View>
        )}

        {/* ===================================================
            GROUP CAPACITY SECTION — redesigned
        =================================================== */}

        <View style={{ marginBottom: 28 }}>
          {/* ---------- SECTION HEADER ---------- */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              marginBottom: 14,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 11,
                  backgroundColor: "#eaf4ef",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="battery-charging-full" size={19} color="#024e32" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: "800",
                    color: "#024e32",
                    letterSpacing: 0.2,
                  }}
                >
                  Group Capacity
                </Text>
                <Text style={{ fontSize: 10.5, color: "#8ca39a", marginTop: 1 }}>
                  Live member slots across all groups
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/admin/vacancies" as any)}
              activeOpacity={0.75}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#eaf4ef",
                paddingHorizontal: 11,
                paddingVertical: 7,
                borderRadius: 999,
              }}
            >
              <MaterialIcons name="event-seat" size={14} color="#024e32" />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  marginLeft: 5,
                  color: "#024e32",
                }}
              >
                Vacancies
              </Text>
            </TouchableOpacity>
          </View>

          {/* ---------- LOADING ---------- */}
          {groupCapacityLoading ? (
            <View
              style={{
                marginHorizontal: 20,
                backgroundColor: "#fff",
                borderRadius: 24,
                paddingVertical: 34,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#e8f0eb",
              }}
            >
              <ActivityIndicator size="small" color="#024e32" />
              <Text style={{ color: "#9ca3af", fontSize: 11.5, marginTop: 10 }}>
                Loading group capacity…
              </Text>
            </View>
          ) : groupCapacity.length === 0 ? (
            /* ---------- EMPTY ---------- */
            <View
              style={{
                marginHorizontal: 20,
                backgroundColor: "#fff",
                borderRadius: 24,
                paddingVertical: 30,
                alignItems: "center",
                borderWidth: 1,
                borderColor: "#e8f0eb",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#f1f5f3",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons name="groups" size={26} color="#9ca3af" />
              </View>
              <Text
                style={{
                  color: "#024e32",
                  fontSize: 13.5,
                  fontWeight: "700",
                  marginTop: 12,
                }}
              >
                No groups yet
              </Text>
              <Text style={{ color: "#9ca3af", fontSize: 11, marginTop: 3 }}>
                Groups will appear here once created
              </Text>
            </View>
          ) : (
            <>
              {/* ---------- DARK SUMMARY STRIP ---------- */}
              <View
                style={{
                  marginHorizontal: 20,
                  marginBottom: 16,
                  borderRadius: 22,
                  backgroundColor: "#024e32",
                  paddingVertical: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  shadowColor: "#024e32",
                  shadowOpacity: 0.28,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 6,
                  overflow: "hidden",
                }}
              >
                {/* decorative glow */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    right: -30,
                    top: -30,
                    width: 110,
                    height: 110,
                    borderRadius: 55,
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                />

                <StatCell value={totalGroups} label="Groups" />
                <View
                  style={{
                    width: 1,
                    height: 30,
                    backgroundColor: "rgba(255,255,255,0.14)",
                  }}
                />
                <StatCell value={fullGroups} label="Full" accent="#6ee7a8" />
                <View
                  style={{
                    width: 1,
                    height: 30,
                    backgroundColor: "rgba(255,255,255,0.14)",
                  }}
                />
                <StatCell
                  value={totalOpenSlots}
                  label="Open Slots"
                  accent="#fca5a5"
                />
              </View>

              {/* ---------- HORIZONTAL CARD SCROLLER ---------- */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={CARD_W + CARD_GAP}
                snapToAlignment="start"
                contentContainerStyle={{
                  paddingLeft: 20,
                  paddingRight: 8,
                  paddingVertical: 4,
                }}
              >
                {groupCapacity.map((g) => {
                  const pct =
                    g.needed > 0
                      ? Math.min(100, (g.filled / g.needed) * 100)
                      : 0;
                  const isFull = g.needed > 0 && g.vacancy === 0;
                  const gaugeColor =
                    g.needed === 0
                      ? "#9ca3af"
                      : isFull
                      ? "#16a34a"
                      : pct >= 70
                      ? "#d97706"
                      : "#dc2626";
                  const softBg = isFull
                    ? "#eafaf0"
                    : pct >= 70
                    ? "#fff7ed"
                    : "#fef2f2";

                  const card = (
                    <View
                      style={{
                        width: CARD_W,
                        backgroundColor: "#fff",
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: "#e8f0eb",
                        paddingVertical: 16,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        shadowColor: "#024e32",
                        shadowOpacity: 0.07,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 4 },
                        elevation: 3,
                      }}
                    >
                      {/* TOP STATUS DOT + CODE */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          alignSelf: "stretch",
                          justifyContent: "center",
                          marginBottom: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: gaugeColor,
                            marginRight: 5,
                          }}
                        />
                        <Text
                          style={{
                            fontWeight: "800",
                            fontSize: 11.5,
                            color: "#024e32",
                            letterSpacing: 0.4,
                          }}
                          numberOfLines={1}
                        >
                          {g.code}
                        </Text>
                      </View>

                      {/* CAPSULE + PERCENT BUBBLE */}
                      <View
                        style={{
                          width: 62,
                          height: 92,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CapacityCapsule
                          width={62}
                          height={92}
                          pct={pct}
                          color={gaugeColor}
                        />
                        <View
                          style={{
                            position: "absolute",
                            backgroundColor: "#fff",
                            borderRadius: 10,
                            paddingHorizontal: 7,
                            paddingVertical: 3,
                            borderWidth: 1,
                            borderColor: "#e8f0eb",
                            shadowColor: "#000",
                            shadowOpacity: 0.06,
                            shadowRadius: 4,
                            shadowOffset: { width: 0, height: 2 },
                            elevation: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: "900",
                              color: gaugeColor,
                            }}
                          >
                            {g.filled === 0 ? "EMPTY" : `${Math.round(pct)}%`}
                          </Text>
                        </View>
                      </View>

                      {/* MEMBER COUNT */}
                      <Text
                        style={{
                          color: "#8ca39a",
                          fontSize: 10.5,
                          marginTop: 10,
                          fontWeight: "600",
                        }}
                        numberOfLines={1}
                      >
                        {g.filled}/{g.needed || "-"} members
                      </Text>

                      {/* OPEN / FULL PILL */}
                      <View
                        style={{
                          marginTop: 8,
                          borderRadius: 999,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          backgroundColor: softBg,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9.5,
                            fontWeight: "900",
                            letterSpacing: 0.5,
                            color: isFull ? "#16a34a" : gaugeColor,
                          }}
                        >
                          {isFull ? "FULL" : `${g.vacancy} OPEN`}
                        </Text>
                      </View>
                    </View>
                  );

                  if (isFull || g.needed === 0) {
                    return (
                      <View
                        key={g.id}
                        style={{ marginRight: CARD_GAP, opacity: 0.85 }}
                      >
                        {card}
                      </View>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={g.id}
                      activeOpacity={0.85}
                      style={{ marginRight: CARD_GAP }}
                      onPress={() =>
                        router.push({
                          pathname: "/admin/vacancies",
                          params: {
                            groupId: g.code,
                            chitId: g.chitId,
                            needed: String(g.vacancy),
                          },
                        } as any)
                      }
                    >
                      {card}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* ---------- SCROLL HINT ---------- */}
              {groupCapacity.length > 2 && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 12,
                  }}
                >
                  <MaterialIcons
                    name="swipe"
                    size={13}
                    color="#b6c8c0"
                  />
                  <Text
                    style={{
                      fontSize: 10,
                      color: "#b6c8c0",
                      marginLeft: 5,
                      fontWeight: "600",
                    }}
                  >
                    Tap a group to post a vacancy
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {NEW && (
          <View className="items-center mt-2">
            <Image
              source={require("../../assets/images/manikyaChits.png")}
              style={{ width: 130, height: 130 }}
              resizeMode="contain"
            />
          </View>
        )}

        {/* ===================================================
            COMPANY FOOTER
        =================================================== */}

        <View className="mt-2 mb-6 px-5">
          <View className="border-t border-gray-200 pt-5 items-center">
            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1">
              Admin Dashboard
            </Text>

            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights
              reserved.
            </Text>
          </View>
        </View>
      </ScrollComp>
    </SafeAreaView>
  );
}

/* =========================================================
   MENU CARD – UPDATED with subtitle support
========================================================= */

function MenuCard({
  title,
  subtitle,
  icon,
  route,
  badgeCount = 0,
}: {
  title: string;
  subtitle?: string;
  icon: any;
  route: string;
  badgeCount?: number;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      className="bg-white w-[47%] py-8 mb-6 rounded-3xl items-center shadow-md border border-[#e8f0eb]"
      activeOpacity={0.9}
      style={{ padding: 5 }}
    >
      <View className="w-14 h-14 rounded-2xl bg-[#eaf4ef] items-center justify-center mb-3">
        <MaterialIcons name={icon} size={30} color="#024e32" />

        {badgeCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-[20px] px-1 items-center justify-center border border-white">
            <Text className="text-white text-[10px] font-bold">
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        )}
      </View>

      {/* Main Title */}
      <Text className="text-[#024e32] text-base font-semibold text-center">
        {title}
      </Text>

      {/* Subtitle – small, gray, centered */}
      {subtitle && (
        <Text className="text-gray-400 text-xs text-center mt-0.5">
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
}
