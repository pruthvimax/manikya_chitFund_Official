import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import BACKEND_URL from "../../config.js";

/* ================= SKELETON ================= */

function SkeletonBox({
  width = "100%",
  height = 16,
  radius = 8,
  style = {},
}: {
  width?: any;
  height?: number;
  radius?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: "#e5e7eb", opacity },
        style,
      ]}
    />
  );
}

function SkeletonField({ inputHeight = 48 }: { inputHeight?: number }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <SkeletonBox width={110} height={12} style={{ marginBottom: 8 }} />
      <SkeletonBox height={inputHeight} radius={12} />
    </View>
  );
}

/* ================= CONFIRM MODAL ================= */

type ConfirmProps = {
  visible: boolean;
  tone?: "danger" | "primary";
  icon?: any;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmModal({
  visible,
  tone = "primary",
  icon,
  title,
  message,
  confirmText,
  cancelText = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      fade.setValue(0);
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scale, fade]);

  const isDanger = tone === "danger";
  const accent = isDanger ? "#dc2626" : "#024e32";
  const softBg = isDanger ? "#fee2e2" : "#dcfce7";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={busy ? undefined : onCancel}
    >
      <Pressable
        onPress={busy ? undefined : onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.55)",
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: "100%" }}>
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ scale }],
              width: "100%",
              maxWidth: 380,
              alignSelf: "center",
              backgroundColor: "white",
              borderRadius: 28,
              padding: 28,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 30,
              shadowOffset: { width: 0, height: 15 },
              elevation: 15,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: softBg,
                alignSelf: "center",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 18,
              }}
            >
              <MaterialIcons name={icon} size={34} color={accent} />
            </View>

            <Text className="text-center text-2xl font-bold text-gray-900">
              {title}
            </Text>
            <Text className="text-center text-sm text-gray-500 mt-2 leading-6 px-2">
              {message}
            </Text>

            <View className="mt-8">
              <TouchableOpacity
                onPress={onConfirm}
                disabled={busy}
                style={{ borderRadius: 16, overflow: "hidden" }}
              >
                <LinearGradient
                  colors={isDanger ? ["#dc2626", "#b91c1c"] : ["#024e32", "#016b44"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 16, opacity: busy ? 0.7 : 1 }}
                >
                  {busy ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-semibold ml-2">
                        Please wait...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white text-center font-bold text-base">
                      {confirmText}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onCancel}
                disabled={busy}
                className="mt-3 p-4 rounded-2xl bg-gray-100"
              >
                <Text className="text-gray-700 text-center font-semibold text-base">
                  {cancelText}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ================= FOOTER ================= */

function Footer() {
  return (
    <View className="mt-8 items-center border-t border-gray-200 pt-6">
      <View className="flex-row items-center mb-2">
        <MaterialIcons name="verified-user" size={16} color="#024e32" />
        <Text className="text-[#024e32] font-semibold text-sm ml-1">
          Admin Panel
        </Text>
      </View>
      <Text className="text-gray-400 text-xs">
        Employee records are updated in real time
      </Text>
      <Text className="text-gray-400 text-xs mt-1">
        © {new Date().getFullYear()} · v1.0.0
      </Text>
    </View>
  );
}

/* ================= MAIN ================= */

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

  const [originalEmp, setOriginalEmp] = useState(emp);

  const [isEditing, setIsEditing] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [confirm, setConfirm] = useState<null | "save" | "delete">(null);

  const contentStyle = {
    padding: isDesktopOrLaptop ? 24 : 20,
    paddingBottom: 40,
    maxWidth: isDesktopOrLaptop ? (isLargeScreen ? 800 : 600) : ("100%" as any),
    alignSelf: "center" as const,
    width: "100%" as any,
  };

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  // ================= FETCH EMPLOYEE =================
  useEffect(() => {
    if (!emp_id) return;

    setLoading(true);
    fetch(`${BACKEND_URL}/employee/${emp_id}`)
      .then((r) => r.json())
      .then((d) => {
        setEmp(d);
        setOriginalEmp(d);
        setLoading(false);
      })
      .catch(() => {
        setMessage("Failed to load employee details");
        setLoading(false);
      });
  }, [emp_id]);

  // ================= EDIT / CANCEL =================
  const startEditing = () => {
    setOriginalEmp(emp);
    setMessage("");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEmp((prev) => ({
      ...prev,
      name: originalEmp.name,
      email: originalEmp.email,
      phone: originalEmp.phone,
      address: originalEmp.address,
    }));
    setPassword("");
    setShowPassword(false);
    setMessage("");
    setIsEditing(false);
  };

  // ================= ASK BEFORE SAVING =================
  const askUpdate = () => {
    if (!emp.emp_id || !emp.name || !emp.phone || !emp.address) {
      flash("Please fill all required fields");
      return;
    }
    setConfirm("save");
  };

  // ================= UPDATE =================
  const updateEmployee = async () => {
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
        featureAccess: emp.featureAccess,
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
        setPassword("");
        setShowPassword(false);
        setOriginalEmp(emp);
        setIsEditing(false);
        setConfirm(null);
        flash("✓ Employee updated successfully");
      } else {
        setConfirm(null);
        flash(data.message || "✗ Update failed");
      }
    } catch {
      setConfirm(null);
      flash("✗ Server error - please try again");
    } finally {
      setIsUpdating(false);
    }
  };

  // ================= DELETE =================
  const deleteEmployee = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/employee/${emp_id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfirm(null);
        router.push("/admin/employeesView");
      } else {
        setConfirm(null);
        flash("✗ Delete failed");
      }
    } catch {
      setConfirm(null);
      flash("✗ Server error");
    } finally {
      setIsDeleting(false);
    }
  };

  const inputClass = (editable: boolean) =>
    `border p-3 rounded-xl text-base ${
      editable
        ? "border-gray-300 bg-white text-gray-900 focus:border-[#024e32]"
        : "border-gray-200 bg-gray-50 text-gray-600"
    }`;

  /* ================= LOADING (SKELETON) ================= */
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="bg-[#024e32] px-5 pt-12 pb-5 shadow-md">
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
        >
          <View className="bg-white rounded-3xl shadow-lg overflow-hidden">
            <View className="bg-gray-100 px-5 py-3">
              <SkeletonBox width={200} height={12} />
            </View>

            <View className="p-5">
              <SkeletonField />
              <SkeletonField />
              <SkeletonField />
              <SkeletonField />
              <SkeletonField inputHeight={80} />

              <View style={{ marginBottom: 24 }}>
                <SkeletonBox width={110} height={12} style={{ marginBottom: 8 }} />
                <SkeletonBox height={56} radius={12} />
              </View>

              <View style={{ marginBottom: 24 }}>
                <SkeletonBox width={110} height={12} style={{ marginBottom: 8 }} />
                <SkeletonBox height={56} radius={12} />
              </View>

              <SkeletonBox height={56} radius={12} style={{ marginBottom: 12 }} />
              <SkeletonBox height={56} radius={12} />
            </View>
          </View>

          <Footer />
        </ScrollView>
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
        <View className="bg-[#024e32] px-5 pt-12 pb-5 shadow-md">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
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

            {!isEditing ? (
              <TouchableOpacity
                onPress={startEditing}
                className="flex-row items-center bg-white/20 px-4 py-2 rounded-full"
              >
                <MaterialIcons name="edit" size={18} color="white" />
                <Text className="text-white font-semibold ml-1.5">Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={cancelEditing}
                className="flex-row items-center bg-white/20 px-4 py-2 rounded-full"
              >
                <MaterialIcons name="close" size={18} color="white" />
                <Text className="text-white font-semibold ml-1.5">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
        >
          <View className="bg-white rounded-3xl shadow-lg overflow-hidden">
            {!isEditing && (
              <View className="bg-gray-100 px-5 py-3 flex-row items-center">
                <MaterialIcons name="lock-outline" size={18} color="#6b7280" />
                <Text className="text-gray-600 text-sm ml-2">
                  Details are locked. Tap Edit to change them.
                </Text>
              </View>
            )}

            <View className="p-5">
              {/* Employee ID */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Employee ID
                </Text>
                <View className="flex-row items-center border border-gray-200 bg-gray-50 rounded-xl px-3">
                  <MaterialIcons name="badge" size={20} color="#6b7280" />
                  <TextInput
                    value={emp.emp_id}
                    editable={false}
                    className="flex-1 py-3 text-base text-gray-600"
                  />
                </View>
              </View>

              {/* Name */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Full Name *
                </Text>
                <View className="flex-row items-center border border-gray-300 bg-white rounded-xl px-3 focus-within:border-[#024e32]">
                  <MaterialIcons name="person" size={20} color="#6b7280" />
                  <TextInput
                    placeholder="Enter full name"
                    placeholderTextColor="#9ca3af"
                    value={emp.name}
                    onChangeText={(t) => setEmp({ ...emp, name: t })}
                    editable={isEditing}
                    className="flex-1 py-3 text-base"
                  />
                </View>
              </View>

              {/* Phone */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Phone Number *
                </Text>
                <View className="flex-row items-center border border-gray-300 bg-white rounded-xl px-3 focus-within:border-[#024e32]">
                  <MaterialIcons name="phone" size={20} color="#6b7280" />
                  <TextInput
                    placeholder="Enter phone number"
                    placeholderTextColor="#9ca3af"
                    value={emp.phone}
                    onChangeText={(t) => setEmp({ ...emp, phone: t })}
                    keyboardType="phone-pad"
                    editable={isEditing}
                    className="flex-1 py-3 text-base"
                  />
                </View>
              </View>

              {/* Email */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Email Address
                </Text>
                <View className="flex-row items-center border border-gray-300 bg-white rounded-xl px-3 focus-within:border-[#024e32]">
                  <MaterialIcons name="email" size={20} color="#6b7280" />
                  <TextInput
                    placeholder="Enter email address"
                    placeholderTextColor="#9ca3af"
                    value={emp.email}
                    onChangeText={(t) => setEmp({ ...emp, email: t })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={isEditing}
                    className="flex-1 py-3 text-base"
                  />
                </View>
              </View>

              {/* Address */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Address *
                </Text>
                <View className="border border-gray-300 bg-white rounded-xl px-3 focus-within:border-[#024e32]">
                  <TextInput
                    placeholder="Enter address"
                    placeholderTextColor="#9ca3af"
                    value={emp.address}
                    onChangeText={(t) => setEmp({ ...emp, address: t })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    editable={isEditing}
                    className="py-3 text-base"
                    style={{ minHeight: 80 }}
                  />
                </View>
              </View>

              {/* Password */}
              {isEditing && (
                <View className="mb-4">
                  <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                    New Password
                  </Text>
                  <View className="flex-row items-center border border-gray-300 bg-white rounded-xl px-3 focus-within:border-[#024e32]">
                    <MaterialIcons name="lock" size={20} color="#6b7280" />
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
              )}

              {/* Account Status - always tappable */}
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
                  className={`p-4 rounded-2xl flex-row items-center justify-between border ${
                    emp.status === "active"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <View className="flex-row items-center">
                    <MaterialIcons
                      name={emp.status === "active" ? "check-circle" : "cancel"}
                      size={24}
                      color={emp.status === "active" ? "#16a34a" : "#dc2626"}
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        emp.status === "active" ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {emp.status.toUpperCase()}
                    </Text>
                  </View>
                  <View
                    className={`px-3 py-1 rounded-full ${
                      emp.status === "active" ? "bg-green-200" : "bg-red-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        emp.status === "active" ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      Tap to change
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Feature Control - always tappable */}
              <View className="mb-6">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Feature Control
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setEmp({ ...emp, featureAccess: !emp.featureAccess })
                  }
                  className={`p-4 rounded-2xl ${
                    emp.featureAccess ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  <Text className="text-white text-center font-bold text-base">
                    {emp.featureAccess ? "DISABLE FEATURES" : "ENABLE FEATURES"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View className="space-y-3">
                <TouchableOpacity
                  onPress={askUpdate}
                  disabled={isUpdating}
                  activeOpacity={0.8}
                  style={{ borderRadius: 16, overflow: "hidden" }}
                >
                  <LinearGradient
                    colors={["#024e32", "#016b44"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      padding: 16,
                      opacity: isUpdating ? 0.7 : 1,
                    }}
                  >
                    {isUpdating ? (
                      <View className="flex-row items-center justify-center">
                        <ActivityIndicator size="small" color="white" />
                        <Text className="text-white font-semibold ml-2">
                          Updating...
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-white text-center font-bold text-base">
                        Update Employee
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setConfirm("delete")}
                  activeOpacity={0.8}
                  className="bg-white border-2 border-red-500 p-4 rounded-2xl"
                >
                  <Text className="text-red-600 text-center font-bold text-base">
                    Delete Employee
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Message Alert */}
              {message ? (
                <View
                  className={`mt-5 p-3 rounded-2xl ${
                    message.includes("✓")
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <Text
                    className={`text-center text-sm font-medium ${
                      message.includes("✓") ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {message}
                  </Text>
                </View>
              ) : null}

              {isEditing && (
                <Text className="text-xs text-gray-400 text-center mt-5">
                  * Required fields
                </Text>
              )}
            </View>
          </View>

          <Footer />
        </ScrollView>

        {/* ========== SAVE CONFIRMATION ========== */}
        <ConfirmModal
          visible={confirm === "save"}
          tone="primary"
          icon="save"
          title="Save changes?"
          message={`The details for ${emp.name || "this employee"} will be updated.`}
          confirmText="Yes, save changes"
          cancelText="Keep editing"
          busy={isUpdating}
          onConfirm={updateEmployee}
          onCancel={() => setConfirm(null)}
        />

        {/* ========== DELETE CONFIRMATION ========== */}
        <ConfirmModal
          visible={confirm === "delete"}
          tone="danger"
          icon="delete-outline"
          title="Delete this employee?"
          message={`${emp.name || "This employee"} will be removed permanently. This cannot be undone.`}
          confirmText="Yes, delete"
          cancelText="Keep employee"
          busy={isDeleting}
          onConfirm={deleteEmployee}
          onCancel={() => setConfirm(null)}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
