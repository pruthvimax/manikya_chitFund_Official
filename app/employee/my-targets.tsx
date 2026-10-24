import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BACKEND_URL from "../../config";

const { width } = Dimensions.get("window");
const isDesktopOrLaptop = width >= 768;

/* =========================================================
   TABLE LAYOUT CONSTANTS
========================================================= */
const TABLE_HEADER_HEIGHT = 46;
const TABLE_ROW_HEIGHT = 64;

const COLS = isDesktopOrLaptop
  ? {
      customer: 180,
      phone: 130,
      date: 120,
      payment: 110,
      chit: 130,
      collection: 130,
      gb: 90,
      status: 110,
      actions: 120,
    }
  : {
      customer: 140,
      phone: 110,
      date: 100,
      payment: 95,
      chit: 110,
      collection: 110,
      gb: 70,
      status: 100,
      actions: 96,
    };

/* Header cell: fixed box, single line, never pushes the header taller. */
function TableHeaderCell({ label, width }: { label: string; width: number }) {
  return (
    <View
      style={{
        width,
        height: TABLE_HEADER_HEIGHT,
        paddingHorizontal: 6,
        justifyContent: "center",
      }}
    >
      <Text
        className="text-white font-semibold text-center text-sm"
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
}

/* Body cell: fixed box. Content is clipped, never allowed to resize the row. */
function TableCell({
  width,
  children,
}: {
  width: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        width,
        height: TABLE_ROW_HEIGHT,
        paddingHorizontal: 6,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

/* =========================================================
   PAYMENT LOG BUILDER  (history modal only — READ ONLY)

   The collection log is a pure record on this screen. Employees add a
   NEW collection through the pencil "Edit" button in the Actions
   column, which appends a fresh line here.

   When an ADMIN corrects an existing line, the admin screen rewrites
   THAT SAME line — same date, same position — instead of adding a new
   one. So a correction never shows up here as a duplicate entry: the
   original line simply reads the corrected amount after a refresh, and
   the running totals below it move with it.
========================================================= */
interface PaymentLogEntry {
  stamp: string;
  editedAt: string | null;
  amount: number | null;
  newTotal: number | null;
  paymentMethod: string;
  otherFields: string[];
  oldAmount?: number;
  editedBy?: string;
}

const getDisplayPaymentMethod = (method?: string) => {
  if (!method) return "-";
  if (method === "Cheque") return "AC";
  return method;
};

const toNumber = (value: any): number => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[^0-9.\-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const prettyFieldName = (field: any): string => {
  const raw = String(field ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
};

const buildPaymentLog = (target: any): PaymentLogEntry[] => {
  const history = Array.isArray(target?.editHistory) ? target.editHistory : [];

  const groups = new Map<
    string,
    { editedAt: string | null; editedBy?: string; items: any[] }
  >();

  history.forEach((item: any, index: number) => {
    const stamp = item?.editedAt
      ? new Date(item.editedAt).toISOString().slice(0, 19)
      : `unknown-${index}`;
    if (!groups.has(stamp)) {
      groups.set(stamp, {
        editedAt: item?.editedAt ?? null,
        editedBy: item?.editedBy ? String(item.editedBy) : undefined,
        items: [],
      });
    }
    const group = groups.get(stamp)!;
    if (!group.editedBy && item?.editedBy) group.editedBy = String(item.editedBy);
    group.items.push(item);
  });

  const log: PaymentLogEntry[] = [];

  groups.forEach((group, stamp) => {
    // FIXED: when two or more collection amounts were saved on the exact
    // same second (or an admin moved two entries onto the same date),
    // they landed in ONE group here and only the first amount was shown
    // -- the rest were hidden (even listed as "Collection Amount" under
    // "Also updated"), while the total still counted all of them. Give
    // every collection amount its own row instead. A group with a single
    // collection amount still goes through the original code below,
    // unchanged.
    const collectionItems = group.items.filter((i) =>
      String(i?.field ?? "").toLowerCase().includes("collection")
    );

    if (collectionItems.length > 1) {
      const paymentItems = group.items.filter((i) =>
        String(i?.field ?? "").toLowerCase().includes("payment")
      );
      const otherItems = group.items.filter(
        (i) => !collectionItems.includes(i) && !paymentItems.includes(i)
      );

      collectionItems.forEach((collectionItem, i) => {
        const paymentItem = paymentItems[i] || (i === 0 ? paymentItems[0] : undefined);

        log.push({
          stamp: `${stamp}#${i}`,
          editedAt: group.editedAt,
          amount: toNumber(collectionItem.newValue) - toNumber(collectionItem.oldValue),
          newTotal: toNumber(collectionItem.newValue),
          paymentMethod: paymentItem?.newValue
            ? String(paymentItem.newValue)
            : String(target?.paymentMethod ?? ""),
          otherFields:
            i === 0
              ? otherItems.map((it) => prettyFieldName(it?.field)).filter(Boolean)
              : [],
          oldAmount: toNumber(collectionItem.oldValue),
          editedBy: group.editedBy,
        });
      });
      return;
    }

    const collection = group.items.find((i) =>
      String(i?.field ?? "").toLowerCase().includes("collection")
    );
    const payment = group.items.find((i) =>
      String(i?.field ?? "").toLowerCase().includes("payment")
    );

    const newTotal = collection ? toNumber(collection.newValue) : null;
    const amount = collection
      ? toNumber(collection.newValue) - toNumber(collection.oldValue)
      : null;

    const otherFields = group.items
      .filter((i) => i !== collection && i !== payment)
      .map((i) => prettyFieldName(i?.field))
      .filter(Boolean);

    log.push({
      stamp,
      editedAt: group.editedAt,
      amount,
      newTotal,
      paymentMethod: payment?.newValue
        ? String(payment.newValue)
        : String(target?.paymentMethod ?? ""),
      otherFields,
      oldAmount: collection ? toNumber(collection.oldValue) : undefined,
      editedBy: group.editedBy,
    });
  });

  // FIXED: the Collection Amount typed on the very first "Add Target" form
  // (handleSubmit, below) never showed up in this log, because
  // editHistory only starts recording once something is EDITED
  // afterwards -- a brand new target has no edit yet at the moment it's
  // created. That's exactly what was reported: the first collection
  // amount only appeared in History after the employee opened the
  // pencil "Edit" modal once and added something on top of it.
  // This adds ONE more entry here for that original amount, dated at
  // creation time, so it always shows -- without touching how a target
  // is created, edited, saved, or how collection amounts are added
  // anywhere else on this page.
  if (target) {
    // FIXED: this used to .sort() these by editedAt to find the
    // "earliest" one. But editedAt is exactly the field an ADMIN can
    // edit (moving one entry's date onto another day, e.g. in the
    // admin's Edit Payment Log screen) -- once that happens, a LATER
    // entry can sort as if it were the earliest, its oldValue gets
    // mistaken for the true original creation amount, and a bogus
    // extra row appears here on top of what the employee actually
    // entered. Array order (what .filter already preserves) is never
    // touched by a date edit, so the FIRST entry ever inserted is the
    // reliable original -- not whichever one now has the earliest date.
    const collectionEdits = history.filter((i: any) =>
      String(i?.field ?? "").toLowerCase().includes("collection")
    );

    // The first-ever collection edit's oldValue IS the original amount
    // typed on the Add Target form. If this target has never been
    // edited at all yet, the current collectionAmount itself is still
    // exactly that original amount.
    const originalCollectionAmount =
      collectionEdits.length > 0
        ? toNumber(collectionEdits[0].oldValue)
        : toNumber(target.collectionAmount);

    // Same idea for payment method -- target.paymentMethod is the
    // CURRENT/live value, which changes whenever ANY later entry's
    // payment method is edited. Using it directly here made this
    // creation row's payment method appear to change along with it,
    // even though this entry itself was never touched. The first-ever
    // payment-method edit's oldValue is what it actually was at
    // creation; if it was never edited, the current value still is it.
    const paymentEdits = history.filter((i: any) =>
      String(i?.field ?? "").toLowerCase().includes("payment")
    );
    const originalPaymentMethod =
      paymentEdits.length > 0
        ? String(paymentEdits[0].oldValue ?? target.paymentMethod ?? "")
        : String(target.paymentMethod ?? "");

    if (originalCollectionAmount > 0) {
      log.push({
        stamp: `created-${target._id || target.createdAt || "0"}`,
        editedAt: target.createdAt || null,
        amount: originalCollectionAmount,
        newTotal: originalCollectionAmount,
        paymentMethod: originalPaymentMethod,
        otherFields: [],
        oldAmount: 0,
      });
    }
  }

  return log.sort(
    (a, b) =>
      new Date(b.editedAt ?? 0).getTime() - new Date(a.editedAt ?? 0).getTime()
  );
};

const formatLogDate = (value: any): string => {
  if (!value) return "Date not recorded";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date not recorded";
  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// Magnitude only — the caller adds the + / − sign itself.
const formatMoney = (value: number): string =>
  `₹${Math.abs(value).toLocaleString("en-IN")}`;

// Signed value — use this for TOTALS so a negative total is never
// printed as if it were positive.
const formatMoneyValue = (value: number): string => {
  const num = Number(value) || 0;
  return `${num < 0 ? "−" : ""}₹${Math.abs(num).toLocaleString("en-IN")}`;
};

/* =========================================================
   BACKEND WRITE HELPER

   editHistory is never posted from this screen — the server writes the
   log itself whenever collectionAmount changes. putTarget surfaces the
   real server message instead of a generic "failed".
========================================================= */
const putTarget = async (id: string, payload: Record<string, any>) => {
  const response = await fetch(`${BACKEND_URL}/target/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || `Server responded with ${response.status}`
    );
  }
  return data;
};

// FIXED: Alert.alert does not reliably show on web (laptop/desktop
// browser) in this Expo setup -- it's the same reason the "Locked"
// message in openEditTargetModal (below) already uses window.alert on
// web. "Submit Target" was silently blocked by this: a validation
// message (or the Success/Error result) never appeared on web, so it
// looked like pressing the button did nothing. This shows every
// message on every platform -- the browser's own alert() on web, the
// native Alert on iOS/Android -- without changing what any message
// says or when it's shown.
const showMessage = (title: string, message?: string) => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
};

interface Target {
  _id: string;
  emp_id: string;
  employeeName: string;
  date: string;
  customerName: string;
  phoneNumber: string;
  paymentMethod: string;
  chitAmount: string;
  collectionAmount: number;
  totalGB: number;
  totalEnroll?: number;
  backup?: string;
  isFrozen?: boolean;
  salaryAmount?: number;
  incentive?: number;
  status: "Pending" | "Approved" | "Rejected";
  isEdited: boolean;
  editHistory: any[];
  createdAt: string;
}

/* =========================================================
   SKELETON
========================================================= */
function TargetSkeleton() {
  return (
    <View className="p-5">
      <View className="h-7 w-40 bg-gray-200 rounded-md mb-5" />
      <View className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <View className="h-5 w-36 bg-gray-200 rounded mb-4" />
        <View className="h-11 w-full bg-gray-200 rounded-xl mb-3" />
        <View className="h-11 w-full bg-gray-200 rounded-xl" />
      </View>
      <View className="h-12 w-full bg-gray-200 rounded-xl mb-4" />
      {[1, 2, 3, 4, 5].map((item) => (
        <View
          key={item}
          className="bg-white rounded-2xl p-5 mb-4 border border-gray-200"
        >
          <View className="h-5 w-40 bg-gray-200 rounded mb-3" />
          <View className="h-4 w-28 bg-gray-200 rounded mb-2" />
          <View className="h-4 w-32 bg-gray-200 rounded" />
        </View>
      ))}
    </View>
  );
}

/* =========================================================
   CONSTANT FOOTER
========================================================= */
function Footer() {
  return (
    <View className="px-5 mt-5 mb-2">
      <View className="border-t border-gray-200 pt-4 items-center">
        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>
        <Text className="text-gray-500 text-xs mt-1 text-center">
          My Targets
        </Text>
        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
          {"\n"}All rights reserved.
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   SIMPLE DATE PICKER (replaces native DateTimePicker)

   FIXED: the native DateTimePicker from
   @react-native-community/datetimepicker doesn't respond on
   laptop/desktop (web) -- tapping a date did nothing there, which is
   what was reported. This is a small calendar built only from plain
   React Native View/TouchableOpacity/Text, so it renders and responds
   the same way on iOS, Android AND web -- no native picker involved.
   Same approach already proven working on the admin screen's date
   pickers. It only picks a date and calls onChange; it doesn't touch
   anything else here.
========================================================= */
const PICKER_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const PICKER_DAY_NAMES = ["S", "M", "T", "W", "T", "F", "S"];

function SimpleDatePicker({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const safeValue =
    value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  const [viewMonth, setViewMonth] = useState(safeValue.getMonth());
  const [viewYear, setViewYear] = useState(safeValue.getFullYear());

  useEffect(() => {
    setViewMonth(safeValue.getMonth());
    setViewYear(safeValue.getFullYear());
  }, [safeValue]);

  const today = new Date();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (d: number) =>
    safeValue.getFullYear() === viewYear &&
    safeValue.getMonth() === viewMonth &&
    safeValue.getDate() === d;

  const isToday = (d: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === d;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelect = (d: number) => {
    onChange(new Date(viewYear, viewMonth, d));
    onClose();
  };

  const CELL = 38;

  return (
    <View
      className="bg-white rounded-2xl shadow-2xl"
      style={{ width: CELL * 7 + 24, padding: 12 }}
    >
      <View className="flex-row justify-between items-center mb-2">
        <TouchableOpacity onPress={prevMonth} className="p-2 rounded-full" activeOpacity={0.6}>
          <MaterialIcons name="chevron-left" size={24} color="#024e32" />
        </TouchableOpacity>

        <Text className="text-gray-800 font-bold text-base">
          {PICKER_MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <TouchableOpacity onPress={nextMonth} className="p-2 rounded-full" activeOpacity={0.6}>
          <MaterialIcons name="chevron-right" size={24} color="#024e32" />
        </TouchableOpacity>
      </View>

      <View className="flex-row mb-1">
        {PICKER_DAY_NAMES.map((d, i) => (
          <View key={`${d}-${i}`} style={{ width: CELL, alignItems: "center" }}>
            <Text className="text-gray-500 text-xs font-semibold">{d}</Text>
          </View>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map((d, i) => {
          if (d === null) {
            return <View key={`e-${i}`} style={{ width: CELL, height: CELL }} />;
          }
          const sel = isSelected(d);
          const tod = isToday(d);
          return (
            <TouchableOpacity
              key={d}
              onPress={() => handleSelect(d)}
              activeOpacity={0.7}
              style={{ width: CELL, height: CELL, alignItems: "center", justifyContent: "center" }}
            >
              <View
                style={{
                  width: CELL - 6,
                  height: CELL - 6,
                  borderRadius: (CELL - 6) / 2,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: sel ? "#024e32" : "transparent",
                  borderWidth: tod && !sel ? 1.5 : 0,
                  borderColor: "#024e32",
                }}
              >
                <Text
                  style={{
                    color: sel ? "#ffffff" : "#1f2937",
                    fontWeight: sel || tod ? "700" : "500",
                    fontSize: 13,
                  }}
                >
                  {d}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row mt-3" style={{ gap: 10 }}>
        <TouchableOpacity
          onPress={() => {
            const t = new Date();
            onChange(t);
            onClose();
          }}
          className="flex-1 bg-gray-100 py-2.5 rounded-xl"
          activeOpacity={0.7}
        >
          <Text className="text-gray-700 text-center font-semibold">Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onClose}
          className="flex-1 bg-[#024e32] py-2.5 rounded-xl"
          activeOpacity={0.7}
        >
          <Text className="text-white text-center font-semibold">Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MyTargets() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState<Target[]>([]);
  const [filteredTargets, setFilteredTargets] = useState<Target[]>([]);
  const [fetching, setFetching] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "customerName" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [monthlyTarget, setMonthlyTarget] = useState<Target | null>(null);

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Target | null>(null);
  const [customerHistoryEntries, setCustomerHistoryEntries] = useState<Target[]>([]);
  const [customerTotalCollection, setCustomerTotalCollection] = useState(0);

  // True while the open history modal is pulling the latest copy from
  // the server, so an admin's correction is never read off stale data.
  const [historyRefreshing, setHistoryRefreshing] = useState(false);

  // Payment log for the open history modal. READ ONLY — no editing UI.
  const paymentLog = useMemo(() => buildPaymentLog(historyTarget), [historyTarget]);

  // Edit Target Details States
  // This is the ONLY editing path for employees: it adds a NEW
  // collection amount on top of the existing total and lets them fix
  // the other details. Existing collection-log lines are untouchable
  // here — only an admin can correct one, and that correction rewrites
  // the same line rather than adding another.
  const [editTargetModalVisible, setEditTargetModalVisible] = useState(false);
  const [editTargetData, setEditTargetData] = useState<Target | null>(null);
  const [editTargetDate, setEditTargetDate] = useState(new Date());
  const [editTargetCustomerName, setEditTargetCustomerName] = useState("");
  const [editTargetPhoneNumber, setEditTargetPhoneNumber] = useState("");
  const [editTargetPaymentMethod, setEditTargetPaymentMethod] = useState("Cash");
  const [editTargetChitAmount, setEditTargetChitAmount] = useState("");
  const [editTargetCollectionAmount, setEditTargetCollectionAmount] = useState("");
  const [editTargetTotalGB, setEditTargetTotalGB] = useState("");
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  const [date, setDate] = useState(new Date());
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [chitAmount, setChitAmount] = useState("");
  const [collectionAmount, setCollectionAmount] = useState("");
  const [totalGB, setTotalGB] = useState("");

  const [summaryEnroll, setSummaryEnroll] = useState("");
  const [summaryGB, setSummaryGB] = useState("");
  const [summaryBackup, setSummaryBackup] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [employee, setEmployee] = useState<any>(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
  };

  const years = getYears();
  const paymentMethods = ["Cash", "UPI", "AC"];

  const getSafeText = (value: any) => {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number") return value.toString();
    return value ? String(value) : "";
  };

  const getSafeDate = (value: any) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  // FIXED: toISOString() converts to UTC, so local midnight of the 20th
  // (picked in the calendar) came out as the 19th in India. Build the
  // YYYY-MM-DD text from the LOCAL year / month / day instead.
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const formatHistoryDate = (value: any) => {
    const parsed = getSafeDate(value);
    if (!parsed) return "";
    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDisplayDate = (value: any) => {
    const parsed = getSafeDate(value);
    return parsed ? parsed.toLocaleDateString() : "—";
  };

  const parseAmount = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^0-9.]/g, '');
      return parseFloat(cleaned) || 0;
    }
    return 0;
  };

  const extractMonthlyTarget = (data: Target[]) => {
    const monthTarget = data.find((t) => {
      const customerName = getSafeText(t.customerName).toLowerCase();
      const targetDate = getSafeDate(t.date);
      return (
        customerName.includes("target") &&
        targetDate &&
        targetDate.getMonth() === selectedMonth &&
        targetDate.getFullYear() === selectedYear
      );
    });
    setMonthlyTarget(monthTarget || null);
  };

  // ============ LOAD SAVED SUMMARY ============
  const loadSummaryForMonth = async () => {
    try {
      if (monthlyTarget) {
        setSummaryEnroll(monthlyTarget.totalEnroll?.toString() || "");
        setSummaryGB(monthlyTarget.totalGB?.toString() || "");
        setSummaryBackup(monthlyTarget.backup || "");
        return;
      }

      const stored = await AsyncStorage.getItem("employee");
      if (!stored) return;
      const emp = JSON.parse(stored);

      const key = `monthly_summary_${emp.emp_id}_${selectedMonth}_${selectedYear}`;
      const saved = await AsyncStorage.getItem(key);

      if (saved) {
        const data = JSON.parse(saved);
        setSummaryEnroll(data.totalEnroll?.toString() || "");
        setSummaryGB(data.totalGB?.toString() || "");
        setSummaryBackup(data.backup || "");
      } else {
        const monthTargets = targets.filter((t) => {
          const targetDate = getSafeDate(t.date);
          return targetDate && targetDate.getMonth() === selectedMonth && targetDate.getFullYear() === selectedYear;
        });
        const defaultEnroll = monthTargets.length;
        const defaultGB = monthTargets.reduce((s, t) => s + t.totalGB, 0);
        setSummaryEnroll(defaultEnroll.toString());
        setSummaryGB(defaultGB.toString());
        setSummaryBackup("");
      }
    } catch (err) {
      console.log("Error loading summary:", err);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadSummaryForMonth();
    }
  }, [selectedMonth, selectedYear, showHistory, monthlyTarget]);

  // ============ SAVE SUMMARY ============
  const saveSummary = async () => {
    if (monthlyTarget?.isFrozen) {
      Alert.alert("Frozen", "This monthly target is frozen. You cannot edit the summary.");
      return;
    }

    if (!monthlyTarget) {
      Alert.alert("Error", "No monthly target found to update.");
      return;
    }

    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }
      const emp = JSON.parse(stored);

      const response = await fetch(`${BACKEND_URL}/target/${monthlyTarget._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalEnroll: parseFloat(summaryEnroll) || 0,
          totalGB: parseFloat(summaryGB) || 0,
          backup: summaryBackup,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update backend");
      }

      const key = `monthly_summary_${emp.emp_id}_${selectedMonth}_${selectedYear}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        totalEnroll: parseFloat(summaryEnroll) || 0,
        totalGB: parseFloat(summaryGB) || 0,
        backup: summaryBackup,
      }));

      Alert.alert("Success", "Summary saved successfully");
      fetchTargets();
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save summary");
    } finally {
      setLoading(false);
    }
  };

  const fetchTargets = async () => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }
      const emp = JSON.parse(stored);
      setEmployee(emp);

      const response = await fetch(`${BACKEND_URL}/target/employee/${emp.emp_id}`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      setTargets(data);
      extractMonthlyTarget(data);
      applyFiltersAndSort(data);
    } catch (error) {
      console.error("Error fetching targets:", error);
      Alert.alert("Error", "Failed to load targets");
    } finally {
      setFetching(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTargets();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTargets();
  };

  const applyFiltersAndSort = (data: Target[]) => {
    const customerTargets = data.filter((t) => !getSafeText(t.customerName).toLowerCase().includes("target"));
    let filtered = [...customerTargets];

    filtered = filtered.filter((t) => {
      const targetDate = getSafeDate(t.date);
      return targetDate && targetDate.getMonth() === selectedMonth && targetDate.getFullYear() === selectedYear;
    });

    if (statusFilter !== "All") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((t) => {
        const customerName = getSafeText(t.customerName).toLowerCase();
        const phoneNumber = getSafeText(t.phoneNumber).toLowerCase();
        const chitAmount = getSafeText(t.chitAmount).toLowerCase();
        return customerName.includes(query) || phoneNumber.includes(query) || chitAmount.includes(query);
      });
    }

    filtered.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortBy) {
        case "date":
          valA = getSafeDate(a.date)?.getTime() ?? 0;
          valB = getSafeDate(b.date)?.getTime() ?? 0;
          break;
        case "customerName":
          valA = getSafeText(a.customerName).toLowerCase();
          valB = getSafeText(b.customerName).toLowerCase();
          break;
        case "status":
          valA = getSafeText(a.status).toLowerCase();
          valB = getSafeText(b.status).toLowerCase();
          break;
        default:
          valA = getSafeText(a.customerName).toLowerCase();
          valB = getSafeText(b.customerName).toLowerCase();
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    setFilteredTargets(filtered);
  };

  useFocusEffect(
    useCallback(() => {
      applyFiltersAndSort(targets);
      extractMonthlyTarget(targets);
    }, [targets, statusFilter, searchQuery, sortBy, sortOrder, selectedMonth, selectedYear])
  );

  const handleSubmit = async () => {
    if (!customerName || !phoneNumber || !chitAmount || !collectionAmount || !totalGB) {
      showMessage("Validation", "Please fill all required fields");
      return;
    }

    if (phoneNumber.length < 10) {
      showMessage("Validation", "Please enter valid phone number");
      return;
    }

    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        showMessage("Error", "Employee not found");
        return;
      }
      const emp = JSON.parse(stored);

      const response = await fetch(`${BACKEND_URL}/target/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: emp.emp_id,
          employeeName: emp.name,
          date,
          customerName,
          phoneNumber,
          paymentMethod,
          chitAmount,
          collectionAmount: parseFloat(collectionAmount),
          totalGB: parseInt(totalGB),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showMessage("Success", "Target submitted successfully");
        resetForm();
        fetchTargets();
      } else {
        showMessage("Error", data.message || "Failed to submit target");
      }
    } catch (error) {
      console.error(error);
      showMessage("Error", "Failed to submit target");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setPhoneNumber("");
    setPaymentMethod("Cash");
    setChitAmount("");
    setCollectionAmount("");
    setTotalGB("");
    setDate(new Date());
    setEditMode(false);
    setSelectedTarget(null);
  };

  // ============ REFRESH + RESYNC OPEN MODALS ============
  // Pulls fresh data from the server and, when a target id is given,
  // re-points the open history modal at the newly saved version so the
  // collection log and the totals show what the backend actually stored.
  //
  // This is also how an ADMIN's correction reaches the employee: the
  // admin rewrote the existing log line, so this refresh simply replaces
  // that line's amount and its running total — no second entry appears.
  const refreshFromServer = async (focusTargetId?: string) => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) return;
      const emp = JSON.parse(stored);

      const response = await fetch(`${BACKEND_URL}/target/employee/${emp.emp_id}`);
      if (!response.ok) return;

      const data: Target[] = await response.json();
      setTargets(data);
      extractMonthlyTarget(data);
      applyFiltersAndSort(data);

      if (focusTargetId) {
        const fresh = data.find((t) => t._id === focusTargetId);
        if (fresh) {
          setHistoryTarget((prev) => (prev && prev._id === fresh._id ? fresh : prev));
          const entries = data.filter(
            (t) => t.phoneNumber === fresh.phoneNumber && t.emp_id === fresh.emp_id
          );
          setCustomerHistoryEntries(entries);
          setCustomerTotalCollection(
            entries.reduce((sum, item) => sum + Number(item.collectionAmount || 0), 0)
          );
        }
      }
    } catch (err) {
      console.log("Refresh error:", err);
    }
  };

  // Re-reads the record behind the OPEN history modal on demand.
  const reloadHistoryTarget = async () => {
    if (!historyTarget) return;
    try {
      setHistoryRefreshing(true);
      await refreshFromServer(historyTarget._id);
    } finally {
      setHistoryRefreshing(false);
    }
  };

  // ============ EDIT TARGET DETAILS ============
  // Only a Pending row can be edited here. The backend itself rejects
  // any employee edit once admin has Approved or Rejected an entry
  // (only an admin can touch it after that) -- this just stops the
  // employee from opening the form and hitting that error at Save; it
  // tells them up front instead.
  const openEditTargetModal = (target: Target) => {
    if (target.status === "Approved" || target.status === "Rejected") {
      const lockedMessage = `This entry is already ${target.status.toLowerCase()}. Only an admin can edit it now.`;

      // Alert.alert alone does not reliably show on web (laptop/desktop
      // browser) in this Expo setup -- same reason addPayment above uses
      // window.confirm() there. Use the browser's own alert() on web and
      // keep the native Alert on iOS/Android so this message is always
      // seen, on every platform.
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.alert(lockedMessage);
        }
      } else {
        Alert.alert("Locked", lockedMessage);
      }
      return;
    }

    setEditTargetData(target);
    setEditTargetCustomerName(target.customerName);
    setEditTargetPhoneNumber(target.phoneNumber);
    setEditTargetPaymentMethod(target.paymentMethod || "Cash");
    setEditTargetChitAmount(target.chitAmount);
    setEditTargetCollectionAmount(""); // always blank - never prefill the last amount
    setEditTargetTotalGB(target.totalGB?.toString() || "");
    setEditTargetDate(new Date(target.date));
    setEditTargetModalVisible(true);
  };

  const previousCollectionTotal = Number(editTargetData?.collectionAmount || 0);

  const newCollectionTotalPreview = useMemo(() => {
    const typed = editTargetCollectionAmount.trim();
    if (typed === "") return previousCollectionTotal;
    const parsed = parseFloat(typed);
    if (Number.isNaN(parsed)) return previousCollectionTotal;
    return previousCollectionTotal + parsed;
  }, [editTargetCollectionAmount, previousCollectionTotal]);

  const saveEditedTarget = async () => {
    if (!editTargetData) return;

    const typedAmount = editTargetCollectionAmount.trim();
    const addedAmount = typedAmount === "" ? 0 : parseFloat(typedAmount);

    if (typedAmount !== "" && Number.isNaN(addedAmount)) {
      Alert.alert("Validation", "Please enter a valid collection amount");
      return;
    }

    if (!editTargetCustomerName.trim() || !editTargetPhoneNumber.trim()) {
      Alert.alert("Validation", "Customer name and phone number are required");
      return;
    }

    const previousTotal = Number(editTargetData.collectionAmount || 0);
    const newTotal = previousTotal + addedAmount;

    try {
      setLoading(true);

      // editHistory is intentionally NOT sent: the backend records the
      // collectionAmount change itself, which is what fills the collection log.
      await putTarget(editTargetData._id, {
        customerName: editTargetCustomerName.trim(),
        phoneNumber: editTargetPhoneNumber.trim(),
        paymentMethod: editTargetPaymentMethod,
        chitAmount: editTargetChitAmount,
        collectionAmount: newTotal,
        totalGB: parseInt(editTargetTotalGB) || 0,
        date: editTargetDate,
      });

      Alert.alert(
        "Success",
        addedAmount !== 0
          ? `Details updated. ${formatMoney(addedAmount)} added — new total ${formatMoneyValue(newTotal)}.`
          : "Target details updated successfully"
      );

      setEditTargetModalVisible(false);
      setEditTargetCollectionAmount("");
      await refreshFromServer(editTargetData._id);
    } catch (error: any) {
      console.error("Error updating target:", error);
      Alert.alert("Error", error.message || "Failed to update target");
    } finally {
      setLoading(false);
    }
  };

  // ============ HISTORY (VIEW ONLY) ============
  // Opens the read-only record: collection log, every entry for the
  // customer, and the total. Nothing in here can be changed. It pulls a
  // fresh copy from the server first, so an admin's in-place correction
  // is shown straight away — on the same log line, not as a new one.
  const openHistory = (target: Target) => {
    const entries = targets.filter(
      (t) => t.phoneNumber === target.phoneNumber && t.emp_id === target.emp_id
    );
    const totalCollection = entries.reduce(
      (sum, item) => sum + Number(item.collectionAmount || 0),
      0
    );
    setCustomerHistoryEntries(entries);
    setCustomerTotalCollection(totalCollection);
    setHistoryTarget(target);
    setHistoryModalVisible(true);

    setHistoryRefreshing(true);
    refreshFromServer(target._id).finally(() => setHistoryRefreshing(false));
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-100";
      case "Rejected": return "bg-red-100";
      default: return "bg-yellow-100";
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "Approved": return "text-green-700";
      case "Rejected": return "text-red-700";
      default: return "text-yellow-700";
    }
  };

  const toggleSort = (field: "date" | "customerName" | "status") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const isFrozen = monthlyTarget?.isFrozen || false;
  const salaryAmount = monthlyTarget?.salaryAmount || 0;
  const incentive = monthlyTarget?.incentive || 0;
  const totalEarning = salaryAmount + incentive;

  if (fetching) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                // FIXED: same "GO_BACK action not handled" crash fixed
                // elsewhere in the app -- a bare router.back() throws
                // when this screen has no navigation history behind it
                // (opened fresh, via a refresh, or a direct link).
                // Falls back to the employee home instead.
                //
                // On web/desktop, canGoBack() can say true from
                // expo-router's own in-memory stack even when the
                // browser itself has nowhere real to go back to (a
                // fresh tab, a direct link, or a page reload reset the
                // browser's history but not that stack) -- so back()
                // can still throw there even after this check. The
                // try/catch is the actual fix: whatever canGoBack()
                // gets wrong, the user always lands on /employee
                // instead of seeing an error.
                try {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/employee");
                  }
                } catch (e) {
                  router.replace("/employee");
                }
              }}
              className="mt-1"
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={26}
                color="white"
              />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
              My Targets
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          style={{ paddingTop: 110 }}
          showsVerticalScrollIndicator={false}
        >
          <TargetSkeleton />
          <Footer />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============ RENDER ============
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* Header */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                // FIXED: same "GO_BACK action not handled" crash --
                // this is the header shown on both the Add Target form
                // and the History table view, so it crashed in History
                // too whenever there was no screen behind it to go back
                // to. Falls back to the employee home instead.
                //
                // See the loading-skeleton back button above for why
                // this is now also wrapped in try/catch: canGoBack()
                // can be wrong specifically on web/desktop, so the
                // try/catch -- not the check itself -- is what actually
                // guarantees no error reaches the user there.
                try {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace("/employee");
                  }
                } catch (e) {
                  router.replace("/employee");
                }
              }}
              className="mr-3"
            >
              <MaterialIcons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold">My Targets</Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => setShowHistory(!showHistory)} className="mr-4">
              <MaterialIcons name={showHistory ? "add" : "history"} size={28} color="white" />
            </TouchableOpacity>
            {showHistory && (
              <TouchableOpacity onPress={onRefresh}>
                <MaterialIcons name="refresh" size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        style={{ paddingTop: 110 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#024e32"]} />
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {showHistory ? (
            // ==================== TABLE VIEW ====================
            <View className="p-5 pb-10">
              {/* Month & Year Selector */}
              <View className="mb-4">
                <Text className="font-semibold text-gray-800 mb-2">Select Month & Year</Text>
                <View className={`${isDesktopOrLaptop ? 'flex-row' : 'flex-col'} gap-2`}>
                  <View className={`${isDesktopOrLaptop ? 'flex-1 mr-2' : ''} bg-white rounded-xl border border-gray-300 overflow-hidden`}>
                    <Picker
                      selectedValue={selectedMonth}
                      onValueChange={(value) => setSelectedMonth(value)}
                      style={{ height: 50, width: '100%' }}
                      itemStyle={{ fontSize: 16, color: 'black', height: 50 }}
                    >
                      {months.map((month, index) => (
                        <Picker.Item key={index} label={month} value={index} />
                      ))}
                    </Picker>
                  </View>

                  <View className={`${isDesktopOrLaptop ? 'flex-1 ml-2' : 'mt-2'} bg-white rounded-xl border border-gray-300 overflow-hidden`}>
                    <Picker
                      selectedValue={selectedYear}
                      onValueChange={(value) => setSelectedYear(value)}
                      style={{ height: 50, width: '100%' }}
                      itemStyle={{ fontSize: 16, color: 'black', height: 50 }}
                    >
                      {years.map((year) => (
                        <Picker.Item key={year} label={year.toString()} value={year} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Monthly Target Display */}
              {monthlyTarget ? (
                <View className="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
                  <View className="flex-row justify-between items-center">
                    <View>
                      <Text className="text-blue-800 font-semibold">📌 Monthly Target</Text>
                      <Text className="text-2xl font-bold text-blue-900 mt-1">{monthlyTarget.chitAmount}</Text>
                      <Text className="text-blue-600 text-xs mt-1">
                        Set by admin for {months[selectedMonth]} {selectedYear}
                      </Text>
                      <Text className="text-blue-600 text-xs mt-1">
                        Status: {isFrozen ? '❄️ Frozen' : '🔓 Unfrozen'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
                  <Text className="text-gray-500 text-sm">No monthly target set for {months[selectedMonth]} {selectedYear}</Text>
                </View>
              )}

              {/* Filter and Search */}
              <View className="mb-4">
                <View className="flex-row items-center bg-white rounded-xl px-4 py-2 border border-gray-200 mb-3">
                  <MaterialIcons name="search" size={20} color="#666" />
                  <TextInput
                    className="flex-1 ml-2 text-base"
                    placeholder="Search by customer, phone or chit amount..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#999"
                  />
                  {searchQuery !== "" && (
                    <TouchableOpacity onPress={() => setSearchQuery("")}>
                      <MaterialIcons name="close" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row flex-wrap items-center">
                  <Text className="text-gray-600 text-sm font-semibold mr-2">Filter:</Text>
                  {["All", "Pending", "Approved", "Rejected"].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setStatusFilter(status as any)}
                      className={`mr-2 mb-2 px-3 py-1 rounded-full ${
                        statusFilter === status ? "bg-[#024e32]" : "bg-gray-200"
                      }`}
                    >
                      <Text className={`text-xs font-semibold ${statusFilter === status ? "text-white" : "text-gray-700"}`}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="flex-row flex-wrap items-center mt-2">
                  <Text className="text-gray-600 text-sm font-semibold mr-2">Sort by:</Text>
                  <TouchableOpacity onPress={() => toggleSort("date")} className="mr-2 mb-2 px-3 py-1 rounded-full bg-white border border-gray-300">
                    <Text className="text-xs font-semibold text-gray-700">Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleSort("customerName")} className="mr-2 mb-2 px-3 py-1 rounded-full bg-white border border-gray-300">
                    <Text className="text-xs font-semibold text-gray-700">Name {sortBy === "customerName" && (sortOrder === "asc" ? "↑" : "↓")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleSort("status")} className="mr-2 mb-2 px-3 py-1 rounded-full bg-white border border-gray-300">
                    <Text className="text-xs font-semibold text-gray-700">Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Table */}
              <View className="mb-4">
                {filteredTargets.length === 0 ? (
                  <View className="bg-gray-50 rounded-2xl p-8 items-center">
                    <MaterialIcons name="track-changes" size={50} color="#d1d5db" />
                    <Text className="text-gray-500 text-lg mt-3">No customer targets found for {months[selectedMonth]} {selectedYear}</Text>
                  </View>
                ) : (
                  <View className="flex-row">
                    {/* Fixed left column */}
                    <View className="border border-gray-300 border-r-0 rounded-l-xl overflow-hidden">
                      <View
                        className="bg-[#024e32]"
                        style={{
                          width: COLS.customer,
                          height: TABLE_HEADER_HEIGHT,
                          paddingHorizontal: 6,
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          className="text-white font-semibold text-center text-sm"
                          numberOfLines={1}
                        >
                          Customer
                        </Text>
                      </View>

                      {filteredTargets.map((target, i) => (
                        <View
                          key={target._id || i}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          style={{
                            width: COLS.customer,
                            height: TABLE_ROW_HEIGHT,
                            paddingHorizontal: 6,
                            justifyContent: "center",
                            overflow: "hidden",
                          }}
                        >
                          <Text
                            className="text-gray-800 text-center text-sm font-medium"
                            numberOfLines={2}
                            ellipsizeMode="tail"
                          >
                            {target.customerName}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Scrollable columns */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
                      <View className="border border-gray-300 border-l-0 rounded-r-xl overflow-hidden">
                        {/* Header */}
                        <View
                          className="bg-[#024e32] flex-row"
                          style={{ height: TABLE_HEADER_HEIGHT }}
                        >
                          <TableHeaderCell label="Phone" width={COLS.phone} />
                          <TableHeaderCell label="Date" width={COLS.date} />
                          <TableHeaderCell label="Payment" width={COLS.payment} />
                          <TableHeaderCell label="Chit Amt" width={COLS.chit} />
                          <TableHeaderCell label="Collection" width={COLS.collection} />
                          <TableHeaderCell label="GB" width={COLS.gb} />
                          <TableHeaderCell label="Status" width={COLS.status} />
                          <TableHeaderCell label="Actions" width={COLS.actions} />
                        </View>

                        {/* Rows */}
                        {filteredTargets.map((target, i) => (
                          <View
                            key={target._id || i}
                            className={`flex-row ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                            style={{ height: TABLE_ROW_HEIGHT, alignItems: "center" }}
                          >
                            <TableCell width={COLS.phone}>
                              <Text className="text-gray-800 text-center text-sm" numberOfLines={1}>
                                {target.phoneNumber}
                              </Text>
                            </TableCell>

                            <TableCell width={COLS.date}>
                              <Text className="text-gray-800 text-center text-sm" numberOfLines={1}>
                                {formatDisplayDate(target.date)}
                              </Text>
                            </TableCell>

                            <TableCell width={COLS.payment}>
                              <Text className="text-gray-800 text-center text-sm" numberOfLines={1}>
                                {getDisplayPaymentMethod(target.paymentMethod)}
                              </Text>
                            </TableCell>

                            <TableCell width={COLS.chit}>
                              <Text
                                className="text-gray-800 text-center text-sm font-semibold"
                                numberOfLines={2}
                                ellipsizeMode="tail"
                              >
                                {target.chitAmount}
                              </Text>
                            </TableCell>

                            <TableCell width={COLS.collection}>
                              <Text
                                className="text-center text-sm font-bold text-blue-600"
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumFontScale={0.8}
                              >
                                {formatMoneyValue(Number(target.collectionAmount || 0))}
                              </Text>
                            </TableCell>

                            <TableCell width={COLS.gb}>
                              <Text
                                className="text-center text-sm font-bold text-purple-600"
                                numberOfLines={1}
                              >
                                {target.totalGB}
                              </Text>
                            </TableCell>

                            <TableCell width={COLS.status}>
                              <View className={`px-2 py-1 rounded-full ${getStatusBadgeColor(target.status)}`}>
                                <Text
                                  className={`text-xs font-semibold ${getStatusTextColor(target.status)}`}
                                  numberOfLines={1}
                                >
                                  {target.status}
                                </Text>
                              </View>
                            </TableCell>

                            <TableCell width={COLS.actions}>
                              <View className="flex-row items-center justify-center" style={{ gap: 8 }}>
                                {/* Edit Button — this is where a NEW collection
                                    amount is entered and other details are fixed.
                                    It never rewrites an existing log line. */}
                                <TouchableOpacity onPress={() => openEditTargetModal(target)}>
                                  <MaterialIcons
                                    name={target.status === "Pending" ? "edit" : "lock-outline"}
                                    size={20}
                                    color={target.status === "Pending" ? "#024e32" : "#9ca3af"}
                                  />
                                </TouchableOpacity>

                                {/* History Button — VIEW ONLY */}
                                <TouchableOpacity onPress={() => openHistory(target)}>
                                  <MaterialIcons name="history" size={20} color="#2563eb" />
                                </TouchableOpacity>
                              </View>
                            </TableCell>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Summary */}
              <View className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm mt-2">
                <Text className="font-bold text-gray-800 text-lg mb-3">
                  📊 {months[selectedMonth]} {selectedYear} Summary {isFrozen && "❄️ Frozen"}
                </Text>

                {/* Salary & Incentive */}
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600 font-semibold">Salary Amount</Text>
                  <Text className="text-gray-800 font-bold">{formatMoneyValue(salaryAmount)}</Text>
                </View>
                <View className="flex-row justify-between mb-3">
                  <Text className="text-gray-600 font-semibold">Incentive</Text>
                  <Text className="text-gray-800 font-bold">{formatMoneyValue(incentive)}</Text>
                </View>
                <View className="flex-row justify-between mb-3 pb-2 border-b border-gray-200">
                  <Text className="text-green-700 font-semibold">Total Earnings</Text>
                  <Text className="text-green-700 font-bold">{formatMoneyValue(totalEarning)}</Text>
                </View>

                <View className="mb-2">
                  <Text className="text-gray-500 text-xs">Total Enroll</Text>
                  <TextInput
                    value={summaryEnroll}
                    onChangeText={setSummaryEnroll}
                    keyboardType="decimal-pad"
                    editable={!isFrozen}
                    placeholder={isFrozen ? "Frozen – cannot edit" : "Enter total enrollments (e.g. 111.5)"}
                    className={`bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1 ${isFrozen ? 'opacity-60' : ''}`}
                  />
                </View>

                <View className="mb-2">
                  <Text className="text-gray-500 text-xs">Total GB</Text>
                  <TextInput
                    value={summaryGB}
                    onChangeText={setSummaryGB}
                    keyboardType="decimal-pad"
                    editable={!isFrozen}
                    placeholder={isFrozen ? "Frozen – cannot edit" : "Enter total GB (e.g. 100.10)"}
                    className={`bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1 ${isFrozen ? 'opacity-60' : ''}`}
                  />
                </View>

                <View className="mb-3">
                  <Text className="text-gray-500 text-xs">Backup</Text>
                  <TextInput
                    value={summaryBackup}
                    onChangeText={setSummaryBackup}
                    editable={!isFrozen}
                    placeholder={isFrozen ? "Frozen – cannot edit" : "Enter backup details"}
                    multiline
                    numberOfLines={2}
                    className={`bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mt-1 ${isFrozen ? 'opacity-60' : ''}`}
                  />
                </View>

                <TouchableOpacity
                  onPress={saveSummary}
                  disabled={isFrozen}
                  className={`py-2 rounded-lg ${isFrozen ? 'bg-gray-400' : 'bg-[#024e32]'}`}
                >
                  <Text className="text-white text-center font-semibold">
                    {isFrozen ? 'Frozen – Cannot Save' : 'Save Summary'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ==================== FORM ====================
            <View className="p-5">
              <Text className="text-2xl font-bold text-gray-800 mb-4">Add Target</Text>

              <Text className="font-semibold text-gray-800 mb-2">Date *</Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
                activeOpacity={0.7}
              >
                <Text className="text-gray-800">{formatDate(date)}</Text>
                <MaterialIcons name="calendar-today" size={24} color="#024e32" />
              </TouchableOpacity>

              <Modal
                transparent
                animationType="fade"
                statusBarTranslucent
                visible={showDatePicker}
                onRequestClose={() => setShowDatePicker(false)}
              >
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  activeOpacity={1}
                  onPress={() => setShowDatePicker(false)}
                >
                  <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                    <SimpleDatePicker
                      value={date}
                      onChange={(d) => setDate(d)}
                      onClose={() => setShowDatePicker(false)}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>

              <Text className="font-semibold text-gray-800 mb-2">Customer Name *</Text>
              <TextInput value={customerName} onChangeText={setCustomerName} placeholder="Enter customer name" className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4" />

              <Text className="font-semibold text-gray-800 mb-2">Phone Number *</Text>
              <TextInput value={phoneNumber} onChangeText={setPhoneNumber} placeholder="Enter 10-digit phone number" keyboardType="phone-pad" maxLength={10} className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4" />

              <Text className="font-semibold text-gray-800 mb-2">Payment Method *</Text>
              <View className="flex-row flex-wrap mb-4">
                {paymentMethods.map((method) => (
                  <TouchableOpacity key={method} onPress={() => setPaymentMethod(method)} className={`mr-2 mb-2 px-4 py-2 rounded-full ${paymentMethod === method ? "bg-[#024e32]" : "bg-gray-200"}`}>
                    <Text className={paymentMethod === method ? "text-white" : "text-gray-700"}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="font-semibold text-gray-800 mb-2">Chit Amount *</Text>
              <TextInput value={chitAmount} onChangeText={setChitAmount} placeholder="e.g., 2 Lakhs" className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4" />

              <Text className="font-semibold text-gray-800 mb-2">Collection Amount *</Text>
              <TextInput value={collectionAmount} onChangeText={setCollectionAmount} placeholder="Enter collection amount" keyboardType="numeric" className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4" />

              <Text className="font-semibold text-gray-800 mb-2">Total GB *</Text>
              <TextInput value={totalGB} onChangeText={setTotalGB} placeholder="Enter total GB" keyboardType="numeric" className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6" />

              <TouchableOpacity onPress={handleSubmit} disabled={loading} className="bg-[#024e32] py-4 rounded-xl">
                <Text className="text-white text-center font-bold text-base">
                  {loading ? "Submitting..." : "Submit Target"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CONSTANT FOOTER */}
          <Footer />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* =========================================================
          History Modal — READ ONLY
          Collection log, all entries and the total are displayed only.
          There is no edit control anywhere inside this modal. When an
          admin corrects a line, that SAME line is rewritten on the
          server — so it appears here with the new amount and a
          recalculated running total, never as an extra entry.
      ========================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[85%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold" numberOfLines={1} style={{ flex: 1 }}>
                History &amp; Total Collection
              </Text>
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={reloadHistoryTarget}
                  disabled={historyRefreshing}
                  className="mr-3"
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  {historyRefreshing ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <MaterialIcons name="refresh" size={22} color="white" />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="p-5" contentContainerStyle={{ paddingBottom: 20 }}>
              {historyTarget ? (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm">Customer</Text>
                    <Text className="text-gray-800 font-semibold text-base">{historyTarget.customerName}</Text>
                    <Text className="text-gray-500 text-sm mt-1">Phone: {historyTarget.phoneNumber}</Text>
                  </View>

                  {/* Read-only banner for the log */}
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="font-bold text-gray-700">Collection Log:</Text>
                    <View className="flex-row items-center px-2 py-1 rounded-full bg-gray-100">
                      <MaterialIcons name="lock-outline" size={13} color="#6b7280" />
                      <Text className="text-gray-500 text-xs font-semibold ml-1">View only</Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 text-xs mb-3">
                    This record cannot be changed here. If the admin corrects an
                    entry, that same entry is updated in place — the amount and
                    the totals change, and no extra line is added.
                  </Text>

                  {paymentLog.length > 0 ? (
                    paymentLog.map((entry, index) => (
                      <View
                        key={entry.stamp || index}
                        className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <View className="flex-row items-center mb-2">
                          <MaterialIcons name="event" size={16} color="#6b7280" />
                          <Text className="text-gray-600 text-sm ml-1 font-medium">
                            {formatLogDate(entry.editedAt)}
                          </Text>
                        </View>

                        {entry.amount !== null && entry.amount !== 0 ? (
                          <>
                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="text-gray-500 text-sm">
                                {entry.amount > 0 ? "Amount added" : "Amount reduced"}
                              </Text>
                              <Text
                                className={`text-lg font-bold ${
                                  entry.amount > 0 ? "text-green-700" : "text-red-600"
                                }`}
                              >
                                {entry.amount > 0 ? "+" : "−"}
                                {formatMoney(entry.amount)}
                              </Text>
                            </View>

                            <View className="flex-row justify-between items-center mb-1">
                              <Text className="text-gray-500 text-sm">Payment type</Text>
                              <View className="px-3 py-1 rounded-full bg-blue-100">
                                <Text className="text-blue-700 text-xs font-semibold">
                                  {getDisplayPaymentMethod(entry.paymentMethod)}
                                </Text>
                              </View>
                            </View>

                            {entry.newTotal !== null && (
                              <View className="flex-row justify-between items-center">
                                <Text className="text-gray-500 text-sm">Total after this</Text>
                                <Text className="text-gray-800 text-sm font-semibold">
                                  {formatMoneyValue(entry.newTotal)}
                                </Text>
                              </View>
                            )}
                          </>
                        ) : entry.amount === 0 ? (
                          <View className="flex-row justify-between items-center">
                            <Text className="text-gray-500 text-sm">No change in amount</Text>
                            <Text className="text-gray-800 text-sm font-semibold">
                              {entry.newTotal !== null ? formatMoneyValue(entry.newTotal) : "-"}
                            </Text>
                          </View>
                        ) : (
                          <Text className="text-gray-500 text-sm">
                            Details updated
                            {entry.otherFields.length > 0
                              ? ` — ${entry.otherFields.join(", ")}`
                              : ""}
                          </Text>
                        )}

                        {entry.amount !== null &&
                          entry.amount !== 0 &&
                          entry.otherFields.length > 0 && (
                            <Text className="text-gray-400 text-xs mt-2">
                              Also updated: {entry.otherFields.join(", ")}
                            </Text>
                          )}

                        {/* Who made the change, when the backend records it */}
                        {entry.editedBy ? (
                          <Text className="text-gray-400 text-xs mt-2">
                            Updated by: {entry.editedBy}
                          </Text>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <View className="items-center py-6">
                      <MaterialIcons name="info-outline" size={40} color="#ccc" />
                      <Text className="text-gray-400 mt-2">No collection entries recorded yet.</Text>
                    </View>
                  )}

                  {/* Row total — the authoritative saved figure for THIS entry */}
                  <View className="mt-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-blue-900 font-semibold text-sm">
                        Total collected on this entry
                      </Text>
                      <Text className="text-blue-900 font-bold text-base">
                        {formatMoneyValue(Number(historyTarget.collectionAmount || 0))}
                      </Text>
                    </View>
                  </View>

                  <View className="mt-4 pt-3 border-t border-gray-200">
                    <Text className="font-bold text-gray-700 mb-2">All Entries for this Customer:</Text>
                    {customerHistoryEntries.length > 0 ? (
                      customerHistoryEntries.map((entry, idx) => (
                        <View key={entry._id || idx} className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                          <View className="flex-row justify-between">
                            <Text className="text-gray-600 text-sm">Date: {formatDisplayDate(entry.date)}</Text>
                            <Text className="text-gray-600 text-sm">GB: {entry.totalGB}</Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-gray-600 text-sm">Chit: {entry.chitAmount}</Text>
                            <Text className="text-gray-800 font-bold text-sm">
                              {formatMoneyValue(Number(entry.collectionAmount || 0))}
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-gray-500 text-xs">Status: {entry.status}</Text>
                            <Text className="text-gray-500 text-xs">
                              Payment: {getDisplayPaymentMethod(entry.paymentMethod)}
                            </Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text className="text-gray-400">No other entries.</Text>
                    )}
                  </View>

                  <View className="mt-4 pt-3 border-t-2 border-green-200 bg-green-50 rounded-xl p-4">
                    <Text className="text-gray-700 font-bold text-base">💰 Total Collection for this Customer:</Text>
                    <Text className="text-3xl font-bold text-green-700 mt-1">
                      {formatMoneyValue(customerTotalCollection)}
                    </Text>
                    <Text className="text-green-800/70 text-xs mt-1">
                      Read-only total, recalculated from the entries above every
                      time this record is refreshed.
                    </Text>
                  </View>
                </>
              ) : (
                <Text>No target selected</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =========================================================
          Edit Target Details Modal
          Opened by the pencil icon in the Actions column. This is how a
          NEW collection amount is entered (the field opens blank and is
          ADDED to the existing total) and how other details are fixed.
          It never rewrites an existing collection-log line — only an
          admin can correct one, and that correction edits the same line.
      ========================================================= */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editTargetModalVisible}
        onRequestClose={() => setEditTargetModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[90%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Edit Target Details</Text>
              <TouchableOpacity onPress={() => setEditTargetModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-5" showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 40 }}>
              {editTargetData && (
                <>
                  {/* Status banner - editing stays open for Approved rows too */}
                  <View className="flex-row items-center mb-4">
                    <Text className="text-gray-500 text-sm mr-2">Status:</Text>
                    <View
                      className={`px-3 py-1 rounded-full ${getStatusBadgeColor(
                        editTargetData.status
                      )}`}
                    >
                      <Text
                        className={`text-xs font-semibold ${getStatusTextColor(
                          editTargetData.status
                        )}`}
                      >
                        {editTargetData.status}
                      </Text>
                    </View>
                  </View>

                  {/* Date */}
                  <Text className="font-semibold text-gray-800 mb-2">Date *</Text>
                  <TouchableOpacity
                    onPress={() => setShowEditDatePicker(true)}
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-3 flex-row justify-between items-center"
                  >
                    <Text className="text-gray-800">{formatDate(editTargetDate)}</Text>
                    <MaterialIcons name="calendar-today" size={24} color="#024e32" />
                  </TouchableOpacity>

                  <Modal
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    visible={showEditDatePicker}
                    onRequestClose={() => setShowEditDatePicker(false)}
                  >
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                      activeOpacity={1}
                      onPress={() => setShowEditDatePicker(false)}
                    >
                      <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                        <SimpleDatePicker
                          value={editTargetDate}
                          onChange={(d) => setEditTargetDate(d)}
                          onClose={() => setShowEditDatePicker(false)}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>

                  {/* Customer Name */}
                  <Text className="font-semibold text-gray-800 mb-2">Customer Name *</Text>
                  <TextInput
                    value={editTargetCustomerName}
                    onChangeText={setEditTargetCustomerName}
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  />

                  {/* Phone Number */}
                  <Text className="font-semibold text-gray-800 mb-2">Phone Number *</Text>
                  <TextInput
                    value={editTargetPhoneNumber}
                    onChangeText={setEditTargetPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={10}
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  />

                  {/* Payment Method */}
                  <Text className="font-semibold text-gray-800 mb-2">Payment Method *</Text>
                  <View className="flex-row flex-wrap mb-3">
                    {paymentMethods.map((method) => (
                      <TouchableOpacity
                        key={method}
                        onPress={() => setEditTargetPaymentMethod(method)}
                        className={`mr-2 mb-2 px-4 py-2 rounded-full ${
                          editTargetPaymentMethod === method ? "bg-[#024e32]" : "bg-gray-200"
                        }`}
                      >
                        <Text className={editTargetPaymentMethod === method ? "text-white" : "text-gray-700"}>
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Chit Amount */}
                  <Text className="font-semibold text-gray-800 mb-2">Chit Amount *</Text>
                  <TextInput
                    value={editTargetChitAmount}
                    onChangeText={setEditTargetChitAmount}
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-3"
                  />

                  {/* Collection Amount - opens EMPTY, adds on top of the total */}
                  <Text className="font-semibold text-gray-800 mb-2">New Collection Amount</Text>
                  <View className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 mb-2">
                    <Text className="text-blue-800 text-sm">
                      Already collected: {formatMoneyValue(previousCollectionTotal)}
                    </Text>
                  </View>
                  <TextInput
                    value={editTargetCollectionAmount}
                    onChangeText={setEditTargetCollectionAmount}
                    keyboardType="numeric"
                    placeholder="Enter new amount collected"
                    placeholderTextColor="#999"
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-2"
                  />
                  <Text className="text-gray-500 text-xs mb-3">
                    Leave blank if there is no new collection. Anything entered here is
                    added to the total and saved as a new line in the collection log.
                    Past entries can't be changed here — ask the admin to correct one.
                    New total:{" "}
                    <Text className="font-semibold text-gray-700">
                      {formatMoneyValue(newCollectionTotalPreview)}
                    </Text>
                  </Text>

                  {/* Total GB */}
                  <Text className="font-semibold text-gray-800 mb-2">Total GB *</Text>
                  <TextInput
                    value={editTargetTotalGB}
                    onChangeText={setEditTargetTotalGB}
                    keyboardType="numeric"
                    className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
                  />

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={saveEditedTarget}
                    disabled={loading}
                    className={`py-3 rounded-xl mt-2 ${loading ? "bg-gray-400" : "bg-[#024e32]"}`}
                  >
                    <Text className="text-white text-center font-bold">
                      {loading ? "Saving..." : "Save Changes"}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}