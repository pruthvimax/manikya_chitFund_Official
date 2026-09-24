import { MaterialIcons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
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
  Animated,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../../config";

const { width: screenWidth } = Dimensions.get("window");
const isDesktopOrLaptop = screenWidth >= 768;

/* =========================================================
   NATIVE MODAL HELPERS  (iOS + Android fix)
========================================================= */
const MODAL_SWAP_DELAY = Platform.OS === "ios" ? 420 : 180;
const ALERT_DELAY = Platform.OS === "ios" ? 320 : 120;

const NATIVE_MODAL_PROPS: any = {
  transparent: true,
  statusBarTranslucent: true,
  hardwareAccelerated: true,
  ...(Platform.OS === "ios" ? { presentationStyle: "overFullScreen" } : {}),
};

const ICON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

/* =========================================================
   PREMIUM SKELETON LOADER
========================================================= */
const SkeletonLoader = ({ isDesktopOrLaptop }: { isDesktopOrLaptop: boolean }) => {
  const skeletonOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  const SkeletonCard = () => (
    <Animated.View
      style={{ opacity: skeletonOpacity }}
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <View className="h-5 bg-gray-200 rounded w-32 mb-2" />
          <View className="h-4 bg-gray-200 rounded w-24" />
        </View>
        <View className="w-16 h-6 bg-gray-200 rounded-full" />
      </View>
      <View className="flex-row justify-between mb-2">
        <View className="h-4 bg-gray-200 rounded w-20" />
        <View className="h-4 bg-gray-200 rounded w-16" />
      </View>
      <View className="flex-row justify-between">
        <View className="h-3 bg-gray-200 rounded w-24" />
        <View className="h-3 bg-gray-200 rounded w-20" />
      </View>
      <View className="h-3 bg-gray-200 rounded w-32 mt-2" />
    </Animated.View>
  );

  if (isDesktopOrLaptop) {
    return (
      <View className="px-5">
        <View className="flex-row flex-wrap gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} style={{ width: "48%" }}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="px-5">
      {[1, 2, 3, 4].map((item) => (
        <SkeletonCard key={item} />
      ))}
    </View>
  );
};

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
   CUSTOM CALENDAR  (replaces DateTimePicker entirely)

   - Pure JS / RN primitives, no native popover issues on iOS.
   - Tap a day to pick, chevrons to change month, Today to jump.
========================================================= */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function SimpleCalendar({
  value,
  onChange,
  onClose,
}: {
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  const safeValue = value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
  const [viewMonth, setViewMonth] = useState(safeValue.getMonth());
  const [viewYear, setViewYear] = useState(safeValue.getFullYear());

  useEffect(() => {
    // Re-sync the visible month if the parent value changes while open
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

  const CELL = 40;

  return (
    <View
      className="bg-white rounded-2xl shadow-2xl"
      style={{ width: CELL * 7 + 24, padding: 12 }}
    >
      {/* Month / Year header */}
      <View className="flex-row justify-between items-center mb-2">
        <TouchableOpacity
          onPress={prevMonth}
          hitSlop={ICON_HIT_SLOP}
          className="p-2 rounded-full"
          activeOpacity={0.6}
        >
          <MaterialIcons name="chevron-left" size={26} color="#024e32" />
        </TouchableOpacity>

        <Text className="text-gray-800 font-bold text-base">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </Text>

        <TouchableOpacity
          onPress={nextMonth}
          hitSlop={ICON_HIT_SLOP}
          className="p-2 rounded-full"
          activeOpacity={0.6}
        >
          <MaterialIcons name="chevron-right" size={26} color="#024e32" />
        </TouchableOpacity>
      </View>

      {/* Weekday row */}
      <View className="flex-row mb-1">
        {DAY_NAMES.map((d) => (
          <View key={d} style={{ width: CELL, alignItems: "center" }}>
            <Text className="text-gray-500 text-xs font-semibold">{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
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
              style={{
                width: CELL,
                height: CELL,
                alignItems: "center",
                justifyContent: "center",
              }}
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
                    fontSize: 14,
                  }}
                >
                  {d}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Footer buttons */}
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
          <Text className="text-white text-center font-semibold">Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* =========================================================
   MONTH + YEAR PICKER  (replaces the two native <Picker> wheels)

   Same reasoning as SimpleCalendar above: a native wheel picker
   for month/year had a fixed, hard-coded year range (currentYear-5
   to currentYear+1) and looked/behaved differently across iOS and
   Android. This is one shared, custom-drawn picker -- a year
   stepper with no artificial upper/lower bound, plus a 3-column
   month grid -- identical on both platforms.
========================================================= */

function MonthYearPicker({
  month,
  year,
  onChange,
  onClose,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  onClose: () => void;
}) {
  const [viewYear, setViewYear] = useState(year);

  useEffect(() => {
    setViewYear(year);
  }, [year]);

  const CARD_WIDTH = 320;

  return (
    <View
      className="bg-white rounded-2xl shadow-2xl"
      style={{ width: CARD_WIDTH, padding: 16 }}
    >
      {/* Year stepper -- no fixed range, steps forever either way */}
      <View className="flex-row justify-between items-center mb-4">
        <TouchableOpacity
          onPress={() => setViewYear((y) => y - 1)}
          hitSlop={ICON_HIT_SLOP}
          className="p-2 rounded-full bg-gray-50"
          activeOpacity={0.6}
        >
          <MaterialIcons name="chevron-left" size={24} color="#024e32" />
        </TouchableOpacity>

        <Text className="text-gray-800 font-bold text-xl">{viewYear}</Text>

        <TouchableOpacity
          onPress={() => setViewYear((y) => y + 1)}
          hitSlop={ICON_HIT_SLOP}
          className="p-2 rounded-full bg-gray-50"
          activeOpacity={0.6}
        >
          <MaterialIcons name="chevron-right" size={24} color="#024e32" />
        </TouchableOpacity>
      </View>

      {/* Month grid */}
      <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
        {MONTH_NAMES.map((m, idx) => {
          const selected = idx === month && viewYear === year;
          return (
            <TouchableOpacity
              key={m}
              onPress={() => {
                onChange(idx, viewYear);
                onClose();
              }}
              activeOpacity={0.7}
              style={{ width: "33.333%", padding: 4 }}
            >
              <View
                style={{
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: selected ? "#024e32" : "#f3f4f6",
                }}
              >
                <Text
                  style={{
                    color: selected ? "#ffffff" : "#1f2937",
                    fontWeight: selected ? "700" : "500",
                    fontSize: 13,
                  }}
                >
                  {m.slice(0, 3)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View className="flex-row mt-4" style={{ gap: 10 }}>
        <TouchableOpacity
          onPress={() => {
            const t = new Date();
            onChange(t.getMonth(), t.getFullYear());
            onClose();
          }}
          className="flex-1 bg-gray-100 py-2.5 rounded-xl"
          activeOpacity={0.7}
        >
          <Text className="text-gray-700 text-center font-semibold">This Month</Text>
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

/* =========================================================
   PAYMENT LOG BUILDER
========================================================= */

interface PaymentLogEntry {
  stamp: string;
  editedAt: string | null;
  amount: number | null;
  newTotal: number | null;
  paymentMethod: string;
  otherFields: string[];
  editId?: string;
  collectionId?: string;
  oldAmount?: number;
  oldPaymentMethod?: string;
}

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
  if (history.length === 0) return [];

  const groups = new Map<string, { editedAt: string | null; items: any[] }>();

  history.forEach((item: any, index: number) => {
    const stamp = item?.editedAt
      ? new Date(item.editedAt).toISOString().slice(0, 19)
      : `unknown-${index}`;

    if (!groups.has(stamp)) {
      groups.set(stamp, { editedAt: item?.editedAt ?? null, items: [] });
    }
    groups.get(stamp)!.items.push(item);
  });

  const log: PaymentLogEntry[] = [];

  groups.forEach((group, stamp) => {
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
      editId: group.items[0]?._id || `edit-${stamp}`,
      collectionId: collection?._id,
      oldAmount: collection ? toNumber(collection.oldValue) : undefined,
      oldPaymentMethod: payment?.oldValue ? String(payment.oldValue) : undefined,
    });
  });

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

const formatMoney = (value: number): string =>
  `₹${Math.abs(value).toLocaleString("en-IN")}`;

const formatMoneyValue = (value: number): string => {
  const num = Number(value) || 0;
  return `${num < 0 ? "−" : ""}₹${Math.abs(num).toLocaleString("en-IN")}`;
};

const getDisplayPaymentMethod = (method?: string) => {
  if (!method) return "-";
  if (method === "Cheque") return "AC";
  return method;
};

/* =========================================================
   BACKEND WRITE HELPERS
========================================================= */

const sanitizeEditHistory = (history: any): any[] => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row: any = {
        field: String(item.field ?? ""),
        oldValue:
          item.oldValue === undefined || item.oldValue === null
            ? ""
            : String(item.oldValue),
        newValue:
          item.newValue === undefined || item.newValue === null
            ? ""
            : String(item.newValue),
        editedAt: item.editedAt
          ? new Date(item.editedAt).toISOString()
          : new Date().toISOString(),
      };
      if (item.editedBy) row.editedBy = String(item.editedBy);
      return row;
    });
};

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

interface Employee {
  _id: string;
  emp_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  status: string;
}

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
  salaryAmount: number;
  incentive: number;
  status: "Pending" | "Approved" | "Rejected";
  isEdited: boolean;
  editHistory: any[];
  approvedBy: string;
  approvedAt: string;
  isFrozen: boolean;
  createdAt: string;
}

/* =========================================================
   EDIT A COLLECTION LOG ENTRY  (IN PLACE)
========================================================= */

const recalcEditHistoryForLogEdit = (
  target: Target,
  editedStamp: string,
  newAmount: number,
  newPaymentMethod: string
): { editHistory: any[]; collectionAmount: number } => {
  const history = Array.isArray(target.editHistory)
    ? target.editHistory.map((item) => ({ ...item }))
    : [];

  const stampOf = (item: any, idx: number) =>
    item?.editedAt ? new Date(item.editedAt).toISOString().slice(0, 19) : `unknown-${idx}`;

  const groupMap = new Map<string, { editedAt: string | null; indices: number[] }>();
  history.forEach((item, idx) => {
    const stamp = stampOf(item, idx);
    if (!groupMap.has(stamp)) groupMap.set(stamp, { editedAt: item?.editedAt ?? null, indices: [] });
    groupMap.get(stamp)!.indices.push(idx);
  });

  const orderedStamps = Array.from(groupMap.keys()).sort((a, b) => {
    const ta = groupMap.get(a)!.editedAt ? new Date(groupMap.get(a)!.editedAt as string).getTime() : 0;
    const tb = groupMap.get(b)!.editedAt ? new Date(groupMap.get(b)!.editedAt as string).getTime() : 0;
    return ta - tb;
  });

  let carryOldValue: number | null = null;
  let pastEditPoint = false;

  orderedStamps.forEach((stamp) => {
    const group = groupMap.get(stamp)!;
    const collectionIdx = group.indices.find((idx) =>
      String(history[idx]?.field ?? "").toLowerCase().includes("collection")
    );
    const paymentIdx = group.indices.find((idx) =>
      String(history[idx]?.field ?? "").toLowerCase().includes("payment")
    );

    if (stamp === editedStamp) {
      if (collectionIdx !== undefined) {
        const oldVal = toNumber(history[collectionIdx].oldValue);
        const newVal = oldVal + newAmount;
        history[collectionIdx] = {
          ...history[collectionIdx],
          oldValue: oldVal,
          newValue: newVal,
        };
        carryOldValue = newVal;
      }
      if (paymentIdx !== undefined) {
        history[paymentIdx] = { ...history[paymentIdx], newValue: newPaymentMethod };
      } else if (
        collectionIdx !== undefined &&
        newPaymentMethod !== (target.paymentMethod ?? "")
      ) {
        history.push({
          field: "paymentMethod",
          oldValue: target.paymentMethod ?? "",
          newValue: newPaymentMethod,
          editedAt: group.editedAt,
        });
      }
      pastEditPoint = true;
    } else if (pastEditPoint && collectionIdx !== undefined && carryOldValue !== null) {
      const originalOld = toNumber(history[collectionIdx].oldValue);
      const originalNew = toNumber(history[collectionIdx].newValue);
      const amountAdded = originalNew - originalOld;
      const newOld = carryOldValue;
      const newNew = newOld + amountAdded;
      history[collectionIdx] = { ...history[collectionIdx], oldValue: newOld, newValue: newNew };
      carryOldValue = newNew;
    }
  });

  const finalCollectionAmount =
    carryOldValue !== null ? carryOldValue : Number(target.collectionAmount || 0);

  return { editHistory: history, collectionAmount: finalCollectionAmount };
};

export default function AdminTargetsView() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;

  const modalMaxHeight = Math.round(height * 0.85);
  const modalCardWidth = Math.min(width - 32, 560);

  const swapTimerRef = useRef<any>(null);
  const alertTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  // State hooks
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allTargets, setAllTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [sortBy, setSortBy] = useState<"date" | "customerName" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<Target | null>(null);
  const [customerHistoryEntries, setCustomerHistoryEntries] = useState<Target[]>([]);
  const [customerTotalCollection, setCustomerTotalCollection] = useState(0);

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showFilterPeriodPicker, setShowFilterPeriodPicker] = useState(false);

  const [showSetTargetForm, setShowSetTargetForm] = useState(false);

  const [setTargetAmount, setSetTargetAmount] = useState("");
  const [setTargetMonth, setSetTargetMonth] = useState<number>(new Date().getMonth());
  const [setTargetYear, setSetTargetYear] = useState<number>(new Date().getFullYear());
  const [showSetTargetPeriodPicker, setShowSetTargetPeriodPicker] = useState(false);

  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPhoneNumber, setEditPhoneNumber] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("Cash");
  const [editChitAmount, setEditChitAmount] = useState("");
  const [editCollectionAmount, setEditCollectionAmount] = useState("");
  const [editTotalGB, setEditTotalGB] = useState("");
  const [editDate, setEditDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [salaryInput, setSalaryInput] = useState("");
  const [incentiveInput, setIncentiveInput] = useState("");
  const [totalEnrollInput, setTotalEnrollInput] = useState("");
  const [totalGBInput, setTotalGBInput] = useState("");
  const [backupInput, setBackupInput] = useState("");

  const [employeeDropdownVisible, setEmployeeDropdownVisible] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Edit Payment Log States
  const [editPaymentLogModal, setEditPaymentLogModal] = useState(false);
  const [editingPaymentLog, setEditingPaymentLog] = useState<PaymentLogEntry | null>(null);
  const [editLogAmount, setEditLogAmount] = useState("");
  const [editLogPaymentMethod, setEditLogPaymentMethod] = useState("Cash");
  const [editLogTarget, setEditLogTarget] = useState<Target | null>(null);

  const [savingLog, setSavingLog] = useState(false);

  // Memoized values
  const months = useMemo(() => MONTH_NAMES, []);

  const paymentMethods = useMemo(() => ["Cash", "UPI", "Cheque", "Online"], []);

  const monthlyTarget = useMemo(() => {
    return allTargets.find(t =>
      t.customerName.includes("Target") &&
      new Date(t.date).getMonth() === selectedMonth &&
      new Date(t.date).getFullYear() === selectedYear
    ) || null;
  }, [allTargets, selectedMonth, selectedYear]);

  const customerTargets = useMemo(() => {
    let customers = allTargets.filter(t =>
      !t.customerName.includes("Target") &&
      new Date(t.date).getMonth() === selectedMonth &&
      new Date(t.date).getFullYear() === selectedYear
    );

    if (filterStatus !== "All") {
      customers = customers.filter(t => t.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      customers = customers.filter(t =>
        t.customerName.toLowerCase().includes(query) ||
        t.phoneNumber.includes(query) ||
        t.chitAmount.toLowerCase().includes(query)
      );
    }

    customers.sort((a, b) => {
      let valA: any, valB: any;
      switch (sortBy) {
        case "date":
          valA = new Date(a.date);
          valB = new Date(b.date);
          break;
        case "customerName":
          valA = a.customerName.toLowerCase();
          valB = b.customerName.toLowerCase();
          break;
        case "status":
          valA = a.status;
          valB = b.status;
          break;
        default:
          valA = a.customerName;
          valB = b.customerName;
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return customers;
  }, [allTargets, selectedMonth, selectedYear, filterStatus, searchQuery, sortBy, sortOrder]);

  const paymentLog = useMemo(() => buildPaymentLog(historyTarget), [historyTarget]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.emp_id.toLowerCase().includes(employeeSearch.toLowerCase())
    );
  }, [employees, employeeSearch]);

  const editLogPreviewTotal = useMemo(() => {
    if (!editingPaymentLog) return null;
    const parsed = parseFloat(editLogAmount);
    if (Number.isNaN(parsed)) return null;
    const base = editingPaymentLog.oldAmount ?? 0;
    return base + parsed;
  }, [editingPaymentLog, editLogAmount]);

  const editLogFinalTotalPreview = useMemo(() => {
    if (!editingPaymentLog || !editLogTarget) return null;
    const parsed = parseFloat(editLogAmount);
    if (Number.isNaN(parsed)) return null;
    const { collectionAmount } = recalcEditHistoryForLogEdit(
      editLogTarget,
      editingPaymentLog.stamp,
      parsed,
      editLogPaymentMethod
    );
    return collectionAmount;
  }, [editingPaymentLog, editLogTarget, editLogAmount, editLogPaymentMethod]);

  const previousCollectionTotal = Number(selectedTarget?.collectionAmount || 0);

  const newCollectionTotalPreview = useMemo(() => {
    const typed = editCollectionAmount.trim();
    if (typed === "") return previousCollectionTotal;
    const parsed = parseFloat(typed);
    if (Number.isNaN(parsed)) return previousCollectionTotal;
    return previousCollectionTotal + parsed;
  }, [editCollectionAmount, previousCollectionTotal]);

  const showAlertSafely = (title: string, message?: string) => {
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      Alert.alert(title, message);
    }, ALERT_DELAY);
  };

  // Effects
  useEffect(() => {
    if (monthlyTarget) {
      setSalaryInput(monthlyTarget.salaryAmount?.toString() || "");
      setIncentiveInput(monthlyTarget.incentive?.toString() || "");
      setTotalEnrollInput(monthlyTarget.totalEnroll?.toString() || "");
      setTotalGBInput(monthlyTarget.totalGB?.toString() || "");
      setBackupInput(monthlyTarget.backup || "");
    } else {
      setSalaryInput("");
      setIncentiveInput("");
      setTotalEnrollInput("");
      setTotalGBInput("");
      setBackupInput("");
    }
  }, [monthlyTarget]);

  // Fetch Functions
  const fetchEmployees = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/employee/`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setEmployees(data);
      if (data.length > 0) {
        setSelectedEmployee(data[0]);
        fetchTargetsForEmployee(data[0].emp_id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setLoading(false);
      Alert.alert("Error", "Failed to load employees");
    }
  };

  const fetchTargetsForEmployee = async (emp_id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/target/employee/${emp_id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAllTargets(data);
    } catch (error) {
      console.error("Error fetching targets:", error);
      Alert.alert("Error", "Failed to load targets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEmployees();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedEmployee) {
      fetchTargetsForEmployee(selectedEmployee.emp_id);
    } else {
      fetchEmployees();
    }
  };

  // Handler Functions
  const handleEmployeeSelect = (emp: Employee) => {
    setSelectedEmployee(emp);
    setLoading(true);
    fetchTargetsForEmployee(emp.emp_id);
    setShowSetTargetForm(false);
    setEmployeeDropdownVisible(false);
  };

  const handleSetTarget = async () => {
    if (!selectedEmployee) {
      Alert.alert("Error", "Please select an employee first");
      return;
    }
    if (!setTargetAmount) {
      Alert.alert("Validation", "Please enter target amount");
      return;
    }

    try {
      setLoading(true);
      const targetDate = new Date(setTargetYear, setTargetMonth, 1);

      const response = await fetch(`${BACKEND_URL}/target/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: selectedEmployee.emp_id,
          employeeName: selectedEmployee.name,
          date: targetDate,
          chitAmount: setTargetAmount,
          customerName: `${months[setTargetMonth]} ${setTargetYear} Target`,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", `Target of ${setTargetAmount} set for ${selectedEmployee.name} for ${months[setTargetMonth]} ${setTargetYear}`);
        setShowSetTargetForm(false);
        setSetTargetAmount("");
        fetchTargetsForEmployee(selectedEmployee.emp_id);
      } else {
        Alert.alert("Error", data.message || "Failed to set target");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to set target");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFreeze = async () => {
    if (!monthlyTarget) {
      Alert.alert("Error", "No monthly target found to freeze/unfreeze");
      return;
    }

    try {
      const newFreezeState = !monthlyTarget.isFrozen;
      const response = await fetch(`${BACKEND_URL}/target/${monthlyTarget._id}/freeze`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isFrozen: newFreezeState }),
      });

      if (!response.ok) throw new Error("Failed to toggle freeze");

      const data = await response.json();
      setAllTargets(prev =>
        prev.map(t =>
          t._id === data.target._id ? { ...t, isFrozen: data.target.isFrozen } : t
        )
      );
      Alert.alert("Success", `Target ${data.target.isFrozen ? 'frozen' : 'unfrozen'} successfully`);
      fetchTargetsForEmployee(selectedEmployee!.emp_id);
    } catch (error) {
      Alert.alert("Error", "Failed to toggle freeze");
    }
  };

  const handleUpdateSalarySection = async () => {
    if (!monthlyTarget) {
      Alert.alert("Error", "No monthly target found to update");
      return;
    }

    if (monthlyTarget.isFrozen) {
      Alert.alert("Frozen", "This monthly target is frozen. You cannot edit the summary.");
      return;
    }

    try {
      setLoading(true);

      const salaryRes = await fetch(`${BACKEND_URL}/target/${monthlyTarget._id}/salary-incentive`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          salaryAmount: parseFloat(salaryInput) || 0,
          incentive: parseFloat(incentiveInput) || 0,
        }),
      });

      if (!salaryRes.ok) {
        const errData = await salaryRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update salary/incentive");
      }

      const summaryRes = await fetch(`${BACKEND_URL}/target/${monthlyTarget._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalEnroll: parseFloat(totalEnrollInput) || 0,
          totalGB: parseFloat(totalGBInput) || 0,
          backup: backupInput || "",
        }),
      });

      if (!summaryRes.ok) {
        const errData = await summaryRes.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to update summary fields");
      }

      Alert.alert("Success", "Salary, incentive, and additional fields updated");
      await fetchTargetsForEmployee(selectedEmployee!.emp_id);
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert("Error", error.message || "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SERVER SYNC HELPERS
  ========================================================= */

  const fetchTargetsList = async (): Promise<Target[] | null> => {
    if (!selectedEmployee) return null;
    try {
      const response = await fetch(
        `${BACKEND_URL}/target/employee/${selectedEmployee.emp_id}`
      );
      if (!response.ok) return null;
      return (await response.json()) as Target[];
    } catch (err) {
      console.log("Fetch error:", err);
      return null;
    }
  };

  const applyServerData = (data: Target[], focusTargetId?: string) => {
    setAllTargets(data);

    if (!focusTargetId) return;
    const fresh = data.find((t) => t._id === focusTargetId);
    if (!fresh) return;

    setHistoryTarget((prev) => (prev && prev._id === fresh._id ? fresh : prev));
    const entries = data.filter(
      (t) => t.phoneNumber === fresh.phoneNumber && t.emp_id === fresh.emp_id
    );
    setCustomerHistoryEntries(entries);
    setCustomerTotalCollection(
      entries.reduce((sum, item) => sum + Number(item.collectionAmount || 0), 0)
    );
  };

  const refreshFromServer = async (focusTargetId?: string) => {
    const data = await fetchTargetsList();
    if (data) applyServerData(data, focusTargetId);
  };

  const handleUpdateDetails = async () => {
    if (!selectedTarget) return;

    const typedAmount = editCollectionAmount.trim();
    const addedAmount = typedAmount === "" ? 0 : parseFloat(typedAmount);

    if (typedAmount !== "" && Number.isNaN(addedAmount)) {
      Alert.alert("Validation", "Please enter a valid collection amount");
      return;
    }

    if (!editCustomerName.trim() || !editPhoneNumber.trim()) {
      Alert.alert("Validation", "Customer name and phone number are required");
      return;
    }

    const previousTotal = Number(selectedTarget.collectionAmount || 0);
    const newTotal = previousTotal + addedAmount;
    const targetId = selectedTarget._id;

    try {
      setLoading(true);

      await putTarget(targetId, {
        customerName: editCustomerName.trim(),
        phoneNumber: editPhoneNumber.trim(),
        paymentMethod: editPaymentMethod,
        chitAmount: editChitAmount,
        collectionAmount: newTotal,
        totalGB: parseInt(editTotalGB) || 0,
        date: editDate,
      });

      setModalVisible(false);
      setEditCollectionAmount("");

      showAlertSafely(
        "Success",
        addedAmount !== 0
          ? `Customer details updated. ${formatMoney(addedAmount)} added — new total ${formatMoneyValue(newTotal)}.`
          : "Customer details updated"
      );

      await refreshFromServer(targetId);
    } catch (error: any) {
      console.error("Error updating details:", error);
      Alert.alert("Error", error.message || "Failed to update details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setModalVisible(false);

    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => {
      Alert.alert(
        "Delete Target",
        "Are you sure you want to delete this target?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                const response = await fetch(`${BACKEND_URL}/target/${id}`, {
                  method: "DELETE",
                });

                if (!response.ok) throw new Error("Delete failed");

                showAlertSafely("Success", "Target deleted");
                fetchTargetsForEmployee(selectedEmployee!.emp_id);
              } catch (error) {
                showAlertSafely("Error", "Failed to delete");
              }
            },
          },
        ]
      );
    }, ALERT_DELAY);
  };

  const handleStatusUpdate = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const response = await fetch(`${BACKEND_URL}/target/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          approvedBy: "Admin"
        }),
      });

      if (!response.ok) throw new Error("Update failed");

      setModalVisible(false);
      showAlertSafely("Success", `Target ${status.toLowerCase()}`);
      fetchTargetsForEmployee(selectedEmployee!.emp_id);
    } catch (error) {
      Alert.alert("Error", "Failed to update status");
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-600";
      case "Rejected":
        return "bg-red-100 text-red-600";
      default:
        return "bg-yellow-100 text-yellow-600";
    }
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

  const formatDate = (date: Date) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // =========================================================
  // OPEN HISTORY
  // =========================================================
  const openHistory = (target: Target) => {
    const entries = allTargets.filter((t) => {
      return (
        t.phoneNumber === target.phoneNumber &&
        t.emp_id === target.emp_id
      );
    });

    const totalCollection = entries.reduce((sum, item) => {
      return sum + Number(item.collectionAmount || 0);
    }, 0);

    setCustomerHistoryEntries(entries);
    setCustomerTotalCollection(totalCollection);
    setHistoryTarget(target);

    setModalVisible(false);
    setEditPaymentLogModal(false);
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = setTimeout(() => setHistoryModalVisible(true), 0);

    refreshFromServer(target._id);
  };

  // =========================================================
  // PRINT FULL TABLE  (all customer targets currently shown for
  // the selected employee + month/year, respecting the active
  // filter/search/sort — same Web/iOS/Android pattern as the
  // customer-history print below.)
  // =========================================================
  const printAllTargets = async () => {
    if (customerTargets.length === 0) {
      Alert.alert("Nothing to print", "There are no customer targets for this period.");
      return;
    }

    const printedOn = new Date().toLocaleString("en-IN");
    const periodLabel = `${months[selectedMonth]} ${selectedYear}`;
    const employeeLabel = selectedEmployee
      ? `${selectedEmployee.name} (ID: ${selectedEmployee.emp_id})`
      : "-";

    const rowsHtml = customerTargets
      .map(
        (t) => `
          <tr>
            <td>${t.customerName || "-"}</td>
            <td>${t.phoneNumber || "-"}</td>
            <td>${new Date(t.date).toLocaleDateString()}</td>
            <td>${getDisplayPaymentMethod(t.paymentMethod)}</td>
            <td>${t.chitAmount || "-"}</td>
            <td>${formatMoneyValue(Number(t.collectionAmount || 0))}</td>
            <td>${t.totalGB ?? "-"}</td>
            <td class="status-${(t.status || "").toLowerCase()}">${t.status}</td>
          </tr>
        `
      )
      .join("");

    const totalCollection = customerTargets.reduce(
      (sum, t) => sum + Number(t.collectionAmount || 0),
      0
    );

    // FIX: "Print Table" only printed the customer table before - the
    // Salary & Incentive Details card underneath it had no print of its
    // own anymore. Instead of a second button, this same report now
    // appends that card (Total Enroll, Total GB, Backup, Salary,
    // Incentive + a Total Payout box) right after the collection total,
    // so one tap prints both. It only appears when a monthly target
    // exists for the selected period, same condition the on-screen card
    // itself uses.
    const salaryVal = parseFloat(salaryInput) || 0;
    const incentiveVal = parseFloat(incentiveInput) || 0;
    const totalPayout = salaryVal + incentiveVal;

    const salarySectionHtml = monthlyTarget
      ? `
        <div class="salary-section">
          <div class="section-title">💰 Salary &amp; Incentive Details — ${periodLabel}</div>
          <table class="salary-table">
            <tbody>
              <tr><th>Total Enroll</th><td>${totalEnrollInput || "0"}</td></tr>
              <tr><th>Total GB</th><td>${totalGBInput || "0"}</td></tr>
              <tr><th>Backup</th><td>${backupInput || "-"}</td></tr>
              <tr><th>Salary Amount</th><td>${formatMoneyValue(salaryVal)}</td></tr>
              <tr><th>Incentive</th><td>${formatMoneyValue(incentiveVal)}</td></tr>
            </tbody>
          </table>
          <div class="payout-box">
            <div class="label">Total Payout (Salary + Incentive)</div>
            <div class="value">${formatMoneyValue(totalPayout)}</div>
          </div>
        </div>
      `
      : "";

    const html = `
      <html>
      <head>
        <title>Employee Targets - ${employeeLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
          h2 { text-align: center; margin-bottom: 4px; color: #024e32; }
          .sub { text-align: center; color: #6b7280; font-size: 13px; margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 7px; text-align: center; }
          th { background: #024e32; color: white; }
          tr:nth-child(even) { background: #f8faf9; }
          .status-approved { color: #16a34a; font-weight: bold; }
          .status-rejected { color: #dc2626; font-weight: bold; }
          .status-pending { color: #b45309; font-weight: bold; }
          .total-box { margin-top: 18px; border: 2px solid #bbf7d0; background: #f0fdf4; border-radius: 12px; padding: 14px; text-align: center; }
          .total-box .label { font-weight: bold; color: #15803d; font-size: 13px; }
          .total-box .value { font-size: 26px; font-weight: bold; color: #15803d; margin-top: 4px; }
          .salary-section { margin-top: 28px; page-break-inside: avoid; }
          .salary-section .section-title { font-weight: bold; font-size: 14px; margin: 0 0 10px 0; color: #111827; }
          .salary-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
          .salary-table th, .salary-table td { border: 1px solid #e9d5ff; padding: 9px 12px; text-align: left; font-size: 13px; }
          .salary-table th { background: #f5f3ff; color: #5b21b6; width: 55%; }
          .salary-table td { font-weight: bold; color: #1f2937; }
          .payout-box { border: 2px solid #ddd6fe; background: #f5f3ff; border-radius: 12px; padding: 14px; text-align: center; }
          .payout-box .label { font-weight: bold; color: #5b21b6; font-size: 13px; }
          .payout-box .value { font-size: 24px; font-weight: bold; color: #5b21b6; margin-top: 4px; }
          .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; color: #6b7280; font-size: 11px; }
        </style>
      </head>
      <body>
        <h2>MANIKYA CHITS PVT LTD</h2>
        <div class="sub">Employee Targets — ${employeeLabel} — ${periodLabel}</div>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Chit Amount</th>
              <th>Collection</th>
              <th>GB</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="total-box">
          <div class="label">💰 Total Collection (${customerTargets.length} entries)</div>
          <div class="value">${formatMoneyValue(totalCollection)}</div>
        </div>

        ${salarySectionHtml}

        <div class="footer">
          Printed on ${printedOn} • © ${new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </div>
      </body>
      </html>
    `;

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        Alert.alert("Error", "Please allow pop-ups to print the report.");
        return;
      }
      printWindow.document.write(
        html.replace(
          "</body>",
          `<script>window.print(); window.onafterprint = () => window.close();</script></body>`
        )
      );
      printWindow.document.close();
      return;
    }

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.log("Failed to print targets table:", error);
      Alert.alert("Error", "Could not open the print dialog. Please try again.");
    }
  };

  // =========================================================
  // PRINT CUSTOMER HISTORY  (same Web/iOS/Android pattern used
  // elsewhere in the app: build a clean standalone HTML report,
  // then either open a print window on web or hand it to
  // expo-print's native print / "Save as PDF" sheet.)
  // =========================================================
  const printCustomerHistory = async () => {
    if (!historyTarget) {
      Alert.alert("Error", "No customer selected to print");
      return;
    }

    const printedOn = new Date().toLocaleString("en-IN");

    const logRowsHtml =
      paymentLog.length === 0
        ? `<div class="empty">No collection entries recorded yet.</div>`
        : paymentLog
            .map((entry) => {
              const amountLine =
                entry.amount !== null && entry.amount !== 0
                  ? `
                    <div class="row">
                      <span>${entry.amount > 0 ? "Amount added" : "Amount reduced"}</span>
                      <span class="${entry.amount > 0 ? "pos" : "neg"}">${
                        entry.amount > 0 ? "+" : "−"
                      }${formatMoney(entry.amount)}</span>
                    </div>
                    <div class="row">
                      <span>Payment type</span>
                      <span>${getDisplayPaymentMethod(entry.paymentMethod)}</span>
                    </div>
                    ${
                      entry.newTotal !== null
                        ? `<div class="row"><span>Total after this</span><span>${formatMoneyValue(entry.newTotal)}</span></div>`
                        : ""
                    }
                  `
                  : entry.amount === 0
                    ? `<div class="row"><span>No change in amount</span><span>${
                        entry.newTotal !== null ? formatMoneyValue(entry.newTotal) : "-"
                      }</span></div>`
                    : `<div class="muted">Details updated${
                        entry.otherFields.length > 0 ? ` — ${entry.otherFields.join(", ")}` : ""
                      }</div>`;

              return `
                <div class="log-entry">
                  <div class="log-date">${formatLogDate(entry.editedAt)}</div>
                  ${amountLine}
                  ${
                    entry.amount !== null && entry.amount !== 0 && entry.otherFields.length > 0
                      ? `<div class="muted">Also updated: ${entry.otherFields.join(", ")}</div>`
                      : ""
                  }
                </div>
              `;
            })
            .join("");

    const entriesRowsHtml =
      customerHistoryEntries.length === 0
        ? `<div class="empty">No other entries.</div>`
        : customerHistoryEntries
            .map(
              (entry) => `
                <div class="entry-card">
                  <div class="row">
                    <span>Date: ${new Date(entry.date).toLocaleDateString()}</span>
                    <span>GB: ${entry.totalGB}</span>
                  </div>
                  <div class="row">
                    <span>Chit: ${entry.chitAmount}</span>
                    <span class="bold">${formatMoneyValue(Number(entry.collectionAmount || 0))}</span>
                  </div>
                  <div class="row muted-row">
                    <span>Status: ${entry.status}</span>
                    <span>Payment: ${getDisplayPaymentMethod(entry.paymentMethod)}</span>
                  </div>
                </div>
              `
            )
            .join("");

    const html = `
      <html>
      <head>
        <title>Customer History - ${historyTarget.customerName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 24px; }
          .header h2 { margin: 0 0 4px 0; color: #024e32; }
          .header .sub { color: #6b7280; font-size: 13px; }
          .info-box { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 16px; }
          .info-item { min-width: 160px; }
          .info-item .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
          .info-item .value { font-size: 14px; font-weight: bold; color: #111827; }
          .section-title { font-weight: bold; font-size: 14px; margin: 18px 0 8px 0; color: #111827; }
          .section-sub { font-size: 11px; color: #9ca3af; margin-bottom: 10px; }
          .log-entry { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; page-break-inside: avoid; }
          .log-date { font-size: 12px; color: #4b5563; font-weight: bold; margin-bottom: 6px; }
          .row { display: flex; justify-content: space-between; font-size: 12.5px; padding: 2px 0; }
          .muted-row { color: #9ca3af; font-size: 11px; }
          .muted { color: #6b7280; font-size: 12px; }
          .pos { color: #15803d; font-weight: bold; }
          .neg { color: #dc2626; font-weight: bold; }
          .bold { font-weight: bold; color: #1f2937; }
          .empty { color: #9ca3af; font-size: 12px; padding: 8px 0; }
          .entry-card { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; page-break-inside: avoid; }
          .total-box { margin-top: 18px; border: 2px solid #bbf7d0; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center; }
          .total-box .label { font-weight: bold; color: #15803d; font-size: 14px; }
          .total-box .value { font-size: 30px; font-weight: bold; color: #15803d; margin-top: 4px; }
          .footer { margin-top: 26px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; color: #6b7280; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>MANIKYA CHITS PVT LTD</h2>
          <div class="sub">Customer History &amp; Total Collection</div>
        </div>

        <div class="info-box">
          <div class="info-item">
            <div class="label">Customer</div>
            <div class="value">${historyTarget.customerName}</div>
          </div>
          <div class="info-item">
            <div class="label">Phone</div>
            <div class="value">${historyTarget.phoneNumber}</div>
          </div>
          <div class="info-item">
            <div class="label">Chit Amount</div>
            <div class="value">${historyTarget.chitAmount}</div>
          </div>
          <div class="info-item">
            <div class="label">Total collected on this entry</div>
            <div class="value">${formatMoneyValue(Number(historyTarget.collectionAmount || 0))}</div>
          </div>
        </div>

        <div class="section-title">Collection Log</div>
        <div class="section-sub">
          Editing a line changes THAT line only — it keeps its own date and no extra entry is created.
        </div>
        ${logRowsHtml}

        <div class="section-title">All Entries for this Customer</div>
        ${entriesRowsHtml}

        <div class="total-box">
          <div class="label">💰 Total Collection for this Customer</div>
          <div class="value">${formatMoneyValue(customerTotalCollection)}</div>
        </div>

        <div class="footer">
          Printed on ${printedOn} • © ${new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </div>
      </body>
      </html>
    `;

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        Alert.alert("Error", "Please allow pop-ups to print the report.");
        return;
      }
      printWindow.document.write(
        html.replace(
          "</body>",
          `<script>window.print(); window.onafterprint = () => window.close();</script></body>`
        )
      );
      printWindow.document.close();
      return;
    }

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.log("Failed to print customer history:", error);
      Alert.alert("Error", "Could not open the print dialog. Please try again.");
    }
  };

  // =========================================================
  // OPEN / SAVE EDIT PAYMENT LOG
  // =========================================================
  const openEditPaymentLog = (entry: PaymentLogEntry, target: Target) => {
    setEditingPaymentLog(entry);
    setEditLogTarget(target);
    setEditLogAmount(entry.amount !== null ? String(entry.amount) : "");
    setEditLogPaymentMethod(entry.paymentMethod || "Cash");

    setHistoryModalVisible(false);
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = setTimeout(() => {
      setEditPaymentLogModal(true);
    }, MODAL_SWAP_DELAY);
  };

  const closeEditPaymentLog = (reopenHistory: boolean = true) => {
    setEditPaymentLogModal(false);
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    if (reopenHistory && historyTarget) {
      swapTimerRef.current = setTimeout(() => {
        setHistoryModalVisible(true);
      }, MODAL_SWAP_DELAY);
    }
  };

  const saveEditedPaymentLog = async () => {
    if (!editingPaymentLog || !editLogTarget) return;
    if (savingLog) return;

    const newAmount = parseFloat(editLogAmount);
    if (Number.isNaN(newAmount)) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    const { editHistory, collectionAmount } = recalcEditHistoryForLogEdit(
      editLogTarget,
      editingPaymentLog.stamp,
      newAmount,
      editLogPaymentMethod
    );

    const cleanHistory = sanitizeEditHistory(editHistory);
    const targetId = editLogTarget._id;

    const optimisticTarget: Target = {
      ...editLogTarget,
      editHistory: cleanHistory,
      collectionAmount,
      paymentMethod: editLogPaymentMethod,
    };

    try {
      setSavingLog(true);

      await putTarget(targetId, {
        editHistory: cleanHistory,
        collectionAmount,
        paymentMethod: editLogPaymentMethod,
        isEdited: true,
      });

      setAllTargets((prev) =>
        prev.map((t) => (t._id === targetId ? { ...t, ...optimisticTarget } : t))
      );
      setHistoryTarget((prev) => (prev && prev._id === targetId ? optimisticTarget : prev));

      closeEditPaymentLog(true);
      setEditingPaymentLog(null);
      setEditLogTarget(null);
      setEditLogAmount("");
      setEditLogPaymentMethod("Cash");

      const data = await fetchTargetsList();

      if (!data) {
        showAlertSafely(
          "Success",
          `Collection log updated — new total ${formatMoneyValue(collectionAmount)}.`
        );
        return;
      }

      applyServerData(data, targetId);

      const fresh = data.find((t) => t._id === targetId);
      const serverCount = Array.isArray(fresh?.editHistory)
        ? fresh!.editHistory.length
        : 0;
      const savedTotal = Number(fresh?.collectionAmount ?? collectionAmount);

      if (serverCount > cleanHistory.length) {
        showAlertSafely(
          "Saved — log not rewritten",
          `The amount and the total were saved (new total ${formatMoneyValue(
            savedTotal
          )}), but the server added an extra collection log line instead of updating the original one. The backend is still running the old updateTarget.`
        );
      } else {
        showAlertSafely(
          "Success",
          `Collection log updated — new total ${formatMoneyValue(savedTotal)}.`
        );
      }
    } catch (error: any) {
      console.error("Error updating collection log:", error);
      Alert.alert("Error", error.message || "Failed to update collection log");
    } finally {
      setSavingLog(false);
    }
  };

  const openEditModal = (target: Target) => {
    setSelectedTarget(target);
    setEditCustomerName(target.customerName);
    setEditPhoneNumber(target.phoneNumber);
    setEditPaymentMethod(target.paymentMethod || "Cash");
    setEditChitAmount(target.chitAmount);
    setEditCollectionAmount("");
    setEditTotalGB(target.totalGB?.toString() || "");
    const parsedDate = new Date(target.date);
    setEditDate(Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate);

    setHistoryModalVisible(false);
    setEditPaymentLogModal(false);
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = setTimeout(() => setModalVisible(true), 0);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* HEADER */}
      <View
        className={`bg-[#024e32] absolute top-0 left-0 right-0 z-50 ${
          isDesktopOrLaptop ? 'px-8 pt-20 pb-8' : 'px-5 pt-16 pb-6'
        }`}
        style={{
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 6,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-3">
            <TouchableOpacity
              onPress={() => router.back()}
              className={isDesktopOrLaptop ? 'p-2' : 'mr-3'}
              activeOpacity={0.7}
              hitSlop={ICON_HIT_SLOP}
            >
              <MaterialIcons
                name="arrow-back"
                size={isDesktopOrLaptop ? 30 : 26}
                color="white"
              />
            </TouchableOpacity>
            <Text
              className={`text-white font-bold ml-3 flex-shrink ${
                isDesktopOrLaptop ? 'text-3xl' : 'text-2xl'
              }`}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Employee Targets
            </Text>
          </View>

          {!loading && selectedEmployee && (
            <View className="bg-white/20 px-4 py-2 rounded-full flex-shrink-0" style={{ maxWidth: isDesktopOrLaptop ? 220 : 130 }}>
              <Text className="text-white font-medium text-sm" numberOfLines={1} ellipsizeMode="tail">
                {selectedEmployee.name}
              </Text>
            </View>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            paddingTop: isDesktopOrLaptop ? 140 : 130,
            paddingBottom: 40
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#024e32"]} />
          }
        >
          <View className={`${isDesktopOrLaptop ? 'px-8' : 'px-5'}`}>
            {loading && !selectedEmployee ? (
              <View className="pt-4">
                <SkeletonLoader isDesktopOrLaptop={isDesktopOrLaptop} />
              </View>
            ) : (
              <>
                {/* ===== EMPLOYEE SELECTOR ===== */}
                <View className="pt-4">
                  <Text className="font-semibold text-gray-800 mb-2 text-base">👤 Select Employee</Text>

                  <TouchableOpacity
                    onPress={() => setEmployeeDropdownVisible(true)}
                    className="bg-white rounded-xl border border-gray-300 px-4 py-4 flex-row justify-between items-center shadow-sm"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-full bg-[#024e32]/10 items-center justify-center mr-3">
                        <MaterialIcons name="person" size={22} color="#024e32" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-800 font-semibold text-base">
                          {selectedEmployee ? selectedEmployee.name : "Choose employee..."}
                        </Text>
                        {selectedEmployee && (
                          <Text className="text-gray-500 text-xs">
                            ID: {selectedEmployee.emp_id} • {selectedEmployee.role || "Employee"}
                          </Text>
                        )}
                      </View>
                    </View>
                    <MaterialIcons name="arrow-drop-down" size={28} color="#024e32" />
                  </TouchableOpacity>
                </View>

                {/* ===== SET TARGET BUTTON ===== */}
                <View className="pt-3">
                  <TouchableOpacity
                    onPress={() => setShowSetTargetForm(!showSetTargetForm)}
                    className="bg-[#024e32] py-3.5 rounded-xl flex-row items-center justify-center shadow-sm"
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add" size={24} color="white" />
                    <Text className="text-white font-bold ml-2 text-base">Set Target</Text>
                  </TouchableOpacity>
                </View>

                {/* Set Target Form */}
                {showSetTargetForm && selectedEmployee && (
                  <View className="p-5 bg-white rounded-xl mt-3 border border-gray-200 shadow-sm">
                    <Text className="font-bold text-gray-800 text-lg mb-3">
                      Set Monthly Target for {selectedEmployee.name}
                    </Text>

                    <Text className="font-semibold text-gray-800 mb-2">Target Amount *</Text>
                    <TextInput
                      value={setTargetAmount}
                      onChangeText={setSetTargetAmount}
                      placeholder="e.g., 1 Lakh, 1.5 Thousand"
                      className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-3 text-base"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                    />

                    <Text className="font-semibold text-gray-800 mb-2">Target Period *</Text>
                    <TouchableOpacity
                      onPress={() => setShowSetTargetPeriodPicker(true)}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-4 flex-row justify-between items-center"
                      activeOpacity={0.7}
                    >
                      <View className="flex-row items-center">
                        <MaterialIcons name="event" size={20} color="#024e32" style={{ marginRight: 10 }} />
                        <Text className="text-gray-800 text-base">
                          {months[setTargetMonth]} {setTargetYear}
                        </Text>
                      </View>
                      <MaterialIcons name="arrow-drop-down" size={24} color="#024e32" />
                    </TouchableOpacity>

                    <Modal
                      transparent
                      animationType="fade"
                      statusBarTranslucent
                      visible={showSetTargetPeriodPicker}
                      onRequestClose={() => setShowSetTargetPeriodPicker(false)}
                    >
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
                        activeOpacity={1}
                        onPress={() => setShowSetTargetPeriodPicker(false)}
                      >
                        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                          <MonthYearPicker
                            month={setTargetMonth}
                            year={setTargetYear}
                            onChange={(m, y) => {
                              setSetTargetMonth(m);
                              setSetTargetYear(y);
                            }}
                            onClose={() => setShowSetTargetPeriodPicker(false)}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Modal>

                    <TouchableOpacity
                      onPress={handleSetTarget}
                      disabled={loading}
                      className={`py-3.5 rounded-xl ${loading ? 'bg-gray-400' : 'bg-[#024e32]'}`}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-center font-bold text-base">
                        {loading ? "Saving..." : "💾 Save Target"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ===== MONTHLY TARGET DISPLAY ===== */}
                {selectedEmployee && monthlyTarget && (
                  <View className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <View className="flex-row justify-between items-center">
                      <View className="flex-1 pr-3">
                        <Text className="text-blue-800 font-semibold">📌 Monthly Target</Text>
                        <Text className="text-2xl font-bold text-blue-900">{monthlyTarget.chitAmount}</Text>
                        <Text className="text-blue-600 text-xs">
                          {months[selectedMonth]} {selectedYear}
                        </Text>
                        <Text className="text-blue-600 text-xs mt-1">
                          Status: {monthlyTarget.isFrozen ? '❄️ Frozen' : '🔓 Unfrozen'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={handleToggleFreeze}
                        className={`px-4 py-2.5 rounded-lg ${monthlyTarget.isFrozen ? 'bg-green-600' : 'bg-red-600'}`}
                        activeOpacity={0.8}
                      >
                        <Text className="text-white font-bold">
                          {monthlyTarget.isFrozen ? 'Unfreeze' : 'Freeze'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* ===== MONTH & YEAR SELECTOR ===== */}
                {selectedEmployee && (
                  <>
                    <View className="pt-4">
                      <Text className="font-semibold text-gray-800 mb-2 text-base">📅 View Targets for Month & Year</Text>

                      <TouchableOpacity
                        onPress={() => setShowFilterPeriodPicker(true)}
                        className="bg-white rounded-xl border border-gray-300 px-4 py-4 flex-row justify-between items-center shadow-sm mb-3"
                        activeOpacity={0.8}
                      >
                        <View className="flex-row items-center">
                          <MaterialIcons name="event" size={22} color="#024e32" style={{ marginRight: 10 }} />
                          <Text className="text-gray-800 font-semibold text-base">
                            {months[selectedMonth]} {selectedYear}
                          </Text>
                        </View>
                        <MaterialIcons name="arrow-drop-down" size={28} color="#024e32" />
                      </TouchableOpacity>

                      <Modal
                        transparent
                        animationType="fade"
                        statusBarTranslucent
                        visible={showFilterPeriodPicker}
                        onRequestClose={() => setShowFilterPeriodPicker(false)}
                      >
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}
                          activeOpacity={1}
                          onPress={() => setShowFilterPeriodPicker(false)}
                        >
                          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                            <MonthYearPicker
                              month={selectedMonth}
                              year={selectedYear}
                              onChange={(m, y) => {
                                setSelectedMonth(m);
                                setSelectedYear(y);
                              }}
                              onClose={() => setShowFilterPeriodPicker(false)}
                            />
                          </TouchableOpacity>
                        </TouchableOpacity>
                      </Modal>
                    </View>

                    {/* ===== SEARCH & FILTER ===== */}
                    <View className="pt-2">
                      <View className="flex-row items-center bg-white rounded-xl px-4 py-3 border border-gray-200 mb-3 shadow-sm">
                        <MaterialIcons name="search" size={20} color="#666" />
                        <TextInput
                          className="flex-1 ml-2 text-base"
                          placeholder="Search by customer, phone or chit amount..."
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                          placeholderTextColor="#999"
                          returnKeyType="search"
                        />
                        {searchQuery !== "" && (
                          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={ICON_HIT_SLOP}>
                            <MaterialIcons name="close" size={20} color="#666" />
                          </TouchableOpacity>
                        )}
                      </View>

                      <View className="flex-row flex-wrap items-center">
                        <Text className="text-gray-600 text-sm font-semibold mr-2">Filter:</Text>
                        {["All", "Pending", "Approved", "Rejected"].map((status) => (
                          <TouchableOpacity
                            key={status}
                            onPress={() => setFilterStatus(status as any)}
                            className={`mr-2 mb-2 px-3 py-2 rounded-full ${filterStatus === status ? "bg-[#024e32]" : "bg-gray-200"}`}
                            activeOpacity={0.7}
                          >
                            <Text className={`text-xs font-semibold ${filterStatus === status ? "text-white" : "text-gray-700"}`}>
                              {status} ({customerTargets.filter(t => status === "All" ? true : t.status === status).length})
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View className="flex-row flex-wrap items-center mt-2">
                        <Text className="text-gray-600 text-sm font-semibold mr-2">Sort by:</Text>
                        <TouchableOpacity onPress={() => toggleSort("date")} className="mr-2 mb-2 px-3 py-2 rounded-full bg-white border border-gray-300" activeOpacity={0.7}>
                          <Text className="text-xs font-semibold text-gray-700">Date {sortBy === "date" && (sortOrder === "asc" ? "↑" : "↓")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleSort("customerName")} className="mr-2 mb-2 px-3 py-2 rounded-full bg-white border border-gray-300" activeOpacity={0.7}>
                          <Text className="text-xs font-semibold text-gray-700">Name {sortBy === "customerName" && (sortOrder === "asc" ? "↑" : "↓")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => toggleSort("status")} className="mr-2 mb-2 px-3 py-2 rounded-full bg-white border border-gray-300" activeOpacity={0.7}>
                          <Text className="text-xs font-semibold text-gray-700">Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* ===== TARGETS TABLE ===== */}
                    <View className="pb-3 pt-3">
                      {/*
                        Full-table Print button. Spaced/sized the same
                        deliberate way as the Print button inside the
                        History modal below (marginLeft, not gap; explicit
                        flexShrink: 0 + minWidth) so it renders reliably
                        on every iOS and Android device, not just in a
                        web preview.
                      */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "flex-end",
                          marginBottom: 10,
                        }}
                      >
                        <TouchableOpacity
                          onPress={printAllTargets}
                          activeOpacity={0.8}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexShrink: 0,
                            minWidth: 90,
                            justifyContent: "center",
                            paddingHorizontal: 14,
                            paddingVertical: 9,
                            borderRadius: 999,
                            backgroundColor: "#024e32",
                          }}
                        >
                          <MaterialIcons name="print" size={16} color="white" />
                          <Text
                            style={{
                              color: "white",
                              fontSize: 13,
                              fontWeight: "600",
                              marginLeft: 6,
                            }}
                          >
                            Print Table
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {customerTargets.length === 0 ? (
                        <View className="bg-gray-50 rounded-2xl p-8 items-center">
                          <MaterialIcons name="track-changes" size={50} color="#d1d5db" />
                          <Text className="text-gray-500 text-lg mt-3 text-center">No customer targets found for {months[selectedMonth]} {selectedYear}</Text>
                        </View>
                      ) : (
                        <View className="flex-row">
                          {/* Fixed columns */}
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
                            {customerTargets.map((target, i) => (
                              <TouchableOpacity
                                key={target._id || i}
                                onPress={() => openEditModal(target)}
                                activeOpacity={0.7}
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
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Scrollable columns */}
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-1"
                            keyboardShouldPersistTaps="handled"
                          >
                            <View className="border border-gray-300 border-l-0 rounded-r-xl overflow-hidden">
                              <View
                                className="bg-[#024e32] flex-row"
                                style={{ height: TABLE_HEADER_HEIGHT }}
                              >
                                <TableHeaderCell label="Phone" width={COLS.phone} />
                                <TableHeaderCell label="Date" width={COLS.date} />
                                <TableHeaderCell label="Payment" width={COLS.payment} />
                                <TableHeaderCell label="Chit Amount" width={COLS.chit} />
                                <TableHeaderCell label="Collection" width={COLS.collection} />
                                <TableHeaderCell label="GB" width={COLS.gb} />
                                <TableHeaderCell label="Status" width={COLS.status} />
                                <TableHeaderCell label="Actions" width={COLS.actions} />
                              </View>

                              {customerTargets.map((target, i) => (
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
                                      {new Date(target.date).toLocaleDateString()}
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
                                    <View className="flex-row items-center justify-center">
                                      <TouchableOpacity
                                        onPress={() => openEditModal(target)}
                                        activeOpacity={0.6}
                                        hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                                        style={{
                                          paddingHorizontal: 8,
                                          paddingVertical: 10,
                                          minWidth: 36,
                                          alignItems: "center",
                                        }}
                                      >
                                        <MaterialIcons name="edit" size={20} color="#024e32" />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() => openHistory(target)}
                                        activeOpacity={0.6}
                                        hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                                        style={{
                                          paddingHorizontal: 8,
                                          paddingVertical: 10,
                                          minWidth: 36,
                                          alignItems: "center",
                                        }}
                                      >
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
                  </>
                )}

                {/* ===== SALARY & INCENTIVE SECTION ===== */}
                {selectedEmployee && monthlyTarget && (
                  <View className="mb-5 p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <Text className="font-bold text-gray-800 text-lg mb-3">💰 Salary & Incentive Details</Text>
                    <Text className="text-gray-500 text-xs mb-3">
                      Update salary, incentive, and additional fields for this month's target
                      {monthlyTarget.isFrozen && " (Frozen – cannot edit)"}
                    </Text>

                    <View className="mb-3">
                      <Text className="font-semibold text-gray-800 mb-1.5">Total Enroll</Text>
                      <TextInput
                        value={totalEnrollInput}
                        onChangeText={setTotalEnrollInput}
                        keyboardType="decimal-pad"
                        placeholder="Enter total enrollments (e.g. 111.5)"
                        editable={!monthlyTarget.isFrozen}
                        className={`bg-white border border-gray-300 rounded-xl px-4 py-3 text-base ${monthlyTarget.isFrozen ? 'opacity-60' : ''}`}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View className="mb-3">
                      <Text className="font-semibold text-gray-800 mb-1.5">Total GB</Text>
                      <TextInput
                        value={totalGBInput}
                        onChangeText={setTotalGBInput}
                        keyboardType="decimal-pad"
                        placeholder="Enter total GB (e.g. 100.10)"
                        editable={!monthlyTarget.isFrozen}
                        className={`bg-white border border-gray-300 rounded-xl px-4 py-3 text-base ${monthlyTarget.isFrozen ? 'opacity-60' : ''}`}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View className="mb-3">
                      <Text className="font-semibold text-gray-800 mb-1.5">Backup</Text>
                      <TextInput
                        value={backupInput}
                        onChangeText={setBackupInput}
                        placeholder="Backup details"
                        editable={!monthlyTarget.isFrozen}
                        className={`bg-white border border-gray-300 rounded-xl px-4 py-3 text-base ${monthlyTarget.isFrozen ? 'opacity-60' : ''}`}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View className="mb-3">
                      <Text className="font-semibold text-gray-800 mb-1.5">Salary Amount</Text>
                      <TextInput
                        value={salaryInput}
                        onChangeText={setSalaryInput}
                        keyboardType="decimal-pad"
                        placeholder="Enter salary amount (e.g. 111.5)"
                        editable={!monthlyTarget.isFrozen}
                        className={`bg-white border border-gray-300 rounded-xl px-4 py-3 text-base ${monthlyTarget.isFrozen ? 'opacity-60' : ''}`}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <View className="mb-3">
                      <Text className="font-semibold text-gray-800 mb-1.5">Incentive</Text>
                      <TextInput
                        value={incentiveInput}
                        onChangeText={setIncentiveInput}
                        keyboardType="decimal-pad"
                        placeholder="Enter incentive amount (e.g. 100.10)"
                        editable={!monthlyTarget.isFrozen}
                        className={`bg-white border border-gray-300 rounded-xl px-4 py-3 text-base ${monthlyTarget.isFrozen ? 'opacity-60' : ''}`}
                        placeholderTextColor="#999"
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleUpdateSalarySection}
                      disabled={loading || monthlyTarget.isFrozen}
                      className={`py-3.5 rounded-xl ${(loading || monthlyTarget.isFrozen) ? 'bg-gray-400' : 'bg-purple-600'}`}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-center font-bold text-base">
                        {loading ? "Updating..." : monthlyTarget.isFrozen ? "❄️ Frozen – Cannot Edit" : "💾 Update All"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ===== FOOTER ===== */}
                <View className="mt-10 pt-6 border-t border-gray-200">
                  <View className="items-center">
                    <Text className="text-[#024e32] font-bold text-lg">
                      MANIKYA CHITS PVT LTD
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1">
                      Employee Targets Management
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1">
                      © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ===== EMPLOYEE DROPDOWN MODAL ===== */}
      <Modal
        {...NATIVE_MODAL_PROPS}
        animationType="slide"
        visible={employeeDropdownVisible}
        onRequestClose={() => setEmployeeDropdownVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View
            className="bg-white rounded-2xl shadow-2xl"
            style={{ width: modalCardWidth, maxHeight: modalMaxHeight }}
          >
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">👤 Select Employee</Text>
              <TouchableOpacity
                onPress={() => setEmployeeDropdownVisible(false)}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                hitSlop={ICON_HIT_SLOP}
              >
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View className="p-4" style={{ flexShrink: 1 }}>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200 mb-3">
                <MaterialIcons name="search" size={20} color="#666" />
                <TextInput
                  className="flex-1 ml-2 text-base"
                  placeholder="Search by name or ID..."
                  value={employeeSearch}
                  onChangeText={setEmployeeSearch}
                  placeholderTextColor="#999"
                  returnKeyType="search"
                />
                {employeeSearch !== "" && (
                  <TouchableOpacity onPress={() => setEmployeeSearch("")} hitSlop={ICON_HIT_SLOP}>
                    <MaterialIcons name="close" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              <FlatList
                data={filteredEmployees}
                keyExtractor={(item) => item._id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => handleEmployeeSelect(item)}
                    className={`py-3 px-4 rounded-xl mb-1.5 border ${
                      selectedEmployee?.emp_id === item.emp_id
                        ? 'bg-[#024e32]/10 border-[#024e32]'
                        : 'bg-white border-gray-100'
                    }`}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 rounded-full bg-[#024e32]/10 items-center justify-center mr-3">
                        <MaterialIcons name="person" size={20} color="#024e32" />
                      </View>
                      <View className="flex-1">
                        <Text className={`font-semibold text-base ${selectedEmployee?.emp_id === item.emp_id ? 'text-[#024e32]' : 'text-gray-800'}`}>
                          {item.name}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          ID: {item.emp_id} • {item.role || "Employee"}
                        </Text>
                      </View>
                      {selectedEmployee?.emp_id === item.emp_id && (
                        <MaterialIcons name="check-circle" size={24} color="#024e32" />
                      )}
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <MaterialIcons name="person-off" size={48} color="#ccc" />
                    <Text className="text-gray-400 mt-2">No employees found</Text>
                  </View>
                }
                showsVerticalScrollIndicator={true}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== EDIT CUSTOMER DETAILS MODAL ===== */}
      <Modal
        {...NATIVE_MODAL_PROPS}
        animationType="slide"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View
              className="bg-white rounded-2xl shadow-2xl"
              style={{ width: modalCardWidth, maxHeight: modalMaxHeight }}
            >
              <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
                <Text className="text-white text-xl font-bold">✏️ Edit Customer Details</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  hitSlop={ICON_HIT_SLOP}
                >
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <ScrollView
                className="p-5"
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {selectedTarget && (
                  <>
                    <Text className="font-semibold text-gray-800 mb-1.5">Date *</Text>

                    {/* Custom calendar button — replaces the native
                        DateTimePicker, which was broken on iOS. Works
                        identically on Android. */}
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-3 flex-row justify-between items-center"
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-800 text-base">{formatDate(editDate)}</Text>
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
                          <SimpleCalendar
                            value={editDate}
                            onChange={(d) => setEditDate(d)}
                            onClose={() => setShowDatePicker(false)}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    </Modal>

                    <Text className="font-semibold text-gray-800 mb-1.5">Customer Name *</Text>
                    <TextInput
                      value={editCustomerName}
                      onChangeText={setEditCustomerName}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-3 text-base"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                    />

                    <Text className="font-semibold text-gray-800 mb-1.5">Phone Number *</Text>
                    <TextInput
                      value={editPhoneNumber}
                      onChangeText={setEditPhoneNumber}
                      keyboardType="phone-pad"
                      maxLength={10}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-3 text-base"
                      placeholderTextColor="#999"
                    />

                    <Text className="font-semibold text-gray-800 mb-1.5">Payment Method *</Text>
                    <View className="flex-row flex-wrap mb-3">
                      {paymentMethods.map((method) => (
                        <TouchableOpacity
                          key={method}
                          onPress={() => setEditPaymentMethod(method)}
                          className={`mr-2 mb-2 px-4 py-2.5 rounded-full ${editPaymentMethod === method ? "bg-[#024e32]" : "bg-gray-200"}`}
                          activeOpacity={0.7}
                        >
                          <Text className={editPaymentMethod === method ? "text-white font-semibold" : "text-gray-700"}>
                            {getDisplayPaymentMethod(method)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text className="font-semibold text-gray-800 mb-1.5">Chit Amount *</Text>
                    <TextInput
                      value={editChitAmount}
                      onChangeText={setEditChitAmount}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-3 text-base"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                    />

                    <Text className="font-semibold text-gray-800 mb-1.5">New Collection Amount</Text>
                    <View className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-2">
                      <Text className="text-blue-800 text-sm">
                        Already collected: {formatMoneyValue(previousCollectionTotal)}
                      </Text>
                    </View>
                    <TextInput
                      value={editCollectionAmount}
                      onChangeText={setEditCollectionAmount}
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      placeholder="Enter new amount collected"
                      placeholderTextColor="#999"
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-2 text-base"
                      returnKeyType="done"
                    />
                    <Text className="text-gray-500 text-xs mb-3">
                      Leave blank if there is no new collection. Anything entered here is
                      added to the total and saved as a NEW line in the collection log.
                      To correct a line that already exists, use Edit inside History
                      instead. New total:{" "}
                      <Text className="font-semibold text-gray-700">
                        {formatMoneyValue(newCollectionTotalPreview)}
                      </Text>
                    </Text>

                    <Text className="font-semibold text-gray-800 mb-1.5">Total GB *</Text>
                    <TextInput
                      value={editTotalGB}
                      onChangeText={setEditTotalGB}
                      keyboardType={Platform.OS === "ios" ? "decimal-pad" : "numeric"}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-3 text-base"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                    />

                    <TouchableOpacity
                      onPress={handleUpdateDetails}
                      disabled={loading}
                      className={`py-3.5 rounded-xl mt-2 ${loading ? "bg-gray-400" : "bg-[#024e32]"}`}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-center font-bold text-base">
                        {loading ? "Saving..." : "💾 Save Details"}
                      </Text>
                    </TouchableOpacity>

                    <View className="mt-4">
                      <View className="mb-3">
                        <Text className="text-gray-500 text-sm mb-1">Current Status</Text>
                        <View className={`self-start px-3 py-1.5 rounded-full ${getStatusColor(selectedTarget.status).split(" ")[0]}`}>
                          <Text className={`font-semibold ${getStatusColor(selectedTarget.status).split(" ")[1]}`}>
                            {selectedTarget.status}
                          </Text>
                        </View>
                      </View>
                      {selectedTarget.status === "Pending" && (
                        <View className="flex-row mb-3">
                          <TouchableOpacity
                            onPress={() => handleStatusUpdate(selectedTarget._id, "Approved")}
                            className="flex-1 bg-green-600 py-3.5 rounded-xl mr-2 items-center"
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="check-circle" size={20} color="white" />
                            <Text className="text-white text-center font-bold mt-1">Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleStatusUpdate(selectedTarget._id, "Rejected")}
                            className="flex-1 bg-red-600 py-3.5 rounded-xl ml-2 items-center"
                            activeOpacity={0.8}
                          >
                            <MaterialIcons name="cancel" size={20} color="white" />
                            <Text className="text-white text-center font-bold mt-1">Reject</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <TouchableOpacity
                        onPress={() => handleDelete(selectedTarget._id)}
                        className="bg-red-600 py-3.5 rounded-xl items-center flex-row justify-center"
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="delete" size={20} color="white" />
                        <Text className="text-white text-center font-bold ml-2">Delete Target</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== HISTORY MODAL ===== */}
      <Modal
        {...NATIVE_MODAL_PROPS}
        animationType="slide"
        visible={historyModalVisible}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View
            className="bg-white rounded-2xl shadow-2xl"
            style={{ width: modalCardWidth, maxHeight: modalMaxHeight }}
          >
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold" numberOfLines={1} style={{ flex: 1 }}>
                📜 History &amp; Total Collection
              </Text>

              {/*
                Print + Close actions.
                FIX (learned from a prior mobile layout bug elsewhere in
                this app): spacing these with RN flexbox `gap` on native
                (Android/iOS) is not reliable across all Expo/RN versions
                and can render with no effective spacing there, pushing a
                button out of the visible header. marginLeft is used
                instead so it renders identically on web, Android and iOS,
                and flexShrink: 0 / minWidth keep the Print button from
                ever being squeezed to nothing.
              */}
              <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}>
                <TouchableOpacity
                  onPress={printCustomerHistory}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexShrink: 0,
                    minWidth: 64,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: "rgba(255,255,255,0.18)",
                  }}
                >
                  <MaterialIcons name="print" size={16} color="white" />
                  <Text style={{ color: "white", fontSize: 12, fontWeight: "600", marginLeft: 4 }}>
                    Print
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setHistoryModalVisible(false)}
                  className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  style={{ marginLeft: 8 }}
                  hitSlop={ICON_HIT_SLOP}
                >
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView
              className="p-5"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {historyTarget ? (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm">Customer</Text>
                    <Text className="text-gray-800 font-semibold text-base">{historyTarget.customerName}</Text>
                    <Text className="text-gray-500 text-sm mt-1">Phone: {historyTarget.phoneNumber}</Text>
                  </View>

                  <Text className="font-bold text-gray-700 mb-1">Collection Log:</Text>
                  <Text className="text-gray-400 text-xs mb-3">
                    Editing a line changes THAT line only — it keeps its own date
                    and no extra entry is created. The totals below are recalculated
                    from it.
                  </Text>
                  {paymentLog.length > 0 ? (
                    paymentLog.map((entry, index) => (
                      <View
                        key={entry.stamp || index}
                        className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="flex-row items-center flex-1 pr-2">
                            <MaterialIcons name="event" size={16} color="#6b7280" />
                            <Text className="text-gray-600 text-sm ml-1 font-medium" numberOfLines={1}>
                              {formatLogDate(entry.editedAt)}
                            </Text>
                          </View>

                          {entry.amount !== null && (
                            <TouchableOpacity
                              onPress={() => {
                                if (!historyTarget) return;
                                openEditPaymentLog(entry, historyTarget);
                              }}
                              className="bg-blue-100 rounded-full flex-row items-center"
                              activeOpacity={0.6}
                              hitSlop={ICON_HIT_SLOP}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 9,
                                minHeight: 38,
                                minWidth: 74,
                                justifyContent: "center",
                              }}
                            >
                              <MaterialIcons name="edit" size={16} color="#2563eb" />
                              <Text className="text-blue-600 text-xs font-semibold ml-1">Edit</Text>
                            </TouchableOpacity>
                          )}
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
                      </View>
                    ))
                  ) : (
                    <View className="items-center py-4">
                      <Text className="text-gray-400">No collection entries recorded yet.</Text>
                    </View>
                  )}

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
                            <Text className="text-gray-600 text-sm">Date: {new Date(entry.date).toLocaleDateString()}</Text>
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
                      Sum of every entry above, recalculated after each edit.
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

      {/* ===== EDIT PAYMENT LOG MODAL ===== */}
      <Modal
        {...NATIVE_MODAL_PROPS}
        animationType="slide"
        visible={editPaymentLogModal}
        onRequestClose={() => closeEditPaymentLog(true)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <View
              className="bg-white rounded-2xl shadow-2xl"
              style={{ width: modalCardWidth, maxHeight: modalMaxHeight }}
            >
              <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
                <Text className="text-white text-xl font-bold">✏️ Edit Payment Log</Text>
                <TouchableOpacity
                  onPress={() => closeEditPaymentLog(true)}
                  className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                  hitSlop={ICON_HIT_SLOP}
                >
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <ScrollView
                className="p-5"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={true}
                contentContainerStyle={{ paddingBottom: 24 }}
              >
                {editingPaymentLog && (
                  <>
                    <Text className="text-gray-500 text-sm mb-1">
                      Editing the entry from {formatLogDate(editingPaymentLog.editedAt)}
                    </Text>
                    <Text className="text-gray-400 text-xs mb-3">
                      This entry is rewritten in place — its date stays the same and
                      no new entry is added to the log.
                    </Text>

                    <Text className="font-semibold text-gray-800 mb-1.5">Amount *</Text>
                    <TextInput
                      value={editLogAmount}
                      onChangeText={setEditLogAmount}
                      keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                      placeholder="Enter amount (use - for a reduction)"
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-4 text-base"
                      placeholderTextColor="#999"
                      returnKeyType="done"
                      blurOnSubmit
                    />

                    <Text className="font-semibold text-gray-800 mb-1.5">Payment Method *</Text>
                    <View className="flex-row flex-wrap mb-4">
                      {paymentMethods.map((method) => (
                        <TouchableOpacity
                          key={method}
                          onPress={() => setEditLogPaymentMethod(method)}
                          className={`mr-2 mb-2 px-4 py-2.5 rounded-full ${editLogPaymentMethod === method ? "bg-[#024e32]" : "bg-gray-200"}`}
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                        >
                          <Text className={editLogPaymentMethod === method ? "text-white font-semibold" : "text-gray-700"}>
                            {getDisplayPaymentMethod(method)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View className="bg-gray-50 rounded-xl p-3 mb-4">
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-gray-500 text-sm">Total before this entry</Text>
                        <Text className="text-gray-700 text-sm font-semibold">
                          {formatMoneyValue(editingPaymentLog.oldAmount ?? 0)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between mb-1">
                        <Text className="text-gray-500 text-sm">Total after this entry</Text>
                        <Text className="text-gray-700 text-sm font-semibold">
                          {editLogPreviewTotal !== null
                            ? formatMoneyValue(editLogPreviewTotal)
                            : "-"}
                        </Text>
                      </View>
                      <View className="flex-row justify-between pt-2 mt-1 border-t border-gray-200">
                        <Text className="text-gray-700 text-sm font-semibold">
                          New collection total
                        </Text>
                        <Text className="text-[#024e32] text-base font-bold">
                          {editLogFinalTotalPreview !== null
                            ? formatMoneyValue(editLogFinalTotalPreview)
                            : formatMoneyValue(Number(editLogTarget?.collectionAmount || 0))}
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-xs mt-2">
                        Later entries keep their own amounts; only their running
                        totals move to match this change.
                      </Text>
                    </View>

                    <View className="flex-row" style={{ gap: 12 }}>
                      <TouchableOpacity
                        onPress={() => closeEditPaymentLog(true)}
                        className="flex-1 bg-gray-200 py-3.5 rounded-xl"
                        activeOpacity={0.7}
                      >
                        <Text className="text-gray-700 text-center font-bold">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={saveEditedPaymentLog}
                        disabled={savingLog}
                        className={`flex-1 py-3.5 rounded-xl ${savingLog ? "bg-gray-400" : "bg-[#024e32]"}`}
                        activeOpacity={0.8}
                      >
                        {savingLog ? (
                          <View className="flex-row items-center justify-center">
                            <ActivityIndicator size="small" color="#ffffff" />
                            <Text className="text-white text-center font-bold ml-2">Saving...</Text>
                          </View>
                        ) : (
                          <Text className="text-white text-center font-bold">💾 Save Changes</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}