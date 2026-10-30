import { navPad } from "../components/memberDesign";
import MemberLoader from "../components/MemberLoader";
import { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  Animated,
  Platform,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import BACKEND_URL from "../config";

// =========================================================
// SCREENSHOT PREVENTION FOR ALL PLATFORMS
// =========================================================

let ScreenCapture: any = null;

try {
  const module = require("expo-screen-capture");
  ScreenCapture = module.default || module;
} catch (error) {
  console.log("expo-screen-capture not available");
}

const preventScreenshot = async () => {
  try {
    // Admin exemption. While an admin session is active on this
    // device the app leaves screen capture ENABLED, so only an
    // admin can screenshot. Every other user stays blocked.
    if ((await AsyncStorage.getItem("adminSession")) === "true") {
      await allowScreenshot();
      return;
    }

    if (ScreenCapture && typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
      await ScreenCapture.preventScreenCaptureAsync();
      return;
    }

    if (Platform.OS === "android") {
      try {
        const { NativeModules } = require("react-native");
        const { SecureViewManager } = NativeModules;
        if (SecureViewManager?.setSecure) {
          await SecureViewManager.setSecure(true);
        }
      } catch (error) {
        // Silent fail
      }
    }
  } catch (error) {
    // Silent fail
  }
};

const allowScreenshot = async () => {
  try {
    if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
      await ScreenCapture.allowScreenCaptureAsync();
      return;
    }

    if (Platform.OS === "android") {
      try {
        const { NativeModules } = require("react-native");
        const { SecureViewManager } = NativeModules;
        if (SecureViewManager?.setSecure) {
          await SecureViewManager.setSecure(false);
        }
      } catch (error) {
        // Silent fail
      }
    }
  } catch (error) {
    // Silent fail
  }
};

/* ================= SKELETON HELPERS ================= */
function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

function SkeletonBox({ className = "", style = {} }: { className?: string; style?: object }) {
  const opacity = useSkeletonPulse();
  return (
    <Animated.View
      className={`bg-gray-200 rounded-lg ${className}`}
      style={[{ opacity }, style]}
    />
  );
}

function NotificationCardSkeleton() {
  return (
    <View className="bg-white mb-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <View className="bg-gray-50 px-5 py-3 flex-row items-center justify-between border-b border-gray-100">
        <View className="flex-row items-center">
          <SkeletonBox className="w-10 h-10 rounded-full mr-3" />
          <View>
            <SkeletonBox className="h-3.5 rounded mb-2" style={{ width: 110 }} />
            <SkeletonBox className="h-3 rounded" style={{ width: 80 }} />
          </View>
        </View>
        <SkeletonBox className="h-5 rounded-full" style={{ width: 40 }} />
      </View>

      <View className="p-5">
        <SkeletonBox className="h-3 rounded mb-2" style={{ width: "90%" }} />
        <SkeletonBox className="h-3 rounded mb-4" style={{ width: "70%" }} />

        <View className="bg-gray-50 rounded-xl p-4">
          <View className="flex-row items-center mb-3">
            <SkeletonBox className="w-5 h-5 rounded" />
            <SkeletonBox className="h-3 rounded ml-3" style={{ width: 90 }} />
            <SkeletonBox className="h-3 rounded ml-auto" style={{ width: 60 }} />
          </View>
          <View className="flex-row items-center">
            <SkeletonBox className="w-5 h-5 rounded" />
            <SkeletonBox className="h-3 rounded ml-3" style={{ width: 90 }} />
            <SkeletonBox className="h-3 rounded ml-auto" style={{ width: 60 }} />
          </View>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   COUNTDOWN TIMER COMPONENT
========================================================= */
function CountdownTimer({
  auctionEndDate,
  auctionEndTime
}: {
  auctionEndDate: string;
  auctionEndTime: string;
}) {
  const [countdown, setCountdown] = useState("--:--:--");
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateCountdown = () => {
     if (!auctionEndDate || !auctionEndTime) {
        setCountdown("--:--:--");
        return;
      }

      try {
        // Parse date (DD-MM-YYYY)
        const dateParts = auctionEndDate.split("-");
        if (dateParts.length !== 3) {
          setCountdown("Invalid Date");
          return;
        }

        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);

        // Parse time (HH:MM)
        const timeParts = auctionEndTime.split(":");
        if (timeParts.length !== 2) {
          setCountdown("Invalid Time");
          return;
        }

        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);

        // Create target date
        const targetDate = new Date(year, month, day, hours, minutes, 0, 0);
        
        if (isNaN(targetDate.getTime())) {
          setCountdown("Invalid Date");
          return;
        }

        const now = new Date();
        const difference = targetDate.getTime() - now.getTime();

        if (difference <= 0) {
          setIsExpired(true);
          setCountdown("00:00:00");
          return;
        }

        setIsExpired(false);
        const totalSeconds = Math.floor(difference / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hoursLeft = Math.floor((totalSeconds % 86400) / 3600);
        const minutesLeft = Math.floor((totalSeconds % 3600) / 60);
        const secondsLeft = totalSeconds % 60;

        if (days > 0) {
          setCountdown(`${days}d ${String(hoursLeft).padStart(2, "0")}h ${String(minutesLeft).padStart(2, "0")}m ${String(secondsLeft).padStart(2, "0")}s`);
        } else {
          setCountdown(
            `${String(hoursLeft).padStart(2, "0")}:${String(minutesLeft).padStart(2, "0")}:${String(secondsLeft).padStart(2, "0")}`
          );
        }
      } catch (error) {
        setCountdown("Error");
      }
    };

    calculateCountdown();
    const timer = setInterval(calculateCountdown, 1000);
    return () => clearInterval(timer);
  }, [auctionEndDate, auctionEndTime]);

  if (!auctionEndTime) {
    return null;
  }

  return (
    <View className={`mt-3 rounded-xl p-3 ${isExpired ? 'bg-red-50 border border-red-200' : 'bg-[#024e32]'}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <MaterialIcons 
            name={isExpired ? "timer-off" : "timer"} 
            size={20} 
            color={isExpired ? "#dc2626" : "white"} 
          />
          <Text className={`ml-2 font-medium ${isExpired ? 'text-red-700' : 'text-white'}`}>
            {isExpired ? "Auction Ended" : "Time Remaining"}
          </Text>
        </View>
        <Text className={`font-mono font-bold text-lg ${isExpired ? 'text-red-700' : 'text-white'}`}>
          {countdown}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */
// =========================================================
// GROUP-WISE VIEW (look only): notices of the same group sit
// together under one coloured group heading
// =========================================================

type GroupColor = { main: string; light: string; soft: string };

const GROUP_COLORS: GroupColor[] = [
  { main: "#024e32", light: "#10a36b", soft: "#e6f4ee" }, // green
  { main: "#1d4ed8", light: "#4f8bff", soft: "#e8efff" }, // blue
  { main: "#b45309", light: "#f5a524", soft: "#fdf1e0" }, // amber
  { main: "#7e22ce", light: "#b06cf5", soft: "#f3e8fd" }, // purple
  { main: "#be123c", light: "#fb5a7e", soft: "#fde8ee" }, // rose
  { main: "#0e7490", light: "#27c4e0", soft: "#e0f5f9" }, // teal
];

// same group code -> same colour every time
const colorForGroup = (code: string) => {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return GROUP_COLORS[h % GROUP_COLORS.length];
};

const isNoticeLive = (item: any) => {
  if (!item?.auctionEndDate || !item?.auctionEndTime) return false;
  try {
    const d = String(item.auctionEndDate).split("-");
    const t = String(item.auctionEndTime).split(":");
    if (d.length !== 3 || t.length !== 2) return false;
    return (
      new Date(
        parseInt(d[2], 10),
        parseInt(d[1], 10) - 1,
        parseInt(d[0], 10),
        parseInt(t[0], 10),
        parseInt(t[1], 10),
        0,
        0
      ).getTime() > Date.now()
    );
  } catch {
    return false;
  }
};

type GroupBlock = { key: string; code: string; items: any[]; live: number; color: GroupColor };

// groups with a LIVE auction come first; notices keep their own order inside a group
const buildGroupRows = (list: any[]): GroupBlock[] => {
  const map = new Map<string, any[]>();
  list.forEach((n) => {
    const code = String(n?.groupId?.groupId || "N/A");
    if (!map.has(code)) map.set(code, []);
    map.get(code)!.push(n);
  });

  const groups: GroupBlock[] = Array.from(map.entries()).map(([code, items]) => ({
    key: `group-${code}`,
    code,
    items,
    live: items.filter(isNoticeLive).length,
    color: colorForGroup(code),
  }));
  // Array.sort is stable, so equal groups keep the order they came in
  groups.sort((x, y) => (y.live > 0 ? 1 : 0) - (x.live > 0 ? 1 : 0));
  return groups;
};

export default function UserNotifications() {
  const router = useRouter();

  // =========================================================
  // SCREENSHOT PREVENTION
  // =========================================================

  useEffect(() => {
    preventScreenshot();
    return () => {
      allowScreenshot();
    };
  }, []);

  // =========================================================
  // WEB SCREENSHOT DETECTION
  // =========================================================

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "PrintScreen") {
          e.preventDefault();
          Alert.alert(
            "Screenshot Blocked",
            "Screenshots are not allowed for security reasons."
          );
        }
      };

      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        Alert.alert(
          "Action Blocked",
          "Right-click is disabled for security reasons."
        );
      };

      const handleDevTools = (e: KeyboardEvent) => {
        if (
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) ||
          (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) ||
          (e.ctrlKey && e.key === "U") ||
          (e.ctrlKey && e.key === "u")
        ) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Developer tools are disabled for security reasons."
          );
        }
      };

      const handleSave = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Save is disabled for security reasons."
          );
        }
      };

      const handlePrint = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Print is disabled for security reasons."
          );
        }
      };

      const handleCopy = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Copy is disabled for security reasons."
          );
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("contextmenu", handleContextMenu);
      document.addEventListener("keydown", handleDevTools);
      document.addEventListener("keydown", handleSave);
      document.addEventListener("keydown", handlePrint);
      document.addEventListener("keydown", handleCopy);

      const style = document.createElement("style");
      style.textContent = `
        body {
          user-select: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
        }
        img {
          -webkit-user-drag: none !important;
          user-drag: none !important;
        }
        @media print {
          body { display: none !important; }
        }
        * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("contextmenu", handleContextMenu);
        document.removeEventListener("keydown", handleDevTools);
        document.removeEventListener("keydown", handleSave);
        document.removeEventListener("keydown", handlePrint);
        document.removeEventListener("keydown", handleCopy);
        document.head.removeChild(style);
      };
    }
  }, []);

  const [userid, setUserid] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  /* ================= SESSION GUARD ================= */
  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("loggedUser");
      if (!stored) {
        router.replace("/");
        return;
      }

      const parsed = JSON.parse(stored);
      setUserid(parsed.userid);
    };

    checkSession();
  }, []);

  /* ================= LOAD NOTIFICATIONS ================= */
  const loadNotifications = async () => {
    if (!userid) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/notifications/user/${userid}`
      );
      const data = await res.json();

      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Notification fetch error:", err);
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userid) {
      loadNotifications();
    }
  }, [userid]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  /* =========================================================
     RENDER FOOTER COMPONENT
  ========================================================= */
  const renderFooter = () => (
    <View className="mt-4 mb-6 px-5">
      <View className="border-t border-gray-200 pt-4 items-center">
        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>
        <Text className="text-gray-500 text-xs mt-1 text-center">
          Member Notifications 
        </Text>
        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>
      </View>
    </View>
  );

  // search (look/filter only): group name, message, date, time, LIVE / ENDED
  const searchQuery = searchText.trim().toLowerCase();
  const searchedNotifications = searchQuery
    ? notifications.filter((n) => {
        const text = [
          n?.groupId?.groupId,
          n?.message,
          n?.auctionEndDate,
          n?.auctionEndTime,
          isNoticeLive(n) ? "live" : "ended",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(searchQuery);
      })
    : notifications;
  const groupRows = buildGroupRows(searchedNotifications);
  const totalGroupCount = searchQuery ? buildGroupRows(notifications).length : groupRows.length;

  /* ================= UI ================= */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar backgroundColor="#024e32" barStyle="light-content" />

      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-1"
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Notifications
          </Text>

          <TouchableOpacity
            onPress={() => {
              if (searchOpen) setSearchText("");
              setSearchOpen(!searchOpen);
            }}
            activeOpacity={0.8}
            className="mt-1 mr-4"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name={searchOpen ? "close" : "search"} size={26} color="white" />
          </TouchableOpacity>

          <View className="mt-1">
            <MaterialIcons name="notifications" size={24} color="white" />
          </View>
        </View>
      </View>

      {/* CONTENT */}
      <View className="flex-1" style={{ paddingTop: 110 }}>

        {/* NOTIFICATION COUNT */}
        <View className="px-5 pt-6">
          {loading ? (
            <View className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <View className="flex-row justify-between items-center">
                <View>
                  <SkeletonBox className="h-4 rounded mb-2" style={{ width: 130 }} />
                  <SkeletonBox className="h-3 rounded" style={{ width: 90 }} />
                </View>
                <SkeletonBox className="h-9 w-9 rounded-full" />
              </View>
            </View>
          ) : (
            <View className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-lg font-bold text-gray-800">
                    All Notifications
                  </Text>
                  <Text className="text-gray-600">
                    {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
                    {totalGroupCount > 0 ? ` · ${totalGroupCount} ${totalGroupCount === 1 ? "group" : "groups"}` : ""}
                  </Text>
                </View>
                <View className="bg-[#024e32] px-4 py-2 rounded-full">
                  <Text className="text-white font-medium">{notifications.length}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* SEARCH BAR */}
        {searchOpen && !loading && notifications.length > 0 && (
          <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#ffffff",
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: "#024e32",
                paddingHorizontal: 14,
                height: 50,
                elevation: 2,
                shadowColor: "#024e32",
                shadowOpacity: 0.12,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
              }}
            >
              <MaterialIcons name="search" size={22} color="#024e32" />
              <TextInput
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Search group, message, date..."
                placeholderTextColor="#9ca3af"
                autoFocus
                autoCorrect={false}
                returnKeyType="search"
                style={{ flex: 1, marginLeft: 10, fontSize: 15, color: "#1f2937", paddingVertical: 0 }}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <MaterialIcons name="cancel" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
            {searchQuery.length > 0 && (
              <Text style={{ marginTop: 8, marginLeft: 4, fontSize: 12, color: "#6b7280", fontWeight: "600" }}>
                {searchedNotifications.length} {searchedNotifications.length === 1 ? "result" : "results"}
                {groupRows.length > 0 ? ` in ${groupRows.length} ${groupRows.length === 1 ? "group" : "groups"}` : ""}
              </Text>
            )}
          </View>
        )}

        {/* CONTENT - WRAPPED WITH FOOTER AT BOTTOM */}
        {loading ? (
          <View className="flex-1 px-5 pt-6 pb-4">
            <MemberLoader text="Loading auctions..." />

            <View className="mt-4 mb-6 items-center">
              <View className="w-full border-t border-gray-200 pt-4 items-center">
                <SkeletonBox className="h-4 rounded" style={{ width: 155 }} />
                <SkeletonBox className="h-3 rounded mt-2" style={{ width: 120 }} />
                <SkeletonBox className="h-3 rounded mt-2" style={{ width: 250 }} />
              </View>
            </View>
            
            {/* Footer during loading */}
            {renderFooter()}
          </View>
        ) : notifications.length === 0 ? (
          <View className="flex-1 px-5 pt-6 pb-4">
            <View className="flex-1 justify-center items-center">
              <View className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 items-center">
                <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                  <MaterialIcons
                    name="notifications-none"
                    size={40}
                    color="#9ca3af"
                  />
                </View>
                <Text className="text-xl font-bold text-gray-700 mb-2">
                  No Notifications
                </Text>
                <Text className="text-gray-500 text-center">
                  You don't have any notifications for your group yet.
                </Text>
                <Text className="text-gray-400 text-center mt-1">
                  Check back later for updates.
                </Text>
              </View>
            </View>
            
            {/* Footer when no notifications */}
            {renderFooter()}
          </View>
        ) : (
          <FlatList
            data={groupRows}
            keyExtractor={(group) => group.key}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 18, paddingBottom: navPad(0) }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 30 }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: "#f3f4f6",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 14,
                  }}
                >
                  <MaterialIcons name="search-off" size={40} color="#9ca3af" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: "800", color: "#374151" }}>No results found</Text>
                <Text style={{ marginTop: 6, color: "#6b7280", textAlign: "center" }}>
                  Nothing matches "{searchText.trim()}". Try a group name or a date.
                </Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#024e32"]}
              />
            }
            renderItem={({ item: group }) => {
              const ended = group.items.length - group.live;
              return (
                <View
                  style={{
                    marginHorizontal: 16,
                    marginBottom: 22,
                    borderRadius: 26,
                    backgroundColor: "#ffffff",
                    borderWidth: 1,
                    borderColor: "#e9eeeb",
                    overflow: "hidden",
                    elevation: 4,
                    shadowColor: group.color.main,
                    shadowOpacity: 0.18,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                  }}
                >
                  {/* GROUP HEADING */}
                  <LinearGradient
                    colors={[group.color.main, group.color.light]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 18, paddingVertical: 16 }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 16,
                          backgroundColor: "rgba(255,255,255,0.22)",
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 14,
                        }}
                      >
                        <MaterialIcons name="groups" size={28} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 }}>
                          GROUP
                        </Text>
                        <Text style={{ color: "white", fontSize: 24, fontWeight: "900" }} numberOfLines={1}>
                          {group.code}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: "rgba(255,255,255,0.95)",
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 5,
                        }}
                      >
                        <Text style={{ color: group.color.main, fontSize: 12, fontWeight: "800" }}>
                          {group.items.length} {group.items.length === 1 ? "notice" : "notices"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", marginTop: 12 }}>
                      {group.live > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "rgba(255,255,255,0.22)",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            marginRight: 8,
                          }}
                        >
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ade80", marginRight: 6 }} />
                          <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>{group.live} Live</Text>
                        </View>
                      )}
                      {ended > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "rgba(0,0,0,0.18)",
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                          }}
                        >
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fca5a5", marginRight: 6 }} />
                          <Text style={{ color: "white", fontSize: 12, fontWeight: "800" }}>{ended} Ended</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>

                  {/* NOTICES OF THIS GROUP */}
                  <View style={{ padding: 12 }}>
                    {group.items.map((item: any, idx: number) => {
                      const isLive = isNoticeLive(item);
                      return (
                        <View
                          key={item._id}
                          style={{
                            backgroundColor: isLive ? group.color.soft : "#f8faf9",
                            borderRadius: 18,
                            padding: 14,
                            marginTop: idx === 0 ? 0 : 10,
                            borderWidth: 1,
                            borderColor: isLive ? group.color.main + "33" : "#eef1ef",
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                backgroundColor: isLive ? group.color.main : "#9ca3af",
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 10,
                              }}
                            >
                              <MaterialIcons name="gavel" size={18} color="white" />
                            </View>
                            <Text style={{ flex: 1, fontSize: 15, fontWeight: "800", color: "#1f2937" }}>
                              Auction Notice
                            </Text>
                            <View
                              style={{
                                backgroundColor: isLive ? "#dcfce7" : "#fee2e2",
                                borderRadius: 999,
                                paddingHorizontal: 10,
                                paddingVertical: 3,
                              }}
                            >
                              <Text style={{ color: isLive ? "#15803d" : "#b91c1c", fontSize: 11, fontWeight: "800" }}>
                                {isLive ? "● LIVE" : "● ENDED"}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ color: "#374151", fontSize: 14, lineHeight: 20 }}>{item.message}</Text>

                          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 12 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#ffffff",
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                marginRight: 8,
                                marginBottom: 6,
                                borderWidth: 1,
                                borderColor: "#e5e7eb",
                              }}
                            >
                              <MaterialIcons name="calendar-today" size={15} color={group.color.main} />
                              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: "700", color: "#1f2937" }}>
                                {item.auctionEndDate || "Not specified"}
                              </Text>
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: "#ffffff",
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                marginBottom: 6,
                                borderWidth: 1,
                                borderColor: "#e5e7eb",
                              }}
                            >
                              <MaterialIcons name="access-time" size={15} color={group.color.main} />
                              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: "700", color: "#1f2937" }}>
                                Ends {item.auctionEndTime || "Not specified"}
                              </Text>
                            </View>
                          </View>

                          {/* COUNTDOWN TIMER */}
                          {item.auctionEndDate && item.auctionEndTime && (
                            <CountdownTimer
                              auctionEndDate={item.auctionEndDate}
                              auctionEndTime={item.auctionEndTime}
                            />
                          )}

                          {item.createdAt && (
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                              <MaterialIcons name="schedule" size={14} color="#9ca3af" />
                              <Text style={{ marginLeft: 5, fontSize: 11, color: "#9ca3af" }}>
                                Created: {new Date(item.createdAt).toLocaleString()}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingBottom: 12,
                    }}
                  >
                    <MaterialIcons name="group" size={13} color="#9ca3af" />
                    <Text style={{ marginLeft: 5, fontSize: 11, color: "#9ca3af" }}>Sent to all group members</Text>
                  </View>
                </View>
              );
            }}
            ListFooterComponent={
              <View>
                <View className="pb-4 pt-4 items-center">
                  <Text className="text-gray-400">
                    {notifications.length === 1 ? '1 notification' : `${notifications.length} notifications`}
                  </Text>
                  <Text className="text-gray-400 mt-1">
                    Pull down to refresh
                  </Text>
                </View>
                {/* FOOTER - Visible when you scroll to the bottom */}
                {renderFooter()}
              </View>
            }
          />
        )}

      </View>
    </SafeAreaView>
  );
}