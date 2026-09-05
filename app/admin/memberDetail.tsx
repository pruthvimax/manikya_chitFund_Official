import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useRef } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Animated,
  StatusBar,
  Modal,
} from "react-native";
import BACKEND_URL from "../../config.js";

/* ========== SKELETON ========== */
const SkeletonForm = () => {
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

  const SkeletonRow = ({ height = 14, width = "100%" }: { height?: number; width?: string }) => (
    <Animated.View
      style={{ opacity: skeletonOpacity, height, width }}
      className="bg-gray-200 rounded-md"
    />
  );

  return (
    <View className="bg-white rounded-2xl p-5 space-y-4">
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={48} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={48} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={48} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={48} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={80} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={48} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={60} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={52} /></View></View>
      <View><SkeletonRow height={16} width="30%" /><View className="mt-2"><SkeletonRow height={52} /></View></View>
    </View>
  );
};

/* ========== MAIN COMPONENT ========== */
export default function MemberDetail() {
  const { userid } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;

  const [member, setMember] = useState<any>(null);
  const [initialMember, setInitialMember] = useState<any>(null);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // NEW

  /* ===== FETCH ===== */
  useEffect(() => {
    fetch(`${BACKEND_URL}/members/${userid}`)
      .then((res) => res.json())
      .then((data) => {
        setMember(data);
        setInitialMember(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  /* ===== UPDATE ===== */
  const performUpdate = async () => {
    if (!member?.username || !member?.phone || !member?.aadhaar || !member?.address) {
      setMessage("Please fill all required fields");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setIsUpdating(true);
    try {
      const payload: any = { ...member };
      if (password && password.trim() !== "") payload.password = password;

      const res = await fetch(`${BACKEND_URL}/members/${userid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage("✓ Member updated successfully");
        setPassword("");
        setInitialMember({ ...member });
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
      setShowUpdateConfirm(false);
    }
  };

  const handleUpdatePress = () => setShowUpdateConfirm(true);

  /* ===== DELETE ===== */
  const performDelete = async () => {
    try {
      await fetch(`${BACKEND_URL}/members/${userid}`, { method: "DELETE" });
      router.push("/admin/membersView");
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleDeletePress = () => setShowDeleteConfirm(true);

  /* ===== TOGGLE EDIT / CANCEL ===== */
  const toggleEdit = () => {
    if (isEditing) {
      setMember(initialMember);
      setPassword("");
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  /* ===== LOADING ===== */
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f9fafb]">
        <StatusBar barStyle="light-content" backgroundColor="#024e32" />
        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.push("/admin/membersView")} className="mt-1" activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">Member Details</Text>
          </View>
        </View>
        <View className="flex-1 px-4 pt-4" style={{ paddingTop: 110 }}>
          <SkeletonForm />
          <View className="items-center mt-2 mb-6">
            <ActivityIndicator size="small" color="#024e32" />
            <Text className="text-gray-400 text-xs mt-2">Loading member details...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!member) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <MaterialIcons name="error-outline" size={48} color="#ef4444" />
        <Text className="text-gray-600 mt-4 text-lg">Member not found</Text>
        <TouchableOpacity onPress={() => router.push("/admin/membersView")} className="mt-6 bg-[#024e32] px-6 py-3 rounded-lg">
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  /* ===== MAIN RENDER ===== */
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1 bg-[#f9fafb]">
      <SafeAreaView className="flex-1 bg-[#f9fafb]">
        <StatusBar barStyle="light-content" backgroundColor="#024e32" />

        {/* HEADER */}
        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.push("/admin/membersView")} className="mt-1" activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">Member Details</Text>

            {/* Edit / Cancel Button – with shadow and circle background */}
            <TouchableOpacity
              onPress={toggleEdit}
              className="mt-1 p-2 bg-white/20 rounded-full shadow-lg"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
              }}
            >
              <MaterialIcons name={isEditing ? "close" : "edit"} size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: isDesktopOrLaptop ? 24 : 20,
            paddingTop: 110,
            paddingBottom: 40,
            maxWidth: isDesktopOrLaptop ? (isLargeScreen ? 800 : 600) : "100%",
            alignSelf: "center",
            width: "100%",
          }}
        >
          <View className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <View className="p-5">
              {/* FORM FIELDS – same as before */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">Username *</Text>
                <TextInput
                  placeholder="Enter username"
                  placeholderTextColor="#9ca3af"
                  value={member.username}
                  onChangeText={(t) => setMember({ ...member, username: t })}
                  editable={isEditing}
                  className={`border border-gray-300 bg-gray-50 p-3 rounded-xl text-base ${!isEditing ? "text-gray-500" : "text-gray-900"}`}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">Phone Number *</Text>
                <TextInput
                  placeholder="Enter phone number"
                  placeholderTextColor="#9ca3af"
                  value={member.phone}
                  onChangeText={(t) => setMember({ ...member, phone: t })}
                  keyboardType="phone-pad"
                  editable={isEditing}
                  className={`border border-gray-300 bg-gray-50 p-3 rounded-xl text-base ${!isEditing ? "text-gray-500" : "text-gray-900"}`}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">Email Address</Text>
                <TextInput
                  placeholder="Enter email address"
                  placeholderTextColor="#9ca3af"
                  value={member.email || ""}
                  onChangeText={(t) => setMember({ ...member, email: t })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={isEditing}
                  className={`border border-gray-300 bg-gray-50 p-3 rounded-xl text-base ${!isEditing ? "text-gray-500" : "text-gray-900"}`}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">Aadhaar Number *</Text>
                <TextInput
                  placeholder="Enter Aadhaar number"
                  placeholderTextColor="#9ca3af"
                  value={member.aadhaar || ""}
                  onChangeText={(t) => setMember({ ...member, aadhaar: t })}
                  keyboardType="number-pad"
                  maxLength={12}
                  editable={isEditing}
                  className={`border border-gray-300 bg-gray-50 p-3 rounded-xl text-base ${!isEditing ? "text-gray-500" : "text-gray-900"}`}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">Address *</Text>
                <TextInput
                  placeholder="Enter address"
                  placeholderTextColor="#9ca3af"
                  value={member.address}
                  onChangeText={(t) => setMember({ ...member, address: t })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={isEditing}
                  className={`border border-gray-300 bg-gray-50 p-3 rounded-xl text-base ${!isEditing ? "text-gray-500" : "text-gray-900"}`}
                  style={{ minHeight: 80 }}
                />
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">New Password</Text>
                <TextInput
                  placeholder="Leave blank to keep current password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={isEditing}
                  className={`border border-gray-300 bg-gray-50 p-3 rounded-xl text-base ${!isEditing ? "text-gray-500" : "text-gray-900"}`}
                />
                <Text className="text-xs text-gray-500 mt-1 ml-1">Only fill this if you want to change the password</Text>
              </View>

              {/* STATUS – always interactive */}
              <View className="mb-6">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">Account Status</Text>
                <TouchableOpacity
                  onPress={() => {
                    setMember({
                      ...member,
                      status: member.status === "active" ? "inactive" : "active",
                    });
                  }}
                  className={`p-4 rounded-xl flex-row items-center justify-between ${
                    member.status === "active" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <Text className={`text-base font-semibold ${member.status === "active" ? "text-green-700" : "text-red-700"}`}>
                    Current Status: {member.status.toUpperCase()}
                  </Text>
                  <View className={`px-3 py-1 rounded-full ${member.status === "active" ? "bg-green-200" : "bg-red-200"}`}>
                    <Text className={`text-xs font-semibold ${member.status === "active" ? "text-green-800" : "text-red-800"}`}>
                      Tap to change
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* BUTTONS – stacked vertically */}
              <TouchableOpacity
                onPress={handleUpdatePress}
                disabled={isUpdating}
                className={`bg-[#024e32] p-4 rounded-xl shadow-sm ${isUpdating ? "opacity-60" : ""}`}
              >
                {isUpdating ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white text-center font-semibold ml-2">Updating...</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <MaterialIcons name="save" size={20} color="white" />
                    <Text className="text-white text-center font-semibold ml-2">Update Member</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeletePress}
                className="mt-3 bg-white border-2 border-red-500 p-4 rounded-xl shadow-sm"
              >
                <View className="flex-row items-center justify-center">
                  <MaterialIcons name="delete-outline" size={20} color="#dc2626" />
                  <Text className="text-red-600 text-center font-semibold ml-2">Delete Member</Text>
                </View>
              </TouchableOpacity>

              {/* MESSAGE */}
              {message ? (
                <View className={`mt-5 p-3 rounded-xl ${message.includes("✓") ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <Text className={`text-center text-sm font-medium ${message.includes("✓") ? "text-green-700" : "text-red-700"}`}>
                    {message}
                  </Text>
                </View>
              ) : null}

              <Text className="text-xs text-gray-400 text-center mt-5">* Required fields</Text>
            </View>
          </View>

          {/* FOOTER */}
          <View className="mt-6 mb-6 px-5">
            <View className="border-t border-gray-200 pt-4 items-center">
              <Text className="text-[#024e32] font-bold text-base">MANIKYA CHITS PVT LTD</Text>
              <Text className="text-gray-500 text-xs mt-1 text-center">Member Details</Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
              </Text>
            </View>
          </View>
          <View className="h-20" />
        </ScrollView>

        {/* ===== UPDATE CONFIRMATION MODAL ===== */}
        <Modal
          transparent
          visible={showUpdateConfirm}
          animationType="fade"
          onRequestClose={() => setShowUpdateConfirm(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1 bg-black/50 justify-center items-center px-6"
            onPress={() => setShowUpdateConfirm(false)}
          >
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <View className="items-center">
                <View className="w-16 h-16 rounded-full bg-blue-100 items-center justify-center mb-4">
                  <MaterialIcons name="update" size={32} color="#024e32" />
                </View>
                <Text className="text-gray-900 text-lg font-bold">Confirm Update</Text>
                <Text className="text-gray-500 text-sm mt-2 text-center">
                  Are you sure you want to update this member's details?
                </Text>
              </View>

              <View className="flex-row mt-6 space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
                  onPress={() => setShowUpdateConfirm(false)}
                >
                  <Text className="text-gray-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-[#024e32] py-3 rounded-xl items-center"
                  onPress={performUpdate}
                >
                  <Text className="text-white font-semibold">Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ===== DELETE CONFIRMATION MODAL ===== */}
        <Modal
          transparent
          visible={showDeleteConfirm}
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1 bg-black/50 justify-center items-center px-6"
            onPress={() => setShowDeleteConfirm(false)}
          >
            <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <View className="items-center">
                <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                  <MaterialIcons name="delete-forever" size={32} color="#dc2626" />
                </View>
                <Text className="text-gray-900 text-lg font-bold">Delete Member</Text>
                <Text className="text-gray-500 text-sm mt-2 text-center">
                  Are you sure you want to delete <Text className="font-bold text-gray-700">{member?.username}</Text>?
                  This action cannot be undone.
                </Text>
              </View>

              <View className="flex-row mt-6 space-x-3">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text className="text-gray-700 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-red-600 py-3 rounded-xl items-center"
                  onPress={performDelete}
                >
                  <Text className="text-white font-semibold">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}