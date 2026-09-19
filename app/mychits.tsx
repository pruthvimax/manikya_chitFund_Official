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
  Linking,
  Modal,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import BACKEND_URL from "../config";

/* =========================================================================
   OPTIONAL BACKEND FIELDS

   Chit value comes from /chitscheme (chitId -> chitAmount), so no backend
   change is needed for it.

   Still optional on GET /groups/my-chits/:userid - each falls back to "-"
   or is hidden when missing:

      memberName               string
      status                   string   e.g. "NPS"
      relationshipManagerName  string
      relationshipManagerPhone string
   ========================================================================= */

/* =========================================================================
   ANDROID COMPACT SCALE

   iOS keeps the original sizing untouched. Android steps every font,
   padding and icon down one notch, because the same value renders
   visibly larger there.
   ========================================================================= */
const A = Platform.OS === "android";

const T = {
  /* headings */
  header: A ? "text-xl" : "text-2xl",
  cardTitle: A ? "text-sm" : "text-base",
  sectionTitle: A ? "text-sm" : "text-base",
  bigAmount: A ? "text-xl" : "text-2xl",

  /* body */
  base: A ? "text-xs" : "text-sm",
  sm: A ? "text-[11px]" : "text-xs",
  xs: A ? "text-[10px]" : "text-[11px]",

  /* cell text */
  cellLabel: A ? "text-[10px]" : "text-[11px]",
  cellValue: A ? "text-[13px]" : "text-[15px]",
  cellValueSm: A ? "text-[11px]" : "text-[13px]",
  cellSuffix: A ? "text-[9px]" : "text-[10px]",

  /* spacing */
  rowPx: A ? "px-3" : "px-4",
  rowPy: A ? "py-2.5" : "py-3",
  cardPx: A ? "px-3" : "px-4",
  cardPy: A ? "py-3" : "py-4",

  /* chrome */
  coin: A ? "w-10 h-10" : "w-11 h-11",
  iconBack: A ? 24 : 26,
  iconSm: A ? 14 : 16,
  iconMd: A ? 18 : 20,
  iconChevron: A ? 22 : 26,

  /* progress */
  track: A ? 84 : 96,
  pin: A ? 23 : 26,
};

const money = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/** "19:03" -> "7:03 PM" */
const to12Hour = (time?: string) => {
  if (!time) return "";

  const parts = String(time).split(":");
  if (parts.length < 2) return String(time);

  let h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, "0");

  if (isNaN(h)) return String(time);

  const suffix = h >= 12 ? "PM" : "AM";

  h = h % 12;
  if (h === 0) h = 12;

  return `${h}:${m} ${suffix}`;
};

/** "2 lakh" / "25 lakh" / "1.2 cr" -> a number, when the scheme lookup misses */
const parseChitLabel = (label: any) => {
  if (!label) return null;

  const s = String(label).toLowerCase().trim();

  const num = parseFloat(s.replace(/[^0-9.]/g, ""));
  if (isNaN(num)) return null;

  if (s.includes("cr")) return num * 10000000;
  if (s.includes("lakh") || s.includes("lac") || s.includes("l")) {
    return num * 100000;
  }
  if (s.includes("k")) return num * 1000;

  return num > 0 ? num : null;
};

/** ₹25,00,000 -> "25L" for the coin badge */
const shortValue = (n: any) => {
  const v = Number(n || 0);
  if (!v) return "CHIT";
  if (v >= 10000000) {
    const cr = v / 10000000;
    return `${cr % 1 === 0 ? cr : cr.toFixed(1)}Cr`;
  }
  if (v >= 100000) {
    const l = v / 100000;
    return `${l % 1 === 0 ? l : l.toFixed(1)}L`;
  }
  if (v >= 1000) return `${Math.round(v / 1000)}K`;
  return String(v);
};

/* ================= SCREENSHOT PREVENTION ================= */

let ScreenCapture: any = null;

try {
  const module = require("expo-screen-capture");
  ScreenCapture = module.default || module;
} catch (error) {
  console.log("expo-screen-capture not available");
}

const preventScreenshot = async () => {
  try {
    if ((await AsyncStorage.getItem("adminSession")) === "true") {
      await allowScreenshot();
      return;
    }

    if (ScreenCapture && typeof ScreenCapture.preventScreenCaptureAsync === "function") {
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
    if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === "function") {
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

/* ================= SKELETON ================= */

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
    <View className={`${T.cardPx} ${T.cardPy} border-b border-gray-100 flex-row items-center`}>
      <SkeletonBox width={A ? 40 : 44} height={A ? 40 : 44} radius={22} />
      <View className="ml-3 flex-1">
        <SkeletonBox width={"70%" as any} height={A ? 14 : 16} style={{ marginBottom: 8 }} />
        <SkeletonBox width={110} height={A ? 10 : 12} />
      </View>
    </View>

    <View className={`${T.cardPx} ${T.cardPy}`}>
      {[0, 1, 2].map((r) => (
        <View key={r} className="flex-row mb-4">
          {[0, 1, 2].map((c) => (
            <View key={c} className="flex-1">
              <SkeletonBox width={70} height={A ? 9 : 10} style={{ marginBottom: 8 }} />
              <SkeletonBox width={85} height={A ? 14 : 16} />
            </View>
          ))}
        </View>
      ))}
    </View>
  </View>
);

const SkeletonMyChitsScreen = () => (
  <SafeAreaView className="flex-1 bg-white">
    <View
      className={`bg-[#024e32] px-5 ${
        A ? "pt-14 pb-5" : "pt-16 pb-6"
      } absolute top-0 left-0 right-0 z-50`}
    >
      <View className="flex-row items-center">
        <TouchableOpacity className="mt-1" disabled>
          <MaterialIcons name="arrow-back" size={T.iconBack} color="white" />
        </TouchableOpacity>
        <Text className={`text-white ${T.header} font-bold ml-4 mt-1`}>
          My Chits
        </Text>
      </View>
    </View>

    <ScrollView
      className="flex-1 bg-[#f2f4f7]"
      contentContainerStyle={{ paddingTop: A ? 100 : 110 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="p-4">
        <SkeletonChitCard />
        <SkeletonChitCard />
      </View>
    </ScrollView>
  </SafeAreaView>
);

/* =========================================================================
   SMALL PIECES
   ========================================================================= */

/** One label + value cell inside the 3-column detail grid */
function Cell({
  label,
  value,
  color = "#111827",
  bold = true,
  suffix,
  small = false,
}: {
  label: string;
  value: any;
  color?: string;
  bold?: boolean;
  suffix?: string;
  small?: boolean;
}) {
  return (
    <View className="flex-1 pr-2" style={{ minWidth: 0 }}>
      <Text
        className={`text-gray-500 ${T.cellLabel}`}
        numberOfLines={1}
        maxFontSizeMultiplier={1.1}
      >
        {label}
      </Text>

      <View className="flex-row items-baseline mt-1" style={{ minWidth: 0 }}>
        <Text
          className={`${small ? T.cellValueSm : T.cellValue} ${
            bold ? "font-bold" : "font-medium"
          }`}
          style={{ color, flexShrink: 1 }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          maxFontSizeMultiplier={1.1}
        >
          {value}
        </Text>

        {suffix ? (
          <Text
            className={`text-gray-500 ${T.cellSuffix} ml-1`}
            numberOfLines={1}
            style={{ flexShrink: 0 }}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/* =========================================================================
   INSTALMENT PROGRESS

   A numbered pin sitting on the track, orange for the completed part,
   grey for the rest, with 01 on the left and the total on the right.
   ========================================================================= */
function InstalmentProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const TRACK = T.track;
  const PIN = T.pin;

  const pct = total > 0 ? Math.min(Math.max(current / total, 0), 1) : 0;

  return (
    <View style={{ width: TRACK + (A ? 42 : 46) }}>
      {/* PIN */}
      <View style={{ height: A ? 27 : 30, justifyContent: "flex-end" }}>
        <View
          style={{
            position: "absolute",
            left: (A ? 20 : 22) + pct * TRACK - PIN / 2,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: PIN,
              height: PIN,
              borderRadius: PIN / 2,
              borderWidth: 1.5,
              borderColor: "#024e32",
              backgroundColor: "white",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text className={`text-[#024e32] ${T.xs} font-bold`}>{current}</Text>
          </View>

          {/* little stem under the pin */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 4,
              borderRightWidth: 4,
              borderTopWidth: 5,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderTopColor: "#024e32",
              marginTop: -1,
            }}
          />
        </View>
      </View>

      {/* TRACK */}
      <View className="flex-row items-center mt-0.5">
        <Text
          className={`text-gray-500 ${T.xs}`}
          style={{ width: A ? 18 : 20 }}
          numberOfLines={1}
        >
          01
        </Text>

        <View
          style={{
            width: TRACK,
            height: 5,
            borderRadius: 3,
            backgroundColor: "#9ca3af",
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${Math.max(pct * 100, 3)}%`,
              height: "100%",
              borderRadius: 3,
              backgroundColor: "#e8501f",
            }}
          />
        </View>

        <Text
          className={`text-gray-500 ${T.xs} text-right`}
          style={{ width: A ? 22 : 24 }}
          numberOfLines={1}
        >
          {total || "-"}
        </Text>
      </View>
    </View>
  );
}

/** Live countdown to the auction end */
function AuctionCountdown({
  endDate,
  endTime,
}: {
  endDate?: string;
  endTime?: string;
}) {
  const [label, setLabel] = useState("--:--:--");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      if (!endDate || !endTime) {
        setLabel("--:--:--");
        return;
      }

      try {
        const [d, m, y] = endDate.split("-").map((n: string) => parseInt(n, 10));
        const [hh, mm] = endTime.split(":").map((n: string) => parseInt(n, 10));

        const target = new Date(y, m - 1, d, hh, mm, 0, 0);

        if (isNaN(target.getTime())) {
          setLabel("--:--:--");
          return;
        }

        const diff = target.getTime() - Date.now();

        if (diff <= 0) {
          setExpired(true);
          setLabel("Ended");
          return;
        }

        setExpired(false);

        const s = Math.floor(diff / 1000);
        const days = Math.floor(s / 86400);
        const hrs = Math.floor((s % 86400) / 3600);
        const min = Math.floor((s % 3600) / 60);
        const sec = s % 60;

        setLabel(
          `${days}d:${String(hrs).padStart(2, "0")}h:${String(min).padStart(
            2,
            "0"
          )}m:${String(sec).padStart(2, "0")}s`
        );
      } catch {
        setLabel("--:--:--");
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate, endTime]);

  return (
    <View
      className={`${A ? "px-2 py-1" : "px-2.5 py-1.5"} rounded-lg border ${
        expired ? "border-gray-300 bg-gray-50" : "border-[#e8501f] bg-white"
      }`}
    >
      <Text
        className={`${T.xs} font-semibold ${
          expired ? "text-gray-500" : "text-[#e8501f]"
        }`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================================
   MAIN
   ========================================================================= */

export default function MyChits() {
  const router = useRouter();

  useEffect(() => {
    preventScreenshot();
    return () => {
      allowScreenshot();
    };
  }, []);

  /* ================= WEB SCREENSHOT DETECTION ================= */
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
          Alert.alert("Action Blocked", "Save is disabled for security reasons.");
        }
      };

      const handlePrint = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
          e.preventDefault();
          Alert.alert("Action Blocked", "Print is disabled for security reasons.");
        }
      };

      const handleCopy = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
          e.preventDefault();
          Alert.alert("Action Blocked", "Copy is disabled for security reasons.");
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
  const [chits, setChits] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userid, setUserid] = useState("");

  /* result-history modal */
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyChit, setHistoryChit] = useState<any>(null);
  const [historyRows, setHistoryRows] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    loadMyChits();
  }, []);

  /* ================= USER PAID (EXCLUDING DIVIDEND) ================= */
  const getUserPaidAmount = (payments: any[]) => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments
      .filter((p: any) => p.paymentType !== "DIVIDEND")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // ✅ 6% fixed penalty — same rate as the admin (groupmembers.tsx) and
  // employee (collectionpayment.tsx) pages.
  const FIXED_PENALTY_PERCENTAGE = 6;

  const isAfterDueDate = (dueDate: any) => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) return false;
    due.setHours(23, 59, 59, 999);
    return new Date().getTime() > due.getTime();
  };

  // ✅ CUMULATIVE / COMPOUNDING penalty — this is the exact same formula
  // used on the admin GroupMembers page and the employee Collect Payment
  // page, just adapted to this screen's ledger row shape (monthIndex /
  // dueDate / payments, from /groups/account-copy) instead of the raw
  // collections shape (index / endDate / payments) those two pages use.
  //
  // Without this, "Payable amount" / "Due amount" here were trusting the
  // ledger row's own `penaltyAmount` field, which does NOT carry forward
  // correctly once an earlier month gets paid off — it's the same bug
  // that was fixed on the admin/employee side. Recomputing it here from
  // the actual payment history keeps all three pages showing the same
  // number for the same member.
  //
  //   - a month's OWN contribution is frozen using only payments made on
  //     or before ITS OWN due date, so a late payment can never shrink a
  //     charge that's already been assessed (and possibly already
  //     collected) for that same month.
  //   - the CARRY from an earlier month is frozen using only payments
  //     made on or before THIS month's own due date — so it reflects
  //     whichever earlier months were still unpaid at the moment this
  //     month's penalty was assessed, and never moves again after that,
  //     even if the earlier month gets paid off much later. (An earlier
  //     month already paid off BEFORE this month's due date is correctly
  //     excluded, since it wasn't outstanding "back then" either.)
  const getCumulativePenaltyForLedger = (
    ledgerRows: any[],
    dividendForMonth: (monthIndex: any) => number
  ) => {
    const sorted = [...(ledgerRows || [])]
      .filter((r) => r && r.installmentAmount)
      .sort((a, b) => (a.monthIndex ?? 0) - (b.monthIndex ?? 0));

    // Pending amount for `row`, using only payments made on or before
    // `cutoffDate` — shared by the "own month" freeze (cutoff = that
    // row's own due date) and the "carry" freeze (cutoff = the LATER
    // row's due date, i.e. the moment that later row's penalty gets
    // assessed).
    const pendingAsOfDate = (row: any, cutoffDate: any) => {
      const installment = row.installmentAmount || 0;
      const dividend = Number(dividendForMonth(row.monthIndex) || 0);
      const effectiveInstallment = Math.max(installment - dividend, 0);
      const payments = Array.isArray(row.payments) ? row.payments : [];

      if (!cutoffDate) {
        const paidAny = payments
          .filter((p: any) => p.paymentType !== "PENALTY")
          .reduce((s: number, p: any) => s + (p.amount || 0), 0);
        return Math.max(effectiveInstallment - paidAny, 0);
      }

      const due = new Date(cutoffDate);
      due.setHours(23, 59, 59, 999);
      const dueTime = due.getTime();
      let paidByCutoff = 0;
      payments.forEach((p: any) => {
        if (p.paymentType === "PENALTY") return;
        const t = new Date(p.paidAt || p.date).getTime();
        if (t <= dueTime) paidByCutoff += p.amount || 0;
      });
      return Math.max(effectiveInstallment - paidByCutoff, 0);
    };

    const unpaidAsOfOwnDueDate = (row: any) =>
      pendingAsOfDate(row, row.dueDate || null);

    const penaltyByMonth: Record<string, number> = {};
    let totalPenaltyAssessed = 0;

    sorted.forEach((row, i) => {
      let penaltyIncrement = 0;

      if (row.dueDate && isAfterDueDate(row.dueDate)) {
        const thisMonthUnpaid = unpaidAsOfOwnDueDate(row);
        let carriedUnpaid = 0;
        for (let j = 0; j < i; j++) {
          // Freeze each earlier row's contribution as of THIS row's own
          // due date, not "today" — so once assessed, this penalty stays
          // fixed no matter when the earlier row eventually gets paid.
          const priorPending = pendingAsOfDate(sorted[j], row.dueDate);
          if (priorPending > 0) carriedUnpaid += priorPending;
        }

        const base = thisMonthUnpaid + carriedUnpaid;
        penaltyIncrement = Math.round((base * FIXED_PENALTY_PERCENTAGE) / 100);
        totalPenaltyAssessed += penaltyIncrement;
      }

      penaltyByMonth[row.monthIndex] = penaltyIncrement;
    });

    return { penaltyByMonth, totalPenaltyAssessed };
  };

  const fetchLedgerForChit = async (
    uid: string,
    groupId: string,
    groupMemberId: string
  ) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/account-copy/${uid}/${groupId}?groupMemberId=${groupMemberId}`
      );
      const data = await res.json();
      return Array.isArray(data.ledger) ? data.ledger : [];
    } catch (err) {
      console.log("❌ Ledger fetch error for group", groupId, err);
      return [];
    }
  };

  const fetchGroupDetail = async (groupId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}`);
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  };

  /* Chit value: /groups/my-chits gives chitId, /chitscheme gives its amount */
  const fetchChitSchemes = async () => {
    const endpoints = [
      `${BACKEND_URL}/chitscheme`,
      `${BACKEND_URL}/chitschemes`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {
        // try the next one
      }
    }

    return [];
  };

  /** Auction notifications for a group, newest first */
  const auctionsForGroup = (allNotifications: any[], groupId: string) => {
    const mine = allNotifications.filter((n: any) => {
      const code = n.groupId?.groupId || n.groupId;
      return String(code) === String(groupId);
    });

    mine.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return mine;
  };

  /** Every bid placed in one specific auction, highest first */
  const fetchBidsForAuction = async (auction: any) => {
    if (!auction) return [];

    try {
      const gid = auction.groupId?._id || auction.groupId || "";

      const res = await fetch(
        `${BACKEND_URL}/bids/live?groupId=${encodeURIComponent(gid)}` +
          `&auctionDate=${encodeURIComponent(auction.auctionEndDate || "")}` +
          `&auctionTime=${encodeURIComponent(auction.auctionEndTime || "")}`
      );

      const data = await res.json();

      const bids = Array.isArray(data)
        ? data
        : Array.isArray(data?.bids)
        ? data.bids
        : [];

      bids.sort(
        (a: any, b: any) => Number(b.bidAmount || 0) - Number(a.bidAmount || 0)
      );

      return bids;
    } catch {
      return [];
    }
  };

  const loadMyChits = async () => {
    try {
      const storedUser = await AsyncStorage.getItem("loggedUser");

      if (!storedUser) {
        setLoading(false);
        return;
      }

      const { userid: uid } = JSON.parse(storedUser);
      setUserid(uid);

      const response = await fetch(`${BACKEND_URL}/groups/my-chits/${uid}`);
      const text = await response.text();
      const data = JSON.parse(text);

      let chitsData: any[] = [];
      if (Array.isArray(data)) chitsData = data;
      else if (Array.isArray(data.chits)) chitsData = data.chits;

      let notifications: any[] = [];
      try {
        const nRes = await fetch(`${BACKEND_URL}/notifications`);
        const nData = await nRes.json();
        notifications = Array.isArray(nData) ? nData : [];
      } catch {
        notifications = [];
      }

      const schemes = await fetchChitSchemes();

      const schemeAmountFor = (chitId: any) => {
        if (!chitId) return null;

        const match = schemes.find(
          (s: any) =>
            String(s.chitId).trim().toLowerCase() ===
            String(chitId).trim().toLowerCase()
        );

        const amount = Number(match?.chitAmount || 0);
        return amount > 0 ? amount : null;
      };

      const processedChits = await Promise.all(
        chitsData.map(async (chit: any) => {
          const groupId = chit.groupId;
          const groupMemberId = chit.groupMemberId || "";

          const [rawLedger, groupDetail] = await Promise.all([
            fetchLedgerForChit(uid, groupId, groupMemberId),
            fetchGroupDetail(groupId),
          ]);

          // Found the actual cause by reading the backend controller
          // (getMyAccountCopy, /groups/account-copy/:userid/:groupId):
          // it does THREE things to dividend, all at once, for what's
          // meant to be a display convenience —
          //   1. `installmentAmount` in the response is already
          //      NET of dividend (`effectiveInstallment = installment
          //      - dividend`), not the raw installment.
          //   2. `dividend` is ALSO sent back as its own field.
          //   3. a synthetic `{ paymentType: "DIVIDEND", amount:
          //      dividend, ... }` entry is unshifted onto `payments`,
          //      purely so a payment-history UI has something to show
          //      for it.
          // This page's penalty/payable math (ported from the
          // admin/employee pages, which get a RAW installmentAmount
          // with dividend as a separate field and no synthetic
          // payment) subtracts `dividend` a second time via
          // dividendFor(), and — since only "PENALTY" was excluded
          // from the payments sum, not "DIVIDEND" — the synthetic
          // payment got summed in as real cash paid on top of that.
          // Dividend was effectively subtracted three times over,
          // which is exactly why Payable/Due came out lower here than
          // My Account Copy / Collect Payment for the same member.
          // Undoing it once here (add dividend back to get the RAW
          // installment, drop the synthetic payment) makes every
          // ledger row look like the admin/employee shape everywhere
          // below, and fixes the same due-date field-name issue while
          // we're normalizing (My Outstanding needed the same
          // `endDate` fallback — a row missing `dueDate` would
          // otherwise silently skip its own penalty while still
          // correctly carrying into a later month's base).
          const ledger = (Array.isArray(rawLedger) ? rawLedger : []).map(
            (row: any) => {
              const dividendAmount = Number(row.dividend || 0);
              const grossInstallment =
                Number(row.installmentAmount || 0) + dividendAmount;
              const realPayments = Array.isArray(row.payments)
                ? row.payments.filter(
                    (p: any) => p.paymentType !== "DIVIDEND"
                  )
                : [];

              return {
                ...row,
                installmentAmount: grossInstallment,
                payments: realPayments,
                dueDate:
                  row.dueDate ||
                  row.endDate ||
                  row.due_date ||
                  row.collectionEndDate ||
                  null,
              };
            }
          );

          const groupAuctions = auctionsForGroup(notifications, groupId);

          const auction = groupAuctions[0] || null;

          const liveBids = await fetchBidsForAuction(auction);

          const currentBid = liveBids.reduce(
            (best: number, b: any) => Math.max(best, Number(b.bidAmount || 0)),
            0
          );

          /* past auctions that already have a declared winner */
          const resultHistory = groupAuctions.filter((n: any) => n.winnerName);

          /* dividend per month */
          //
          // ledger rows (from /groups/account-copy, same endpoint My
          // Outstanding uses) already carry their own `dividend` field
          // directly — that's the reliable source. groupDetail's
          // collectionPlans (from the separate /groups/{groupId}
          // endpoint) is kept only as a fallback for older responses
          // that don't include it, since relying on it alone was why
          // "Dividend earned" was always showing ₹0 here: that endpoint
          // either doesn't return collectionPlans with a per-month
          // dividend, or the two lists don't line up by monthIndex.
          const plans: any[] = Array.isArray(groupDetail?.collectionPlans)
            ? groupDetail.collectionPlans
            : [];

          const dividendFor = (monthIndex: any) => {
            const ledgerRow = ledger.find(
              (r: any) => String(r.monthIndex) === String(monthIndex)
            );

            if (
              ledgerRow &&
              ledgerRow.dividend !== undefined &&
              ledgerRow.dividend !== null
            ) {
              return Number(ledgerRow.dividend || 0);
            }

            const plan = plans.find(
              (p: any) => String(p.monthIndex) === String(monthIndex)
            );
            return Number(plan?.dividend || 0);
          };

          const totalMonths =
            ledger.length > 0
              ? ledger.length
              : groupDetail?.totalCollections || chit.totalMonths || 0;

          const paidMonths = ledger.filter(
            (row: any) => row.status === "PAID"
          ).length;

          const pendingMonths = ledger.filter(
            (row: any) => row.status !== "PAID"
          ).length;

          /* ---------- MONEY ---------- */

          const now = Date.now();

          const dueSoFar = ledger.filter((row: any) => {
            if (!row.dueDate) return true;
            const d = new Date(row.dueDate).getTime();
            return isNaN(d) ? true : d <= now;
          });

          // Recomputed cumulatively (same formula as the admin/employee
          // pages) instead of trusting the ledger row's own penaltyAmount
          // field, so "Payable amount" / "Due amount" here always match
          // what those two pages show for the same member.
          const { penaltyByMonth } = getCumulativePenaltyForLedger(ledger, dividendFor);

          // TEMPORARY DEBUG — safe to remove once Payable/Due amounts are
          // confirmed matching My Account Copy / Collect Payment for every
          // group. Prints exactly what each row's calculation used, so a
          // mismatch can be pinned to a specific field instead of guessed
          // at. Open the browser console (F12 → Console) on this page and
          // look for a line starting with "[MYCHITS DEBUG]".
          if (typeof console !== "undefined") {
            console.log(
              `[MYCHITS DEBUG] ${groupId}-${groupMemberId}`,
              ledger.map((row: any) => ({
                monthIndex: row.monthIndex,
                installmentAmount: row.installmentAmount,
                dividend: dividendFor(row.monthIndex),
                dueDate: row.dueDate,
                paymentsCount: Array.isArray(row.payments)
                  ? row.payments.length
                  : 0,
                penalty: penaltyByMonth[row.monthIndex],
              }))
            );
          }

          // Gross amount owed per month = installment + penalty. Dividend
          // is NOT added here — it's credited on the "paid" side instead
          // (see paidAmount below), which is what actually makes it
          // reduce Due amount. Adding it here too used to cancel itself
          // straight back out in the payable-minus-paid subtraction,
          // so dividend had ZERO real effect on Due amount even though
          // it was displayed as "already paid" — and Due amount didn't
          // match the sum of each month's "Total Pending" on the account
          // copy / Collect Payment pages, which DO subtract dividend
          // from what's owed for that month.
          const payableAmount = dueSoFar.reduce(
            (sum: number, row: any) =>
              sum +
              Number(row.installmentAmount || 0) +
              Number(penaltyByMonth[row.monthIndex] || 0),
            0
          );

          const totalUserPaid = ledger.reduce(
            (sum: number, row: any) => sum + getUserPaidAmount(row.payments || []),
            0
          );

          const dividendEarned = ledger.reduce(
            (sum: number, row: any) => sum + dividendFor(row.monthIndex),
            0
          );

          const paidAmount = totalUserPaid + dividendEarned;
          const dueAmount = Math.max(payableAmount - paidAmount, 0);

          /* ---------- NEXT DUE DATE ---------- */

          const nextUnpaid = ledger.find((row: any) => row.status !== "PAID");

          const dueDate = nextUnpaid?.dueDate
            ? new Date(nextUnpaid.dueDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })
            : "-";

          const installmentAmount =
            ledger.length > 0
              ? ledger[0]?.installmentAmount || chit.installmentAmount || 0
              : chit.installmentAmount || 0;

          /* ---------- CHIT VALUE ---------- */

          const chitValue =
            Number(chit.chitAmount) ||
            Number(groupDetail?.chitAmount) ||
            schemeAmountFor(chit.chitId) ||
            schemeAmountFor(groupDetail?.chitId) ||
            parseChitLabel(chit.chitId) ||
            parseChitLabel(groupDetail?.chitId) ||
            null;

          /* ---------- AVG RATE OF INTEREST -----------
             Dividend earned so far, as a monthly percentage of the
             chit value. Change this one line if your accountant
             uses a different formula. */
          const monthsCounted = paidMonths > 0 ? paidMonths : 0;

          const avgRateOfInterest =
            chitValue && monthsCounted > 0
              ? (dividendEarned / chitValue / monthsCounted) * 100
              : null;

          return {
            ...chit,
            groupMemberId,
            ledger,
            totalMonths,
            paidMonths,
            pendingMonths,
            installmentAmount,

            /* mongo _id of the group, needed by /bidnow */
            groupMongoId:
              groupDetail?._id ||
              auction?.groupId?._id ||
              chit.groupMongoId ||
              "",

            chitValue,
            memberName: chit.memberName || groupDetail?.memberName || null,
            frequency: chit.frequency || groupDetail?.frequency || null,
            chitStatus: chit.status || null,

            payableAmount,
            paidAmount,
            dueAmount,
            dividendEarned,
            dueDate,
            avgRateOfInterest,

            rmName: chit.relationshipManagerName || null,
            rmPhone: chit.relationshipManagerPhone || null,

            auction: auction ? { ...auction, currentBid } : null,
            resultHistory,
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

  const openAccountCopy = () => {
    router.push("/myaccountcopy");
  };

  /* ================= BID NOW -> app/bidnow.tsx ================= */
  const openBidNow = (chit: any) => {
    const a = chit.auction;

    if (!a) {
      Alert.alert("No auction", "There is no live auction for this group.");
      return;
    }

    router.push({
      pathname: "/bidnow",
      params: {
        groupId: a.groupId?._id || chit.groupMongoId || "",
        groupCode: a.groupId?.groupId || chit.groupId || "",
        auctionEndDate: a.auctionEndDate || "",
        auctionEndTime: a.auctionEndTime || "",
        userid: userid || "",
      },
    });
  };

  /* ================= HISTORY -> winner + that auction's bids ================= */
  const openResultHistory = async (chit: any) => {
    setHistoryChit(chit);
    setHistoryRows([]);
    setHistoryVisible(true);
    setHistoryLoading(true);

    try {
      const rows = await Promise.all(
        (chit.resultHistory || []).map(async (auction: any) => {
          const bids = await fetchBidsForAuction(auction);
          return { auction, bids };
        })
      );

      setHistoryRows(rows);
    } catch {
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const callRM = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  if (loading) {
    return <SkeletonMyChitsScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View
        className={`bg-[#024e32] px-5 ${
          A ? "pt-14 pb-5" : "pt-16 pb-6"
        } absolute top-0 left-0 right-0 z-50`}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mt-1">
            <MaterialIcons name="arrow-back" size={T.iconBack} color="white" />
          </TouchableOpacity>

          <Text
            className={`text-white ${T.header} font-bold ml-4 mt-1 flex-1`}
            numberOfLines={1}
          >
            My Chits Details
          </Text>

          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing}
            className={`mt-1 mr-2 ${
              A ? "w-8 h-8" : "w-9 h-9"
            } rounded-full bg-white/15 items-center justify-center`}
          >
            <MaterialIcons name="refresh" size={T.iconMd} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/contact")}
            className={`mt-1 ${
              A ? "w-8 h-8" : "w-9 h-9"
            } rounded-full bg-white/15 items-center justify-center`}
          >
            <MaterialIcons name="support-agent" size={T.iconMd} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 bg-[#f2f4f7]"
        contentContainerStyle={{
          paddingTop: A ? 100 : 110,
          paddingBottom: 24,
        }}
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
        <View className={`${A ? "px-3" : "px-4"} pt-4`}>
          {chits.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-200">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                <MaterialIcons
                  name="account-balance-wallet"
                  size={40}
                  color="#9ca3af"
                />
              </View>
              <Text className={`text-gray-500 ${T.sectionTitle} font-medium text-center`}>
                You are not enrolled in any chits
              </Text>
              <Text className={`text-gray-400 ${T.base} text-center mt-2`}>
                Contact your group admin to join a chit
              </Text>
            </View>
          ) : (
            chits.map((chit: any, index: number) => {
              const a = chit.auction;

              /* Prize amount = chit value minus the current bid.
                 With no bid yet it is simply the chit value. */
              const prizeAmount = chit.chitValue
                ? Number(chit.chitValue) - Number(a?.currentBid || 0)
                : null;

              return (
                <View key={index} className="mb-4">
                  {/* =========================================
                      1. CHIT SUMMARY CARD
                  ========================================= */}
                  <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    {/* TOP ROW */}
                    <View className={`${T.rowPx} pt-3.5 pb-2.5 flex-row items-start`}>
                      <View
                        className={`${T.coin} rounded-full bg-[#f8e3cf] border-2 border-[#d99a5b] items-center justify-center mr-2.5`}
                      >
                        <Text className={`text-[#a2570f] font-extrabold ${T.xs}`}>
                          {shortValue(chit.chitValue)}
                        </Text>
                      </View>

                      <View className="flex-1 mr-2">
                        <Text
                          className={`text-[#024e32] ${T.cardTitle} font-bold`}
                          numberOfLines={1}
                        >
                          {chit.groupId}
                          {chit.groupMemberId ? `-${chit.groupMemberId}` : ""}
                        </Text>

                        <Text
                          className={`text-gray-600 ${T.sm} mt-0.5`}
                          numberOfLines={1}
                        >
                          {chit.memberName ||
                            `Chit: ${chit.chitId || chit.groupId}`}
                        </Text>
                      </View>

                      <InstalmentProgress
                        current={chit.paidMonths || 0}
                        total={chit.totalMonths || 0}
                      />
                    </View>

                    {/* ROW 1 */}
                    <View
                      className={`flex-row ${T.rowPx} ${T.rowPy} border-t border-gray-100`}
                    >
                      <Cell
                        label="Chit value"
                        value={chit.chitValue ? money(chit.chitValue) : "-"}
                      />
                      <Cell
                        label="Instalments"
                        value={`${chit.totalMonths || 0}`}
                        suffix="Months"
                      />
                      <Cell
                        label="Dividend earned"
                        value={money(chit.dividendEarned)}
                        color="#16a34a"
                      />
                    </View>

                    {/* ROW 2 */}
                    <View
                      className={`flex-row ${T.rowPx} ${T.rowPy} border-t border-gray-100`}
                    >
                      <Cell
                        label="Payable amount"
                        value={money(chit.payableAmount)}
                      />
                      <Cell label="Paid amount" value={money(chit.paidAmount)} />
                      <Cell
                        label="Due amount"
                        value={money(chit.dueAmount)}
                        color={chit.dueAmount > 0 ? "#e8501f" : "#16a34a"}
                      />
                    </View>

                    {/* ROW 3 */}
                    <View
                      className={`flex-row ${T.rowPx} ${T.rowPy} border-t border-gray-100`}
                    >
                      <Cell label="Status" value={chit.chitStatus || "Active"} />
                      <Cell
                        label="Auction type"
                        value={chit.frequency || "Monthly"}
                      />
                      <Cell
                        label="Payment cycle"
                        value={chit.frequency || "Monthly"}
                        color="#2563eb"
                      />
                    </View>

                    {/* DUE DATE */}
                    <View
                      className={`${T.rowPx} ${T.rowPy} border-t border-gray-100 flex-row items-center`}
                    >
                      <Text className={`text-gray-500 ${T.cellLabel}`}>
                        Due date
                      </Text>
                      <Text
                        className={`text-gray-900 ${T.cellValue} font-bold ml-3`}
                      >
                        {chit.dueDate}
                      </Text>
                    </View>

                    {/* RELATIONSHIP MANAGER */}
                    {chit.rmName ? (
                      <View
                        className={`mx-3 mb-3 bg-gray-50 rounded-xl px-3 py-2 flex-row items-center`}
                      >
                        <Text
                          className={`text-gray-600 ${T.sm} flex-1`}
                          numberOfLines={2}
                        >
                          Your relationship manager -{" "}
                          <Text className="font-semibold text-gray-800">
                            {chit.rmName}
                          </Text>
                        </Text>

                        {chit.rmPhone ? (
                          <TouchableOpacity
                            onPress={() => callRM(chit.rmPhone)}
                            className="flex-row items-center ml-2"
                            activeOpacity={0.8}
                          >
                            <MaterialIcons
                              name="call"
                              size={T.iconSm}
                              color="#024e32"
                            />
                            <Text
                              className={`text-[#024e32] ${T.sm} font-bold ml-1`}
                            >
                              {chit.rmPhone}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>

                  {/* =========================================
                      2. AUCTION DETAILS
                  ========================================= */}
                  {a ? (
                    <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-3">
                      <View
                        className={`${T.rowPx} ${T.rowPy} flex-row items-center justify-between border-b border-gray-100`}
                      >
                        <Text
                          className={`text-gray-900 font-bold ${T.sectionTitle} flex-1 mr-2`}
                          numberOfLines={1}
                        >
                          Auction details
                        </Text>

                        <View className="flex-row items-center">
                          <AuctionCountdown
                            endDate={a.auctionEndDate}
                            endTime={a.auctionEndTime}
                          />

                          <View
                            className={`${
                              A ? "w-7 h-7" : "w-8 h-8"
                            } rounded-full bg-[#024e32]/10 items-center justify-center ml-2`}
                          >
                            <MaterialIcons
                              name="gavel"
                              size={T.iconSm}
                              color="#024e32"
                            />
                          </View>
                        </View>
                      </View>

                      {/* end date on its own line, time below in 12-hour */}
                      <View className={`flex-row ${T.rowPx} ${T.rowPy}`}>
                        <Cell label="Bidding mode" value="Open bid" small />

                        <View className="flex-1 pr-2" style={{ minWidth: 0 }}>
                          <Text
                            className={`text-gray-500 ${T.cellLabel}`}
                            numberOfLines={1}
                          >
                            End date & time
                          </Text>
                          <Text
                            className={`text-gray-900 ${T.cellValueSm} font-bold mt-1`}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.65}
                          >
                            {a.auctionEndDate || "-"}
                          </Text>
                          <Text
                            className={`text-gray-500 ${T.cellLabel}`}
                            numberOfLines={1}
                          >
                            {to12Hour(a.auctionEndTime)}
                          </Text>
                        </View>

                        <Cell
                          label="Group"
                          value={a.groupId?.groupId || chit.groupId}
                          small
                        />
                      </View>

                      <View
                        className={`flex-row ${T.rowPx} ${T.rowPy} border-t border-gray-100`}
                      >
                        <Cell
                          label="Current bid"
                          value={a.currentBid ? money(a.currentBid) : "-"}
                          color="#e8501f"
                          small
                        />
                        <Cell
                          label="Prize amount"
                          value={prizeAmount !== null ? money(prizeAmount) : "-"}
                          small
                        />
                        <Cell
                          label="Instalment"
                          value={money(chit.installmentAmount)}
                          small
                        />
                      </View>

                      <View
                        className={`flex-row ${T.rowPx} ${T.rowPy} border-t border-gray-100`}
                      >
                        <Cell
                          label="Min bid"
                          value={a.minBidAmount ? money(a.minBidAmount) : "-"}
                          small
                        />
                        <Cell
                          label="Max bid"
                          value={a.maxBidAmount ? money(a.maxBidAmount) : "-"}
                          small
                        />
                        <Cell
                          label="Avg rate of int"
                          value={
                            chit.avgRateOfInterest !== null
                              ? chit.avgRateOfInterest.toFixed(2)
                              : "-"
                          }
                          suffix="%"
                          small
                        />
                      </View>

                      <View
                        className={`flex-row items-center justify-between ${T.rowPx} ${T.rowPy} border-t border-gray-100`}
                      >
                        <TouchableOpacity
                          onPress={() => openResultHistory(chit)}
                          activeOpacity={0.85}
                          className={`border border-[#024e32] rounded-full ${
                            A ? "px-4 py-1.5" : "px-5 py-2"
                          }`}
                        >
                          <Text
                            className={`text-[#024e32] font-semibold ${T.base}`}
                          >
                            History
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => openBidNow(chit)}
                          activeOpacity={0.85}
                          className={`bg-[#024e32] rounded-full ${
                            A ? "px-5 py-2" : "px-6 py-2.5"
                          }`}
                        >
                          <Text className={`text-white font-bold ${T.base}`}>
                            Bid Now
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : null}

                  {/* =========================================
                      3. ACCOUNT COPY
                  ========================================= */}
                  <TouchableOpacity
                    onPress={openAccountCopy}
                    activeOpacity={0.85}
                    className={`bg-white rounded-2xl border border-gray-200 shadow-sm mt-3 ${T.rowPx} ${T.cardPy} flex-row items-center`}
                  >
                    <View className="flex-1">
                      <Text
                        className={`text-gray-900 font-bold ${T.sectionTitle}`}
                      >
                        Account copy
                      </Text>
                      <Text className={`text-gray-400 ${T.sm} mt-0.5`}>
                        View breakdown of each instalment
                      </Text>
                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={T.iconChevron}
                      color="#024e32"
                    />
                  </TouchableOpacity>

                  {/* =========================================
                      4. MY DUE  (Pay now hidden for now)

                      Amount and "Pay at branch" sit in ONE row again
                      (per feedback — the earlier stacked layout made
                      this card too tall). Kept compact by giving the
                      amount its own flexible, shrinkable column
                      (flex-1 + minWidth:0) so the pill on the right
                      always keeps its own space instead of forcing a
                      wrap; the amount uses adjustsFontSizeToFit only
                      as a last-resort shrink for an unusually large
                      number, with a minimumFontScale floor so it never
                      collapses to something unreadable. Tight rowPy
                      padding (not the taller cardPy) keeps the whole
                      card short on both iOS and Android.
                  ========================================= */}
                  <View
                    className={`bg-white rounded-2xl border border-gray-200 shadow-sm mt-3 ${T.rowPx} ${T.rowPy} flex-row items-center justify-between`}
                  >
                    <View className="flex-1 mr-3" style={{ minWidth: 0 }}>
                      <Text
                        className={`text-[#e8501f] ${
                          A ? "text-lg" : "text-xl"
                        } font-extrabold`}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        ellipsizeMode="tail"
                      >
                        {money(chit.dueAmount)}
                      </Text>
                      <Text className={`text-gray-400 ${T.sm} mt-0.5`}>
                        My due
                      </Text>
                    </View>

                    {/* Pay now goes here once the gateway is ready */}
                    <View
                      className={`bg-gray-100 rounded-full ${
                        A ? "px-3 py-1.5" : "px-4 py-2"
                      }`}
                    >
                      <Text
                        className={`text-gray-400 font-semibold ${T.sm}`}
                        numberOfLines={1}
                      >
                        Pay at branch
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {/* HELP */}
          {chits.length > 0 ? (
            <TouchableOpacity
              onPress={() => router.push("/contact")}
              activeOpacity={0.8}
              className={`mt-2 bg-blue-50 rounded-2xl ${T.rowPx} ${T.cardPy} border border-blue-100`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <MaterialIcons name="info" size={T.iconSm} color="#3b82f6" />
                  <Text className={`text-blue-700 ${T.base} ml-2`}>
                    Need help? Contact your group administrator
                  </Text>
                </View>
                <MaterialIcons
                  name="arrow-forward"
                  size={T.iconSm}
                  color="#3b82f6"
                />
              </View>
            </TouchableOpacity>
          ) : null}

          {/* FOOTER */}
          <View className="mt-6 mb-4 items-center">
            <View className="w-full border-t border-gray-200 pt-4 items-center">
              <Text className={`text-[#024e32] font-bold ${T.cardTitle}`}>
                MANIKYA CHITS PVT LTD
              </Text>

              <Text className={`text-gray-500 ${T.sm} mt-1 text-center`}>
                My Chits
              </Text>

              <Text className={`text-gray-400 ${T.sm} mt-1 text-center`}>
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights
                reserved.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* =========================================================
          RESULT HISTORY MODAL
          Winner of each closed auction, plus every bid placed in
          that auction underneath it.
      ========================================================= */}
      <Modal
        visible={historyVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setHistoryVisible(false)}
      >
        <Pressable
          onPress={() => setHistoryVisible(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(15, 23, 42, 0.55)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 460 }}
          >
            <View
              className="bg-white rounded-3xl overflow-hidden"
              style={{ maxHeight: 620 }}
            >
              {/* HEADER */}
              <View
                className={`bg-[#024e32] px-5 ${
                  A ? "py-3.5" : "py-4"
                } flex-row items-center`}
              >
                <View
                  className={`${
                    A ? "w-8 h-8" : "w-9 h-9"
                  } rounded-full bg-white/15 items-center justify-center mr-3`}
                >
                  <MaterialIcons
                    name="emoji-events"
                    size={T.iconMd}
                    color="white"
                  />
                </View>

                <View className="flex-1">
                  <Text className={`text-white font-bold ${T.sectionTitle}`}>
                    Auction Results
                  </Text>
                  <Text className={`text-green-100 ${T.sm} mt-0.5`}>
                    Group {historyChit?.groupId} ·{" "}
                    {historyChit?.resultHistory?.length || 0} result
                    {historyChit?.resultHistory?.length === 1 ? "" : "s"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setHistoryVisible(false)}
                  className={`${
                    A ? "w-8 h-8" : "w-9 h-9"
                  } rounded-full bg-white/15 items-center justify-center`}
                >
                  <MaterialIcons name="close" size={T.iconMd} color="white" />
                </TouchableOpacity>
              </View>

              {/* LIST */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: A ? 12 : 14 }}
              >
                {historyLoading ? (
                  <View className="items-center py-12">
                    <ActivityIndicator size="large" color="#024e32" />
                    <Text className={`text-gray-500 mt-3 ${T.base}`}>
                      Loading results...
                    </Text>
                  </View>
                ) : !historyRows.length ? (
                  <View className="items-center py-12">
                    <MaterialIcons name="history" size={44} color="#d1d5db" />
                    <Text className={`text-gray-500 mt-3 font-medium ${T.base}`}>
                      No results yet
                    </Text>
                    <Text
                      className={`text-gray-400 ${T.sm} mt-1 text-center px-6`}
                    >
                      Winners appear here once an auction is closed
                    </Text>
                  </View>
                ) : (
                  historyRows.map((row: any, i: number) => {
                    const r = row.auction;
                    const bids = row.bids || [];

                    const highest = bids.length
                      ? Math.max(
                          ...bids.map((b: any) => Number(b.bidAmount || 0))
                        )
                      : 0;

                    return (
                      <View
                        key={r._id || i}
                        className="border border-gray-200 rounded-2xl mb-3 overflow-hidden"
                      >
                        {/* WINNER STRIP */}
                        <View
                          className={`bg-amber-50 border-b border-amber-200 ${T.rowPx} ${T.rowPy}`}
                        >
                          <View className="flex-row items-center mb-2">
                            <MaterialIcons
                              name="emoji-events"
                              size={T.iconSm}
                              color="#d97706"
                            />
                            <Text
                              className={`text-amber-800 font-bold ${T.base} ml-1.5 flex-1`}
                            >
                              {r.winnerName}
                            </Text>

                            <Text className={`text-gray-500 ${T.xs}`}>
                              {r.auctionEndDate}
                              {r.auctionEndTime
                                ? ` · ${to12Hour(r.auctionEndTime)}`
                                : ""}
                            </Text>
                          </View>

                          <View className="flex-row justify-between py-0.5">
                            <Text className={`text-gray-600 ${T.sm}`}>
                              Group Member ID
                            </Text>
                            <Text
                              className={`text-gray-900 font-semibold ${T.sm}`}
                            >
                              {r.winnerGroupId || "-"}
                            </Text>
                          </View>

                          <View className="flex-row justify-between py-0.5">
                            <Text className={`text-gray-600 ${T.sm}`}>
                              Winning bid
                            </Text>
                            <Text
                              className={`text-amber-700 font-bold ${T.sm}`}
                            >
                              {r.winnerBidAmount ? money(r.winnerBidAmount) : "-"}
                            </Text>
                          </View>

                          {historyChit?.chitValue && r.winnerBidAmount ? (
                            <View className="flex-row justify-between py-0.5">
                              <Text className={`text-gray-600 ${T.sm}`}>
                                Prize amount
                              </Text>
                              <Text
                                className={`text-[#024e32] font-bold ${T.sm}`}
                              >
                                {money(
                                  Number(historyChit.chitValue) -
                                    Number(r.winnerBidAmount)
                                )}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* BIDS OF THIS AUCTION */}
                        <View className={`${T.rowPx} ${T.rowPy}`}>
                          <Text
                            className={`text-gray-500 ${T.xs} font-bold tracking-wider uppercase mb-2`}
                          >
                            Bids ({bids.length})
                          </Text>

                          {bids.length === 0 ? (
                            <Text className={`text-gray-400 ${T.sm} py-2`}>
                              No bids were placed in this auction
                            </Text>
                          ) : (
                            bids.map((b: any, bi: number) => {
                              const amount = Number(b.bidAmount || 0);
                              const isTop = amount === highest;
                              const isMine =
                                String(b.memberId) === String(userid);

                              return (
                                <View
                                  key={b._id || bi}
                                  className={`flex-row items-center rounded-xl px-2.5 py-2 mb-1.5 ${
                                    isTop
                                      ? "bg-yellow-50 border border-yellow-200"
                                      : isMine
                                      ? "bg-blue-50 border border-blue-200"
                                      : "bg-gray-50 border border-gray-100"
                                  }`}
                                >
                                  <View
                                    className={`${
                                      A ? "w-7 h-7" : "w-8 h-8"
                                    } rounded-full items-center justify-center mr-2.5 ${
                                      isTop
                                        ? "bg-yellow-100"
                                        : isMine
                                        ? "bg-blue-100"
                                        : "bg-[#024e32]/10"
                                    }`}
                                  >
                                    <Text
                                      className={`${T.xs} font-bold ${
                                        isTop
                                          ? "text-yellow-700"
                                          : isMine
                                          ? "text-blue-700"
                                          : "text-[#024e32]"
                                      }`}
                                    >
                                      {b.groupMemberId || "-"}
                                    </Text>
                                  </View>

                                  <View className="flex-1">
                                    <Text
                                      className={`text-gray-800 ${T.sm} font-semibold`}
                                      numberOfLines={1}
                                    >
                                      {isMine
                                        ? "Your bid"
                                        : `Bidder ${b.groupMemberId || "-"}`}
                                    </Text>

                                    {b.bidTime ? (
                                      <Text className={`text-gray-400 ${T.xs}`}>
                                        {new Date(b.bidTime).toLocaleTimeString(
                                          "en-IN",
                                          {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            hour12: true,
                                          }
                                        )}
                                      </Text>
                                    ) : null}
                                  </View>

                                  <View className="items-end">
                                    <Text
                                      className={`font-bold ${T.sm} ${
                                        isTop
                                          ? "text-yellow-700"
                                          : isMine
                                          ? "text-blue-700"
                                          : "text-[#024e32]"
                                      }`}
                                    >
                                      {money(amount)}
                                    </Text>

                                    {isTop ? (
                                      <Text
                                        className={`text-yellow-600 ${
                                          A ? "text-[8px]" : "text-[9px]"
                                        } font-bold`}
                                      >
                                        HIGHEST
                                      </Text>
                                    ) : null}
                                  </View>
                                </View>
                              );
                            })
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* FOOTER */}
              <View className={`${T.rowPx} py-3 border-t border-gray-100`}>
                <TouchableOpacity
                  onPress={() => setHistoryVisible(false)}
                  activeOpacity={0.85}
                  className={`bg-gray-100 ${A ? "py-2.5" : "py-3"} rounded-2xl`}
                >
                  <Text
                    className={`text-gray-700 text-center font-semibold ${T.base}`}
                  >
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}