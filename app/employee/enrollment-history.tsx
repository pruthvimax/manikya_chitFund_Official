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

interface Enrollment {
  _id: string;
  customerName: string;
  mobileNumber: string;
  chitAmount: string;
  chitDuration: string;
  collectionType: string;
  advancePaid: string;
  paymentType: string;
  enrollmentDate: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
}

export default function EnrollmentHistory() {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  const fetchEnrollments = async () => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }
      const employee = JSON.parse(stored);

      const response = await fetch(`${BACKEND_URL}/enrollment/employee/${employee.emp_id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setEnrollments(data);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      Alert.alert("Error", "Failed to load enrollment history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchEnrollments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchEnrollments();
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

  // Filter enrollments based on search query and status filter
  const filteredEnrollments = enrollments.filter(enrollment => {
    const matchesSearch = 
      enrollment.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.mobileNumber?.includes(searchQuery);
    
    const matchesStatus = filterStatus === "All" || enrollment.status === filterStatus;
    
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
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        paddingTop: 110,
        paddingHorizontal: 20,
        paddingBottom: 30,
      }}
      showsVerticalScrollIndicator={false}
    >
      <SkeletonBox height={48} className="mb-4" />

      <View className="flex-row flex-wrap mb-4">
        <SkeletonBox width={70} height={36} className="mr-3 mb-2" />
        <SkeletonBox width={105} height={36} className="mr-3 mb-2" />
        <SkeletonBox width={105} height={36} className="mr-3 mb-2" />
        <SkeletonBox width={105} height={36} className="mb-2" />
      </View>

      {Array.from({ length: 5 }).map((_, index) => (
        <View
          key={index}
          className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
        >
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1">
              <SkeletonBox width={150} height={20} />
              <SkeletonBox width={100} height={13} className="mt-2" />
            </View>
            <SkeletonBox width={75} height={28} />
          </View>

          <View className="flex-row justify-between">
            <SkeletonBox width={100} height={13} />
            <SkeletonBox width={105} height={13} />
          </View>

          <View className="flex-row justify-between mt-3">
            <SkeletonBox width={95} height={11} />
            <SkeletonBox width={105} height={11} />
          </View>
        </View>
      ))}

      <FooterSkeleton />
    </ScrollView>
  );

  /* ================= FOOTER ================= */
  const Footer = () => (
    <View className="mt-5 mb-6 px-5">
      <View className="border-t border-gray-200 pt-4 items-center">
        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>
        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Enrollment History
        </Text>
        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>
      </View>
    </View>
  );

  const FooterSkeleton = () => (
    <View className="mt-5 mb-6 items-center">
      <View className="border-t border-gray-200 pt-4 w-full items-center">
        <SkeletonBox width={160} height={16} />
        <SkeletonBox width={180} height={12} className="mt-2" />
        <SkeletonBox width={250} height={12} className="mt-2" />
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* HEADER - SAME AS PREVIOUS STANDARD EMPLOYEE HEADER */}
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
              Enrollment History
            </Text>
            <Text className="text-green-100 text-sm mt-1">
              {filteredEnrollments.length} enrollments
            </Text>
          </View>

          <TouchableOpacity
            onPress={fetchEnrollments}
            className="mt-1"
            activeOpacity={0.8}
          >
            <MaterialIcons name="refresh" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <PageSkeleton />
      ) : (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 130,
          paddingBottom: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
          />
        }
      >
        {/* Search Bar */}
        <View className="px-5 pt-4 pb-2">
          <View className="flex-row items-center bg-white rounded-xl px-4 py-2 border border-gray-200">
            <MaterialIcons name="search" size={20} color="#666" />
            <TextInput
              className="flex-1 ml-2 text-base"
              placeholder="Search by customer name or mobile number..."
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
                  {status} ({enrollments.filter(e => status === "All" ? true : e.status === status).length})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Enrollments List */}
        <View className="p-5">
          {filteredEnrollments.length === 0 ? (
            <View className="items-center justify-center py-10">
              <MaterialIcons name="person-add" size={64} color="#ccc" />
              <Text className="text-gray-400 text-lg mt-4">No enrollments found</Text>
            </View>
          ) : (
            filteredEnrollments.map((enrollment) => (
              <TouchableOpacity
                key={enrollment._id}
                onPress={() => {
                  setSelectedEnrollment(enrollment);
                  setModalVisible(true);
                }}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                activeOpacity={0.7}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1">
                    <Text className="text-gray-800 font-bold text-lg">
                      {enrollment.customerName}
                    </Text>
                    <Text className="text-gray-500 text-sm">{enrollment.mobileNumber}</Text>
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(enrollment.status).split(" ")[0]}`}>
                    <Text className={`text-xs font-semibold ${getStatusColor(enrollment.status).split(" ")[1]}`}>
                      {enrollment.status}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-600 text-sm">Chit: {enrollment.chitAmount}</Text>
                  <Text className="text-gray-600 text-sm">Advance: ₹{enrollment.advancePaid}</Text>
                </View>

                <View className="flex-row justify-between">
                  <Text className="text-gray-500 text-xs">Duration: {enrollment.chitDuration}</Text>
                  <Text className="text-gray-500 text-xs">Collection: {enrollment.collectionType}</Text>
                </View>

                <Text className="text-gray-400 text-xs mt-2">
                  Enrolled: {new Date(enrollment.enrollmentDate).toLocaleDateString()}
                </Text>
              </TouchableOpacity>
            ))
          )}
          <View className="h-5" />
        </View>

        <Footer />
      </ScrollView>
      )}

      {/* Enrollment Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[85%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Enrollment Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-5" 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {selectedEnrollment && (
                <>
                  <View className="mb-4 p-3 bg-blue-50 rounded-xl">
                    <Text className="text-gray-600 text-sm mb-2 font-semibold">Customer Details</Text>
                    <Text className="text-gray-800 font-bold">{selectedEnrollment.customerName}</Text>
                    <Text className="text-gray-600 text-sm">Mobile: {selectedEnrollment.mobileNumber}</Text>
                  </View>

                  <View className="mb-4 p-3 bg-green-50 rounded-xl">
                    <Text className="text-gray-600 text-sm mb-2 font-semibold">Chit Details</Text>
                    <Text className="text-gray-800">Amount: {selectedEnrollment.chitAmount}</Text>
                    <Text className="text-gray-800">Duration: {selectedEnrollment.chitDuration}</Text>
                    <Text className="text-gray-800">Collection: {selectedEnrollment.collectionType}</Text>
                  </View>

                  <View className="mb-4 p-3 bg-purple-50 rounded-xl">
                    <Text className="text-gray-600 text-sm mb-2 font-semibold">Payment Details</Text>
                    <Text className="text-gray-800">Advance Paid: ₹{selectedEnrollment.advancePaid}</Text>
                    <Text className="text-gray-800">Payment Type: {selectedEnrollment.paymentType}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Enrollment Date</Text>
                    <Text className="text-gray-800">{new Date(selectedEnrollment.enrollmentDate).toLocaleDateString()}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Status</Text>
                    <View className={`self-start px-3 py-1 rounded-full ${getStatusColor(selectedEnrollment.status).split(" ")[0]}`}>
                      <Text className={`font-semibold ${getStatusColor(selectedEnrollment.status).split(" ")[1]}`}>
                        {selectedEnrollment.status}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}