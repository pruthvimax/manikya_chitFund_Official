import { navPad } from "../components/memberDesign";
import MemberLoader from "../components/MemberLoader";
import { useEffect, useRef, useState } from "react";

  import {
    View,
    TextInput,
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
  import { useLiveBadges } from "../components/useLiveBadges";
  import { isPinned, pinSpin, syncPins, unpinSpin } from "../components/spinPin";

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
    SPIN COUNTDOWN (shown after the auction ends, once the admin
    has announced the live spin date & time)
  ========================================================= */
  function SpinCountdown({
    spin,
    onOpen,
    groupKey,
    groupCode,
    route,
  }: {
    spin: any;
    onOpen: () => void;
    groupKey: string;
    groupCode: string;
    route: string;
  }) {
    const [left, setLeft] = useState(() => Number(spin?.spinAt) - Date.now());
    const [pinned, setPinned] = useState(false);
    const [pinMsg, setPinMsg] = useState("");

    useEffect(() => {
      let alive = true;
      isPinned(groupKey).then((v) => alive && setPinned(v));
      return () => {
        alive = false;
      };
    }, [groupKey, spin?.spinAt]);

    const togglePin = async () => {
      setPinMsg("");
      if (pinned) {
        await unpinSpin(groupKey);
        setPinned(false);
        return;
      }
      const r = await pinSpin({
        groupKey,
        spinAt: Number(spin.spinAt),
        spinDateText: spin.spinDateText,
        spinTimeText: spin.spinTimeText,
        groupCode,
        route,
      });
      if (r.ok) setPinned(true);
      else setPinMsg(r.reason || "Could not pin.");
    };

    useEffect(() => {
      const tick = () => setLeft(Number(spin?.spinAt) - Date.now());
      tick();
      const t = setInterval(tick, 1000);
      return () => clearInterval(t);
    }, [spin?.spinAt]);

    if (!spin || !Number.isFinite(Number(spin.spinAt))) return null;

    const started = left <= 0;
    const total = Math.max(0, Math.floor(left / 1000));
    const days = Math.floor(total / 86400);
    const hh = String(Math.floor((total % 86400) / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    const clock = days > 0 ? `${days}d ${hh}h ${mm}m ${ss}s` : `${hh}:${mm}:${ss}`;

    return (
      <View
        style={{
          marginTop: 12,
          borderRadius: 14,
          backgroundColor: started ? "#fff7e0" : "#f3e8fd",
          borderWidth: 1,
          borderColor: started ? "#f3d27a" : "#dcc3f7",
          padding: 12,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              backgroundColor: started ? "#d97706" : "#7e22ce",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 10,
            }}
          >
            <MaterialIcons name="casino" size={18} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: started ? "#92400e" : "#581c87" }}>
              {started ? "Live spin time reached" : "Live spin starts in"}
            </Text>
            <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 1 }}>
              {spin.spinDateText} at {spin.spinTimeText}
            </Text>
          </View>
          {!started && (
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#581c87" }}>{clock}</Text>
          )}
        </View>

        {!started && (
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              onPress={togglePin}
              activeOpacity={0.85}
              style={{
                alignSelf: "flex-start",
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: pinned ? "#7e22ce" : "#ffffff",
                borderWidth: 1,
                borderColor: "#7e22ce",
                borderRadius: 999,
                paddingHorizontal: 12,
                paddingVertical: 6,
              }}
            >
              <MaterialIcons name="push-pin" size={14} color={pinned ? "#ffffff" : "#7e22ce"} />
              <Text style={{ marginLeft: 6, fontSize: 12, fontWeight: "800", color: pinned ? "#ffffff" : "#7e22ce" }}>
                {pinned ? "Pinned to notification bar (tap to remove)" : "Pin to notification bar"}
              </Text>
            </TouchableOpacity>
            {pinMsg ? (
              <Text style={{ marginTop: 6, fontSize: 11, color: "#b91c1c" }}>{pinMsg}</Text>
            ) : null}
          </View>
        )}

        {started && (
          <TouchableOpacity
            onPress={onOpen}
            activeOpacity={0.85}
            style={{
              marginTop: 10,
              backgroundColor: "#d97706",
              borderRadius: 10,
              paddingVertical: 9,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="play-circle-filled" size={18} color="white" />
            <Text style={{ color: "white", fontWeight: "800", fontSize: 13, marginLeft: 6 }}>
              WATCH LIVE SPIN
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  /* =========================================================
    MAIN COMPONENT
  ========================================================= */
  // =========================================================
  // LOOK ONLY: each group code gets its own colour (same code = same colour)
  // =========================================================
  type GroupColor = { main: string; soft: string };
  const GROUP_COLORS: GroupColor[] = [
    { main: "#024e32", soft: "#e6f4ee" },
    { main: "#1d4ed8", soft: "#e8efff" },
    { main: "#b45309", soft: "#fdf1e0" },
    { main: "#7e22ce", soft: "#f3e8fd" },
    { main: "#be123c", soft: "#fde8ee" },
    { main: "#0e7490", soft: "#e0f5f9" },
  ];
  const colorForGroup = (code: string) => {
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
    return GROUP_COLORS[h % GROUP_COLORS.length];
  };
  const isNoticeLive = (n: any) => {
    if (!n?.auctionEndDate || !n?.auctionEndTime) return false;
    try {
      const d = String(n.auctionEndDate).split("-");
      const t = String(n.auctionEndTime).split(":");
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
    const [spinAnnouncements, setSpinAnnouncements] = useState<any[]>([]);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

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
    // live-draw winner, shown until the admin enters the winner details
    const [endedPopupSpin, setEndedPopupSpin] = useState<any>(null);

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

    /* ================= LOAD SPIN TIMES SET BY ADMIN ================= */
    const loadSpinAnnouncements = async () => {
      if (!userid) return;
      try {
        const res = await fetch(
          `${BACKEND_URL}/spinner/announcements?userid=${encodeURIComponent(userid)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          setSpinAnnouncements(data);
          // keeps pinned notification-bar notes correct (time changed / cancelled / over)
          syncPins(data);
        }
      } catch {
        // keep what is already on screen
      }
    };

    useEffect(() => {
      if (userid) loadSpinAnnouncements();
    }, [userid]);

    // admin sets / changes the spin time -> shows up here by itself
    useLiveBadges(Boolean(userid), loadSpinAnnouncements);

    // the spin announcement that belongs to this auction notice
    const findSpinFor = (n: any) => {
      const gid = String(n?.groupId?._id || "");
      const code = String(getGroupCode(n));
      const sameGroup = spinAnnouncements.filter(
        (a) => (gid && String(a.groupMongoId) === gid) || String(a.groupCode) === code
      );
      const exact = sameGroup.filter(
        (a) =>
          String(a.auctionEndDate || "") === String(n?.auctionEndDate || "") &&
          String(a.auctionEndTime || "") === String(n?.auctionEndTime || "")
      );
      const pool = exact.length > 0 ? exact : [];
      return pool.sort((x, y) => Number(y.createdAt ? new Date(y.createdAt).getTime() : 0) - Number(x.createdAt ? new Date(x.createdAt).getTime() : 0))[0] || null;
    };

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
      loadSpinAnnouncements();
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
      setEndedPopupSpin(null);

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

        /*
          LIVE-DRAW WINNER
          Until the admin enters the winner details for this auction,
          show the winner of the live spin (if the spin has finished).
          Once the admin saves the winner, notification.winnerName is
          set and the normal winner box below is used instead.
          Own try/catch so a problem here never clears the bids.
        */
        if (!notification.winnerName && userid) {
          try {
            const spinRes = await fetch(
              `${BACKEND_URL}/spinner/state` +
                `?userid=${encodeURIComponent(String(userid))}` +
                `&groupId=${encodeURIComponent(groupId || groupCode)}` +
                `&auctionEndDate=${encodeURIComponent(auctionDate)}` +
                `&auctionEndTime=${encodeURIComponent(auctionTime)}`
            );
            const spin = await spinRes.json();

            if (
              spin?.success &&
              spin.exists &&
              spin.status === "completed" &&
              String(spin.notificationId) === String(notification._id)
            ) {
              setEndedPopupSpin(spin);
            }
          } catch {
            // no live draw for this auction
          }
        }
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

    // search (filter only): group, message, date, time, winner, LIVE / ENDED
    const searchQuery = searchText.trim().toLowerCase();
    const shownNotifications = searchQuery
      ? notifications.filter((n) => {
          const text = [
            getGroupCode(n),
            n?.message,
            n?.auctionEndDate,
            n?.auctionEndTime,
            n?.winnerName,
            isNoticeLive(n) ? "live" : "ended",
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return text.includes(searchQuery);
        })
      : notifications;

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
              Bid Room Notifications
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

          {/* SEARCH BAR */}
          {searchOpen && !loading && notifications.length > 0 && (
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#ffffff",
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: "#024e32",
                  paddingHorizontal: 14,
                  height: 48,
                }}
              >
                <MaterialIcons name="search" size={22} color="#024e32" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search group, message, date, winner..."
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
                <Text style={{ marginTop: 6, marginLeft: 4, fontSize: 12, color: "#6b7280", fontWeight: "600" }}>
                  {shownNotifications.length} {shownNotifications.length === 1 ? "result" : "results"}
                </Text>
              )}
            </View>
          )}

          {/* CONTENT - WRAPPED WITH FOOTER AT BOTTOM */}
          {loading ? (
            <View className="flex-1 px-5 pt-6 pb-4">
              <MemberLoader text="Loading bid room..." />

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
              data={shownNotifications}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: navPad(0) }}
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

                const accent = colorForGroup(String(getGroupCode(item)));

                return (
                  <View
                    style={{
                      marginHorizontal: 16,
                      marginBottom: 16,
                      borderRadius: 18,
                      backgroundColor: "#ffffff",
                      borderWidth: 1,
                      borderColor: "#e8ecea",
                      overflow: "hidden",
                      elevation: 3,
                      shadowColor: "#000",
                      shadowOpacity: 0.07,
                      shadowRadius: 8,
                      shadowOffset: { width: 0, height: 3 },
                    }}
                  >
                    {/* HEADER: group name + status */}
                    <View
                      style={{
                        backgroundColor: accent.soft,
                        borderBottomWidth: 3,
                        borderBottomColor: isLive ? accent.main : "#c4cac7",
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: accent.main,
                          alignItems: "center",
                          justifyContent: "center",
                          marginRight: 12,
                        }}
                      >
                        <MaterialIcons name="gavel" size={20} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: "#1f2937" }}>Auction Notice</Text>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: accent.main, marginTop: 1 }}>
                          Group: {getGroupCode(item)}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: isLive ? "#dcfce7" : "#fee2e2",
                          borderRadius: 999,
                          paddingHorizontal: 12,
                          paddingVertical: 4,
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "800", color: isLive ? "#15803d" : "#b91c1c" }}>
                          {isLive ? "● LIVE" : "● ENDED"}
                        </Text>
                      </View>
                    </View>

                    <View style={{ padding: 14 }}>
                      <Text style={{ fontSize: 14, color: "#374151", lineHeight: 20 }}>{item.message}</Text>

                      {/* DATE / TIME */}
                      <View style={{ backgroundColor: "#f8faf9", borderRadius: 12, padding: 12, marginTop: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <MaterialIcons name="calendar-today" size={17} color={accent.main} />
                          <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: "600", color: "#4b5563" }}>Auction Date</Text>
                          <Text style={{ marginLeft: "auto", fontSize: 13, fontWeight: "800", color: "#1f2937" }}>
                            {item.auctionEndDate || "Not specified"}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10 }}>
                          <MaterialIcons name="access-time" size={17} color={accent.main} />
                          <Text style={{ marginLeft: 8, fontSize: 13, fontWeight: "600", color: "#4b5563" }}>End Time</Text>
                          <Text style={{ marginLeft: "auto", fontSize: 13, fontWeight: "800", color: "#1f2937" }}>
                            {item.auctionEndTime || "Not specified"}
                          </Text>
                        </View>
                      </View>

                      {/* BIDS */}
                      <View style={{ flexDirection: "row", marginTop: 10 }}>
                        <View style={{ flex: 1, backgroundColor: accent.soft, borderRadius: 12, padding: 10, marginRight: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#6b7280", letterSpacing: 0.8 }}>HIGHEST BID</Text>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: accent.main, marginTop: 2 }}>
                            {highestBid > 0 ? formatAmount(highestBid) : "-"}
                          </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: accent.soft, borderRadius: 12, padding: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: "#6b7280", letterSpacing: 0.8 }}>TOTAL BIDS</Text>
                          <Text style={{ fontSize: 16, fontWeight: "800", color: "#1f2937", marginTop: 2 }}>
                            {notifBidsLoading ? "..." : notifBids.length}
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

                      {/* LIVE SPIN COUNTDOWN - after the auction ends, when admin set the spin time */}
                      {!isLive && findSpinFor(item) ? (
                        <SpinCountdown
                          spin={findSpinFor(item)}
                          groupKey={String(item.groupId?._id || getGroupCode(item))}
                          groupCode={String(getGroupCode(item))}
                          route={`/spinnerLive?groupId=${encodeURIComponent(String(item.groupId?._id || ""))}&groupCode=${encodeURIComponent(String(getGroupCode(item)))}&auctionEndDate=${encodeURIComponent(String(item.auctionEndDate || ""))}&auctionEndTime=${encodeURIComponent(String(item.auctionEndTime || ""))}&userid=${encodeURIComponent(String(userid || ""))}`}
                          onOpen={() =>
                            router.push({
                              pathname: "/spinnerLive",
                              params: {
                                groupId: String(item.groupId?._id || ""),
                                groupCode: String(getGroupCode(item)),
                                auctionEndDate: String(item.auctionEndDate || ""),
                                auctionEndTime: String(item.auctionEndTime || ""),
                                userid: String(userid || ""),
                              },
                            })
                          }
                        />
                      ) : null}

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

                      {item.createdAt && (
                        <Text style={{ marginTop: 8, fontSize: 10, color: "#9ca3af" }}>
                          Created: {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      )}
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

                {/* LIVE DRAW WINNER (until the admin enters the winner details) */}
                {!endedPopupData?.winnerName && endedPopupSpin ? (
                  <View className="bg-[#024e32] rounded-2xl p-4 mb-4 border border-[#d4af37]">
                    <View className="flex-row items-center">
                      <MaterialIcons name="emoji-events" size={20} color="#F6E7A8" />
                      <Text className="text-[#F6E7A8] font-bold text-base ml-2">
                        Live Draw Winner
                      </Text>
                    </View>

                    <View className="items-center py-3">
                      <Text className="text-white font-extrabold" style={{ fontSize: 42 }}>
                        {endedPopupSpin.winner?.groupMemberId || "-"}
                      </Text>
                      {endedPopupSpin.winner?.memberName ? (
                        <Text className="text-[#F6E7A8] font-semibold text-sm mt-1">
                          {endedPopupSpin.winner.memberName}
                        </Text>
                      ) : null}
                    </View>

                    {Number(endedPopupSpin.winner?.bidAmount) > 0 ? (
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-green-100 text-xs">Winning Bid</Text>
                        <Text className="text-white font-bold text-xs">
                          {formatAmount(endedPopupSpin.winner.bidAmount)}
                        </Text>
                      </View>
                    ) : null}

                    {Number(endedPopupSpin.chitValue) > 0 ? (
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-green-100 text-xs">Chit Value</Text>
                        <Text className="text-white font-bold text-xs">
                          {formatAmount(endedPopupSpin.chitValue)}
                        </Text>
                      </View>
                    ) : null}

                    {Number(endedPopupSpin.previousWinningBid) > 0 ? (
                      <View className="flex-row justify-between mt-1">
                        <Text className="text-green-100 text-xs">Previous Winning Bid</Text>
                        <Text className="text-white font-bold text-xs">
                          {formatAmount(endedPopupSpin.previousWinningBid)}
                        </Text>
                      </View>
                    ) : null}

                    <Text className="text-green-100/80 text-[10px] mt-3 text-center">
                      Official winner details will appear here once the admin confirms.
                    </Text>

                    <TouchableOpacity
                      onPress={() => {
                        setEndedPopupVisible(false);
                        router.push({
                          pathname: "/spinnerLive",
                          params: {
                            groupId: String(
                              endedPopupData?.groupId?._id || endedPopupData?.groupId || ""
                            ),
                            groupCode: String(endedPopupData?.groupId?.groupId || ""),
                            auctionEndDate: String(endedPopupData?.auctionEndDate || ""),
                            auctionEndTime: String(endedPopupData?.auctionEndTime || ""),
                            userid: String(userid || ""),
                          },
                        });
                      }}
                      activeOpacity={0.85}
                      className="mt-3 bg-[#F6E7A8] rounded-xl py-2.5 flex-row items-center justify-center"
                    >
                      <MaterialIcons name="casino" size={16} color="#024e32" />
                      <Text className="text-[#024e32] font-bold text-xs ml-1.5">
                        View draw result
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

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