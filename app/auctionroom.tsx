import { useEffect, useRef, useState } from "react";

import {
  View,
  Text,
  FlatList,
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

  /* ================= UI ================= */
  return (
    <SafeAreaView className="flex-1 bg-white">
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
                  </Text>
                </View>
                <View className="bg-[#024e32] px-4 py-2 rounded-full">
                  <Text className="text-white font-medium">{notifications.length}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* CONTENT - WRAPPED WITH FOOTER AT BOTTOM */}
        {loading ? (
          <View className="flex-1 px-5 pt-6 pb-4">
            <NotificationCardSkeleton />
            <NotificationCardSkeleton />
            <NotificationCardSkeleton />

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
            data={notifications}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#024e32"]}
              />
            }
            renderItem={({ item }) => {
              const isAuctionLive = () => {
                if (!item.auctionEndDate || !item.auctionEndTime) {
                  return false;
                }

                try {
                  const dateParts = item.auctionEndDate.split("-");
                  const timeParts = item.auctionEndTime.split(":");

                  if (dateParts.length !== 3 || timeParts.length !== 2) {
                    return false;
                  }

                  const day = parseInt(dateParts[0], 10);
                  const month = parseInt(dateParts[1], 10) - 1;
                  const year = parseInt(dateParts[2], 10);

                  const hours = parseInt(timeParts[0], 10);
                  const minutes = parseInt(timeParts[1], 10);

                  const targetDate = new Date(
                    year,
                    month,
                    day,
                    hours,
                    minutes,
                    0,
                    0
                  );

                  return targetDate.getTime() > Date.now();
                } catch (error) {
                  console.log("Auction date parsing error:", error);
                  return false;
                }
              };

              const isLive = isAuctionLive();

              return (
                <View
                  className="bg-white mb-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* NOTIFICATION HEADER */}
                  <View className="bg-gray-50 px-5 py-3 flex-row items-center justify-between border-b border-gray-100">
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-[#024e32] items-center justify-center mr-3">
                        <MaterialIcons name="gavel" size={20} color="white" />
                      </View>
                      <View>
                        <Text className="font-bold text-gray-800 text-lg">
                          Auction Notice
                        </Text>
                        <Text className="text-sm text-gray-500">
                          Group: {item.groupId?.groupId || "N/A"}
                        </Text>
                      </View>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${isLive ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Text className={`text-xs font-medium ${isLive ? 'text-green-700' : 'text-red-700'}`}>
                        {isLive ? '● LIVE' : '● ENDED'}
                      </Text>
                    </View>
                  </View>

                  {/* NOTIFICATION BODY */}
                  <View className="p-5">
                    <View className="mb-4">
                      <Text className="text-gray-700 mb-3">{item.message}</Text>
                    </View>

                    {/* AUCTION DETAILS WITH END TIME */}
                    <View className="bg-gray-50 rounded-xl p-4">
                      <View className="flex-row items-center mb-3">
                        <MaterialIcons name="calendar-today" size={20} color="#024e32" />
                        <Text className="ml-3 text-gray-700 font-medium">
                          Auction Date
                        </Text>
                        <Text className="ml-auto text-gray-800 font-semibold">
                          {item.auctionEndDate || "Not specified"}
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <MaterialIcons name="access-time" size={20} color="#024e32" />
                        <Text className="ml-3 text-gray-700 font-medium">
                          End Time
                        </Text>
                        <Text className="ml-auto text-gray-800 font-semibold">
                          {item.auctionEndTime || "Not specified"}
                        </Text>
                      </View>

                      {/* CREATED AT - Auto timestamp */}
                      {item.createdAt && (
                        <View className="flex-row items-center mt-3 pt-3 border-t border-gray-200">
                          <MaterialIcons name="schedule" size={18} color="#6b7280" />
                          <Text className="ml-3 text-gray-500 text-xs">
                            Created: {new Date(item.createdAt).toLocaleString()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* COUNTDOWN TIMER */}
                    {item.auctionEndDate && item.auctionEndTime && (
                      <CountdownTimer 
                        auctionEndDate={item.auctionEndDate} 
                        auctionEndTime={item.auctionEndTime} 
                      />
                    )}

                    {/* BID BUTTON - Only show if auction is live */}
                  
                  </View>

                  {/* NOTIFICATION FOOTER */}
                  <View className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                    <Text className="text-gray-500 text-xs">
                      Sent to all group members
                    </Text>
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