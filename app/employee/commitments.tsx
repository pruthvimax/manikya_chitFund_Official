import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import BACKEND_URL from "../../config";

export default function Commitments() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [customerType, setCustomerType] = useState("Cold");
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [commitmentTime, setCommitmentTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [notes, setNotes] = useState("");

  // Date pickers
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showFollowUpPicker, setShowFollowUpPicker] = useState(false);
  const [timeObj, setTimeObj] = useState(new Date());
  const [followUpDateObj, setFollowUpDateObj] = useState(new Date());

  const customerTypes = ["Hot", "Warm", "Cold"];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handleSubmit = async () => {
    if (!customerName || !phoneNumber || !address || !commitmentTime || !purpose) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }

    if (phoneNumber.length < 10) {
      Alert.alert("Validation", "Please enter valid phone number");
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

      const response = await fetch(`${BACKEND_URL}/commitment/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: employee.emp_id,
          employeeName: employee.name,
          customerType,
          customerName,
          phoneNumber,
          address,
          commitmentDate: new Date(),
          commitmentTime,
          purpose,
          followUpDate: followUpDate || null,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Commitment added successfully");
        // Reset form
        setCustomerType("Cold");
        setCustomerName("");
        setPhoneNumber("");
        setAddress("");
        setCommitmentTime("");
        setPurpose("");
        setFollowUpDate("");
        setNotes("");
      } else {
        Alert.alert("Error", data.message || "Failed to add commitment");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to submit commitment");
    } finally {
      setLoading(false);
    }
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

  const FormSkeleton = () => (
    <View className="px-5 pt-5">
      <SkeletonBox width={120} height={16} className="mb-2" />
      <View className="flex-row mb-5">
        <SkeletonBox width="31%" height={48} />
        <SkeletonBox width="31%" height={48} className="mx-2" />
        <SkeletonBox width="31%" height={48} />
      </View>

      <SkeletonBox width={125} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-5" />

      <SkeletonBox width={95} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-5" />

      <SkeletonBox width={145} height={16} className="mb-2" />
      <SkeletonBox height={90} className="mb-5" />

      <SkeletonBox width={105} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-5" />

      <SkeletonBox width={170} height={16} className="mb-2" />
      <SkeletonBox height={48} className="mb-5" />

      <SkeletonBox width={175} height={16} className="mb-2" />
      <SkeletonBox height={90} className="mb-6" />

      <SkeletonBox height={56} />
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
          Employee Customer Database
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
        <SkeletonBox width={150} height={12} className="mt-2" />
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
              Customer Database
            </Text>

            <Text className="text-green-100 text-sm mt-1">
              Manage customer commitments
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView 
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView 
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingHorizontal: 20, 
            paddingTop: 140, 
            paddingBottom: 20,
            flexGrow: 1 
          }}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <>
              <FormSkeleton />
              <FooterSkeleton />
            </>
          ) : (
            <>
          {/* Customer Type */}
          <Text className="font-semibold text-gray-800 mb-2">Customer Type *</Text>
          <View className="flex-row mb-4">
            {customerTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setCustomerType(type)}
                className={`flex-1 py-3 mx-1 rounded-xl ${
                  customerType === type 
                    ? type === "Hot" 
                      ? "bg-red-600" 
                      : type === "Warm" 
                      ? "bg-orange-500" 
                      : "bg-blue-600"
                    : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-center font-semibold ${
                    customerType === type ? "text-white" : "text-gray-700"
                  }`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Customer Name */}
          <Text className="font-semibold text-gray-800 mb-2">Customer Name *</Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter customer name"
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Phone Number */}
          <Text className="font-semibold text-gray-800 mb-2">Phone Number *</Text>
          <TextInput
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter 10-digit phone number"
            keyboardType="phone-pad"
            maxLength={10}
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Address */}
          <Text className="font-semibold text-gray-800 mb-2">Address *</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter customer address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Commitment Time */}
          <Text className="font-semibold text-gray-800 mb-2">Meeting Time *</Text>
          <TouchableOpacity
            onPress={() => setShowTimePicker(true)}
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
          >
            <Text className={commitmentTime ? "text-gray-800" : "text-gray-400"}>
              {commitmentTime || "Select meeting time"}
            </Text>
            <MaterialIcons name="access-time" size={24} color="#024e32" />
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={timeObj}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={(event, selectedDate) => {
                setShowTimePicker(false);
                if (selectedDate) {
                  setTimeObj(selectedDate);
                  setCommitmentTime(formatTime(selectedDate));
                }
              }}
            />
          )}

          {/* Purpose */}
          <Text className="font-semibold text-gray-800 mb-2">Purpose of Meeting *</Text>
          <TextInput
            value={purpose}
            onChangeText={setPurpose}
            placeholder="e.g., Payment collection, Document submission, Lead followup"
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          {/* Follow-up Date (Optional) */}
          <Text className="font-semibold text-gray-800 mb-2">Follow-up Date (Optional)</Text>
          <TouchableOpacity
            onPress={() => setShowFollowUpPicker(true)}
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
          >
            <Text className={followUpDate ? "text-gray-800" : "text-gray-400"}>
              {followUpDate || "Select follow-up date"}
            </Text>
            <MaterialIcons name="calendar-today" size={24} color="#024e32" />
          </TouchableOpacity>

          {showFollowUpPicker && (
            <DateTimePicker
              value={followUpDateObj}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowFollowUpPicker(false);
                if (selectedDate) {
                  setFollowUpDateObj(selectedDate);
                  setFollowUpDate(formatDate(selectedDate));
                }
              }}
            />
          )}

          {/* Notes (Optional) */}
          <Text className="font-semibold text-gray-800 mb-2">Additional Notes (Optional)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional information..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-white border border-gray-300 rounded-xl px-4 py-3 mb-6"
          />

          {/* Submit Button - Now always visible */}
          <View className="mt-auto pt-4">
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              className="bg-[#024e32] py-4 rounded-xl"
            >
              <Text className="text-white text-center font-bold text-base">
                {loading ? "Submitting..." : "Add Commitment"}
              </Text>
            </TouchableOpacity>
          </View>

            {/* FOOTER */}
            <Footer />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}