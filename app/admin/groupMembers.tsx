import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import BACKEND_URL from "../../config";

// ============ HELPER FUNCTION TO EXTRACT NUMERIC VALUE FROM ID ============
const extractNumberFromId = (id: string) => {
  if (!id) return 0;
  // Extract all numbers from the string
  const numbers = id.match(/\d+/g);
  if (!numbers) return 0;
  // Join all numbers and convert to integer
  return parseInt(numbers.join("")) || 0;
};

// ============ SORT MEMBERS BY GROUP MEMBER ID ============
const sortMembersById = (members: any[]) => {
  return [...members].sort((a, b) => {
    const numA = extractNumberFromId(a.groupMemberId);
    const numB = extractNumberFromId(b.groupMemberId);
    return numA - numB;
  });
};

// ============ PREMIUM SKELETON LOADER ============
const SkeletonLoader = ({
  isDesktopOrLaptop,
}: {
  isDesktopOrLaptop: boolean;
}) => {
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
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  const SkeletonCard = () => (
    <Animated.View
      style={{ opacity: skeletonOpacity }}
      className="bg-white rounded-2xl border border-gray-100 p-5 mb-4"
    >
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 bg-gray-200 rounded-full mr-3" />
        <View className="flex-1">
          <View className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <View className="h-4 bg-gray-200 rounded w-1/2" />
        </View>
      </View>
      <View className="flex-row justify-between">
        <View className="h-4 bg-gray-200 rounded w-1/3" />
        <View className="h-4 bg-gray-200 rounded w-1/4" />
      </View>
    </Animated.View>
  );

  if (isDesktopOrLaptop) {
    return (
      <View className="p-5 max-w-6xl mx-auto w-full">
        <View className="bg-white rounded-2xl p-8 mb-6 border border-gray-200">
          <View className="flex-row items-center mb-4">
            <View className="w-6 h-6 bg-gray-200 rounded" />
            <View className="h-6 bg-gray-200 rounded w-40 ml-2" />
          </View>
          <View className="flex-row gap-4">
            <View className="flex-1">
              <View className="h-14 bg-gray-200 rounded-xl mb-3" />
            </View>
            <View className="flex-1">
              <View className="h-14 bg-gray-200 rounded-xl mb-3" />
            </View>
          </View>
          <View className="h-12 bg-gray-200 rounded-xl" />
          <View className="mt-6 pt-6 border-t border-gray-200">
            <View className="flex-row items-center mb-4">
              <View className="w-6 h-6 bg-gray-200 rounded" />
              <View className="h-6 bg-gray-200 rounded w-40 ml-2" />
            </View>
            <View className="h-14 bg-gray-200 rounded-xl mb-3" />
            <View className="flex-row gap-4 mb-3">
              <View className="flex-1 h-14 bg-gray-200 rounded-xl" />
              <View className="flex-1 h-14 bg-gray-200 rounded-xl" />
            </View>
            <View className="h-14 bg-gray-200 rounded-xl mb-3" />
            <View className="h-12 bg-gray-200 rounded-xl" />
          </View>
        </View>
        <View className="mb-10">
          <View className="flex-row justify-between items-center mb-4">
            <View className="h-6 bg-gray-200 rounded w-40" />
            <View className="h-5 bg-gray-200 rounded w-32" />
          </View>
          {[1, 2, 3, 4].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="p-5">
      <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-200">
        <View className="flex-row items-center mb-4">
          <View className="w-6 h-6 bg-gray-200 rounded" />
          <View className="h-6 bg-gray-200 rounded w-40 ml-2" />
        </View>
        <View className="h-14 bg-gray-200 rounded-xl mb-3" />
        <View className="h-14 bg-gray-200 rounded-xl mb-4" />
        <View className="h-12 bg-gray-200 rounded-xl" />
        <View className="mt-6 pt-6 border-t border-gray-200">
          <View className="flex-row items-center mb-4">
            <View className="w-6 h-6 bg-gray-200 rounded" />
            <View className="h-6 bg-gray-200 rounded w-40 ml-2" />
          </View>
          <View className="h-14 bg-gray-200 rounded-xl mb-3" />
          <View className="h-14 bg-gray-200 rounded-xl mb-3" />
          <View className="h-14 bg-gray-200 rounded-xl mb-3" />
          <View className="h-14 bg-gray-200 rounded-xl mb-3" />
          <View className="h-12 bg-gray-200 rounded-xl" />
        </View>
      </View>
      <View className="mb-10">
        <View className="flex-row justify-between items-center mb-4">
          <View className="h-6 bg-gray-200 rounded w-40" />
          <View className="h-5 bg-gray-200 rounded w-32" />
        </View>
        {[1, 2, 3].map((item) => (
          <SkeletonCard key={item} />
        ))}
      </View>
    </View>
  );
};

export default function GroupMembers() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  const [refreshing, setRefreshing] = useState(false);

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState("");
  const [groupMemberId, setGroupMemberId] = useState("");

  // New fields for collection
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [collectionAmount, setCollectionAmount] = useState("");

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  // For web date input
  const [webStartDate, setWebStartDate] = useState("");
  const [webEndDate, setWebEndDate] = useState("");

  // Modals
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [editCollections, setEditCollections] = useState<any[]>([]);
  const [monthDropdownVisible, setMonthDropdownVisible] = useState(false);

  // Month config modal
  const [monthConfigModal, setMonthConfigModal] = useState(false);
  const [selectedMonthConfig, setSelectedMonthConfig] = useState<any>(null);

  // Payment history modal
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyMember, setHistoryMember] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editPaymentModal, setEditPaymentModal] = useState(false);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState(new Date());
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);

  // Admin table updates tracking
  const [adminUpdates, setAdminUpdates] = useState<any[]>([]);
  const [showAdminUpdates, setShowAdminUpdates] = useState(false);

  // Local storage for payments (fallback when backend fails)
  const [localPayments, setLocalPayments] = useState<Record<string, any[]>>({});

  // Confirmation modals
  const [addMemberConfirmModal, setAddMemberConfirmModal] = useState(false);
  const [addCollectionConfirmModal, setAddCollectionConfirmModal] =
    useState(false);

  // Generate months based on table columns (M1...Mn)
  const months = Array.from(
    { length: Math.max(...members.map((m) => m.collections?.length || 0), 0) },
    (_, i) => `M${i + 1}`,
  );

  //dividend amount ui
  const [dividend, setDividend] = useState("");

  // ✅ 6% fixed penalty
  const FIXED_PENALTY_PERCENTAGE = 6;

  const isAfterDueDate = (endDate: any) => {
    if (!endDate) return false;
    const due = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
    if (isNaN(due.getTime())) return false;
    due.setHours(23, 59, 59, 999);
    return new Date().getTime() > due.getTime();
  };

  // ✅ CUMULATIVE / COMPOUNDING penalty across all months for one member.
  //
  // Each overdue month's penalty is 6% of (that month's own unpaid
  // installment, frozen as of ITS OWN due date + every earlier month's
  // installment that was STILL UNPAID AS OF THIS MONTH'S OWN DUE DATE).
  // Two different "as of" points on purpose, and BOTH are frozen in time —
  // nothing here is ever computed against "today":
  //   - a month's OWN contribution is frozen using only payments made on
  //     or before ITS OWN due date, so a late payment can never shrink a
  //     charge that's already been assessed (and possibly already
  //     collected) for that same month.
  //   - the CARRY from an earlier month is frozen using only payments made
  //     on or before THIS month's own due date — i.e. whichever earlier
  //     months were still unpaid at the moment THIS month's penalty was
  //     assessed. Once that due date has passed, this never moves again,
  //     even if the earlier month gets paid off much later — a penalty
  //     that's already been assessed and declared stays fixed. (An
  //     earlier month that was already paid off BEFORE this month's due
  //     date is correctly excluded, since it genuinely wasn't outstanding
  //     "back then" either.)
  // New overdue months only ever ADD another increment on top of the
  // running total; an old month's own already-assessed increment never
  // changes.
  //
  // Example this matches: M1 ₹5000 unpaid → +₹300 (total ₹300). M2 also
  // ₹5000 unpaid while M1 remains unpaid as of M2's due date → base =
  // ₹5000 (M1 carried) + ₹5000 (M2) = ₹10,000 → +₹600 (total ₹900). That
  // ₹600 for M2 is now permanently fixed — even if M1 is paid off weeks
  // later, M2's penalty does NOT drop back down. If M2 itself gets fully
  // paid off before M3 becomes overdue, M3's carry only includes M1
  // (still unpaid as of M3's due date), not M2.
  const getCumulativePenaltyForMember = (
    collections: any[] | undefined,
    monthPlansMap: Record<number, any>,
  ) => {
    const sorted = [...(collections || [])]
      .filter((c) => c && c.installmentAmount)
      .sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    // Pending installment balance for `collection`, using only payments
    // made on or before `cutoffDate` (pass null to mean "right now",
    // i.e. every payment on record regardless of date — used only for
    // the live "Pending Installment" display, never for penalty carry).
    const pendingAsOfDate = (collection: any, cutoffDate: any) => {
      const installment = collection.installmentAmount || 0;
      const dividend = Number(monthPlansMap[collection.index]?.dividend || 0);
      const effectiveInstallment = Math.max(installment - dividend, 0);
      const payments = Array.isArray(collection.payments)
        ? collection.payments
        : [];

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

    // This month's own unpaid installment, frozen using only payments made
    // on or before ITS OWN due date.
    const unpaidAsOfOwnDueDate = (collection: any) =>
      pendingAsOfDate(collection, collection.endDate || null);

    // Current outstanding installment balance, right now, using every
    // payment on record regardless of when it was made. Used ONLY for the
    // live "Pending Installment" display — penalty carry uses
    // pendingAsOfDate(..., thisMonth.endDate) instead, so it freezes.
    const currentPendingInstallment = (collection: any) =>
      pendingAsOfDate(collection, null);

    const perMonth: {
      index: number;
      pendingInstallment: number;
      penaltyIncrement: number;
      penaltyPaid: number;
      pendingPenalty: number;
      cumulativeAssessed: number;
      // Breakdown of penaltyIncrement, for display: penaltyIncrement ≈
      // carriedPenaltyPart + ownPenaltyPart (may differ by ≤ ₹1 from
      // rounding the two parts separately vs. rounding the combined base).
      carriedFromMonths: number[];
      carriedPenaltyPart: number;
      ownPenaltyPart: number;
    }[] = [];

    let totalPenaltyAssessed = 0;
    let totalPenaltyPending = 0;

    sorted.forEach((c, i) => {
      const pendingInstallment = currentPendingInstallment(c);

      const payments = Array.isArray(c.payments) ? c.payments : [];
      const penaltyPaid = payments
        .filter((p: any) => p.paymentType === "PENALTY")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);

      let penaltyIncrement = 0;
      const carriedFromMonths: number[] = [];
      let carriedPenaltyPart = 0;
      let ownPenaltyPart = 0;

      if (c.endDate && isAfterDueDate(c.endDate)) {
        const thisMonthUnpaid = unpaidAsOfOwnDueDate(c);
        let carriedUnpaid = 0;
        for (let j = 0; j < i; j++) {
          // Freeze each earlier month's contribution as of THIS month's
          // own due date — not "today" — so this penalty, once assessed,
          // never changes based on when the earlier month eventually gets
          // paid off.
          const priorPending = pendingAsOfDate(sorted[j], c.endDate);
          if (priorPending > 0) {
            carriedUnpaid += priorPending;
            carriedFromMonths.push(sorted[j].index);
          }
        }

        const base = thisMonthUnpaid + carriedUnpaid;
        penaltyIncrement = Math.round((base * FIXED_PENALTY_PERCENTAGE) / 100);
        totalPenaltyAssessed += penaltyIncrement;

        // Split the same 6% across the two parts (6% is linear, so this
        // splits cleanly) purely so the UI can explain WHICH still-unpaid
        // month(s) this charge is coming from.
        carriedPenaltyPart = Math.round(
          (carriedUnpaid * FIXED_PENALTY_PERCENTAGE) / 100,
        );
        ownPenaltyPart = Math.round(
          (thisMonthUnpaid * FIXED_PENALTY_PERCENTAGE) / 100,
        );
      }

      const pendingPenalty = Math.max(penaltyIncrement - penaltyPaid, 0);
      totalPenaltyPending += pendingPenalty;

      perMonth.push({
        index: c.index,
        pendingInstallment,
        penaltyIncrement,
        penaltyPaid,
        pendingPenalty,
        cumulativeAssessed: totalPenaltyAssessed,
        carriedFromMonths,
        carriedPenaltyPart,
        ownPenaltyPart,
      });
    });

    return { perMonth, totalPenaltyAssessed, totalPenaltyPending };
  };

  // ✅ SAFE helper
  const getCollectionMeta = (collection: any) => {
    const installmentAmount = Number(
      collection?.installmentAmount ?? collection?.amount ?? 0,
    );
    const endDate = collection?.endDate ? new Date(collection.endDate) : null;
    return {
      installmentAmount,
      endDate,
    };
  };

  const [plansMap, setPlansMap] = useState<Record<number, any>>({});

  // Fetch members and admin updates
  const fetchMembers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}/members`);
      const data = await res.json();
      const groupRes = await fetch(`${BACKEND_URL}/groups/${groupId}`);
      const groupData = await groupRes.json();

      const tempPlansMap: Record<number, any> = {};
      (data.collectionPlans || []).forEach((p) => {
        tempPlansMap[p.monthIndex] = p;
      });

      setPlansMap(tempPlansMap);

      // Get members and sort them by groupMemberId numerically
      const fetchedMembers = (data.groupMembers || []).map((m) => ({
        ...m,
        collections: (m.collections || []).map((c) => ({
          ...c,
          installmentAmount:
            tempPlansMap[c.index]?.installmentAmount ??
            c.installmentAmount ??
            c.amount ??
            0,
          endDate: tempPlansMap[c.index]?.endDate
            ? new Date(tempPlansMap[c.index].endDate)
            : c.endDate
              ? new Date(c.endDate)
              : null,
          payments: (c.payments || []).map((p: any) => ({
            ...p,
            paidAt: p.paidAt || p.date || new Date().toISOString(),
            paymentType: p.paymentType || "INSTALLMENT",
          })),
        })),
      }));

      // ✅ SORT MEMBERS BY GROUP MEMBER ID (NUMERIC ORDER)
      const sortedMembers = sortMembersById(fetchedMembers);
      setMembers(sortedMembers);

      await fetchAdminUpdates();
    } catch (error) {
      console.log("Failed to load members:", error);
      Alert.alert(
        "Error",
        "Could not connect to the server. Pull to refresh to try again.",
      );
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMembers();
    } finally {
      setRefreshing(false);
    }
  };

  // Fetch admin updates
  const fetchAdminUpdates = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/admin/updates?groupId=${groupId}`,
      );
      const text = await res.text();
      if (text.startsWith("{") || text.startsWith("[")) {
        const data = JSON.parse(text);
        setAdminUpdates(data.updates || []);
      } else {
        console.log(
          "Non-JSON response from admin updates:",
          text.substring(0, 100),
        );
        setAdminUpdates([]);
      }
    } catch (error) {
      console.log("Could not fetch admin updates:", error);
      setAdminUpdates([]);
    }
  };

  const [currentEmployee, setCurrentEmployee] = useState<any>(null);

  useEffect(() => {
    const loadEmployee = async () => {
      const emp = await AsyncStorage.getItem("employeeInfo");
      if (emp) {
        const parsed = JSON.parse(emp);
        setCurrentEmployee(parsed);
        console.log("EMPLOYEE LOADED:", parsed);
      }
    };
    loadEmployee();
  }, []);

  useEffect(() => {
    fetchMembers();
  }, []);

  // Calculate total paid for a collection
  const getTotalPaid = (payments: any[]) => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // ✅ NEW: Calculate only penalty paid
  const getPenaltyPaid = (payments: any[]) => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments
      .filter((p) => p.paymentType === "PENALTY")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Generate unique ID for local payments
  const generatePaymentId = () => {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const openMonthConfig = async (monthIndex: number) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/${groupId}/collection-plan/${monthIndex}`,
      );
      const data = await res.json();

      if (!data) {
        Alert.alert("Info", "No collection plan set for this month");
        return;
      }

      setSelectedMonthConfig({
        monthIndex,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        installmentAmount: data.installmentAmount,
      });

      setMonthConfigModal(true);
    } catch {
      Alert.alert("Error", "Failed to load collection plan");
    }
  };

  // Add member with confirmation
  const handleAddMember = () => {
    if (!memberId || !groupMemberId) {
      Alert.alert("Error", "Member ID and Group Member ID are required");
      return;
    }

    const normalizedInput = groupMemberId.trim().toLowerCase();
    const alreadyExists = members.some(
      (m) => (m.groupMemberId || "").trim().toLowerCase() === normalizedInput,
    );

    if (alreadyExists) {
      Alert.alert(
        "Duplicate Group Member ID",
        `Group Member ID "${groupMemberId}" already exists. Please use a different ID.`,
      );
      return;
    }

    setAddMemberConfirmModal(true);
  };

  // Actually add member — backend is the source of truth now: on
  // failure we show an error and do NOT fabricate a local-only member,
  // so the list on screen never drifts from what the server actually
  // has (same reasoning as apps like Instagram/Flipkart, which never
  // show you data your account doesn't really have).
  const addMember = async () => {
    setAddMemberConfirmModal(false);

    try {
      const response = await fetch(`${BACKEND_URL}/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, groupMemberId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      Alert.alert("Success", `Member added with ID: ${groupMemberId}`);
      setMemberId("");
      setGroupMemberId("");
      await fetchMembers();
    } catch (error) {
      console.log("Failed to add member to backend:", error);
      Alert.alert(
        "Error",
        "Failed to add member. Please check your connection and try again.",
      );
    }
  };

  // Record admin update
  const recordAdminUpdate = async (updateData: any) => {
    try {
      await fetch(`${BACKEND_URL}/admin/updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          ...updateData,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.log("Failed to record admin update:", error);
    }
  };

  // Add collection with confirmation
  const handleAddCollection = () => {
    if (!selectedMonth || !startDate || !endDate || !collectionAmount) {
      Alert.alert("Error", "All fields are required");
      return;
    }
    setAddCollectionConfirmModal(true);
  };

  // Actually add collection — no local-only fallback: if the backend
  // call fails, nothing is applied on screen and the admin is told to
  // retry, so the plan shown always matches what's actually saved.
  const addCollection = async () => {
    setAddCollectionConfirmModal(false);

    const monthIndex = Number(selectedMonth.replace("M", ""));

    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/${groupId}/collection-plan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthIndex,
            startDate: tempStartDate,
            endDate: tempEndDate,
            installmentAmount: Number(collectionAmount),
            ...(dividend ? { dividend: Number(dividend) } : {}),
          }),
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      Alert.alert("Success", data.message || "Collection plan added");

      await recordAdminUpdate({
        type: "ADD_COLLECTION_PLAN",
        month: selectedMonth,
        amount: collectionAmount,
        details: `Added collection plan for ${selectedMonth} - ₹${collectionAmount}`,
      });

      setSelectedMonth("");
      setStartDate("");
      setEndDate("");
      setCollectionAmount("");
      setDividend("");
      await fetchMembers();
    } catch (error) {
      console.log("Failed to add collection plan:", error);
      Alert.alert(
        "Error",
        "Failed to save the collection plan. Please check your connection and try again.",
      );
    }
  };

  // Delete member
  const deleteMember = async () => {
    if (!memberToDelete) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/${groupId}/members/${memberToDelete.groupMemberId}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      await recordAdminUpdate({
        type: "DELETE_MEMBER",
        memberId: memberToDelete.memberId,
        details: `Deleted member ${memberToDelete.memberName} from group`,
      });

      setDeleteModalVisible(false);
      setMemberToDelete(null);
      Alert.alert("Success", "Member deleted");
      await fetchMembers();
    } catch (error) {
      console.log("Failed to delete member:", error);
      Alert.alert(
        "Error",
        "Failed to delete member. Please check your connection and try again.",
      );
    }
  };

  // Edit member collections
  const openEditModal = (member: any) => {
    setEditMember(member);
    setEditCollections(
      member.collections.map((c: any) => ({
        index: c.index,
        amount: c.amount ?? "",
        payments: c.payments || [],
      })),
    );
    setEditVisible(true);
  };

  const saveEdit = async () => {
    try {
      setMembers((prev) =>
        prev.map((m) => {
          if (m._id === editMember._id) {
            return {
              ...m,
              collections: editCollections.map((c) => ({
                ...c,
                amount: Number(c.amount) || 0,
              })),
            };
          }
          return m;
        }),
      );

      await recordAdminUpdate({
        type: "UPDATE_COLLECTIONS",
        memberId: editMember.memberId,
        details: `Updated collections for ${editMember.memberName}`,
      });

      setEditVisible(false);
      setEditMember(null);
      Alert.alert("Success", "Collections updated");
    } catch (error) {
      Alert.alert("Error", "Failed to save changes");
    }
  };

  // Get max months
  const getMaxCollections = () =>
    Math.max(...members.map((m) => m.collections?.length || 0), 0);

  // Date picker functions
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setTempStartDate(selectedDate);
      setStartDate(formatDate(selectedDate));
    }
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setTempEndDate(selectedDate);
      setEndDate(formatDate(selectedDate));
    }
  };

  const onPaymentDateChange = (event: any, selectedDate?: Date) => {
    setShowPaymentDatePicker(false);
    if (selectedDate) {
      setEditPaymentDate(selectedDate);
    }
  };

  // For web date input (native HTML input)
  const handleWebStartDateChange = (e: any) => {
    const value = e.target.value;
    setWebStartDate(value);
    if (value) {
      const date = new Date(value);
      setTempStartDate(date);
      setStartDate(formatDate(date));
    }
  };

  const handleWebEndDateChange = (e: any) => {
    const value = e.target.value;
    setWebEndDate(value);
    if (value) {
      const date = new Date(value);
      setTempEndDate(date);
      setEndDate(formatDate(date));
    }
  };

  // Platform-specific date input
  const renderDateInput = (
    value: string,
    placeholder: string,
    onPress: () => void,
    webValue: string,
    onChangeWeb: (e: any) => void,
  ) => {
    if (Platform.OS === "web") {
      return (
        <input
          type="date"
          value={webValue}
          onChange={onChangeWeb}
          className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl w-full"
          style={{
            fontSize: "16px",
            color: webValue ? "#1f2937" : "#6b7280",
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        />
      );
    }

    return (
      <TouchableOpacity
        onPress={onPress}
        className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl flex-row justify-between items-center"
        activeOpacity={0.8}
      >
        <Text
          className={`${value ? "text-gray-800 font-medium" : "text-gray-500"}`}
        >
          {value || placeholder}
        </Text>
        <MaterialIcons name="calendar-today" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  // Open edit payment modal
  const openEditPaymentModal = (
    payment: any,
    monthIndex: number,
    paymentIndex: number,
  ) => {
    console.log("Opening edit for payment:", payment);

    if (!historyMember) {
      Alert.alert("Error", "Member data not found");
      return;
    }

    const paymentWithId = {
      ...payment,
      __pid: payment.__pid || payment.id || payment._id || generatePaymentId(),
    };

    setEditingPayment({
      ...paymentWithId,
      monthIndex,
      paymentIndex,
      member: historyMember,
    });

    setEditPaymentAmount(payment.amount.toString());
    setEditPaymentDate(new Date(payment.paidAt || payment.date || new Date()));
    setHistoryVisible(false);

    setTimeout(() => {
      setEditPaymentModal(true);
    }, 250);
  };

  // Save edited payment
  const saveEditedPayment = async () => {
    if (!editingPayment || !editPaymentAmount) return;

    const newAmount = parseFloat(editPaymentAmount);

    try {
      await fetch(
        `${BACKEND_URL}/groups/${groupId}/members/${editingPayment.member.groupMemberId}/payments/${editingPayment.monthIndex}/${editingPayment.paymentIndex}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthIndex: editingPayment.monthIndex,
            amount: newAmount,
            paidAt: editPaymentDate.toISOString(),
          }),
        },
      );

      setMembers((prev) =>
        prev.map((m) => {
          if (m.groupMemberId !== editingPayment.member.groupMemberId) return m;
          return {
            ...m,
            collections: m.collections.map((c: any) => {
              if (c.index !== editingPayment.monthIndex) return c;
              const payments = [...c.payments];
              payments[editingPayment.paymentIndex] = {
                ...payments[editingPayment.paymentIndex],
                amount: newAmount,
                paidAt: editPaymentDate.toISOString(),
                paymentType:
                  payments[editingPayment.paymentIndex].paymentType ||
                  "INSTALLMENT",
              };
              return { ...c, payments };
            }),
          };
        }),
      );

      setEditPaymentModal(false);
      setEditingPayment(null);

      Alert.alert("Success", "Payment updated successfully");
      setTimeout(() => {
        fetchMembers();
      }, 300);
    } catch (err) {
      Alert.alert("Error", "Failed to update payment");
    }
  };

  // Delete payment
  const deleteNow = async (monthIndex: number, paymentIndex: number) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/${groupId}/members/${historyMember.groupMemberId}/payments/${monthIndex}/${paymentIndex}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        Alert.alert("Error", "Payment not found");
        return;
      }

      setHistoryMember((prev: any) => ({
        ...prev,
        collections: prev.collections.map((c: any) => {
          if (c.index !== monthIndex) return c;
          const updatedPayments = [...(c.payments || [])];
          updatedPayments.splice(paymentIndex, 1);
          return { ...c, payments: updatedPayments };
        }),
      }));

      Alert.alert("Success", "Deleted successfully ✅");
    } catch {
      Alert.alert("Error", "Delete failed");
    }
  };

  const deletePayment = (
    payment: any,
    monthIndex: number,
    paymentIndex: number,
  ) => {
    if (paymentIndex < 0) {
      Alert.alert("Not Allowed", "Dividend cannot be deleted");
      return;
    }

    if (Platform.OS === "web") {
      const ok = window.confirm(`Delete payment ₹${payment.amount}?`);
      if (!ok) return;
      deleteNow(monthIndex, paymentIndex);
      return;
    }

    Alert.alert(
      "Delete Payment",
      `Are you sure you want to delete ₹${payment.amount}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteNow(monthIndex, paymentIndex),
        },
      ],
    );
  };

  // ✅ FULL TABLE PRINT — works on Web, iOS and Android
  const printFullTable = async () => {
    const maxMonths = getMaxCollections();

    let html = `
      <html>
      <head>
        <title>Group Members Full Report</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          h2 { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #333; padding: 6px; text-align: center; }
          th { background: #024e32; color: white; }
          tr:nth-child(even) { background: #f2f2f2; }
          .dividend { font-size: 10px; color: blue; }
          .penalty { color: red; font-weight: bold; }
          .paid { color: green; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>Group Members Report - Group ${groupId}</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Member ID</th>
              <th>Group Member ID</th>
    `;

    for (let i = 1; i <= maxMonths; i++) {
      html += `<th>M${i}</th>`;
    }

    html += `<th>Total Penalty</th>`;
    html += `
            </tr>
          </thead>
          <tbody>
    `;

    members.forEach((m) => {
      const { totalPenaltyPending } = getCumulativePenaltyForMember(
        m.collections,
        plansMap,
      );
      const totalPenalty = totalPenaltyPending;

      html += `
        <tr>
          <td>${m.memberName || "-"}</td>
          <td>${m.phone || "-"}</td>
          <td>${m.memberId}</td>
          <td>${m.groupMemberId}</td>
      `;

      for (let idx = 0; idx < maxMonths; idx++) {
        const c = m.collections?.[idx];

        if (!c) {
          html += `<td>-</td>`;
          continue;
        }

        const installmentPaid = (c.payments || [])
          .filter((p) => p.paymentType !== "PENALTY")
          .reduce((s, p) => s + (p.amount || 0), 0);

        const dividend = Number(plansMap[c.index]?.dividend || 0);
        const totalPaid = dividend + installmentPaid;
        const installmentAmount = c.installmentAmount || 0;

        html += `
          <td>
            ₹${totalPaid} / ₹${installmentAmount}
            ${dividend > 0 ? `<div class="dividend">Div: ₹${dividend}</div>` : ""}
          </td>
        `;
      }

      html += `
        <td class="${totalPenalty > 0 ? "penalty" : "paid"}">
          ${totalPenalty > 0 ? `₹${totalPenalty}` : "✔ Paid"}
        </td>
      `;

      html += `</tr>`;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    if (Platform.OS === "web") {
      // On web, keep the familiar "open a print-ready window" flow.
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        Alert.alert("Error", "Please allow pop-ups to print the report.");
        return;
      }
      printWindow.document.write(
        html.replace(
          "</body>",
          `<script>window.print(); window.onafterprint = () => window.close();</script></body>`,
        ),
      );
      printWindow.document.close();
      return;
    }

    // On iOS and Android, hand the same HTML to expo-print, which opens the
    // native print / "Save as PDF" sheet — no browser or pop-up needed.
    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.log("Failed to print:", error);
      Alert.alert(
        "Error",
        "Could not open the print dialog. Please try again.",
      );
    }
  };

  // ✅ SINGLE MEMBER HISTORY PRINT — same Web/iOS/Android pattern as
  // printFullTable above, but scoped to just the member currently open
  // in the Payment History modal: every month's installment/dividend/
  // penalty breakdown plus the full payment-by-payment list, so admins
  // can hand a customer (or file) a clean printed/PDF record of just
  // their account instead of the whole group table.
  const printMemberHistory = async (member: any) => {
    if (!member) {
      Alert.alert("Error", "No member selected to print");
      return;
    }

    const collections = member.collections || [];
    const { perMonth, totalPenaltyPending } = getCumulativePenaltyForMember(
      collections,
      plansMap,
    );

    const validRows = collections
      .map((c: any) => ({ c, meta: getCollectionMeta(c) }))
      .filter(({ meta }: any) => meta.installmentAmount && meta.endDate);

    let totalInstallment = 0;
    let totalPaidInstallment = 0;
    let totalDividend = 0;

    let rowsHtml = "";

    validRows.forEach(({ c, meta }: any) => {
      const { installmentAmount, endDate } = meta;
      const rowPosition = perMonth.findIndex((row) => row.index === c.index);
      const penaltyRow = rowPosition >= 0 ? perMonth[rowPosition] : null;

      const pendingInstallment = penaltyRow?.pendingInstallment ?? 0;
      const penaltyIncrement = penaltyRow?.penaltyIncrement ?? 0;
      const pendingPenalty = penaltyRow?.pendingPenalty ?? 0;

      const installmentPaid = (c.payments || [])
        .filter((p: any) => p.paymentType !== "PENALTY")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      const dividend = Number(plansMap[c?.index]?.dividend || 0);
      const displayPaid = dividend + installmentPaid;

      totalInstallment += installmentAmount;
      totalPaidInstallment += installmentPaid;
      totalDividend += dividend;

      const isFullyClear = pendingInstallment === 0 && pendingPenalty === 0;
      const isOverdue = isAfterDueDate(c.endDate);
      const statusLabel = isFullyClear
        ? "Fully Paid"
        : isOverdue
          ? "Overdue"
          : "Pending";
      const statusClass = isFullyClear
        ? "paid"
        : isOverdue
          ? "penalty"
          : "due";

      const dividendPayment =
        dividend > 0
          ? [
              {
                amount: dividend,
                paidAt: c.startDate || new Date(),
                paymentType: "DIVIDEND",
                collectedBy: "System",
              },
            ]
          : [];
      const allPayments = [...dividendPayment, ...(c.payments || [])];

      const paymentsHtml =
        allPayments.length === 0
          ? `<div class="no-payments">No payments recorded</div>`
          : allPayments
              .map(
                (p: any) => `
                  <div class="payment-line">
                    <span class="ptype ptype-${(p.paymentType || "INSTALLMENT").toLowerCase()}">${p.paymentType || "INSTALLMENT"}</span>
                    <span>₹${p.amount}</span>
                    <span class="pdate">${new Date(p.paidAt).toLocaleDateString("en-IN")} • ${p.collectedBy || "System"} • ${p.paymentMode || "Cash"}</span>
                  </div>
                `,
              )
              .join("");

      rowsHtml += `
        <div class="month-card">
          <div class="month-header">
            <div>
              <span class="month-badge">M${c.index}</span>
              <span class="month-title">Month ${c.index} · ₹${installmentAmount}</span>
              ${endDate ? `<span class="due-date">Due ${new Date(endDate).toLocaleDateString("en-IN")}</span>` : ""}
            </div>
            <span class="status status-${statusClass}">${statusLabel}</span>
          </div>
          <div class="month-summary">
            Paid ₹${displayPaid} / ₹${installmentAmount}
            ${penaltyIncrement > 0 ? `&nbsp;•&nbsp;<span class="penalty-text">Penalty (6%) ₹${pendingPenalty}${pendingPenalty !== penaltyIncrement ? ` of ₹${penaltyIncrement}` : ""}</span>` : ""}
            ${
              penaltyRow && penaltyRow.carriedFromMonths.length > 0
                ? `<div class="carry-text">M${penaltyRow.carriedFromMonths.join("+M")} ₹${penaltyRow.carriedPenaltyPart} previous + M${c.index} ₹${penaltyRow.ownPenaltyPart} current = ₹${penaltyRow.carriedPenaltyPart + penaltyRow.ownPenaltyPart} total</div>`
                : ""
            }
          </div>
          <div class="payments">
            ${paymentsHtml}
          </div>
        </div>
      `;
    });

    const printedOn = new Date().toLocaleString("en-IN");

    const html = `
      <html>
      <head>
        <title>Payment History - ${member.memberName || "Member"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 24px; }
          .header h2 { margin: 0 0 4px 0; color: #024e32; }
          .header .sub { color: #6b7280; font-size: 13px; }
          .info-box { border: 1px solid #d1d5db; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; flex-wrap: wrap; gap: 16px; }
          .info-item { min-width: 160px; }
          .info-item .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
          .info-item .value { font-size: 14px; font-weight: bold; color: #111827; }
          .summary { display: flex; gap: 12px; margin-bottom: 22px; flex-wrap: wrap; }
          .summary-box { flex: 1; min-width: 140px; border: 1px solid #d1d5db; border-radius: 10px; padding: 12px 14px; text-align: center; }
          .summary-box .label { font-size: 11px; color: #6b7280; }
          .summary-box .value { font-size: 18px; font-weight: bold; color: #024e32; margin-top: 2px; }
          .month-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; page-break-inside: avoid; }
          .month-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
          .month-badge { background: #eafaf1; color: #024e32; font-weight: bold; padding: 3px 8px; border-radius: 6px; font-size: 12px; margin-right: 8px; }
          .month-title { font-weight: bold; font-size: 14px; }
          .due-date { color: #9ca3af; font-size: 11px; margin-left: 10px; }
          .status { font-size: 11px; font-weight: bold; padding: 3px 10px; border-radius: 999px; }
          .status-paid { background: #dcfce7; color: #16a34a; }
          .status-penalty { background: #fee2e2; color: #dc2626; }
          .status-due { background: #fef3c7; color: #b45309; }
          .month-summary { font-size: 12.5px; color: #4b5563; margin-bottom: 8px; }
          .penalty-text { color: #dc2626; font-weight: bold; }
          .carry-text { color: #dc2626; font-size: 11px; margin-top: 2px; }
          .payments { border-top: 1px dashed #e5e7eb; padding-top: 8px; }
          .payment-line { display: flex; justify-content: space-between; font-size: 12.5px; padding: 4px 0; border-bottom: 1px solid #f3f4f6; }
          .payment-line:last-child { border-bottom: none; }
          .ptype { font-weight: bold; font-size: 10.5px; padding: 2px 6px; border-radius: 5px; }
          .ptype-installment { background: #dcfce7; color: #16a34a; }
          .ptype-penalty { background: #fee2e2; color: #dc2626; }
          .ptype-dividend { background: #dbeafe; color: #2563eb; }
          .pdate { color: #9ca3af; }
          .no-payments { color: #9ca3af; font-size: 12px; padding: 6px 0; }
          .footer { margin-top: 26px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; color: #6b7280; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>MANIKYA CHITS PVT LTD</h2>
          <div class="sub">Member Payment History</div>
        </div>

        <div class="info-box">
          <div class="info-item">
            <div class="label">Member Name</div>
            <div class="value">${member.memberName || "-"}</div>
          </div>
          <div class="info-item">
            <div class="label">Member ID</div>
            <div class="value">${member.memberId || "-"}</div>
          </div>
          <div class="info-item">
            <div class="label">Group Member ID</div>
            <div class="value">${member.groupMemberId || "-"}</div>
          </div>
          <div class="info-item">
            <div class="label">Phone</div>
            <div class="value">${member.phone || "-"}</div>
          </div>
          <div class="info-item">
            <div class="label">Group</div>
            <div class="value">${groupId}</div>
          </div>
        </div>

        <div class="summary">
          <div class="summary-box">
            <div class="label">Total Installment</div>
            <div class="value">₹${totalInstallment}</div>
          </div>
          <div class="summary-box">
            <div class="label">Installment Paid</div>
            <div class="value">₹${totalPaidInstallment}</div>
          </div>
          <div class="summary-box">
            <div class="label">Dividend</div>
            <div class="value">₹${totalDividend}</div>
          </div>
          <div class="summary-box">
            <div class="label">Pending Penalty</div>
            <div class="value">₹${totalPenaltyPending}</div>
          </div>
        </div>

        ${rowsHtml || `<div class="no-payments">No collection data available</div>`}

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
          `<script>window.print(); window.onafterprint = () => window.close();</script></body>`,
        ),
      );
      printWindow.document.close();
      return;
    }

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.log("Failed to print member history:", error);
      Alert.alert(
        "Error",
        "Could not open the print dialog. Please try again.",
      );
    }
  };

  // ============ RENDER CONFIRMATION MODALS ============

  // Add Member Confirmation Modal
  const renderAddMemberConfirmModal = () => (
    <Modal visible={addMemberConfirmModal} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
          <View className="items-center mb-4">
            <View className="bg-[#024e32]/10 p-4 rounded-full">
              <MaterialIcons name="person-add" size={50} color="#024e32" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 mt-3">
              Confirm Add Member
            </Text>
            <Text className="text-gray-500 text-center mt-1">
              Please verify the member details below
            </Text>
          </View>

          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <View className="bg-white rounded-lg p-4 space-y-3">
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">Member ID</Text>
                <Text className="text-gray-800 font-bold">{memberId}</Text>
              </View>
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600 font-medium">
                  Group Member ID
                </Text>
                <Text className="text-[#024e32] font-bold text-lg">
                  {groupMemberId}
                </Text>
              </View>
            </View>
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setAddMemberConfirmModal(false)}
              className="flex-1 bg-gray-200 py-3.5 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 text-center font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={addMember}
              className="flex-1 bg-[#024e32] py-3.5 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Add Collection Confirmation Modal
  const renderAddCollectionConfirmModal = () => (
    <Modal visible={addCollectionConfirmModal} transparent animationType="fade">
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
          <View className="items-center mb-4">
            <View className="bg-[#047857]/10 p-4 rounded-full">
              <MaterialIcons name="attach-money" size={50} color="#047857" />
            </View>
            <Text className="text-2xl font-bold text-gray-800 mt-3">
              Confirm Collection
            </Text>
            <Text className="text-gray-500 text-center mt-1">
              Please verify the collection details below
            </Text>
          </View>

          <View className="bg-gray-50 rounded-xl p-4 mb-4">
            <View className="bg-white rounded-lg p-4 space-y-3">
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">Month</Text>
                <Text className="text-gray-800 font-bold">{selectedMonth}</Text>
              </View>
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">Start Date</Text>
                <Text className="text-gray-800 font-bold">{startDate}</Text>
              </View>
              <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                <Text className="text-gray-600 font-medium">End Date</Text>
                <Text className="text-gray-800 font-bold">{endDate}</Text>
              </View>
              <View className="flex-row justify-between items-center py-2">
                <Text className="text-gray-600 font-medium">Amount</Text>
                <Text className="text-[#047857] font-bold text-lg">
                  ₹{collectionAmount}
                </Text>
              </View>
              {dividend && (
                <View className="flex-row justify-between items-center py-2 border-t border-gray-100">
                  <Text className="text-gray-600 font-medium">Dividend</Text>
                  <Text className="text-blue-600 font-bold">₹{dividend}</Text>
                </View>
              )}
            </View>
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setAddCollectionConfirmModal(false)}
              className="flex-1 bg-gray-200 py-3.5 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 text-center font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={addCollection}
              className="flex-1 bg-[#047857] py-3.5 rounded-xl"
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // ============ MAIN RENDER ============

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* Header */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.back()} className="mt-1">
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4 mt-1">
              Group: {groupId}
            </Text>
          </View>

          <View className="flex-row items-center space-x-3">
            <TouchableOpacity
              onPress={printFullTable}
              className="bg-white/20 px-3 py-1 rounded-full flex-row items-center"
            >
              <MaterialIcons name="print" size={16} color="white" />
              <Text className="text-white text-sm ml-1">Print</Text>
            </TouchableOpacity>

           {/* <TouchableOpacity
              onPress={() => setShowAdminUpdates(true)}
              className="bg-white/20 px-3 py-1 rounded-full flex-row items-center"
            >
              <MaterialIcons name="history" size={16} color="white" />
              <Text className="text-white text-sm ml-1">Updates</Text>
              {adminUpdates.length > 0 && (
                <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center ml-2">
                  <Text className="text-white text-xs">
                    {adminUpdates.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>*/}
          </View>
        </View>
      </View>

      {/* Confirmation Modals */}
      {renderAddMemberConfirmModal()}
      {renderAddCollectionConfirmModal()}

      {/* Content */}
      <View className="flex-1" style={{ paddingTop: 110 }}>
        {loading ? (
          <SkeletonLoader isDesktopOrLaptop={isDesktopOrLaptop} />
        ) : (
          <ScrollView
            className="flex-1"
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
            {/* ADD FORM */}
            <View
              className={`p-5 ${isDesktopOrLaptop ? "max-w-6xl mx-auto w-full" : ""}`}
            >
              <View
                className={`bg-white rounded-2xl p-5 mb-6 border border-gray-200 ${isDesktopOrLaptop ? "p-8" : ""}`}
              >
                <View className="flex-row items-center mb-4">
                  <MaterialIcons name="person-add" size={24} color="#024e32" />
                  <Text
                    className={`font-bold text-gray-800 ml-2 ${isDesktopOrLaptop ? "text-xl" : "text-lg"}`}
                  >
                    Add New Member
                  </Text>
                </View>

                <View
                  className={`${isDesktopOrLaptop ? "flex-row gap-4" : ""}`}
                >
                  <View className={`${isDesktopOrLaptop ? "flex-1" : ""}`}>
                    <TextInput
                      placeholder="Member ID"
                      value={memberId}
                      onChangeText={setMemberId}
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl mb-3"
                    />
                  </View>
                  <View className={`${isDesktopOrLaptop ? "flex-1" : ""}`}>
                    <TextInput
                      placeholder="Group Member ID (e.g., MB01)"
                      value={groupMemberId}
                      onChangeText={setGroupMemberId}
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl mb-4"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleAddMember}
                  className="bg-[#024e32] py-3 rounded-xl active:opacity-90"
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Add Member
                  </Text>
                </TouchableOpacity>

                {/* COLLECTION SECTION */}
                <View className="mt-6 pt-6 border-t border-gray-200">
                  <View className="flex-row items-center mb-4">
                    <MaterialIcons
                      name="attach-money"
                      size={24}
                      color="#024e32"
                    />
                    <Text
                      className={`font-bold text-gray-800 ml-2 ${isDesktopOrLaptop ? "text-xl" : "text-lg"}`}
                    >
                      Add Collection
                    </Text>
                  </View>

                  {/* MONTH DROPDOWN */}
                  <View className="mb-3">
                    <Text className="text-gray-600 mb-2">
                      Select Collection Month
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setMonthDropdownVisible(!monthDropdownVisible)
                      }
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl flex-row justify-between items-center"
                      activeOpacity={0.8}
                    >
                      <Text
                        className={`${selectedMonth ? "text-gray-800 font-medium" : "text-gray-500"}`}
                      >
                        {selectedMonth || "Select month (M1, M2, M3...)"}
                      </Text>
                      <MaterialIcons
                        name={
                          monthDropdownVisible ? "expand-less" : "expand-more"
                        }
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>

                    {monthDropdownVisible && (
                      <View className="bg-white border border-gray-300 rounded-xl mt-1 max-h-64 overflow-hidden shadow-sm">
                        <ScrollView
                          className="max-h-64"
                          showsVerticalScrollIndicator={true}
                          nestedScrollEnabled={true}
                        >
                          {months.map((month) => (
                            <TouchableOpacity
                              key={month}
                              onPress={() => {
                                setSelectedMonth(month);
                                setMonthDropdownVisible(false);
                              }}
                              className={`px-4 py-3 border-b border-gray-100 ${
                                selectedMonth === month ? "bg-[#024e32]/10" : ""
                              }`}
                              activeOpacity={0.7}
                            >
                              <View className="flex-row items-center">
                                <MaterialIcons
                                  name="calendar-today"
                                  size={18}
                                  color={
                                    selectedMonth === month ? "#024e32" : "#666"
                                  }
                                  style={{ marginRight: 10 }}
                                />
                                <Text
                                  className={`text-base ${
                                    selectedMonth === month
                                      ? "text-[#024e32] font-semibold"
                                      : "text-gray-700"
                                  }`}
                                >
                                  {month}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  {/* DATE FIELDS */}
                  <View
                    className={`mb-3 ${isDesktopOrLaptop ? "flex-row gap-4" : "space-y-3"}`}
                  >
                    <View className={`${isDesktopOrLaptop ? "flex-1" : ""}`}>
                      <Text className="text-gray-600 mb-2">Start Date</Text>
                      {renderDateInput(
                        startDate,
                        "Select start date",
                        () => setShowStartDatePicker(true),
                        webStartDate,
                        handleWebStartDateChange,
                      )}
                    </View>
                    <View className={`${isDesktopOrLaptop ? "flex-1" : ""}`}>
                      <Text className="text-gray-600 mb-2">End Date</Text>
                      {renderDateInput(
                        endDate,
                        "Select end date",
                        () => setShowEndDatePicker(true),
                        webEndDate,
                        handleWebEndDateChange,
                      )}
                    </View>
                  </View>

                  {/* DATE PICKERS (MOBILE ONLY) */}
                  {Platform.OS !== "web" && showStartDatePicker && (
                    <DateTimePicker
                      value={tempStartDate}
                      mode="date"
                      display="default"
                      onChange={onStartDateChange}
                    />
                  )}

                  {Platform.OS !== "web" && showEndDatePicker && (
                    <DateTimePicker
                      value={tempEndDate}
                      mode="date"
                      display="default"
                      onChange={onEndDateChange}
                    />
                  )}

                  {/* AMOUNT FIELD */}
                  <View className="mb-4">
                    <Text className="text-gray-600 mb-2">
                      Collection Amount (₹)
                    </Text>
                    <TextInput
                      placeholder="Enter amount"
                      value={collectionAmount}
                      onChangeText={setCollectionAmount}
                      keyboardType="numeric"
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl text-lg"
                    />
                  </View>

                  {/* DIVIDEND */}
                  <View className="mb-4">
                    <Text className="text-gray-600 mb-2">
                      Dividend (optional – after auction)
                    </Text>
                    <TextInput
                      placeholder="Enter dividend amount"
                      value={dividend}
                      onChangeText={setDividend}
                      keyboardType="numeric"
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl text-lg"
                    />
                  </View>

                  {/* ADD COLLECTION BUTTON */}
                  <TouchableOpacity
                    onPress={handleAddCollection}
                    className="bg-[#047857] py-3 rounded-xl active:opacity-90"
                    activeOpacity={0.8}
                  >
                    <View className="flex-row items-center justify-center">
                      <MaterialIcons
                        name="attach-money"
                        size={22}
                        color="white"
                      />
                      <Text className="text-white text-center font-semibold text-lg ml-2">
                        Add Collection
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* INFO TEXT */}
                  <View className="mt-3 bg-blue-50 rounded-xl p-3">
                    <View className="flex-row items-center">
                      <MaterialIcons name="info" size={18} color="#3b82f6" />
                      <Text className="text-blue-700 text-sm ml-2">
                        Track collections, due dates, and calculate member dues
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* TABLE */}
              <View className="mb-10">
                <View className="flex-row justify-between items-center mb-4">
                  <Text
                    className={`font-bold text-gray-800 ${isDesktopOrLaptop ? "text-xl" : "text-lg"}`}
                  >
                    Members ({members.length})
                  </Text>
                  <View className="flex-row items-center">
                    <MaterialIcons name="info" size={18} color="#6b7280" />
                    <Text className="text-gray-600 text-sm ml-1">
                      Scroll → to see all columns
                    </Text>
                  </View>
                </View>

                {members.length === 0 ? (
                  <View className="bg-gray-50 rounded-2xl p-8 items-center">
                    <MaterialIcons name="people" size={50} color="#d1d5db" />
                    <Text className="text-gray-500 text-lg mt-3">
                      No members in this group
                    </Text>
                    <Text className="text-gray-400 text-center mt-2">
                      Add members using the form above
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row">
                    {/* FIXED NAME COLUMN */}
                    <View className="border border-gray-300 border-r-0 rounded-l-xl overflow-hidden">
                      <View className="bg-[#024e32] py-3 px-3">
                        <Text
                          className={`text-white font-semibold text-center ${isDesktopOrLaptop ? "w-40" : "w-28"}`}
                        >
                          Name
                        </Text>
                      </View>
                      {members.map((m, i) => (
                        <View
                          key={i}
                          className={`px-3 ${
                            i % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                          style={{ minHeight: 70, justifyContent: "center" }}
                        >
                          <Text
                            className={`text-gray-800 text-center text-sm ${isDesktopOrLaptop ? "w-40" : "w-28"}`}
                          >
                            {m.memberName || "-"}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* SCROLLABLE COLUMNS */}
                    <ScrollView horizontal className="flex-5">
                      <View className="border border-gray-300 border-l-0 rounded-r-xl overflow-hidden">
                        <View className="bg-[#024e32] flex-row py-3 px-3">
                          <Text
                            className={`text-white font-semibold text-center ${isDesktopOrLaptop ? "w-32" : "w-28"}`}
                          >
                            Phone
                          </Text>
                          <Text
                            className={`text-white font-semibold text-center ${isDesktopOrLaptop ? "w-36" : "w-28"}`}
                          >
                            Member ID
                          </Text>
                          <Text
                            className={`text-white font-semibold text-center ${isDesktopOrLaptop ? "w-44" : "w-36"}`}
                          >
                            Group Member ID
                          </Text>
                          {Array.from({ length: getMaxCollections() }).map(
                            (_, i) => (
                              <TouchableOpacity
                                key={i}
                                className={`text-white font-semibold text-center ${isDesktopOrLaptop ? "w-32" : "w-24"}`}
                                onPress={() => openMonthConfig(i + 1)}
                              >
                                <Text className="text-white font-semibold text-center">
                                  M{i + 1}
                                </Text>
                              </TouchableOpacity>
                            ),
                          )}
                          <Text
                            className={`text-white font-semibold text-center ${isDesktopOrLaptop ? "w-32" : "w-24"}`}
                          >
                            Penalty
                          </Text>
                          <Text
                            className={`text-white font-semibold text-center ${isDesktopOrLaptop ? "w-32" : "w-24"}`}
                          >
                            Actions
                          </Text>
                        </View>
                        {members.map((m, i) => (
                          <View
                            key={i}
                            className={`flex-row px-3 ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                            style={{ minHeight: 70, alignItems: "center" }}
                          >
                            <Text
                              className={`text-gray-800 text-center text-sm ${isDesktopOrLaptop ? "w-32" : "w-24"}`}
                            >
                              {m.phone || "-"}
                            </Text>
                            <Text
                              className={`text-gray-800 text-center text-sm ${isDesktopOrLaptop ? "w-36" : "w-28"}`}
                            >
                              {m.memberId}
                            </Text>
                            <Text
                              className={`text-gray-800 text-center text-sm font-medium ${isDesktopOrLaptop ? "w-44" : "w-36"}`}
                            >
                              {m.groupMemberId}
                            </Text>
                            {Array.from({ length: getMaxCollections() }).map(
                              (_, idx) => {
                                const c = m.collections?.[idx];
                                const totalPaid = (c?.payments || [])
                                  .filter((p) => p.paymentType !== "PENALTY")
                                  .reduce((s, p) => s + (p.amount || 0), 0);
                                const monthDividend = Number(
                                  plansMap[c?.index]?.dividend || 0,
                                );
                                const displayPaid = monthDividend + totalPaid;

                                return (
                                  <View
                                    key={idx}
                                    className={`text-center ${isDesktopOrLaptop ? "w-32" : "w-24"}`}
                                  >
                                    <Text className="text-gray-800 text-center text-sm">
                                      {c
                                        ? `₹${displayPaid} / ₹${c.installmentAmount}`
                                        : "-"}
                                    </Text>
                                    {monthDividend > 0 && (
                                      <Text className="text-blue-600 text-xs">
                                        Dividend ₹{monthDividend}
                                      </Text>
                                    )}
                                  </View>
                                );
                              },
                            )}

                            {/* Penalty Column */}
                            <View
                              className={`text-center ${isDesktopOrLaptop ? "w-32" : "w-24"}`}
                            >
                              {(() => {
                                const { perMonth, totalPenaltyPending } =
                                  getCumulativePenaltyForMember(
                                    m.collections,
                                    plansMap,
                                  );
                                const totalPenalty = totalPenaltyPending;
                                const hasAnyPenalty = perMonth.some(
                                  (row) => row.penaltyIncrement > 0,
                                );
                                return (
                                  <Text
                                    className={`text-center text-sm font-semibold ${
                                      totalPenalty > 0
                                        ? "text-red-600"
                                        : hasAnyPenalty
                                          ? "text-green-600"
                                          : "text-gray-400"
                                    }`}
                                  >
                                    {totalPenalty > 0
                                      ? `₹${totalPenalty}`
                                      : hasAnyPenalty
                                        ? "✔"
                                        : "-"}
                                  </Text>
                                );
                              })()}
                            </View>
                            <View
                              className={`flex-row justify-center space-x-4 ${isDesktopOrLaptop ? "w-32" : "w-24"}`}
                              style={{ gap: 14 }}
                            >
                              <TouchableOpacity
                                onPress={() => {
                                  setHistoryMember(m);
                                  setHistoryVisible(true);
                                }}
                              >
                                <MaterialIcons
                                  name="history"
                                  size={20}
                                  color="#2563eb"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setMemberToDelete(m);
                                  setDeleteModalVisible(true);
                                }}
                              >
                                <MaterialIcons
                                  name="delete"
                                  size={20}
                                  color="#dc2626"
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}

                {/* Footer */}
                <View className="mt-8 mb-6 px-5">
                  <View className="border-t border-gray-200 pt-4 items-center">
                    <Text className="text-[#024e32] font-bold text-base">
                      MANIKYA CHITS PVT LTD
                    </Text>
                    <Text className="text-gray-500 text-xs mt-1 text-center">
                      Group Members
                    </Text>
                    <Text className="text-gray-400 text-xs mt-1 text-center">
                      © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All
                      rights reserved.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* EDIT MODAL */}
      <Modal visible={editVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] rounded-2xl p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <MaterialIcons name="edit" size={24} color="#024e32" />
                <Text className="text-xl font-bold text-gray-800 ml-2">
                  Edit Collections
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
              >
                <MaterialIcons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            <View className="mb-4 bg-gray-50 rounded-xl p-4">
              <Text className="text-gray-600 text-sm mb-1">Editing for:</Text>
              <Text className="text-gray-800 font-semibold">
                {editMember?.memberName} ({editMember?.groupMemberId})
              </Text>
            </View>

            <ScrollView className="h-64">
              {editCollections.map((c, i) => (
                <View key={i} className="mb-3">
                  <Text className="text-gray-700 font-medium mb-2">
                    Month {c.index} Amount
                  </Text>
                  <TextInput
                    value={String(c.amount)}
                    keyboardType="numeric"
                    onChangeText={(v) => {
                      const arr = [...editCollections];
                      arr[i].amount = v;
                      setEditCollections(arr);
                    }}
                    className="bg-white border border-gray-300 px-4 py-3 rounded-xl"
                    placeholder="Enter amount"
                  />
                </View>
              ))}
            </ScrollView>

            <View className="flex-row space-x-3 mt-6">
              <TouchableOpacity
                onPress={() => setEditVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl"
              >
                <Text className="text-gray-700 text-center font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                className="flex-1 bg-[#024e32] py-3 rounded-xl"
              >
                <Text className="text-white text-center font-medium">
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-80 rounded-2xl p-6">
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center">
                <MaterialIcons name="warning" size={32} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-800 mt-3">
                Confirm Delete
              </Text>
            </View>

            <Text className="text-gray-600 text-center mb-6">
              Are you sure you want to delete{" "}
              <Text className="font-bold text-[#024e32]">
                {memberToDelete?.memberName}
              </Text>
              ? This action cannot be undone.
            </Text>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setDeleteModalVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl"
              >
                <Text className="text-gray-700 text-center font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={deleteMember}
                className="flex-1 bg-red-600 py-3 rounded-xl"
              >
                <Text className="text-white text-center font-medium">
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MONTH CONFIG MODAL */}
      <Modal visible={monthConfigModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] rounded-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                Month M{selectedMonthConfig?.monthIndex}
              </Text>
              <TouchableOpacity onPress={() => setMonthConfigModal(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View className="space-y-3">
              <Text className="text-gray-700">
                <Text className="font-semibold">Start Date:</Text>{" "}
                {selectedMonthConfig?.startDate?.toLocaleDateString("en-IN")}
              </Text>

              <Text className="text-gray-700">
                <Text className="font-semibold">End Date:</Text>{" "}
                {selectedMonthConfig?.endDate?.toLocaleDateString("en-IN")}
              </Text>

              <Text className="text-gray-700 text-lg">
                <Text className="font-semibold">Amount:</Text> ₹
                {selectedMonthConfig?.installmentAmount}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setMonthConfigModal(false)}
              className="mt-6 bg-[#024e32] py-3 rounded-xl"
            >
              <Text className="text-white text-center font-semibold">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PAYMENT HISTORY MODAL */}
      <Modal visible={historyVisible} transparent animationType="slide">
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View
            className="bg-white w-full max-w-xl max-h-[85%] rounded-3xl overflow-hidden"
            style={{
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.25,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            {/* Header */}
            <View
              className="px-5 pt-5 pb-6"
              style={{ backgroundColor: "#024e32" }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center flex-1 pr-3">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.18)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.3)",
                    }}
                  >
                    <Text className="text-white text-lg font-bold">
                      {(historyMember?.memberName || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text
                      className="text-white text-lg font-bold"
                      numberOfLines={1}
                    >
                      {historyMember?.memberName || "Member"}
                    </Text>
                    <Text className="text-white/70 text-xs mt-0.5">
                      Payment History • ID {historyMember?.groupMemberId || "-"}
                    </Text>
                  </View>
                </View>

                {/* Print + Close actions */}
                {/*
                  FIX: the wrapping row previously used style={{ gap: 8 }}
                  to space these two buttons. RN's flexbox `gap` on a plain
                  View isn't reliably supported on native (Android/iOS)
                  across all Expo/RN versions the way it is in a web
                  preview - on native it can render with zero effective
                  spacing/layout, which pushed the Print button out of
                  the visible header area next to the member name. Using
                  marginLeft on the second child instead works identically
                  on web, Android and iOS. flexShrink: 0 + a fixed
                  minWidth on the Print button also stop it from ever
                  being squeezed down to nothing when the member name is
                  long.
                */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => printMemberHistory(historyMember)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexShrink: 0,
                      minWidth: 64,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.16)",
                    }}
                  >
                    <MaterialIcons name="print" size={16} color="white" />
                    <Text
                      style={{
                        color: "white",
                        fontSize: 12,
                        fontWeight: "600",
                        marginLeft: 4,
                      }}
                    >
                      Print
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setHistoryVisible(false)}
                    style={{
                      flexShrink: 0,
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(255,255,255,0.16)",
                      marginLeft: 8,
                    }}
                  >
                    <MaterialIcons name="close" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Summary chips */}
              {(() => {
                const { totalPenaltyPending, perMonth } =
                  getCumulativePenaltyForMember(
                    historyMember?.collections,
                    plansMap,
                  );
                const totalPendingInstallment = perMonth.reduce(
                  (s, row) => s + row.pendingInstallment,
                  0,
                );
                return (
                  <View className="flex-row mt-4" style={{ gap: 10 }}>
                    <View
                      className="flex-1 rounded-2xl px-3 py-2.5"
                      style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
                    >
                      <Text className="text-white/70 text-[11px]">
                        Pending Installments
                      </Text>
                      <Text className="text-white text-base font-bold mt-0.5">
                        ₹{totalPendingInstallment}
                      </Text>
                    </View>
                    <View
                      className="flex-1 rounded-2xl px-3 py-2.5"
                      style={{ backgroundColor: "rgba(255,255,255,0.14)" }}
                    >
                      <Text className="text-white/70 text-[11px]">
                        Pending Penalty
                      </Text>
                      <Text className="text-white text-base font-bold mt-0.5">
                        ₹{totalPenaltyPending}
                      </Text>
                    </View>
                  </View>
                );
              })()}
            </View>

            <ScrollView
              className="px-4 pt-4"
              style={{ backgroundColor: "#f8faf9" }}
              contentContainerStyle={{ paddingBottom: 18 }}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                const collections = historyMember?.collections || [];
                const { perMonth } = getCumulativePenaltyForMember(
                  collections,
                  plansMap,
                );

                const validRows = collections
                  .map((c: any) => {
                    const meta = getCollectionMeta(c);
                    return { c, meta };
                  })
                  .filter(
                    ({ meta }: any) => meta.installmentAmount && meta.endDate,
                  );

                if (validRows.length === 0) {
                  return (
                    <View className="items-center py-14">
                      <MaterialIcons
                        name="receipt-long"
                        size={40}
                        color="#cbd5e1"
                      />
                      <Text className="text-gray-400 text-center mt-3">
                        No collection data available
                      </Text>
                    </View>
                  );
                }

                return validRows.map(({ c, meta }: any) => {
                  const { installmentAmount, endDate } = meta;
                  const rowPosition = perMonth.findIndex(
                    (row) => row.index === c.index,
                  );
                  const penaltyRow =
                    rowPosition >= 0 ? perMonth[rowPosition] : null;

                  const pendingInstallment =
                    penaltyRow?.pendingInstallment ?? 0;
                  const penaltyIncrement = penaltyRow?.penaltyIncrement ?? 0;
                  const pendingPenalty = penaltyRow?.pendingPenalty ?? 0;
                  const totalPending = pendingInstallment + pendingPenalty;

                  const installmentPaid = (c.payments || [])
                    .filter((p: any) => p.paymentType !== "PENALTY")
                    .reduce((s: number, p: any) => s + (p.amount || 0), 0);
                  const dividend = Number(plansMap[c?.index]?.dividend || 0);
                  const displayPaid = dividend + installmentPaid;
                  const progressRatio =
                    installmentAmount > 0
                      ? Math.min(displayPaid / installmentAmount, 1)
                      : 0;

                  const isFullyClear =
                    pendingInstallment === 0 && pendingPenalty === 0;
                  const isOverdue = isAfterDueDate(c.endDate);

                  const dividendPayment =
                    dividend > 0
                      ? [
                          {
                            amount: dividend,
                            paidAt: c.startDate || new Date(),
                            paymentType: "DIVIDEND",
                            collectedBy: "System",
                          },
                        ]
                      : [];
                  const allPayments = [
                    ...dividendPayment,
                    ...(c.payments || []),
                  ];

                  const statusBadge = isFullyClear
                    ? {
                        label: "Fully Paid",
                        bg: "#dcfce7",
                        fg: "#16a34a",
                        icon: "check-circle" as const,
                      }
                    : isOverdue
                      ? {
                          label: "Overdue",
                          bg: "#fee2e2",
                          fg: "#dc2626",
                          icon: "error" as const,
                        }
                      : {
                          label: "Pending",
                          bg: "#fef3c7",
                          fg: "#b45309",
                          icon: "schedule" as const,
                        };

                  return (
                    <View
                      key={c.index}
                      className="bg-white rounded-2xl mb-4 overflow-hidden border border-gray-100"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 3 },
                        shadowOpacity: 0.05,
                        shadowRadius: 8,
                        elevation: 2,
                      }}
                    >
                      {/* Card header */}
                      <View className="flex-row items-center justify-between px-4 pt-4">
                        <View className="flex-row items-center">
                          <View
                            className="w-9 h-9 rounded-xl items-center justify-center mr-2.5"
                            style={{ backgroundColor: "#eafaf1" }}
                          >
                            <Text
                              className="font-bold"
                              style={{ color: "#024e32" }}
                            >
                              M{c.index}
                            </Text>
                          </View>
                          <View>
                            <Text className="font-bold text-gray-800 text-base">
                              Month {c.index} · ₹{installmentAmount}
                            </Text>
                            {!!endDate && (
                              <Text className="text-gray-400 text-xs mt-0.5">
                                Due{" "}
                                {new Date(endDate).toLocaleDateString("en-IN")}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View
                          className="flex-row items-center px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: statusBadge.bg }}
                        >
                          <MaterialIcons
                            name={statusBadge.icon}
                            size={13}
                            color={statusBadge.fg}
                          />
                          <Text
                            className="text-xs font-semibold ml-1"
                            style={{ color: statusBadge.fg }}
                          >
                            {statusBadge.label}
                          </Text>
                        </View>
                      </View>

                      {/* Progress bar */}
                      <View className="px-4 mt-3">
                        <View className="h-2 rounded-full bg-gray-100 overflow-hidden">
                          <View
                            className="h-2 rounded-full"
                            style={{
                              width: `${progressRatio * 100}%`,
                              backgroundColor: isFullyClear
                                ? "#16a34a"
                                : "#024e32",
                            }}
                          />
                        </View>
                        <View className="flex-row justify-between mt-1.5">
                          <Text className="text-gray-500 text-xs">
                            Paid ₹{displayPaid} / ₹{installmentAmount}
                          </Text>
                          <Text className="text-gray-400 text-xs">
                            {Math.round(progressRatio * 100)}%
                          </Text>
                        </View>
                      </View>

                      {/* Penalty breakdown */}
                      {penaltyIncrement > 0 && (
                        <View className="mx-4 mt-3 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
                          <View className="flex-row items-center justify-between">
                            <Text className="text-red-700 text-sm font-semibold">
                              Penalty (6%) — ₹{pendingPenalty}
                              {pendingPenalty !== penaltyIncrement
                                ? ` of ₹${penaltyIncrement}`
                                : ""}
                            </Text>
                            <MaterialIcons
                              name="warning-amber"
                              size={16}
                              color="#dc2626"
                            />
                          </View>
                          {penaltyRow &&
                            penaltyRow.carriedFromMonths.length > 0 && (
                              <Text className="text-red-500 text-xs mt-1">
                                {`M${penaltyRow.carriedFromMonths.join("+M")} ₹${penaltyRow.carriedPenaltyPart} previous + M${c.index} ₹${penaltyRow.ownPenaltyPart} current = ₹${penaltyRow.carriedPenaltyPart + penaltyRow.ownPenaltyPart} total`}
                              </Text>
                            )}
                        </View>
                      )}

                      {/* Payments */}
                      <View className="px-4 mt-3">
                        {allPayments.length === 0 ? (
                          <View className="items-center py-5">
                            <MaterialIcons
                              name="inbox"
                              size={26}
                              color="#d1d5db"
                            />
                            <Text className="text-gray-400 text-sm mt-1.5">
                              No payments recorded
                            </Text>
                          </View>
                        ) : (
                          allPayments.map((p: any, i: number) => {
                            const paymentType = p?.paymentType || "INSTALLMENT";
                            const isDividend = paymentType === "DIVIDEND";
                            const realIndex = isDividend
                              ? -1
                              : i - dividendPayment.length;
                            const typeStyle =
                              paymentType === "PENALTY"
                                ? {
                                    bg: "#fee2e2",
                                    fg: "#dc2626",
                                    icon: "percent" as const,
                                  }
                                : paymentType === "DIVIDEND"
                                  ? {
                                      bg: "#dbeafe",
                                      fg: "#2563eb",
                                      icon: "savings" as const,
                                    }
                                  : {
                                      bg: "#dcfce7",
                                      fg: "#16a34a",
                                      icon: "payments" as const,
                                    };

                            return (
                              <View
                                key={i}
                                className="flex-row items-center justify-between py-2.5"
                                style={
                                  i !== allPayments.length - 1
                                    ? {
                                        borderBottomWidth: 1,
                                        borderBottomColor: "#f1f5f9",
                                      }
                                    : undefined
                                }
                              >
                                <View className="flex-row items-center flex-1 pr-2">
                                  <View
                                    className="w-9 h-9 rounded-full items-center justify-center mr-3"
                                    style={{ backgroundColor: typeStyle.bg }}
                                  >
                                    <MaterialIcons
                                      name={typeStyle.icon}
                                      size={16}
                                      color={typeStyle.fg}
                                    />
                                  </View>
                                  <View className="flex-1">
                                    <View className="flex-row items-center">
                                      <Text className="text-gray-800 font-semibold">
                                        ₹{p.amount}
                                      </Text>
                                      <Text
                                        className="ml-2 text-[10px] font-semibold"
                                        style={{ color: typeStyle.fg }}
                                      >
                                        {paymentType}
                                      </Text>
                                    </View>
                                    <Text className="text-gray-400 text-xs mt-0.5">
                                      {new Date(p.paidAt).toLocaleDateString(
                                        "en-IN",
                                      )}{" "}
                                      • {p.collectedBy || "System"} •{" "}
                                      {p.paymentMode || "Cash"}
                                    </Text>
                                  </View>
                                </View>
                                {!isDividend && (
                                  <View
                                    className="flex-row"
                                    style={{ gap: 14 }}
                                  >
                                    <TouchableOpacity
                                      onPress={() =>
                                        openEditPaymentModal(
                                          p,
                                          c.index,
                                          realIndex,
                                        )
                                      }
                                    >
                                      <MaterialIcons
                                        name="edit"
                                        size={18}
                                        color="#16a34a"
                                      />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() =>
                                        deletePayment(p, c.index, realIndex)
                                      }
                                    >
                                      <MaterialIcons
                                        name="delete"
                                        size={18}
                                        color="#dc2626"
                                      />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            );
                          })
                        )}
                      </View>

                      {/* Footer totals */}
                      <View
                        className="mx-4 mt-2 mb-4 pt-3"
                        style={{ borderTopWidth: 1, borderTopColor: "#f1f5f9" }}
                      >
                        {isFullyClear ? (
                          <View className="flex-row items-center">
                            <MaterialIcons
                              name="check-circle"
                              size={16}
                              color="#16a34a"
                            />
                            <Text className="text-green-600 font-semibold ml-1.5">
                              Fully Paid
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row justify-between items-center">
                            <Text className="text-gray-500 text-sm">
                              Total Pending
                            </Text>
                            <Text className="text-red-600 font-bold text-base">
                              ₹{totalPending}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EDIT PAYMENT MODAL */}
      <Modal visible={editPaymentModal} transparent animationType="slide">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="bg-white w-[90%] rounded-2xl p-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  Edit Payment
                </Text>
                <TouchableOpacity onPress={() => setEditPaymentModal(false)}>
                  <MaterialIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View className="mb-4 bg-gray-50 rounded-xl p-4">
                <Text className="text-gray-600 text-sm mb-1">
                  Editing payment for:
                </Text>
                <Text className="text-gray-800 font-semibold">
                  {editingPayment?.member?.memberName} - M
                  {editingPayment?.monthIndex}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Current: ₹{editingPayment?.amount}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  New Amount (₹)
                </Text>
                <TextInput
                  value={editPaymentAmount}
                  keyboardType="numeric"
                  onChangeText={setEditPaymentAmount}
                  className="bg-white border border-gray-300 px-4 py-3 rounded-xl text-lg"
                  placeholder="Enter new amount"
                  autoFocus
                />
              </View>

              <View className="mb-6">
                <Text className="text-gray-700 font-medium mb-2">
                  Payment Date
                </Text>
                {Platform.OS === "web" ? (
                  <input
                    type="date"
                    value={editPaymentDate.toISOString().split("T")[0]}
                    onChange={(e) => {
                      const selected = new Date(e.target.value);
                      setEditPaymentDate(selected);
                    }}
                    style={{
                      width: "100%",
                      padding: 12,
                      borderRadius: 10,
                      border: "1px solid #ccc",
                      fontSize: 16,
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      onPress={() => setShowPaymentDatePicker(true)}
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl flex-row justify-between items-center"
                    >
                      <Text className="text-gray-800">
                        {editPaymentDate.toLocaleDateString("en-IN")}
                      </Text>
                      <MaterialIcons
                        name="calendar-today"
                        size={20}
                        color="#666"
                      />
                    </TouchableOpacity>
                    {showPaymentDatePicker && (
                      <DateTimePicker
                        value={editPaymentDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          setShowPaymentDatePicker(false);
                          if (date) setEditPaymentDate(date);
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => setEditPaymentModal(false)}
                  className="flex-1 bg-gray-200 py-3 rounded-xl"
                >
                  <Text className="text-gray-700 text-center font-medium">
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveEditedPayment}
                  className="flex-1 bg-[#024e32] py-3 rounded-xl"
                >
                  <Text className="text-white text-center font-medium">
                    Save Changes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ADMIN UPDATES MODAL */}
      <Modal visible={showAdminUpdates} transparent animationType="slide">
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] max-h-[80%] rounded-2xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Admin Updates</Text>
              <TouchableOpacity onPress={() => setShowAdminUpdates(false)}>
                <MaterialIcons name="close" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {adminUpdates.length === 0 ? (
                <Text className="text-gray-400 text-center py-8">
                  No updates recorded
                </Text>
              ) : (
                adminUpdates.map((update, i) => (
                  <View
                    key={i}
                    className="border border-gray-200 rounded-xl p-4 mb-3"
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="font-semibold text-[#024e32]">
                        {update.type}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {new Date(update.timestamp).toLocaleTimeString(
                          "en-IN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    </View>
                    <Text className="text-gray-700">{update.details}</Text>
                    {update.amount && (
                      <Text className="text-gray-600 mt-1">
                        Amount: ₹{update.amount}
                      </Text>
                    )}
                    {update.percentage && (
                      <Text className="text-red-600 mt-1">
                        Penalty: {update.percentage}%
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}