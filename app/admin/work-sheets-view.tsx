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
import DateTimePicker from "@react-native-community/datetimepicker";
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
          <View className="h-4 bg-gray-200 rounded w-24 mb-1" />
          <View className="h-4 bg-gray-200 rounded w-20" />
        </View>
        <View className="w-16 h-6 bg-gray-200 rounded-full" />
      </View>
      <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
        <View className="items-center">
          <View className="h-6 w-12 bg-gray-200 rounded" />
          <View className="h-3 w-8 bg-gray-200 rounded mt-1" />
        </View>
        <View className="items-center">
          <View className="h-6 w-12 bg-gray-200 rounded" />
          <View className="h-3 w-8 bg-gray-200 rounded mt-1" />
        </View>
        <View className="items-center">
          <View className="h-6 w-12 bg-gray-200 rounded" />
          <View className="h-3 w-8 bg-gray-200 rounded mt-1" />
        </View>
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

export default function AdminWorkSheetsView() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  
  const [workSheets, setWorkSheets] = useState<WorkSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedWorkSheet, setSelectedWorkSheet] = useState<WorkSheet | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchWorkSheets = async () => {
    try {
      let url = `${BACKEND_URL}/worksheet/`;
      const params = [];
      
      if (startDate) params.push(`startDate=${startDate}`);
      if (endDate) params.push(`endDate=${endDate}`);
      
      if (params.length > 0) {
        url += `?${params.join("&")}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setWorkSheets(data);
    } catch (error) {
      console.error("Error fetching work sheets:", error);
      Alert.alert("Error", "Failed to load work sheets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWorkSheets();
    }, [startDate, endDate])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkSheets();
  };

  const handleStatusUpdate = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const response = await fetch(`${BACKEND_URL}/worksheet/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Update failed");

      Alert.alert("Success", `Work sheet ${status.toLowerCase()}`);
      fetchWorkSheets();
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Work Sheet",
      "Are you sure you want to delete this work sheet?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/worksheet/${id}`, {
                method: "DELETE",
              });

              if (!response.ok) throw new Error("Delete failed");

              Alert.alert("Success", "Work sheet deleted");
              fetchWorkSheets();
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

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const filteredWorkSheets = workSheets.filter(worksheet =>
    worksheet.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    worksheet.emp_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              Work Sheets
            </Text>
          </View>
          
          {!loading && (
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-medium text-sm">
                {workSheets.length} Total
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
                    placeholder="Search by employee name or ID..."
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

              {/* Date Range Filters */}
              <View className="mb-4">
                <Text className="text-gray-600 text-sm mb-2">Filter by Date Range:</Text>
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={() => setShowStartPicker(true)}
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2 mr-2"
                  >
                    <Text className={startDate ? "text-gray-800" : "text-gray-400"}>
                      {startDate || "Start Date"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowEndPicker(true)}
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2 ml-2"
                  >
                    <Text className={endDate ? "text-gray-800" : "text-gray-400"}>
                      {endDate || "End Date"}
                    </Text>
                  </TouchableOpacity>
                </View>
                {(startDate || endDate) && (
                  <TouchableOpacity
                    onPress={() => {
                      setStartDate("");
                      setEndDate("");
                    }}
                    className="mt-2"
                  >
                    <Text className="text-red-600 text-sm text-center">Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showStartPicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartPicker(false);
                    if (selectedDate) {
                      setStartDate(formatDate(selectedDate));
                    }
                  }}
                />
              )}

              {showEndPicker && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEndPicker(false);
                    if (selectedDate) {
                      setEndDate(formatDate(selectedDate));
                    }
                  }}
                />
              )}

              {/* Work Sheets List */}
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
                          {worksheet.employeeName}
                        </Text>
                        <Text className="text-gray-500 text-sm">ID: {worksheet.emp_id}</Text>
                        <Text className="text-gray-500 text-sm">
                          {new Date(worksheet.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(worksheet.status).split(" ")[0]}`}>
                        <Text className={`text-xs font-semibold ${getStatusColor(worksheet.status).split(" ")[1]}`}>
                          {worksheet.status}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between mt-2 pt-2 border-t border-gray-100">
                      <View className="items-center">
                        <Text className="text-lg font-bold text-blue-600">{worksheet.phoneFollowupsCount}</Text>
                        <Text className="text-gray-500 text-xs">Calls</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-lg font-bold text-green-600">{worksheet.customerVisitsCount}</Text>
                        <Text className="text-gray-500 text-xs">Visits</Text>
                      </View>
                      <View className="items-center">
                        <Text className="text-lg font-bold text-purple-600">{worksheet.gpsPhotosCount}</Text>
                        <Text className="text-gray-500 text-xs">Photos</Text>
                      </View>
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
                    Work Sheets Management
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

      {/* Work Sheet Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[90%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Work Sheet Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              className="p-5" 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {selectedWorkSheet && (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Employee</Text>
                    <Text className="text-gray-800 text-base font-semibold">
                      {selectedWorkSheet.employeeName} ({selectedWorkSheet.emp_id})
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Date</Text>
                    <Text className="text-gray-800 text-base">
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
                    <View className="mb-6 p-3 bg-gray-50 rounded-xl">
                      <Text className="text-gray-600 text-sm mb-2 font-semibold">📝 Notes</Text>
                      <Text className="text-gray-600">{selectedWorkSheet.notes}</Text>
                    </View>
                  )}

                  {/* Action Buttons Section */}
                  <View className="mt-2 mb-4">
                    {selectedWorkSheet.status === "Pending" && (
                      <View className="flex-row mb-3">
                        <TouchableOpacity
                          onPress={() => handleStatusUpdate(selectedWorkSheet._id, "Approved")}
                          className="flex-1 bg-green-600 py-3 rounded-xl mr-2 items-center"
                        >
                          <MaterialIcons name="check-circle" size={20} color="white" />
                          <Text className="text-white text-center font-bold mt-1">Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleStatusUpdate(selectedWorkSheet._id, "Rejected")}
                          className="flex-1 bg-red-600 py-3 rounded-xl ml-2 items-center"
                        >
                          <MaterialIcons name="cancel" size={20} color="white" />
                          <Text className="text-white text-center font-bold mt-1">Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      onPress={() => handleDelete(selectedWorkSheet._id)}
                      className="bg-red-600 py-3 rounded-xl items-center flex-row justify-center"
                    >
                      <MaterialIcons name="delete" size={20} color="white" />
                      <Text className="text-white text-center font-bold ml-2">Delete Work Sheet</Text>
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