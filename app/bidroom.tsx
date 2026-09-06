import { useEffect, useRef, useState } from "react";

  import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    RefreshControl,
    ScrollView,
    Animated,
    Platform,
    Alert,
    Modal,
    ActivityIndicator,
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

  /* =========================================================
    GROUP CODE HELPER
    Single source of truth for the readable group code.
    item.groupId is a populated group document, so .groupId
    holds the readable code. winnerGroupId is a separate raw
    field and does NOT always match, so it is no longer shown.
  ========================================================= */
  const getGroupCode = (n: any) =>
    n?.groupId?.groupId ||
    (typeof n?.groupId === "string" ? n.groupId : "") ||
    "N/A";

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

    /* =========================================================
      PENDING INSTALLMENT CHECK
      Member cannot bid if he has pending installments for
      PAST months or the CURRENT month (future months ignored).
    ========================================================= */

    const [installmentBlocked, setInstallmentBlocked] = useState(false);
    const [blockedReason, setBlockedReason] = useState("");

    // =========================================================
    // BIDS PER NOTIFICATION STATE
    // =========================================================

    const [bidsMap, setBidsMap] = useState<Record<string, any[]>>({});
    const [bidsLoading, setBidsLoading] = useState<Record<string, boolean>>({});

    // =========================================================
    // ENDED AUCTION POPUP STATE
    // =========================================================

    const [endedPopupVisible, setEndedPopupVisible] = useState(false);
    const [endedPopupData, setEndedPopupData] = useState<any>(null);
    const [endedPopupBids, setEndedPopupBids] = useState<any[]>([]);
    const [endedPopupLoading, setEndedPopupLoading] = useState(false);

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

    /* ================= CHECK PENDING INSTALLMENTS ================= */
    useEffect(() => {
      const checkOutstanding = async () => {
        if (!userid) return;

        try {
          const res = await fetch(
            `${BACKEND_URL}/member/my-outstanding/${encodeURIComponent(userid)}`
          );

          if (!res.ok) {
            setInstallmentBlocked(false);
            return;
          }

          const data = await res.json();

          const overdue = Number(data?.overdueAmount || 0);
          const dueThisMonth = Number(data?.dueThisMonth || 0);

          /*
            Only PAST months (overdue) and the PRESENT month
            (dueThisMonth) block bidding.
            Upcoming/future months are NOT considered.
          */
          if (overdue > 0 || dueThisMonth > 0) {
            setBlockedReason(
              `You have pending installment payment(s)${
                overdue > 0
                  ? ` of ₹${Number(overdue).toLocaleString("en-IN")} from previous month(s)`
                  : ""
              }${
                dueThisMonth > 0
                  ? `${overdue > 0 ? " and" : " of"} ₹${Number(dueThisMonth).toLocaleString("en-IN")} for this month`
                  : ""
              }. Please clear your pending installment(s) to participate in bidding.`
            );
            setInstallmentBlocked(true);
          } else {
            setInstallmentBlocked(false);
            setBlockedReason("");
          }
        } catch (error) {
          console.log("Outstanding check error:", error);
          // Fail open – don't block bidding on network errors
          setInstallmentBlocked(false);
        }
      };

      checkOutstanding();
    }, [userid]);

    const handleRefresh = () => {
      setRefreshing(true);
      loadNotifications();
    };

    /* ================= LOAD BIDS FOR NOTIFICATION ================= */
    const loadBidsForNotification = async (notification: any) => {
      const groupId = notification.groupId?._id || notification.groupId || "";
      const groupCode = notification.groupId?.groupId || "";

      if (!groupId && !groupCode) return;

      const notifId = notification._id;

      setBidsLoading((prev) => ({ ...prev, [notifId]: true }));

      try {
        /*
          AUCTION IDENTITY:
          groupId + auctionDate + auctionTime

          The auction date/time of THIS notification must be sent,
          otherwise the backend cannot tell two auctions of the
          same group apart and the bids get mixed.
        */
        const auctionDate = String(
          notification.auctionEndDate || ""
        ).trim();

        const auctionTime = String(
          notification.auctionEndTime || ""
        ).trim();

        const url =
          `${BACKEND_URL}/bids/live` +
          `?groupId=${encodeURIComponent(groupId || groupCode)}` +
          `&auctionDate=${encodeURIComponent(auctionDate)}` +
          `&auctionTime=${encodeURIComponent(auctionTime)}`;

        const res = await fetch(url);
        const data = await res.json();

        const receivedBids = Array.isArray(data)
          ? data
          : Array.isArray(data?.bids)
          ? data.bids
          : [];

        // Sort highest first
        receivedBids.sort(
          (a: any, b: any) =>
            Number(b.bidAmount || 0) -
            Number(a.bidAmount || 0)
        );

        setBidsMap((prev) => ({
          ...prev,
          [notifId]: receivedBids,
        }));
      } catch (err) {
        console.log("Bids load error:", err);
        setBidsMap((prev) => ({ ...prev, [notifId]: [] }));
      } finally {
        setBidsLoading((prev) => ({ ...prev, [notifId]: false }));
      }
    };

    /* ================= LOAD BIDS FOR ALL NOTIFICATIONS ================= */
    const loadAllBids = async () => {
      for (const notification of notifications) {
        await loadBidsForNotification(notification);
      }
    };

    useEffect(() => {
      if (notifications.length > 0) {
        loadAllBids();
      }
    }, [notifications.length]);

    /* ================= SHOW ENDED AUCTION POPUP ================= */
    const showEndedAuctionPopup = async (notification: any) => {
      setEndedPopupData(notification);
      setEndedPopupVisible(true);
      setEndedPopupLoading(true);

      /*
        IMPORTANT:
        Clear the previously opened auction's bids first.
        Without this the popup keeps showing the bids of the
        auction that was opened before, which looked like the
        wrong history was being stored.
      */
      setEndedPopupBids([]);

      const groupId = notification.groupId?._id || notification.groupId || "";
      const groupCode = notification.groupId?.groupId || "";

      try {
        /*
          AUCTION IDENTITY:
          groupId + auctionDate + auctionTime

          The auction date/time of THIS notification must be sent,
          otherwise the backend cannot tell two auctions of the
          same group apart and the bids get mixed.
        */
        const auctionDate = String(
          notification.auctionEndDate || ""
        ).trim();

        const auctionTime = String(
          notification.auctionEndTime || ""
        ).trim();

        const url =
          `${BACKEND_URL}/bids/live` +
          `?groupId=${encodeURIComponent(groupId || groupCode)}` +
          `&auctionDate=${encodeURIComponent(auctionDate)}` +
          `&auctionTime=${encodeURIComponent(auctionTime)}`;

        const res = await fetch(url);
        const data = await res.json();

        const receivedBids = Array.isArray(data)
          ? data
          : Array.isArray(data?.bids)
          ? data.bids
          : [];

        // Sort highest first
        receivedBids.sort(
          (a: any, b: any) =>
            Number(b.bidAmount || 0) -
            Number(a.bidAmount || 0)
        );

        setEndedPopupBids(receivedBids);
      } catch (err) {
        console.log("Ended popup bids error:", err);
        setEndedPopupBids([]);
      } finally {
        setEndedPopupLoading(false);
      }
    };

    /* ================= FORMAT AMOUNT ================= */
    const formatAmount = (amount: number) => {
      return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
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
            Member Bidroom 
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
              Bid Room Notifications
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
                      All Bid Notifications
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

                const notifBids = bidsMap[item._id] || [];
                const notifBidsLoading = bidsLoading[item._id] || false;
                const highestBid = notifBids.length > 0
                  ? Math.max(...notifBids.map((b: any) => Number(b.bidAmount || 0)))
                  : 0;

                return (
                  <View
                    className="bg-white mb-3 rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* NOTIFICATION HEADER */}
                    <View className="bg-gray-50 px-4 py-2.5 flex-row items-center justify-between border-b border-gray-100">
                      <View className="flex-row items-center">
                        <View className="w-8 h-8 rounded-full bg-[#024e32] items-center justify-center mr-2.5">
                          <MaterialIcons name="gavel" size={17} color="white" />
                        </View>
                        <View>
                          <Text className="font-bold text-gray-800 text-sm">
                            Auction Notice
                          </Text>
                          <Text className="text-xs text-gray-500">
                            Group: {getGroupCode(item)}
                          </Text>
                        </View>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${isLive ? 'bg-green-100' : 'bg-red-100'}`}>
                        <Text className={`text-xs font-medium ${isLive ? 'text-green-700' : 'text-red-700'}`}>
                          {isLive ? '● LIVE' : '● ENDED'}
                        </Text>
                      </View>
                    </View>

                    {/* =================================================
                        SUMMARY SECTION (Top of each group card)
                    ================================================= */}
                    <View className="px-4 pt-3">
                      <View className="bg-[#024e32]/5 rounded-lg p-3 border border-[#024e32]/10">
                        <View className="flex-row items-center mb-2">
                          <MaterialIcons name="info-outline" size={15} color="#024e32" />
                          <Text className="text-[#024e32] font-bold text-xs ml-1.5">
                            Auction Summary
                          </Text>
                        </View>

                        <View className="flex-row flex-wrap">
                          {/* NOTIFICATION NAME */}
                          <View className="flex-1 min-w-[45%] mb-2">
                            <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                              Notification
                            </Text>
                            <Text className="text-gray-800 font-semibold mt-0.5 text-xs" numberOfLines={1}>
                              {item.message || "Auction Notice"}
                            </Text>
                          </View>

                          {/* GROUP ID */}
                          <View className="flex-1 min-w-[45%] mb-2">
                            <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                              Group ID
                            </Text>
                            <Text className="text-gray-800 font-semibold mt-0.5 text-xs">
                              {getGroupCode(item)}
                            </Text>
                          </View>

                          {/* HIGHEST BID */}
                          <View className="flex-1 min-w-[45%] mb-2">
                            <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                              Highest Bid
                            </Text>
                            <Text className="text-[#024e32] font-bold mt-0.5 text-xs">
                              {highestBid > 0 ? formatAmount(highestBid) : "-"}
                            </Text>
                          </View>

                          {/* TOTAL BIDS */}
                          <View className="flex-1 min-w-[45%] mb-2">
                            <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                              Total Bids
                            </Text>
                            <Text className="text-gray-800 font-bold mt-0.5 text-xs">
                              {notifBidsLoading ? "..." : notifBids.length}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* NOTIFICATION BODY */}
                    <View className="p-4">
                      <View className="mb-3">
                        <Text className="text-gray-700 text-xs mb-2">{item.message}</Text>
                      </View>

                      {/* AUCTION DETAILS WITH END TIME */}
                      <View className="bg-gray-50 rounded-lg p-3">
                        <View className="flex-row items-center mb-2">
                          <MaterialIcons name="calendar-today" size={16} color="#024e32" />
                          <Text className="ml-2 text-gray-700 font-medium text-xs">
                            Auction Date
                          </Text>
                          <Text className="ml-auto text-gray-800 font-semibold text-xs">
                            {item.auctionEndDate || "Not specified"}
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <MaterialIcons name="access-time" size={16} color="#024e32" />
                          <Text className="ml-2 text-gray-700 font-medium text-xs">
                            End Time
                          </Text>
                          <Text className="ml-auto text-gray-800 font-semibold text-xs">
                            {item.auctionEndTime || "Not specified"}
                          </Text>
                        </View>

                        {/* CREATED AT - Auto timestamp */}
                        {item.createdAt && (
                          <View className="flex-row items-center mt-3 pt-3 border-t border-gray-200">
                            <MaterialIcons name="schedule" size={14} color="#6b7280" />
                            <Text className="ml-2 text-gray-500 text-[10px]">
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
                      {isLive ? (
                        installmentBlocked ? (
                          <View>
                            {/* DISABLED BID BUTTON - pending installments */}
                            <View className="mt-3 bg-gray-200 rounded-lg py-2.5 flex-row items-center justify-center border border-gray-300">
                              <MaterialIcons
                                name="money-off"
                                size={17}
                                color="#6b7280"
                              />
                              <Text className="text-gray-500 font-bold text-sm ml-2">
                                INSTALLMENT PENDING - BIDDING DISABLED
                              </Text>
                            </View>

                            {blockedReason ? (
                              <View className="mt-2 bg-red-50 rounded-lg p-3 border border-red-200">
                                <Text className="text-red-600 text-[11px]">
                                  ⛔ {blockedReason}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ) : (
                        <TouchableOpacity
                          onPress={() => {
                            router.push({
                              pathname: "/bidnow",
                              params: {
                                groupId: item.groupId?._id || "",
                                groupCode: item.groupId?.groupId || "",
                                auctionEndDate: item.auctionEndDate || "",
                                auctionEndTime: item.auctionEndTime || "",
                                userid: userid || "",
                              },
                            });
                          }}
                          activeOpacity={0.85}
                          className="mt-3 bg-[#024e32] rounded-lg py-2.5 flex-row items-center justify-center"
                        >
                          <MaterialIcons
                            name="gavel"
                            size={17}
                            color="white"
                          />
                          <Text className="text-white font-bold text-sm ml-2">
                            BID NOW
                          </Text>
                          <MaterialIcons
                            name="arrow-forward"
                            size={17}
                            color="white"
                            style={{ marginLeft: 8 }}
                          />
                        </TouchableOpacity>
                        )
                      ) : (
                        /* SINGLE BUTTON - Auction results & all bids */
                        <TouchableOpacity
                          onPress={() => showEndedAuctionPopup(item)}
                          activeOpacity={0.85}
                          className="mt-3 bg-[#024e32]/10 rounded-lg py-2.5 flex-row items-center justify-center border border-[#024e32]/20"
                        >
                          <MaterialIcons
                            name="format-list-bulleted"
                            size={17}
                            color="#024e32"
                          />
                          <Text className="text-[#024e32] font-bold text-sm ml-2">
                            VIEW RESULTS & ALL BIDS
                            {notifBids.length > 0 ? ` (${notifBids.length})` : ""}
                          </Text>
                          <MaterialIcons
                            name="chevron-right"
                            size={17}
                            color="#024e32"
                            style={{ marginLeft: 4 }}
                          />
                        </TouchableOpacity>
                      )}

                      {/* WINNER DETAILS (Admin entered) */}
                        {!isLive && item.winnerName && (
                          <View className="mt-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
                            <View className="flex-row items-center mb-1.5">
                              <MaterialIcons name="emoji-events" size={16} color="#d97706" />
                              <Text className="text-amber-800 font-bold text-sm ml-1.5">
                                🏆 Winner
                              </Text>
                            </View>

                            <View className="flex-row mt-1">
                              <Text className="text-gray-700 flex-1 text-xs">
                                <Text className="font-medium">Name:</Text> {item.winnerName}
                              </Text>
                            </View>

                            {item.winnerId && (
  <View className="flex-row mt-0.5">
    <Text className="text-gray-700 flex-1 text-xs">
      <Text className="font-medium">Group Member ID:</Text>{" "}
      {notifBids.find(
        (bid: any) =>
          String(bid.memberId) === String(item.winnerId)
      )?.groupMemberId || item.winnerGroupMemberId || "-"}
    </Text>
  </View>
)}

                            {/*
                              GROUP ID
                              Read from the auction itself (same source as the
                              card header and Auction Summary), so this can
                              never mismatch. item.winnerGroupId is no longer
                              used here because it holds a different value.
                            */}
                            <View className="flex-row mt-0.5">
                              <Text className="text-gray-700 flex-1 text-xs">
                                <Text className="font-medium">Group ID:</Text> {getGroupCode(item)}
                              </Text>
                            </View>

                            {item.winnerBidAmount > 0 && (
                              <View className="flex-row mt-0.5">
                                <Text className="text-gray-700 flex-1 text-xs">
                                  <Text className="font-medium">Bid Amount:</Text> {formatAmount(item.winnerBidAmount)}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {/* NOTIFICATION FOOTER */}
                      <View className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                        <Text className="text-gray-500 text-[10px]">
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

        {/* =================================================
            ENDED AUCTION POPUP MODAL
        ================================================= */}
        <Modal
          visible={endedPopupVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEndedPopupVisible(false)}
        >
          <View className="flex-1 justify-center items-center bg-black/60 px-4">
            <View className="bg-white rounded-3xl w-full max-w-md max-h-[85%] overflow-hidden shadow-2xl">

              {/* HEADER (fixed) */}
              <View className="flex-row items-center px-5 pt-5 pb-4 border-b border-gray-100 bg-white">
                <View className="w-11 h-11 rounded-full bg-[#024e32]/10 items-center justify-center mr-3">
                  <MaterialIcons name="format-list-bulleted" size={22} color="#024e32" />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-800">
                    Auction Results
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    Group: {getGroupCode(endedPopupData)} •{" "}
                    {endedPopupData?.auctionEndDate || "-"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEndedPopupVisible(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
                >
                  <MaterialIcons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* SCROLLABLE BODY */}
              <ScrollView showsVerticalScrollIndicator={true} className="px-5 py-4">

                {/* MESSAGE */}
                {endedPopupData?.message && (
                  <View className="bg-gray-50 rounded-xl p-3 mb-4">
                    <Text className="text-gray-700 text-xs leading-5">
                      {endedPopupData.message}
                    </Text>
                  </View>
                )}

                {/* WINNER DETAILS */}
                {endedPopupData?.winnerName && (
                  <View className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-200">
                    <View className="flex-row items-center mb-2">
                      <MaterialIcons name="emoji-events" size={20} color="#d97706" />
                      <Text className="text-amber-800 font-bold text-base ml-2">
                        🏆 Winner
                      </Text>
                    </View>

                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-500 text-xs">Name</Text>
                      <Text className="text-gray-800 font-semibold text-xs">
                        {endedPopupData.winnerName}
                      </Text>
                    </View>

{endedPopupData.winnerId ? (
  <View className="flex-row justify-between mt-1">
    <Text className="text-gray-500 text-xs">
      Group Member ID
    </Text>

    <Text className="text-gray-800 font-semibold text-xs">
      {endedPopupBids.find(
        (bid: any) =>
          String(bid.memberId) ===
          String(endedPopupData.winnerId)
      )?.groupMemberId || endedPopupData.winnerGroupMemberId || "-"}
    </Text>
  </View>
) : null}

                    {/*
                      GROUP ID
                      Same source as the modal header, so the winner's
                      group always matches the auction's group.
                    */}
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-500 text-xs">Group ID</Text>
                      <Text className="text-gray-800 font-semibold text-xs">
                        {getGroupCode(endedPopupData)}
                      </Text>
                    </View>

                    {endedPopupData.winnerBidAmount > 0 ? (
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-gray-500 text-xs">Bid Amount</Text>
                        <Text className="text-amber-700 font-bold text-xs">
                          {formatAmount(endedPopupData.winnerBidAmount)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* WHICH AUCTION THIS HISTORY BELONGS TO */}
                <View className="bg-[#EAF5EF] rounded-xl px-3 py-2.5 mb-3 border border-[#024e32]/15">
                  <Text className="text-[#024e32] text-[9px] font-bold tracking-wider uppercase">
                    Bid history of this auction
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <MaterialIcons name="event" size={13} color="#024e32" />
                    <Text className="text-gray-700 text-xs font-semibold ml-1.5">
                      {endedPopupData?.groupId?.groupId
                        ? `Group ${endedPopupData.groupId.groupId}  •  `
                        : ""}
                      {endedPopupData?.auctionEndDate || "-"}
                      {endedPopupData?.auctionEndTime
                        ? `  •  ${endedPopupData.auctionEndTime}`
                        : ""}
                    </Text>
                  </View>
                </View>

                {/* ALL BIDS TITLE */}
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-800 font-bold text-base">
                    All Bids
                  </Text>
                  <View className="bg-[#024e32]/10 px-2.5 py-0.5 rounded-full">
                    <Text className="text-[#024e32] text-xs font-bold">
                      {endedPopupBids.length}
                    </Text>
                  </View>
                </View>

                {endedPopupLoading ? (
                  <View className="items-center py-10">
                    <ActivityIndicator size="large" color="#024e32" />
                    <Text className="text-gray-500 mt-3 font-medium">
                      Loading bids...
                    </Text>
                  </View>
                ) : endedPopupBids.length === 0 ? (
                  <View className="items-center py-10 bg-gray-50 rounded-2xl px-5">
                    <MaterialIcons name="gavel" size={36} color="#9ca3af" />
                    <Text className="text-gray-500 mt-3 font-medium">
                      No bids were placed
                    </Text>
                    <Text className="text-gray-400 text-[11px] mt-1.5 text-center">
                      Nobody bid in the auction of{" "}
                      {endedPopupData?.auctionEndDate || "-"}
                      {endedPopupData?.auctionEndTime
                        ? ` at ${endedPopupData.auctionEndTime}`
                        : ""}
                      . Bids placed in the group's other auctions are shown in
                      those auctions.
                    </Text>
                  </View>
                ) : (
                  /* Chronological ticket numbers, highest bid highlighted */
                  (() => {
                    const chronological = [...endedPopupBids].sort(
                      (a: any, b: any) =>
                        new Date(a.bidTime).getTime() -
                        new Date(b.bidTime).getTime()
                    );

                    const highestAmount = Math.max(
                      ...chronological.map((b: any) => Number(b.bidAmount || 0))
                    );

                  return chronological.map((bid: any, index: number) => {
                      const groupMemberId = bid.groupMemberId || "-";
                      const amount = Number(bid.bidAmount || 0);
                      const isHighestBid = amount === highestAmount;
                      const isUserBid = String(bid.memberId) === String(userid);

                      return (
                        <View
                          key={bid._id || index}
                          className={`rounded-2xl p-3.5 mb-2.5 border ${
                            isHighestBid
                              ? "bg-yellow-50 border-yellow-300"
                              : isUserBid
                              ? "bg-blue-50 border-blue-200"
                              : "bg-gray-50 border-gray-100"
                          }`}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                              <View
                                className={`w-9 h-9 rounded-full items-center justify-center mr-2.5 ${
                                  isHighestBid
                                    ? "bg-yellow-100"
                                    : isUserBid
                                    ? "bg-blue-100"
                                    : "bg-[#024e32]/10"
                                }`}
                              >
                                <Text
                                  className={`text-xs font-bold ${
                                    isHighestBid
                                      ? "text-yellow-700"
                                      : isUserBid
                                      ? "text-blue-700"
                                      : "text-[#024e32]"
                                  }`}
                                >
                                 {groupMemberId}
                                </Text>
                              </View>
                              <View className="flex-1">
                                <Text className="text-gray-800 font-semibold text-sm">
                                  {isUserBid ? "Your Bid" : `Bidder ${groupMemberId}`}
                                  {isUserBid && (
                                    <Text className="text-blue-600 text-xs"> (You)</Text>
                                  )}
                                </Text>
                                <Text className="text-gray-400 text-[10px]">
                                  Ticket #{groupMemberId}
                                  {bid.bidTime
                                    ? ` • ${new Date(bid.bidTime).toLocaleTimeString("en-IN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}`
                                    : ""}
                                </Text>
                              </View>
                            </View>
                            <View className="items-end">
                              <Text
                                className={`font-bold text-base ${
                                  isHighestBid
                                    ? "text-yellow-700"
                                    : isUserBid
                                    ? "text-blue-700"
                                    : "text-[#024e32]"
                                }`}
                              >
                                {formatAmount(amount)}
                              </Text>
                              {isHighestBid && (
                                <Text className="text-yellow-600 text-[9px] font-bold">
                                  🏆 HIGHEST
                                </Text>
                              )}
                            </View>
                          </View>
                        </View>
                      );
                    });
                  })()
                )}
              </ScrollView>

              {/* CLOSE BUTTON (fixed) */}
              <View className="px-5 py-4 border-t border-gray-100 bg-white">
                <TouchableOpacity
                  onPress={() => setEndedPopupVisible(false)}
                  className="bg-[#024e32] rounded-xl py-3.5"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-center font-bold text-base">
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }