import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../config";

/* =========================================================
   MEMBER - VACANCIES

   Every value on these cards is read from the EXISTING data:

     chit amount / duration / subscription -> ChitScheme
     group id / capacity / members         -> Group
     instalment / dividend / pay-now       -> Group.collectionPlans
     max bid % / frequency                 -> Vacancy

   Nothing is hard-coded. A vacancy only appears while the real
   group still has a free seat:
       totalCollections - members.length > 0
========================================================= */

const formatAmount = (amount: any) =>
  `₹${parseInt(String(amount || 0), 10).toLocaleString("en-IN")}`;

/** ₹5,00,000 -> "5L" ,  ₹45,00,000 -> "45L" ,  ₹1,20,00,000 -> "1.2Cr" */
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
   AUCTION HELPERS (same logic as the Bid Room Notifications
   page, reused here purely for the read-only countdown box)
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

  const pulse = React.useRef(new Animated.Value(1)).current;

  /* -------- tick every second -------- */
  React.useEffect(() => {
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
  React.useEffect(() => {
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
export default function MemberVacancy() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [userid, setUserid] = useState<string | null>(null);
  const [vacancies, setVacancies] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [banner, setBanner] = useState("");
  const [bannerType, setBannerType] = useState<"success" | "error">("success");

  const flash = (text: string, type: "success" | "error" = "success") => {
    setBanner(text);
    setBannerType(type);
    setTimeout(() => setBanner(""), 4000);
  };

  /* ================= SESSION GUARD ================= */
  const loadVacancies = async (uid: string | null) => {
    try {
      setError("");

      const url = uid
        ? `${BACKEND_URL}/vacancy/open?userid=${encodeURIComponent(uid)}`
        : `${BACKEND_URL}/vacancy/open`;

      const res = await fetch(url);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setVacancies(list);

      /* Opening this page marks every vacancy published so far
         as seen, so the red badge on the Menu card clears and
         only comes back when the admin publishes a new one. */
      await AsyncStorage.setItem(
        "lastSeenVacancyAt",
        new Date().toISOString()
      );

      return list;
    } catch (err) {
      console.log("Load vacancies error:", err);
      setError("Could not connect to server");
      return null;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* Reuses the existing, unmodified GET /notifications endpoint
     purely to know which group has a currently-running auction. */
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

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const boot = async () => {
        const stored = await AsyncStorage.getItem("loggedUser");

        if (!stored) {
          router.replace("/");
          return;
        }

        const parsed = JSON.parse(stored);

        if (!active) return;

        setUserid(parsed?.userid || null);
        await Promise.all([
          loadVacancies(parsed?.userid || null),
          loadNotifications(),
        ]);
      };

      boot();

      return () => {
        active = false;
      };
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([loadVacancies(userid), loadNotifications()]);
  };

  /* Refreshes this one vacancy's numbers from the server the moment
     "Subscribe" is tapped, so the confirmation modal can never show a
     stale dividend/instalment/pay-now figure. Opens instantly with
     whatever we already have, then swaps in the fresh record. */
  const handleSubscribeTap = async (v: any) => {
    setConfirmTarget(v);
    setConfirmLoading(true);
    try {
      const fresh = await loadVacancies(userid);
      const updated = fresh?.find((x: any) => x._id === v._id);
      if (updated) setConfirmTarget(updated);
    } finally {
      setConfirmLoading(false);
    }
  };

  /* ================= SUBSCRIBE ================= */
  const submitSubscribe = async () => {
    if (!confirmTarget || !userid) return;

    setSubscribing(true);

    try {
      /* Only the vacancy and the logged in userid are sent.
         The backend resolves the member's real name, phone and
         address from the Member collection itself. */
      const res = await fetch(`${BACKEND_URL}/vacancy/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vacancyId: confirmTarget._id,
          userid,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setConfirmTarget(null);
        flash(data?.message || "Could not send request", "error");
        return;
      }

      setConfirmTarget(null);
      flash(
        "Subscription request sent. Admin will review and add you to the group."
      );

      await loadVacancies(userid);
    } catch (err) {
      console.log("Subscribe error:", err);
      setConfirmTarget(null);
      flash("Could not reach the server", "error");
    } finally {
      setSubscribing(false);
    }
  };

  /* Total the member pays on joining */
  /* Full amount payable now — dividend is NOT subtracted here. The
     dividend is cash the admin returns separately after joining, not
     a discount on the joining payment. */
  const payNow =
    Number(
      confirmTarget?.joiningPayNowAmount ?? confirmTarget?.payNowAmount ?? 0
    ) + Number(confirmTarget?.dividend || 0);

  /* ================= UI ================= */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/menu"); // <- put your real member home/menu route here
              }
            }}
            className="mt-1"
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Vacancies
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 130, paddingBottom: 24 }}
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
          {/* BANNER */}
          {banner ? (
            <View
              className={`mb-4 border rounded-xl py-3 px-4 ${
                bannerType === "success"
                  ? "bg-green-50 border-green-400"
                  : "bg-red-50 border-red-400"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  bannerType === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {banner}
              </Text>
            </View>
          ) : null}

          {loading ? (
            <>
              <VacancyCardSkeleton />
              <VacancyCardSkeleton />
              <VacancyCardSkeleton />
            </>
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
              <Text className="text-gray-400 mt-1 text-xs text-center px-8">
                A vacancy appears here only while its group still has a free seat
              </Text>
              <TouchableOpacity
                onPress={onRefresh}
                className="flex-row items-center bg-gray-100 px-4 py-2 rounded-lg mt-4"
              >
                <MaterialIcons name="refresh" size={20} color="#666" />
                <Text className="text-gray-600 ml-2">Refresh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text className="text-gray-500 text-xs mb-3">
                {vacancies.length} vacanc{vacancies.length === 1 ? "y" : "ies"}{" "}
                available
              </Text>

              {vacancies.map((v) => (
                <VacancyCard
                  key={v._id}
                  vacancy={v}
                  activeNotification={findActiveNotification(v, notifications)}
                  onSubscribe={() => handleSubscribeTap(v)}
                />
              ))}
            </>
          )}

          {/* FOOTER */}
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

      {/* =====================================================
          CONFIRM SUBSCRIBE
      ===================================================== */}
      <Modal
        visible={!!confirmTarget}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!subscribing) setConfirmTarget(null);
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            {/* ============ HERO ============ */}
            <View className="bg-[#024e32] px-6 pt-7 pb-6 items-center">
              <View className="w-16 h-16 rounded-full bg-white/15 items-center justify-center">
                <MaterialIcons name="how-to-reg" size={34} color="white" />
              </View>

              <Text className="text-white text-lg font-bold mt-3">
                Confirm Subscription
              </Text>

              <Text className="text-green-100 text-xs mt-1 text-center">
                Group {confirmTarget?.groupId} ·{" "}
                {confirmTarget?.availableSeats} seat
                {confirmTarget?.availableSeats === 1 ? "" : "s"} left
              </Text>

              <Text className="text-white text-3xl font-extrabold mt-4">
                {formatAmount(confirmTarget?.chitAmount)}
              </Text>

              <Text className="text-green-100 text-[11px] mt-0.5">
                Chit value
              </Text>
            </View>

            <ScrollView
              className="max-h-[45%]"
              showsVerticalScrollIndicator={false}
            >
              <View className="px-6 pt-5">
                {/* ============ PLAN ============ */}
                <Text className="text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                  Plan
                </Text>

                <View className="bg-gray-50 rounded-2xl px-4 py-2 mb-4">
                  <DetailRow
                    label="Frequency"
                    value={confirmTarget?.frequency}
                  />
                  <DetailRow
                    label="Subscription"
                    value={`${formatAmount(
                      confirmTarget?.subscriptionAmount
                    )}${frequencySuffix(confirmTarget?.frequency)}`}
                  />
                  <DetailRow
                    label="Max bid"
                    value={`${confirmTarget?.maxBidPercent}%`}
                  />
                </View>

                {/* ============ PAYMENT ============ */}
                <Text className="text-gray-400 text-[10px] font-bold tracking-wider uppercase mb-2">
                  Payment on joining
                </Text>

                <View className="bg-gray-50 rounded-2xl px-4 py-2">
                  <DetailRow
                    label="Previous instalments"
                    value={formatAmount(
                      confirmTarget?.previousInstalmentsAmount
                    )}
                  />
                  <DetailRow
                    label="Current instalment"
                    value={formatAmount(
                      Number(confirmTarget?.currentPayableAmount || 0) +
                        Number(confirmTarget?.dividend || 0)
                    )}
                  />
                </View>

              {Number(confirmTarget?.totalDividendSoFar || 0) > 0 && (
                  <View className="flex-row bg-green-50 border border-green-200 rounded-2xl p-3 mt-3">
                   {/* <MaterialIcons
                      name="currency-rupee"
                      size={16}
                      color="#15803d"
                    /> */}
                    <Text className="flex-1 ml-2 text-green-800 text-[11px] leading-4">
                     {/* A dividend of{" "}
                       {formatAmount(confirmTarget?.totalDividendSoFar)}  will be
                      given back to you in cash by the admin after you join 
                      it is not deducted from the amount below. */}
                      The admin will pay you a cash dividend after you join; this is not
                      deducted from the amount below.
                    </Text>
                  </View>
                )}

               {/* {confirmLoading && (
                  <View className="flex-row items-center justify-center mt-2">
                    <ActivityIndicator size="small" color="#e8501f" />
                    <Text className="text-gray-400 text-[10px] ml-2">
                      Checking latest amount...
                    </Text>
                  </View>
                )} */}

                {/* PAYABLE HIGHLIGHT */}
                <View className="flex-row items-center justify-between bg-[#fff1eb] border border-[#f6c5b0] rounded-2xl px-4 py-3.5 mt-3">
                  <View>
                    <Text className="text-[#a2570f] text-[11px] font-semibold">
                      You pay now
                    </Text>
                    <Text className="text-[#a2570f]/70 text-[10px] mt-0.5">
                      Payable to join this group
                    </Text>
                  </View>

                  <Text className="text-[#e8501f] text-2xl font-extrabold">
                    {formatAmount(payNow)}
                  </Text>
                </View>

                {/* NOTE */}
                <View className="flex-row bg-blue-50 border border-blue-200 rounded-2xl p-3 mt-4">
                  <MaterialIcons
                    name="info-outline"
                    size={18}
                    color="#1d4ed8"
                  />
                  <Text className="flex-1 ml-2 text-blue-800 text-[11px] leading-4">
                    This only sends a request to the admin. You are not added to
                    the group and nothing is charged until the admin approves it.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* ============ BUTTONS ============ */}
            <View className="px-6 pt-4 pb-6">
              <TouchableOpacity
                onPress={submitSubscribe}
                disabled={subscribing}
                activeOpacity={0.85}
                className={`py-4 rounded-2xl ${
                  subscribing ? "bg-gray-400" : "bg-[#024e32]"
                }`}
              >
                {subscribing ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-bold ml-2">
                      Sending request...
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <MaterialIcons name="send" size={19} color="white" />
                    <Text className="text-white text-center font-bold text-base ml-2">
                      Yes, send request
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setConfirmTarget(null)}
                disabled={subscribing}
                activeOpacity={0.85}
                className="py-4 rounded-2xl mt-3 bg-gray-100"
              >
                <Text className="text-gray-700 text-center font-semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   VACANCY CARD
========================================================= */

function VacancyCard({
  vacancy,
  activeNotification,
  onSubscribe,
}: {
  vacancy: any;
  activeNotification?: any;
  onSubscribe: () => void;
}) {
  const seats = Number(vacancy.availableSeats || 0);
  const capacity = Number(vacancy.capacity || 0);
  const filled = Number(vacancy.filledSeats || 0);

  const current = Number(vacancy.currentInstalment || 0);
  const total = Number(vacancy.totalInstalments || 0);

  const progress = total > 0 ? Math.min(current / total, 1) : 0;

  // Full amount payable now — dividend is NOT subtracted. The dividend
  // is cash the admin returns separately after joining, shown alongside
  // as its own figure, never netted against what's paid now.
  const totalPaidSoFar =
    Number(vacancy.joiningPayNowAmount ?? vacancy.payNowAmount ?? 0) +
    Number(vacancy.dividend || 0);
  const totalDividendSoFar = Number(vacancy.totalDividendSoFar || 0);

  /* Ribbon is derived from the REAL fill rate, not hard-coded */
  const fillRate = capacity > 0 ? filled / capacity : 0;
  const ribbon = fillRate >= 0.8 ? "Trending" : "Popular";

  const disabled = vacancy.myRequestStatus === "Pending";

  const buttonLabel =
    vacancy.myRequestStatus === "Pending" ? "Request pending" : "Subscribe";

  return (
    <View className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden">
      {/* ================= TOP ================= */}
      <View className="flex-row p-5 pb-3">
        {/* COIN BADGE */}
        <View className="w-12 h-12 rounded-full bg-[#f8e3cf] border-2 border-[#d99a5b] items-center justify-center">
          <Text className="text-[#a2570f] font-extrabold text-xs">
            {shortAmount(vacancy.chitAmount)}
          </Text>
        </View>

        <View className="flex-1 ml-3">
          {/* AMOUNT */}
          <View className="flex-row items-end">
            <Text className="text-[#e8501f] text-2xl font-extrabold">
              {formatAmount(vacancy.chitAmount)}
            </Text>
            <Text className="text-gray-500 text-sm font-semibold ml-1.5 mb-0.5">
              Chit
            </Text>
          </View>

          {/* CHIPS */}
          <View className="flex-row flex-wrap mt-2">
            <Chip text={vacancy.groupId} />
            <Chip text={`Max bid ${vacancy.maxBidPercent}%`} />
            <Chip text={vacancy.frequency} />
          </View>
        </View>

        {/* RIBBON + SEATS */}
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

      {/* ================= FIGURES ================= */}
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

        {/* was double-nested, flattened to one View */}
        <View className="flex-1 pl-2 items-end">
          <Text className="text-gray-500 text-xs">You paying now</Text>

          <Text className="text-gray-900 text-lg font-bold mt-1">
            {formatAmount(totalPaidSoFar)}
          </Text>
        </View>
      </View>

      {/* ================= INSTALMENT + SUBSCRIBE ================= */}
      <View className="flex-row items-center px-5 py-4">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center">
            <Text className="text-gray-500 text-xs leading-4 w-16">
              Running{"\n"}Instalment
            </Text>

            <Text className="text-gray-900 font-bold ml-1">
              {String(Math.max(current, 0)).padStart(2, "0")}
            </Text>
          </View>

          {/* PROGRESS BAR */}
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

        <TouchableOpacity
          onPress={onSubscribe}
          disabled={disabled}
          activeOpacity={0.85}
          className={`flex-row items-center rounded-full border px-4 py-2.5 ${
            disabled
              ? "border-gray-300 bg-gray-100"
              : "border-[#e8501f] bg-white"
          }`}
        >
          <Text
            className={`font-bold mr-2 ${
              disabled ? "text-gray-500 text-xs" : "text-[#e8501f]"
            }`}
          >
            {buttonLabel}
          </Text>

          {!disabled && (
            <View className="w-7 h-7 rounded-full bg-[#e8501f] items-center justify-center">
              <MaterialIcons name="chevron-right" size={20} color="white" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ================= FOOTER STRIP ================= */}
      <View className="bg-[#f4f6f8] px-5 py-2.5">
        <Text className="text-gray-500 text-xs">
          Currently there {filled === 1 ? "is" : "are"} {filled} subscriber
          {filled === 1 ? "" : "s"} out of {capacity}.
        </Text>

        {vacancy.alreadyInGroup ? (
          <Text className="mt-1 text-[10px] text-green-600">
            You are already in a group
          </Text>
        ) : null}
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

function DetailRow({ label, value }: { label: string; value: any }) {
  return (
    <View className="flex-row justify-between items-center py-2">
      <Text className="text-gray-600 text-sm">{label}</Text>
      <Text className="text-gray-900 font-semibold text-sm">
        {value === undefined || value === null || value === "" ? "-" : value}
      </Text>
    </View>
  );
}