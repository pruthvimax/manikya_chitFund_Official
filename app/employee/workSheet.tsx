import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import BACKEND_URL from "../../config";

export default function WorkSheet() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form fields
  const [phoneFollowupsCount, setPhoneFollowupsCount] = useState("");
  const [phoneFollowupsCustomers, setPhoneFollowupsCustomers] = useState("");
  const [customerVisitsCount, setCustomerVisitsCount] = useState("");
  const [customerVisitsDetails, setCustomerVisitsDetails] = useState("");
  const [gpsPhotosCount, setGpsPhotosCount] = useState("");
  const [notes, setNotes] = useState("");

  const today = new Date().toLocaleDateString();

  const handleSubmit = async () => {
    if (
      !phoneFollowupsCount ||
      !phoneFollowupsCustomers ||
      !customerVisitsCount ||
      !customerVisitsDetails ||
      !gpsPhotosCount
    ) {
      Alert.alert("Validation", "Please fill all required fields");
      return;
    }

    if (
      parseInt(phoneFollowupsCount) < 0 ||
      parseInt(customerVisitsCount) < 0 ||
      parseInt(gpsPhotosCount) < 0
    ) {
      Alert.alert("Validation", "Please enter valid numbers");
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

      const response = await fetch(`${BACKEND_URL}/worksheet/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emp_id: employee.emp_id,
          employeeName: employee.name,
          date: new Date(),
          phoneFollowupsCount: parseInt(phoneFollowupsCount),
          phoneFollowupsCustomers,
          customerVisitsCount: parseInt(customerVisitsCount),
          customerVisitsDetails,
          gpsPhotosCount: parseInt(gpsPhotosCount),
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Work sheet submitted successfully");

        // Reset form
        setPhoneFollowupsCount("");
        setPhoneFollowupsCustomers("");
        setCustomerVisitsCount("");
        setCustomerVisitsDetails("");
        setGpsPhotosCount("");
        setNotes("");
      } else {
        Alert.alert(
          "Error",
          data.message || "Failed to submit work sheet"
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to submit work sheet");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     SKELETON BOX
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
     WORK SHEET SKELETON
  ========================================================= */

  const WorkSheetSkeleton = () => (
    <View className="px-5 pt-5">

      {/* DATE */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <SkeletonBox width={45} height={13} className="mb-2" />
        <SkeletonBox width={110} height={20} />
      </View>

      {/* PHONE FOLLOW-UPS */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <SkeletonBox width={180} height={20} className="mb-4" />

        <SkeletonBox width={145} height={15} className="mb-2" />
        <SkeletonBox height={48} className="mb-4" />

        <SkeletonBox width={210} height={15} className="mb-2" />
        <SkeletonBox height={85} />
      </View>

      {/* CUSTOMER VISITS */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <SkeletonBox width={170} height={20} className="mb-4" />

        <SkeletonBox width={145} height={15} className="mb-2" />
        <SkeletonBox height={48} className="mb-4" />

        <SkeletonBox width={220} height={15} className="mb-2" />
        <SkeletonBox height={105} />
      </View>

      {/* GPS PHOTOS */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <SkeletonBox width={190} height={20} className="mb-4" />

        <SkeletonBox width={150} height={15} className="mb-2" />
        <SkeletonBox height={48} />
      </View>

      {/* NOTES */}
      <View className="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <SkeletonBox width={170} height={20} className="mb-4" />
        <SkeletonBox height={90} />
      </View>

      {/* BUTTON */}
      <SkeletonBox height={56} className="mb-6" />

      {/* FOOTER SKELETON */}
      <View className="mt-4 mb-6 items-center">
        <View className="w-full border-t border-gray-200 pt-4 items-center">
          <SkeletonBox width={155} height={16} />
          <SkeletonBox width={145} height={12} className="mt-2" />
          <SkeletonBox width={250} height={12} className="mt-2" />
        </View>
      </View>

    </View>
  );

  /* =========================================================
     FOOTER
  ========================================================= */

  const Footer = () => (
    <View className="mt-5 mb-6 px-5">
      <View className="border-t border-gray-200 pt-4 items-center">

        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>

        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Work Sheet
        </Text>

        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>

      </View>
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
              Work Sheet
            </Text>

            <Text className="text-green-100 text-sm mt-1">
              Track your daily work activities
            </Text>
          </View>

        </View>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{
            paddingTop: 110,
            paddingBottom: 20,
          }}
        >

          {/* =================================================
              SKELETON WHILE SUBMITTING
          ================================================= */}

          {loading ? (
            <WorkSheetSkeleton />
          ) : (
            <View className="p-5">

              {/* Date */}
              <View className="bg-gray-100 rounded-xl p-4 mb-4">
                <Text className="text-gray-600 text-sm mb-1">
                  Date
                </Text>

                <Text className="text-gray-800 text-lg font-semibold">
                  {today}
                </Text>
              </View>

              {/* Phone Follow-ups */}
              <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">

                <Text className="font-bold text-gray-800 text-lg mb-3">
                  📞 Phone Follow-ups
                </Text>

                <Text className="font-semibold text-gray-800 mb-2">
                  Total Calls Made *
                </Text>

                <TextInput
                  value={phoneFollowupsCount}
                  onChangeText={setPhoneFollowupsCount}
                  placeholder="Enter total number of calls"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
                />

                <Text className="font-semibold text-gray-800 mb-2">
                  Customers Called (Comma Separated) *
                </Text>

                <TextInput
                  value={phoneFollowupsCustomers}
                  onChangeText={setPhoneFollowupsCustomers}
                  placeholder="e.g., Rajesh, Suresh, Meena"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                />

              </View>

              {/* Customer Visits */}
              <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">

                <Text className="font-bold text-gray-800 text-lg mb-3">
                  🚶 Customer Visits
                </Text>

                <Text className="font-semibold text-gray-800 mb-2">
                  Total Visits Made *
                </Text>

                <TextInput
                  value={customerVisitsCount}
                  onChangeText={setCustomerVisitsCount}
                  placeholder="Enter total number of visits"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
                />

                <Text className="font-semibold text-gray-800 mb-2">
                  Customers Visited (Names & Addresses) *
                </Text>

                <TextInput
                  value={customerVisitsDetails}
                  onChangeText={setCustomerVisitsDetails}
                  placeholder="e.g., Rajesh - 123 Main St, Suresh - 456 Oak Rd"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                />

              </View>

              {/* GPS Photos */}
              <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">

                <Text className="font-bold text-gray-800 text-lg mb-3">
                  📸 GPS Photos (WhatsApp)
                </Text>

                <Text className="font-semibold text-gray-800 mb-2">
                  Total Photos Sent *
                </Text>

                <TextInput
                  value={gpsPhotosCount}
                  onChangeText={setGpsPhotosCount}
                  placeholder="Enter total number of GPS photos sent"
                  keyboardType="numeric"
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                />

              </View>

              {/* Notes */}
              <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">

                <Text className="font-bold text-gray-800 text-lg mb-3">
                  📝 Additional Notes
                </Text>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional information..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
                />

              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                className={`bg-[#024e32] py-4 rounded-xl mb-6 ${
                  loading ? "opacity-70" : "opacity-100"
                }`}
              >
                <View className="flex-row items-center justify-center">

                  {loading && (
                    <ActivityIndicator
                      color="white"
                      size="small"
                      className="mr-2"
                    />
                  )}

                  <Text className="text-white text-center font-bold text-base">
                    {loading
                      ? "Submitting..."
                      : "Submit Work Sheet"}
                  </Text>

                </View>
              </TouchableOpacity>

              {/* Extra bottom padding */}
              <View className="h-4" />

              {/* Footer */}
              <Footer />

            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}