import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
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

export default function MeetingHistory() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const fetchMeetings = async () => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }
      const employee = JSON.parse(stored);

      const response = await fetch(`${BACKEND_URL}/meeting/employee/${employee.emp_id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setMeetings(data);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      Alert.alert("Error", "Failed to load meeting history");
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

  const handleUpdate = async () => {
    if (!selectedMeeting) return;

    try {
      const response = await fetch(`${BACKEND_URL}/meeting/${selectedMeeting._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(selectedMeeting),
      });

      if (!response.ok) throw new Error("Update failed");

      Alert.alert("Success", "Meeting updated successfully");
      setEditMode(false);
      fetchMeetings();
    } catch (error) {
      Alert.alert("Error", "Failed to update meeting");
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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f7f9f8] justify-center items-center">
        <ActivityIndicator size="large" color="#024e32" />
        <Text className="text-gray-500 mt-3">Loading meeting history...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* Header */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <MaterialIcons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold flex-1">
            Meeting History ({meetings.length})
          </Text>
          <TouchableOpacity onPress={fetchMeetings}>
            <MaterialIcons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1 p-5"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#024e32"]} />
        }
      >
        {meetings.length === 0 ? (
          <View className="items-center justify-center py-10">
            <MaterialIcons name="event-busy" size={64} color="#ccc" />
            <Text className="text-gray-400 text-lg mt-4">No meetings found</Text>
          </View>
        ) : (
          meetings.map((meeting) => (
            <TouchableOpacity
              key={meeting._id}
              onPress={() => {
                setSelectedMeeting(meeting);
                setModalVisible(true);
                setEditMode(false);
              }}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-lg">
                    {meeting.meetingType} Meeting
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {new Date(meeting.meetingDate).toLocaleDateString()}
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${getStatusColor(meeting.status).split(" ")[0]}`}>
                  <Text className={`text-xs font-semibold ${getStatusColor(meeting.status).split(" ")[1]}`}>
                    {meeting.status}
                  </Text>
                </View>
              </View>

              <View className="mb-2">
                <Text className="text-gray-600 text-sm">
                  {meeting.startTime} - {meeting.endTime} ({meeting.duration})
                </Text>
              </View>

              <Text className="text-gray-600 text-sm" numberOfLines={2}>
                {meeting.promotionPlans}
              </Text>

              <Text className="text-gray-400 text-xs mt-2">
                Submitted: {new Date(meeting.createdAt).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Meeting Details/Edit Modal */}
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
              <Text className="text-white text-xl font-bold">
                {editMode ? "Edit Meeting" : "Meeting Details"}
              </Text>
              <View className="flex-row">
                {!editMode && selectedMeeting?.status === "Pending" && (
                  <TouchableOpacity onPress={() => setEditMode(true)} className="mr-4">
                    <MaterialIcons name="edit" size={24} color="white" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => {
                  setModalVisible(false);
                  setEditMode(false);
                }}>
                  <MaterialIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView className="p-5">
              {selectedMeeting && (
                <>
                  {editMode ? (
                    // Edit Mode
                    <>
                      <Text className="font-semibold text-gray-800 mb-2">Meeting Type</Text>
                      <View className="flex-row mb-4">
                        {["Morning", "Afternoon", "Evening"].map((type) => (
                          <TouchableOpacity
                            key={type}
                            onPress={() => setSelectedMeeting({ ...selectedMeeting, meetingType: type })}
                            className={`flex-1 py-3 mx-1 rounded-xl ${
                              selectedMeeting.meetingType === type ? "bg-[#024e32]" : "bg-gray-200"
                            }`}
                          >
                            <Text className={`text-center ${selectedMeeting.meetingType === type ? "text-white" : "text-gray-700"}`}>
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text className="font-semibold text-gray-800 mb-2">Duration</Text>
                      <TextInput
                        value={selectedMeeting.duration}
                        onChangeText={(text) => setSelectedMeeting({ ...selectedMeeting, duration: text })}
                        className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
                      />

                      <Text className="font-semibold text-gray-800 mb-2">Members Present</Text>
                      <TextInput
                        value={selectedMeeting.membersPresent}
                        onChangeText={(text) => setSelectedMeeting({ ...selectedMeeting, membersPresent: text })}
                        className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
                      />

                      <Text className="font-semibold text-gray-800 mb-2">Promotion Plans</Text>
                      <TextInput
                        value={selectedMeeting.promotionPlans}
                        onChangeText={(text) => setSelectedMeeting({ ...selectedMeeting, promotionPlans: text })}
                        multiline
                        numberOfLines={4}
                        className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
                      />

                      <Text className="font-semibold text-gray-800 mb-2">Agenda (Optional)</Text>
                      <TextInput
                        value={selectedMeeting.agenda}
                        onChangeText={(text) => setSelectedMeeting({ ...selectedMeeting, agenda: text })}
                        multiline
                        numberOfLines={3}
                        className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
                      />

                      <Text className="font-semibold text-gray-800 mb-2">Outcome (Optional)</Text>
                      <TextInput
                        value={selectedMeeting.outcome}
                        onChangeText={(text) => setSelectedMeeting({ ...selectedMeeting, outcome: text })}
                        multiline
                        numberOfLines={3}
                        className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6"
                      />

                      <View className="flex-row">
                        <TouchableOpacity
                          onPress={handleUpdate}
                          className="flex-1 bg-[#024e32] py-3 rounded-xl mr-2"
                        >
                          <Text className="text-white text-center font-bold">Save Changes</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setEditMode(false)}
                          className="flex-1 bg-gray-400 py-3 rounded-xl ml-2"
                        >
                          <Text className="text-white text-center font-bold">Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    // View Mode
                    <>
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
                    </>
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