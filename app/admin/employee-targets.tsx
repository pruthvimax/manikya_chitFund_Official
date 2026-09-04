import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
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

   iOS cannot present one Modal on top of another: opening the
   "Edit Payment Log" modal while the History modal was still
   visible left an invisible layer that swallowed every touch —
   the Edit button looked dead and the page froze.

   MODAL_SWAP_DELAY gives the first modal time to finish its
   dismiss animation before the next one is presented. Alerts are
   also deferred, because an Alert fired mid-dismiss on iOS never
   shows and blocks the UI the same way.
========================================================= */
const MODAL_SWAP_DELAY = Platform.OS === "ios" ? 420 : 180;
const ALERT_DELAY = Platform.OS === "ios" ? 320 : 120;

// Props every Modal on this screen needs so it layers correctly on
// both platforms (overFullScreen on iOS, under-status-bar on Android).
const NATIVE_MODAL_PROPS: any = {
  transparent: true,
  statusBarTranslucent: true,
  hardwareAccelerated: true,
  ...(Platform.OS === "ios" ? { presentationStyle: "overFullScreen" } : {}),
};

// Comfortable tap area for small icon buttons (Apple/Material both
// want ~44dp; a bare 16-20px icon is far too small to hit reliably).
const ICON_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

// ============ PREMIUM SKELETON LOADER ============
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

// Magnitude only — the caller adds the + / − sign itself.
const formatMoney = (value: number): string =>
  `₹${Math.abs(value).toLocaleString("en-IN")}`;

// Signed value — use this for TOTALS so a negative total is never
// printed as if it were positive.
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

   The edited entry keeps its OWN date and its own position in the
   log. Only its amount (and payment type) change. Every entry that
   came AFTER it is re-based so the running "total after this" line
   stays continuous, and the row's collectionAmount becomes the
   final running total.

   Example — log is  +200 (total 200), then +50 (total 250).
   Admin edits the 200 line down to 100:
       entry 1 : 0 -> 100   (amount +100, total 100)
       entry 2 : 100 -> 150 (amount +50 unchanged, total 150)
       row collectionAmount = 150
   No new log line is created anywhere in this process.
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
      // ---- THE EDITED LINE ITSELF: rewritten, never duplicated ----
      if (collectionIdx !== undefined) {
        const oldVal = toNumber(history[collectionIdx].oldValue);
        const newVal = oldVal + newAmount;
        history[collectionIdx] = {
          ...history[collectionIdx],
          oldValue: oldVal,
          newValue: newVal,
          // editedAt is deliberately left untouched so the line keeps
          // its original date and stays where it is in the log.
        };
        carryOldValue = newVal;
      }
      if (paymentIdx !== undefined) {
        history[paymentIdx] = { ...history[paymentIdx], newValue: newPaymentMethod };
      } else if (
        collectionIdx !== undefined &&
        newPaymentMethod !== (target.paymentMethod ?? "")
      ) {
        // Only when the method actually changed. It carries the SAME
        // timestamp as the edited line, so it is folded into that same
        // log entry rather than showing up as a new one.
        history.push({
          field: "paymentMethod",
          oldValue: target.paymentMethod ?? "",
          newValue: newPaymentMethod,
          editedAt: group.editedAt,
        });
      }
      pastEditPoint = true;
    } else if (pastEditPoint && collectionIdx !== undefined && carryOldValue !== null) {
      // ---- LATER LINES: same amounts, re-based running total ----
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

  // Sized in real pixels instead of a percentage class: on Android a
  // percentage max-height on a modal card is unreliable and let the
  // content (and the Save button) run off-screen.
  const modalMaxHeight = Math.round(height * 0.85);
  const modalCardWidth = Math.min(width - 32, 560);

  // Timers used to swap between modals; cleared on unmount so a
  // pending swap can never fire on a dead screen.
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

  const [showSetTargetForm, setShowSetTargetForm] = useState(false);

  const [setTargetAmount, setSetTargetAmount] = useState("");
  const [setTargetMonth, setSetTargetMonth] = useState<number>(new Date().getMonth());
  const [setTargetYear, setSetTargetYear] = useState<number>(new Date().getFullYear());

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

  // Saving flag for the log modal only. It used to share the page-wide
  // `loading` flag, so a background fetch could leave the Save button
  // permanently disabled — which read as "the button does nothing".
  const [savingLog, setSavingLog] = useState(false);

  // Memoized values
  const months = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsArray = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      yearsArray.push(i);
    }
    return yearsArray;
  }, []);

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

  // Live preview of the running total ON the edited line itself.
  const editLogPreviewTotal = useMemo(() => {
    if (!editingPaymentLog) return null;
    const parsed = parseFloat(editLogAmount);
    if (Number.isNaN(parsed)) return null;
    const base = editingPaymentLog.oldAmount ?? 0;
    return base + parsed;
  }, [editingPaymentLog, editLogAmount]);

  // Live preview of the ROW total once every later line has been
  // re-based on the edited amount. This is what will be saved.
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

  // Collection already recorded on the row being edited, plus a live preview
  // of what the total becomes once the newly typed amount is added.
  const previousCollectionTotal = Number(selectedTarget?.collectionAmount || 0);

  const newCollectionTotalPreview = useMemo(() => {
    const typed = editCollectionAmount.trim();
    if (typed === "") return previousCollectionTotal;
    const parsed = parseFloat(typed);
    if (Number.isNaN(parsed)) return previousCollectionTotal;
    return previousCollectionTotal + parsed;
  }, [editCollectionAmount, previousCollectionTotal]);

  // Shows an Alert only after any modal transition has settled.
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

  // Plain fetch of this employee's rows — returns the data instead of
  // pushing it into state, so a save can inspect what the server
  // actually stored before deciding what to do next.
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

  // Pushes fetched rows into state and, when a target id is given,
  // re-points the open history modal at the newly saved version so the
  // collection log and the totals show what the backend actually stored.
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

  // Admin edit of a customer row. The collection field opens EMPTY: whatever
  // is typed there is a NEW collection added on top of the amount already
  // recorded, and the backend writes that change into the collection log.
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

      // Close the modal FIRST, then alert — an Alert fired while a modal
      // is still dismissing is swallowed on iOS and locks the screen.
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
    // Dismiss the modal before the confirm dialog, otherwise iOS shows
    // the alert behind the modal and nothing responds.
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
    return date.toISOString().split('T')[0];
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

    // Make sure no other modal is on screen first.
    setModalVisible(false);
    setEditPaymentLogModal(false);
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = setTimeout(() => setHistoryModalVisible(true), 0);

    // Pull the latest copy so the log reflects anything saved elsewhere.
    refreshFromServer(target._id);
  };

  // =========================================================
  // OPEN / SAVE EDIT PAYMENT LOG
  //
  // Modal layering: the history modal is dismissed before the log
  // editor is presented, and re-presented when the editor closes.
  // Two modals are never on screen at the same time (iOS fix).
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

  /* ---------------------------------------------------------
     SAVE — EDIT IN PLACE, NEVER APPEND

     Sending editHistory tells the server "I am rewriting the log":
     it $sets the array as given and skips its usual auto-append, so
     the edited line keeps its own date with its new amount, the later
     lines keep their amounts with re-based totals, and NO extra line
     is created for the correction.

     (This is one single request. It has to be: the server cannot
     $set and $push the same path in one update, so it is either a
     rewrite or an append, never both.)

     The result is read back afterwards. If the log came back longer
     than what was sent, the server appended anyway — that means it is
     running the older updateTarget, and the admin is told plainly
     instead of silently getting a duplicate line.
  --------------------------------------------------------- */
  const saveEditedPaymentLog = async () => {
    if (!editingPaymentLog || !editLogTarget) return;
    if (savingLog) return; // guard against a double tap

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

      // Rewrite the log and the recalculated total in one write.
      await putTarget(targetId, {
        editHistory: cleanHistory,
        collectionAmount,
        paymentMethod: editLogPaymentMethod,
        isEdited: true,
      });

      // Optimistic paint so the modal is correct the instant it reopens.
      setAllTargets((prev) =>
        prev.map((t) => (t._id === targetId ? { ...t, ...optimisticTarget } : t))
      );
      setHistoryTarget((prev) => (prev && prev._id === targetId ? optimisticTarget : prev));

      // Close the editor, bring the history modal back.
      closeEditPaymentLog(true);
      setEditingPaymentLog(null);
      setEditLogTarget(null);
      setEditLogAmount("");
      setEditLogPaymentMethod("Cash");

      // Read back and confirm the log really is in place.
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

  // Opens the edit modal for a row
  const openEditModal = (target: Target) => {
    setSelectedTarget(target);
    setEditCustomerName(target.customerName);
    setEditPhoneNumber(target.phoneNumber);
    setEditPaymentMethod(target.paymentMethod || "Cash");
    setEditChitAmount(target.chitAmount);
    setEditCollectionAmount("");
    setEditTotalGB(target.totalGB?.toString() || "");
    setEditDate(new Date(target.date));

    // Never stack on top of another modal.
    setHistoryModalVisible(false);
    setEditPaymentLogModal(false);
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = setTimeout(() => setModalVisible(true), 0);
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* HEADER */}
      <View className={`bg-[#024e32] absolute top-0 left-0 right-0 z-50 ${
        isDesktopOrLaptop ? 'px-8 pt-20 pb-8' : 'px-5 pt-16 pb-6'
      }`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
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
            <Text className={`text-white font-bold ml-3 ${
              isDesktopOrLaptop ? 'text-3xl' : 'text-2xl'
            }`}>
              Employee Targets
            </Text>
          </View>

          {!loading && selectedEmployee && (
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-medium text-sm">
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

                    <Text className="font-semibold text-gray-800 mb-2">Select Month *</Text>
                    <View className="bg-white rounded-xl border border-gray-300 overflow-hidden mb-3">
                      <Picker
                        selectedValue={setTargetMonth}
                        onValueChange={(value) => setSetTargetMonth(value)}
                        style={{ height: Platform.OS === 'ios' ? 180 : 50, width: "100%" }}
                        itemStyle={{ fontSize: 16, color: 'black', height: 50 }}
                      >
                        {months.map((month, index) => (
                          <Picker.Item key={index} label={month} value={index} />
                        ))}
                      </Picker>
                    </View>

                    <Text className="font-semibold text-gray-800 mb-2">Select Year *</Text>
                    <View className="bg-white rounded-xl border border-gray-300 overflow-hidden mb-4">
                      <Picker
                        selectedValue={setTargetYear}
                        onValueChange={(value) => setSetTargetYear(value)}
                        style={{ height: Platform.OS === 'ios' ? 180 : 50, width: "100%" }}
                        itemStyle={{ fontSize: 16, color: 'black', height: 50 }}
                      >
                        {years.map((year) => (
                          <Picker.Item key={year} label={year.toString()} value={year} />
                        ))}
                      </Picker>
                    </View>

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

                      <View className="mb-3">
                        <Text className="text-gray-600 text-sm mb-1.5">Month</Text>
                        <View className="bg-white rounded-xl border border-gray-300 overflow-hidden">
                          <Picker
                            selectedValue={selectedMonth}
                            onValueChange={(value) => setSelectedMonth(value)}
                            style={{ height: Platform.OS === 'ios' ? 160 : 50, width: "100%" }}
                            itemStyle={{ fontSize: 16, color: 'black', height: 44 }}
                          >
                            {months.map((month, index) => (
                              <Picker.Item key={index} label={month} value={index} />
                            ))}
                          </Picker>
                        </View>
                      </View>

                      <View className="mb-3">
                        <Text className="text-gray-600 text-sm mb-1.5">Year</Text>
                        <View className="bg-white rounded-xl border border-gray-300 overflow-hidden">
                          <Picker
                            selectedValue={selectedYear}
                            onValueChange={(value) => setSelectedYear(value)}
                            style={{ height: Platform.OS === 'ios' ? 160 : 50, width: "100%" }}
                            itemStyle={{ fontSize: 16, color: 'black', height: 44 }}
                          >
                            {years.map((year) => (
                              <Picker.Item key={year} label={year.toString()} value={year} />
                            ))}
                          </Picker>
                        </View>
                      </View>
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

                              {/* Rows are plain Views now. They used to be a
                                  TouchableOpacity wrapping the Edit/History
                                  icon buttons — on Android that nesting fired
                                  BOTH handlers from one tap and stacked two
                                  modals, which froze the screen. */}
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
                    <TouchableOpacity
                      onPress={() => setShowDatePicker(true)}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-3.5 mb-3 flex-row justify-between items-center"
                      activeOpacity={0.7}
                    >
                      <Text className="text-gray-800 text-base">{formatDate(editDate)}</Text>
                      <MaterialIcons name="calendar-today" size={24} color="#024e32" />
                    </TouchableOpacity>

                    {showDatePicker && (
                      <View className="mb-3">
                        <DateTimePicker
                          value={editDate}
                          mode="date"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, selectedDate) => {
                            // Android closes itself; iOS keeps the spinner up
                            // until "Done" so the wheel is actually usable.
                            if (Platform.OS === 'android') setShowDatePicker(false);
                            if (event?.type === 'dismissed') return;
                            if (selectedDate) setEditDate(selectedDate);
                          }}
                          style={{ width: "100%" }}
                        />
                        {Platform.OS === 'ios' && (
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                            className="bg-[#024e32] py-2.5 rounded-xl mt-1"
                            activeOpacity={0.8}
                          >
                            <Text className="text-white text-center font-semibold">Done</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

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
              <TouchableOpacity
                onPress={() => setHistoryModalVisible(false)}
                className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
                hitSlop={ICON_HIT_SLOP}
              >
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
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

                          {/* EDIT BUTTON — rewrites this same line in place.
                              Only shown where there is an amount to correct. */}
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

                  {/* Row total — always the authoritative saved figure */}
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

      {/* ===== EDIT PAYMENT LOG MODAL =====
          Presented only after the history modal has fully dismissed.
          Saving rewrites THIS log line — it never adds another one. */}
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