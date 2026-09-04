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
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

  import { MaterialIcons } from "@expo/vector-icons";

  import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";



  import BACKEND_URL from "../config";

  const { width } = Dimensions.get("window");

  const isTablet = width >= 768;

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
      FOOTER
    ===================================================== */

    const Footer = () => (
      <View className="bg-white border-t border-gray-200 pt-5 pb-7 px-5">
        <View className="items-center">
          <Text className="text-[#024e32] font-bold text-base">
            MANIKYA CHITS PVT LTD
          </Text>

          <Text className="text-gray-500 text-xs mt-1 text-center">
            Secure • Transparent • Trusted
          </Text>

          <Text className="text-gray-400 text-[10px] mt-1 text-center">
            ©{" "}
            {new Date().getFullYear()}{" "}
            Manikya Chits Pvt Ltd.
            All rights reserved.
          </Text>
        </View>
      </View>
    );

    // =====================================================
    // BID BUBBLE COMPONENT - WhatsApp Style
    // =====================================================

const BidBubble = ({
  bid,
  isUserBid,
  isHighest,
  ticketNumber,
}: any) => {
  return (
    <View
      style={{
        marginBottom: 12,
        alignItems: isUserBid ? "flex-end" : "flex-start",
      }}
    >
      <View
        style={{
          maxWidth: "85%",
          borderRadius: 16,
          borderTopRightRadius: isUserBid ? 0 : 16,
          borderTopLeftRadius: isUserBid ? 16 : 0,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isUserBid ? "#024E32" : "#FFFFFF",
          borderWidth: isUserBid ? 0 : 1,
          borderColor: "#E5E7EB",
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: "600",
              color: isUserBid
                ? "rgba(255,255,255,0.6)"
                : "#9CA3AF",
            }}
          >
            Ticket #{ticketNumber}
          </Text>

          {isHighest && (
            <View
              style={{
                marginLeft: 8,
                backgroundColor: "#FACC15",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  color: "#854D0E",
                  fontSize: 8,
                  fontWeight: "700",
                }}
              >
                🏆 HIGHEST
              </Text>
            </View>
          )}

          {isUserBid && (
            <View
              style={{
                marginLeft: 8,
                backgroundColor: "rgba(255,255,255,0.2)",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 8,
                  fontWeight: "700",
                }}
              >
                YOU
              </Text>
            </View>
          )}
        </View>

        {/* Bid Amount */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: isUserBid ? "#FFFFFF" : "#024E32",
          }}
        >
          {formatAmount(bid.bidAmount)}
        </Text>

        {/* Time */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
          }}
        >
          <MaterialIcons
            name="schedule"
            size={12}
            color={
              isUserBid
                ? "rgba(255,255,255,0.5)"
                : "#9CA3AF"
            }
          />

          <Text
            style={{
              fontSize: 10,
              marginLeft: 4,
              color: isUserBid
                ? "rgba(255,255,255,0.5)"
                : "#9CA3AF",
            }}
          >
            {formatTime(bid.bidTime)}
          </Text>
        </View>
      </View>
    </View>
  );
};

  export default function CustomerBidRoom() {
    const router = useRouter();

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

    const [installmentBlocked, setInstallmentBlocked] =
      useState(false);
    const [blockedReason, setBlockedReason] = useState("");

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

    useEffect(() => {
      /*
        Load immediately for the CURRENT auction so the bid chat
        never shows the previous auction's list while waiting.
      */
      setLoading(true);
      loadBids();

      const interval =
        setInterval(() => {
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
      UI
    ===================================================== */

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F6" }}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#024E32"
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
              HEADER
          ================================================= */}


  <View
    className="bg-[#024E32] px-5"
    style={{
      paddingTop: Platform.OS === "ios" ? 50 : 30,
      paddingBottom: 20,
    }}
  >
    <View className="flex-row items-center">
      <TouchableOpacity
        onPress={() => router.back()}
        className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
        activeOpacity={0.7}
        style={{
          width: isTablet ? 44 : 40,
          height: isTablet ? 44 : 40,
        }}
      >
        <MaterialIcons
          name="arrow-back"
          size={isTablet ? 26 : 24}
          color="white"
        />
      </TouchableOpacity>

      <View className="ml-3 flex-1">
        <Text
          className="text-white font-bold"
          style={{
            fontSize: isTablet ? 24 : 20,
          }}
        >
          🏛️ Bid Room
        </Text>

        <Text className="text-green-100 text-xs mt-0.5">
          Group {groupCode || groupId}
        </Text>
      </View>

      <View className="flex-row items-center">
        {newBidCount > 0 && (
          <Animated.View
            style={{
              opacity: fadeAnim,
              backgroundColor: "#EF4444",
              borderRadius: 9999,
              paddingHorizontal: 10,
              paddingVertical: 2,
              marginRight: 8,
            }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 10,
                fontWeight: "700",
              }}
            >
              +{newBidCount}
            </Text>
          </Animated.View>
        )}

        <TouchableOpacity
          onPress={onRefresh}
          className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          activeOpacity={0.7}
          style={{
            width: isTablet ? 44 : 40,
            height: isTablet ? 44 : 40,
          }}
        >
          <MaterialIcons
            name="refresh"
            size={isTablet ? 25 : 23}
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
            showsVerticalScrollIndicator={
              false
            }
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  onRefresh
                }
              />
            }
            contentContainerStyle={{
              padding: isTablet ? 30 : 20,
              paddingBottom: 20,
              flexGrow: 1,
            }}
          >

            <View style={{ flex: 1 }}>

              {/* =================================================
                  AUCTION INFO
              ================================================= */}

              <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">

                <View className="flex-row items-center">

                  <View className="w-11 h-11 rounded-2xl bg-[#EAF5EF] items-center justify-center">
                    <MaterialIcons
                      name="gavel"
                      size={24}
                      color="#024E32"
                    />
                  </View>

                  <View className="ml-3 flex-1">

                    <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                      Live Auction
                    </Text>

                    <Text className="text-gray-900 text-base font-bold">
                      {groupCode ||
                        groupId}
                    </Text>

                  </View>

                  <View
                    className={`px-3 py-1.5 rounded-full ${
                      auctionEnded
                        ? "bg-red-500"
                        : "bg-green-500"
                    }`}
                  >
                    <Text className="text-white text-[10px] font-bold tracking-wider">
                      {auctionEnded
                        ? "ENDED"
                        : "LIVE"}
                    </Text>
                  </View>

                </View>

                <View className="flex-row flex-wrap mt-5 pt-4 border-t border-gray-100">

                  {/* END DATE */}

                  <View className="flex-1 min-w-[110px]">
                    <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                      📅 End Date
                    </Text>

                    <Text className="text-gray-800 font-semibold mt-1 text-sm">
                      {auctionEndDate ||
                        "-"}
                    </Text>
                  </View>

                  {/* END TIME */}

                  <View className="flex-1 min-w-[110px]">
                    <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                      ⏰ End Time
                    </Text>

                    <Text className="text-gray-800 font-semibold mt-1 text-sm">
                      {auctionEndTime ||
                        "-"}
                    </Text>
                  </View>

                  {/* USER ID */}

                  <View className="flex-1 min-w-[100px]">
                    <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                      👤 Your ID
                    </Text>

                    <Text className="text-gray-800 font-semibold mt-1 text-sm">
                      {userid ||
                        "-"}
                    </Text>
                  </View>

                </View>
              </View>

              {/* =================================================
                  COUNTDOWN
              ================================================= */}

             <View
  style={{
    marginTop: 16,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 2,
    backgroundColor: auctionEnded ? "#FEF2F2" : "#EAF5EF",
    borderColor: auctionEnded ? "#FECACA" : "#024E32",
  }}
>

                <View className="flex-row items-center">

                 <View
  style={{
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: auctionEnded ? "#EF4444" : "#024E32",
  }}
>
                    <MaterialIcons
                      name={
                        auctionEnded
                          ? "timer-off"
                          : "timer"
                      }
                      size={24}
                      color="white"
                    />
                  </View>

                  <View className="ml-3 flex-1">

                    <Text className="text-gray-500 text-[10px] font-semibold tracking-wider uppercase">
                      {auctionEnded
                        ? "Auction Ended"
                        : "Time Remaining"}
                    </Text>

                    <Text
  style={{
    fontWeight: "700",
    fontSize: 16,
    color: auctionEnded ? "#DC2626" : "#024E32",
  }}
>
                      {auctionEnded
                        ? "🔴 BIDDING CLOSED"
                        : "🟢 BIDDING OPEN"}
                    </Text>

                  </View>

                  <View className="items-end">

                    <Text
                      className={`font-extrabold font-mono ${
                        auctionEnded
                          ? "text-red-600"
                          : "text-[#024E32]"
                      }`}
                      style={{
                        fontSize:
                          isTablet
                            ? 22
                            : 16,
                      }}
                    >
                      {countdown}
                    </Text>

                    <Text className="text-gray-400 text-[9px]">
                      {timeRemaining.days >
                      0
                        ? "DAYS • HOURS • MINUTES • SECONDS"
                        : "HH : MM : SS"}
                    </Text>

                  </View>

                </View>

                {/* END DATE TARGET */}

                <View className="mt-3 pt-3 border-t border-gray-200">
                  <Text className="text-gray-500 text-[10px] text-center">
                    Auction closes on{" "}
                    <Text className="font-bold text-gray-700">
                      {auctionEndDate ||
                        "-"}
                    </Text>{" "}
                    at{" "}
                    <Text className="font-bold text-gray-700">
                      {auctionEndTime ||
                        "-"}
                    </Text>
                  </Text>
                </View>

              </View>

              {/* =================================================
                  PLACE BID
              ================================================= */}

              <View className="bg-white rounded-3xl p-5 mt-4 border border-gray-100 shadow-sm">

                <View className="flex-row items-center mb-4">

                  <View className="w-10 h-10 rounded-xl bg-[#EAF5EF] items-center justify-center">
                    <MaterialIcons
                      name="payments"
                      size={22}
                      color="#024E32"
                    />
                  </View>

                  <View className="ml-3">

                    <Text className="text-gray-900 text-base font-bold">
                      Place Your Bid
                    </Text>

                    <Text className="text-gray-400 text-xs mt-0.5">
                      Enter the amount you want to bid
                    </Text>

                  </View>

                </View>

                {/* QUICK AMOUNTS */}
                {/* =================================================
    GROUP MEMBER ID
================================================= */}

<View className="mb-4">

  <Text className="text-gray-500 text-xs font-semibold tracking-wider uppercase mb-2">
    Select Group Member ID
  </Text>

  <TouchableOpacity
    onPress={() => {
      if (
        !auctionEnded &&
        !installmentBlocked &&
        !placingBid
      ) {
        setShowGroupMemberDropdown(
          !showGroupMemberDropdown
        );
      }
    }}
    disabled={
      auctionEnded ||
      installmentBlocked ||
      placingBid ||
      groupMemberIds.length === 0
    }
    activeOpacity={0.8}
    className="h-14 bg-[#F7F9F8] border border-gray-200 rounded-2xl px-4 flex-row items-center justify-between"
  >

    <View className="flex-row items-center">

      <MaterialIcons
        name="confirmation-number"
        size={21}
        color="#024E32"
      />

      <Text className="text-gray-900 text-base font-semibold ml-3">
        {selectedGroupMemberId ||
          "Select Group Member ID"}
      </Text>

    </View>

    <MaterialIcons
      name={
        showGroupMemberDropdown
          ? "keyboard-arrow-up"
          : "keyboard-arrow-down"
      }
      size={24}
      color="#024E32"
    />

  </TouchableOpacity>

  {/* DROPDOWN OPTIONS */}

  {showGroupMemberDropdown &&
    groupMemberIds.length > 0 && (
      <View className="mt-2 bg-white border border-gray-200 rounded-2xl overflow-hidden">

        {groupMemberIds.map(
          (id, index) => (
            <TouchableOpacity
              key={id}
              onPress={() => {
                setSelectedGroupMemberId(id);
                setShowGroupMemberDropdown(false);
              }}
              className={`px-4 py-4 flex-row items-center justify-between ${
                index <
                groupMemberIds.length - 1
                  ? "border-b border-gray-100"
                  : ""
              }`}
              activeOpacity={0.7}
            >

              <View className="flex-row items-center">

                <MaterialIcons
                  name="confirmation-number"
                  size={20}
                  color="#024E32"
                />

                <Text className="text-gray-900 text-base font-semibold ml-3">
                  {id}
                </Text>

              </View>

              {selectedGroupMemberId ===
                id && (
                <MaterialIcons
                  name="check"
                  size={22}
                  color="#024E32"
                />
              )}

            </TouchableOpacity>
          )
        )}

      </View>
    )}

  {groupMemberIds.length === 0 && (
    <Text className="text-red-500 text-xs mt-2">
      No Group Member ID found for this account.
    </Text>
  )}

</View>
  <View className="mb-4">
    <Text className="text-gray-500 text-xs font-semibold uppercase mb-2">
      Slide to Select Bid Amount
    </Text>

    <View className="bg-gray-50 rounded-2xl border border-gray-200 p-4">

      <View className="items-center mb-2">
        <Text className="text-gray-400 text-xs">
          Selected Bid
        </Text>

        <Text className="text-[#024E32] text-2xl font-bold">
          {formatAmount(
            PREDEFINED_AMOUNTS[selectedPredefinedIndex]
          )}
        </Text>
      </View>

      <Slider
        style={{
          width: "100%",
          height: 40,
        }}
        minimumValue={0}
        maximumValue={PREDEFINED_AMOUNTS.length - 1}
        step={1}
        value={selectedPredefinedIndex}
        minimumTrackTintColor="#024E32"
        maximumTrackTintColor="#D1D5DB"
        thumbTintColor="#024E32"
        disabled={auctionEnded || installmentBlocked}
        onValueChange={(value) => {
          const index = Math.round(value);
          const amount = PREDEFINED_AMOUNTS[index];

          setSelectedPredefinedIndex(index);
          setBidAmount(String(amount));
        }}
      />

      <View className="flex-row justify-between px-1">
        <Text className="text-gray-400 text-xs">₹10K</Text>
        <Text className="text-gray-400 text-xs">₹30K</Text>
        <Text className="text-gray-400 text-xs">₹50K</Text>
        <Text className="text-gray-400 text-xs">₹70K</Text>
        <Text className="text-gray-400 text-xs">₹90K</Text>
      </View>

    </View>
  </View>

                {/* INPUT */}

                <Text className="text-gray-500 text-xs font-semibold tracking-wider uppercase mb-2">
                  Or Enter Amount
                </Text>

                <View className="flex-row items-center bg-[#F7F9F8] border border-gray-200 rounded-2xl px-4 h-14">

                  <Text className="text-[#024E32] text-2xl font-bold mr-2">
                    ₹
                  </Text>

                  <TextInput
                    value={
                      bidAmount
                    }
                    onChangeText={(
                      text
                    ) => {
                      const cleaned =
                        text.replace(
                          /[^0-9]/g,
                          ""
                        );

                      setBidAmount(
                        cleaned
                      );
                    }}
                    placeholder="Enter bid amount"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    editable={
                      !placingBid &&
                      !auctionEnded &&
                      !installmentBlocked
                    }
                    className="flex-1 text-gray-900 text-base font-semibold"
                  />

                  {bidAmount !==
                    "" && (
                    <TouchableOpacity
                      onPress={() =>
                        setBidAmount(
                          ""
                        )
                      }
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  )}

                </View>

                {/* HIGHEST BID */}

                {highestBid >
                  0 && (
                  <View className="mt-3 bg-yellow-50 rounded-xl p-3 border border-yellow-200">

                    <Text className="text-yellow-700 text-xs">
                      💡 Current highest bid:{" "}
                      <Text className="font-bold">
                        {formatAmount(
                          highestBid
                        )}
                      </Text>
                    </Text>

                    <Text className="text-yellow-600 text-[10px] mt-0.5">
                      Your bid must be higher than the current highest bid
                    </Text>

                  </View>
                )}

                {/* PENDING INSTALLMENT WARNING */}

                {installmentBlocked && (
                  <View className="mt-3 bg-red-50 p-3 rounded-xl border border-red-200">

                    <View className="flex-row items-center">
                      <MaterialIcons
                        name="block"
                        size={18}
                        color="#DC2626"
                      />
                      <Text className="text-red-700 font-bold text-xs ml-2">
                        ⛔ Bidding Disabled – Pending Installment
                      </Text>
                    </View>

                    <Text className="text-red-600 text-xs mt-1.5 flex-1">
                      {blockedReason}
                    </Text>

                  </View>
                )}

                {/* BUTTON */}

                <TouchableOpacity
                  onPress={
                    placeBid
                  }
                  disabled={
                    placingBid ||
                    auctionEnded ||
                    installmentBlocked
                  }
                  activeOpacity={
                    0.8
                  }
                  className={`mt-4 h-14 rounded-2xl items-center justify-center ${
                    placingBid ||
                    auctionEnded ||
                    installmentBlocked
                      ? "bg-gray-300"
                      : "bg-[#024E32]"
                  }`}
                >

                  {placingBid ? (
                    <View className="flex-row items-center">

                      <ActivityIndicator
                        color="white"
                        size="small"
                      />

                      <Text className="text-white font-bold ml-2">
                        SUBMITTING...
                      </Text>

                    </View>
                  ) : auctionEnded ? (
                    <View className="flex-row items-center">

                      <MaterialIcons
                        name="lock"
                        size={21}
                        color="white"
                      />

                      <Text className="text-white font-bold ml-2">
                        AUCTION ENDED
                      </Text>

                    </View>
                  ) : installmentBlocked ? (
                    <View className="flex-row items-center">

                      <MaterialIcons
                        name="money-off"
                        size={21}
                        color="white"
                      />

                      <Text className="text-white font-bold ml-2">
                        INSTALLMENT PENDING
                      </Text>

                    </View>
                  ) : (
                    <View className="flex-row items-center">

                      <MaterialIcons
                        name="gavel"
                        size={21}
                        color="white"
                      />

                      <Text className="text-white font-bold ml-2">
                        PLACE BID
                      </Text>

                    </View>
                  )}

                </TouchableOpacity>

                {/* STATUS */}

                {auctionEnded && (
                  <View className="flex-row items-center mt-3 bg-red-50 p-3 rounded-xl border border-red-200">

                    <MaterialIcons
                      name="info-outline"
                      size={18}
                      color="#DC2626"
                    />

                    <Text className="text-red-700 text-xs ml-2 flex-1">
                      ⛔ This auction has ended. No more bids accepted.
                    </Text>

                  </View>
                )}

                {(!auctionEndDate ||
                  !auctionEndTime) && (
                    <View className="flex-row items-center mt-3 bg-yellow-50 p-3 rounded-xl border border-yellow-200">

                      <MaterialIcons
                        name="info-outline"
                        size={18}
                        color="#D97706"
                      />

                      <Text className="text-yellow-700 text-xs ml-2 flex-1">
                        ⚠️ Auction end date/time is not available.
                      </Text>

                    </View>
                  )}

              </View>

              {/* =================================================
                  SUMMARY
              ================================================= */}

              {/* CHIT AMOUNT - bidding starts from this amount */}

              <View className="mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">

                <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                  💰 Chit Amount
                </Text>

                <Text className="text-[#024E32] text-2xl font-extrabold mt-1">
                  {chitAmount
                    ? formatAmount(
                        chitAmount
                      )
                    : "-"}
                </Text>

                <Text className="text-gray-400 text-[10px] mt-1">
                  Bidding starts from this amount • Current bided (highest) amount shown below
                </Text>

              </View>

              <View className="flex-row mt-4">

                <View className="flex-1 bg-white rounded-2xl p-4 mr-2 border border-gray-100 shadow-sm">

                  <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                    Total Bids
                  </Text>

                  <Text className="text-[#024E32] text-xl font-bold mt-1">
                    {
                      bids.length
                    }
                  </Text>

                </View>

                <View className="flex-1 bg-white rounded-2xl p-4 ml-2 border border-gray-100 shadow-sm">

                  <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                    Highest Bid
                  </Text>

                  <Text className="text-[#024E32] text-xl font-bold mt-1">
                    {highestBid
                      ? formatAmount(
                          highestBid
                        )
                      : "-"}
                  </Text>

                </View>

              </View>

              {/* =================================================
                  ALL BIDS - WhatsApp Style Chat
              ================================================= */}

              <View className="mt-7 mb-3">

                <View className="flex-row items-center">

                  <MaterialIcons
                    name="chat"
                    size={24}
                    color="#024E32"
                  />

                  <Text className="text-gray-900 text-lg font-bold ml-2">
                    Bids Chat
                  </Text>

                  {bids.length >
                    0 && (
                    <View className="ml-2 bg-[#EAF5EF] px-2.5 py-0.5 rounded-full">

                      <Text className="text-[#024E32] text-xs font-bold">
                        {
                          bids.length
                        }
                      </Text>

                    </View>
                  )}

                </View>

                <Text className="text-gray-500 text-xs mt-1 ml-9">
                  Bids of this auction only ({auctionEndDate || "-"}
                  {auctionEndTime ? ` • ${auctionEndTime}` : ""}). Other auctions
                  of this group have their own bid chat.
                </Text>

              </View>

              {/* =================================================
                  BIDS LIST - WhatsApp Style Chat Bubbles
              ================================================= */}

              {loading ? (
                <View
                  key="bid-chat-loading"
                  className="items-center py-16 bg-white rounded-3xl border border-gray-100"
                >

                  <ActivityIndicator
                    size="large"
                    color="#024E32"
                  />

                  <Text className="text-gray-500 mt-3 font-medium">
                    Loading bids...
                  </Text>

                </View>
              ) : bids.length ===
                0 ? (
                <View
                  key="bid-chat-empty"
                  className="bg-white rounded-3xl p-8 items-center border border-gray-100"
                  style={{
                    shadowColor: "#000000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 1,
                  }}
                >

                  <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center">

                    <MaterialIcons
                      name="chat-bubble-outline"
                      size={36}
                      color="#9CA3AF"
                    />

                  </View>

                  <Text className="text-gray-800 font-bold text-lg mt-4">
                    No bids yet
                  </Text>

                  <Text className="text-gray-500 text-center text-sm mt-2">
                    Be the first to place a bid! Your bid will appear here.
                  </Text>

                </View>
              ) : (
                displayBids.map(
                  (bid) => {
                   const ticketNumber = bid.groupMemberId;

                    const isHighest =
                      Number(
                        bid.bidAmount
                      ) ===
                      highestBid;

                    const isUserBid =
                      isCurrentUserBid(
                        bid.memberId
                      );

                    return (
                      <BidBubble
                        key={bid._id}
                        bid={bid}
                        isUserBid={isUserBid}
                        isHighest={isHighest}
                        ticketNumber={ticketNumber}
                      />
                    );
                  }
                )
              )}

              {/* =================================================
                  FOOTER
              ================================================= */}

              <View className="mt-6">
                <Footer />
              </View>

            </View>

          </ScrollView>

        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }