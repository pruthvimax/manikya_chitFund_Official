import Slider from "@react-native-community/slider";
import React, {
  useEffect,
  useRef,
  useState
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

  import { MaterialIcons } from "@expo/vector-icons";

  import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";



  import BACKEND_URL from "../config";
import SpinnerAutoOpen from "../components/spinner/SpinnerAutoOpen";
import { AppState } from "react-native";

  const { width } = Dimensions.get("window");

  const isTablet = width >= 768;

  /* =====================================================
    SHARED SIZE SCALE

    One set of numbers used on BOTH platforms, applied with
    explicit fontSize instead of relying on class defaults,
    and with allowFontScaling turned off - so an iPhone and an
    Android phone render the same card at the same size no
    matter what the user's system font setting is.
  ===================================================== */

  const S = {
    headerTitle: isTablet ? 20 : 17,
    headerSub: 11,

    cardTitle: 14,
    sectionTitle: 15,

    label: 9,
    value: 13,
    valueLg: 17,
    big: 19,

    body: 12,
    small: 11,
    tiny: 9,

    countdown: isTablet ? 19 : 15,

    iconBack: 22,
    iconMd: 20,
    iconSm: 16,

    cardRadius: 20,
    cardPad: 16,
    gap: 12,
  };

  /* Text that never scales with the OS font setting, so both
     platforms stay identical. */
  const TXT = { allowFontScaling: false } as const;

  /* =====================================================
    BID TYPE
  ===================================================== */

  type Bid = {
    _id: string;
    groupId: string;
    chitId?: string;
    memberId: string;
    groupMemberId: string;
    bidAmount: number;
    auctionDate: string;
    auctionTime: string;
    bidTime: string;
  };

  /* =====================================================
    PAGE
  ===================================================== */

  /* =====================================================
    MODULE SCOPE HELPERS + COMPONENTS

    IMPORTANT (Android crash fix):
    These were previously declared INSIDE CustomerBidRoom.
    A component declared inside another component gets a NEW
    identity on every render, so React unmounted + remounted
    the whole subtree on every countdown tick (1 second).
    That constant remount of NativeWind (css-interop) views is
    what produced the "Couldn't find a navigation context" crash.

    The code itself is UNCHANGED - only its location.
  ===================================================== */

    /* =====================================================
      FORMAT AMOUNT
    ===================================================== */

    const formatAmount = (amount: number) => {
      return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
    };

    /* =====================================================
      FORMAT BID TIME
    ===================================================== */

    const formatTime = (value: string) => {
      if (!value) return "-";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    };

    /* =====================================================
      FORMAT BID DATE  (DD/MM/YYYY)
      Shown with the time on every bid bubble.
    ===================================================== */

    const formatDate = (value: string) => {
      if (!value) return "-";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "-";
      }

      const dd = String(date.getDate()).padStart(2, "0");
      const mm = String(date.getMonth() + 1).padStart(2, "0");

      return `${dd}/${mm}/${date.getFullYear()}`;
    };

    /* =====================================================
      PARSE DATE
      
      Supported:
      DD-MM-YYYY
      DD/MM/YYYY
      DD-MM-YY
      DD/MM/YY
    ===================================================== */

    const parseDateParts = (dateStr: string) => {
      if (!dateStr) return null;

      const cleaned = dateStr.trim();

      let parts: string[] = [];

      if (cleaned.includes("/")) {
        parts = cleaned.split("/");
      } else if (cleaned.includes("-")) {
        parts = cleaned.split("-");
      } else {
        return null;
      }

      if (parts.length !== 3) {
        return null;
      }

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);

      if (
        !Number.isFinite(day) ||
        !Number.isFinite(month) ||
        !Number.isFinite(year)
      ) {
        return null;
      }

      if (year < 100) {
        year += 2000;
      }

      return {
        day,
        month: month - 1,
        year,
      };
    };

    /* =====================================================
      SMALL UI PIECES (module scope - never declared inside
      the page component, so they keep a stable identity)
    ===================================================== */

    const Footer = () => (
      <View style={{ alignItems: "center", paddingTop: 18, paddingBottom: 12 }}>
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#CBD5D1",
            marginBottom: 14,
          }}
        />

        <Text
          {...TXT}
          style={{
            fontSize: S.cardTitle,
            fontWeight: "800",
            color: "#024E32",
            letterSpacing: 1.2,
          }}
        >
          MANIKYA CHITS PVT LTD
        </Text>

        <Text
          {...TXT}
          style={{
            fontSize: S.small,
            color: "#6B7C74",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          Secure • Transparent • Trusted
        </Text>

        <Text
          {...TXT}
          style={{
            fontSize: S.tiny,
            color: "#9AA8A1",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>
      </View>
    );

    /* one box of the big countdown (days / hours / minutes / seconds) */
    const TimeBox = ({ value, label, ended }: any) => (
      <View
        style={{
          flex: 1,
          marginHorizontal: 4,
          alignItems: "center",
          borderRadius: 16,
          paddingVertical: 12,
          backgroundColor: ended
            ? "#FEE2E2"
            : "rgba(255,255,255,0.13)",
          borderWidth: 1,
          borderColor: ended
            ? "#FECACA"
            : "rgba(255,255,255,0.20)",
        }}
      >
        <Text
          {...TXT}
          style={{
            fontSize: isTablet ? 32 : 26,
            fontWeight: "800",
            color: ended ? "#B91C1C" : "#FFFFFF",
          }}
        >
          {value}
        </Text>

        <Text
          {...TXT}
          style={{
            fontSize: 9,
            fontWeight: "700",
            letterSpacing: 1.4,
            marginTop: 2,
            color: ended ? "#DC2626" : "rgba(255,255,255,0.72)",
          }}
        >
          {label}
        </Text>
      </View>
    );

    /* one small summary tile (chit amount / total bids / highest bid) */
    const StatTile = ({
      icon,
      label,
      value,
      accent,
      flex,
    }: any) => (
      <View
        style={{
          flex: flex || 1,
          marginHorizontal: 4,
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          padding: 12,
          borderWidth: 1,
          borderColor: "#E6ECE9",
          shadowColor: "#0B3D2A",
          shadowOpacity: 0.07,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: accent ? "#FEF3C7" : "#EAF5EF",
          }}
        >
          <MaterialIcons
            name={icon}
            size={17}
            color={accent ? "#B45309" : "#024E32"}
          />
        </View>

        <Text
          {...TXT}
          style={{
            fontSize: S.label,
            fontWeight: "700",
            letterSpacing: 1,
            color: "#8A9A92",
            marginTop: 8,
          }}
        >
          {label}
        </Text>

        <Text
          {...TXT}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={{
            fontSize: S.valueLg,
            fontWeight: "800",
            marginTop: 2,
            color: accent ? "#B45309" : "#024E32",
          }}
        >
          {value}
        </Text>
      </View>
    );

    /* =====================================================
      BID BUBBLE - chat style, with rank medals
    ===================================================== */

    const BidBubble = ({
      bid,
      isUserBid,
      isHighest,
      ticketNumber,
      groupMemberId,
      rank,
    }: any) => {
      const medal =
        rank === 1
          ? "#F5B301"
          : rank === 2
          ? "#9CA3AF"
          : rank === 3
          ? "#C77C3A"
          : null;

      return (
        <View
          style={{
            marginBottom: 12,
            alignItems: isUserBid ? "flex-end" : "flex-start",
          }}
        >
          <View
            style={{
              maxWidth: "90%",
              minWidth: 190,
              borderRadius: 20,
              borderTopRightRadius: isUserBid ? 6 : 20,
              borderTopLeftRadius: isUserBid ? 20 : 6,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: isUserBid ? "#024E32" : "#FFFFFF",
              borderWidth: isHighest ? 2 : 1,
              borderColor: isHighest
                ? "#F5B301"
                : isUserBid
                ? "#024E32"
                : "#E6ECE9",
              shadowColor: "#0B3D2A",
              shadowOpacity: 0.08,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 2,
            }}
          >
            {/* top row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              {medal && (
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: medal,
                    marginRight: 6,
                  }}
                >
                  <Text
                    {...TXT}
                    style={{
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: "800",
                    }}
                  >
                    {rank}
                  </Text>
                </View>
              )}

              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: isUserBid
                    ? "rgba(255,255,255,0.18)"
                    : "#EAF5EF",
                }}
              >
                <Text
                  {...TXT}
                  style={{
                    fontSize: S.tiny,
                    fontWeight: "700",
                    color: isUserBid ? "#FFFFFF" : "#024E32",
                  }}
                >
                  Ticket  {groupMemberId || "-"}
                </Text>
              </View>

              {isHighest && (
                <View
                  style={{
                    marginLeft: 6,
                    backgroundColor: "#FACC15",
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    {...TXT}
                    style={{
                      color: "#854D0E",
                      fontSize: 8,
                      fontWeight: "800",
                    }}
                  >
                    🏆 HIGHEST
                  </Text>
                </View>
              )}

              {isUserBid && (
                <View
                  style={{
                    marginLeft: 6,
                    backgroundColor: "rgba(255,255,255,0.25)",
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 999,
                  }}
                >
                  <Text
                    {...TXT}
                    style={{
                      color: "#FFFFFF",
                      fontSize: 8,
                      fontWeight: "800",
                    }}
                  >
                    YOU
                  </Text>
                </View>
              )}
            </View>

            {/* amount */}
            <Text
              {...TXT}
              style={{
                fontSize: S.big + 3,
                fontWeight: "800",
                marginTop: 6,
                color: isUserBid ? "#FFFFFF" : "#024E32",
              }}
            >
              {formatAmount(bid.bidAmount)}
            </Text>

            {/* time */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <MaterialIcons
                name="schedule"
                size={11}
                color={
                  isUserBid
                    ? "rgba(255,255,255,0.6)"
                    : "#9CA3AF"
                }
              />

              <Text
                {...TXT}
                style={{
                  fontSize: S.tiny,
                  marginLeft: 4,
                  color: isUserBid
                    ? "rgba(255,255,255,0.6)"
                    : "#9CA3AF",
                }}
              >
                {formatDate(bid.bidTime)} • {formatTime(bid.bidTime)}
              </Text>
            </View>
          </View>
        </View>
      );
    };

  export default function CustomerBidRoom() {
    const router = useRouter();

    /* real device safe-area insets - replaces the hardcoded
       iOS 50 / Android 30 top padding */
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
      groupId?: string;
      groupCode?: string;

      /*
        Old fields kept for backend compatibility
      */
      auctionDate?: string;
      auctionTime?: string;

      /*
        NEW:
        These fields control the countdown/end state.
      */
      auctionEndDate?: string;
      auctionEndTime?: string;

      userid?: string;
      memberId?: string;
      groupMemberId?: string;
    }>();

    /* =====================================================
      PARAMS
    ===================================================== */

    const groupId = String(params.groupId || "");
    const groupCode = String(params.groupCode || "");

    /*
      Keep old auctionDate/auctionTime because the backend
      Bid model currently expects them.
    */
    const auctionDate = String(params.auctionDate || "");
    const auctionTime = String(params.auctionTime || "");

    /*
      IMPORTANT:
      Countdown ONLY uses these two.
    */
    const auctionEndDate = String(params.auctionEndDate || "");
    const auctionEndTime = String(params.auctionEndTime || "");

   const userid = String(
  params.userid || params.memberId || ""
);

const initialGroupMemberId = String(
  params.groupMemberId || ""
);

    /* =====================================================
      STATE
    ===================================================== */

    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    /* =====================================================
      PENDING INSTALLMENT CHECK
      Member cannot bid if he has pending installments
      for PAST months or the CURRENT month.
      Future months do NOT block bidding.
    ===================================================== */

    const [installmentOnlyBlocked, setInstallmentBlocked] =
      useState(false);
    const [installmentReason, setBlockedReason] = useState("");

    /* =====================================================
      PENDING PENALTY CHECK (same rule as installment)
      Member cannot bid if he has a pending penalty.
      installmentBlocked / blockedReason below now cover BOTH
      (pending installment OR pending penalty), so the button,
      the warning box and the bid guard all work unchanged.
    ===================================================== */

    const [penaltyBlocked, setPenaltyBlocked] =
      useState(false);
    const [penaltyReason, setPenaltyReason] = useState("");

    const installmentBlocked =
      installmentOnlyBlocked || penaltyBlocked;
    const blockedReason = installmentOnlyBlocked
      ? installmentReason
      : penaltyReason;

    /* =====================================================
      CHIT AMOUNT
      The group's total chit value (e.g. ₹2,00,000 / ₹3,00,000).
      Bidding starts from this amount.
    ===================================================== */

    const [chitAmount, setChitAmount] = useState(0);

    const [countdown, setCountdown] = useState("--:--:--");

    const [auctionStarted, setAuctionStarted] = useState(false);
    const [auctionEnded, setAuctionEnded] = useState(false);

    const [bidAmount, setBidAmount] = useState("");
    
    const [selectedPredefinedIndex, setSelectedPredefinedIndex] = useState(0);
    const [placingBid, setPlacingBid] = useState(false);

    /* =====================================================
   GROUP MEMBER ID SELECTION
   ===================================================== */

const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
const [selectedGroupMemberId, setSelectedGroupMemberId] =
  useState(initialGroupMemberId);

const [showGroupMemberDropdown, setShowGroupMemberDropdown] =
  useState(false);

    const [timeRemaining, setTimeRemaining] = useState({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });

    /* =====================================================
      ANIMATION
    ===================================================== */

    const [newBidCount, setNewBidCount] = useState(0);
    const [lastBidCount, setLastBidCount] = useState(0);

    const fadeAnim = useRef(
      new Animated.Value(0)
    ).current;

    /* =====================================================
      PREDEFINED BID AMOUNTS
    ===================================================== */

  const PREDEFINED_AMOUNTS = [
    10000,
    20000,
    30000,
    40000,
    50000,
    60000,
    70000,
    80000,
    90000,
    100000,
    150000,
    200000,
    250000,
    300000,
  ];


    /* =====================================================
      PARSE AUCTION END DATE/TIME

      IMPORTANT:
      ONLY auctionEndDate + auctionEndTime are used.
      
      auctionDate / auctionTime are NOT used here.
    ===================================================== */

    const parseAuctionEndDateTime = () => {
      if (!auctionEndDate || !auctionEndTime) {
        console.log(
          "❌ Missing auction end date/time"
        );

        console.log(
          "auctionEndDate:",
          auctionEndDate
        );

        console.log(
          "auctionEndTime:",
          auctionEndTime
        );

        return null;
      }

      try {
        const dateParts =
          parseDateParts(auctionEndDate);

        if (!dateParts) {
          console.error(
            "❌ Invalid auction end date:",
            auctionEndDate
          );

          return null;
        }

        const timeParts = auctionEndTime
          .trim()
          .toLowerCase()
          .match(
            /^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/
          );

        if (!timeParts) {
          console.error(
            "❌ Invalid auction end time:",
            auctionEndTime
          );

          return null;
        }

        let hours = parseInt(
          timeParts[1],
          10
        );

        const minutes = parseInt(
          timeParts[2],
          10
        );

        const meridiem = timeParts[3];

        if (meridiem === "pm" && hours < 12) {
          hours += 12;
        }

        if (meridiem === "am" && hours === 12) {
          hours = 0;
        }

        const targetDate = new Date(
          dateParts.year,
          dateParts.month,
          dateParts.day,
          hours,
          minutes,
          0,
          0
        );

        if (
          Number.isNaN(
            targetDate.getTime()
          )
        ) {
          return null;
        }

        console.log(
          "========== AUCTION END =========="
        );

        console.log(
          "auctionEndDate:",
          auctionEndDate
        );

        console.log(
          "auctionEndTime:",
          auctionEndTime
        );

        console.log(
          "Parsed end:",
          targetDate.toString()
        );

        console.log(
          "================================="
        );

        return targetDate;
      } catch (error) {
        console.error(
          "❌ Error parsing auction end:",
          error
        );

        return null;
      }
    };

    /* =====================================================
      COUNTDOWN

      IMPORTANT:
      Auction status is based ONLY on:
      
      auctionEndDate + auctionEndTime
    ===================================================== */

    useEffect(() => {
      let timer: ReturnType<
        typeof setInterval
      > | null = null;

      const updateCountdown = () => {
        const auctionEndDateTime =
          parseAuctionEndDateTime();

        if (!auctionEndDateTime) {
          setCountdown("--:--:--");

          /*
            We don't know the end time.
            Don't incorrectly mark it as ended.
          */
          setAuctionStarted(true);
          setAuctionEnded(false);

          setTimeRemaining({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
          });

          return;
        }

        const now = new Date();

        const difference =
          auctionEndDateTime.getTime() -
          now.getTime();

        /*
          END CONDITION
        */

        if (difference <= 0) {
          setCountdown("00:00:00");

          setAuctionStarted(true);
          setAuctionEnded(true);

          setTimeRemaining({
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
          });

          return;
        }

        /*
          Until end date/time is reached,
          auction is considered active.
        */

        setAuctionStarted(true);
        setAuctionEnded(false);

        const totalSeconds = Math.floor(
          difference / 1000
        );

        const days = Math.floor(
          totalSeconds / 86400
        );

        const hours = Math.floor(
          (totalSeconds % 86400) / 3600
        );

        const minutes = Math.floor(
          (totalSeconds % 3600) / 60
        );

        const seconds =
          totalSeconds % 60;

        setTimeRemaining({
          days,
          hours,
          minutes,
          seconds,
        });

        if (days > 0) {
          setCountdown(
            `${days}d ${String(hours).padStart(
              2,
              "0"
            )}h ${String(minutes).padStart(
              2,
              "0"
            )}m ${String(seconds).padStart(
              2,
              "0"
            )}s`
          );
        } else {
          setCountdown(
            `${String(hours).padStart(
              2,
              "0"
            )}:${String(minutes).padStart(
              2,
              "0"
            )}:${String(seconds).padStart(
              2,
              "0"
            )}`
          );
        }
      };

      updateCountdown();

      timer = setInterval(
        updateCountdown,
        1000
      );

      return () => {
        if (timer) {
          clearInterval(timer);
        }
      };
    }, [
      auctionEndDate,
      auctionEndTime,
    ]);

    /* =====================================================
      LOAD LIVE BIDS
    ===================================================== */

  const loadBids = async () => {
    const auctionGroupId = groupId || groupCode;

    if (!auctionGroupId) {
      console.log("❌ Missing group information");
      setLoading(false);
      return;
    }

    /* =====================================================
       AUCTION IDENTITY

       groupId + auctionDate + auctionTime

       The EXISTING approach is preserved:
         auctionDate || auctionEndDate
         auctionTime || auctionEndTime

       This is exactly what placeBid() already sends when it
       creates the Bid record, so the live query matches the
       stored bids of THIS auction only.
    ===================================================== */

    const currentAuctionDate =
      auctionDate || auctionEndDate;

    const currentAuctionTime =
      auctionTime || auctionEndTime;

    /*
       If the auction identity is missing we must NOT fall back
       to "all bids of the group" - that is what mixed the bid
       chat of two auctions of the same group.
    */
    if (!currentAuctionDate || !currentAuctionTime) {
      console.log(
        "❌ Missing auction identity (auctionDate/auctionTime) - showing no bids"
      );

      setBids([]);
      setLastBidCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      let url =
        `${BACKEND_URL}/bids/live` +
        `?groupId=${encodeURIComponent(auctionGroupId)}`;

      if (currentAuctionDate) {
        url +=
          `&auctionDate=${encodeURIComponent(currentAuctionDate)}`;
      }

      if (currentAuctionTime) {
        url +=
          `&auctionTime=${encodeURIComponent(currentAuctionTime)}`;
      }

      console.log("========== CUSTOMER LIVE BIDS ==========");
      console.log("URL:", url);
      console.log("groupId:", auctionGroupId);
      console.log("auctionDate:", auctionDate);
      console.log("auctionTime:", auctionTime);
      console.log("auctionEndDate:", auctionEndDate);
      console.log("auctionEndTime:", auctionEndTime);
      console.log("USED auctionDate:", currentAuctionDate);
      console.log("USED auctionTime:", currentAuctionTime);
      console.log("========================================");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      const rawText = await response.text();

      console.log(
        "LIVE BID STATUS:",
        response.status
      );

      console.log(
        "LIVE BID RESPONSE:",
        rawText
      );

      let data;

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          `Invalid server response (${response.status})`
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
          `Failed to load bids (${response.status})`
        );
      }

      let receivedBids: Bid[] = [];

      if (Array.isArray(data)) {
        receivedBids = data;
      } else if (Array.isArray(data?.bids)) {
        receivedBids = data.bids;
      }

      // Sort oldest first so ticket numbers are assigned
      // chronologically and stay stable (1, 2, 3, 4...)
      receivedBids.sort(
        (a, b) =>
          new Date(a.bidTime).getTime() -
          new Date(b.bidTime).getTime()
      );

      setBids(receivedBids);
      setLastBidCount(receivedBids.length);

      console.log(
        "✅ LIVE BIDS COUNT:",
        receivedBids.length
      );
    } catch (error) {
      console.error(
        "❌ LIVE BID ERROR:",
        error
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

    /* =====================================================
        LOAD OUTSTANDING (PENDING INSTALLMENTS)
        Blocks bidding only for overdue (past months)
        and current-month dues. Future dues are ignored.
    ===================================================== */

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
                  ? ` of ${formatAmount(overdue)} from previous month(s)`
                  : ""
              }${
                dueThisMonth > 0
                  ? `${overdue > 0 ? " and" : " of"} ${formatAmount(
                      dueThisMonth
                    )} for this month`
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

    /* =====================================================
        LOAD PENDING PENALTY (LIVE)
        Fetched fresh when the page opens, again every 20
        seconds, and whenever the app comes back to the
        foreground - no manual refresh needed. The server
        also re-checks at the moment a bid is placed.
    ===================================================== */

    useEffect(() => {
      if (!userid) return;

      const checkPenalty = async () => {
        try {
          const res = await fetch(
            `${BACKEND_URL}/member/my-outstanding/${encodeURIComponent(
              userid
            )}?_=${Date.now()}`
          );

          if (!res.ok) return;

          const data = await res.json();

          const list = Array.isArray(data?.penaltyByTicket)
            ? data.penaltyByTicket
            : [];

          const ids = [groupCode, groupId]
            .filter(Boolean)
            .map((x) => String(x));

          const pending = list
            .filter(
              (x: any) =>
                ids.includes(String(x?.groupId)) &&
                (!selectedGroupMemberId ||
                  String(x?.groupMemberId) ===
                    String(selectedGroupMemberId))
            )
            .reduce(
              (sum: number, x: any) =>
                sum + Number(x?.pendingPenalty || 0),
              0
            );

          if (pending > 0) {
            setPenaltyReason(
              `You have a pending penalty of ${formatAmount(
                pending
              )}. Please clear your pending penalty to participate in bidding.`
            );
            setPenaltyBlocked(true);
          } else {
            setPenaltyBlocked(false);
            setPenaltyReason("");
          }
        } catch (error) {
          // Fail open - the server still blocks the bid itself
          console.log("Penalty check error:", error);
        }
      };

      checkPenalty();

      const timer = setInterval(checkPenalty, 20000);

      const sub = AppState.addEventListener("change", (s) => {
        if (s === "active") checkPenalty();
      });

      return () => {
        clearInterval(timer);
        sub.remove();
      };
    }, [userid, selectedGroupMemberId, groupCode, groupId]);

    /* =====================================================
        LOAD CHIT AMOUNT FOR THE GROUP
    ===================================================== */

    useEffect(() => {
      const loadChitAmount = async () => {
        const publicGroupId = groupCode || groupId;
        if (!publicGroupId) return;

        try {
          /*
            Fetch the group directly by its public groupId.
            Chit Amount = installment × total months.
          */
          const res = await fetch(
            `${BACKEND_URL}/groups/group-id/${encodeURIComponent(publicGroupId)}`
          );

          if (!res.ok) return;
const group = await res.json();
console.log(
  "========== GROUP API RESPONSE =========="
);

console.log(
  JSON.stringify(group, null, 2)
);

console.log(
  "========================================="
);

/* =====================================================
   LOAD USER'S GROUP MEMBER IDs
   Example:
   Member 22 -> M02, M03
   ===================================================== */

const userGroupMemberIds = Array.isArray(group?.members)
  ? group.members
      .filter(
        (member: any) =>
          String(member?.memberId) === String(userid)
      )
      .map(
        (member: any) =>
          String(member?.groupMemberId || "")
      )
      .filter(
        (id: string) => id !== ""
      )
  : [];

/* Remove duplicates */
const uniqueGroupMemberIds: string[] = [
  ...new Set<string>(userGroupMemberIds),
];

console.log(
  "========== USER GROUP MEMBER IDS =========="
);

console.log("User ID:", userid);

console.log(
  "Group:",
  group?.groupId
);

console.log(
  "Group Member IDs:",
  uniqueGroupMemberIds
);

console.log(
  "============================================"
);

setGroupMemberIds(
  uniqueGroupMemberIds
);

/*
  If navigation already supplied a groupMemberId
  and it belongs to this user, keep it selected.
  Otherwise select the first available ID.
*/
if (
  initialGroupMemberId &&
  uniqueGroupMemberIds.includes(initialGroupMemberId)
) {
  setSelectedGroupMemberId(initialGroupMemberId);
} else if (uniqueGroupMemberIds.length > 0) {
  setSelectedGroupMemberId(
    uniqueGroupMemberIds[0]
  );
}

const exactChitAmount = Number(
  group?.chitAmount || 0
);

  console.log(
    "========== EXACT CHIT AMOUNT =========="
  );
  console.log("Group ID:", group?.groupId);
  console.log("Chit ID:", group?.chitId);
  console.log("Chit Amount:", exactChitAmount);
  console.log("=======================================");

  if (exactChitAmount > 0) {
    setChitAmount(exactChitAmount);
  }
        } catch (error) {
          console.log("Chit amount load error:", error);
        }
      };

      loadChitAmount();
    }, [
  groupId,
  groupCode,
  userid,
  initialGroupMemberId,
]);

    /* =====================================================
        LOAD WHEN PAGE OPENS
    ===================================================== */

    /* =====================================================
      AUTO REFRESH
    ===================================================== */
    // ADDED: bids can not change after the auction ends, so the 5-second reload stops there
    const auctionEndedRef = useRef(false);
    auctionEndedRef.current = auctionEnded;

    // one last load at the moment the auction ends (so the final list is shown)
    useEffect(() => {
      if (auctionEnded) loadBids();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auctionEnded]);


    useEffect(() => {
      /*
        Load immediately for the CURRENT auction so the bid chat
        never shows the previous auction's list while waiting.
      */
      setLoading(true);
      loadBids();

      const interval =
        setInterval(() => {
          // the auction is over: nothing new can arrive, so stop reloading
          if (auctionEndedRef.current) return;
          loadBids();
        }, 5000);

      return () => {
        clearInterval(
          interval
        );
      };
    }, [
      groupId,
      groupCode,
      auctionDate,
      auctionTime,
      auctionEndDate,
      auctionEndTime,
    ]);

    /* =====================================================
      REFRESH
    ===================================================== */

    const onRefresh = () => {
      setRefreshing(true);
      loadBids();
    };

    /* =====================================================
      PREDEFINED AMOUNT
    ===================================================== */

    const handlePredefinedAmount = (
      amount: number
    ) => {
      if (auctionEnded) {
        Alert.alert(
          "Auction Ended",
          "This auction has ended."
        );

        return;
      }

      setBidAmount(
        String(amount)
      );
    };

    /* =====================================================
      PLACE BID
    ===================================================== */

    const placeBid = async () => {
      const cleanAmount =
        bidAmount
          .replace(/,/g, "")
          .trim();

      const amount =
        Number(cleanAmount);

      console.log(
        "========== PLACE BID =========="
      );

      console.log(
        "groupId:",
        groupId
      );

      console.log(
        "userid:",
        userid
      );

      console.log(
        "bidAmount:",
        amount
      );

      console.log(
        "auctionDate:",
        auctionDate
      );

      console.log(
        "auctionTime:",
        auctionTime
      );

      console.log(
        "auctionEndDate:",
        auctionEndDate
      );

      console.log(
        "auctionEndTime:",
        auctionEndTime
      );

      console.log(
        "================================"
      );

      /* =====================================================
        VALIDATION
      ===================================================== */

      if (!userid) {
        Alert.alert(
          "Unable to place bid",
          "Member ID is missing. Please go back and open the Bid Room again."
        );

        return;
      }

      if (!groupId) {
        Alert.alert(
          "Unable to place bid",
          "Group information is missing."
        );

        return;
      }

      if (!auctionEndDate) {
        Alert.alert(
          "Auction Information Missing",
          "Auction end date is missing."
        );

        return;
      }

      if (!auctionEndTime) {
        Alert.alert(
          "Auction Information Missing",
          "Auction end time is missing."
        );

        return;
      }

      if (!cleanAmount) {
        Alert.alert(
          "Enter Bid Amount",
          "Please enter the amount you want to bid."
        );

        return;
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        Alert.alert(
          "Invalid Amount",
          "Please enter a valid bid amount."
        );

        return;
      }

      /*
        IMPORTANT:
        Final client-side check is based ONLY
        on auctionEndDate + auctionEndTime.
      */

      const endDateTime =
        parseAuctionEndDateTime();

      if (!endDateTime) {
        Alert.alert(
          "Invalid Auction Time",
          "The auction end date or time is invalid."
        );

        return;
      }

      if (
        new Date().getTime() >=
        endDateTime.getTime()
      ) {
        setAuctionEnded(true);

        Alert.alert(
          "Auction Ended",
          "This auction has ended. Bidding is no longer available."
        );

        return;
      }

      /*
        BLOCK BID IF PENDING INSTALLMENTS EXIST
        (past months + current month only)
      */
      if (installmentBlocked) {
        Alert.alert(
          "Bidding Disabled",
          blockedReason ||
            "You have pending installment payments. Please clear them to bid."
        );

        return;
      }

      /* =====================================================
        PLACE BID API
      ===================================================== */
if (!selectedGroupMemberId) {
  Alert.alert(
    "Select Group Member",
    "Please select your Group Member ID before placing a bid."
  );

  return;
}
      const url =
        `${BACKEND_URL}/bids/place`;

      /*
        IMPORTANT:
        Your current Bid model expects:
          auctionDate
          auctionTime

        We therefore continue sending those fields.

        The countdown/status itself uses:
          auctionEndDate
          auctionEndTime
      */

const body = {
  groupId: groupId,

  memberId: userid,

  // ✅ EXACT GROUP MEMBER ID
  // Example: M01 / M02
  groupMemberId: selectedGroupMemberId,

  bidAmount: amount,

  auctionDate:
    auctionDate ||
    auctionEndDate,

  auctionTime:
    auctionTime ||
    auctionEndTime,
};

      console.log(
        "BID API URL:",
        url
      );

      console.log(
        "BID REQUEST:",
        JSON.stringify(
          body,
          null,
          2
        )
      );

      try {
        setPlacingBid(true);

        const response =
          await fetch(url, {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body:
              JSON.stringify(
                body
              ),
          });

        const rawText =
          await response.text();

        console.log(
          "BID RESPONSE STATUS:",
          response.status
        );

        console.log(
          "BID RAW RESPONSE:",
          rawText
        );

        let data: any;

        try {
          data =
            JSON.parse(
              rawText
            );
        } catch {
          throw new Error(
            `Server returned an invalid response (${response.status}).`
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              `Failed to place bid (${response.status})`
          );
        }

        console.log(
          "✅ BID CREATED:",
          data
        );

        setBidAmount("");

        /*
          Reload immediately so the new bid
          appears in All Bids.
        */

        await loadBids();

        Alert.alert(
          "🎉 Bid Submitted!",
          `Your bid of ${formatAmount(
            amount
          )} has been submitted successfully.`,
          [
            {
              text: "OK",
            },
          ]
        );
      } catch (error: any) {
        /*
          Use console.log (NOT console.error) so the
          red LogBox "Console Error" popup does not
          appear. The Alert below already informs
          the user (e.g. pending installment block).
        */
        console.log(
          "PLACE BID BLOCKED/FAILED:",
          error?.message || error
        );

        Alert.alert(
          "Bid Failed",
          error?.message ||
            "Unable to place your bid. Please try again."
        );
      } finally {
        setPlacingBid(
          false
        );
      }
    };

    /* =====================================================
      HIGHEST BID
    ===================================================== */

    const highestBid =
      bids.length > 0
        ? Math.max(
            ...bids.map(
              (bid) =>
                Number(
                  bid.bidAmount || 0
                )
            )
          )
        : 0;

    /* =====================================================
      DISPLAY BIDS
      
      Sorted by bid amount descending (highest first)
      so the highest bid appears at the top.
      
      Ticket numbers are still based on chronological
      order (index in `bids` array).
    ===================================================== */

    const displayBids = [...bids].sort(
      (a, b) =>
        Number(b.bidAmount || 0) -
        Number(a.bidAmount || 0)
    );

    /* =====================================================
      GET TICKET NUMBER
      
      Returns the chronological ticket number for a bid.
    ===================================================== */

    const getTicketNumber = (
      bidId: string
    ) => {
      const chronologicalIndex =
        bids.findIndex(
          (bid) =>
            bid._id === bidId
        );

      return chronologicalIndex + 1;
    };

    /* =====================================================
      CURRENT USER BID
    ===================================================== */

    const isCurrentUserBid = (
      memberId: string
    ) => {
      return (
        String(memberId) ===
        String(userid)
      );
    };

    /* =====================================================
      PULSE (new look only - small glowing "live" dot)
    ===================================================== */

    const pulseAnim = useRef(
      new Animated.Value(0)
    ).current;

    useEffect(() => {
      const loop = Animated.loop(
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );

      loop.start();

      return () => {
        loop.stop();
      };
    }, []);
    /* =====================================================
      UI
    ===================================================== */

    return (
      <View style={{ flex: 1, backgroundColor: "#F2F6F4" }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#013D27"
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
          keyboardVerticalOffset={
            Platform.OS === "ios"
              ? 10
              : 0
          }
        >

          {/* =================================================
              TOP BAR (fixed)
          ================================================= */}

          <View
            style={{
              backgroundColor: "#013D27",
              paddingTop: insets.top + 10,
              paddingBottom: 6,
              paddingHorizontal: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => router.back()}
                activeOpacity={0.7}
                style={{
                  width: isTablet ? 42 : 38,
                  height: isTablet ? 42 : 38,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.12)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={S.iconBack}
                  color="white"
                />
              </TouchableOpacity>

              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  {...TXT}
                  numberOfLines={1}
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "800",
                    fontSize: S.headerTitle,
                  }}
                >
                  Bid Room
                </Text>

                <Text
                  {...TXT}
                  numberOfLines={1}
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: S.headerSub,
                    marginTop: 1,
                  }}
                >
                  Group {groupCode || groupId}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {newBidCount > 0 && (
                  <Animated.View
                    style={{
                      opacity: fadeAnim,
                      backgroundColor: "#EF4444",
                      borderRadius: 9999,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      marginRight: 8,
                    }}
                  >
                    <Text
                      {...TXT}
                      style={{
                        color: "white",
                        fontSize: S.tiny + 1,
                        fontWeight: "800",
                      }}
                    >
                      +{newBidCount} NEW
                    </Text>
                  </Animated.View>
                )}

                <TouchableOpacity
                  onPress={onRefresh}
                  activeOpacity={0.7}
                  style={{
                    width: isTablet ? 42 : 38,
                    height: isTablet ? 42 : 38,
                    borderRadius: 14,
                    backgroundColor: "rgba(255,255,255,0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialIcons
                    name="refresh"
                    size={S.iconMd}
                    color="white"
                    style={{ opacity: refreshing ? 0.5 : 1 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* =================================================
              CONTENT
          ================================================= */}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            contentContainerStyle={{
              paddingBottom: 16,
              flexGrow: 1,
            }}
          >

            {/* ===============================================
                HERO - live status + big countdown
            =============================================== */}

            <View
              style={{
                backgroundColor: "#013D27",
                borderBottomLeftRadius: 34,
                borderBottomRightRadius: 34,
                paddingHorizontal: isTablet ? 28 : 18,
                paddingTop: 10,
                paddingBottom: 50,
                overflow: "hidden",
              }}
            >
              {/* soft decorative circles */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: -60,
                  right: -50,
                  width: 190,
                  height: 190,
                  borderRadius: 95,
                  backgroundColor: "rgba(255,255,255,0.05)",
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  bottom: -70,
                  left: -40,
                  width: 170,
                  height: 170,
                  borderRadius: 85,
                  backgroundColor: "rgba(245,179,1,0.10)",
                }}
              />

              {/* status row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {!auctionEnded && (
                      <Animated.View
                        style={{
                          position: "absolute",
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: "#4ADE80",
                          opacity: pulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.55, 0],
                          }),
                          transform: [
                            {
                              scale: pulseAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, 1.6],
                              }),
                            },
                          ],
                        }}
                      />
                    )}

                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: auctionEnded
                          ? "#F87171"
                          : "#4ADE80",
                      }}
                    />
                  </View>

                  <Text
                    {...TXT}
                    style={{
                      marginLeft: 6,
                      color: "#FFFFFF",
                      fontSize: S.small,
                      fontWeight: "800",
                      letterSpacing: 1.6,
                    }}
                  >
                    {auctionEnded ? "AUCTION ENDED" : "LIVE AUCTION"}
                  </Text>
                </View>

                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    backgroundColor: auctionEnded
                      ? "#EF4444"
                      : "#16A34A",
                  }}
                >
                  <Text
                    {...TXT}
                    style={{
                      color: "#FFFFFF",
                      fontSize: S.label,
                      fontWeight: "800",
                      letterSpacing: 1.2,
                    }}
                  >
                    {auctionEnded ? "CLOSED" : "BIDDING OPEN"}
                  </Text>
                </View>
              </View>

              <Text
                {...TXT}
                style={{
                  marginTop: 16,
                  marginBottom: 10,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: S.label + 1,
                  fontWeight: "700",
                  letterSpacing: 2.2,
                }}
              >
                {auctionEnded ? "THIS AUCTION HAS ENDED" : "TIME REMAINING"}
              </Text>

              {/* countdown boxes */}
              <View style={{ flexDirection: "row", marginHorizontal: -4 }}>
                <TimeBox
                  value={
                    auctionEndDate && auctionEndTime
                      ? String(timeRemaining.days).padStart(2, "0")
                      : "--"
                  }
                  label="DAYS"
                  ended={auctionEnded}
                />
                <TimeBox
                  value={
                    auctionEndDate && auctionEndTime
                      ? String(timeRemaining.hours).padStart(2, "0")
                      : "--"
                  }
                  label="HOURS"
                  ended={auctionEnded}
                />
                <TimeBox
                  value={
                    auctionEndDate && auctionEndTime
                      ? String(timeRemaining.minutes).padStart(2, "0")
                      : "--"
                  }
                  label="MINUTES"
                  ended={auctionEnded}
                />
                <TimeBox
                  value={
                    auctionEndDate && auctionEndTime
                      ? String(timeRemaining.seconds).padStart(2, "0")
                      : "--"
                  }
                  label="SECONDS"
                  ended={auctionEnded}
                />
              </View>

              <Text
                {...TXT}
                style={{
                  marginTop: 14,
                  textAlign: "center",
                  color: "rgba(255,255,255,0.75)",
                  fontSize: S.small,
                }}
              >
                Closes on{" "}
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  {auctionEndDate || "-"}
                </Text>{" "}
                at{" "}
                <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>
                  {auctionEndTime || "-"}
                </Text>
              </Text>
            </View>

            {/* ===============================================
                BODY (cards float up over the green hero)
            =============================================== */}

            <View
              style={{
                paddingHorizontal: isTablet ? 24 : 14,
                marginTop: -30,
              }}
            >

              {/* SUMMARY TILES */}

              <View style={{ flexDirection: "row", marginHorizontal: -4 }}>
                <StatTile
                  flex={1.35}
                  icon="account-balance-wallet"
                  label="CHIT AMOUNT"
                  value={chitAmount ? formatAmount(chitAmount) : "-"}
                />
                <StatTile
                  icon="list-alt"
                  label="TOTAL BIDS"
                  value={String(bids.length)}
                />
                <StatTile
                  flex={1.2}
                  accent
                  icon="emoji-events"
                  label="HIGHEST"
                  value={highestBid ? formatAmount(highestBid) : "-"}
                />
              </View>

              <Text
                {...TXT}
                style={{
                  color: "#8A9A92",
                  fontSize: S.tiny,
                  textAlign: "center",
                  marginTop: 8,
                }}
              >
                Bidding starts from the chit amount • Highest bid shown above
              </Text>

              {/* YOUR DETAILS STRIP */}

              <View
                style={{
                  marginTop: S.gap,
                  flexDirection: "row",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  paddingVertical: 12,
                  borderWidth: 1,
                  borderColor: "#E6ECE9",
                }}
              >
                <View style={{ flex: 1, alignItems: "center", minWidth: 0 }}>
                  <Text
                    {...TXT}
                    style={{
                      color: "#8A9A92",
                      fontSize: S.label,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    END DATE
                  </Text>
                  <Text
                    {...TXT}
                    numberOfLines={1}
                    style={{
                      color: "#1F2D27",
                      fontSize: S.value,
                      fontWeight: "700",
                      marginTop: 3,
                    }}
                  >
                    {auctionEndDate || "-"}
                  </Text>
                </View>

                <View style={{ width: 1, backgroundColor: "#E6ECE9" }} />

                <View style={{ flex: 1, alignItems: "center", minWidth: 0 }}>
                  <Text
                    {...TXT}
                    style={{
                      color: "#8A9A92",
                      fontSize: S.label,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    END TIME
                  </Text>
                  <Text
                    {...TXT}
                    numberOfLines={1}
                    style={{
                      color: "#1F2D27",
                      fontSize: S.value,
                      fontWeight: "700",
                      marginTop: 3,
                    }}
                  >
                    {auctionEndTime || "-"}
                  </Text>
                </View>

                <View style={{ width: 1, backgroundColor: "#E6ECE9" }} />

                <View style={{ flex: 1, alignItems: "center", minWidth: 0 }}>
                  <Text
                    {...TXT}
                    style={{
                      color: "#8A9A92",
                      fontSize: S.label,
                      fontWeight: "700",
                      letterSpacing: 1,
                    }}
                  >
                    YOUR ID
                  </Text>
                  <Text
                    {...TXT}
                    numberOfLines={1}
                    style={{
                      color: "#1F2D27",
                      fontSize: S.value,
                      fontWeight: "700",
                      marginTop: 3,
                    }}
                  >
                    {userid || "-"}
                  </Text>
                </View>
              </View>

              <SpinnerAutoOpen
                enabled={auctionEnded}
                groupId={groupId}
                groupCode={groupCode}
                auctionEndDate={auctionEndDate}
                auctionEndTime={auctionEndTime}
                userid={userid}
              />

              {/* =============================================
                  PLACE BID
              ============================================= */}

              <View
                style={{
                  marginTop: S.gap,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 28,
                  padding: isTablet ? 22 : 18,
                  borderWidth: 1,
                  borderColor: "#E6ECE9",
                  shadowColor: "#0B3D2A",
                  shadowOpacity: 0.1,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 15,
                      backgroundColor: "#024E32",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="gavel" size={S.iconMd} color="white" />
                  </View>

                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text
                      {...TXT}
                      style={{
                        color: "#10231B",
                        fontSize: S.sectionTitle + 1,
                        fontWeight: "800",
                      }}
                    >
                      Place Your Bid
                    </Text>

                    <Text
                      {...TXT}
                      style={{
                        color: "#8A9A92",
                        fontSize: S.small,
                        marginTop: 1,
                      }}
                    >
                      Pick your ticket and slide to choose the amount
                    </Text>
                  </View>
                </View>

                {/* TICKET (GROUP MEMBER ID) CHIPS */}

                <Text
                  {...TXT}
                  style={{
                    color: "#6B7C74",
                    fontSize: S.label,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    marginBottom: 8,
                  }}
                >
                  SELECT YOUR TICKET
                </Text>

                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {groupMemberIds.map((id) => {
                    const active = selectedGroupMemberId === id;
                    const off =
                      auctionEnded || installmentBlocked || placingBid;

                    return (
                      <TouchableOpacity
                        key={id}
                        disabled={off}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedGroupMemberId(id);
                          setShowGroupMemberDropdown(false);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 14,
                          height: 40,
                          borderRadius: 14,
                          marginRight: 8,
                          marginBottom: 8,
                          backgroundColor: active ? "#024E32" : "#F2F6F4",
                          borderWidth: 1.5,
                          borderColor: active ? "#024E32" : "#DDE6E1",
                          opacity: off ? 0.55 : 1,
                        }}
                      >
                        <MaterialIcons
                          name={active ? "check-circle" : "confirmation-number"}
                          size={S.iconSm}
                          color={active ? "#FFFFFF" : "#024E32"}
                        />
                        <Text
                          {...TXT}
                          style={{
                            marginLeft: 7,
                            fontSize: S.value,
                            fontWeight: "700",
                            color: active ? "#FFFFFF" : "#10231B",
                          }}
                        >
                          {id}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {groupMemberIds.length === 0 && (
                  <Text
                    {...TXT}
                    style={{
                      color: "#DC2626",
                      fontSize: S.small,
                      marginBottom: 6,
                    }}
                  >
                    No Group Member ID found for this account.
                  </Text>
                )}

                {/* BIG AMOUNT + SLIDER (amount selection - stays in the card) */}

                <View
                  style={{
                    marginTop: 8,
                    backgroundColor: "#F2F8F5",
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: "#D6E8DE",
                    paddingHorizontal: 14,
                    paddingTop: 16,
                    paddingBottom: 10,
                  }}
                >
                  <Text
                    {...TXT}
                    style={{
                      textAlign: "center",
                      color: "#6B7C74",
                      fontSize: S.label,
                      fontWeight: "700",
                      letterSpacing: 2,
                    }}
                  >
                    YOUR BID
                  </Text>

                  <Text
                    {...TXT}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                    style={{
                      textAlign: "center",
                      color: "#024E32",
                      fontSize: isTablet ? 46 : 38,
                      fontWeight: "800",
                      marginTop: 2,
                    }}
                  >
                    {formatAmount(
                      bidAmount
                        ? Number(bidAmount)
                        : PREDEFINED_AMOUNTS[selectedPredefinedIndex]
                    )}
                  </Text>

                  <Slider
                    style={{
                      width: "100%",
                      height: 40,
                      marginTop: 6,
                    }}
                    minimumValue={0}
                    maximumValue={PREDEFINED_AMOUNTS.length - 1}
                    step={1}
                    value={selectedPredefinedIndex}
                    minimumTrackTintColor="#024E32"
                    maximumTrackTintColor="#C9D8D0"
                    thumbTintColor="#024E32"
                    disabled={auctionEnded || installmentBlocked}
                    onValueChange={(value) => {
                      const index = Math.round(value);
                      const amount = PREDEFINED_AMOUNTS[index];

                      setSelectedPredefinedIndex(index);
                      setBidAmount(String(amount));
                    }}
                  />

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text {...TXT} style={{ color: "#8A9A92", fontSize: S.tiny, fontWeight: "600" }}>
                      ₹10K
                    </Text>
                    <Text {...TXT} style={{ color: "#8A9A92", fontSize: S.tiny, fontWeight: "600" }}>
                      ₹3 lakh
                    </Text>
                  </View>
                </View>

                {/* HIGHEST BID */}

                {highestBid > 0 && (
                  <View
                    style={{
                      marginTop: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "#FFF8E1",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: "#FDE68A",
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 12,
                        backgroundColor: "#FACC15",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name="emoji-events" size={S.iconSm + 2} color="#854D0E" />
                    </View>

                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text
                        {...TXT}
                        style={{ color: "#92400E", fontSize: S.small }}
                      >
                        Current highest bid{" "}
                        <Text style={{ fontWeight: "800" }}>
                          {formatAmount(highestBid)}
                        </Text>
                      </Text>

                      <Text
                        {...TXT}
                        style={{
                          color: "#B45309",
                          fontSize: S.tiny,
                          marginTop: 2,
                        }}
                      >
                        Your bid must be higher than the current highest bid
                      </Text>
                    </View>
                  </View>
                )}

                {/* PENDING INSTALLMENT / PENALTY WARNING */}

                {installmentBlocked && (
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: "#FECACA",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <MaterialIcons name="block" size={S.iconSm + 2} color="#DC2626" />
                      <Text
                        {...TXT}
                        style={{
                          color: "#B91C1C",
                          fontWeight: "800",
                          marginLeft: 8,
                          fontSize: S.small + 1,
                          flex: 1,
                        }}
                      >
                        {installmentOnlyBlocked
                          ? "Bidding Disabled – Pending Installment"
                          : "Bidding Disabled – Pending Penalty"}
                      </Text>
                    </View>

                    <Text
                      {...TXT}
                      style={{
                        color: "#DC2626",
                        marginTop: 6,
                        fontSize: S.small,
                      }}
                    >
                      {blockedReason}
                    </Text>
                  </View>
                )}

                {/* STATUS */}

                {auctionEnded && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 14,
                      backgroundColor: "#FEF2F2",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: "#FECACA",
                    }}
                  >
                    <MaterialIcons name="info-outline" size={S.iconSm + 2} color="#DC2626" />
                    <Text
                      {...TXT}
                      style={{
                        color: "#B91C1C",
                        marginLeft: 8,
                        flex: 1,
                        fontSize: S.small,
                      }}
                    >
                      This auction has ended. No more bids accepted.
                    </Text>
                  </View>
                )}

                {(!auctionEndDate || !auctionEndTime) && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 14,
                      backgroundColor: "#FFFBEB",
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: "#FDE68A",
                    }}
                  >
                    <MaterialIcons name="info-outline" size={S.iconSm + 2} color="#D97706" />
                    <Text
                      {...TXT}
                      style={{
                        color: "#B45309",
                        marginLeft: 8,
                        flex: 1,
                        fontSize: S.small,
                      }}
                    >
                      Auction end date/time is not available.
                    </Text>
                  </View>
                )}
              </View>

              {/* =============================================
                  LIVE BIDS HEADER
              ============================================= */}

              <View style={{ marginTop: 26, marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      backgroundColor: "#EAF5EF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="forum" size={S.iconMd - 2} color="#024E32" />
                  </View>

                  <Text
                    {...TXT}
                    style={{
                      color: "#10231B",
                      fontWeight: "800",
                      marginLeft: 10,
                      fontSize: S.sectionTitle + 1,
                    }}
                  >
                    Live Bids
                  </Text>

                  {bids.length > 0 && (
                    <View
                      style={{
                        marginLeft: 8,
                        backgroundColor: "#024E32",
                        paddingHorizontal: 9,
                        paddingVertical: 2,
                        borderRadius: 999,
                      }}
                    >
                      <Text
                        {...TXT}
                        style={{
                          color: "#FFFFFF",
                          fontWeight: "800",
                          fontSize: S.small,
                        }}
                      >
                        {bids.length}
                      </Text>
                    </View>
                  )}
                </View>

                <Text
                  {...TXT}
                  style={{
                    color: "#6B7C74",
                    marginTop: 6,
                    fontSize: S.small,
                  }}
                >
                  Bids of this auction only ({auctionEndDate || "-"}
                  {auctionEndTime ? ` • ${auctionEndTime}` : ""}). Other auctions
                  of this group have their own bid chat.
                </Text>
              </View>

              {/* =============================================
                  BIDS LIST
              ============================================= */}

              {loading ? (
                <View
                  key="bid-chat-loading"
                  style={{
                    alignItems: "center",
                    paddingVertical: 44,
                    backgroundColor: "#FFFFFF",
                    borderWidth: 1,
                    borderColor: "#E6ECE9",
                    borderRadius: 24,
                  }}
                >
                  <ActivityIndicator size="large" color="#024E32" />

                  <Text
                    {...TXT}
                    style={{
                      color: "#6B7C74",
                      marginTop: 12,
                      fontWeight: "600",
                      fontSize: S.value,
                    }}
                  >
                    Loading bids...
                  </Text>
                </View>
              ) : bids.length === 0 ? (
                <View
                  key="bid-chat-empty"
                  style={{
                    backgroundColor: "#FFFFFF",
                    padding: 26,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: "#E6ECE9",
                    borderStyle: "dashed",
                    borderRadius: 24,
                  }}
                >
                  <View
                    style={{
                      width: 66,
                      height: 66,
                      borderRadius: 33,
                      backgroundColor: "#EAF5EF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="gavel" size={30} color="#024E32" />
                  </View>

                  <Text
                    {...TXT}
                    style={{
                      color: "#10231B",
                      fontWeight: "800",
                      marginTop: 12,
                      fontSize: S.cardTitle + 1,
                    }}
                  >
                    No bids yet
                  </Text>

                  <Text
                    {...TXT}
                    style={{
                      color: "#6B7C74",
                      textAlign: "center",
                      marginTop: 6,
                      fontSize: S.small,
                    }}
                  >
                    Be the first to place a bid! Your bid will appear here.
                  </Text>
                </View>
              ) : (
                displayBids.map((bid, index) => {
                  const ticketNumber = getTicketNumber(bid._id);

                  const isHighest =
                    Number(bid.bidAmount) === highestBid;

                  const isUserBid = isCurrentUserBid(bid.memberId);

                  return (
                    <BidBubble
                      key={bid._id}
                      bid={bid}
                      isUserBid={isUserBid}
                      isHighest={isHighest}
                      ticketNumber={ticketNumber}
                      groupMemberId={bid.groupMemberId}
                      rank={index + 1}
                    />
                  );
                })
              )}

              {/* =============================================
                  FOOTER
              ============================================= */}

              <Footer />

            </View>

          </ScrollView>

          {/* =================================================
              BOTTOM BAR (fixed, like a WhatsApp message box)
              - top: amount input + send button
              - below: amount selection slider
          ================================================= */}

          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 26,
              borderTopRightRadius: 26,
              paddingHorizontal: isTablet ? 24 : 14,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 10) + 4,
              borderTopWidth: 1,
              borderColor: "#E6ECE9",
              shadowColor: "#0B3D2A",
              shadowOpacity: 0.12,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: -4 },
              elevation: 12,
            }}
          >
            {/* INPUT ROW */}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: "#F2F6F4",
                  borderWidth: 1.5,
                  borderColor: "#DDE6E1",
                  borderRadius: 28,
                  paddingHorizontal: 18,
                  height: 52,
                }}
              >
                <Text
                  {...TXT}
                  style={{
                    color: "#024E32",
                    fontWeight: "800",
                    marginRight: 8,
                    fontSize: S.big,
                  }}
                >
                  ₹
                </Text>

                <TextInput
                  allowFontScaling={false}
                  value={bidAmount}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, "");

                    setBidAmount(cleaned);
                  }}
                  placeholder="Enter bid amount"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                  editable={
                    !placingBid &&
                    !auctionEnded &&
                    !installmentBlocked
                  }
                  className="flex-1 text-gray-900 font-semibold"
                  style={{ fontSize: S.valueLg, paddingVertical: 0 }}
                />

                {bidAmount !== "" && (
                  <TouchableOpacity onPress={() => setBidAmount("")}>
                    <MaterialIcons
                      name="cancel"
                      size={S.iconSm + 4}
                      color="#B6C2BC"
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* SEND / PLACE BID */}

              <TouchableOpacity
                onPress={placeBid}
                disabled={
                  placingBid ||
                  auctionEnded ||
                  installmentBlocked
                }
                activeOpacity={0.85}
                style={{
                  marginLeft: 10,
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    placingBid || auctionEnded || installmentBlocked
                      ? "#C4CCC8"
                      : "#024E32",
                  shadowColor: "#024E32",
                  shadowOpacity:
                    placingBid || auctionEnded || installmentBlocked
                      ? 0
                      : 0.35,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  elevation:
                    placingBid || auctionEnded || installmentBlocked
                      ? 0
                      : 5,
                }}
              >
                {placingBid ? (
                  <ActivityIndicator color="white" size="small" />
                ) : auctionEnded ? (
                  <MaterialIcons name="lock" size={S.iconMd + 2} color="white" />
                ) : installmentBlocked ? (
                  <MaterialIcons name="money-off" size={S.iconMd + 2} color="white" />
                ) : (
                  <MaterialIcons name="send" size={S.iconMd + 2} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {/* button meaning (small caption under the input row) */}

            <Text
              {...TXT}
              style={{
                textAlign: "center",
                marginTop: 6,
                fontSize: S.tiny,
                fontWeight: "700",
                letterSpacing: 0.8,
                color: auctionEnded || installmentBlocked
                  ? "#DC2626"
                  : "#6B7C74",
              }}
            >
              {placingBid
                ? "SUBMITTING..."
                : auctionEnded
                ? "AUCTION ENDED"
                : installmentBlocked
                ? installmentOnlyBlocked
                  ? "INSTALLMENT PENDING"
                  : "PENALTY PENDING"
                : "TAP SEND TO PLACE BID"}
            </Text>
          </View>

        </KeyboardAvoidingView>
      </View>
    );
  }