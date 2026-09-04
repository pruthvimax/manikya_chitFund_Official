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

interface Meeting {
  _id: string;
  emp_id: string;
  employeeName: string;
  meetingType: string;
  duration: string;
  startTime: string;
  endTime: string;
  meetingDate: string;
  promotionPlans: string;
  membersPresent: string;
  agenda: string;
  outcome: string;
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
      <View className="h-3 bg-gray-200 rounded w-32" />
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

export default function MeetingsView() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchMeetings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/meeting/`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setMeetings(data);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      Alert.alert("Error", "Failed to load meetings");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMeetings();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeetings();
  };

  const handleStatusUpdate = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const response = await fetch(`${BACKEND_URL}/meeting/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error("Update failed");

      Alert.alert("Success", `Meeting ${status.toLowerCase()}`);
      fetchMeetings();
      setModalVisible(false);
    } catch (error) {
      Alert.alert("Error", "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      "Delete Meeting",
      "Are you sure you want to delete this meeting record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/meeting/${id}`, {
                method: "DELETE",
              });

              if (!response.ok) throw new Error("Delete failed");

              Alert.alert("Success", "Meeting deleted");
              fetchMeetings();
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

  const filteredMeetings = filter === "All"
    ? meetings.filter(meeting =>
        meeting.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.emp_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : meetings.filter(meeting =>
        meeting.status === filter &&
        (meeting.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.emp_id?.toLowerCase().includes(searchQuery.toLowerCase()))
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
              Meetings
            </Text>
          </View>
          
          {!loading && (
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-medium text-sm">
                {meetings.length} Total
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
                      {tab} ({meetings.filter(m => tab === "All" ? true : m.status === tab).length})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Meetings List */}
              {filteredMeetings.length === 0 ? (
                <View className="items-center justify-center py-10">
                  <MaterialIcons name="event-busy" size={64} color="#ccc" />
                  <Text className="text-gray-400 text-lg mt-4">No meetings found</Text>
                </View>
              ) : (
                filteredMeetings.map((meeting) => (
                  <TouchableOpacity
                    key={meeting._id}
                    onPress={() => {
                      setSelectedMeeting(meeting);
                      setModalVisible(true);
                    }}
                    className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
                    activeOpacity={0.7}
                  >
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-1">
                        <Text className="text-gray-800 font-bold text-lg">
                          {meeting.employeeName}
                        </Text>
                        <Text className="text-gray-500 text-sm">ID: {meeting.emp_id}</Text>
                      </View>
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(meeting.status).split(" ")[0]}`}>
                        <Text className={`text-xs font-semibold ${getStatusColor(meeting.status).split(" ")[1]}`}>
                          {meeting.status}
                        </Text>
                      </View>
                    </View>

                    <View className="mb-2">
                      <Text className="text-gray-700 font-semibold">{meeting.meetingType} Meeting</Text>
                      <Text className="text-gray-600 text-sm mt-1">
                        {meeting.startTime} - {meeting.endTime} ({meeting.duration})
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Date: {new Date(meeting.meetingDate).toLocaleDateString()}
                      </Text>
                    </View>

                    <Text className="text-gray-400 text-xs">
                      Submitted: {new Date(meeting.createdAt).toLocaleString()}
                    </Text>
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
                    Meetings Management
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

      {/* Meeting Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setEditMode(false);
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center p-5">
          <View className="bg-white rounded-2xl w-full max-h-[85%]">
            <View className="bg-[#024e32] p-5 rounded-t-2xl flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Meeting Details</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                setEditMode(false);
              }}>
                <MaterialIcons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
              {selectedMeeting && (
                <>
                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Employee</Text>
                    <Text className="text-gray-800 text-base font-semibold">
                      {selectedMeeting.employeeName} ({selectedMeeting.emp_id})
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Meeting Type</Text>
                    <Text className="text-gray-800 text-base">{selectedMeeting.meetingType}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Duration</Text>
                    <Text className="text-gray-800 text-base">{selectedMeeting.duration}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Time</Text>
                    <Text className="text-gray-800 text-base">
                      {selectedMeeting.startTime} - {selectedMeeting.endTime}
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Date</Text>
                    <Text className="text-gray-800 text-base">
                      {new Date(selectedMeeting.meetingDate).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Members Present</Text>
                    <Text className="text-gray-800 text-base">{selectedMeeting.membersPresent}</Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Promotion Plans</Text>
                    <Text className="text-gray-800 text-base">{selectedMeeting.promotionPlans}</Text>
                  </View>

                  {selectedMeeting.agenda && (
                    <View className="mb-4">
                      <Text className="text-gray-500 text-sm mb-1">Agenda</Text>
                      <Text className="text-gray-800 text-base">{selectedMeeting.agenda}</Text>
                    </View>
                  )}

                  {selectedMeeting.outcome && (
                    <View className="mb-4">
                      <Text className="text-gray-500 text-sm mb-1">Outcome</Text>
                      <Text className="text-gray-800 text-base">{selectedMeeting.outcome}</Text>
                    </View>
                  )}

                  <View className="mb-4">
                    <Text className="text-gray-500 text-sm mb-1">Status</Text>
                    <View className={`self-start px-3 py-1 rounded-full ${getStatusColor(selectedMeeting.status).split(" ")[0]}`}>
                      <Text className={`font-semibold ${getStatusColor(selectedMeeting.status).split(" ")[1]}`}>
                        {selectedMeeting.status}
                      </Text>
                    </View>
                  </View>

                  {selectedMeeting.status === "Pending" && (
                    <View className="flex-row mt-4">
                      <TouchableOpacity
                        onPress={() => handleStatusUpdate(selectedMeeting._id, "Approved")}
                        className="flex-1 bg-green-600 py-3 rounded-xl mr-2 items-center"
                      >
                        <MaterialIcons name="check-circle" size={20} color="white" />
                        <Text className="text-white text-center font-bold mt-1">Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleStatusUpdate(selectedMeeting._id, "Rejected")}
                        className="flex-1 bg-red-600 py-3 rounded-xl ml-2 items-center"
                      >
                        <MaterialIcons name="cancel" size={20} color="white" />
                        <Text className="text-white text-center font-bold mt-1">Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => handleDelete(selectedMeeting._id)}
                    className="bg-red-600 py-3 rounded-xl mt-4 items-center flex-row justify-center"
                  >
                    <MaterialIcons name="delete" size={20} color="white" />
                    <Text className="text-white text-center font-bold ml-2">Delete Record</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}