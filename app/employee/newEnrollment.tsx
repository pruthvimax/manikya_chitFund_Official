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
  ActivityIndicator,
  Platform,
} from "react-native";
import BACKEND_URL from "../../config";

export default function NewEnrollment() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [enrollmentDate, setEnrollmentDate] = useState(new Date());

  // Customer Date of Birth
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);

  // Chit Details
  const [chitAmount, setChitAmount] = useState("");
  const [chitDuration, setChitDuration] = useState("");
  const [chitTotalMembers, setChitTotalMembers] = useState("");
  const [chitMonthlyAmount, setChitMonthlyAmount] = useState("");
  const [collectionType, setCollectionType] = useState("Monthly");

  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [fatherHusbandName, setFatherHusbandName] = useState("");
  const [address, setAddress] = useState("");

  // Nominee Details
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeRelationship, setNomineeRelationship] = useState("");
  const [nomineeAddress, setNomineeAddress] = useState("");
  const [nomineeAadharNumber, setNomineeAadharNumber] = useState("");

  // Customer Documents
  const [aadharNumber, setAadharNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [occupation, setOccupation] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  // Payment Details
  const [advancePaid, setAdvancePaid] = useState("");
  const [paymentType, setPaymentType] = useState("Cash");

  const collectionTypes = ["Daily", "Monthly"];
  const paymentTypes = ["Cash", "AC", "NEFT", "Online Banking", "Netbanking"];

  /*
    FIX:
    date.toISOString() converts the Date to UTC before slicing the
    date part. On a device in IST (UTC+5:30), a date picked at local
    midnight (e.g. 30th 00:00 IST) becomes 18:30 UTC on the PREVIOUS
    day (29th), so toISOString() reported the wrong day whenever the
    local time was before ~05:30 AM.

    Building the string from the Date's LOCAL components instead
    (getFullYear/getMonth/getDate) avoids the UTC conversion entirely,
    so the picked day is always the day that gets stored/shown.
  */
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to get today's date
  const getTodayDate = (): Date => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  // Helper function to get a valid date for picker - starts from today
  const getValidDate = (date: Date | null): Date => {
    if (date && !isNaN(date.getTime())) {
      return date;
    }
    // Return today's date as default
    return getTodayDate();
  };

  const handleSubmit = async () => {
    // Validation
    if (!chitAmount || !chitDuration || !chitTotalMembers || !chitMonthlyAmount || !collectionType) {
      Alert.alert("Validation", "Please fill all chit details");
      return;
    }
    if (!customerName || !fatherHusbandName || !address) {
      Alert.alert("Validation", "Please fill all customer details");
      return;
    }
    if (!nomineeName || !nomineeRelationship || !nomineeAddress || !nomineeAadharNumber) {
      Alert.alert("Validation", "Please fill all nominee details");
      return;
    }
    if (!aadharNumber || !panNumber || !occupation || !mobileNumber) {
      Alert.alert("Validation", "Please fill all customer document details");
      return;
    }
    if (!advancePaid || !paymentType) {
      Alert.alert("Validation", "Please fill payment details");
      return;
    }
    if (mobileNumber.length !== 10) {
      Alert.alert("Validation", "Please enter valid 10-digit mobile number");
      return;
    }
    if (aadharNumber.length !== 12) {
      Alert.alert("Validation", "Please enter valid 12-digit Aadhar number");
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

      const response = await fetch(`${BACKEND_URL}/enrollment/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chitAmount,
          chitDuration,
          chitTotalMembers,
          chitMonthlyAmount,
          collectionType,
          customerName,
          fatherHusbandName,
          address,
          dateOfBirth: dateOfBirth ? formatDate(dateOfBirth) : "",
          nomineeName,
          nomineeRelationship,
          nomineeAddress,
          nomineeAadharNumber,
          aadharNumber,
          panNumber,
          occupation,
          mobileNumber,
          enrollmentDate,
          enrolledByEmpId: employee.emp_id,
          enrolledByEmpName: employee.name,
          advancePaid,
          paymentType,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success", "Enrollment submitted successfully");
        // Reset form
        setChitAmount("");
        setChitDuration("");
        setChitTotalMembers("");
        setChitMonthlyAmount("");
        setCollectionType("Monthly");
        setCustomerName("");
        setFatherHusbandName("");
        setAddress("");
        setNomineeName("");
        setNomineeRelationship("");
        setNomineeAddress("");
        setNomineeAadharNumber("");
        setAadharNumber("");
        setPanNumber("");
        setOccupation("");
        setMobileNumber("");
        setAdvancePaid("");
        setPaymentType("Cash");
        setEnrollmentDate(getTodayDate());
      } else {
        Alert.alert("Error", data.message || "Failed to submit enrollment");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to submit enrollment");
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

  const PageSkeleton = () => (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingTop: 110, paddingHorizontal: 20, paddingBottom: 30 }}
    >
      {Array.from({ length: 7 }).map((_, index) => (
        <View
          key={index}
          className="bg-white rounded-xl p-4 mb-4 border border-gray-100"
        >
          <View className="flex-row items-center mb-4">
            <SkeletonBox width={155} height={20} />
          </View>
          <SkeletonBox height={44} className="mb-3" />
          <SkeletonBox height={44} className="mb-3" />
          <SkeletonBox height={44} />
        </View>
      ))}

      <View className="mt-2 mb-6 items-center">
        <SkeletonBox width={160} height={16} />
        <SkeletonBox width={180} height={12} className="mt-2" />
        <SkeletonBox width={250} height={12} className="mt-2" />
      </View>
    </ScrollView>
  );

  /* ================= FOOTER ================= */
  const Footer = () => (
    <View className="mt-2 mb-6 px-5">
      <View className="border-t border-gray-200 pt-4 items-center">
        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>
        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee New Enrollment
        </Text>
        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
        </Text>
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
              New Enrollment
            </Text>
            <Text className="text-green-100 text-sm mt-1">
              Create new customer enrollment
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <PageSkeleton />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 140, paddingHorizontal: 20, paddingBottom: 30 }}
        >
        {/* Chit Details Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="font-bold text-gray-800 text-lg mb-3">💰 Chit Details</Text>

          <Text className="font-semibold text-gray-800 mb-2">Chit Amount *</Text>
          <TextInput
            value={chitAmount}
            onChangeText={setChitAmount}
            placeholder="e.g., 2 Lakhs, 3 Lakhs"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Chit Duration *</Text>
          <TextInput
            value={chitDuration}
            onChangeText={setChitDuration}
            placeholder="e.g., 20 Months, 30 Months"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Total Members *</Text>
          <TextInput
            value={chitTotalMembers}
            onChangeText={setChitTotalMembers}
            placeholder="e.g., 20, 30, 40"
            keyboardType="numeric"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Monthly Amount *</Text>
          <TextInput
            value={chitMonthlyAmount}
            onChangeText={setChitMonthlyAmount}
            placeholder="e.g., 5000, 10000"
            keyboardType="numeric"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Collection Type *</Text>
          <View className="flex-row mb-4">
            {collectionTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setCollectionType(type)}
                className={`flex-1 py-3 mx-1 rounded-xl ${
                  collectionType === type ? "bg-[#024e32]" : "bg-gray-200"
                }`}
              >
                <Text className={`text-center ${collectionType === type ? "text-white" : "text-gray-700"}`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Customer Details Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="font-bold text-gray-800 text-lg mb-3">👤 Customer Details</Text>

          <Text className="font-semibold text-gray-800 mb-2">Customer Name *</Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Enter customer name"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Date of Birth</Text>
          <TouchableOpacity
            onPress={() => setShowDobPicker(true)}
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4 flex-row justify-between items-center"
          >
            <Text className={dateOfBirth ? "text-gray-800" : "text-gray-400"}>
              {dateOfBirth ? formatDate(dateOfBirth) : "Select date of birth"}
            </Text>
            <MaterialIcons name="calendar-today" size={22} color="#024e32" />
          </TouchableOpacity>

          {showDobPicker && (
            <DateTimePicker
              value={getValidDate(dateOfBirth)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDobPicker(false);
                if (selectedDate) {
                  // Set the selected date but preserve the time part
                  const newDate = new Date(selectedDate);
                  setDateOfBirth(newDate);
                }
              }}
            />
          )}

          <Text className="font-semibold text-gray-800 mb-2">Father/Husband Name *</Text>
          <TextInput
            value={fatherHusbandName}
            onChangeText={setFatherHusbandName}
            placeholder="Enter father/husband name"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Address *</Text>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter complete address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />
        </View>

        {/* Nominee Details Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="font-bold text-gray-800 text-lg mb-3">👥 Nominee Details</Text>

          <Text className="font-semibold text-gray-800 mb-2">Nominee Name *</Text>
          <TextInput
            value={nomineeName}
            onChangeText={setNomineeName}
            placeholder="Enter nominee name"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Relationship *</Text>
          <TextInput
            value={nomineeRelationship}
            onChangeText={setNomineeRelationship}
            placeholder="e.g., Wife, Son, Daughter"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Nominee Address *</Text>
          <TextInput
            value={nomineeAddress}
            onChangeText={setNomineeAddress}
            placeholder="Enter nominee address"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Nominee Aadhar Number *</Text>
          <TextInput
            value={nomineeAadharNumber}
            onChangeText={setNomineeAadharNumber}
            placeholder="Enter 12-digit Aadhar number"
            keyboardType="numeric"
            maxLength={12}
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
          />
        </View>

        {/* Customer Documents Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="font-bold text-gray-800 text-lg mb-3">📄 Customer Documents</Text>

          <Text className="font-semibold text-gray-800 mb-2">Aadhar Number *</Text>
          <TextInput
            value={aadharNumber}
            onChangeText={setAadharNumber}
            placeholder="Enter 12-digit Aadhar number"
            keyboardType="numeric"
            maxLength={12}
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">PAN Number *</Text>
          <TextInput
            value={panNumber}
            onChangeText={setPanNumber}
            placeholder="Enter PAN number"
            uppercase={true}
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Occupation *</Text>
          <TextInput
            value={occupation}
            onChangeText={setOccupation}
            placeholder="e.g., Business, Service, Farmer"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Mobile Number *</Text>
          <TextInput
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="Enter 10-digit mobile number"
            keyboardType="phone-pad"
            maxLength={10}
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3"
          />
        </View>

        {/* Enrollment Date */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="font-bold text-gray-800 text-lg mb-3">📅 Enrollment Date</Text>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 flex-row justify-between items-center"
          >
            <Text className="text-gray-800">{formatDate(enrollmentDate)}</Text>
            <MaterialIcons name="calendar-today" size={24} color="#024e32" />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={enrollmentDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setEnrollmentDate(selectedDate);
              }
            }}
          />
        )}

        {/* Payment Details Section */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm border border-gray-100">
          <Text className="font-bold text-gray-800 text-lg mb-3">💵 Payment Details</Text>

          <Text className="font-semibold text-gray-800 mb-2">Advance Paid *</Text>
          <TextInput
            value={advancePaid}
            onChangeText={setAdvancePaid}
            placeholder="Enter advance amount"
            keyboardType="numeric"
            className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 mb-4"
          />

          <Text className="font-semibold text-gray-800 mb-2">Payment Type *</Text>
          <View className="flex-row flex-wrap mb-4">
            {paymentTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setPaymentType(type)}
                className={`mr-2 mb-2 px-4 py-2 rounded-full ${
                  paymentType === type ? "bg-[#024e32]" : "bg-gray-200"
                }`}
              >
                <Text className={`${paymentType === type ? "text-white" : "text-gray-700"}`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="bg-[#024e32] py-4 rounded-xl mb-6"
        >
          <Text className="text-white text-center font-bold text-base">
            {loading ? "Submitting..." : "Submit Enrollment"}
          </Text>
        </TouchableOpacity>

        <Footer />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}