import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Animated,
  Alert,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config";
import { useRouter } from "expo-router";

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

function SkeletonBox({
  className = "",
  style = {},
}: {
  className?: string;
  style?: object;
}) {
  const opacity = useSkeletonPulse();

  return (
    <Animated.View
      className={`bg-gray-200 rounded-lg ${className}`}
      style={[{ opacity }, style]}
    />
  );
}

function SummaryCardSkeleton({ full = false }: { full?: boolean }) {
  return (
    <View
      className={`bg-white ${
        full ? "w-full mt-4" : "w-[48%]"
      } p-4 rounded-2xl shadow-sm border border-[#e5e7eb]`}
    >
      <View className="flex-row items-center mb-3">
        <SkeletonBox className="w-10 h-10 rounded-full mr-2" />
        <SkeletonBox
          className="h-3 rounded"
          style={{ width: 90 }}
        />
      </View>

      <SkeletonBox
        className="h-6 rounded"
        style={{ width: 110 }}
      />
    </View>
  );
}

function MonthCardSkeleton() {
  return (
    <View className="bg-white p-5 rounded-2xl shadow-sm border border-[#e5e7eb] mb-4">
      <View className="flex-row justify-between items-start mb-3">
        <View>
          <SkeletonBox
            className="h-5 rounded"
            style={{ width: 120, marginBottom: 4 }}
          />
          <SkeletonBox
            className="h-3.5 rounded"
            style={{ width: 80 }}
          />
        </View>

        <SkeletonBox
          className="h-6 rounded-full"
          style={{ width: 64 }}
        />
      </View>

      <View className="bg-gray-50 p-3 rounded-lg">
        <SkeletonBox
          className="h-4 rounded mb-2"
          style={{ width: "100%" }}
        />
        <SkeletonBox
          className="h-4 rounded mb-2"
          style={{ width: "100%" }}
        />
        <SkeletonBox
          className="h-4 rounded"
          style={{ width: "70%" }}
        />
      </View>

      <SkeletonBox className="w-full h-12 rounded-xl mt-4" />
    </View>
  );
}

function OutstandingSkeleton() {
  return (
    <View className="flex-1">
      <View style={{ paddingTop: 10 }}>
        <View className="flex-row flex-wrap justify-between mb-6">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton full />
        </View>

        <MonthCardSkeleton />
        <MonthCardSkeleton />

        <View className="mt-6 mb-6 items-center">
          <View className="w-full border-t border-gray-200 pt-4 items-center">
            <SkeletonBox
              className="h-4 rounded"
              style={{ width: 155 }}
            />
            <SkeletonBox
              className="h-3 rounded mt-2"
              style={{ width: 95 }}
            />
            <SkeletonBox
              className="h-3 rounded mt-2"
              style={{ width: 250 }}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ================= MAIN COMPONENT ================= */

export default function MyOutstanding() {
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

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [pendingMonths, setPendingMonths] = useState<any[]>([]);
  const [filteredMonths, setFilteredMonths] = useState<any[]>([]);

  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [dueThisMonth, setDueThisMonth] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  const [error, setError] = useState<string | null>(null);

  // Group selection
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    null
  );

  const [groupList, setGroupList] = useState<any[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  /* ================= SESSION CHECK ================= */

  useEffect(() => {
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem("loggedUser");

        if (!stored) {
          router.replace("/");
          return;
        }

        setUser(JSON.parse(stored));
      } catch (error) {
        console.error("Session error:", error);
        Alert.alert("Error", "Failed to load user session");
      }
    };

    init();
  }, []);

  /* ================= LOAD FUNCTION ================= */

  const loadOutstanding = async (currentUser: any) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const groupsRes = await fetch(
        `${BACKEND_URL}/groups/my-chits/${currentUser.userid}`
      );

      if (!groupsRes.ok) {
        throw new Error("Failed to fetch groups");
      }

      const groupsData = await groupsRes.json();

      if (!Array.isArray(groupsData)) {
        setPendingMonths([]);
        setFilteredMonths([]);
        setTotalOutstanding(0);
        setDueThisMonth(0);
        setOverdueAmount(0);
        setTotalPaid(0);
        setGroupList([]);
        return;
      }

      /* ============================================================
         IMPORTANT:
         SAME GROUP CAN APPEAR MULTIPLE TIMES.

         Example:
         Employee added 3 times to same chit.

         We must fetch the ledger only ONCE per group/member
         instead of calculating the same ledger repeatedly.
      ============================================================ */

      const uniqueGroupMap = new Map<string, any>();

      for (const group of groupsData) {
        const groupId = group.groupId;

        if (!groupId) continue;

        const groupMemberId = group.groupMemberId || "";

        /*
          Use groupId + groupMemberId as the unique ledger identity.
          This prevents duplicate calculations when the same employee
          was added multiple times to the same chit.
        */
        const uniqueKey = `${groupId}-${groupMemberId}`;

        if (!uniqueGroupMap.has(uniqueKey)) {
          const groupName =
            group.groupName ||
            group.chitId ||
            group.groupId;

          uniqueGroupMap.set(uniqueKey, {
            groupId,
            groupName,
            chitId: group.chitId,
            memberId: group.memberId,
            groupMemberId,
          });
        }
      }

      const uniqueGroups = Array.from(uniqueGroupMap.values());

      /* ================= GROUP LIST ================= */

      const uniqueGroupDisplayMap = new Map<string, any>();

      for (const group of uniqueGroups) {
        if (!uniqueGroupDisplayMap.has(group.groupId)) {
          uniqueGroupDisplayMap.set(group.groupId, {
            groupId: group.groupId,
            groupName: group.groupName,
            chitId: group.chitId,
            memberId: group.memberId,
            groupMemberId: group.groupMemberId,
          });
        }
      }

      const displayGroups = Array.from(
        uniqueGroupDisplayMap.values()
      );

      setGroupList(displayGroups);

      /* ================= AUTO SELECT ================= */

      if (
        displayGroups.length > 0 &&
        !selectedGroupId
      ) {
        setSelectedGroupId(displayGroups[0].groupId);
      }

      /* ============================================================
         LOAD LEDGERS
      ============================================================ */

      const allMonths: any[] = [];

      const today = new Date();

      /*
        IMPORTANT BUSINESS CALCULATION

        Total Paid = DIVIDEND ONLY

        We intentionally do NOT do:
          paidAmount + dividend

        because your current account-copy data already causes the
        normal paidAmount and dividend to represent the same payment
        for this summary.

        Example:
          installment = 9000
          dividend = 600

          Total Paid = 600
          Total Due  = 9000 - 600 = 8400
      */

      let grandTotalPaid = 0;

      /*
        Prevent duplicate month records if backend returns
        the same group/member more than once.
      */
      const processedLedgerKeys = new Set<string>();

      for (const group of uniqueGroups) {
        const groupId = group.groupId;
        const groupMemberId = group.groupMemberId || "";

        try {
          const ledgerRes = await fetch(
            `${BACKEND_URL}/groups/account-copy/${currentUser.userid}/${groupId}?groupMemberId=${groupMemberId}`
          );

          if (!ledgerRes.ok) {
            continue;
          }

          const ledgerData = await ledgerRes.json();

          if (!ledgerData.ledger) {
            continue;
          }

          for (const month of ledgerData.ledger) {
            const monthIndex = month.monthIndex || 0;

            /*
              Unique month identity.
            */
            const ledgerKey = `${groupId}-${groupMemberId}-${monthIndex}`;

            if (processedLedgerKeys.has(ledgerKey)) {
              continue;
            }

            processedLedgerKeys.add(ledgerKey);

            /* ================= AMOUNTS ================= */

            /*
              Same calculation style as admin Group Members page:
              - Installment paid = payments excluding PENALTY & DIVIDEND
              - Dividend counts towards the installment
              - 6% penalty applies only after the due date,
                calculated on the unpaid amount before due date
            */

            const safePayments = Array.isArray(month.payments)
              ? month.payments
              : [];

            const installment = Number(
              month.installmentAmount || 0
            );

            const dividend = Number(
              month.dividend || 0
            );

            const installmentPaid = safePayments
              .filter(
                (p: any) =>
                  p.paymentType !== "PENALTY" &&
                  p.paymentType !== "DIVIDEND"
              )
              .reduce(
                (s: number, p: any) =>
                  s + Number(p.amount || 0),
                0
              );

            const totalPaid =
              dividend + installmentPaid;

            const effectivePaid = totalPaid;

            /*
              Pending installment =
              effective installment - (dividend + installment paid)
            */
            const pending = Math.max(
              installment - installmentPaid,
              0
            );

            /*
              Add actual total paid to grand total.
            */
            grandTotalPaid += effectivePaid;

            /* ================= DUE DATE ================= */

            let dueDateValue =
              month.dueDate ||
              month.endDate ||
              month.due_date ||
              month.collectionEndDate ||
              null;

            let dueDateObj: Date | null = null;

            if (dueDateValue) {
              try {
                dueDateObj = new Date(dueDateValue);

                if (
                  isNaN(
                    dueDateObj.getTime()
                  )
                ) {
                  dueDateObj = null;
                }
              } catch (e) {
                dueDateObj = null;
              }
            }

            /* ================= STATUS ================= */

            let status = "Pending";
            let daysLeft: number | null = null;
            let daysOverdue: number | null = null;
            let lateFee = 0;
            let isOverdue = false;

            if (dueDateObj) {
              const dueTime =
                dueDateObj.getTime();

              const now =
                today.getTime();

              if (now > dueTime && pending > 0) {
                status = "Overdue";

                isOverdue = true;

                daysOverdue = Math.ceil(
                  (now - dueTime) /
                    (1000 * 60 * 60 * 24)
                );

                /*
                  6% penalty on the amount that was unpaid
                  as of the due date (same as Group Members page).
                */
                const dueEndTime = new Date(dueDateObj);
                dueEndTime.setHours(23, 59, 59, 999);

                let paidBeforeDue = 0;
                safePayments.forEach((p: any) => {
                  if (
                    p.paymentType === "PENALTY" ||
                    p.paymentType === "DIVIDEND"
                  ) {
                    return;
                  }
                  const paidTime = new Date(
                    p.paidAt || p.date
                  ).getTime();
                  if (paidTime <= dueEndTime.getTime()) {
                    paidBeforeDue += Number(p.amount || 0);
                  }
                });

                const penaltyBase = Math.max(
                  installment -
                    dividend -
                    paidBeforeDue,
                  0
                );

                const penaltyDue = Math.round(
                  (penaltyBase * 6) / 100
                );

                const penaltyPaid = safePayments
                  .filter(
                    (p: any) =>
                      p.paymentType === "PENALTY"
                  )
                  .reduce(
                    (s: number, p: any) =>
                      s + Number(p.amount || 0),
                    0
                  );

                lateFee = Math.max(
                  penaltyDue - penaltyPaid,
                  0
                );
              } else {
                daysLeft = Math.ceil(
                  (dueTime - now) /
                    (1000 * 60 * 60 * 24)
                );
              }
            }

            /* ================= MONTH DATA ================= */

            /*
              Only show months that still have outstanding amount.
            */
            if (pending <= 0) {
              continue;
            }

            const uniqueKey =
              `${groupId}-${monthIndex}-${groupMemberId}`;

            allMonths.push({
              id: uniqueKey,

              groupId,

              groupName:
                ledgerData.groupName ||
                group.groupName ||
                group.chitId ||
                group.groupId,

              groupMemberId,

              monthIndex,

              installment,

              /*
                Total paid (dividend + installment payments)
                for this month.
              */
              paid: totalPaid,

              /*
                Dividend is the effective paid amount.
              */
              dividend,

              effectivePaid,

              pending,

              dueDate: dueDateObj,

              status,

              daysLeft,

              daysOverdue,

              lateFee,

              isOverdue,

              displayDate: dueDateObj
                ? dueDateObj.toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )
                : "Not set",
            });
          }
        } catch (err) {
          console.log(
            "Ledger fetch error for group",
            groupId,
            err
          );
        }
      }

      /* ================= SET STATE ================= */

      /*
        Summary (Total Due / This Month / Overdue / Total Paid)
        is calculated in the useEffect below so it always
        follows the currently selected group:
        - "All Groups"  -> totals across ALL groups
        - One group     -> totals for ONLY that group
      */

      setPendingMonths(allMonths);
    } catch (error) {
      console.error(
        "Error loading outstanding:",
        error
      );

      setError(
        "Failed to load outstanding data"
      );

      Alert.alert(
        "Error",
        "Failed to load outstanding data"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ================= LOAD USER ================= */

  useEffect(() => {
    if (user) {
      loadOutstanding(user);
    }
  }, [user]);

  /* ================= GROUP FILTER + SUMMARY ================= */

  useEffect(() => {
    /*
      Filter months by selected group.
      "All Groups" (null) shows every group.
    */
    const months = selectedGroupId
      ? pendingMonths.filter(
          (m) =>
            m.groupId === selectedGroupId
        )
      : pendingMonths;

    setFilteredMonths(months);

    /*
      Recalculate the summary cards based on
      ONLY the filtered (visible) months.
    */
    const now = new Date();

    let total = 0;
    let dueThis = 0;
    let overdue = 0;
    let paid = 0;

    for (const m of months) {
      total += m.pending;
      paid += m.effectivePaid || 0;

      if (m.isOverdue) {
        overdue +=
          m.pending + (m.lateFee || 0);
      } else if (
        m.dueDate &&
        m.dueDate.getMonth() ===
          now.getMonth() &&
        m.dueDate.getFullYear() ===
          now.getFullYear()
      ) {
        /*
          Present month due amount only.
        */
        dueThis += m.pending;
      }
    }

    setTotalOutstanding(total);
    setDueThisMonth(dueThis);
    setOverdueAmount(overdue);
    setTotalPaid(paid);
  }, [
    selectedGroupId,
    pendingMonths,
  ]);

  /* ================= REFRESH ================= */

  const handleRefresh = () => {
    setRefreshing(true);
    loadOutstanding(user);
  };

  /* ================= SELECTED GROUP NAME ================= */

  const getSelectedGroupName = () => {
    if (!selectedGroupId) {
      return "All Groups";
    }

    const group =
      groupList.find(
        (g) =>
          g.groupId === selectedGroupId
      );

    return group
      ? group.groupName
      : "All Groups";
  };

  /* ================= GROUP PENDING COUNT ================= */

  const getGroupPendingCount = (
    groupId: string
  ) => {
    return pendingMonths.filter(
      (m) =>
        m.groupId === groupId
    ).length;
  };

  /* ================= RENDER MONTH CARD ================= */

  const renderMonthCard = (
    month: any
  ) => {
    const totalDue =
      month.pending +
      (month.lateFee || 0);

    return (
      <View
        key={month.id}
        className={`bg-white rounded-2xl p-5 border shadow-sm mb-4 ${
          month.isOverdue
            ? "border-red-200"
            : "border-amber-200"
        }`}
      >
        {/* ================= HEADER ================= */}

        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <MaterialIcons
                name="account-balance-wallet"
                size={20}
                color="#024e32"
              />

              <Text className="text-lg font-bold text-gray-800 ml-2">
                {month.groupName}
              </Text>
            </View>

            <Text className="text-gray-500 text-sm ml-7">
              Group ID: {month.groupId}
            </Text>

            <Text className="text-gray-500 text-sm ml-7">
              Member ID:{" "}
              {month.groupMemberId || "—"}
            </Text>
          </View>

          <View
            className={`px-3 py-1.5 rounded-full ${
              month.isOverdue
                ? "bg-red-100"
                : "bg-amber-100"
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                month.isOverdue
                  ? "text-red-700"
                  : "text-amber-700"
              }`}
            >
              {month.isOverdue
                ? "⚠️ OVERDUE"
                : "⏳ PENDING"}
            </Text>
          </View>
        </View>

        {/* ================= AMOUNT SECTION ================= */}

        <View className="bg-gray-50 p-4 rounded-xl">
          <View className="flex-row items-center mb-3">
            <MaterialIcons
              name="calendar-today"
              size={16}
              color="#6b7280"
            />

            <Text className="text-gray-600 text-sm ml-2">
              Month {month.monthIndex} • Due:{" "}
              {month.displayDate}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-gray-500 text-xs">
                Amount Due
              </Text>

              <Text className="text-xl font-bold text-gray-800">
                ₹{month.pending}
              </Text>
            </View>

            <View className="items-center">
              <Text className="text-gray-500 text-xs">
                Status
              </Text>

              <View
                className={`px-3 py-1 rounded-full mt-1 ${
                  month.isOverdue
                    ? "bg-red-50"
                    : "bg-blue-50"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    month.isOverdue
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {month.isOverdue
                    ? `${month.daysOverdue} days overdue`
                    : `${month.daysLeft} days left`}
                </Text>
              </View>
            </View>
          </View>

          {/* ================= LATE FEE ================= */}

          {month.isOverdue &&
            month.lateFee > 0 && (
              <View className="mt-3 pt-3 border-t border-red-100">
                <View className="flex-row justify-between">
                  <Text className="text-red-600 text-sm">
                    ⚠️ Late Fee (6%)
                  </Text>

                  <Text className="text-red-600 font-semibold">
                    +₹{month.lateFee}
                  </Text>
                </View>

                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-600 text-sm">
                    Total Due
                  </Text>

                  <Text className="text-red-700 font-bold">
                    ₹{totalDue}
                  </Text>
                </View>
              </View>
            )}

          {/* ================= PAYMENT PROGRESS ================= */}

          <View className="mt-3 pt-3 border-t border-gray-200">
            <View className="flex-row justify-between mb-1">
              <Text className="text-gray-500 text-xs">
                Payment Progress
              </Text>

              <Text className="text-gray-500 text-xs">
                {month.installment > 0
                  ? Math.round(
                      (month.effectivePaid /
                        month.installment) *
                        100
                    )
                  : 0}
                %
              </Text>
            </View>

            <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${
                  month.isOverdue
                    ? "bg-red-500"
                    : "bg-[#024e32]"
                }`}
                style={{
                  width:
                    month.installment > 0
                      ? `${Math.min(
                          (month.effectivePaid /
                            month.installment) *
                            100,
                          100
                        )}%`
                      : "0%",
                }}
              />
            </View>

            <View className="flex-row justify-between mt-1">
              <Text className="text-gray-400 text-xs">
                Paid: ₹
                {month.effectivePaid}
              </Text>

              <Text className="text-gray-400 text-xs">
                Total: ₹
                {month.installment}
              </Text>
            </View>
          </View>
        </View>

        {/* ================= PAYMENT BUTTON ================= */}

        <TouchableOpacity
          className={`mt-4 py-3 rounded-xl items-center ${
            month.isOverdue
              ? "bg-red-600"
              : "bg-[#024e32]"
          }`}
          activeOpacity={0.8}
          onPress={() => {
            Alert.alert(
              "Make Payment",
              `Pay ₹${totalDue} for ${month.groupName} - Month ${month.monthIndex}`,
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Pay Now",
                  onPress: () => {
                    Alert.alert(
                      "Payment",
                      "Payment gateway will open"
                    );
                  },
                },
              ]
            );
          }}
        >
          <Text className="text-white font-semibold text-base">
            {month.isOverdue
              ? `Pay Overdue ₹${totalDue}`
              : `Pay Now ₹${month.pending}`}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /* ================= DROPDOWN MODAL ================= */

  const renderDropdownModal = () => (
    <Modal
      visible={dropdownVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() =>
        setDropdownVisible(false)
      }
    >
      <TouchableOpacity
        className="flex-1 bg-black/50 justify-center items-center"
        activeOpacity={1}
        onPress={() =>
          setDropdownVisible(false)
        }
      >
        <View className="bg-white rounded-2xl w-[90%] max-h-[70%] p-4">
          <View className="flex-row justify-between items-center mb-4 pb-3 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-800">
              Select Group
            </Text>

            <TouchableOpacity
              onPress={() =>
                setDropdownVisible(false)
              }
            >
              <MaterialIcons
                name="close"
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* ALL GROUPS */}

          <TouchableOpacity
            className={`flex-row items-center p-3 rounded-xl mb-2 ${
              !selectedGroupId
                ? "bg-[#024e32]/10"
                : ""
            }`}
            onPress={() => {
              setSelectedGroupId(null);
              setDropdownVisible(false);
            }}
          >
            <View
              className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                !selectedGroupId
                  ? "border-[#024e32]"
                  : "border-gray-300"
              }`}
            >
              {!selectedGroupId && (
                <MaterialIcons
                  name="check"
                  size={16}
                  color="#024e32"
                />
              )}
            </View>

            <View className="flex-1">
              <Text
                className={`text-base font-medium ${
                  !selectedGroupId
                    ? "text-[#024e32]"
                    : "text-gray-700"
                }`}
              >
                All Groups
              </Text>

              <Text className="text-gray-400 text-sm">
                {pendingMonths.length} pending payments
              </Text>
            </View>
          </TouchableOpacity>

          {/* GROUP LIST */}

          <FlatList
            data={groupList}
            keyExtractor={(item) =>
              item.groupId
            }
            showsVerticalScrollIndicator={true}
            renderItem={({ item }) => {
              const isSelected =
                selectedGroupId ===
                item.groupId;

              const pendingCount =
                getGroupPendingCount(
                  item.groupId
                );

              return (
                <TouchableOpacity
                  className={`flex-row items-center p-3 rounded-xl mb-2 ${
                    isSelected
                      ? "bg-[#024e32]/10"
                      : ""
                  }`}
                  onPress={() => {
                    setSelectedGroupId(
                      item.groupId
                    );
                    setDropdownVisible(false);
                  }}
                >
                  <View
                    className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                      isSelected
                        ? "border-[#024e32]"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <MaterialIcons
                        name="check"
                        size={16}
                        color="#024e32"
                      />
                    )}
                  </View>

                  <View className="flex-1">
                    <Text
                      className={`text-base font-medium ${
                        isSelected
                          ? "text-[#024e32]"
                          : "text-gray-700"
                      }`}
                    >
                      {item.groupName}
                    </Text>

                    <Text className="text-gray-400 text-sm">
                      {pendingCount} pending • ID:{" "}
                      {item.groupId}
                    </Text>
                  </View>

                  {pendingCount > 0 && (
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full">
                      <Text className="text-amber-700 text-xs font-medium">
                        {pendingCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="py-8 items-center">
                <MaterialIcons
                  name="group"
                  size={40}
                  color="#d1d5db"
                />

                <Text className="text-gray-400 mt-2">
                  No groups available
                </Text>
              </View>
            }
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  /* ================= UI ================= */

  return (
    <SafeAreaView className="flex-1 bg-[#f5f6fa]">
      {/* ================= HEADER ================= */}

      <View className="bg-[#024e32] px-5 pt-14 pb-5">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 flex-1">
            My Outstanding
          </Text>
        </View>
      </View>

      {/* ================= CONTENT ================= */}

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingBottom: 20,
        }}
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
        {loading || !user ? (
          <OutstandingSkeleton />
        ) : error ? (
          <View className="mt-10 bg-red-50 rounded-2xl p-8 items-center border border-red-200">
            <MaterialIcons
              name="error-outline"
              size={48}
              color="#dc2626"
            />

            <Text className="text-red-600 text-lg font-semibold mt-4">
              Error Loading Data
            </Text>

            <Text className="text-red-500 text-sm text-center mt-2">
              {error}
            </Text>

            <TouchableOpacity
              className="mt-4 bg-[#024e32] px-6 py-3 rounded-xl"
              onPress={() =>
                loadOutstanding(user)
              }
            >
              <Text className="text-white font-semibold">
                Try Again
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ================= GROUP SELECTOR ================= */}

            {groupList.length > 0 && (
              <View className="mt-4 mb-4">
                <TouchableOpacity
                  className="flex-row items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm"
                  onPress={() =>
                    setDropdownVisible(true)
                  }
                  activeOpacity={0.8}
                >
                  <View className="flex-row items-center flex-1">
                    <MaterialIcons
                      name="group"
                      size={22}
                      color="#024e32"
                    />

                    <View className="ml-3 flex-1">
                      <Text className="text-gray-500 text-xs">
                        Selected Group
                      </Text>

                      <Text className="text-gray-800 font-semibold text-base">
                        {getSelectedGroupName()}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center">
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full mr-2">
                      <Text className="text-amber-700 text-xs font-medium">
                        {filteredMonths.length}
                      </Text>
                    </View>

                    <MaterialIcons
                      name="arrow-drop-down"
                      size={24}
                      color="#666"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* ================= DROPDOWN ================= */}

            {renderDropdownModal()}

            {/* ================= SUMMARY ================= */}

            <View className="mt-2">
              <Text className="text-gray-500 text-sm mb-3">
                Financial Summary
              </Text>

              <View className="flex-row flex-wrap justify-between">
                {/* TOTAL DUE */}

                <View className="bg-white w-[48%] p-4 rounded-2xl shadow-sm border border-gray-100 mb-3">
                  <View className="flex-row items-center mb-2">
                    <View className="w-10 h-10 rounded-full bg-[#024e32]/10 items-center justify-center mr-2">
                      <MaterialIcons
                        name="attach-money"
                        size={20}
                        color="#024e32"
                      />
                    </View>

                    <Text className="text-gray-500 text-xs font-medium">
                      Total Due
                    </Text>
                  </View>

                  <Text className="text-2xl font-bold text-[#024e32]">
                    ₹{totalOutstanding}
                  </Text>
                </View>

                {/* THIS MONTH 

                <View className="bg-white w-[48%] p-4 rounded-2xl shadow-sm border border-gray-100 mb-3">
                  <View className="flex-row items-center mb-2">
                    <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-2">
                      <MaterialIcons
                        name="calendar-today"
                        size={20}
                        color="#3b82f6"
                      />
                    </View>

                    <Text className="text-gray-500 text-xs font-medium">
                      This Month
                    </Text>
                  </View>

                  <Text className="text-2xl font-bold text-blue-600">
                    ₹{dueThisMonth}
                  </Text>
                </View>

               OVERDUE */}

                <View className="bg-white w-[48%] p-4 rounded-2xl shadow-sm border border-red-100">
                  <View className="flex-row items-center mb-2">
                    <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center mr-2">
                      <MaterialIcons
                        name="warning"
                        size={20}
                        color="#dc2626"
                      />
                    </View>

                    <Text className="text-gray-500 text-xs font-medium">
                      Overdue
                    </Text>
                  </View>

                  <Text className="text-2xl font-bold text-red-600">
                    ₹{overdueAmount}
                  </Text>
                </View>

                {/* TOTAL PAID */}

                <View className="bg-white w-[48%] p-4 rounded-2xl shadow-sm border border-green-100">
                  <View className="flex-row items-center mb-2">
                    <View className="w-10 h-10 rounded-full bg-green-50 items-center justify-center mr-2">
                      <MaterialIcons
                        name="check-circle"
                        size={20}
                        color="#10b981"
                      />
                    </View>

                    <Text className="text-gray-500 text-xs font-medium">
                      Total Paid
                    </Text>
                  </View>

                  <Text className="text-2xl font-bold text-green-600">
                    ₹{totalPaid}
                  </Text>
                </View>
              </View>
            </View>

            {/* ================= PENDING PAYMENTS ================= */}

            <View className="mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-gray-800">
                  {selectedGroupId
                    ? getSelectedGroupName()
                    : "All Groups"}
                </Text>

                <Text className="text-gray-500 text-sm">
                  {filteredMonths.length} pending
                </Text>
              </View>

              {filteredMonths.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
                  <View className="bg-green-50 p-4 rounded-full">
                    <MaterialIcons
                      name="check-circle"
                      size={48}
                      color="#10b981"
                    />
                  </View>

                  <Text className="text-gray-700 text-lg font-semibold mt-4">
                    All Clear!
                  </Text>

                  <Text className="text-gray-400 text-sm text-center mt-1">
                    No outstanding payments for this group.
                  </Text>
                </View>
              ) : (
                filteredMonths.map(
                  (month) =>
                    renderMonthCard(month)
                )
              )}
            </View>

            {/* ================= FOOTER ================= */}

            <View className="mt-8 mb-4">
              <View className="border-t border-gray-200 pt-4 items-center">
                <Text className="text-[#024e32] font-bold text-base">
                  MANIKYA CHITS PVT LTD
                </Text>

                <Text className="text-gray-500 text-xs mt-1">
                  My Outstanding
                </Text>

                <Text className="text-gray-400 text-xs mt-1">
                  © {new Date().getFullYear()}{" "}
                  Manikya Chits Pvt Ltd. All rights reserved.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}