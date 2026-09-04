import { useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  ScrollView,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
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

/* =========================================================================
  ✅ Skeleton loader
  ========================================================================= */
const SkeletonBox = ({
  width,
  height = 14,
  radius = 6,
  style = {},
}: {
  width: number | string;
  height?: number;
  radius?: number;
  style?: any;
}) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: "#e3e8e6",
          opacity,
        },
        style,
      ]}
    />
  );
};

const SkeletonChitCard = () => (
  <View className="bg-white mb-4 rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
    {/* Card Header */}
    <View className="bg-[#024e32]/5 px-5 py-3 border-b border-gray-100">
      <View className="flex-row justify-between items-center">
        <View>
          <SkeletonBox width={140} height={18} style={{ marginBottom: 8 }} />
          <SkeletonBox width={100} height={12} />
        </View>
        <SkeletonBox width={90} height={22} radius={999} />
      </View>
    </View>

    {/* Card Body */}
    <View className="p-5">
      <View className="mb-4">
        <SkeletonBox width={120} height={12} style={{ marginBottom: 8 }} />
        <SkeletonBox width={90} height={22} />
      </View>

      <View className="mb-6">
        <View className="flex-row justify-between mb-2">
          <SkeletonBox width={70} height={12} />
          <SkeletonBox width={100} height={12} />
        </View>
        <SkeletonBox width={"100%" as any} height={8} radius={999} />
      </View>

      <View className="flex-row gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} className="flex-1 bg-gray-50 p-3 rounded-xl">
            <SkeletonBox width={40} height={10} style={{ marginBottom: 8 }} />
            <SkeletonBox width={30} height={18} style={{ marginBottom: 6 }} />
            <SkeletonBox width={45} height={10} />
          </View>
        ))}
      </View>
    </View>
  </View>
);

const SkeletonMyChitsScreen = () => (
  <SafeAreaView className="flex-1 bg-white">
    <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
      <View className="flex-row items-center">
        <TouchableOpacity className="mt-1" disabled>
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-2xl font-bold ml-4 mt-1">My Chits</Text>
      </View>
    </View>

    <ScrollView className="flex-1 bg-[#f7f9f8]" showsVerticalScrollIndicator={false}>
      <View className="p-5">
        {/* Summary card skeleton */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View>
              <SkeletonBox width={140} height={14} style={{ marginBottom: 8 }} />
              <SkeletonBox width={110} height={12} />
            </View>
            <SkeletonBox width={70} height={28} radius={999} />
          </View>
        </View>

        {/* Chit card skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonChitCard key={i} />
        ))}
      </View>
    </ScrollView>
  </SafeAreaView>
);

export default function MyChits() {
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

  /* ================= SESSION GUARD ================= */
  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("loggedUser");
      if (!stored) {
        router.replace("/");
      }
    };

    checkSession();
  }, []);

  const [loading, setLoading] = useState(true);
  const [chits, setChits] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadMyChits();
  }, []);

  /* ================= GET USER PAID AMOUNT (EXCLUDING DIVIDEND) ================= */
  const getUserPaidAmount = (payments: any[]) => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments
      .filter((p: any) => p.paymentType !== "DIVIDEND")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  /* =================
    FETCH REAL LEDGER FOR A SINGLE CHIT
    ================= */
  const fetchLedgerForChit = async (userid: string, groupId: string, groupMemberId: string) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/account-copy/${userid}/${groupId}?groupMemberId=${groupMemberId}`
      );
      const data = await res.json();
      return Array.isArray(data.ledger) ? data.ledger : [];
    } catch (err) {
      console.log("❌ Ledger fetch error for group", groupId, err);
      return [];
    }
  };

  const loadMyChits = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("loggedUser");

      if (!storedUser) {
        console.log("❌ No logged user found");
        setLoading(false);
        return;
      }

      const { userid } = JSON.parse(storedUser);
      console.log("📌 Logged User ID:", userid);

      const url = `${BACKEND_URL}/groups/my-chits/${userid}`;
      console.log("🌐 Fetching:", url);

      const response = await fetch(url);
      const text = await response.text();
      console.log("📦 Raw response:", text);

      const data = JSON.parse(text);

      let chitsData = [];
      if (Array.isArray(data)) {
        chitsData = data;
      } else if (Array.isArray(data.chits)) {
        chitsData = data.chits;
      } else {
        chitsData = [];
      }

      const processedChits = await Promise.all(
        chitsData.map(async (chit: any) => {
          const groupId = chit.groupId;
          const groupMemberId = chit.groupMemberId || "";

          const ledger = await fetchLedgerForChit(userid, groupId, groupMemberId);

          const totalMonths = ledger.length > 0 ? ledger.length : (chit.totalMonths || 0);

          const paidMonths = ledger.filter((row: any) => row.status === "PAID").length;
          const pendingMonths = ledger.filter((row: any) => row.status !== "PAID").length;

          const totalUserPaid = ledger.reduce(
            (sum: number, row: any) => sum + getUserPaidAmount(row.payments || []),
            0
          );

          const installmentAmount =
            ledger.length > 0
              ? ledger[0]?.installmentAmount || chit.installmentAmount || 0
              : chit.installmentAmount || 0;

          return {
            ...chit,
            totalMonths,
            paidMonths,
            pendingMonths,
            installmentAmount,
            totalUserPaid,
            ledger,
            groupMemberId,
          };
        })
      );

      setChits(processedChits);

    } catch (error) {
      console.log("❌ My Chits Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMyChits();
  };

  const goToContactPage = () => {
    router.push("/contact");
  };

  if (loading) {
    return <SkeletonMyChitsScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER - SAME EMPLOYEE PAGE HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mt-1">
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            My Chits
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 bg-[#f7f9f8]"
        contentContainerStyle={{ paddingTop: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
      >
        <View className="p-5">
          {/* CHIT COUNT CARD */}
          {chits.length > 0 && (
            <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200 shadow-sm">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-gray-700 font-medium">Your Chit Summary</Text>
                  <Text className="text-gray-500 text-sm">Total enrolled chits</Text>
                </View>
                <View className="bg-[#024e32] px-4 py-2 rounded-full">
                  <Text className="text-white font-semibold">
                    {chits.length} {chits.length === 1 ? 'Chit' : 'Chits'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {chits.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-200">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <MaterialIcons name="account-balance-wallet" size={40} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 text-lg font-medium text-center">
                You are not enrolled in any chits
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2">
                Contact your group admin to join a chit
              </Text>
            </View>
          ) : (
            Array.isArray(chits) && chits.map((chit, index) => {
              const isCompleted = chit.pendingMonths === 0 && chit.totalMonths > 0;
              const progressPercentage = chit.totalMonths > 0
                ? (chit.paidMonths / chit.totalMonths) * 100
                : 0;

              return (
                <View
                  key={index}
                  className="bg-white mb-4 rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  {/* Card Header - UPDATED WITH GROUP MEMBER ID */}
                  <View className="bg-[#024e32]/5 px-5 py-3 border-b border-gray-100">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-[#024e32] text-lg font-bold">
                          Group: {chit.groupId}
                        </Text>
                        <Text className="text-gray-600 text-sm mt-1">
                          Chit: {chit.chitId || chit.groupId}
                        </Text>
                        {/* ✅ DISPLAY GROUP MEMBER ID HERE */}
                        <View className="flex-row items-center mt-1">
                          <MaterialIcons name="badge" size={14} color="#6b7280" />
                          <Text className="text-gray-500 text-xs ml-1">
                            Member ID: {chit.groupMemberId || 'N/A'}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View className={`px-3 py-1 rounded-full ml-2 ${
                        isCompleted ? "bg-green-100" : "bg-blue-100"
                      }`}>
                        <Text className={`font-semibold text-sm ${
                          isCompleted ? "text-green-700" : "text-blue-700"
                        }`}>
                          {isCompleted ? "COMPLETED" : "IN PROGRESS"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Card Body */}
                  <View className="p-5">
                    {/* Amount Display */}
                    <View className="mb-4">
                      <Text className="text-gray-500 text-sm">Monthly Installment</Text>
                      <Text className="text-2xl font-bold text-[#024e32] mt-1">
                        ₹{chit.installmentAmount || 0}
                      </Text>
                    </View>

                    {/* Progress Bar */}
                    <View className="mb-6">
                      <View className="flex-row justify-between mb-2">
                        <Text className="text-gray-700 font-medium">Progress</Text>
                        <Text className="text-gray-700 font-medium">
                          {chit.paidMonths}/{chit.totalMonths} months paid
                        </Text>
                      </View>
                      <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-[#024e32] rounded-full"
                          style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                        />
                      </View>
                    </View>

                    {/* Stats Grid */}
                    <View className="flex-row gap-4">
                      <View className="flex-1 bg-gray-50 p-3 rounded-xl">
                        <Text className="text-gray-500 text-xs">Total</Text>
                        <Text className="text-gray-800 font-bold text-lg mt-1">
                          {chit.totalMonths}
                        </Text>
                        <Text className="text-gray-400 text-xs">months</Text>
                      </View>

                      <View className="flex-1 bg-green-50 p-3 rounded-xl">
                        <Text className="text-green-600 text-xs">Paid</Text>
                        <Text className="text-green-700 font-bold text-lg mt-1">
                          {chit.paidMonths}
                        </Text>
                        <Text className="text-green-500 text-xs">months</Text>
                      </View>

                      <View className="flex-1 bg-red-50 p-3 rounded-xl">
                        <Text className="text-red-600 text-xs">Pending</Text>
                        <Text className="text-red-700 font-bold text-lg mt-1">
                          {chit.pendingMonths}
                        </Text>
                        <Text className="text-red-500 text-xs">months</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* Footer Info with Clickable Link */}
          {chits.length > 0 && (
            <TouchableOpacity
              onPress={goToContactPage}
              activeOpacity={0.7}
              className="mt-6 bg-blue-50 rounded-2xl p-4 border border-blue-100"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <MaterialIcons name="info" size={18} color="#3b82f6" />
                  <Text className="text-blue-700 text-sm ml-2">
                    Need help? Contact your group administrator
                  </Text>
                </View>
                <MaterialIcons name="arrow-forward" size={18} color="#3b82f6" />
              </View>
            </TouchableOpacity>
          )}

          {/* CONSTANT FOOTER */}
          <View className="mt-6 mb-4 items-center">
            <View className="w-full border-t border-gray-200 pt-4 items-center">
              <Text className="text-[#024e32] font-bold text-base">
                MANIKYA CHITS PVT LTD
              </Text>

              <Text className="text-gray-500 text-xs mt-1 text-center">
                My Chits
              </Text>

              <Text className="text-gray-400 text-xs mt-1 text-center">
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}