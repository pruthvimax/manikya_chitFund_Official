import { MaterialIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../../config.js";

export default function MemberDetail() {
  const { userid } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;

  const [member, setMember] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  /* ================= FETCH MEMBER DETAILS ================= */
  useEffect(() => {
    fetch(`${BACKEND_URL}/members/${userid}`)
      .then((res) => res.json())
      .then((data) => {
        setMember(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ================= UPDATE MEMBER ================= */
  const updateMember = async () => {
    if (!member?.username || !member?.phone || !member?.address) {
      setMessage("Please fill all required fields");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsUpdating(true);
    try {
      const payload: any = { ...member };

      if (password && password.trim() !== "") {
        payload.password = password;
      }

      const res = await fetch(`${BACKEND_URL}/members/${userid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("✓ Member updated successfully");
        setPassword("");
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("✗ Update failed");
        setTimeout(() => setMessage(""), 3000);
      }
    } catch {
      setMessage("✗ Server error - please try again");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setIsUpdating(false);
    }
  };

  /* ================= DELETE MEMBER ================= */
  const deleteMember = async () => {
    Alert.alert(
      "Delete Member",
      `Are you sure you want to delete ${member?.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await fetch(`${BACKEND_URL}/members/${userid}`, {
              method: "DELETE",
            });
            router.push("/admin/membersView");
          },
        },
      ]
    );
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#024e32" />
        <Text className="text-gray-600 mt-4 text-base">Loading member details...</Text>
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <Text className="text-gray-600 mt-4 text-lg">Member not found</Text>
        <TouchableOpacity
          onPress={() => router.push("/admin/membersView")}
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
              onPress={() => router.push("/admin/membersView")}
              className="p-1"
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4">
              Member Details
            </Text>
          </View>
        </View>

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
              
              {/* Username Field */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Username *
                </Text>
                <TextInput
                  placeholder="Enter username"
                  placeholderTextColor="#9ca3af"
                  value={member.username}
                  onChangeText={(t) => setMember({ ...member, username: t })}
                  className="border border-gray-300 bg-gray-50 p-3 rounded-xl text-base focus:border-[#024e32]"
                  style={{ outline: 'none' }}
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
                  value={member.phone}
                  onChangeText={(t) => setMember({ ...member, phone: t })}
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
                  value={member.email || ""}
                  onChangeText={(t) => setMember({ ...member, email: t })}
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
                  value={member.address}
                  onChangeText={(t) => setMember({ ...member, address: t })}
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
                <TextInput
                  placeholder="Leave blank to keep current password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  className="border border-gray-300 bg-gray-50 p-3 rounded-xl text-base focus:border-[#024e32]"
                />
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
                    setMember({
                      ...member,
                      status: member.status === "active" ? "inactive" : "active",
                    })
                  }
                  className={`p-4 rounded-xl flex-row items-center justify-between ${
                    member.status === "active" 
                      ? "bg-green-50 border border-green-200" 
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <Text className={`text-base font-semibold ${
                    member.status === "active" ? "text-green-700" : "text-red-700"
                  }`}>
                    Current Status: {member.status.toUpperCase()}
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${
                    member.status === "active" ? "bg-green-200" : "bg-red-200"
                  }`}>
                    <Text className={`text-xs font-semibold ${
                      member.status === "active" ? "text-green-800" : "text-red-800"
                    }`}>
                      Tap to change
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={updateMember}
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
                      Update Member
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={deleteMember}
                  className="bg-white border-2 border-red-500 p-4 rounded-xl"
                >
                  <Text className="text-red-600 text-center font-semibold text-base">
                    Delete Member
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