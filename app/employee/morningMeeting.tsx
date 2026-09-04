import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BACKEND_URL from "../../config";

export default function MorningMeeting() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  // Form fields
  const [meetingType, setMeetingType] = useState("Morning");
  const [duration, setDuration] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [promotionPlans, setPromotionPlans] = useState("");
  const [membersPresent, setMembersPresent] = useState("");
  const [agenda, setAgenda] = useState("");
  const [outcome, setOutcome] = useState("");

  // Time pickers
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startTimeObj, setStartTimeObj] = useState(new Date());
  const [endTimeObj, setEndTimeObj] = useState(new Date());

  const meetingTypes = ["Morning", "Afternoon", "Evening"];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async () => {
    if (
      !meetingType ||
      !duration ||
      !startTime ||
      !endTime ||
      !promotionPlans ||
      !membersPresent
    ) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      const stored = await AsyncStorage.getItem("employee");

      if (!stored) {
        Alert.alert("Error", "Employee not found");
        return;
      }

      const employee = JSON.parse(stored);

      const response = await fetch(`${BACKEND_URL}/meeting/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: employee.emp_id,
          employeeName: employee.name,
          meetingType,
          duration,
          startTime,
          endTime,
          meetingDate: new Date(),
          promotionPlans,
          membersPresent,
          agenda,
          outcome,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Meeting recorded successfully");

        // Reset form
        setMeetingType("Morning");
        setDuration("");
        setStartTime("");
        setEndTime("");
        setPromotionPlans("");
        setMembersPresent("");
        setAgenda("");
        setOutcome("");
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to record meeting"
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to submit meeting details");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SKELETON
     Only shown while submitting.
  ========================================================= */

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
      style={{
        width,
        height,
      }}
    />
  );

  /* =========================================================
     FOOTER
  ========================================================= */

  const Footer = () => (
    <View className="mt-8 mb-6">
      <View className="border-t border-gray-200 pt-4 items-center">
        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>

        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Morning Meeting
        </Text>

        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights
          reserved.
        </Text>
      </View>
    </View>
  );

  /* =========================================================
     FOOTER SKELETON
  ========================================================= */

  const FooterSkeleton = () => (
    <View className="mt-8 mb-6">
      <View className="border-t border-gray-200 pt-4 items-center">
        <SkeletonBox width={155} height={16} />

        <SkeletonBox
          width={150}
          height={12}
          className="mt-2"
        />

        <SkeletonBox
          width={250}
          height={12}
          className="mt-2"
        />
      </View>
    </View>
  );

  /* =========================================================
     FORM SKELETON
  ========================================================= */

  const FormSkeleton = () => (
    <View className="px-5 pt-5">

      {/* Meeting Type */}
      <SkeletonBox
        width={120}
        height={16}
        className="mb-2"
      />

      <View className="flex-row mb-5">
        <SkeletonBox
          width="31%"
          height={48}
        />

        <SkeletonBox
          width="31%"
          height={48}
          className="mx-2"
        />

        <SkeletonBox
          width="31%"
          height={48}
        />
      </View>

      {/* Duration */}
      <SkeletonBox
        width={90}
        height={16}
        className="mb-2"
      />

      <SkeletonBox
        height={48}
        className="mb-5"
      />

      {/* Start Time */}
      <SkeletonBox
        width={105}
        height={16}
        className="mb-2"
      />

      <SkeletonBox
        height={48}
        className="mb-5"
      />

      {/* End Time */}
      <SkeletonBox
        width={90}
        height={16}
        className="mb-2"
      />

      <SkeletonBox
        height={48}
        className="mb-5"
      />

      {/* Members Present */}
      <SkeletonBox
        width={125}
        height={16}
        className="mb-2"
      />

      <SkeletonBox
        height={48}
        className="mb-5"
      />

      {/* Promotion Plans */}
      <SkeletonBox
        width={135}
        height={16}
        className="mb-2"
      />

      <SkeletonBox
        height={110}
        className="mb-5"
      />

      {/* Agenda */}
      <SkeletonBox
        width={190}
        height={16}
        className="mb-2"
      />

      <SkeletonBox
        height={90}
        className="mb-5"
      />

      {/* Outcome */}
      <SkeletonBox
        width={210}
        height={16}
        className="mb-2"
      />

      <SkeletonBox
        height={90}
        className="mb-6"
      />

      {/* Submit */}
      <SkeletonBox
        height={56}
        className="mb-2"
      />

      <FooterSkeleton />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">

      {/* =====================================================
          HEADER
          SAME STANDARD EMPLOYEE HEADER
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-1"
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <View className="flex-1 ml-4">
            <Text className="text-white text-2xl font-bold mt-1">
              Morning Meeting
            </Text>

            <Text className="text-green-100 text-sm mt-1">
              Record today's meeting details
            </Text>
          </View>

        </View>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 130,
          paddingBottom: 20,
        }}
      >

        {/* =================================================
            LOADING / SUBMITTING SKELETON
        ================================================= */}

        {loading ? (
          <FormSkeleton />
        ) : (
          <View className="px-5 pt-5">

            {/* Meeting Type */}
            <Text className="font-semibold text-gray-800 mb-2">
              Meeting Type *
            </Text>

            <View className="flex-row mb-4">
              {meetingTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setMeetingType(type)}
                  className={`flex-1 py-3 mx-1 rounded-xl ${
                    meetingType === type
                      ? "bg-[#024e32]"
                      : "bg-gray-200"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      meetingType === type
                        ? "text-white"
                        : "text-gray-700"
                    }`}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration */}
            <Text className="font-semibold text-gray-800 mb-2">
              Duration *
            </Text>

            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 20 mins, 30 mins, 1 hour"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
            />

            {/* Start Time */}
            <Text className="font-semibold text-gray-800 mb-2">
              Start Time *
            </Text>

            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
            >
              <Text
                className={
                  startTime
                    ? "text-gray-800"
                    : "text-gray-400"
                }
              >
                {startTime || "Select start time"}
              </Text>

              <MaterialIcons
                name="access-time"
                size={24}
                color="#024e32"
              />
            </TouchableOpacity>

            {showStartPicker && (
              <DateTimePicker
                value={startTimeObj}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartPicker(false);

                  if (selectedDate) {
                    setStartTimeObj(selectedDate);
                    setStartTime(formatTime(selectedDate));
                  }
                }}
              />
            )}

            {/* End Time */}
            <Text className="font-semibold text-gray-800 mb-2">
              End Time *
            </Text>

            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
            >
              <Text
                className={
                  endTime
                    ? "text-gray-800"
                    : "text-gray-400"
                }
              >
                {endTime || "Select end time"}
              </Text>

              <MaterialIcons
                name="access-time"
                size={24}
                color="#024e32"
              />
            </TouchableOpacity>

            {showEndPicker && (
              <DateTimePicker
                value={endTimeObj}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndPicker(false);

                  if (selectedDate) {
                    setEndTimeObj(selectedDate);
                    setEndTime(formatTime(selectedDate));
                  }
                }}
              />
            )}

            {/* Members Present */}
            <Text className="font-semibold text-gray-800 mb-2">
              Members Present *
            </Text>

            <TextInput
              value={membersPresent}
              onChangeText={setMembersPresent}
              placeholder="Enter names (comma separated)"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
            />

            {/* Promotion Plans */}
            <Text className="font-semibold text-gray-800 mb-2">
              Promotion Plans *
            </Text>

            <TextInput
              value={promotionPlans}
              onChangeText={setPromotionPlans}
              placeholder="Where will I go today? What are the plans?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
            />

            {/* Agenda */}
            <Text className="font-semibold text-gray-800 mb-2">
              Meeting Agenda (Optional)
            </Text>

            <TextInput
              value={agenda}
              onChangeText={setAgenda}
              placeholder="Topics discussed..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
            />

            {/* Outcome */}
            <Text className="font-semibold text-gray-800 mb-2">
              Meeting Outcome (Optional)
            </Text>

            <TextInput
              value={outcome}
              onChangeText={setOutcome}
              placeholder="Decisions made, action items..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6"
            />

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-[#024e32] py-4 rounded-xl"
            >
              <Text className="text-white text-center font-bold text-base">
                {loading
                  ? "Submitting..."
                  : "Submit Meeting Record"}
              </Text>
            </TouchableOpacity>

            {/* FOOTER */}
            <Footer />

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}