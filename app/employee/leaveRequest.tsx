import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import BACKEND_URL from "../../config";

import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

interface LeaveHistory {
  _id: string;
  emp_id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

export default function LeaveRequest() {
  const router = useRouter();

  const [leaveType, setLeaveType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [fromDateObj, setFromDateObj] = useState(new Date());
  const [toDateObj, setToDateObj] = useState(new Date());

  // History states
  const [leaveHistory, setLeaveHistory] = useState<LeaveHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilterDate, setHistoryFilterDate] = useState("");
  const [showHistoryDatePicker, setShowHistoryDatePicker] = useState(false);
  const [historyDateObj, setHistoryDateObj] = useState(new Date());

  const fetchLeaveHistory = async () => {
    try {
      setLoadingHistory(true);
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }
      const employee = JSON.parse(stored);

      let url = `${BACKEND_URL}/leave-request/employee/${employee.emp_id}`;
      if (historyFilterDate) {
        url += `?date=${historyFilterDate}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setLeaveHistory(data);
    } catch (error) {
      console.error("Error fetching leave history:", error);
      Alert.alert("Error", "Failed to load leave history");
    } finally {
      setLoadingHistory(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (showHistory) {
        fetchLeaveHistory();
      }
    }, [showHistory, historyFilterDate])
  );

  const submitLeave = async () => {
    try {
      if (!leaveType.trim() || !fromDate || !toDate || !reason.trim()) {
        Alert.alert("Validation", "Please fill all fields");
        return;
      }

      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }

      const employee = JSON.parse(stored);

      const res = await fetch(`${BACKEND_URL}/leave-request/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: employee.emp_id,
          employeeName: employee.name,
          leaveType,
          fromDate,
          toDate,
          reason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert("Success", "Leave request submitted successfully");
        setLeaveType("");
        setFromDate("");
        setToDate("");
        setReason("");
        setFromDateObj(new Date());
        setToDateObj(new Date());
        // Refresh history if open
        if (showHistory) {
          fetchLeaveHistory();
        }
      } else {
        Alert.alert("Error", data.message);
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to submit request");
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

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  /* ================= SKELETON ================= */
  const SkeletonBox = ({
    width = "100%",
    height = 48,
    className = "",
  }: {
    width?: string | number;
    height?: number;
    className?: string;
  }) => (
    <View
      className={`bg-gray-200 rounded-xl ${className}`}
      style={{ width, height }}
    />
  );

  const LeaveSkeleton = () => (
    <View className="p-5">
      <SkeletonBox width={90} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-5" />
      <SkeletonBox width={85} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-5" />
      <SkeletonBox width={70} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-5" />
      <SkeletonBox width={65} height={16} className="mb-2" />
      <SkeletonBox height={110} className="mb-6" />
      <SkeletonBox height={56} />
    </View>
  );

  const HistorySkeleton = () => (
    <View className="p-5">
      <SkeletonBox width={140} height={26} className="mb-5" />
      <SkeletonBox width={110} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-6" />

      {[1, 2, 3].map((item) => (
        <View
          key={item}
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
        >
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <SkeletonBox width={110} height={18} />
              <SkeletonBox width={180} height={13} className="mt-2" />
            </View>
            <SkeletonBox width={75} height={28} />
          </View>
          <SkeletonBox width="90%" height={14} className="mt-4" />
          <SkeletonBox width={150} height={12} className="mt-3" />
        </View>
      ))}
    </View>
  );

  /* ================= FOOTER ================= */
  const Footer = () => (
    <View className="mt-8 mb-6 px-5">
      <View className="border-t border-gray-200 pt-4 items-center">
        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>
        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Leave Management
        </Text>
        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>
      </View>
    </View>
  );

  const FooterSkeleton = () => (
    <View className="mt-8 mb-6 px-5">
      <View className="border-t border-gray-200 pt-4 items-center">
        <SkeletonBox width={155} height={16} />
        <SkeletonBox width={170} height={12} className="mt-2" />
        <SkeletonBox width={250} height={12} className="mt-2" />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* HEADER - SAME STANDARD EMPLOYEE HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-1"
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <View className="flex-1 ml-4">
            <Text className="text-white text-2xl font-bold mt-1">
              Leave Request
            </Text>
            <Text className="text-green-100 text-sm mt-1">
              Submit and track your leave requests
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowHistory(!showHistory)}
            className="mt-1 ml-2"
            activeOpacity={0.8}
          >
            <MaterialIcons name="history" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 130, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl 
            refreshing={loadingHistory} 
            onRefresh={fetchLeaveHistory} 
            colors={["#024e32"]} 
          />
        }
      >
        {showHistory ? (
          // Leave History Section
          <View className="p-5">
            <Text className="text-2xl font-bold text-gray-800 mb-4">Leave History</Text>

            {/* Date Filter */}
            <View className="mb-4">
              <Text className="font-semibold text-gray-800 mb-2">Filter by Date:</Text>
              <TouchableOpacity
                onPress={() => setShowHistoryDatePicker(true)}
                className="flex-row items-center bg-white border border-gray-300 rounded-xl px-4 py-3"
              >
                <Text className={historyFilterDate ? "flex-1 text-gray-800" : "flex-1 text-gray-400"}>
                  {historyFilterDate || "Select Date"}
                </Text>
                <MaterialIcons name="calendar-month" size={24} color="#024e32" />
              </TouchableOpacity>
              {historyFilterDate && (
                <TouchableOpacity
                  onPress={() => {
                    setHistoryFilterDate("");
                    setHistoryDateObj(new Date());
                  }}
                  className="mt-2"
                >
                  <Text className="text-red-600 text-sm text-center">Clear Filter</Text>
                </TouchableOpacity>
              )}
            </View>

            {showHistoryDatePicker && (
              <DateTimePicker
                value={historyDateObj}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowHistoryDatePicker(false);
                  if (selectedDate) {
                    setHistoryDateObj(selectedDate);
                    setHistoryFilterDate(formatDate(selectedDate));
                  }
                }}
              />
            )}

            {loadingHistory ? (
              <HistorySkeleton />
            ) : leaveHistory.length === 0 ? (
              <View className="items-center justify-center py-10">
                <MaterialIcons name="event-busy" size={64} color="#ccc" />
                <Text className="text-gray-400 text-lg mt-4">No leave requests found</Text>
              </View>
            ) : (
              leaveHistory.map((leave) => (
                <View
                  key={leave._id}
                  className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text className="text-gray-800 font-bold text-lg">
                        {leave.leaveType}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${getStatusColor(leave.status).split(" ")[0]}`}>
                      <Text className={`text-xs font-semibold ${getStatusColor(leave.status).split(" ")[1]}`}>
                        {leave.status}
                      </Text>
                    </View>
                  </View>
                  <Text className="text-gray-600 text-sm mt-2">Reason: {leave.reason}</Text>
                  <Text className="text-gray-400 text-xs mt-2">
                    Submitted: {new Date(leave.createdAt).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        ) : (
          // Leave Request Form Section
          <>
            <View className="p-5">
              {/* Leave Type */}
              <Text className="font-semibold text-gray-800 mb-2">Leave Type</Text>
              <TextInput
                value={leaveType}
                onChangeText={setLeaveType}
                placeholder="Casual / Sick / Personal"
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
              />

              {/* From Date */}
              <Text className="font-semibold text-gray-800 mb-2">From Date</Text>
              <View className="flex-row items-center bg-white border border-gray-300 rounded-xl mb-4">
                <TextInput
                  value={fromDate}
                  editable={false}
                  placeholder="Select From Date"
                  className="flex-1 px-4 py-3"
                />
                <TouchableOpacity onPress={() => setShowFromPicker(true)} className="px-4">
                  <MaterialIcons name="calendar-month" size={24} color="#024e32" />
                </TouchableOpacity>
              </View>

              {showFromPicker && (
                <DateTimePicker
                  value={fromDateObj}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) {
                      setFromDateObj(selectedDate);
                      const formatted = selectedDate.getFullYear() +
                        "-" +
                        String(selectedDate.getMonth() + 1).padStart(2, "0") +
                        "-" +
                        String(selectedDate.getDate()).padStart(2, "0");
                      setFromDate(formatted);
                    }
                  }}
                />
              )}

              {/* To Date */}
              <Text className="font-semibold text-gray-800 mb-2">To Date</Text>
              <View className="flex-row items-center bg-white border border-gray-300 rounded-xl mb-4">
                <TextInput
                  value={toDate}
                  editable={false}
                  placeholder="Select To Date"
                  className="flex-1 px-4 py-3"
                />
                <TouchableOpacity onPress={() => setShowToPicker(true)} className="px-4">
                  <MaterialIcons name="calendar-month" size={24} color="#024e32" />
                </TouchableOpacity>
              </View>

              {showToPicker && (
                <DateTimePicker
                  value={toDateObj}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) {
                      setToDateObj(selectedDate);
                      const formatted = selectedDate.getFullYear() +
                        "-" +
                        String(selectedDate.getMonth() + 1).padStart(2, "0") +
                        "-" +
                        String(selectedDate.getDate()).padStart(2, "0");
                      setToDate(formatted);
                    }
                  }}
                />
              )}

              {/* Reason */}
              <Text className="font-semibold text-gray-800 mb-2">Reason</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6"
              />

              {/* Submit Button */}
              <TouchableOpacity onPress={submitLeave} className="bg-[#024e32] py-4 rounded-xl">
                <Text className="text-white text-center font-bold text-base">
                  Submit Leave Request
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* FOOTER */}
        {loadingHistory ? <FooterSkeleton /> : <Footer />}
      </ScrollView>
    </SafeAreaView>
  );
}