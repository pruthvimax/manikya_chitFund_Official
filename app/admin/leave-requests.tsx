import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState, useRef, useEffect } from "react";
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
  Animated,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../../config";

interface LeaveRequest {
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
          <View className="h-4 bg-gray-200 rounded w-20" />
        </View>
        <View className="w-16 h-6 bg-gray-200 rounded-full" />
      </View>
      <View className="mb-2">
        <View className="h-4 bg-gray-200 rounded w-24 mb-2" />
        <View className="h-3 bg-gray-200 rounded w-40 mb-1" />
        <View className="h-3 bg-gray-200 rounded w-28" />
      </View>
    </Animated.View>
  );

  if (isDesktopOrLaptop) {
    return (
      <View className="px-5">
        <View className="flex-row flex-wrap gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View key={item} className="w-[calc(50%-8px)]">
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

export default function LeaveRequests() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchLeaves = async () => {
    try {
      console.log("Fetching from:", `${BACKEND_URL}/leave-request`);
      
      const response = await fetch(`${BACKEND_URL}/leave-request`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Fetched leaves:", data);
      setLeaves(data);
    } catch (error) {
      console.error("Error fetching leaves:", error);
      Alert.alert("Error", "Failed to load leave requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLeaves();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaves();
  };

  // ✅ Accept Leave Request
  const handleAccept = async (id: string, employeeName: string) => {
    Alert.alert(
      "Accept Request",
      `Accept leave request for ${employeeName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/leave-request/${id}/status`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "Approved" }),
              });
              
              if (!response.ok) throw new Error("Accept failed");
              
              Alert.alert("Success", "Leave request accepted");
              fetchLeaves();
              setModalVisible(false);
            } catch (error) {
              Alert.alert("Error", "Failed to accept");
            }
          },
        },
      ]
    );
  };

  // ❌ Reject Leave Request
  const handleReject = async (id: string, employeeName: string) => {
    Alert.alert(
      "Reject Request",
      `Reject leave request for ${employeeName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/leave-request/${id}/status`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "Rejected" }),
              });
              
              if (!response.ok) throw new Error("Reject failed");
              
              Alert.alert("Success", "Leave request rejected");
              fetchLeaves();
              setModalVisible(false);
            } catch (error) {
              Alert.alert("Error", "Failed to reject");
            }
          },
        },
      ]
    );
  };

  // 🗑️ Delete Leave Request
  const handleDelete = async (id: string, employeeName: string) => {
    Alert.alert(
      "Delete Request",
      `Delete leave request for ${employeeName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/leave-request/${id}`, {
                method: "DELETE",
              });
              
              if (!response.ok) throw new Error("Delete failed");
              
              Alert.alert("Success", "Leave request deleted");
              fetchLeaves();
              setModalVisible(false);
            } catch (error) {
              Alert.alert("Error", "Failed to delete");
            }
          },
        },
      ]
    );
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

  const filteredLeaves = filter === "All" 
    ? leaves.filter(leave => 
        leave.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.emp_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.leaveType?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leaves.filter(leave => 
        leave.status === filter &&
        (leave.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.emp_id?.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  // ============ RENDER ============

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* HEADER - Updated to match Groups.tsx style */}
      <View className={`bg-[#024e32] absolute top-0 left-0 right-0 z-50 ${
        isDesktopOrLaptop ? 'px-8 pt-20 pb-8' : 'px-5 pt-16 pb-6'
      }`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity 
              onPress={() => router.back()}
              className={isDesktopOrLaptop ? 'p-2' : 'mr-3'}
              activeOpacity={0.7}
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
              Leave Requests
            </Text>
          </View>
          
          {!loading && (
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-medium text-sm">
                {leaves.length} Total
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          paddingTop: isDesktopOrLaptop ? 140 : 110,
          paddingBottom: 20
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className={`${isDesktopOrLaptop ? 'px-8' : 'px-5'} pt-4`}>
          {loading ? (
            <SkeletonLoader isDesktopOrLaptop={isDesktopOrLaptop} />
          ) : (
            <>
              {/* Search Bar */}
              <View className="mb-4">
                <View className="flex-row items-center bg-white rounded-xl px-4 py-2 border border-gray-200">
                  <MaterialIcons name="search" size={20} color="#666" />
                  <TextInput
                    className="flex-1 ml-2 text-base"
                    placeholder="Search by employee name, ID or leave type..."
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

              {/* Filter Tabs */}
              <View className="flex-row flex-wrap mb-4">
                {["All", "Pending", "Approved", "Rejected"].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setFilter(tab as any)}
                    className={`mr-2 mb-2 px-4 py-2 rounded-full ${
                      filter === tab ? "bg-[#024e32]" : "bg-gray-200"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        filter === tab ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {tab} ({leaves.filter(l => tab === "All" ? true : l.status === tab).length})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Leave List */}
              {filteredLeaves.length === 0 ? (
                <View className="items-center justify-center py-10">
                  <MaterialIcons name="event-busy" size={64} color="#ccc" />
                  <Text className="text-gray-400 text-lg mt-4">No leave requests found</Text>
                </View>
              ) : (
                filteredLeaves.map((leave) => (
                  <TouchableOpacity
                    key={leave._id}
                    onPress={() => {
                      setSelectedLeave(leave);
                      setModalVisible(true);
                    }}
                    className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-gray-800 font-bold text-lg">
                          {leave.employeeName}
                        </Text>
                        <Text className="text-gray-500 text-sm">ID: {leave.emp_id}</Text>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(leave.status).split(" ")[0]}`}>
                        <Text className={`text-xs font-semibold ${getStatusColor(leave.status).split(" ")[1]}`}>
                          {leave.status}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="mb-2">
                      <Text className="text-gray-700 font-semibold">
                        {leave.leaveType}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Duration: {Math.ceil(
                          (new Date(leave.toDate).getTime() - new Date(leave.fromDate).getTime()) /
                          (1000 * 60 * 60 * 24) + 1
                        )} days
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}

              {/* FOOTER - Updated to match Groups.tsx style */}
              <View className="mt-10 pt-6 border-t border-gray-200">
                <View className="items-center">
                  <Text className="text-[#024e32] font-bold text-lg">
                    MANIKYA CHITS PVT LTD
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    Leave Requests Management
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

      {/* Leave Details Modal with Action Buttons */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[85%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Leave Request Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-5" 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {selectedLeave && (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Employee</Text>
                    <Text className="text-gray-800 text-base font-semibold">
                      {selectedLeave.employeeName}
                    </Text>
                    <Text className="text-gray-500 text-sm">ID: {selectedLeave.emp_id}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Leave Type</Text>
                    <Text className="text-gray-800 text-base">{selectedLeave.leaveType}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Date Range</Text>
                    <Text className="text-gray-800 text-base">
                      {new Date(selectedLeave.fromDate).toLocaleDateString()} - {new Date(selectedLeave.toDate).toLocaleDateString()}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      Duration: {Math.ceil(
                        (new Date(selectedLeave.toDate).getTime() - new Date(selectedLeave.fromDate).getTime()) /
                        (1000 * 60 * 60 * 24) + 1
                      )} days
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Reason</Text>
                    <Text className="text-gray-800 text-base">{selectedLeave.reason}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Submitted On</Text>
                    <Text className="text-gray-800 text-base">
                      {new Date(selectedLeave.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Status</Text>
                    <View className={`self-start px-3 py-1 rounded-full ${getStatusColor(selectedLeave.status).split(" ")[0]}`}>
                      <Text className={`font-semibold ${getStatusColor(selectedLeave.status).split(" ")[1]}`}>
                        {selectedLeave.status}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="mt-4">
                    {selectedLeave.status === "Pending" && (
                      <View className="flex-row mb-3">
                        <TouchableOpacity
                          onPress={() => handleAccept(selectedLeave._id, selectedLeave.employeeName)}
                          className="flex-1 bg-green-600 py-3 rounded-xl mr-2 items-center"
                        >
                          <MaterialIcons name="check-circle" size={20} color="white" />
                          <Text className="text-white text-center font-bold mt-1">Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleReject(selectedLeave._id, selectedLeave.employeeName)}
                          className="flex-1 bg-red-600 py-3 rounded-xl ml-2 items-center"
                        >
                          <MaterialIcons name="cancel" size={20} color="white" />
                          <Text className="text-white text-center font-bold mt-1">Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {selectedLeave.status !== "Pending" && (
                      <View className="mb-3">
                        <Text className="text-center text-gray-500 text-sm">
                          This request has been {selectedLeave.status.toLowerCase()}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleDelete(selectedLeave._id, selectedLeave.employeeName)}
                      className="bg-red-600 py-3 rounded-xl items-center"
                    >
                      <MaterialIcons name="delete" size={20} color="white" />
                      <Text className="text-white text-center font-bold mt-1">Delete Request</Text>
                    </TouchableOpacity>
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