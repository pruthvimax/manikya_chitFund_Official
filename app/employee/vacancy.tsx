// app/employee/vacancy.tsx

import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../../config";

/* =========================================================
   EMPLOYEE - VACANCIES (read-only view, no Subscribe button)

   Adapted from the Member Vacancy page. Values are read from
   the SAME /vacancy/employee-open endpoint the Member page's
   /vacancy/open uses under the hood (same getOpenVacancies
   controller) - only gated by canViewVacancy via the new
   checkVacancyAccess middleware.

   COUNTDOWN: reuses the exact same /notifications GET-all
   endpoint and CountdownTimer logic as the Member "Bid Room
   Notifications" page - no backend changes needed for this,
   just matched client-side by groupId.
========================================================= */

const formatAmount = (amount: any) =>
  `₹${parseInt(String(amount || 0), 10).toLocaleString("en-IN")}`;

const shortAmount = (amount: any) => {
  const n = Number(amount || 0);
  if (n >= 10000000) {
    const cr = n / 10000000;
    return `${cr % 1 === 0 ? cr : cr.toFixed(1)}Cr`;
  }
  if (n >= 100000) {
    const l = n / 100000;
    return `${l % 1 === 0 ? l : l.toFixed(1)}L`;
  }
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`;
  }
  return String(n);
};

const frequencySuffix = (frequency: string) => {
  if (frequency === "Daily") return "/D";
  if (frequency === "Weekly") return "/W";
  return "/M";
};

/* =========================================================
   AUCTION HELPERS (same logic as UserNotifications.tsx)
========================================================= */

const isAuctionLive = (n: any) => {
  if (!n?.auctionEndDate || !n?.auctionEndTime) return false;

  try {
    const dateParts = String(n.auctionEndDate).split("-");
    const timeParts = String(n.auctionEndTime).split(":");

    if (dateParts.length !== 3 || timeParts.length !== 2) return false;

    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);

    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    const targetDate = new Date(year, month, day, hours, minutes, 0, 0);

    return targetDate.getTime() > Date.now();
  } catch (error) {
    return false;
  }
};

/* Matches a vacancy to its group's currently-running auction, if any. */
const findActiveNotification = (vacancy: any, notifications: any[]) => {
  return notifications.find((n: any) => {
    const notifGroupCode = n?.groupId?.groupId || n?.groupId || "";
    return (
      n?.status === "active" &&
      notifGroupCode &&
      notifGroupCode === vacancy?.groupId &&
      isAuctionLive(n)
    );
  });
};

/* =========================================================
   COUNTDOWN TIMER  (compact "LIVE BIDDING" pill)

   - slim single row instead of a big block
   - pulsing live dot
   - tiny digit boxes with HRS / MIN / SEC labels
   Same look & feel as the Member Vacancy page.
========================================================= */

function Colon({ expired }: { expired?: boolean }) {
  return (
    <Text
      className={`font-mono font-bold text-[12px] mx-[1px] mt-[4px] ${
        expired ? "text-red-300" : "text-green-200/60"
      }`}
    >
      :
    </Text>
  );
}

function TimeBox({
  value,
  label,
  expired,
}: {
  value: number;
  label: string;
  expired?: boolean;
}) {
  return (
    <View className="items-center mx-[3px]">
      <View
        style={{ minWidth: 30 }}
        className={`rounded-lg px-[7px] py-[3px] items-center border ${
          expired
            ? "bg-red-100 border-red-200"
            : "bg-white/10 border-white/15"
        }`}
      >
        <Text
          className={`font-mono font-bold text-[13px] ${
            expired ? "text-red-600" : "text-white"
          }`}
        >
          {String(value).padStart(2, "0")}
        </Text>
      </View>

      <Text
        className={`text-[8px] mt-[3px] font-semibold tracking-widest ${
          expired ? "text-red-400" : "text-green-200/70"
        }`}
      >
        {label}
      </Text>
    </View>
  );
}

function CountdownTimer({
  auctionEndDate,
  auctionEndTime,
}: {
  auctionEndDate: string;
  auctionEndTime: string;
}) {
  const [parts, setParts] = useState({ d: 0, h: 0, m: 0, s: 0 });
  const [isExpired, setIsExpired] = useState(false);

  const pulse = useRef(new Animated.Value(1)).current;

  /* -------- tick every second -------- */
  useEffect(() => {
    const tick = () => {
      if (!auctionEndDate || !auctionEndTime) return;

      try {
        const dateParts = String(auctionEndDate).split("-");
        const timeParts = String(auctionEndTime).split(":");

        if (dateParts.length !== 3 || timeParts.length !== 2) return;

        const target = new Date(
          parseInt(dateParts[2], 10), // year
          parseInt(dateParts[1], 10) - 1, // month
          parseInt(dateParts[0], 10), // day
          parseInt(timeParts[0], 10), // hours
          parseInt(timeParts[1], 10), // minutes
          0,
          0
        );

        if (isNaN(target.getTime())) return;

        const diff = target.getTime() - Date.now();

        if (diff <= 0) {
          setIsExpired(true);
          setParts({ d: 0, h: 0, m: 0, s: 0 });
          return;
        }

        setIsExpired(false);

        const totalSeconds = Math.floor(diff / 1000);

        setParts({
          d: Math.floor(totalSeconds / 86400),
          h: Math.floor((totalSeconds % 86400) / 3600),
          m: Math.floor((totalSeconds % 3600) / 60),
          s: totalSeconds % 60,
        });
      } catch (error) {
        /* keep last known values */
      }
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [auctionEndDate, auctionEndTime]);

  /* -------- pulsing live dot -------- */
  useEffect(() => {
    if (isExpired) {
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.2,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [isExpired, pulse]);

  if (!auctionEndTime) return null;

  return (
    <View
      className={`mx-5 mb-3 rounded-2xl px-3 py-2 flex-row items-center justify-between border ${
        isExpired
          ? "bg-red-50 border-red-200"
          : "bg-[#024e32] border-[#0a6b45]"
      }`}
    >
      {/* LEFT — status */}
      <View className="flex-row items-center">
        {isExpired ? (
          <MaterialIcons name="timer-off" size={14} color="#dc2626" />
        ) : (
          <Animated.View
            style={{ opacity: pulse }}
            className="w-[7px] h-[7px] rounded-full bg-[#ff5a3c]"
          />
        )}

        <Text
          className={`ml-2 text-[10px] font-extrabold tracking-widest ${
            isExpired ? "text-red-600" : "text-white"
          }`}
        >
          {isExpired ? "AUCTION ENDED" : "LIVE BIDDING"}
        </Text>
      </View>

      {/* RIGHT — compact digits */}
      <View className="flex-row items-start">
        {parts.d > 0 && (
          <>
            <TimeBox value={parts.d} label="DAYS" expired={isExpired} />
            <Colon expired={isExpired} />
          </>
        )}

        <TimeBox value={parts.h} label="HRS" expired={isExpired} />
        <Colon expired={isExpired} />
        <TimeBox value={parts.m} label="MIN" expired={isExpired} />
        <Colon expired={isExpired} />
        <TimeBox value={parts.s} label="SEC" expired={isExpired} />
      </View>
    </View>
  );
}

/* ================= SKELETON ================= */
function useSkeletonPulse() {
  const opacity = React.useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
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

function SkeletonBox({ style = {} }: { style?: object }) {
  const opacity = useSkeletonPulse();
  return (
    <Animated.View
      className="bg-gray-200 rounded-lg"
      style={[{ opacity }, style]}
    />
  );
}

function VacancyCardSkeleton() {
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
      <View className="flex-row items-center">
        <SkeletonBox style={{ width: 46, height: 46, borderRadius: 23 }} />
        <View className="ml-3 flex-1">
          <SkeletonBox style={{ width: 170, height: 22 }} />
          <View className="flex-row mt-2">
            <SkeletonBox style={{ width: 70, height: 18, marginRight: 8 }} />
            <SkeletonBox style={{ width: 80, height: 18, marginRight: 8 }} />
            <SkeletonBox style={{ width: 60, height: 18 }} />
          </View>
        </View>
      </View>
      <View className="flex-row justify-between mt-5">
        <SkeletonBox style={{ width: 90, height: 42 }} />
        <SkeletonBox style={{ width: 90, height: 42 }} />
        <SkeletonBox style={{ width: 90, height: 42 }} />
      </View>
      <SkeletonBox style={{ width: "100%", height: 44, marginTop: 18 }} />
    </View>
  );
}

/* ================= MAIN ================= */
export default function EmployeeVacancy() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [empId, setEmpId] = useState<string | null>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/notifications`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load notifications error:", err);
      setNotifications([]);
    }
  };

  const loadVacancies = async (id: string) => {
    try {
      setError("");
      setAccessDenied(false);

      const res = await fetch(
        `${BACKEND_URL}/vacancy/employee-open?emp_id=${encodeURIComponent(id)}`
      );

      if (res.status === 403) {
        setAccessDenied(true);
        setVacancies([]);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setVacancies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load vacancies error:", err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const boot = async () => {
        const stored = await AsyncStorage.getItem("employee");

        if (!stored) {
          router.replace("/employee/login");
          return;
        }

        const parsed = JSON.parse(stored);
        if (!active) return;

        setEmpId(parsed?.emp_id || null);

        if (parsed?.emp_id) {
          await Promise.all([
            loadVacancies(parsed.emp_id),
            loadNotifications(),
          ]);
        }
      };

      boot();

      return () => {
        active = false;
      };
    }, [])
  );

  const onRefresh = () => {
    if (!empId) return;
    setRefreshing(true);
    Promise.all([loadVacancies(empId), loadNotifications()]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mt-1">
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Vacancies
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className={isWide ? "px-8" : "px-4"}>
          {loading ? (
            <>
              <VacancyCardSkeleton />
              <VacancyCardSkeleton />
              <VacancyCardSkeleton />
            </>
          ) : accessDenied ? (
            <View className="py-20 items-center">
              <MaterialIcons name="lock-outline" size={54} color="#dc2626" />
              <Text className="text-red-600 mt-4 text-base text-center px-8">
                Vacancy access is currently disabled for your account.
              </Text>
              <Text className="text-gray-400 mt-1 text-xs text-center px-8">
                Contact your admin if you believe this is a mistake.
              </Text>
            </View>
          ) : error ? (
            <View className="py-20 items-center">
              <MaterialIcons name="error-outline" size={50} color="#dc2626" />
              <Text className="text-red-600 mt-4 text-base">{error}</Text>
              <TouchableOpacity
                onPress={onRefresh}
                className="bg-[#024e32] px-6 py-3 rounded-xl mt-4"
              >
                <Text className="text-white font-medium">Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : vacancies.length === 0 ? (
            <View className="py-20 items-center">
              <MaterialIcons name="event-seat" size={60} color="#ccc" />
              <Text className="text-gray-500 mt-4 text-base">
                No vacancies available right now
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-gray-500 text-xs mb-3">
                {vacancies.length} vacanc{vacancies.length === 1 ? "y" : "ies"}{" "}
                available
              </Text>

              {vacancies.map((v) => (
                <EmployeeVacancyCard
                  key={v._id}
                  vacancy={v}
                  activeNotification={findActiveNotification(v, notifications)}
                />
              ))}
            </>
          )}

          <View className="mt-8 mb-6">
            <View className="border-t border-gray-200 pt-4 items-center">
              <Text className="text-[#024e32] font-bold text-base">
                MANIKYA CHITS PVT LTD
              </Text>
              <Text className="text-gray-500 text-xs mt-1">Vacancies</Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights
                reserved.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ================= VACANCY CARD (read-only, no Subscribe) ================= */
function EmployeeVacancyCard({
  vacancy,
  activeNotification,
}: {
  vacancy: any;
  activeNotification?: any;
}) {
  const seats = Number(vacancy.availableSeats || 0);
  const capacity = Number(vacancy.capacity || 0);
  const filled = Number(vacancy.filledSeats || 0);

  const current = Number(vacancy.currentInstalment || 0);
  const total = Number(vacancy.totalInstalments || 0);
  const progress = total > 0 ? Math.min(current / total, 1) : 0;

  // Full running-instalment total (no dividend subtracted) and the
  // full accumulated dividend for the elapsed instalments — these
  // are shown independently, not netted against each other.
  const totalPaidSoFar = current * Number(vacancy.subscriptionAmount || 0);
  const totalDividendSoFar = Number(vacancy.totalDividendSoFar || 0);

  const fillRate = capacity > 0 ? filled / capacity : 0;
  const ribbon = fillRate >= 0.8 ? "Trending" : "Popular";

  return (
    <View className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden">
      <View className="flex-row p-5 pb-3">
        <View className="w-12 h-12 rounded-full bg-[#f8e3cf] border-2 border-[#d99a5b] items-center justify-center">
          <Text className="text-[#a2570f] font-extrabold text-xs">
            {shortAmount(vacancy.chitAmount)}
          </Text>
        </View>

        <View className="flex-1 ml-3">
          <View className="flex-row items-end">
            <Text className="text-[#e8501f] text-2xl font-extrabold">
              {formatAmount(vacancy.chitAmount)}
            </Text>
            <Text className="text-gray-500 text-sm font-semibold ml-1.5 mb-0.5">
              Chit
            </Text>
          </View>

          <View className="flex-row flex-wrap mt-2">
            <Chip text={vacancy.groupId} />
            <Chip text={`Max bid ${vacancy.maxBidPercent}%`} />
            <Chip text={vacancy.frequency} />
          </View>
        </View>

        <View className="items-end ml-2">
          <View className="border border-green-500 rounded-l-md px-2 py-0.5">
            <Text className="text-green-700 text-[11px] font-semibold">
              {ribbon}
            </Text>
          </View>
          <Text className="text-[#e8501f] text-sm font-bold mt-3">
            {seats} ticket{seats === 1 ? "" : "s"} left
          </Text>
        </View>
      </View>

      {/* LIVE BIDDING COUNTDOWN - only when admin has an active,
          not-yet-expired auction notification for this group */}
      {activeNotification && (
        <CountdownTimer
          auctionEndDate={activeNotification.auctionEndDate}
          auctionEndTime={activeNotification.auctionEndTime}
        />
      )}

      <View className="flex-row px-5 pb-1">
        <View className="flex-1 pr-2">
          <Text className="text-gray-500 text-xs">Subscription</Text>
          <View className="flex-row items-end mt-1">
            <Text className="text-gray-900 text-lg font-bold">
              {formatAmount(vacancy.subscriptionAmount)}
            </Text>
            <Text className="text-gray-500 text-xs font-semibold ml-1 mb-1">
              {frequencySuffix(vacancy.frequency)}
            </Text>
          </View>
        </View>

        <View className="w-px bg-gray-200 my-1" />

        <View className="flex-1 px-2">
          <Text className="text-gray-500 text-xs">Get Instant Dividend</Text>
          <Text className="text-[#e8501f] text-lg font-bold mt-1">
            {totalDividendSoFar > 0
              ? ` ${formatAmount(totalDividendSoFar)}`
              : formatAmount(0)}
          </Text>
        </View>

        <View className="w-px bg-gray-200 my-1" />

        <View className="flex-1 pl-2 items-end">
          <Text className="text-gray-500 text-xs">Pay now (member)</Text>
          <Text className="text-gray-900 text-lg font-bold mt-1">
            {formatAmount(totalPaidSoFar)}
          </Text>
        </View>
      </View>

      <View className="px-5 py-4">
        <View className="flex-row items-center">
          <Text className="text-gray-500 text-xs leading-4 w-16">
            Running{"\n"}Instalment
          </Text>
          <Text className="text-gray-900 font-bold ml-1">
            {String(Math.max(current, 0)).padStart(2, "0")}
          </Text>
        </View>

        <View className="flex-row items-center mt-2">
          <View className="flex-1 h-1.5 bg-gray-300 rounded-full overflow-hidden">
            <View
              className="h-1.5 bg-[#e8501f] rounded-full"
              style={{ width: `${Math.max(progress * 100, 4)}%` }}
            />
          </View>
          <Text className="text-gray-700 text-xs font-semibold ml-2">
            {total}
          </Text>
        </View>
      </View>

      <View className="bg-[#f4f6f8] px-5 py-2.5">
        <Text className="text-gray-500 text-xs">
          Currently there {filled === 1 ? "is" : "are"} {filled} subscriber
          {filled === 1 ? "" : "s"} out of {capacity}.
        </Text>
      </View>

      {vacancy.details ? (
        <View className="px-5 pb-3 pt-1">
          <Text className="text-gray-600 text-xs">{vacancy.details}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Chip({ text }: { text: any }) {
  return (
    <View className="bg-gray-100 rounded-md px-2.5 py-1 mr-2 mb-1">
      <Text className="text-gray-700 text-xs font-medium">{text}</Text>
    </View>
  );
}