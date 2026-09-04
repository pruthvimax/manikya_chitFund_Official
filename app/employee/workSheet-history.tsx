import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import BACKEND_URL from "../../config";

interface WorkSheet {
  _id: string;
  emp_id: string;
  employeeName: string;
  date: string;
  phoneFollowupsCount: number;
  phoneFollowupsCustomers: string;
  customerVisitsCount: number;
  customerVisitsDetails: string;
  gpsPhotosCount: number;
  notes: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

export default function WorkSheetHistory() {
  const router = useRouter();
  const [workSheets, setWorkSheets] = useState<WorkSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWorkSheet, setSelectedWorkSheet] = useState<WorkSheet | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  const fetchWorkSheets = async () => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }
      const employee = JSON.parse(stored);

      const response = await fetch(`${BACKEND_URL}/worksheet/employee/${employee.emp_id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setWorkSheets(data);
    } catch (error) {
      console.error("Error fetching work sheets:", error);
      Alert.alert("Error", "Failed to load work sheet history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkSheets();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkSheets();
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

  // Filter work sheets based on search query and status filter
  const filteredWorkSheets = workSheets.filter(worksheet => {
    const matchesSearch = 
      new Date(worksheet.date).toLocaleDateString().includes(searchQuery) ||
      worksheet.status?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === "All" || worksheet.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

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

  const PageSkeleton = () => (
    <View className="px-5 pt-5">
      <SkeletonBox height={48} className="mb-3" />
      <View className="flex-row flex-wrap mb-3">
        <SkeletonBox width={90} height={36} className="mr-3 mb-2" />
        <SkeletonBox width={105} height={36} className="mr-3 mb-2" />
        <SkeletonBox width={105} height={36} className="mr-3 mb-2" />
        <SkeletonBox width={95} height={36} className="mb-2" />
      </View>

      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={index}
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
        >
          <View className="flex-row justify-between items-center mb-4">
            <SkeletonBox width={120} height={20} />
            <SkeletonBox width={75} height={26} />
          </View>

          <View className="flex-row justify-between mb-3">
            <View className="items-center">
              <SkeletonBox width={45} height={28} />
              <SkeletonBox width={45} height={11} className="mt-2" />
            </View>
            <View className="items-center">
              <SkeletonBox width={45} height={28} />
              <SkeletonBox width={45} height={11} className="mt-2" />
            </View>
            <View className="items-center">
              <SkeletonBox width={45} height={28} />
              <SkeletonBox width={45} height={11} className="mt-2" />
            </View>
          </View>

          <SkeletonBox width={180} height={11} />
        </View>
      ))}

      <FooterSkeleton />
    </View>
  );

  /* ================= FOOTER ================= */
  const Footer = () => (
    <View className="mt-5 mb-6 px-5">
      <View className="border-t border-gray-200 pt-4 items-center">
        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>
        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Work Sheet History
        </Text>
        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>
      </View>
    </View>
  );

  const FooterSkeleton = () => (
    <View className="mt-5 mb-6 px-5">
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
              Work Sheet History
            </Text>
            <Text className="text-green-100 text-sm mt-1">
              {filteredWorkSheets.length} work sheets
            </Text>
          </View>

          <TouchableOpacity
            onPress={fetchWorkSheets}
            className="mt-1"
            activeOpacity={0.8}
          >
            <MaterialIcons name="refresh" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 130, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#024e32"]} />
        }
      >
        {loading ? (
          <PageSkeleton />
        ) : (
          <>
        {/* Search Bar */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-2 border border-gray-200">
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              className="flex-1 ml-2 text-base"
              placeholder="Search by date or status..."
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
        </View>

        {/* Filter by Status */}
        <View className="px-5 py-2">
          <Text className="text-gray-600 text-sm mb-2">Filter by Status:</Text>
          <View className="flex-row flex-wrap">
            {["All", "Pending", "Approved", "Rejected"].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setFilterStatus(status as any)}
                className={`mr-3 mb-2 px-4 py-2 rounded-full ${
                  filterStatus === status ? "bg-[#024e32]" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`font-semibold ${
                    filterStatus === status ? "text-white" : "text-gray-700"
                  }`}
                >
                  {status} ({workSheets.filter(w => status === "All" ? true : w.status === status).length})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Work Sheets List */}
        <View className="p-5">
          {filteredWorkSheets.length === 0 ? (
            <View className="items-center justify-center py-10">
              <MaterialIcons name="assignment" size={64} color="#ccc" />
              <Text className="text-gray-400 text-lg mt-4">No work sheets found</Text>
            </View>
          ) : (
            filteredWorkSheets.map((worksheet) => (
              <TouchableOpacity
                key={worksheet._id}
                onPress={() => {
                  setSelectedWorkSheet(worksheet);
                  setModalVisible(true);
                }}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View>
                    <Text className="text-gray-800 font-bold text-lg">
                      {new Date(worksheet.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(worksheet.status).split(" ")[0]}`}>
                    <Text className={`text-xs font-semibold ${getStatusColor(worksheet.status).split(" ")[1]}`}>
                      {worksheet.status}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between mb-2">
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-blue-600">{worksheet.phoneFollowupsCount}</Text>
                    <Text className="text-gray-500 text-xs">Calls</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-green-600">{worksheet.customerVisitsCount}</Text>
                    <Text className="text-gray-500 text-xs">Visits</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-2xl font-bold text-purple-600">{worksheet.gpsPhotosCount}</Text>
                    <Text className="text-gray-500 text-xs">Photos</Text>
                  </View>
                </View>

                <Text className="text-gray-400 text-xs">
                  Submitted: {new Date(worksheet.createdAt).toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
          <View className="h-5" />
        </View>

        <Footer />
          </>
        )}
      </ScrollView>

      {/* Work Sheet Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[85%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Work Sheet Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-5" 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {selectedWorkSheet && (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Date</Text>
                    <Text className="text-gray-800 text-base font-semibold">
                      {new Date(selectedWorkSheet.date).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Status</Text>
                    <View className={`self-start px-3 py-1 rounded-full ${getStatusColor(selectedWorkSheet.status).split(" ")[0]}`}>
                      <Text className={`font-semibold ${getStatusColor(selectedWorkSheet.status).split(" ")[1]}`}>
                        {selectedWorkSheet.status}
                      </Text>
                    </View>
                  </View>

                  <View className="mb-4 p-3 bg-blue-50 rounded-xl">
                    <Text className="text-gray-600 text-sm mb-2 font-semibold">📞 Phone Follow-ups</Text>
                    <Text className="text-gray-800">Total Calls: {selectedWorkSheet.phoneFollowupsCount}</Text>
                    <Text className="text-gray-600 text-sm mt-2">Customers: {selectedWorkSheet.phoneFollowupsCustomers}</Text>
                  </View>

                  <View className="mb-4 p-3 bg-green-50 rounded-xl">
                    <Text className="text-gray-600 text-sm mb-2 font-semibold">🚶 Customer Visits</Text>
                    <Text className="text-gray-800">Total Visits: {selectedWorkSheet.customerVisitsCount}</Text>
                    <Text className="text-gray-600 text-sm mt-2">Details: {selectedWorkSheet.customerVisitsDetails}</Text>
                  </View>

                  <View className="mb-4 p-3 bg-purple-50 rounded-xl">
                    <Text className="text-gray-600 text-sm mb-2 font-semibold">📸 GPS Photos</Text>
                    <Text className="text-gray-800">Total Photos: {selectedWorkSheet.gpsPhotosCount}</Text>
                  </View>

                  {selectedWorkSheet.notes && (
                    <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                      <Text className="text-gray-600 text-sm mb-2 font-semibold">📝 Notes</Text>
                      <Text className="text-gray-600">{selectedWorkSheet.notes}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}