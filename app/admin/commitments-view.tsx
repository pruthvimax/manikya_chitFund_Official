import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  Animated,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../../config";

interface Commitment {
  _id: string;
  emp_id: string;
  employeeName: string;
  customerType: "Hot" | "Warm" | "Cold";
  customerName: string;
  phoneNumber: string;
  address: string;
  commitmentDate: string;
  commitmentTime: string;
  purpose: string;
  status: "Pending" | "Completed" | "Cancelled";
  followUpDate: string;
  notes: string;
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
          <View className="h-4 bg-gray-200 rounded w-24" />
        </View>
        <View className="w-16 h-6 bg-gray-200 rounded-full" />
      </View>
      <View className="mb-2">
        <View className="h-4 bg-gray-200 rounded w-40 mb-1" />
        <View className="h-4 bg-gray-200 rounded w-28" />
      </View>
      <View className="flex-row justify-between items-center">
        <View className="w-16 h-6 bg-gray-200 rounded-full" />
        <View className="h-3 bg-gray-200 rounded w-20" />
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

export default function AdminCommitmentsView() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCustomer, setFilterCustomer] = useState<"All" | "Hot" | "Warm" | "Cold">("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "Pending" | "Completed" | "Cancelled">("All");
  const [selectedCommitment, setSelectedCommitment] = useState<Commitment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchCommitments = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/commitment/`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setCommitments(data);
    } catch (error) {
      console.error("Error fetching commitments:", error);
      Alert.alert("Error", "Failed to load commitments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCommitments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommitments();
  };

  // ✅ Approve Commitment
  const handleApprove = async (id: string, customerName: string) => {
    Alert.alert(
      "Approve Commitment",
      `Approve commitment for ${customerName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/commitment/${id}/status`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "Completed" }),
              });

              if (!response.ok) throw new Error("Approve failed");

              Alert.alert("Success", "Commitment approved successfully");
              fetchCommitments();
              setModalVisible(false);
            } catch (error) {
              Alert.alert("Error", "Failed to approve commitment");
            }
          },
        },
      ]
    );
  };

  // ❌ Cancel Commitment
  const handleCancel = async (id: string, customerName: string) => {
    Alert.alert(
      "Cancel Commitment",
      `Cancel commitment for ${customerName}?`,
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/commitment/${id}/status`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status: "Cancelled" }),
              });

              if (!response.ok) throw new Error("Cancel failed");

              Alert.alert("Success", "Commitment cancelled successfully");
              fetchCommitments();
              setModalVisible(false);
            } catch (error) {
              Alert.alert("Error", "Failed to cancel commitment");
            }
          },
        },
      ]
    );
  };

  // 🗑️ Delete Commitment
  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Commitment",
      "Are you sure you want to delete this commitment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/commitment/${id}`, {
                method: "DELETE",
              });

              if (!response.ok) throw new Error("Delete failed");

              Alert.alert("Success", "Commitment deleted");
              fetchCommitments();
              setModalVisible(false);
            } catch (error) {
              Alert.alert("Error", "Failed to delete");
            }
          },
        },
      ]
    );
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case "Hot":
        return "bg-red-100 text-red-600";
      case "Warm":
        return "bg-orange-100 text-orange-600";
      default:
        return "bg-blue-100 text-blue-600";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-600";
      case "Cancelled":
        return "bg-red-100 text-red-600";
      default:
        return "bg-yellow-100 text-yellow-600";
    }
  };

  const filteredCommitments = commitments.filter(commitment => {
    const matchesSearch = 
      commitment.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commitment.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commitment.phoneNumber?.includes(searchQuery);
    
    const matchesCustomer = filterCustomer === "All" || commitment.customerType === filterCustomer;
    const matchesStatus = filterStatus === "All" || commitment.status === filterStatus;
    
    return matchesSearch && matchesCustomer && matchesStatus;
  });

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
              Commitments
            </Text>
          </View>
          
          {!loading && (
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-medium text-sm">
                {commitments.length} Total
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
                    placeholder="Search by customer name, employee or phone..."
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

              {/* Filter by Customer Type */}
              <View className="mb-3">
                <Text className="text-gray-600 text-sm mb-2">Filter by Customer Type:</Text>
                <View className="flex-row flex-wrap">
                  {["All", "Hot", "Warm", "Cold"].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setFilterCustomer(type as any)}
                      className={`mr-2 mb-2 px-4 py-2 rounded-full ${
                        filterCustomer === type 
                          ? type === "Hot" 
                            ? "bg-red-600" 
                            : type === "Warm" 
                            ? "bg-orange-500" 
                            : type === "Cold"
                            ? "bg-blue-600"
                            : "bg-[#024e32]"
                          : "bg-gray-200"
                      }`}
                    >
                      <Text className={`font-semibold ${filterCustomer === type ? "text-white" : "text-gray-700"}`}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Filter by Status */}
              <View className="mb-4">
                <Text className="text-gray-600 text-sm mb-2">Filter by Status:</Text>
                <View className="flex-row flex-wrap">
                  {["All", "Pending", "Completed", "Cancelled"].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setFilterStatus(status as any)}
                      className={`mr-2 mb-2 px-4 py-2 rounded-full ${
                        filterStatus === status ? "bg-[#024e32]" : "bg-gray-200"
                      }`}
                    >
                      <Text className={`font-semibold ${filterStatus === status ? "text-white" : "text-gray-700"}`}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Commitments List */}
              {filteredCommitments.length === 0 ? (
                <View className="items-center justify-center py-10">
                  <MaterialIcons name="assignment" size={64} color="#ccc" />
                  <Text className="text-gray-400 text-lg mt-4">No commitments found</Text>
                </View>
              ) : (
                filteredCommitments.map((commitment) => (
                  <TouchableOpacity
                    key={commitment._id}
                    onPress={() => {
                      setSelectedCommitment(commitment);
                      setModalVisible(true);
                    }}
                    className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-gray-800 font-bold text-lg">
                          {commitment.customerName}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          Employee: {commitment.employeeName} ({commitment.emp_id})
                        </Text>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${getCustomerTypeColor(commitment.customerType).split(" ")[0]}`}>
                        <Text className={`text-xs font-semibold ${getCustomerTypeColor(commitment.customerType).split(" ")[1]}`}>
                          {commitment.customerType}
                        </Text>
                      </View>
                    </View>

                    <View className="mb-2">
                      <Text className="text-gray-600 text-sm">
                        {new Date(commitment.commitmentDate).toLocaleDateString()} at {commitment.commitmentTime}
                      </Text>
                      <Text className="text-gray-600 text-sm mt-1">{commitment.purpose}</Text>
                    </View>

                    <View className="flex-row justify-between items-center">
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(commitment.status).split(" ")[0]}`}>
                        <Text className={`text-xs font-semibold ${getStatusColor(commitment.status).split(" ")[1]}`}>
                          {commitment.status}
                        </Text>
                      </View>
                      <Text className="text-gray-400 text-xs">
                        {new Date(commitment.createdAt).toLocaleDateString()}
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
                    Commitments Management
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

      {/* Commitment Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[90%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Commitment Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-5" 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 30 }}
            >
              {selectedCommitment && (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Employee</Text>
                    <Text className="text-gray-800 text-base font-semibold">
                      {selectedCommitment.employeeName} ({selectedCommitment.emp_id})
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Customer Type</Text>
                    <View className={`self-start px-3 py-1 rounded-full ${getCustomerTypeColor(selectedCommitment.customerType).split(" ")[0]}`}>
                      <Text className={`font-semibold ${getCustomerTypeColor(selectedCommitment.customerType).split(" ")[1]}`}>
                        {selectedCommitment.customerType}
                      </Text>
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Customer Name</Text>
                    <Text className="text-gray-800 text-base">{selectedCommitment.customerName}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Phone Number</Text>
                    <Text className="text-gray-800 text-base">{selectedCommitment.phoneNumber}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Address</Text>
                    <Text className="text-gray-800 text-base">{selectedCommitment.address}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Date & Time</Text>
                    <Text className="text-gray-800 text-base">
                      {new Date(selectedCommitment.commitmentDate).toLocaleDateString()} at {selectedCommitment.commitmentTime}
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Purpose</Text>
                    <Text className="text-gray-800 text-base">{selectedCommitment.purpose}</Text>
                  </View>

                  {selectedCommitment.followUpDate && (
                    <View className="mb-4">
                      <Text className="text-gray-500 text-sm mb-1">Follow-up Date</Text>
                      <Text className="text-gray-800 text-base">
                        {new Date(selectedCommitment.followUpDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {selectedCommitment.notes && (
                    <View className="mb-4">
                      <Text className="text-gray-500 text-sm mb-1">Notes</Text>
                      <Text className="text-gray-800 text-base">{selectedCommitment.notes}</Text>
                    </View>
                  )}

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Status</Text>
                    <View className={`self-start px-3 py-1 rounded-full ${getStatusColor(selectedCommitment.status).split(" ")[0]}`}>
                      <Text className={`font-semibold ${getStatusColor(selectedCommitment.status).split(" ")[1]}`}>
                        {selectedCommitment.status}
                      </Text>
                    </View>
                  </View>

                  {/* ✅ Action Buttons Section */}
                  <View className="mt-4">
                    {selectedCommitment.status === "Pending" && (
                      <View className="flex-row mb-3">
                        <TouchableOpacity
                          onPress={() => handleApprove(selectedCommitment._id, selectedCommitment.customerName)}
                          className="flex-1 bg-green-600 py-3 rounded-xl mr-2 items-center"
                        >
                          <MaterialIcons name="check-circle" size={20} color="white" />
                          <Text className="text-white text-center font-bold mt-1">Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleCancel(selectedCommitment._id, selectedCommitment.customerName)}
                          className="flex-1 bg-orange-500 py-3 rounded-xl ml-2 items-center"
                        >
                          <MaterialIcons name="cancel" size={20} color="white" />
                          <Text className="text-white text-center font-bold mt-1">Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {selectedCommitment.status !== "Pending" && (
                      <View className="mb-3">
                        <Text className="text-center text-gray-500 text-sm">
                          This commitment has been {selectedCommitment.status.toLowerCase()}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleDelete(selectedCommitment._id)}
                      className="bg-red-600 py-3 rounded-xl items-center flex-row justify-center"
                    >
                      <MaterialIcons name="delete" size={20} color="white" />
                      <Text className="text-white text-center font-bold ml-2">Delete Commitment</Text>
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