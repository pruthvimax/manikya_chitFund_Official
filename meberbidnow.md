# meber/bidnow

###### import React, {

###### &#x20; useCallback,

###### &#x20; useEffect,

###### &#x20; useRef,

###### &#x20; useState,

###### } from "react";

###### import Slider from "@react-native-community/slider";

###### import {

###### &#x20; View,

###### &#x20; Text,

###### &#x20; TouchableOpacity,

###### &#x20; ScrollView,

###### &#x20; SafeAreaView,

###### &#x20; ActivityIndicator,

###### &#x20; RefreshControl,

###### &#x20; Alert,

###### &#x20; TextInput,

###### &#x20; KeyboardAvoidingView,

###### &#x20; Platform,

###### &#x20; Dimensions,

###### &#x20; Animated,

###### &#x20; StatusBar,

###### } from "react-native";

###### 

###### import { MaterialIcons } from "@expo/vector-icons";

###### 

###### import {

###### &#x20; useLocalSearchParams,

###### &#x20; useRouter,

###### } from "expo-router";

###### 

###### 

###### 

###### import BACKEND\_URL from "../config";

###### 

###### const { width } = Dimensions.get("window");

###### 

###### const isTablet = width >= 768;

###### 

###### /\* =====================================================

###### &#x20;  BID TYPE

###### ===================================================== \*/

###### 

###### type Bid = {

###### &#x20; \_id: string;

###### &#x20; groupId: string;

###### &#x20; chitId?: string;

###### &#x20; memberId: string;

###### &#x20; groupMemberId: string;

###### &#x20; bidAmount: number;

###### &#x20; auctionDate: string;

###### &#x20; auctionTime: string;

###### &#x20; bidTime: string;

###### };

###### 

###### /\* =====================================================

###### &#x20;  PAGE

###### ===================================================== \*/

###### 

###### export default function CustomerBidRoom() {

###### &#x20; const router = useRouter();

###### 

###### &#x20; const params = useLocalSearchParams<{

###### &#x20;   groupId?: string;

###### &#x20;   groupCode?: string;

###### 

###### &#x20;   /\*

###### &#x20;     Old fields kept for backend compatibility

###### &#x20;   \*/

###### &#x20;   auctionDate?: string;

###### &#x20;   auctionTime?: string;

###### 

###### &#x20;   /\*

###### &#x20;     NEW:

###### &#x20;     These fields control the countdown/end state.

###### &#x20;   \*/

###### &#x20;   auctionEndDate?: string;

###### &#x20;   auctionEndTime?: string;

###### 

###### &#x20;   userid?: string;

###### &#x20;   memberId?: string;

###### &#x20; }>();

###### 

###### &#x20; /\* =====================================================

###### &#x20;    PARAMS

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const groupId = String(params.groupId || "");

###### &#x20; const groupCode = String(params.groupCode || "");

###### 

###### &#x20; /\*

###### &#x20;   Keep old auctionDate/auctionTime because the backend

###### &#x20;   Bid model currently expects them.

###### &#x20; \*/

###### &#x20; const auctionDate = String(params.auctionDate || "");

###### &#x20; const auctionTime = String(params.auctionTime || "");

###### 

###### &#x20; /\*

###### &#x20;   IMPORTANT:

###### &#x20;   Countdown ONLY uses these two.

###### &#x20; \*/

###### &#x20; const auctionEndDate = String(params.auctionEndDate || "");

###### &#x20; const auctionEndTime = String(params.auctionEndTime || "");

###### 

###### &#x20; const userid = String(

###### &#x20;   params.userid || params.memberId || ""

###### &#x20; );

###### 

###### &#x20; /\* =====================================================

###### &#x20;    STATE

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const \[bids, setBids] = useState<Bid\[]>(\[]);

###### &#x20; const \[loading, setLoading] = useState(true);

###### &#x20; const \[refreshing, setRefreshing] = useState(false);

###### 

###### &#x20; /\* =====================================================

###### &#x20;    PENDING INSTALLMENT CHECK

###### &#x20;    Member cannot bid if he has pending installments

###### &#x20;    for PAST months or the CURRENT month.

###### &#x20;    Future months do NOT block bidding.

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const \[installmentBlocked, setInstallmentBlocked] =

###### &#x20;   useState(false);

###### &#x20; const \[blockedReason, setBlockedReason] = useState("");

###### 

###### &#x20; /\* =====================================================

###### &#x20;    CHIT AMOUNT

###### &#x20;    The group's total chit value (e.g. ₹2,00,000 / ₹3,00,000).

###### &#x20;    Bidding starts from this amount.

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const \[chitAmount, setChitAmount] = useState(0);

###### 

###### &#x20; const \[countdown, setCountdown] = useState("--:--:--");

###### 

###### &#x20; const \[auctionStarted, setAuctionStarted] = useState(false);

###### &#x20; const \[auctionEnded, setAuctionEnded] = useState(false);

###### 

###### &#x20; const \[bidAmount, setBidAmount] = useState("");

###### &#x20; const \[selectedPredefinedIndex, setSelectedPredefinedIndex] = useState(0);

###### &#x20; const \[placingBid, setPlacingBid] = useState(false);

###### 

###### &#x20; const \[timeRemaining, setTimeRemaining] = useState({

###### &#x20;   days: 0,

###### &#x20;   hours: 0,

###### &#x20;   minutes: 0,

###### &#x20;   seconds: 0,

###### &#x20; });

###### 

###### &#x20; /\* =====================================================

###### &#x20;    ANIMATION

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const \[newBidCount, setNewBidCount] = useState(0);

###### &#x20; const \[lastBidCount, setLastBidCount] = useState(0);

###### 

###### &#x20; const fadeAnim = useRef(

###### &#x20;   new Animated.Value(0)

###### &#x20; ).current;

###### 

###### &#x20; /\* =====================================================

###### &#x20;    PREDEFINED BID AMOUNTS

###### &#x20; ===================================================== \*/

###### 

###### const PREDEFINED\_AMOUNTS = \[

###### &#x20; 10000,

###### &#x20; 20000,

###### &#x20; 30000,

###### &#x20; 40000,

###### &#x20; 50000,

###### &#x20; 60000,

###### &#x20; 70000,

###### &#x20; 80000,

###### &#x20; 90000,

###### ];

###### 

###### &#x20; /\* =====================================================

###### &#x20;    FORMAT AMOUNT

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const formatAmount = (amount: number) => {

###### &#x20;   return `₹${Number(amount || 0).toLocaleString("en-IN")}`;

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    FORMAT BID TIME

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const formatTime = (value: string) => {

###### &#x20;   if (!value) return "-";

###### 

###### &#x20;   const date = new Date(value);

###### 

###### &#x20;   if (Number.isNaN(date.getTime())) {

###### &#x20;     return value;

###### &#x20;   }

###### 

###### &#x20;   return date.toLocaleTimeString("en-IN", {

###### &#x20;     hour: "2-digit",

###### &#x20;     minute: "2-digit",

###### &#x20;     second: "2-digit",

###### &#x20;     hour12: true,

###### &#x20;   });

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    PARSE DATE

###### &#x20;

###### &#x20;    Supported:

###### &#x20;    DD-MM-YYYY

###### &#x20;    DD/MM/YYYY

###### &#x20;    DD-MM-YY

###### &#x20;    DD/MM/YY

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const parseDateParts = (dateStr: string) => {

###### &#x20;   if (!dateStr) return null;

###### 

###### &#x20;   const cleaned = dateStr.trim();

###### 

###### &#x20;   let parts: string\[] = \[];

###### 

###### &#x20;   if (cleaned.includes("/")) {

###### &#x20;     parts = cleaned.split("/");

###### &#x20;   } else if (cleaned.includes("-")) {

###### &#x20;     parts = cleaned.split("-");

###### &#x20;   } else {

###### &#x20;     return null;

###### &#x20;   }

###### 

###### &#x20;   if (parts.length !== 3) {

###### &#x20;     return null;

###### &#x20;   }

###### 

###### &#x20;   const day = parseInt(parts\[0], 10);

###### &#x20;   const month = parseInt(parts\[1], 10);

###### &#x20;   let year = parseInt(parts\[2], 10);

###### 

###### &#x20;   if (

###### &#x20;     !Number.isFinite(day) ||

###### &#x20;     !Number.isFinite(month) ||

###### &#x20;     !Number.isFinite(year)

###### &#x20;   ) {

###### &#x20;     return null;

###### &#x20;   }

###### 

###### &#x20;   if (year < 100) {

###### &#x20;     year += 2000;

###### &#x20;   }

###### 

###### &#x20;   return {

###### &#x20;     day,

###### &#x20;     month: month - 1,

###### &#x20;     year,

###### &#x20;   };

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    PARSE AUCTION END DATE/TIME

###### 

###### &#x20;    IMPORTANT:

###### &#x20;    ONLY auctionEndDate + auctionEndTime are used.

###### &#x20;

###### &#x20;    auctionDate / auctionTime are NOT used here.

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const parseAuctionEndDateTime = () => {

###### &#x20;   if (!auctionEndDate || !auctionEndTime) {

###### &#x20;     console.log(

###### &#x20;       "❌ Missing auction end date/time"

###### &#x20;     );

###### 

###### &#x20;     console.log(

###### &#x20;       "auctionEndDate:",

###### &#x20;       auctionEndDate

###### &#x20;     );

###### 

###### &#x20;     console.log(

###### &#x20;       "auctionEndTime:",

###### &#x20;       auctionEndTime

###### &#x20;     );

###### 

###### &#x20;     return null;

###### &#x20;   }

###### 

###### &#x20;   try {

###### &#x20;     const dateParts =

###### &#x20;       parseDateParts(auctionEndDate);

###### 

###### &#x20;     if (!dateParts) {

###### &#x20;       console.error(

###### &#x20;         "❌ Invalid auction end date:",

###### &#x20;         auctionEndDate

###### &#x20;       );

###### 

###### &#x20;       return null;

###### &#x20;     }

###### 

###### &#x20;     const timeParts = auctionEndTime

###### &#x20;       .trim()

###### &#x20;       .toLowerCase()

###### &#x20;       .match(

###### &#x20;         /^(\\d{1,2}):(\\d{2})(?:\\s\*(am|pm))?$/

###### &#x20;       );

###### 

###### &#x20;     if (!timeParts) {

###### &#x20;       console.error(

###### &#x20;         "❌ Invalid auction end time:",

###### &#x20;         auctionEndTime

###### &#x20;       );

###### 

###### &#x20;       return null;

###### &#x20;     }

###### 

###### &#x20;     let hours = parseInt(

###### &#x20;       timeParts\[1],

###### &#x20;       10

###### &#x20;     );

###### 

###### &#x20;     const minutes = parseInt(

###### &#x20;       timeParts\[2],

###### &#x20;       10

###### &#x20;     );

###### 

###### &#x20;     const meridiem = timeParts\[3];

###### 

###### &#x20;     if (meridiem === "pm" \&\& hours < 12) {

###### &#x20;       hours += 12;

###### &#x20;     }

###### 

###### &#x20;     if (meridiem === "am" \&\& hours === 12) {

###### &#x20;       hours = 0;

###### &#x20;     }

###### 

###### &#x20;     const targetDate = new Date(

###### &#x20;       dateParts.year,

###### &#x20;       dateParts.month,

###### &#x20;       dateParts.day,

###### &#x20;       hours,

###### &#x20;       minutes,

###### &#x20;       0,

###### &#x20;       0

###### &#x20;     );

###### 

###### &#x20;     if (

###### &#x20;       Number.isNaN(

###### &#x20;         targetDate.getTime()

###### &#x20;       )

###### &#x20;     ) {

###### &#x20;       return null;

###### &#x20;     }

###### 

###### &#x20;     console.log(

###### &#x20;       "========== AUCTION END =========="

###### &#x20;     );

###### 

###### &#x20;     console.log(

###### &#x20;       "auctionEndDate:",

###### &#x20;       auctionEndDate

###### &#x20;     );

###### 

###### &#x20;     console.log(

###### &#x20;       "auctionEndTime:",

###### &#x20;       auctionEndTime

###### &#x20;     );

###### 

###### &#x20;     console.log(

###### &#x20;       "Parsed end:",

###### &#x20;       targetDate.toString()

###### &#x20;     );

###### 

###### &#x20;     console.log(

###### &#x20;       "================================="

###### &#x20;     );

###### 

###### &#x20;     return targetDate;

###### &#x20;   } catch (error) {

###### &#x20;     console.error(

###### &#x20;       "❌ Error parsing auction end:",

###### &#x20;       error

###### &#x20;     );

###### 

###### &#x20;     return null;

###### &#x20;   }

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    COUNTDOWN

###### 

###### &#x20;    IMPORTANT:

###### &#x20;    Auction status is based ONLY on:

###### &#x20;

###### &#x20;    auctionEndDate + auctionEndTime

###### &#x20; ===================================================== \*/

###### 

###### &#x20; useEffect(() => {

###### &#x20;   let timer: ReturnType<

###### &#x20;     typeof setInterval

###### &#x20;   > | null = null;

###### 

###### &#x20;   const updateCountdown = () => {

###### &#x20;     const auctionEndDateTime =

###### &#x20;       parseAuctionEndDateTime();

###### 

###### &#x20;     if (!auctionEndDateTime) {

###### &#x20;       setCountdown("--:--:--");

###### 

###### &#x20;       /\*

###### &#x20;         We don't know the end time.

###### &#x20;         Don't incorrectly mark it as ended.

###### &#x20;       \*/

###### &#x20;       setAuctionStarted(true);

###### &#x20;       setAuctionEnded(false);

###### 

###### &#x20;       setTimeRemaining({

###### &#x20;         days: 0,

###### &#x20;         hours: 0,

###### &#x20;         minutes: 0,

###### &#x20;         seconds: 0,

###### &#x20;       });

###### 

###### &#x20;       return;

###### &#x20;     }

###### 

###### &#x20;     const now = new Date();

###### 

###### &#x20;     const difference =

###### &#x20;       auctionEndDateTime.getTime() -

###### &#x20;       now.getTime();

###### 

###### &#x20;     /\*

###### &#x20;       END CONDITION

###### &#x20;     \*/

###### 

###### &#x20;     if (difference <= 0) {

###### &#x20;       setCountdown("00:00:00");

###### 

###### &#x20;       setAuctionStarted(true);

###### &#x20;       setAuctionEnded(true);

###### 

###### &#x20;       setTimeRemaining({

###### &#x20;         days: 0,

###### &#x20;         hours: 0,

###### &#x20;         minutes: 0,

###### &#x20;         seconds: 0,

###### &#x20;       });

###### 

###### &#x20;       return;

###### &#x20;     }

###### 

###### &#x20;     /\*

###### &#x20;       Until end date/time is reached,

###### &#x20;       auction is considered active.

###### &#x20;     \*/

###### 

###### &#x20;     setAuctionStarted(true);

###### &#x20;     setAuctionEnded(false);

###### 

###### &#x20;     const totalSeconds = Math.floor(

###### &#x20;       difference / 1000

###### &#x20;     );

###### 

###### &#x20;     const days = Math.floor(

###### &#x20;       totalSeconds / 86400

###### &#x20;     );

###### 

###### &#x20;     const hours = Math.floor(

###### &#x20;       (totalSeconds % 86400) / 3600

###### &#x20;     );

###### 

###### &#x20;     const minutes = Math.floor(

###### &#x20;       (totalSeconds % 3600) / 60

###### &#x20;     );

###### 

###### &#x20;     const seconds =

###### &#x20;       totalSeconds % 60;

###### 

###### &#x20;     setTimeRemaining({

###### &#x20;       days,

###### &#x20;       hours,

###### &#x20;       minutes,

###### &#x20;       seconds,

###### &#x20;     });

###### 

###### &#x20;     if (days > 0) {

###### &#x20;       setCountdown(

###### &#x20;         `${days}d ${String(hours).padStart(

###### &#x20;           2,

###### &#x20;           "0"

###### &#x20;         )}h ${String(minutes).padStart(

###### &#x20;           2,

###### &#x20;           "0"

###### &#x20;         )}m ${String(seconds).padStart(

###### &#x20;           2,

###### &#x20;           "0"

###### &#x20;         )}s`

###### &#x20;       );

###### &#x20;     } else {

###### &#x20;       setCountdown(

###### &#x20;         `${String(hours).padStart(

###### &#x20;           2,

###### &#x20;           "0"

###### &#x20;         )}:${String(minutes).padStart(

###### &#x20;           2,

###### &#x20;           "0"

###### &#x20;         )}:${String(seconds).padStart(

###### &#x20;           2,

###### &#x20;           "0"

###### &#x20;         )}`

###### &#x20;       );

###### &#x20;     }

###### &#x20;   };

###### 

###### &#x20;   updateCountdown();

###### 

###### &#x20;   timer = setInterval(

###### &#x20;     updateCountdown,

###### &#x20;     1000

###### &#x20;   );

###### 

###### &#x20;   return () => {

###### &#x20;     if (timer) {

###### &#x20;       clearInterval(timer);

###### &#x20;     }

###### &#x20;   };

###### &#x20; }, \[

###### &#x20;   auctionEndDate,

###### &#x20;   auctionEndTime,

###### &#x20; ]);

###### 

###### &#x20; /\* =====================================================

###### &#x20;    LOAD LIVE BIDS

###### &#x20; ===================================================== \*/

###### 

###### &#x20;const loadBids = async () => {

###### &#x20; const auctionGroupId = groupId || groupCode;

###### 

###### &#x20; if (!auctionGroupId) {

###### &#x20;   console.log("❌ Missing group information");

###### &#x20;   setLoading(false);

###### &#x20;   return;

###### &#x20; }

###### 

###### &#x20; try {

###### &#x20;   let url =

###### &#x20;     `${BACKEND\\\\\\\_URL}/bids/live` +

###### &#x20;     `?groupId=${encodeURIComponent(auctionGroupId)}`;

###### 

###### &#x20;   if (auctionDate) {

###### &#x20;     url +=

###### &#x20;       `\\\\\\\&auctionDate=${encodeURIComponent(auctionDate)}`;

###### &#x20;   }

###### 

###### &#x20;   if (auctionTime) {

###### &#x20;     url +=

###### &#x20;       `\\\\\\\&auctionTime=${encodeURIComponent(auctionTime)}`;

###### &#x20;   }

###### 

###### &#x20;   console.log("========== CUSTOMER LIVE BIDS ==========");

###### &#x20;   console.log("URL:", url);

###### &#x20;   console.log("groupId:", auctionGroupId);

###### &#x20;   console.log("auctionDate:", auctionDate);

###### &#x20;   console.log("auctionTime:", auctionTime);

###### &#x20;   console.log("auctionEndDate:", auctionEndDate);

###### &#x20;   console.log("auctionEndTime:", auctionEndTime);

###### &#x20;   console.log("========================================");

###### 

###### &#x20;   const response = await fetch(url, {

###### &#x20;     method: "GET",

###### &#x20;     headers: {

###### &#x20;       Accept: "application/json",

###### &#x20;     },

###### &#x20;   });

###### 

###### &#x20;   const rawText = await response.text();

###### 

###### &#x20;   console.log(

###### &#x20;     "LIVE BID STATUS:",

###### &#x20;     response.status

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "LIVE BID RESPONSE:",

###### &#x20;     rawText

###### &#x20;   );

###### 

###### &#x20;   let data;

###### 

###### &#x20;   try {

###### &#x20;     data = JSON.parse(rawText);

###### &#x20;   } catch {

###### &#x20;     throw new Error(

###### &#x20;       `Invalid server response (${response.status})`

###### &#x20;     );

###### &#x20;   }

###### 

###### &#x20;   if (!response.ok) {

###### &#x20;     throw new Error(

###### &#x20;       data?.message ||

###### &#x20;       `Failed to load bids (${response.status})`

###### &#x20;     );

###### &#x20;   }

###### 

###### &#x20;   let receivedBids: Bid\[] = \[];

###### 

###### &#x20;   if (Array.isArray(data)) {

###### &#x20;     receivedBids = data;

###### &#x20;   } else if (Array.isArray(data?.bids)) {

###### &#x20;     receivedBids = data.bids;

###### &#x20;   }

###### 

###### &#x20;   // Sort oldest first so ticket numbers are assigned

###### &#x20;   // chronologically and stay stable (1, 2, 3, 4...)

###### &#x20;   receivedBids.sort(

###### &#x20;     (a, b) =>

###### &#x20;       new Date(a.bidTime).getTime() -

###### &#x20;       new Date(b.bidTime).getTime()

###### &#x20;   );

###### 

###### &#x20;   setBids(receivedBids);

###### &#x20;   setLastBidCount(receivedBids.length);

###### 

###### &#x20;   console.log(

###### &#x20;     "✅ LIVE BIDS COUNT:",

###### &#x20;     receivedBids.length

###### &#x20;   );

###### &#x20; } catch (error) {

###### &#x20;   console.error(

###### &#x20;     "❌ LIVE BID ERROR:",

###### &#x20;     error

###### &#x20;   );

###### &#x20; } finally {

###### &#x20;   setLoading(false);

###### &#x20;   setRefreshing(false);

###### &#x20; }

###### };

###### 

###### &#x20; /\* =====================================================

###### &#x20;     LOAD OUTSTANDING (PENDING INSTALLMENTS)

###### &#x20;     Blocks bidding only for overdue (past months)

###### &#x20;     and current-month dues. Future dues are ignored.

###### &#x20;  ===================================================== \*/

###### 

###### &#x20; useEffect(() => {

###### &#x20;   const checkOutstanding = async () => {

###### &#x20;     if (!userid) return;

###### 

###### &#x20;     try {

###### &#x20;       const res = await fetch(

###### &#x20;         `${BACKEND\\\\\\\_URL}/member/my-outstanding/${encodeURIComponent(userid)}`

###### &#x20;       );

###### 

###### &#x20;       if (!res.ok) {

###### &#x20;         setInstallmentBlocked(false);

###### &#x20;         return;

###### &#x20;       }

###### 

###### &#x20;       const data = await res.json();

###### 

###### &#x20;       const overdue = Number(data?.overdueAmount || 0);

###### &#x20;       const dueThisMonth = Number(data?.dueThisMonth || 0);

###### 

###### &#x20;       /\*

###### &#x20;         Only PAST months (overdue) and the PRESENT month

###### &#x20;         (dueThisMonth) block bidding.

###### &#x20;         Upcoming/future months are NOT considered.

###### &#x20;       \*/

###### &#x20;       if (overdue > 0 || dueThisMonth > 0) {

###### &#x20;         setBlockedReason(

###### &#x20;           `You have pending installment payment(s)${

###### &#x20;             overdue > 0

###### &#x20;               ? ` of ${formatAmount(overdue)} from previous month(s)`

###### &#x20;               : ""

###### &#x20;           }${

###### &#x20;             dueThisMonth > 0

###### &#x20;               ? `${overdue > 0 ? " and" : " of"} ${formatAmount(

###### &#x20;                   dueThisMonth

###### &#x20;                 )} for this month`

###### &#x20;               : ""

###### &#x20;           }. Please clear your pending installment(s) to participate in bidding.`

###### &#x20;         );

###### &#x20;         setInstallmentBlocked(true);

###### &#x20;       } else {

###### &#x20;         setInstallmentBlocked(false);

###### &#x20;         setBlockedReason("");

###### &#x20;       }

###### &#x20;     } catch (error) {

###### &#x20;       console.log("Outstanding check error:", error);

###### &#x20;       // Fail open – don't block bidding on network errors

###### &#x20;       setInstallmentBlocked(false);

###### &#x20;     }

###### &#x20;   };

###### 

###### &#x20;   checkOutstanding();

###### &#x20; }, \[userid]);

###### 

###### &#x20; /\* =====================================================

###### &#x20;     LOAD CHIT AMOUNT FOR THE GROUP

###### &#x20;  ===================================================== \*/

###### 

###### &#x20; useEffect(() => {

###### &#x20;   const loadChitAmount = async () => {

###### &#x20;     const publicGroupId = groupCode || groupId;

###### &#x20;     if (!publicGroupId) return;

###### 

###### &#x20;     try {

###### &#x20;       /\*

###### &#x20;         Fetch the group directly by its public groupId.

###### &#x20;         Chit Amount = installment × total months.

###### &#x20;       \*/

###### &#x20;       const res = await fetch(

###### &#x20;         `${BACKEND\\\\\\\_URL}/groups/group-id/${encodeURIComponent(publicGroupId)}`

###### &#x20;       );

###### 

###### &#x20;       if (!res.ok) return;

###### 

###### &#x20;       const group = await res.json();

###### 

###### &#x20;       const installment = Number(

###### &#x20;         group?.collectionPlans?.\[0]?.installmentAmount ||

###### &#x20;           group?.collectionPlans?.\[0]?.amount ||

###### &#x20;           0

###### &#x20;       );

###### &#x20;       const totalMonths = Number(group?.totalCollections || 0);

###### 

###### &#x20;       if (installment > 0 \&\& totalMonths > 0) {

###### &#x20;         setChitAmount(installment \* totalMonths);

###### &#x20;       }

###### &#x20;     } catch (error) {

###### &#x20;       console.log("Chit amount load error:", error);

###### &#x20;     }

###### &#x20;   };

###### 

###### &#x20;   loadChitAmount();

###### &#x20; }, \[groupId, groupCode]);

###### 

###### &#x20; /\* =====================================================

###### &#x20;     LOAD WHEN PAGE OPENS

###### &#x20;  ===================================================== \*/

###### 

###### &#x20; /\* =====================================================

###### &#x20;    AUTO REFRESH

###### &#x20; ===================================================== \*/

###### 

###### &#x20; useEffect(() => {

###### &#x20;   const interval =

###### &#x20;     setInterval(() => {

###### &#x20;       loadBids();

###### &#x20;     }, 5000);

###### 

###### &#x20;   return () => {

###### &#x20;     clearInterval(

###### &#x20;       interval

###### &#x20;     );

###### &#x20;   };

###### &#x20; }, \[

###### &#x20;   groupId,

###### &#x20;   groupCode,

###### &#x20;   auctionDate,

###### &#x20;   auctionTime,

###### &#x20;   auctionEndDate,

###### &#x20;   auctionEndTime,

###### &#x20; ]);

###### 

###### &#x20; /\* =====================================================

###### &#x20;    REFRESH

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const onRefresh = () => {

###### &#x20;   setRefreshing(true);

###### &#x20;   loadBids();

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    PREDEFINED AMOUNT

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const handlePredefinedAmount = (

###### &#x20;   amount: number

###### &#x20; ) => {

###### &#x20;   if (auctionEnded) {

###### &#x20;     Alert.alert(

###### &#x20;       "Auction Ended",

###### &#x20;       "This auction has ended."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   setBidAmount(

###### &#x20;     String(amount)

###### &#x20;   );

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    PLACE BID

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const placeBid = async () => {

###### &#x20;   const cleanAmount =

###### &#x20;     bidAmount

###### &#x20;       .replace(/,/g, "")

###### &#x20;       .trim();

###### 

###### &#x20;   const amount =

###### &#x20;     Number(cleanAmount);

###### 

###### &#x20;   console.log(

###### &#x20;     "========== PLACE BID =========="

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "groupId:",

###### &#x20;     groupId

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "userid:",

###### &#x20;     userid

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "bidAmount:",

###### &#x20;     amount

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "auctionDate:",

###### &#x20;     auctionDate

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "auctionTime:",

###### &#x20;     auctionTime

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "auctionEndDate:",

###### &#x20;     auctionEndDate

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "auctionEndTime:",

###### &#x20;     auctionEndTime

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "================================"

###### &#x20;   );

###### 

###### &#x20;   /\* =====================================================

###### &#x20;      VALIDATION

###### &#x20;   ===================================================== \*/

###### 

###### &#x20;   if (!userid) {

###### &#x20;     Alert.alert(

###### &#x20;       "Unable to place bid",

###### &#x20;       "Member ID is missing. Please go back and open the Bid Room again."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   if (!groupId) {

###### &#x20;     Alert.alert(

###### &#x20;       "Unable to place bid",

###### &#x20;       "Group information is missing."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   if (!auctionEndDate) {

###### &#x20;     Alert.alert(

###### &#x20;       "Auction Information Missing",

###### &#x20;       "Auction end date is missing."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   if (!auctionEndTime) {

###### &#x20;     Alert.alert(

###### &#x20;       "Auction Information Missing",

###### &#x20;       "Auction end time is missing."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   if (!cleanAmount) {

###### &#x20;     Alert.alert(

###### &#x20;       "Enter Bid Amount",

###### &#x20;       "Please enter the amount you want to bid."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   if (

###### &#x20;     !Number.isFinite(

###### &#x20;       amount

###### &#x20;     ) ||

###### &#x20;     amount <= 0

###### &#x20;   ) {

###### &#x20;     Alert.alert(

###### &#x20;       "Invalid Amount",

###### &#x20;       "Please enter a valid bid amount."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   /\*

###### &#x20;     IMPORTANT:

###### &#x20;     Final client-side check is based ONLY

###### &#x20;     on auctionEndDate + auctionEndTime.

###### &#x20;   \*/

###### 

###### &#x20;   const endDateTime =

###### &#x20;     parseAuctionEndDateTime();

###### 

###### &#x20;   if (!endDateTime) {

###### &#x20;     Alert.alert(

###### &#x20;       "Invalid Auction Time",

###### &#x20;       "The auction end date or time is invalid."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   if (

###### &#x20;     new Date().getTime() >=

###### &#x20;     endDateTime.getTime()

###### &#x20;   ) {

###### &#x20;     setAuctionEnded(true);

###### 

###### &#x20;     Alert.alert(

###### &#x20;       "Auction Ended",

###### &#x20;       "This auction has ended. Bidding is no longer available."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   /\*

###### &#x20;     BLOCK BID IF PENDING INSTALLMENTS EXIST

###### &#x20;     (past months + current month only)

###### &#x20;   \*/

###### &#x20;   if (installmentBlocked) {

###### &#x20;     Alert.alert(

###### &#x20;       "Bidding Disabled",

###### &#x20;       blockedReason ||

###### &#x20;         "You have pending installment payments. Please clear them to bid."

###### &#x20;     );

###### 

###### &#x20;     return;

###### &#x20;   }

###### 

###### &#x20;   /\* =====================================================

###### &#x20;      PLACE BID API

###### &#x20;   ===================================================== \*/

###### 

###### &#x20;   const url =

###### &#x20;     `${BACKEND\\\\\\\_URL}/bids/place`;

###### 

###### &#x20;   /\*

###### &#x20;     IMPORTANT:

###### &#x20;     Your current Bid model expects:

###### &#x20;       auctionDate

###### &#x20;       auctionTime

###### 

###### &#x20;     We therefore continue sending those fields.

###### 

###### &#x20;     The countdown/status itself uses:

###### &#x20;       auctionEndDate

###### &#x20;       auctionEndTime

###### &#x20;   \*/

###### 

###### &#x20;   const body = {

###### &#x20;     groupId: groupId,

###### 

###### &#x20;     memberId: userid,

###### 

###### &#x20;     bidAmount: amount,

###### 

###### &#x20;     auctionDate:

###### &#x20;       auctionDate ||

###### &#x20;       auctionEndDate,

###### 

###### &#x20;     auctionTime:

###### &#x20;       auctionTime ||

###### &#x20;       auctionEndTime,

###### &#x20;   };

###### 

###### &#x20;   console.log(

###### &#x20;     "BID API URL:",

###### &#x20;     url

###### &#x20;   );

###### 

###### &#x20;   console.log(

###### &#x20;     "BID REQUEST:",

###### &#x20;     JSON.stringify(

###### &#x20;       body,

###### &#x20;       null,

###### &#x20;       2

###### &#x20;     )

###### &#x20;   );

###### 

###### &#x20;   try {

###### &#x20;     setPlacingBid(true);

###### 

###### &#x20;     const response =

###### &#x20;       await fetch(url, {

###### &#x20;         method: "POST",

###### 

###### &#x20;         headers: {

###### &#x20;           "Content-Type":

###### &#x20;             "application/json",

###### 

###### &#x20;           Accept:

###### &#x20;             "application/json",

###### &#x20;         },

###### 

###### &#x20;         body:

###### &#x20;           JSON.stringify(

###### &#x20;             body

###### &#x20;           ),

###### &#x20;       });

###### 

###### &#x20;     const rawText =

###### &#x20;       await response.text();

###### 

###### &#x20;     console.log(

###### &#x20;       "BID RESPONSE STATUS:",

###### &#x20;       response.status

###### &#x20;     );

###### 

###### &#x20;     console.log(

###### &#x20;       "BID RAW RESPONSE:",

###### &#x20;       rawText

###### &#x20;     );

###### 

###### &#x20;     let data: any;

###### 

###### &#x20;     try {

###### &#x20;       data =

###### &#x20;         JSON.parse(

###### &#x20;           rawText

###### &#x20;         );

###### &#x20;     } catch {

###### &#x20;       throw new Error(

###### &#x20;         `Server returned an invalid response (${response.status}).`

###### &#x20;       );

###### &#x20;     }

###### 

###### &#x20;     if (!response.ok) {

###### &#x20;       throw new Error(

###### &#x20;         data?.message ||

###### &#x20;           `Failed to place bid (${response.status})`

###### &#x20;       );

###### &#x20;     }

###### 

###### &#x20;     console.log(

###### &#x20;       "✅ BID CREATED:",

###### &#x20;       data

###### &#x20;     );

###### 

###### &#x20;     setBidAmount("");

###### 

###### &#x20;     /\*

###### &#x20;       Reload immediately so the new bid

###### &#x20;       appears in All Bids.

###### &#x20;     \*/

###### 

###### &#x20;     await loadBids();

###### 

###### &#x20;     Alert.alert(

###### &#x20;       "🎉 Bid Submitted!",

###### &#x20;       `Your bid of ${formatAmount(

###### &#x20;         amount

###### &#x20;       )} has been submitted successfully.`,

###### &#x20;       \[

###### &#x20;         {

###### &#x20;           text: "OK",

###### &#x20;         },

###### &#x20;       ]

###### &#x20;     );

###### &#x20;   } catch (error: any) {

###### &#x20;     /\*

###### &#x20;       Use console.log (NOT console.error) so the

###### &#x20;       red LogBox "Console Error" popup does not

###### &#x20;       appear. The Alert below already informs

###### &#x20;       the user (e.g. pending installment block).

###### &#x20;     \*/

###### &#x20;     console.log(

###### &#x20;       "PLACE BID BLOCKED/FAILED:",

###### &#x20;       error?.message || error

###### &#x20;     );

###### 

###### &#x20;     Alert.alert(

###### &#x20;       "Bid Failed",

###### &#x20;       error?.message ||

###### &#x20;         "Unable to place your bid. Please try again."

###### &#x20;     );

###### &#x20;   } finally {

###### &#x20;     setPlacingBid(

###### &#x20;       false

###### &#x20;     );

###### &#x20;   }

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    HIGHEST BID

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const highestBid =

###### &#x20;   bids.length > 0

###### &#x20;     ? Math.max(

###### &#x20;         ...bids.map(

###### &#x20;           (bid) =>

###### &#x20;             Number(

###### &#x20;               bid.bidAmount || 0

###### &#x20;             )

###### &#x20;         )

###### &#x20;       )

###### &#x20;     : 0;

###### 

###### &#x20; /\* =====================================================

###### &#x20;    DISPLAY BIDS

###### &#x20;

###### &#x20;    Sorted by bid amount descending (highest first)

###### &#x20;    so the highest bid appears at the top.

###### &#x20;

###### &#x20;    Ticket numbers are still based on chronological

###### &#x20;    order (index in `bids` array).

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const displayBids = \[...bids].sort(

###### &#x20;   (a, b) =>

###### &#x20;     Number(b.bidAmount || 0) -

###### &#x20;     Number(a.bidAmount || 0)

###### &#x20; );

###### 

###### &#x20; /\* =====================================================

###### &#x20;    GET TICKET NUMBER

###### &#x20;

###### &#x20;    Returns the chronological ticket number for a bid.

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const getTicketNumber = (

###### &#x20;   bidId: string

###### &#x20; ) => {

###### &#x20;   const chronologicalIndex =

###### &#x20;     bids.findIndex(

###### &#x20;       (bid) =>

###### &#x20;         bid.\_id === bidId

###### &#x20;     );

###### 

###### &#x20;   return chronologicalIndex + 1;

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    CURRENT USER BID

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const isCurrentUserBid = (

###### &#x20;   memberId: string

###### &#x20; ) => {

###### &#x20;   return (

###### &#x20;     String(memberId) ===

###### &#x20;     String(userid)

###### &#x20;   );

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    FOOTER

###### &#x20; ===================================================== \*/

###### 

###### &#x20; const Footer = () => (

###### &#x20;   <View className="bg-white border-t border-gray-200 pt-5 pb-7 px-5">

###### &#x20;     <View className="items-center">

###### &#x20;       <Text className="text-\\\\\\\[#024e32] font-bold text-base">

###### &#x20;         MANIKYA CHITS PVT LTD

###### &#x20;       </Text>

###### 

###### &#x20;       <Text className="text-gray-500 text-xs mt-1 text-center">

###### &#x20;         Secure • Transparent • Trusted

###### &#x20;       </Text>

###### 

###### &#x20;       <Text className="text-gray-400 text-\\\\\\\[10px] mt-1 text-center">

###### &#x20;         ©{" "}

###### &#x20;         {new Date().getFullYear()}{" "}

###### &#x20;         Manikya Chits Pvt Ltd.

###### &#x20;         All rights reserved.

###### &#x20;       </Text>

###### &#x20;     </View>

###### &#x20;   </View>

###### &#x20; );

###### 

###### &#x20; // =====================================================

###### &#x20; // BID BUBBLE COMPONENT - WhatsApp Style

###### &#x20; // =====================================================

###### 

###### &#x20; const BidBubble = ({ bid, isUserBid, isHighest, ticketNumber }: any) => {

###### &#x20;   return (

###### &#x20;     <View

###### &#x20;       className={`mb-3 ${isUserBid ? "items-end" : "items-start"}`}

###### &#x20;     >

###### &#x20;       <View

###### &#x20;         className={`max-w-\[85%] rounded-2xl px-4 py-3 ${

###### &#x20;           isUserBid

###### &#x20;             ? "bg-\[#024E32] rounded-tr-none"

###### &#x20;             : "bg-white border border-gray-200 rounded-tl-none"

###### &#x20;         }`}

###### &#x20;       >

###### &#x20;         {/\* Header - Ticket Number \*/}

###### &#x20;         <View className="flex-row items-center mb-1">

###### &#x20;           <Text

###### &#x20;             className={`text-\[9px] font-semibold ${

###### &#x20;               isUserBid ? "text-white/60" : "text-gray-400"

###### &#x20;             }`}

###### &#x20;           >

###### &#x20;             Ticket #{ticketNumber}

###### &#x20;           </Text>

###### &#x20;           {isHighest \&\& (

###### &#x20;             <View className="ml-2 bg-yellow-400 px-2 py-0.5 rounded-full">

###### &#x20;               <Text className="text-yellow-800 text-\\\\\\\[8px] font-bold">

###### &#x20;                 🏆 HIGHEST

###### &#x20;               </Text>

###### &#x20;             </View>

###### &#x20;           )}

###### &#x20;           {isUserBid \&\& (

###### &#x20;             <View className="ml-2 bg-white/20 px-2 py-0.5 rounded-full">

###### &#x20;               <Text className="text-white text-\\\\\\\[8px] font-bold">

###### &#x20;                 YOU

###### &#x20;               </Text>

###### &#x20;             </View>

###### &#x20;           )}

###### &#x20;         </View>

###### 

###### &#x20;         {/\* Bid Amount \*/}

###### &#x20;         <Text

###### &#x20;           className={`text-xl font-extrabold ${

###### &#x20;             isUserBid ? "text-white" : "text-\[#024E32]"

###### &#x20;           }`}

###### &#x20;         >

###### &#x20;           {formatAmount(bid.bidAmount)}

###### &#x20;         </Text>

###### 

###### &#x20;         {/\* Time \*/}

###### &#x20;         <View className="flex-row items-center mt-1">

###### &#x20;           <MaterialIcons

###### &#x20;             name="schedule"

###### &#x20;             size={12}

###### &#x20;             color={isUserBid ? "rgba(255,255,255,0.5)" : "#9CA3AF"}

###### &#x20;           />

###### &#x20;           <Text

###### &#x20;             className={`text-\[10px] ml-1 ${

###### &#x20;               isUserBid ? "text-white/50" : "text-gray-400"

###### &#x20;             }`}

###### &#x20;           >

###### &#x20;             {formatTime(bid.bidTime)}

###### &#x20;           </Text>

###### &#x20;         </View>

###### &#x20;       </View>

###### &#x20;     </View>

###### &#x20;   );

###### &#x20; };

###### 

###### &#x20; /\* =====================================================

###### &#x20;    UI

###### &#x20; ===================================================== \*/

###### 

###### &#x20; return (

###### &#x20;   <SafeAreaView className="flex-1 bg-\\\\\\\[#F5F7F6]">

###### &#x20;     <StatusBar

###### &#x20;       barStyle="light-content"

###### &#x20;       backgroundColor="#024E32"

###### &#x20;     />

###### 

###### &#x20;     <KeyboardAvoidingView

###### &#x20;       className="flex-1"

###### &#x20;       behavior={

###### &#x20;         Platform.OS === "ios"

###### &#x20;           ? "padding"

###### &#x20;           : undefined

###### &#x20;       }

###### &#x20;       keyboardVerticalOffset={

###### &#x20;         Platform.OS === "ios"

###### &#x20;           ? 10

###### &#x20;           : 0

###### &#x20;       }

###### &#x20;     >

###### 

###### &#x20;       {/\* =================================================

###### &#x20;           HEADER

###### &#x20;       ================================================= \*/}

###### 

###### 

###### <View

###### &#x20; className="bg-\[#024E32] px-5"

###### &#x20; style={{

###### &#x20;   paddingTop: Platform.OS === "ios" ? 50 : 30,

###### &#x20;   paddingBottom: 20,

###### &#x20; }}

###### >

###### &#x20; <View className="flex-row items-center">

###### &#x20;   <TouchableOpacity

###### &#x20;     onPress={() => router.back()}

###### &#x20;     className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"

###### &#x20;     activeOpacity={0.7}

###### &#x20;     style={{

###### &#x20;       width: isTablet ? 44 : 40,

###### &#x20;       height: isTablet ? 44 : 40,

###### &#x20;     }}

###### &#x20;   >

###### &#x20;     <MaterialIcons

###### &#x20;       name="arrow-back"

###### &#x20;       size={isTablet ? 26 : 24}

###### &#x20;       color="white"

###### &#x20;     />

###### &#x20;   </TouchableOpacity>

###### 

###### &#x20;   <View className="ml-3 flex-1">

###### &#x20;     <Text

###### &#x20;       className="text-white font-bold"

###### &#x20;       style={{

###### &#x20;         fontSize: isTablet ? 24 : 20,

###### &#x20;       }}

###### &#x20;     >

###### &#x20;       🏛️ Bid Room

###### &#x20;     </Text>

###### 

###### &#x20;     <Text className="text-green-100 text-xs mt-0.5">

###### &#x20;       Group {groupCode || groupId}

###### &#x20;     </Text>

###### &#x20;   </View>

###### 

###### &#x20;   <View className="flex-row items-center">

###### &#x20;     {newBidCount > 0 \&\& (

###### &#x20;       <Animated.View

###### &#x20;         style={{ opacity: fadeAnim }}

###### &#x20;         className="bg-red-500 rounded-full px-2.5 py-0.5 mr-2"

###### &#x20;       >

###### &#x20;         <Text className="text-white text-\\\\\\\[10px] font-bold">

###### &#x20;           +{newBidCount}

###### &#x20;         </Text>

###### &#x20;       </Animated.View>

###### &#x20;     )}

###### 

###### &#x20;     <TouchableOpacity

###### &#x20;       onPress={onRefresh}

###### &#x20;       className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"

###### &#x20;       activeOpacity={0.7}

###### &#x20;       style={{

###### &#x20;         width: isTablet ? 44 : 40,

###### &#x20;         height: isTablet ? 44 : 40,

###### &#x20;       }}

###### &#x20;     >

###### &#x20;       <MaterialIcons

###### &#x20;         name="refresh"

###### &#x20;         size={isTablet ? 25 : 23}

###### &#x20;         color="white"

###### &#x20;         style={{ opacity: refreshing ? 0.5 : 1 }}

###### &#x20;       />

###### &#x20;     </TouchableOpacity>

###### &#x20;   </View>

###### &#x20; </View>

###### </View>

###### 

###### &#x20;       {/\* =================================================

###### &#x20;           CONTENT

###### &#x20;       ================================================= \*/}

###### 

###### &#x20;       <ScrollView

###### &#x20;         showsVerticalScrollIndicator={

###### &#x20;           false

###### &#x20;         }

###### &#x20;         keyboardShouldPersistTaps="handled"

###### &#x20;         refreshControl={

###### &#x20;           <RefreshControl

###### &#x20;             refreshing={

###### &#x20;               refreshing

###### &#x20;             }

###### &#x20;             onRefresh={

###### &#x20;               onRefresh

###### &#x20;             }

###### &#x20;           />

###### &#x20;         }

###### &#x20;         contentContainerStyle={{

###### &#x20;           padding: isTablet ? 30 : 20,

###### &#x20;           paddingBottom: 20,

###### &#x20;           flexGrow: 1,

###### &#x20;         }}

###### &#x20;       >

###### 

###### &#x20;         <View style={{ flex: 1 }}>

###### 

###### &#x20;           {/\* =================================================

###### &#x20;               AUCTION INFO

###### &#x20;           ================================================= \*/}

###### 

###### &#x20;           <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">

###### 

###### &#x20;             <View className="flex-row items-center">

###### 

###### &#x20;               <View className="w-11 h-11 rounded-2xl bg-\\\\\\\[#EAF5EF] items-center justify-center">

###### &#x20;                 <MaterialIcons

###### &#x20;                   name="gavel"

###### &#x20;                   size={24}

###### &#x20;                   color="#024E32"

###### &#x20;                 />

###### &#x20;               </View>

###### 

###### &#x20;               <View className="ml-3 flex-1">

###### 

###### &#x20;                 <Text className="text-gray-400 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;                   Live Auction

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text className="text-gray-900 text-base font-bold">

###### &#x20;                   {groupCode ||

###### &#x20;                     groupId}

###### &#x20;                 </Text>

###### 

###### &#x20;               </View>

###### 

###### &#x20;               <View

###### &#x20;                 className={`px-3 py-1.5 rounded-full ${

###### &#x20;                   auctionEnded

###### &#x20;                     ? "bg-red-500"

###### &#x20;                     : "bg-green-500"

###### &#x20;                 }`}

###### &#x20;               >

###### &#x20;                 <Text className="text-white text-\\\\\\\[10px] font-bold tracking-wider">

###### &#x20;                   {auctionEnded

###### &#x20;                     ? "ENDED"

###### &#x20;                     : "LIVE"}

###### &#x20;                 </Text>

###### &#x20;               </View>

###### 

###### &#x20;             </View>

###### 

###### &#x20;             <View className="flex-row flex-wrap mt-5 pt-4 border-t border-gray-100">

###### 

###### &#x20;               {/\* END DATE \*/}

###### 

###### &#x20;               <View className="flex-1 min-w-\\\\\\\[110px]">

###### &#x20;                 <Text className="text-gray-400 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;                   📅 End Date

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text className="text-gray-800 font-semibold mt-1 text-sm">

###### &#x20;                   {auctionEndDate ||

###### &#x20;                     "-"}

###### &#x20;                 </Text>

###### &#x20;               </View>

###### 

###### &#x20;               {/\* END TIME \*/}

###### 

###### &#x20;               <View className="flex-1 min-w-\\\\\\\[110px]">

###### &#x20;                 <Text className="text-gray-400 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;                   ⏰ End Time

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text className="text-gray-800 font-semibold mt-1 text-sm">

###### &#x20;                   {auctionEndTime ||

###### &#x20;                     "-"}

###### &#x20;                 </Text>

###### &#x20;               </View>

###### 

###### &#x20;               {/\* USER ID \*/}

###### 

###### &#x20;               <View className="flex-1 min-w-\\\\\\\[100px]">

###### &#x20;                 <Text className="text-gray-400 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;                   👤 Your ID

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text className="text-gray-800 font-semibold mt-1 text-sm">

###### &#x20;                   {userid ||

###### &#x20;                     "-"}

###### &#x20;                 </Text>

###### &#x20;               </View>

###### 

###### &#x20;             </View>

###### &#x20;           </View>

###### 

###### &#x20;           {/\* =================================================

###### &#x20;               COUNTDOWN

###### &#x20;           ================================================= \*/}

###### 

###### &#x20;           <View

###### &#x20;             className={`mt-4 rounded-3xl px-5 py-4 border-2 ${

###### &#x20;               auctionEnded

###### &#x20;                 ? "bg-red-50 border-red-200"

###### &#x20;                 : "bg-\[#EAF5EF] border-\[#024E32]"

###### &#x20;             }`}

###### &#x20;           >

###### 

###### &#x20;             <View className="flex-row items-center">

###### 

###### &#x20;               <View

###### &#x20;                 className={`w-11 h-11 rounded-2xl items-center justify-center ${

###### &#x20;                   auctionEnded

###### &#x20;                     ? "bg-red-500"

###### &#x20;                     : "bg-\[#024E32]"

###### &#x20;                 }`}

###### &#x20;               >

###### &#x20;                 <MaterialIcons

###### &#x20;                   name={

###### &#x20;                     auctionEnded

###### &#x20;                       ? "timer-off"

###### &#x20;                       : "timer"

###### &#x20;                   }

###### &#x20;                   size={24}

###### &#x20;                   color="white"

###### &#x20;                 />

###### &#x20;               </View>

###### 

###### &#x20;               <View className="ml-3 flex-1">

###### 

###### &#x20;                 <Text className="text-gray-500 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;                   {auctionEnded

###### &#x20;                     ? "Auction Ended"

###### &#x20;                     : "Time Remaining"}

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text

###### &#x20;                   className={`font-bold text-base ${

###### &#x20;                     auctionEnded

###### &#x20;                       ? "text-red-600"

###### &#x20;                       : "text-\[#024E32]"

###### &#x20;                   }`}

###### &#x20;                 >

###### &#x20;                   {auctionEnded

###### &#x20;                     ? "🔴 BIDDING CLOSED"

###### &#x20;                     : "🟢 BIDDING OPEN"}

###### &#x20;                 </Text>

###### 

###### &#x20;               </View>

###### 

###### &#x20;               <View className="items-end">

###### 

###### &#x20;                 <Text

###### &#x20;                   className={`font-extrabold font-mono ${

###### &#x20;                     auctionEnded

###### &#x20;                       ? "text-red-600"

###### &#x20;                       : "text-\[#024E32]"

###### &#x20;                   }`}

###### &#x20;                   style={{

###### &#x20;                     fontSize:

###### &#x20;                       isTablet

###### &#x20;                         ? 22

###### &#x20;                         : 16,

###### &#x20;                   }}

###### &#x20;                 >

###### &#x20;                   {countdown}

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text className="text-gray-400 text-\\\\\\\[9px]">

###### &#x20;                   {timeRemaining.days >

###### &#x20;                   0

###### &#x20;                     ? "DAYS • HOURS • MINUTES • SECONDS"

###### &#x20;                     : "HH : MM : SS"}

###### &#x20;                 </Text>

###### 

###### &#x20;               </View>

###### 

###### &#x20;             </View>

###### 

###### &#x20;             {/\* END DATE TARGET \*/}

###### 

###### &#x20;             <View className="mt-3 pt-3 border-t border-gray-200">

###### &#x20;               <Text className="text-gray-500 text-\\\\\\\[10px] text-center">

###### &#x20;                 Auction closes on{" "}

###### &#x20;                 <Text className="font-bold text-gray-700">

###### &#x20;                   {auctionEndDate ||

###### &#x20;                     "-"}

###### &#x20;                 </Text>{" "}

###### &#x20;                 at{" "}

###### &#x20;                 <Text className="font-bold text-gray-700">

###### &#x20;                   {auctionEndTime ||

###### &#x20;                     "-"}

###### &#x20;                 </Text>

###### &#x20;               </Text>

###### &#x20;             </View>

###### 

###### &#x20;           </View>

###### 

###### &#x20;           {/\* =================================================

###### &#x20;               PLACE BID

###### &#x20;           ================================================= \*/}

###### 

###### &#x20;           <View className="bg-white rounded-3xl p-5 mt-4 border border-gray-100 shadow-sm">

###### 

###### &#x20;             <View className="flex-row items-center mb-4">

###### 

###### &#x20;               <View className="w-10 h-10 rounded-xl bg-\\\\\\\[#EAF5EF] items-center justify-center">

###### &#x20;                 <MaterialIcons

###### &#x20;                   name="payments"

###### &#x20;                   size={22}

###### &#x20;                   color="#024E32"

###### &#x20;                 />

###### &#x20;               </View>

###### 

###### &#x20;               <View className="ml-3">

###### 

###### &#x20;                 <Text className="text-gray-900 text-base font-bold">

###### &#x20;                   Place Your Bid

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text className="text-gray-400 text-xs mt-0.5">

###### &#x20;                   Enter the amount you want to bid

###### &#x20;                 </Text>

###### 

###### &#x20;               </View>

###### 

###### &#x20;             </View>

###### 

###### &#x20;             {/\* QUICK AMOUNTS \*/}

###### <View className="mb-4">

###### &#x20; <Text className="text-gray-500 text-xs font-semibold uppercase mb-2">

###### &#x20;   Slide to Select Bid Amount

###### &#x20; </Text>

###### 

###### &#x20; <View className="bg-gray-50 rounded-2xl border border-gray-200 p-4">

###### 

###### &#x20;   <View className="items-center mb-2">

###### &#x20;     <Text className="text-gray-400 text-xs">

###### &#x20;       Selected Bid

###### &#x20;     </Text>

###### 

###### &#x20;     <Text className="text-\\\\\\\[#024E32] text-2xl font-bold">

###### &#x20;       {formatAmount(

###### &#x20;         PREDEFINED\_AMOUNTS\[selectedPredefinedIndex]

###### &#x20;       )}

###### &#x20;     </Text>

###### &#x20;   </View>

###### 

###### &#x20;   <Slider

###### &#x20;     style={{

###### &#x20;       width: "100%",

###### &#x20;       height: 40,

###### &#x20;     }}

###### &#x20;     minimumValue={0}

###### &#x20;     maximumValue={PREDEFINED\_AMOUNTS.length - 1}

###### &#x20;     step={1}

###### &#x20;     value={selectedPredefinedIndex}

###### &#x20;     minimumTrackTintColor="#024E32"

###### &#x20;     maximumTrackTintColor="#D1D5DB"

###### &#x20;     thumbTintColor="#024E32"

###### &#x20;     disabled={auctionEnded || installmentBlocked}

###### &#x20;     onValueChange={(value) => {

###### &#x20;       const index = Math.round(value);

###### &#x20;       const amount = PREDEFINED\_AMOUNTS\[index];

###### 

###### &#x20;       setSelectedPredefinedIndex(index);

###### &#x20;       setBidAmount(String(amount));

###### &#x20;     }}

###### &#x20;   />

###### 

###### &#x20;   <View className="flex-row justify-between px-1">

###### &#x20;     <Text className="text-gray-400 text-xs">₹10K</Text>

###### &#x20;     <Text className="text-gray-400 text-xs">₹30K</Text>

###### &#x20;     <Text className="text-gray-400 text-xs">₹50K</Text>

###### &#x20;     <Text className="text-gray-400 text-xs">₹70K</Text>

###### &#x20;     <Text className="text-gray-400 text-xs">₹90K</Text>

###### &#x20;   </View>

###### 

###### &#x20; </View>

###### </View>

###### 

###### &#x20;             {/\* INPUT \*/}

###### 

###### &#x20;             <Text className="text-gray-500 text-xs font-semibold tracking-wider uppercase mb-2">

###### &#x20;               Or Enter Amount

###### &#x20;             </Text>

###### 

###### &#x20;             <View className="flex-row items-center bg-\\\\\\\[#F7F9F8] border border-gray-200 rounded-2xl px-4 h-14">

###### 

###### &#x20;               <Text className="text-\\\\\\\[#024E32] text-2xl font-bold mr-2">

###### &#x20;                 ₹

###### &#x20;               </Text>

###### 

###### &#x20;               <TextInput

###### &#x20;                 value={

###### &#x20;                   bidAmount

###### &#x20;                 }

###### &#x20;                 onChangeText={(

###### &#x20;                   text

###### &#x20;                 ) => {

###### &#x20;                   const cleaned =

###### &#x20;                     text.replace(

###### &#x20;                       /\[^0-9]/g,

###### &#x20;                       ""

###### &#x20;                     );

###### 

###### &#x20;                   setBidAmount(

###### &#x20;                     cleaned

###### &#x20;                   );

###### &#x20;                 }}

###### &#x20;                 placeholder="Enter bid amount"

###### &#x20;                 placeholderTextColor="#9CA3AF"

###### &#x20;                 keyboardType="number-pad"

###### &#x20;                 editable={

###### &#x20;                   !placingBid \&\&

###### &#x20;                   !auctionEnded \&\&

###### &#x20;                   !installmentBlocked

###### &#x20;                 }

###### &#x20;                 className="flex-1 text-gray-900 text-base font-semibold"

###### &#x20;               />

###### 

###### &#x20;               {bidAmount !==

###### &#x20;                 "" \&\& (

###### &#x20;                 <TouchableOpacity

###### &#x20;                   onPress={() =>

###### &#x20;                     setBidAmount(

###### &#x20;                       ""

###### &#x20;                     )

###### &#x20;                   }

###### &#x20;                 >

###### &#x20;                   <MaterialIcons

###### &#x20;                     name="close"

###### &#x20;                     size={20}

###### &#x20;                     color="#9CA3AF"

###### &#x20;                   />

###### &#x20;                 </TouchableOpacity>

###### &#x20;               )}

###### 

###### &#x20;             </View>

###### 

###### &#x20;             {/\* HIGHEST BID \*/}

###### 

###### &#x20;             {highestBid >

###### &#x20;               0 \&\& (

###### &#x20;               <View className="mt-3 bg-yellow-50 rounded-xl p-3 border border-yellow-200">

###### 

###### &#x20;                 <Text className="text-yellow-700 text-xs">

###### &#x20;                   💡 Current highest bid:{" "}

###### &#x20;                   <Text className="font-bold">

###### &#x20;                     {formatAmount(

###### &#x20;                       highestBid

###### &#x20;                     )}

###### &#x20;                   </Text>

###### &#x20;                 </Text>

###### 

###### &#x20;                 <Text className="text-yellow-600 text-\\\\\\\[10px] mt-0.5">

###### &#x20;                   Your bid must be higher than the current highest bid

###### &#x20;                 </Text>

###### 

###### &#x20;               </View>

###### &#x20;             )}

###### 

###### &#x20;             {/\* PENDING INSTALLMENT WARNING \*/}

###### 

###### &#x20;             {installmentBlocked \&\& (

###### &#x20;               <View className="mt-3 bg-red-50 p-3 rounded-xl border border-red-200">

###### 

###### &#x20;                 <View className="flex-row items-center">

###### &#x20;                   <MaterialIcons

###### &#x20;                     name="block"

###### &#x20;                     size={18}

###### &#x20;                     color="#DC2626"

###### &#x20;                   />

###### &#x20;                   <Text className="text-red-700 font-bold text-xs ml-2">

###### &#x20;                     ⛔ Bidding Disabled – Pending Installment

###### &#x20;                   </Text>

###### &#x20;                 </View>

###### 

###### &#x20;                 <Text className="text-red-600 text-xs mt-1.5 flex-1">

###### &#x20;                   {blockedReason}

###### &#x20;                 </Text>

###### 

###### &#x20;               </View>

###### &#x20;             )}

###### 

###### &#x20;             {/\* BUTTON \*/}

###### 

###### &#x20;             <TouchableOpacity

###### &#x20;               onPress={

###### &#x20;                 placeBid

###### &#x20;               }

###### &#x20;               disabled={

###### &#x20;                 placingBid ||

###### &#x20;                 auctionEnded ||

###### &#x20;                 installmentBlocked

###### &#x20;               }

###### &#x20;               activeOpacity={

###### &#x20;                 0.8

###### &#x20;               }

###### &#x20;               className={`mt-4 h-14 rounded-2xl items-center justify-center ${

###### &#x20;                 placingBid ||

###### &#x20;                 auctionEnded ||

###### &#x20;                 installmentBlocked

###### &#x20;                   ? "bg-gray-300"

###### &#x20;                   : "bg-\[#024E32]"

###### &#x20;               }`}

###### &#x20;             >

###### 

###### &#x20;               {placingBid ? (

###### &#x20;                 <View className="flex-row items-center">

###### 

###### &#x20;                   <ActivityIndicator

###### &#x20;                     color="white"

###### &#x20;                     size="small"

###### &#x20;                   />

###### 

###### &#x20;                   <Text className="text-white font-bold ml-2">

###### &#x20;                     SUBMITTING...

###### &#x20;                   </Text>

###### 

###### &#x20;                 </View>

###### &#x20;               ) : auctionEnded ? (

###### &#x20;                 <View className="flex-row items-center">

###### 

###### &#x20;                   <MaterialIcons

###### &#x20;                     name="lock"

###### &#x20;                     size={21}

###### &#x20;                     color="white"

###### &#x20;                   />

###### 

###### &#x20;                   <Text className="text-white font-bold ml-2">

###### &#x20;                     AUCTION ENDED

###### &#x20;                   </Text>

###### 

###### &#x20;                 </View>

###### &#x20;               ) : installmentBlocked ? (

###### &#x20;                 <View className="flex-row items-center">

###### 

###### &#x20;                   <MaterialIcons

###### &#x20;                     name="money-off"

###### &#x20;                     size={21}

###### &#x20;                     color="white"

###### &#x20;                   />

###### 

###### &#x20;                   <Text className="text-white font-bold ml-2">

###### &#x20;                     INSTALLMENT PENDING

###### &#x20;                   </Text>

###### 

###### &#x20;                 </View>

###### &#x20;               ) : (

###### &#x20;                 <View className="flex-row items-center">

###### 

###### &#x20;                   <MaterialIcons

###### &#x20;                     name="gavel"

###### &#x20;                     size={21}

###### &#x20;                     color="white"

###### &#x20;                   />

###### 

###### &#x20;                   <Text className="text-white font-bold ml-2">

###### &#x20;                     PLACE BID

###### &#x20;                   </Text>

###### 

###### &#x20;                 </View>

###### &#x20;               )}

###### 

###### &#x20;             </TouchableOpacity>

###### 

###### &#x20;             {/\* STATUS \*/}

###### 

###### &#x20;             {auctionEnded \&\& (

###### &#x20;               <View className="flex-row items-center mt-3 bg-red-50 p-3 rounded-xl border border-red-200">

###### 

###### &#x20;                 <MaterialIcons

###### &#x20;                   name="info-outline"

###### &#x20;                   size={18}

###### &#x20;                   color="#DC2626"

###### &#x20;                 />

###### 

###### &#x20;                 <Text className="text-red-700 text-xs ml-2 flex-1">

###### &#x20;                   ⛔ This auction has ended. No more bids accepted.

###### &#x20;                 </Text>

###### 

###### &#x20;               </View>

###### &#x20;             )}

###### 

###### &#x20;             {!auctionEndDate ||

###### &#x20;               (!auctionEndTime \&\& (

###### &#x20;                 <View className="flex-row items-center mt-3 bg-yellow-50 p-3 rounded-xl border border-yellow-200">

###### 

###### &#x20;                   <MaterialIcons

###### &#x20;                     name="info-outline"

###### &#x20;                     size={18}

###### &#x20;                     color="#D97706"

###### &#x20;                   />

###### 

###### &#x20;                   <Text className="text-yellow-700 text-xs ml-2 flex-1">

###### &#x20;                     ⚠️ Auction end date/time is not available.

###### &#x20;                   </Text>

###### 

###### &#x20;                 </View>

###### &#x20;               ))}

###### 

###### &#x20;           </View>

###### 

###### &#x20;           {/\* =================================================

###### &#x20;               SUMMARY

###### &#x20;           ================================================= \*/}

###### 

###### &#x20;           {/\* CHIT AMOUNT - bidding starts from this amount \*/}

###### 

###### &#x20;           <View className="mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">

###### 

###### &#x20;             <Text className="text-gray-400 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;               💰 Chit Amount

###### &#x20;             </Text>

###### 

###### &#x20;             <Text className="text-\\\\\\\[#024E32] text-2xl font-extrabold mt-1">

###### &#x20;               {chitAmount

###### &#x20;                 ? formatAmount(

###### &#x20;                     chitAmount

###### &#x20;                   )

###### &#x20;                 : "-"}

###### &#x20;             </Text>

###### 

###### &#x20;             <Text className="text-gray-400 text-\\\\\\\[10px] mt-1">

###### &#x20;               Bidding starts from this amount • Current bided (highest) amount shown below

###### &#x20;             </Text>

###### 

###### &#x20;           </View>

###### 

###### &#x20;           <View className="flex-row mt-4">

###### 

###### &#x20;             <View className="flex-1 bg-white rounded-2xl p-4 mr-2 border border-gray-100 shadow-sm">

###### 

###### &#x20;               <Text className="text-gray-400 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;                 Total Bids

###### &#x20;               </Text>

###### 

###### &#x20;               <Text className="text-\\\\\\\[#024E32] text-xl font-bold mt-1">

###### &#x20;                 {

###### &#x20;                   bids.length

###### &#x20;                 }

###### &#x20;               </Text>

###### 

###### &#x20;             </View>

###### 

###### &#x20;             <View className="flex-1 bg-white rounded-2xl p-4 ml-2 border border-gray-100 shadow-sm">

###### 

###### &#x20;               <Text className="text-gray-400 text-\\\\\\\[10px] font-semibold tracking-wider uppercase">

###### &#x20;                 Highest Bid

###### &#x20;               </Text>

###### 

###### &#x20;               <Text className="text-\\\\\\\[#024E32] text-xl font-bold mt-1">

###### &#x20;                 {highestBid

###### &#x20;                   ? formatAmount(

###### &#x20;                       highestBid

###### &#x20;                     )

###### &#x20;                   : "-"}

###### &#x20;               </Text>

###### 

###### &#x20;             </View>

###### 

###### &#x20;           </View>

###### 

###### &#x20;           {/\* =================================================

###### &#x20;               ALL BIDS - WhatsApp Style Chat

###### &#x20;           ================================================= \*/}

###### 

###### &#x20;           <View className="mt-7 mb-3">

###### 

###### &#x20;             <View className="flex-row items-center">

###### 

###### &#x20;               <MaterialIcons

###### &#x20;                 name="chat"

###### &#x20;                 size={24}

###### &#x20;                 color="#024E32"

###### &#x20;               />

###### 

###### &#x20;               <Text className="text-gray-900 text-lg font-bold ml-2">

###### &#x20;                 Bids Chat

###### &#x20;               </Text>

###### 

###### &#x20;               {bids.length >

###### &#x20;                 0 \&\& (

###### &#x20;                 <View className="ml-2 bg-\\\\\\\[#EAF5EF] px-2.5 py-0.5 rounded-full">

###### 

###### &#x20;                   <Text className="text-\\\\\\\[#024E32] text-xs font-bold">

###### &#x20;                     {

###### &#x20;                       bids.length

###### &#x20;                     }

###### &#x20;                   </Text>

###### 

###### &#x20;                 </View>

###### &#x20;               )}

###### 

###### &#x20;             </View>

###### 

###### &#x20;             <Text className="text-gray-500 text-xs mt-1 ml-9">

###### &#x20;               Live bids from all members in this group. Your bid will appear here once submitted.

###### &#x20;             </Text>

###### 

###### &#x20;           </View>

###### 

###### &#x20;           {/\* =================================================

###### &#x20;               BIDS LIST - WhatsApp Style Chat Bubbles

###### &#x20;           ================================================= \*/}

###### 

###### &#x20;           {loading ? (

###### &#x20;             <View className="items-center py-16 bg-white rounded-3xl border border-gray-100">

###### 

###### &#x20;               <ActivityIndicator

###### &#x20;                 size="large"

###### &#x20;                 color="#024E32"

###### &#x20;               />

###### 

###### &#x20;               <Text className="text-gray-500 mt-3 font-medium">

###### &#x20;                 Loading bids...

###### &#x20;               </Text>

###### 

###### &#x20;             </View>

###### &#x20;           ) : bids.length ===

###### &#x20;             0 ? (

###### &#x20;             <View className="bg-white rounded-3xl p-8 items-center border border-gray-100 shadow-sm">

###### 

###### &#x20;               <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center">

###### 

###### &#x20;                 <MaterialIcons

###### &#x20;                   name="chat-bubble-outline"

###### &#x20;                   size={36}

###### &#x20;                   color="#9CA3AF"

###### &#x20;                 />

###### 

###### &#x20;               </View>

###### 

###### &#x20;               <Text className="text-gray-800 font-bold text-lg mt-4">

###### &#x20;                 No bids yet

###### &#x20;               </Text>

###### 

###### &#x20;               <Text className="text-gray-500 text-center text-sm mt-2">

###### &#x20;                 Be the first to place a bid! Your bid will appear here.

###### &#x20;               </Text>

###### 

###### &#x20;             </View>

###### &#x20;           ) : (

###### &#x20;             displayBids.map(

###### &#x20;               (bid) => {

###### &#x20;                 const ticketNumber =

###### &#x20;                   getTicketNumber(

###### &#x20;                     bid.\_id

###### &#x20;                   );

###### 

###### &#x20;                 const isHighest =

###### &#x20;                   Number(

###### &#x20;                     bid.bidAmount

###### &#x20;                   ) ===

###### &#x20;                   highestBid;

###### 

###### &#x20;                 const isUserBid =

###### &#x20;                   isCurrentUserBid(

###### &#x20;                     bid.memberId

###### &#x20;                   );

###### 

###### &#x20;                 return (

###### &#x20;                   <BidBubble

###### &#x20;                     key={bid.\_id}

###### &#x20;                     bid={bid}

###### &#x20;                     isUserBid={isUserBid}

###### &#x20;                     isHighest={isHighest}

###### &#x20;                     ticketNumber={ticketNumber}

###### &#x20;                   />

###### &#x20;                 );

###### &#x20;               }

###### &#x20;             )

###### &#x20;           )}

###### 

###### &#x20;           {/\* =================================================

###### &#x20;               FOOTER

###### &#x20;           ================================================= \*/}

###### 

###### &#x20;           <View className="mt-6">

###### &#x20;             <Footer />

###### &#x20;           </View>

###### 

###### &#x20;         </View>

###### 

###### &#x20;       </ScrollView>

###### 

###### &#x20;     </KeyboardAvoidingView>

###### &#x20;   </SafeAreaView>

###### &#x20; );

###### }

