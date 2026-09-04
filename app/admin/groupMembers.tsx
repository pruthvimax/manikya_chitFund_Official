import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  RefreshControl,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Animated,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from "expo-router";
import BACKEND_URL from "../../config";

// ============ HELPER FUNCTION TO EXTRACT NUMERIC VALUE FROM ID ============
const extractNumberFromId = (id: string) => {
  if (!id) return 0;
  // Extract all numbers from the string
  const numbers = id.match(/\d+/g);
  if (!numbers) return 0;
  // Join all numbers and convert to integer
  return parseInt(numbers.join('')) || 0;
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
  const [addCollectionConfirmModal, setAddCollectionConfirmModal] = useState(false);

  // Generate months based on table columns (M1...Mn)
  const months = Array.from(
    { length: Math.max(...members.map((m) => m.collections?.length || 0), 0) },
    (_, i) => `M${i + 1}`
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

  // ✅ LIVE pending + penalty calculator
  const getPendingAndPenalty = (
    installment: number,
    payments: any[] | undefined,
    endDate?: Date | null,
    dividend: number = 0
  ) => {
    const safePayments = Array.isArray(payments) ? payments : [];

    const installmentPaid = safePayments
      .filter(p => p.paymentType !== "PENALTY")
      .reduce((s, p) => s + (p.amount || 0), 0);

    const totalInstallmentPaid = dividend + installmentPaid;
    const pendingInstallment = Math.max(installment - totalInstallmentPaid, 0);

    if (!endDate || !isAfterDueDate(endDate)) {
      return {
        pendingInstallment,
        penaltyDue: 0,
        pendingPenalty: 0,
        totalPending: pendingInstallment,
      };
    }

    const due = new Date(endDate);
    due.setHours(23, 59, 59, 999);
    const dueTime = due.getTime();

    let installmentPaidBeforeDue = 0;
    safePayments.forEach((p) => {
      const paidTime = new Date(p.paidAt || p.date).getTime();
      if (paidTime <= dueTime && p.paymentType !== "PENALTY") {
        installmentPaidBeforeDue += p.amount || 0;
      }
    });

    const effectiveInstallment = Math.max(installment - dividend, 0);
    const penaltyBaseAmount = Math.max(effectiveInstallment - installmentPaidBeforeDue, 0);
    const penaltyDue = Math.round((penaltyBaseAmount * FIXED_PENALTY_PERCENTAGE) / 100);

    let runningInstallment = installmentPaidBeforeDue;
    let penaltyPaid = 0;
    safePayments.forEach((p) => {
      const paidTime = new Date(p.paidAt || p.date).getTime();
      if (paidTime > dueTime) {
        if (p.paymentType === "PENALTY") {
          penaltyPaid += p.amount || 0;
          return;
        }
        if (runningInstallment < installment) {
          const usedForInstallment = Math.min(installment - runningInstallment, p.amount || 0);
          runningInstallment += usedForInstallment;
          const remaining = (p.amount || 0) - usedForInstallment;
          if (remaining > 0) {
            penaltyPaid += remaining;
          }
        } else {
          penaltyPaid += p.amount || 0;
        }
      }
    });

    const pendingPenalty = Math.max(penaltyDue - penaltyPaid, 0);

    return {
      pendingInstallment,
      penaltyDue,
      pendingPenalty,
      totalPending: pendingInstallment + pendingPenalty,
    };
  };

  // ✅ SAFE helper
  const getCollectionMeta = (collection: any) => {
    const installmentAmount = Number(
      collection?.installmentAmount ?? collection?.amount ?? 0
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
      (data.collectionPlans || []).forEach(p => {
        tempPlansMap[p.monthIndex] = p;
      });

      setPlansMap(tempPlansMap);

      // Get members and sort them by groupMemberId numerically
      const fetchedMembers = (data.groupMembers || []).map(m => ({
        ...m,
        collections: (m.collections || []).map(c => ({
          ...c,
          installmentAmount:
            tempPlansMap[c.index]?.installmentAmount ??
            c.installmentAmount ??
            c.amount ??
            0,
          endDate:
            tempPlansMap[c.index]?.endDate
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
      Alert.alert("Warning", "Could not connect to server. Using local data.");
      const localMembers = [
        {
          _id: "1",
          memberId: "M001",
          groupMemberId: "M01",
          memberName: "John Doe",
          phone: "1234567890",
          collections: [
            {
              index: 1,
              installmentAmount: 1000,
              startDate: "2026-01-01",
              endDate: "2026-01-31",
              payments: [
                { amount: 500, paidAt: "2026-01-09T15:14:23.317Z", id: "p1" },
                { amount: 500, paidAt: "2026-01-09T14:11:43.795Z", id: "p2" }
              ]
            }
          ]
        }
      ];
      setMembers(localMembers);
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
      const res = await fetch(`${BACKEND_URL}/admin/updates?groupId=${groupId}`);
      const text = await res.text();
      if (text.startsWith("{") || text.startsWith("[")) {
        const data = JSON.parse(text);
        setAdminUpdates(data.updates || []);
      } else {
        console.log("Non-JSON response from admin updates:", text.substring(0, 100));
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
        `${BACKEND_URL}/groups/${groupId}/collection-plan/${monthIndex}`
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
      (m) => (m.groupMemberId || "").trim().toLowerCase() === normalizedInput
    );

    if (alreadyExists) {
      Alert.alert(
        "Duplicate Group Member ID",
        `Group Member ID "${groupMemberId}" already exists. Please use a different ID.`
      );
      return;
    }

    setAddMemberConfirmModal(true);
  };

  // Actually add member
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

      const newMember = {
        _id: generatePaymentId(),
        memberId,
        groupMemberId,
        memberName: `Member ${memberId}`,
        phone: "Not set",
        collections: []
      };
      
      // ✅ Add new member and sort
      setMembers(prev => {
        const updated = [...prev, newMember];
        return sortMembersById(updated);
      });
      
      Alert.alert("Success", `Member added with ID: ${groupMemberId}`);
      setMemberId("");
      setGroupMemberId("");
      await fetchMembers();

    } catch (error) {
      console.log("Failed to add member to backend:", error);
      const newMember = {
        _id: generatePaymentId(),
        memberId,
        groupMemberId,
        memberName: `Member ${memberId}`,
        phone: "Not set",
        collections: []
      };
      
      setMembers(prev => {
        const updated = [...prev, newMember];
        return sortMembersById(updated);
      });
      Alert.alert("Success", `Member added with ID: ${groupMemberId} (locally)`);
      setMemberId("");
      setGroupMemberId("");
      await fetchMembers();
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
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.log("Failed to record admin update:", error);
      const newUpdate = {
        ...updateData,
        timestamp: new Date().toISOString(),
        id: generatePaymentId(),
      };
      setAdminUpdates(prev => [newUpdate, ...prev]);
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

  // Actually add collection
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
        }
      );

      const data = await res.json();
      
      Alert.alert("Success", data.message || "Collection plan added");

      setSelectedMonth("");
      setStartDate("");
      setEndDate("");
      setCollectionAmount("");
      setDividend("");

      setMembers(prev =>
        prev.map(m => ({
          ...m,
          collections: (m.collections || []).map(c =>
            c.index === monthIndex
              ? {
                  ...c,
                  installmentAmount: Number(collectionAmount),
                  endDate: tempEndDate,
                }
              : c
          ),
        }))
      );
      
      await recordAdminUpdate({
        type: "ADD_COLLECTION_PLAN",
        month: selectedMonth,
        amount: collectionAmount,
        details: `Added collection plan for ${selectedMonth} - ₹${collectionAmount}`
      });

      setSelectedMonth("");
      setStartDate("");
      setEndDate("");
      setCollectionAmount("");
      fetchMembers();
    } catch {
      Alert.alert("Info", "Collection plan saved locally (backend offline)");
      setSelectedMonth("");
      setStartDate("");
      setEndDate("");
      setCollectionAmount("");
    }
  };

  // Delete member
  const deleteMember = async () => {
    if (!memberToDelete) return;

    try {
      try {
        await fetch(
          `${BACKEND_URL}/groups/${groupId}/members/${memberToDelete.groupMemberId}`,
          { method: "DELETE" }
        );
      } catch (error) {
        console.log("Backend delete failed, removing locally:", error);
      }

      setMembers(prev => {
        const updated = prev.filter(m => m.groupMemberId !== memberToDelete.groupMemberId);
        return sortMembersById(updated);
      });

      await fetchMembers();
     
      await recordAdminUpdate({
        type: "DELETE_MEMBER",
        memberId: memberToDelete.memberId,
        details: `Deleted member ${memberToDelete.memberName} from group`
      });

      setDeleteModalVisible(false);
      setMemberToDelete(null);
      Alert.alert("Success", "Member deleted");
    } catch (error) {
      Alert.alert("Error", "Failed to delete member");
    }
  };

  // Edit member collections
  const openEditModal = (member: any) => {
    setEditMember(member);
    setEditCollections(
      member.collections.map((c: any) => ({
        index: c.index,
        amount: c.amount ?? "",
        payments: c.payments || []
      }))
    );
    setEditVisible(true);
  };

  const saveEdit = async () => {
    try {
      setMembers(prev => prev.map(m => {
        if (m._id === editMember._id) {
          return {
            ...m,
            collections: editCollections.map(c => ({
              ...c,
              amount: Number(c.amount) || 0
            }))
          };
        }
        return m;
      }));

      await recordAdminUpdate({
        type: "UPDATE_COLLECTIONS",
        memberId: editMember.memberId,
        details: `Updated collections for ${editMember.memberName}`
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
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
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
    onChangeWeb: (e: any) => void
  ) => {
    if (Platform.OS === "web") {
      return (
        <input
          type="date"
          value={webValue}
          onChange={onChangeWeb}
          className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl w-full"
          style={{ 
            fontSize: '16px',
            color: webValue ? '#1f2937' : '#6b7280',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
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
        <Text className={`${value ? "text-gray-800 font-medium" : "text-gray-500"}`}>
          {value || placeholder}
        </Text>
        <MaterialIcons name="calendar-today" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  // Add payment to collection
  const addPaymentToCollection = async (member: any, monthIndex: number, amount: number) => {
    const paymentId = generatePaymentId();

    const c = member.collections?.[monthIndex - 1];
    const { installmentAmount, endDate } = getCollectionMeta(c || {});
    const { pendingInstallment } = getPendingAndPenalty(
      installmentAmount,
      c.payments || [],
      endDate,
      Number(plansMap[c.index]?.dividend || 0)
    );

    let paymentType: "INSTALLMENT" | "PENALTY" = "INSTALLMENT";
    const { pendingPenalty } = getPendingAndPenalty(
      installmentAmount,
      c.payments || [],
      endDate,
      Number(plansMap[c.index]?.dividend || 0)
    );

    if (isAfterDueDate(endDate) && pendingPenalty > 0 && amount <= pendingPenalty) {
      paymentType = "PENALTY";
    }

    const newPayment = {
      __pid: paymentId,
      amount: parseFloat(amount.toString()),
      paidAt: new Date().toISOString(),
      date: new Date().toISOString(),
      collectedBy: currentEmployee?.emp_id || "Admin",
      paymentType,
    };

    try {
      const response = await fetch(
        `${BACKEND_URL}/groups/${groupId}/members/${member.groupMemberId}/collections/${monthIndex}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newPayment),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log("Backend payment failed, saving locally:", error);
    }

    setMembers(prev => prev.map(m => {
      if (m.groupMemberId === member.groupMemberId) {
        const updatedCollections = [...(m.collections || [])];
        while (updatedCollections.length < monthIndex) {
          updatedCollections.push({ index: updatedCollections.length + 1, payments: [] });
        }
        const collectionIndex = monthIndex - 1;
        if (!updatedCollections[collectionIndex]) {
          updatedCollections[collectionIndex] = { index: monthIndex, payments: [] };
        }
        const updatedPayments = [
          ...(updatedCollections[collectionIndex].payments || []),
          newPayment,
        ];
        updatedCollections[collectionIndex] = {
          ...updatedCollections[collectionIndex],
          index: monthIndex,
          installmentAmount: updatedCollections[collectionIndex].installmentAmount ?? 0,
          endDate: updatedCollections[collectionIndex].endDate,
          payments: updatedPayments,
        };
        return { ...m, collections: updatedCollections };
      }
      return m;
    }));

    await recordAdminUpdate({
      type: "ADD_PAYMENT",
      memberId: member.memberId,
      monthIndex,
      amount,
      details: `Added payment of ₹${amount} for ${member.memberName} - M${monthIndex}`
    });

    Alert.alert("Success", "Payment added successfully");
    
    if (historyVisible && historyMember?.groupMemberId === member.groupMemberId) {
      setHistoryMember(prev => ({
        ...prev,
        collections: prev.collections.map((c: any) => {
          if (c.index !== monthIndex) return c;
          return {
            ...c,
            installmentAmount: c.installmentAmount,
            endDate: c.endDate,
            payments: [...(c.payments || []), newPayment],
          };
        }),
      }));
    }
  };

  // Open edit payment modal
  const openEditPaymentModal = (
    payment: any,
    monthIndex: number,
    paymentIndex: number
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
      member: historyMember
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
        }
      );

      setMembers(prev =>
        prev.map(m => {
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
                paymentType: payments[editingPayment.paymentIndex].paymentType || "INSTALLMENT",
              };
              return { ...c, payments };
            }),
          };
        })
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
  const deleteNow = async (
    monthIndex: number,
    paymentIndex: number
  ) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/${groupId}/members/${historyMember.groupMemberId}/payments/${monthIndex}/${paymentIndex}`,
        { method: "DELETE" }
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

  const deletePayment = (payment: any, monthIndex: number, paymentIndex: number) => {
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
      ]
    );
  };

  // ✅ FULL TABLE PRINT
  const printFullTable = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Print works only on Web/Desktop");
      return;
    }

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
      let totalPenalty = 0;

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
        const { pendingPenalty } = getPendingAndPenalty(
          installmentAmount,
          c.payments || [],
          c.endDate,
          dividend
        );

        totalPenalty += pendingPenalty;

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
        <script>
          window.print();
          window.onafterprint = () => window.close();
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(html);
    printWindow.document.close();
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
                <Text className="text-gray-600 font-medium">Group Member ID</Text>
                <Text className="text-[#024e32] font-bold text-lg">{groupMemberId}</Text>
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
                <Text className="text-[#047857] font-bold text-lg">₹{collectionAmount}</Text>
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
    <SafeAreaView className="flex-1 bg-white">
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
            {Platform.OS === "web" && (
              <TouchableOpacity
                onPress={printFullTable}
                className="bg-white/20 px-3 py-1 rounded-full flex-row items-center"
              >
                <MaterialIcons name="print" size={16} color="white" />
                <Text className="text-white text-sm ml-1">Print</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
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
            </TouchableOpacity>
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
            <View className={`p-5 ${isDesktopOrLaptop ? 'max-w-6xl mx-auto w-full' : ''}`}>
              <View className={`bg-white rounded-2xl p-5 mb-6 border border-gray-200 ${isDesktopOrLaptop ? 'p-8' : ''}`}>
                <View className="flex-row items-center mb-4">
                  <MaterialIcons name="person-add" size={24} color="#024e32" />
                  <Text className={`font-bold text-gray-800 ml-2 ${isDesktopOrLaptop ? 'text-xl' : 'text-lg'}`}>
                    Add New Member
                  </Text>
                </View>

                <View className={`${isDesktopOrLaptop ? 'flex-row gap-4' : ''}`}>
                  <View className={`${isDesktopOrLaptop ? 'flex-1' : ''}`}>
                    <TextInput
                      placeholder="Member ID"
                      value={memberId}
                      onChangeText={setMemberId}
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl mb-3"
                    />
                  </View>
                  <View className={`${isDesktopOrLaptop ? 'flex-1' : ''}`}>
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
                    <MaterialIcons name="attach-money" size={24} color="#024e32" />
                    <Text className={`font-bold text-gray-800 ml-2 ${isDesktopOrLaptop ? 'text-xl' : 'text-lg'}`}>
                      Add Collection
                    </Text>
                  </View>

                  {/* MONTH DROPDOWN */}
                  <View className="mb-3">
                    <Text className="text-gray-600 mb-2">Select Collection Month</Text>
                    <TouchableOpacity
                      onPress={() => setMonthDropdownVisible(!monthDropdownVisible)}
                      className="bg-gray-50 border border-gray-300 px-4 py-3 rounded-xl flex-row justify-between items-center"
                      activeOpacity={0.8}
                    >
                      <Text className={`${selectedMonth ? "text-gray-800 font-medium" : "text-gray-500"}`}>
                        {selectedMonth || "Select month (M1, M2, M3...)"}
                      </Text>
                      <MaterialIcons
                        name={monthDropdownVisible ? "expand-less" : "expand-more"}
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
                                  color={selectedMonth === month ? "#024e32" : "#666"} 
                                  style={{ marginRight: 10 }}
                                />
                                <Text className={`text-base ${
                                  selectedMonth === month 
                                    ? "text-[#024e32] font-semibold" 
                                    : "text-gray-700"
                                }`}>
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
                  <View className={`mb-3 ${isDesktopOrLaptop ? 'flex-row gap-4' : 'space-y-3'}`}>
                    <View className={`${isDesktopOrLaptop ? 'flex-1' : ''}`}>
                      <Text className="text-gray-600 mb-2">Start Date</Text>
                      {renderDateInput(
                        startDate,
                        "Select start date",
                        () => setShowStartDatePicker(true),
                        webStartDate,
                        handleWebStartDateChange
                      )}
                    </View>
                    <View className={`${isDesktopOrLaptop ? 'flex-1' : ''}`}>
                      <Text className="text-gray-600 mb-2">End Date</Text>
                      {renderDateInput(
                        endDate,
                        "Select end date",
                        () => setShowEndDatePicker(true),
                        webEndDate,
                        handleWebEndDateChange
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
                    <Text className="text-gray-600 mb-2">Collection Amount (₹)</Text>
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
                      <MaterialIcons name="attach-money" size={22} color="white" />
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
                  <Text className={`font-bold text-gray-800 ${isDesktopOrLaptop ? 'text-xl' : 'text-lg'}`}>
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
                        <Text className={`text-white font-semibold text-center ${isDesktopOrLaptop ? 'w-40' : 'w-28'}`}>
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
                          <Text className={`text-gray-800 text-center text-sm ${isDesktopOrLaptop ? 'w-40' : 'w-28'}`}>
                            {m.memberName || "-"}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* SCROLLABLE COLUMNS */}
                    <ScrollView horizontal className="flex-5">
                      <View className="border border-gray-300 border-l-0 rounded-r-xl overflow-hidden">
                        <View className="bg-[#024e32] flex-row py-3 px-3">
                          <Text className={`text-white font-semibold text-center ${isDesktopOrLaptop ? 'w-32' : 'w-28'}`}>
                            Phone
                          </Text>
                          <Text className={`text-white font-semibold text-center ${isDesktopOrLaptop ? 'w-36' : 'w-28'}`}>
                            Member ID
                          </Text>
                          <Text className={`text-white font-semibold text-center ${isDesktopOrLaptop ? 'w-44' : 'w-36'}`}>
                            Group Member ID
                          </Text>
                          {Array.from({ length: getMaxCollections() }).map((_, i) => (
                            <TouchableOpacity
                              key={i}
                              className={`text-white font-semibold text-center ${isDesktopOrLaptop ? 'w-32' : 'w-24'}`}
                              onPress={() => openMonthConfig(i + 1)}
                            >
                              <Text className="text-white font-semibold text-center">
                                M{i + 1}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          <Text className={`text-white font-semibold text-center ${isDesktopOrLaptop ? 'w-32' : 'w-24'}`}>
                            Penalty
                          </Text>
                          <Text className={`text-white font-semibold text-center ${isDesktopOrLaptop ? 'w-32' : 'w-24'}`}>
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
                            <Text className={`text-gray-800 text-center text-sm ${isDesktopOrLaptop ? 'w-32' : 'w-24'}`}>
                              {m.phone || "-"}
                            </Text>
                            <Text className={`text-gray-800 text-center text-sm ${isDesktopOrLaptop ? 'w-36' : 'w-28'}`}>
                              {m.memberId}
                            </Text>
                            <Text className={`text-gray-800 text-center text-sm font-medium ${isDesktopOrLaptop ? 'w-44' : 'w-36'}`}>
                              {m.groupMemberId}
                            </Text>
                            {Array.from({ length: getMaxCollections() }).map((_, idx) => {
                              const c = m.collections?.[idx];
                              const totalPaid = (c?.payments || [])
                                .filter(p => p.paymentType !== "PENALTY")
                                .reduce((s, p) => s + (p.amount || 0), 0);
                              const monthDividend = Number(plansMap[c?.index]?.dividend || 0);
                              const displayPaid = monthDividend + totalPaid;
                              
                              return (
                                <TouchableOpacity
                                  key={idx}
                                  className={`text-center ${isDesktopOrLaptop ? 'w-32' : 'w-24'}`}
                                  onPress={() => {
                                    Alert.prompt(
                                      "Add Payment",
                                      `Enter payment amount for ${m.memberName} - M${idx + 1}`,
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                          text: "Add",
                                          onPress: (amount) => {
                                            if (amount && !isNaN(parseFloat(amount))) {
                                              addPaymentToCollection(m, idx + 1, parseFloat(amount));
                                            }
                                          },
                                        },
                                      ],
                                      "plain-text",
                                      "",
                                      "numeric"
                                    );
                                  }}
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
                                </TouchableOpacity>
                              );
                            })}

                            {/* Penalty Column */}
                            <View className={`text-center ${isDesktopOrLaptop ? 'w-32' : 'w-24'}`}>
                              {(() => {
                                let totalPenalty = 0;
                                (m.collections || []).forEach((c) => {
                                  if (!c || !c.endDate || !c.installmentAmount) return;
                                  const { installmentAmount, endDate } = getCollectionMeta(c);
                                  const { pendingPenalty } = getPendingAndPenalty(
                                    installmentAmount,
                                    c.payments || [],
                                    endDate,
                                    Number(plansMap[c.index]?.dividend || 0)
                                  );
                                  totalPenalty += pendingPenalty;
                                });
                                const hasAnyPenalty = (m.collections || []).some((c) => {
                                  if (!c || !c.endDate || !c.installmentAmount) return false;
                                  const { installmentAmount, endDate } = getCollectionMeta(c);
                                  const { penaltyDue } = getPendingAndPenalty(
                                    installmentAmount,
                                    c.payments || [],
                                    endDate,
                                    Number(plansMap[c.index]?.dividend || 0)
                                  );
                                  return penaltyDue > 0;
                                });
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
                            <View className={`flex-row justify-center space-x-4 ${isDesktopOrLaptop ? 'w-32' : 'w-24'}`} style={{ gap: 14 }}>
                              <TouchableOpacity onPress={() => {
                                setHistoryMember(m);
                                setHistoryVisible(true);
                              }}>
                                <MaterialIcons name="history" size={20} color="#2563eb" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => {
                                  setMemberToDelete(m);
                                  setDeleteModalVisible(true);
                                }}
                              >
                                <MaterialIcons name="delete" size={20} color="#dc2626" />
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
                      © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
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
                <Text className="font-semibold">Amount:</Text>{" "}
                ₹{selectedMonthConfig?.installmentAmount}
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
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="bg-white w-[90%] max-h-[80%] rounded-2xl p-5">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold">Payment History - {historyMember?.memberName}</Text>
              <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                <MaterialIcons name="close" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {historyMember?.collections?.map((c: any) => {
                const { installmentAmount, endDate } = getCollectionMeta(c);
                if (!installmentAmount || !endDate) return null;
                const { pendingInstallment, penaltyDue, pendingPenalty, totalPending } =
                  getPendingAndPenalty(
                    installmentAmount,
                    c.payments || [],
                    endDate,
                    Number(plansMap[c.index]?.dividend || 0)
                  );
                const installmentPaid = (c.payments || [])
                  .filter(p => p.paymentType !== "PENALTY")
                  .reduce((s, p) => s + (p.amount || 0), 0);
                const dividend = Number(plansMap[c?.index]?.dividend || 0);
                const displayPaid = dividend + installmentPaid;
                const remainingInstallment = pendingInstallment;
                const isDueDatePassed = c.endDate ? isAfterDueDate(c.endDate) : false;
                const isPaymentIncomplete = displayPaid < (c.installmentAmount || 0);
                const dividendPayment = dividend > 0 ? [{
                  amount: dividend,
                  paidAt: c.startDate || new Date(),
                  paymentType: "DIVIDEND",
                  collectedBy: "System",
                }] : [];
                const allPayments = [...dividendPayment, ...(c.payments || [])];
                
                return (
                  <View key={c.index} className="border border-gray-200 rounded-xl p-4 mb-4">
                    <View className="flex-row justify-between items-center mb-3">
                      <Text className="font-bold text-lg">
                        Month {c.index} - ₹{c.installmentAmount || "Not set"}
                      </Text>
                    </View>

                    {pendingPenalty > 0 && (
                      <View className="mt-2 bg-red-50 p-2 rounded-lg">
                        <Text className="text-red-600 text-sm font-semibold">
                          Penalty (6%): ₹{pendingPenalty}
                        </Text>
                        <Text className="text-red-500 text-xs mt-1">
                          ⚠️ Due date passed
                        </Text>
                      </View>
                    )}

                    {allPayments.length === 0 ? (
                      <Text className="text-gray-400 text-center py-4">
                        No payments recorded
                      </Text>
                    ) : (
                      allPayments.map((p: any, i: number) => {
                        const paymentType = p?.paymentType || "INSTALLMENT";
                        const isDividend = paymentType === "DIVIDEND";
                        const realIndex = isDividend ? -1 : i - dividendPayment.length;
                        return (
                          <View key={i} className="flex-row justify-between items-center mb-3 p-2 bg-gray-50 rounded-lg">
                            <View>
                              <View className="flex-row items-center">
                                <Text className="text-gray-700 font-medium">
                                  ₹{p.amount}
                                </Text>
                                <Text className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  paymentType === "PENALTY"
                                    ? "bg-red-100 text-red-600"
                                    : paymentType === "DIVIDEND"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-green-100 text-green-700"
                                }`}>
                                  {paymentType}
                                </Text>
                              </View>
                              <Text className="text-gray-500 text-sm">
                                {new Date(p.paidAt).toLocaleDateString("en-IN")}
                              </Text>
                              <Text className="text-gray-400 text-xs mt-1">
                                Collected by: {p.collectedBy || "System"}
                              </Text>
                            </View>
                            {!isDividend && (
                              <View className="flex-row space-x-3">
                                <TouchableOpacity onPress={() => openEditPaymentModal(p, c.index, realIndex)}>
                                  <MaterialIcons name="edit" size={20} color="#16a34a" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deletePayment(p, c.index, realIndex)}>
                                  <MaterialIcons name="delete" size={20} color="#dc2626" />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}

                    <View className="mt-3 pt-3 border-t border-gray-200">
                      <View>
                        <Text className="font-semibold text-gray-700">
                          Total Paid: ₹{displayPaid}
                          {installmentAmount > 0 ? ` / ₹${installmentAmount}` : ""}
                        </Text>
                      </View>
                      {pendingInstallment > 0 && (
                        <Text className="text-red-600 font-semibold mt-1">
                          Remaining Installment: ₹{remainingInstallment}
                        </Text>
                      )}
                      {pendingPenalty > 0 && (
                        <Text className="text-red-700 font-semibold mt-1">
                          Penalty (6%): ₹{pendingPenalty}
                        </Text>
                      )}
                      {pendingInstallment === 0 && pendingPenalty === 0 && (
                        <Text className="text-green-600 font-semibold mt-1">
                          Fully Paid ✔
                        </Text>
                      )}
                      {displayPaid >= installmentAmount && isAfterDueDate(c.endDate) && pendingPenalty > 0 && (
                        <Text className="text-red-600 font-semibold mt-1">
                          Total pending – Penalty Due ₹{pendingPenalty}
                        </Text>
                      )}
                      {installmentAmount > 0 && pendingInstallment > 0 && (
                        <Text className="text-red-600 font-semibold mt-1">
                          Total Pending: ₹{totalPending}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              }) || (
                <Text className="text-gray-400 text-center py-8">
                  No collection data available
                </Text>
              )}
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
                <Text className="text-gray-600 text-sm mb-1">Editing payment for:</Text>
                <Text className="text-gray-800 font-semibold">
                  {editingPayment?.member?.memberName} - M{editingPayment?.monthIndex}
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Current: ₹{editingPayment?.amount}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">New Amount (₹)</Text>
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
                      <MaterialIcons name="calendar-today" size={20} color="#666" />
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
                  <View key={i} className="border border-gray-200 rounded-xl p-4 mb-3">
                    <View className="flex-row justify-between items-start mb-2">
                      <Text className="font-semibold text-[#024e32]">
                        {update.type}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {new Date(update.timestamp).toLocaleTimeString("en-IN", {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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