import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
  Alert,
} from "react-native";
import BACKEND_URL from "../config";

// =========================================================
// SCREENSHOT PREVENTION FOR ALL PLATFORMS
// =========================================================

// For Android & iOS using expo-screen-capture
let ScreenCapture: any = null;

try {
  const module = require("expo-screen-capture");
  ScreenCapture = module.default || module;
} catch (error) {
  console.log("expo-screen-capture not available, using fallback");
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
      console.log("✅ Screenshots prevented (expo-screen-capture)");
      return;
    }

    if (Platform.OS === "android") {
      try {
        const { NativeModules } = require("react-native");
        const { SecureViewManager } = NativeModules;
        
        if (SecureViewManager?.setSecure) {
          await SecureViewManager.setSecure(true);
          console.log("✅ Screenshots prevented (native)");
        }
      } catch (error) {
        console.log("Native SecureViewManager not available");
      }
    }
  } catch (error) {
    console.log("Screenshot prevention error:", error);
  }
};

const allowScreenshot = async () => {
  try {
    if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
      await ScreenCapture.allowScreenCaptureAsync();
      console.log("✅ Screenshots allowed (expo-screen-capture)");
      return;
    }

    if (Platform.OS === "android") {
      try {
        const { NativeModules } = require("react-native");
        const { SecureViewManager } = NativeModules;
        
        if (SecureViewManager?.setSecure) {
          await SecureViewManager.setSecure(false);
          console.log("✅ Screenshots allowed (native)");
        }
      } catch (error) {
        console.log("Native SecureViewManager not available");
      }
    }
  } catch (error) {
    console.log("Screenshot allow error:", error);
  }
};

/* =========================================================================
   ✅ FIX: "Nothing Phone" text truncation issue
   ✅ PERF: memoized so it doesn't re-render on every parent state change
   ========================================================================= */
const SkeletonBox = React.memo(function SkeletonBox({
  width,
  height = 14,
  radius = 6,
  style = {},
}: {
  width: number | string;
  height?: number;
  radius?: number;
  style?: any;
}) {
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
});

/* =========================================================================
   SUMMARY CARD

   Compact tile. Several sit side by side in a wrapping row - React Native
   has no CSS grid, so the old "grid grid-cols-2" classes did nothing and
   every card stretched full width, one per line.
   ========================================================================= */
const SummaryCard = React.memo(function SummaryCard({
  label,
  value,
  color,
  icon,
  cardWidth,
}: {
  label: string;
  value: number | string;
  color: string;
  icon: any;
  cardWidth: string;
}) {
  return (
    <View
      className="bg-white rounded-2xl border border-gray-200 px-3 py-2.5 mb-2.5"
      style={{
        width: cardWidth as any,
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View className="flex-row items-center mb-1">
        <MaterialIcons name={icon} size={13} color={color} />
        <Text
          className="text-gray-500 text-[10px] font-semibold ml-1 flex-1"
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.1}
        >
          {label}
        </Text>
      </View>

      <Text
        className="text-base font-bold"
        style={{ color }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        maxFontSizeMultiplier={1.1}
      >
        ₹{value}
      </Text>
    </View>
  );
});

const SkeletonGroupsScreen = () => (
  <SafeAreaView className="flex-1 bg-white">
    <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
      <View className="flex-row items-center">
        <TouchableOpacity className="mt-1" disabled>
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text
          className="text-white text-2xl font-bold ml-4 mt-1 flex-1"
          numberOfLines={1}
          ellipsizeMode="tail"
          maxFontSizeMultiplier={1.3}
          style={{ flexShrink: 1 }}
        >
          Account Copy
        </Text>
      </View>
    </View>
    <View className="p-5" style={{ paddingTop: 120 }}>
      <SkeletonBox width={110} height={14} style={{ marginBottom: 10 }} />
      <SkeletonBox width={"100%" as any} height={64} radius={16} />

      <View className="flex-row flex-wrap justify-between mt-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            className="bg-white px-3 py-2.5 rounded-2xl border border-gray-200 mb-2.5"
            style={{ width: "48%" }}
          >
            <SkeletonBox width={70} height={9} style={{ marginBottom: 7 }} />
            <SkeletonBox width={55} height={16} />
          </View>
        ))}
      </View>
    </View>
    <View className="px-5">
      <Footer />
    </View>
  </SafeAreaView>
);

const SkeletonLedgerBlock = ({ isDesktopOrLaptop }: { isDesktopOrLaptop: boolean }) => (
  <View>
    <View className="flex-row flex-wrap justify-between mb-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <View
          key={i}
          className="bg-white px-3 py-2.5 rounded-2xl border border-gray-200 mb-2.5"
          style={{ width: isDesktopOrLaptop ? "31.5%" : "48%" }}
        >
          <SkeletonBox width={70} height={9} style={{ marginBottom: 7 }} />
          <SkeletonBox width={55} height={16} />
        </View>
      ))}
    </View>

    <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <View className="bg-[#024e32] flex-row px-3 py-3">
        {Array.from({ length: isDesktopOrLaptop ? 7 : 4 }).map((_, i) => (
          <SkeletonBox
            key={i}
            width={isDesktopOrLaptop ? 100 : 70}
            height={12}
            style={{ marginRight: 12, backgroundColor: "#0d6b46" }}
          />
        ))}
      </View>
      {Array.from({ length: 6 }).map((_, row) => (
        <View
          key={row}
          className={`flex-row items-center px-3 py-4 border-b border-gray-100 ${
            row % 2 === 0 ? "bg-white" : "bg-gray-50"
          }`}
        >
          {Array.from({ length: isDesktopOrLaptop ? 7 : 4 }).map((_, col) => (
            <SkeletonBox
              key={col}
              width={isDesktopOrLaptop ? 90 : 60}
              height={12}
              style={{ marginRight: 12 }}
            />
          ))}
        </View>
      ))}
    </View>
  </View>
);

const Footer = () => (
  <View className="mt-6 mb-6">
    <View className="border-t border-gray-200 pt-4 items-center">
      <Text className="text-[#024e32] font-bold text-base">
        MANIKYA CHITS PVT LTD
      </Text>
      <Text className="text-gray-500 text-xs mt-1 text-center">
        My Account Copy
      </Text>
      <Text className="text-gray-400 text-xs mt-1 text-center">
        © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
      </Text>
    </View>
  </View>
);

export default function MyAccountCopy() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;

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

      // Add CSS to prevent selection and screenshots
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

  const [groups, setGroups] = useState([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState("");
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupData, setSelectedGroupData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dividendMap, setDividendMap] = useState<Record<number, number>>({});
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // ✅ Custom cross-platform dropdown state
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // ========== HISTORY MODAL STATES ==========
  const [historyVisible, setHistoryVisible] = useState(false);
  const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<any>(null);
  const [historyPayments, setHistoryPayments] = useState<any[]>([]);
  const [historyMemberInfo, setHistoryMemberInfo] = useState<any>(null);

  // ✅ PERFORMANCE: cache ledger + dividend data
  const [ledgerCache, setLedgerCache] = useState<Record<string, any[]>>({});
  const [dividendCache, setDividendCache] = useState<Record<string, Record<number, number>>>({});

  const didInitialLoad = useRef(false);
  useEffect(() => {
    if (!didInitialLoad.current) {
      didInitialLoad.current = true;
      loadGroups();
    }
  }, []);

  useEffect(() => {
    if (selectedGroupId && selectedGroupMemberId) {
      loadAccountCopy(selectedGroupId, selectedGroupMemberId);
    }
  }, [selectedGroupId, selectedGroupMemberId]);

  /* ================= LOAD USER GROUPS ================= */
  // ✅ PERF: useCallback so this stable reference isn't recreated every render
  const loadGroups = useCallback(async (preserveSelection = false) => {
    if (isLoadingGroups) return;

    try {
      setIsLoadingGroups(true);
      if (!preserveSelection) setLoading(true);

      const storedUser = await AsyncStorage.getItem("loggedUser");
      if (!storedUser) {
        setLoading(false);
        setIsLoadingGroups(false);
        return;
      }

      const { userid } = JSON.parse(storedUser);

      const res = await fetch(`${BACKEND_URL}/groups/my-chits/${userid}`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setGroups(data);

        if (preserveSelection && selectedGroupKey) {
          const stillExists = data.find((g: any) => g.uniqueKey === selectedGroupKey);
          if (stillExists) {
            setSelectedGroupData(stillExists);
            await loadAccountCopy(stillExists.groupId, stillExists.groupMemberId || "", true);
            return;
          }
        }

        const firstGroup = data[0];
        setSelectedGroupKey(firstGroup.uniqueKey);
        setSelectedGroupId(firstGroup.groupId);
        setSelectedGroupMemberId(firstGroup.groupMemberId || "");
        setSelectedGroupData(firstGroup);
      } else {
        setGroups([]);
        setSelectedGroupKey("");
        setSelectedGroupId("");
        setSelectedGroupMemberId("");
        setSelectedGroupData(null);
        setLedger([]);
      }
    } catch (err) {
      console.log("❌ Load groups error:", err);
    } finally {
      setLoading(false);
      setIsLoadingGroups(false);
      setRefreshing(false);
    }
  }, [isLoadingGroups, selectedGroupKey]);

  /* ================= LOAD ACCOUNT COPY ================= */
  const loadAccountCopy = useCallback(async (
    groupId: string,
    groupMemberId: string,
    forceRefresh = false
  ) => {
    const cacheKey = `${groupId}_${groupMemberId}`;

    if (!forceRefresh && ledgerCache[cacheKey]) {
      setLedger(ledgerCache[cacheKey]);
      setDividendMap(dividendCache[cacheKey] || {});
      return;
    }

    try {
      setLoading(true);
      const storedUser = await AsyncStorage.getItem("loggedUser");
      if (!storedUser) return;

      const { userid } = JSON.parse(storedUser);

      const res = await fetch(
        `${BACKEND_URL}/groups/account-copy/${userid}/${groupId}?groupMemberId=${groupMemberId}`
      );

      const data = await res.json();
      if (Array.isArray(data.ledger)) {
        setLedger(data.ledger);
        setLedgerCache((prev) => ({ ...prev, [cacheKey]: data.ledger }));
        await loadDividends(groupId, data.ledger, cacheKey);
      } else {
        setLedger([]);
      }

      const group = groups.find((g: any) => g.uniqueKey === selectedGroupKey);
      if (group) {
        setSelectedGroupData(group);
      }
    } catch (err) {
      console.log("❌ Account copy error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ledgerCache, dividendCache, groups, selectedGroupKey]);

  const loadDividends = useCallback(async (groupId: string, ledgerData: any[], cacheKey: string) => {
    try {
      const map: Record<number, number> = {};
      await Promise.all(
        ledgerData.map(async (row) => {
          try {
            const res = await fetch(
              `${BACKEND_URL}/groups/${groupId}/collection-plan/${row.monthIndex}`
            );
            const plan = await res.json();
            map[row.monthIndex] = plan?.dividend || 0;
          } catch (err) {
            console.log("Dividend fetch error for month", row.monthIndex);
            map[row.monthIndex] = 0;
          }
        })
      );
      setDividendMap(map);
      setDividendCache((prev) => ({ ...prev, [cacheKey]: map }));
    } catch (err) {
      console.log("❌ Dividend load error:", err);
      setDividendMap({});
    }
  }, []);

  /* ================= HANDLE REFRESH ================= */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const cacheKey = `${selectedGroupId}_${selectedGroupMemberId}`;
    setLedgerCache((prev) => {
      const copy = { ...prev };
      delete copy[cacheKey];
      return copy;
    });
    setDividendCache((prev) => {
      const copy = { ...prev };
      delete copy[cacheKey];
      return copy;
    });
    loadGroups(true);
  }, [selectedGroupId, selectedGroupMemberId, loadGroups]);

  /* ================= HANDLE GROUP CHANGE ================= */
  const handleGroupChange = useCallback((uniqueKey: string) => {
    if (uniqueKey === selectedGroupKey) return;

    const selected: any = groups.find((g: any) => g.uniqueKey === uniqueKey);
    if (selected) {
      setSelectedGroupKey(uniqueKey);
      setSelectedGroupId(selected.groupId);
      setSelectedGroupMemberId(selected.groupMemberId || "");
      setSelectedGroupData(selected);
    }
  }, [groups, selectedGroupKey]);

  /* ================= GET USER PAID AMOUNT ================= */
  const getUserPaidAmount = useCallback((payments: any[]) => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments
      .filter((p: any) => p.paymentType !== "DIVIDEND")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, []);

  /* ================= OPEN HISTORY MODAL ================= */
  const openHistoryModal = useCallback((row: any) => {
    const payments = row.payments || [];
    const dividend = dividendMap[row.monthIndex] || 0;
    const hasDividendPayment = payments.some((p: any) => p.paymentType === "DIVIDEND");

    let allPayments = [...payments];

    if (dividend > 0 && !hasDividendPayment) {
      const dividendPayment = {
        amount: dividend,
        paidAt: row.dueDate || new Date(),
        paymentType: "DIVIDEND",
        collectedBy: "System",
      };
      allPayments = [dividendPayment, ...payments];
    }

    setSelectedHistoryMonth(row);
    setHistoryPayments(allPayments);
    setHistoryMemberInfo({
      memberName: selectedGroupData?.groupId || "Member",
      groupMemberId: selectedGroupMemberId,
    });
    setHistoryVisible(true);
  }, [dividendMap, selectedGroupData, selectedGroupMemberId]);

  // ✅ PERF: only recompute totals when ledger or dividendMap actually change,
  // instead of on every render (dropdown open/close, modal state, etc.)
  const totals = useMemo(() => {
    if (!Array.isArray(ledger) || ledger.length === 0) {
      return {
        totalInstallment: 0,
        totalPaid: 0,
        totalPenalty: 0,
        totalDue: 0,
        totalInstallmentPaid: 0,
        totalPenaltyPaid: 0,
        totalDividend: 0,
        totalUserPaid: 0,
      };
    }

    const totalInstallment = ledger.reduce(
      (sum, row) => sum + (row.installmentAmount || 0) + (dividendMap[row.monthIndex] || 0),
      0
    );

    const totalPenalty = ledger.reduce((sum, row) => sum + (row.penaltyAmount || 0), 0);

    const totalUserPaid = ledger.reduce((sum, row) => {
      const userPaid = getUserPaidAmount(row.payments || []);
      return sum + userPaid;
    }, 0);

    const totalDividend = ledger.reduce((sum, row) => {
      return sum + (dividendMap[row.monthIndex] || 0);
    }, 0);

    const totalPaid = totalUserPaid + totalDividend;

    const totalPenaltyPaid = ledger.reduce((sum, row) => {
      const penaltyPaid = (row.payments || [])
        .filter((p: any) => p.paymentType === "PENALTY")
        .reduce((s, p) => s + (p.amount || 0), 0);
      return sum + penaltyPaid;
    }, 0);

    const totalInstallmentPaid = totalUserPaid;
    const totalDue = totalInstallment + totalPenalty - totalPaid;

    return {
      totalInstallment,
      totalPaid,
      totalPenalty,
      totalDue,
      totalInstallmentPaid,
      totalPenaltyPaid,
      totalDividend,
      totalUserPaid,
    };
  }, [ledger, dividendMap, getUserPaidAmount]);

  if (loading && groups.length === 0) {
    return <SkeletonGroupsScreen />;
  }

  const getColumnWidth = () => {
    return isDesktopOrLaptop ? 120 : 90;
  };

  const selectedLabel =
    selectedGroupData?.displayLabel ||
    (selectedGroupData ? `${selectedGroupData.groupId} - ${selectedGroupData.chitId}` : "Select a group");

  /* Dropdown sizing - centered card on laptop/tablet,
     near-full-width sheet on phones, always capped by screen height */
  const dropdownMaxWidth = isDesktopOrLaptop ? 520 : 460;
  const dropdownMaxHeight = Math.min(height * 0.75, 620);

  /* Summary tiles: 3 per row on laptop/tablet, 2 per row on phones */
  const summaryCardWidth = isDesktopOrLaptop ? "31.5%" : "48%";

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mt-1">
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <Text
            className="text-white text-2xl font-bold ml-4 mt-1 flex-1"
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.3}
            style={{ flexShrink: 1 }}
          >
            My Account Copy
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#f7f9f8]"
        contentContainerStyle={{ paddingTop: 110 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
      >
        <View className="p-5">
          {/* =====================================================
              GROUP SELECTOR
          ===================================================== */}
          <View className="mb-6">
            <Text className="text-gray-500 text-xs font-bold tracking-wider uppercase mb-2 ml-1">
              Select Group
            </Text>

            {/* TRIGGER */}
            <TouchableOpacity
              onPress={() => setDropdownVisible(true)}
              activeOpacity={0.8}
              disabled={groups.length === 0}
              className={`bg-white rounded-2xl border px-4 py-3 flex-row items-center ${
                dropdownVisible ? "border-[#024e32]" : "border-gray-200"
              }`}
              style={{
                minHeight: 64,
                shadowColor: "#000",
                shadowOpacity: 0.05,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 2,
              }}
            >
              <View className="w-10 h-10 rounded-xl bg-[#024e32]/10 items-center justify-center mr-3">
                <MaterialIcons name="account-balance" size={20} color="#024e32" />
              </View>

              <View className="flex-1 mr-2">
                <Text
                  className="text-gray-900 text-base font-semibold"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  maxFontSizeMultiplier={1.2}
                >
                  {groups.length === 0 ? "No groups found" : selectedLabel}
                </Text>

                {selectedGroupData?.groupMemberId ? (
                  <Text
                    className="text-gray-400 text-xs mt-0.5"
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.2}
                  >
                    Member ID: {selectedGroupData.groupMemberId}
                  </Text>
                ) : null}
              </View>

              {groups.length > 1 ? (
                <View className="bg-gray-100 rounded-full px-2 py-0.5 mr-1">
                  <Text className="text-gray-600 text-[11px] font-bold">
                    {groups.length}
                  </Text>
                </View>
              ) : null}

              <MaterialIcons
                name={dropdownVisible ? "arrow-drop-up" : "arrow-drop-down"}
                size={28}
                color="#6b7280"
              />
            </TouchableOpacity>

            {/* =====================================================
                DROPDOWN MODAL
                Centered card on laptop / tablet, wide sheet on
                phones. Height is capped so a long group list always
                scrolls inside the card instead of overflowing.
            ===================================================== */}
            <Modal
              visible={dropdownVisible}
              transparent
              animationType="fade"
              statusBarTranslucent
              onRequestClose={() => setDropdownVisible(false)}
            >
              <Pressable
                onPress={() => setDropdownVisible(false)}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(15, 23, 42, 0.55)",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 20,
                }}
              >
                {/* stops a tap inside the card from closing it */}
                <Pressable
                  onPress={(e) => e.stopPropagation()}
                  style={{ width: "100%", maxWidth: dropdownMaxWidth }}
                >
                  <View
                    className="bg-white rounded-3xl overflow-hidden"
                    style={{
                      maxHeight: dropdownMaxHeight,
                      shadowColor: "#000",
                      shadowOpacity: 0.25,
                      shadowRadius: 30,
                      shadowOffset: { width: 0, height: 12 },
                      elevation: 14,
                    }}
                  >
                    {/* HEADER */}
                    <View className="bg-[#024e32] px-5 py-4 flex-row items-center">
                      <View className="w-9 h-9 rounded-full bg-white/15 items-center justify-center mr-3">
                        <MaterialIcons name="groups" size={20} color="white" />
                      </View>

                      <View className="flex-1">
                        <Text
                          className="text-white font-bold text-base"
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.2}
                        >
                          Select Group
                        </Text>
                        <Text className="text-green-100 text-xs mt-0.5">
                          {groups.length} group{groups.length === 1 ? "" : "s"} available
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => setDropdownVisible(false)}
                        activeOpacity={0.8}
                        className="w-9 h-9 rounded-full bg-white/15 items-center justify-center"
                      >
                        <MaterialIcons name="close" size={20} color="white" />
                      </TouchableOpacity>
                    </View>

                    {/* LIST */}
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={{ padding: 12 }}
                      bounces={false}
                    >
                      {groups.length === 0 ? (
                        <View className="items-center py-12">
                          <MaterialIcons name="folder-open" size={44} color="#d1d5db" />
                          <Text className="text-gray-500 mt-3 font-medium">
                            No groups found
                          </Text>
                          <Text className="text-gray-400 text-xs mt-1 text-center px-6">
                            You are not part of any chit group yet
                          </Text>
                        </View>
                      ) : (
                        groups.map((g: any, i: number) => {
                          const isSelected = g.uniqueKey === selectedGroupKey;

                          const label =
                            g.displayLabel || `${g.groupId} - ${g.chitId}`;

                          return (
                            <TouchableOpacity
                              key={i}
                              onPress={() => {
                                handleGroupChange(g.uniqueKey);
                                setDropdownVisible(false);
                              }}
                              activeOpacity={0.8}
                              className={`flex-row items-center rounded-2xl px-3 py-3 mb-2 border ${
                                isSelected
                                  ? "bg-[#024e32]/5 border-[#024e32]/30"
                                  : "bg-white border-gray-100"
                              }`}
                            >
                              {/* AVATAR */}
                              <View
                                className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${
                                  isSelected ? "bg-[#024e32]" : "bg-gray-100"
                                }`}
                              >
                                <Text
                                  className={`font-extrabold text-base ${
                                    isSelected ? "text-white" : "text-[#024e32]"
                                  }`}
                                  maxFontSizeMultiplier={1.2}
                                >
                                  {String(g.groupId || "G").charAt(0).toUpperCase()}
                                </Text>
                              </View>

                              <View className="flex-1 mr-2">
                                <Text
                                  className={`text-base ${
                                    isSelected
                                      ? "text-[#024e32] font-bold"
                                      : "text-gray-800 font-semibold"
                                  }`}
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                  maxFontSizeMultiplier={1.2}
                                >
                                  {label}
                                </Text>

                                <View className="flex-row flex-wrap items-center mt-1">
                                  {g.groupMemberId ? (
                                    <View className="bg-amber-100 rounded-md px-2 py-0.5 mr-2">
                                      <Text className="text-amber-800 text-[11px] font-bold">
                                        {g.groupMemberId}
                                      </Text>
                                    </View>
                                  ) : null}

                                  {g.status ? (
                                    <Text className="text-gray-400 text-[11px]">
                                      {g.status}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>

                              {/* RADIO */}
                              <View
                                className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                                  isSelected
                                    ? "border-[#024e32] bg-[#024e32]"
                                    : "border-gray-300"
                                }`}
                              >
                                {isSelected ? (
                                  <MaterialIcons name="check" size={16} color="white" />
                                ) : null}
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </ScrollView>

                    {/* FOOTER */}
                    <View className="px-4 py-3 border-t border-gray-100 bg-white">
                      <TouchableOpacity
                        onPress={() => setDropdownVisible(false)}
                        activeOpacity={0.8}
                        className="bg-gray-100 py-3 rounded-2xl"
                      >
                        <Text className="text-gray-700 text-center font-semibold">
                          Close
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>

            {/* Group Info */}
            {selectedGroupData && (
              <View className="mt-3 bg-blue-50 rounded-xl p-3">
                <Text className="text-blue-700 text-sm">
                  <Text className="font-semibold">Group:</Text> {selectedGroupData.groupId}
                </Text>
                <Text className="text-blue-700 text-sm mt-1">
                  <Text className="font-semibold">Member ID:</Text> {selectedGroupData.groupMemberId || "N/A"}
                </Text>
                <Text className="text-blue-700 text-sm mt-1">
                  <Text className="font-semibold">Status:</Text> {selectedGroupData.status || "Active"}
                </Text>
              </View>
            )}
          </View>

          {loading && groups.length > 0 ? (
            <SkeletonLedgerBlock isDesktopOrLaptop={isDesktopOrLaptop} />
          ) : ledger.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-200 shadow-sm">
              <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
                <MaterialIcons name="receipt" size={30} color="#9ca3af" />
              </View>
              <Text className="text-gray-500 text-lg font-medium text-center">
                No ledger entries found
              </Text>
              <Text className="text-gray-400 text-sm text-center mt-2">
                Payment records will appear here
              </Text>
            </View>
          ) : (
            <>
              {/* =====================================================
                  SUMMARY TILES
                  flex-wrap row - 2 per line on phones, 3 on laptop.
                  (React Native has no CSS grid, so the previous
                  "grid grid-cols-2" classes did nothing and every
                  card stretched to full width.)
              ===================================================== */}
              <View className="flex-row flex-wrap justify-between mb-4">
                <SummaryCard
                  label="Total Installment"
                  value={totals.totalInstallment}
                  color="#024e32"
                  icon="account-balance-wallet"
                  cardWidth={summaryCardWidth}
                />

                <SummaryCard
                  label="Total Dividend"
                  value={totals.totalDividend}
                  color="#2563eb"
                  icon="trending-up"
                  cardWidth={summaryCardWidth}
                />

                <SummaryCard
                  label="User Paid"
                  value={totals.totalUserPaid}
                  color="#16a34a"
                  icon="check-circle"
                  cardWidth={summaryCardWidth}
                />

                <SummaryCard
                  label="Total Penalty"
                  value={totals.totalPenalty}
                  color="#dc2626"
                  icon="warning"
                  cardWidth={summaryCardWidth}
                />

                <SummaryCard
                  label="Total Due"
                  value={Math.max(totals.totalDue, 0)}
                  color={totals.totalDue > 0 ? "#dc2626" : "#16a34a"}
                  icon="pending-actions"
                  cardWidth={summaryCardWidth}
                />

                {/* keeps the last row aligned when the count is odd */}
                <View style={{ width: summaryCardWidth as any }} />
              </View>

              {/* About Account Copy Card */}
              <View className="mb-6 bg-blue-50 rounded-2xl p-4 border border-blue-200">
                <View className="flex-row items-center mb-2">
                  <MaterialIcons name="info-outline" size={20} color="#1e40af" />
                  <Text
                    className="text-blue-800 font-semibold ml-2 text-base"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    maxFontSizeMultiplier={1.3}
                    style={{ flexShrink: 1 }}
                  >
                    About Account Copy
                  </Text>
                </View>
                <Text className="text-blue-700 text-sm leading-5">
                  This statement shows your complete payment history for the selected chit group.
                  It includes monthly installments, dividends credited, penalties applied (if any),
                  and your current balance. The dividend amount is paid by the admin and automatically
                  adjusted against your dues. Pull down to refresh for the latest updates.
                </Text>
              </View>

              {/* Ledger Table */}
              <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View>
                    {/* Table Header */}
                    <View className="bg-[#024e32] flex-row border-b border-gray-300">
                      <View style={{ width: getColumnWidth() }}>
                        <Text
                          className="text-white font-semibold text-sm p-3 text-center"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.15}
                        >
                          Month
                        </Text>
                      </View>
                      <View style={{ width: getColumnWidth() }}>
                        <Text
                          className="text-white font-semibold text-sm p-3 text-center"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.15}
                        >
                          Installment
                        </Text>
                      </View>
                      <View style={{ width: getColumnWidth() }}>
                        <Text
                          className="text-white font-semibold text-sm p-3 text-center"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.15}
                        >
                          User Paid
                        </Text>
                      </View>
                      <View style={{ width: getColumnWidth() }}>
                        <Text
                          className="text-white font-semibold text-sm p-3 text-center"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.15}
                        >
                          Dividend
                        </Text>
                      </View>
                      <View style={{ width: getColumnWidth() }}>
                        <Text
                          className="text-white font-semibold text-sm p-3 text-center"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.15}
                        >
                          Penalty
                        </Text>
                      </View>
                      <View style={{ width: getColumnWidth() }}>
                        <Text
                          className="text-white font-semibold text-sm p-3 text-center"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.15}
                        >
                          Status
                        </Text>
                      </View>
                      <View style={{ width: getColumnWidth() }}>
                        <Text
                          className="text-white font-semibold text-sm p-3 text-center"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.15}
                        >
                          History
                        </Text>
                      </View>
                    </View>

                    {/* Table Rows */}
                    {ledger.map((row: any, index: number) => {
                      const dividend = dividendMap?.[row.monthIndex] || 0;
                      const userPaid = getUserPaidAmount(row.payments || []);
                      const grossInstallment = (row.installmentAmount || 0) + dividend;

                      return (
                        <View
                          key={index}
                          className={`flex-row border-b border-gray-100 ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <View style={{ width: getColumnWidth() }} className="p-3">
                            <Text
                              className="font-medium text-gray-800 text-center"
                              numberOfLines={1}
                              maxFontSizeMultiplier={1.15}
                            >
                              M{row.monthIndex}
                            </Text>
                            {row.dueDate && (
                              <Text
                                className="text-gray-500 text-xs text-center mt-1"
                                numberOfLines={1}
                                maxFontSizeMultiplier={1.15}
                              >
                                {new Date(row.dueDate).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </Text>
                            )}
                          </View>

                          <View style={{ width: getColumnWidth() }} className="p-3 items-center">
                            <Text
                              className="text-gray-800 text-center font-medium"
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.7}
                              maxFontSizeMultiplier={1.15}
                            >
                              ₹{grossInstallment}
                            </Text>
                            {dividend > 0 && (
                              <Text
                                className="text-gray-400 text-xs text-center mt-1"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.6}
                                ellipsizeMode="tail"
                                maxFontSizeMultiplier={1.15}
                              >
                                (net ₹{row.installmentAmount})
                              </Text>
                            )}
                          </View>

                          <View style={{ width: getColumnWidth() }} className="p-3 items-center">
                            <Text
                              className="font-medium text-gray-800 text-center"
                              numberOfLines={1}
                              adjustsFontSizeToFit
                              minimumFontScale={0.7}
                              maxFontSizeMultiplier={1.15}
                            >
                              ₹{userPaid}
                            </Text>
                            <Text
                              className="text-gray-500 text-xs text-center mt-1"
                              numberOfLines={1}
                              maxFontSizeMultiplier={1.15}
                            >
                              {userPaid >= grossInstallment ? "Fully paid" : "Partial"}
                            </Text>
                          </View>

                          <View style={{ width: getColumnWidth() }} className="p-3 items-center">
                            {dividend > 0 ? (
                              <>
                                <Text
                                  className="text-blue-600 font-medium text-center"
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.7}
                                  maxFontSizeMultiplier={1.15}
                                >
                                  ₹{dividend}
                                </Text>
                                <Text className="text-blue-500 text-xs text-center mt-1" maxFontSizeMultiplier={1.15}>
                                  Applied
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text className="text-gray-400 text-center" maxFontSizeMultiplier={1.15}>
                                  ₹0
                                </Text>
                                <Text className="text-gray-400 text-xs text-center mt-1" maxFontSizeMultiplier={1.15}>
                                  None
                                </Text>
                              </>
                            )}
                          </View>

                          <View style={{ width: getColumnWidth() }} className="p-3 items-center">
                            {row.penaltyAmount > 0 ? (
                              <>
                                <Text
                                  className="text-red-600 font-medium text-center"
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.7}
                                  maxFontSizeMultiplier={1.15}
                                >
                                  ₹{row.penaltyAmount}
                                </Text>
                                <Text
                                  className="text-red-500 text-xs text-center mt-1"
                                  numberOfLines={1}
                                  ellipsizeMode="tail"
                                  maxFontSizeMultiplier={1.15}
                                >
                                  Penalty applied
                                </Text>
                              </>
                            ) : (
                              <>
                                <Text className="text-gray-400 text-center" maxFontSizeMultiplier={1.15}>
                                  ₹0
                                </Text>
                                <Text className="text-green-500 text-xs text-center mt-1" maxFontSizeMultiplier={1.15}>
                                  No penalty
                                </Text>
                              </>
                            )}
                          </View>

                          <View style={{ width: getColumnWidth() }} className="p-3 items-center">
                            <View
                              className={`px-2 py-1 rounded-full items-center ${
                                row.status === "PAID"
                                  ? "bg-green-100"
                                  : row.status === "OVERDUE"
                                  ? "bg-red-100"
                                  : "bg-yellow-100"
                              }`}
                            >
                              <Text
                                className={`text-xs font-semibold ${
                                  row.status === "PAID"
                                    ? "text-green-700"
                                    : row.status === "OVERDUE"
                                    ? "text-red-700"
                                    : "text-yellow-700"
                                }`}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.7}
                                maxFontSizeMultiplier={1.15}
                              >
                                {row.status}
                              </Text>
                            </View>
                            {row.penaltyAmount > 0 && row.status !== "PAID" && (
                              <Text
                                className="text-red-500 text-xs text-center mt-1"
                                numberOfLines={1}
                                ellipsizeMode="tail"
                                maxFontSizeMultiplier={1.15}
                              >
                                Includes penalty
                              </Text>
                            )}
                          </View>

                          <View style={{ width: getColumnWidth() }} className="p-3 items-center justify-center">
                            <TouchableOpacity
                              onPress={() => openHistoryModal(row)}
                              className="bg-[#024e32]/10 p-2 rounded-full"
                            >
                              <MaterialIcons name="history" size={22} color="#024e32" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Scroll hint */}
              {!isDesktopOrLaptop && ledger.length > 0 && (
                <View className="flex-row items-center justify-center mt-2">
                  <MaterialIcons name="chevron-left" size={16} color="#9ca3af" />
                  <Text className="text-gray-400 text-xs mx-2">Swipe to see more →</Text>
                  <MaterialIcons name="chevron-right" size={16} color="#9ca3af" />
                </View>
              )}

              {/* Detailed View */}
              <View className="mt-6 bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <Text className="font-semibold text-gray-700 mb-2">Payment Summary</Text>
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Total Months:</Text>
                    <Text className="font-medium">{ledger.length}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Paid Months:</Text>
                    <Text className="font-medium text-green-600">
                      {ledger.filter((row: any) => row.status === "PAID").length}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Months with Penalty:</Text>
                    <Text className="font-medium text-red-600">
                      {ledger.filter((row: any) => row.penaltyAmount > 0).length}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Total Penalty Amount:</Text>
                    <Text className="font-medium text-red-600">
                      ₹{totals.totalPenalty}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Pending Months:</Text>
                    <Text className="font-medium text-red-600">
                      {ledger.filter((row: any) => row.status !== "PAID").length}
                    </Text>
                  </View>

                  <View className="pt-2 border-t border-gray-300">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-700 font-semibold">Installment Total (Gross):</Text>
                      <Text className="font-bold text-[#024e32]">
                        ₹{totals.totalInstallment}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-700 font-semibold">Dividend Total:</Text>
                      <Text className="font-bold text-blue-600">
                        ₹{totals.totalDividend}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-700 font-semibold">Penalty Total:</Text>
                      <Text className="font-bold text-red-600">
                        ₹{totals.totalPenalty}
                      </Text>
                    </View>
                  </View>

                  <View className="pt-2 border-t border-gray-300">
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-700 font-semibold">User Paid:</Text>
                      <Text className="font-bold text-green-600">
                        ₹{totals.totalUserPaid}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-700 font-semibold">Total Paid (incl. Dividend):</Text>
                      <Text className="font-bold text-green-600">
                        ₹{totals.totalPaid}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-700 font-semibold">Installment Paid:</Text>
                      <Text className="font-bold text-[#024e32]">
                        ₹{totals.totalInstallmentPaid}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-700 font-semibold">Penalty Paid:</Text>
                      <Text className="font-bold text-red-600">
                        ₹{totals.totalPenaltyPaid}
                      </Text>
                    </View>
                    <View className="flex-row justify-between pt-2 mt-2 border-t border-gray-300">
                      <Text className="text-gray-800 font-bold">Net Balance:</Text>
                      <Text
                        className={`font-bold text-lg ${
                          totals.totalDue > 0 ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        ₹{Math.max(totals.totalDue, 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          <Footer />
        </View>
      </ScrollView>

      {/* Payment History Modal */}
      <Modal visible={historyVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] max-h-[80%] rounded-2xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text className="text-xl font-bold">
                  Payment History - {historyMemberInfo?.memberName || "Member"}
                </Text>
                {selectedHistoryMonth && (
                  <Text className="text-gray-500 text-sm mt-1">
                    Month M{selectedHistoryMonth.monthIndex} -
                    Gross ₹{(selectedHistoryMonth.installmentAmount || 0) + (dividendMap[selectedHistoryMonth.monthIndex] || 0)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {historyPayments.length === 0 ? (
                <Text className="text-gray-400 text-center py-8">
                  No payments recorded for this month
                </Text>
              ) : (
                historyPayments.map((p: any, i: number) => {
                  const paymentType = p?.paymentType || "INSTALLMENT";

                  return (
                    <View
                      key={i}
                      className="flex-row justify-between items-center mb-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <View>
                        <View className="flex-row items-center">
                          <Text className="text-gray-700 font-medium">₹{p.amount}</Text>
                          <Text
                            className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                              paymentType === "PENALTY"
                                ? "bg-red-100 text-red-600"
                                : paymentType === "DIVIDEND"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {paymentType}
                          </Text>
                        </View>
                        <Text className="text-gray-500 text-sm">
                          {new Date(p.paidAt).toLocaleDateString("en-IN")}
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1">
                          Collected by: {p.collectedBy || "System"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}

              {selectedHistoryMonth && (
                <View className="mt-4 pt-4 border-t border-gray-200">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600 font-medium">Gross Installment:</Text>
                    <Text className="font-semibold">
                      ₹{(selectedHistoryMonth.installmentAmount || 0) + (dividendMap[selectedHistoryMonth.monthIndex] || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600 font-medium">Net Installment:</Text>
                    <Text className="font-semibold">₹{selectedHistoryMonth.installmentAmount}</Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600 font-medium">Penalty:</Text>
                    <Text className="font-semibold text-red-600">
                      ₹{selectedHistoryMonth.penaltyAmount || 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600 font-medium">Dividend:</Text>
                    <Text className="font-semibold text-blue-600">
                      ₹{dividendMap[selectedHistoryMonth.monthIndex] || 0}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600 font-medium">User Paid:</Text>
                    <Text className="font-semibold text-green-600">
                      ₹{getUserPaidAmount(selectedHistoryMonth.payments || [])}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600 font-medium">Total Paid (incl. Dividend):</Text>
                    <Text className="font-semibold text-green-600">
                      ₹{getUserPaidAmount(selectedHistoryMonth.payments || []) + (dividendMap[selectedHistoryMonth.monthIndex] || 0)}
                    </Text>
                  </View>
                  <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-200">
                    <Text className="text-gray-700 font-semibold">Status:</Text>
                    <Text
                      className={`font-semibold ${
                        selectedHistoryMonth.status === "PAID"
                          ? "text-green-600"
                          : selectedHistoryMonth.status === "OVERDUE"
                          ? "text-red-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {selectedHistoryMonth.status || "PENDING"}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setHistoryVisible(false)}
              className="mt-4 bg-[#024e32] py-3 rounded-xl"
            >
              <Text className="text-white text-center font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}