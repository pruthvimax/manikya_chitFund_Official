import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config.js";

export default function EmployeeDetail() {
  const { emp_id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;

  const [emp, setEmp] = useState({
    emp_id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
    featureAccess: true,
  });

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // ================= FETCH EMPLOYEE =================
  useEffect(() => {
    if (!emp_id) return;

    setLoading(true);
    fetch(`${BACKEND_URL}/employee/${emp_id}`)
      .then((r) => r.json())
      .then((d) => {
        setEmp(d);
        setLoading(false);
      })
      .catch(() => {
        setMessage("Failed to load employee details");
        setLoading(false);
      });
  }, [emp_id]);

  // ================= UPDATE =================
  const updateEmployee = async () => {
    if (!emp.emp_id || !emp.name || !emp.phone || !emp.address) {
      setMessage("Please fill all required fields");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsUpdating(true);
    setMessage("");

    try {
    const payload: any = {
  emp_id: emp.emp_id,
  name: emp.name,
  email: emp.email,
  phone: emp.phone,
  address: emp.address,
  status: emp.status,
  featureAccess: emp.featureAccess, // ✅ FORCE INCLUDE
};

      if (password && password.trim() !== "") {
        payload.password = password;
      }

      const res = await fetch(`${BACKEND_URL}/employee/${emp_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✓ Employee updated successfully");
        setPassword("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(data.message || "✗ Update failed");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("✗ Server error - please try again");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  // ================= DELETE =================
  const deleteEmployee = async () => {
    Alert.alert(
      "Delete Employee",
      `Are you sure you want to delete ${emp.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(
                `${BACKEND_URL}/employee/${emp_id}`,
                { method: "DELETE" }
              );
              if (res.ok) {
                router.push("/admin/employeesView");
              } else {
                setMessage("✗ Delete failed");
                setTimeout(() => setMessage(""), 3000);
              }
            } catch {
              setMessage("✗ Server error");
              setTimeout(() => setMessage(""), 3000);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#024e32" />
        <Text className="text-gray-600 mt-4 text-base">Loading employee details...</Text>
      </SafeAreaView>
    );
  }

  if (!emp || !emp.emp_id) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <Text className="text-gray-600 mt-4 text-lg">Employee not found</Text>
        <TouchableOpacity
          onPress={() => router.push("/admin/employeesView")}
          className="mt-6 bg-[#024e32] px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <SafeAreaView className="flex-1 bg-gray-50">

        {/* HEADER */}
        <View className="bg-[#024e32] px-5 pt-12 pb-5 shadow-sm">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.push("/admin/employeesView")}
              className="p-1"
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4">
              Employee Details
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: isDesktopOrLaptop ? 24 : 20,
            paddingBottom: 40,
            maxWidth: isDesktopOrLaptop
              ? isLargeScreen
                ? 800
                : 600
              : "100%",
            alignSelf: "center",
            width: "100%",
          }}
        >
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Form Container */}
            <View className="p-5">

              {/* Name Field */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Full Name *
                </Text>
                <TextInput
                  placeholder="Enter full name"
                  placeholderTextColor="#9ca3af"
                  value={emp.name}
                  onChangeText={(t) => setEmp({ ...emp, name: t })}
                  className="border border-gray-300 bg-gray-50 p-3 rounded-xl text-base focus:border-[#024e32]"
                />
              </View>

              {/* Phone Field */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Phone Number *
                </Text>
                <TextInput
                  placeholder="Enter phone number"
                  placeholderTextColor="#9ca3af"
                  value={emp.phone}
                  onChangeText={(t) => setEmp({ ...emp, phone: t })}
                  keyboardType="phone-pad"
                  className="border border-gray-300 bg-gray-50 p-3 rounded-xl text-base focus:border-[#024e32]"
                />
              </View>

              {/* Email Field */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Email Address
                </Text>
                <TextInput
                  placeholder="Enter email address"
                  placeholderTextColor="#9ca3af"
                  value={emp.email}
                  onChangeText={(t) => setEmp({ ...emp, email: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className="border border-gray-300 bg-gray-50 p-3 rounded-xl text-base focus:border-[#024e32]"
                />
              </View>

              {/* Address Field */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Address *
                </Text>
                <TextInput
                  placeholder="Enter address"
                  placeholderTextColor="#9ca3af"
                  value={emp.address}
                  onChangeText={(t) => setEmp({ ...emp, address: t })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="border border-gray-300 bg-gray-50 p-3 rounded-xl text-base focus:border-[#024e32]"
                  style={{ minHeight: 80 }}
                />
              </View>

              {/* Password Field */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  New Password
                </Text>
                <View className="border border-gray-300 bg-gray-50 rounded-xl flex-row items-center px-3">
                  <TextInput
                    placeholder="Leave blank to keep current password"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    className="flex-1 py-3 text-base"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="p-1"
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility-off" : "visibility"}
                      size={22}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
                <Text className="text-xs text-gray-500 mt-1 ml-1">
                  Only fill this if you want to change the password
                </Text>
              </View>

              {/* Status Toggle */}
              <View className="mb-6">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Account Status
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setEmp({
                      ...emp,
                      status: emp.status === "active" ? "inactive" : "active",
                    })
                  }
                  className={`p-4 rounded-xl flex-row items-center justify-between ${
                    emp.status === "active" 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <Text className={`text-base font-semibold ${
                    emp.status === "active" ? "text-green-700" : "text-red-700"
                  }`}>
                    Current Status: {emp.status.toUpperCase()}
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${
                    emp.status === "active" ? "bg-green-200" : "bg-red-200"
                  }`}>
                    <Text className={`text-xs font-semibold ${
                      emp.status === "active" ? "text-green-800" : "text-red-800"
                    }`}>
                      Tap to change
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

<View className="mb-6">
  <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
    Feature Control
  </Text>

  <TouchableOpacity
    onPress={() =>
      setEmp({
        ...emp,
        featureAccess: !emp.featureAccess,
      })
    }
    className={`p-4 rounded-xl ${
      emp.featureAccess ? "bg-green-600" : "bg-red-600"
    }`}
  >
    <Text className="text-white text-center font-bold">
      {emp.featureAccess ? "DISABLE FEATURES" : "ENABLE FEATURES"}
    </Text>
  </TouchableOpacity>
</View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={updateEmployee}
                  disabled={isUpdating}
                  className={`bg-[#024e32] p-4 rounded-xl shadow-sm ${
                    isUpdating ? "opacity-70" : ""
                  }`}
                >
                  {isUpdating ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white text-center font-semibold ml-2">
                        Updating...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white text-center font-semibold text-base">
                      Update Employee
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={deleteEmployee}
                  className="bg-white border-2 border-red-500 p-4 rounded-xl"
                >
                  <Text className="text-red-600 text-center font-semibold text-base">
                    Delete Employee
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Message Alert */}
              {message ? (
                <View className={`mt-5 p-3 rounded-xl ${
                  message.includes("✓") 
                    ? "bg-green-50 border border-green-200" 
                    : "bg-red-50 border border-red-200"
                }`}>
                  <Text className={`text-center text-sm font-medium ${
                    message.includes("✓") ? "text-green-700" : "text-red-700"
                  }`}>
                    {message}
                  </Text>
                </View>
              ) : null}

              {/* Required Fields Note */}
              <Text className="text-xs text-gray-400 text-center mt-5">
                * Required fields
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}