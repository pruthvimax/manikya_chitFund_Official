import { useEffect, useState } from "react";

import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  BackHandler,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EmployeeProfile() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    emp_id: "",
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // ================= SESSION + BACK BUTTON + FETCH PROFILE =================
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem("employee");

        // 🔐 SESSION GUARD
        if (!stored) {
          console.log(
            "No employee in storage → redirecting to login"
          );

          router.replace("/employee/login");
          return;
        }

        const emp = JSON.parse(stored);

        console.log("Logged in emp:", emp);

        const res = await fetch(
          `${BACKEND_URL}/employee/${emp.emp_id}`
        );

        if (!res.ok) {
          const txt = await res.text();

          console.log("Profile API error:", txt);

          if (isMounted) {
            setError("Failed to load profile data");
            setLoading(false);
          }

          return;
        }

        const data = await res.json();

        console.log("Profile API data:", data);

        if (!data || !data.emp_id) {
          console.log("Invalid profile data");

          if (isMounted) {
            setError("Invalid profile data received");
            setLoading(false);
          }

          return;
        }

        if (isMounted) {
          setProfile({
            emp_id: data.emp_id || "",
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
          });

          setLoading(false);
        }
      } catch (err) {
        console.log("Profile fetch error:", err);

        if (isMounted) {
          setError("Error loading profile");
          setLoading(false);
        }
      }
    };

    loadProfile();

    // 🔒 BACK BUTTON CONTROL FOR CHILD PAGE
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        // Always go back to Employee Dashboard
        router.replace("/employee");
        return true;
      }
    );

    return () => {
      isMounted = false;
      backHandler.remove();
    };
  }, []);

  // ================= LOGOUT =================
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem("employee");
            router.replace("/employee/login");
          },
        },
      ]
    );
  };

  const showComingSoon = (feature: string) => {
    Alert.alert(
      "Coming Soon",
      `${feature} feature will be available in the next update.`,
      [{ text: "OK" }]
    );
  };

  // =========================================================
  // SKELETON LOADING
  // =========================================================

  if (loading) {
    return <ProfileSkeleton />;
  }

  // ================= ERROR =================
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#f7f9f8]">

        {/* =====================================================
            HEADER
            SAME AS EMPLOYEE DASHBOARD
        ===================================================== */}

        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

          <View className="flex-row items-center">

            <TouchableOpacity
              onPress={() => router.replace("/employee")}
              className="mt-1"
            >
              <MaterialIcons
                name="arrow-back"
                size={26}
                color="white"
              />
            </TouchableOpacity>

            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
              Employee Profile
            </Text>

          </View>

        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingTop: 110,
          }}
        >

          <View style={styles.centerContent}>

            <View style={styles.errorIcon}>
              <MaterialIcons
                name="error-outline"
                size={48}
                color="#dc2626"
              />
            </View>

            <Text style={styles.errorTitle}>
              Profile Not Available
            </Text>

            <Text style={styles.errorSubtitle}>
              {error}
            </Text>

            <TouchableOpacity
              onPress={() => router.replace("/employee")}
              style={styles.loginButton}
            >
              <Text style={styles.loginButtonText}>
                Go Back
              </Text>
            </TouchableOpacity>

          </View>

        </ScrollView>

      </SafeAreaView>
    );
  }

  // ================= UI =================
  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">

      {/* =====================================================
          HEADER
          EXACT SAME SIZE / POSITION AS EMPLOYEE DASHBOARD
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.replace("/employee")}
            className="mt-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Employee Profile
          </Text>

        </View>

      </View>

      {/* =====================================================
          CONTENT
          TOP PADDING FOR FIXED HEADER
      ===================================================== */}

      <ScrollView
        className="flex-1 bg-[#f7f9f8]"
        contentContainerStyle={{
          paddingTop: 110,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* PROFILE CARD */}

        <View style={styles.section}>

          <View style={styles.card}>

            {/* PROFILE HEADER */}

            <View style={styles.profileHeader}>

              <View style={styles.avatarContainer}>

                <View style={styles.avatar}>

                  <MaterialIcons
                    name="person"
                    size={60}
                    color="#024e32"
                  />

                </View>

              </View>

              <Text style={styles.userName}>
                {profile.name || "Employee"}
              </Text>

              <Text style={styles.userId}>
                Employee ID: {profile.emp_id}
              </Text>

              <View style={styles.statusBadge}>

                <Text style={styles.statusText}>
                  Active Employee
                </Text>

              </View>

            </View>

            {/* PROFILE DETAILS */}

            <View style={styles.profileDetails}>

              <Text style={styles.sectionTitle}>
                PERSONAL INFORMATION
              </Text>

              <View style={styles.detailsList}>

                {/* EMPLOYEE ID */}

                <View style={styles.detailItem}>

                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: "#dbeafe",
                      },
                    ]}
                  >

                    <MaterialIcons
                      name="badge"
                      size={20}
                      color="#3b82f6"
                    />

                  </View>

                  <View style={styles.detailText}>

                    <Text style={styles.detailValue}>
                      {profile.emp_id}
                    </Text>

                    <Text style={styles.detailLabel}>
                      Employee ID
                    </Text>

                  </View>

                </View>

                {/* EMAIL */}

                <View style={styles.detailItem}>

                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: "#d1fae5",
                      },
                    ]}
                  >

                    <MaterialIcons
                      name="email"
                      size={20}
                      color="#10b981"
                    />

                  </View>

                  <View style={styles.detailText}>

                    <Text style={styles.detailValue}>
                      {profile.email || "Not provided"}
                    </Text>

                    <Text style={styles.detailLabel}>
                      Email Address
                    </Text>

                  </View>

                </View>

                {/* PHONE */}

                <View style={styles.detailItem}>

                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: "#fef3c7",
                      },
                    ]}
                  >

                    <MaterialIcons
                      name="phone"
                      size={20}
                      color="#f59e0b"
                    />

                  </View>

                  <View style={styles.detailText}>

                    <Text style={styles.detailValue}>
                      {profile.phone}
                    </Text>

                    <Text style={styles.detailLabel}>
                      Phone Number
                    </Text>

                  </View>

                </View>

                {/* ADDRESS */}

                <View style={styles.detailItem}>

                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: "#f3e8ff",
                      },
                    ]}
                  >

                    <MaterialIcons
                      name="location-on"
                      size={20}
                      color="#8b5cf6"
                    />

                  </View>

                  <View style={styles.detailText}>

                    <Text style={styles.detailValue}>
                      {profile.address || "Not provided"}
                    </Text>

                    <Text style={styles.detailLabel}>
                      Address
                    </Text>

                  </View>

                </View>

              </View>

            </View>

          </View>

        </View>

        {/* ACTION BUTTONS */}

        <View style={styles.section}>

          {/* EDIT PROFILE */}

          <TouchableOpacity
            onPress={() =>
              showComingSoon("Edit Profile")
            }
            style={[
              styles.actionButton,
              {
                borderColor: "#024e32",
              },
            ]}
            activeOpacity={0.8}
          >

            <View style={styles.actionButtonContent}>

              <View
                style={[
                  styles.actionIcon,
                  {
                    backgroundColor:
                      "rgba(2, 78, 50, 0.1)",
                  },
                ]}
              >

                <MaterialIcons
                  name="edit"
                  size={20}
                  color="#024e32"
                />

              </View>

              <Text
                style={[
                  styles.actionText,
                  {
                    color: "#024e32",
                  },
                ]}
              >
                Edit Profile
              </Text>

            </View>

            <MaterialIcons
              name="chevron-right"
              size={24}
              color="#024e32"
            />

          </TouchableOpacity>

          {/* CHANGE PASSWORD */}

          <TouchableOpacity
            onPress={() =>
              showComingSoon("Change Password")
            }
            style={[
              styles.actionButton,
              {
                borderColor: "#3b82f6",
                marginTop: 16,
              },
            ]}
            activeOpacity={0.8}
          >

            <View style={styles.actionButtonContent}>

              <View
                style={[
                  styles.actionIcon,
                  {
                    backgroundColor: "#dbeafe",
                  },
                ]}
              >

                <MaterialIcons
                  name="lock"
                  size={20}
                  color="#3b82f6"
                />

              </View>

              <Text
                style={[
                  styles.actionText,
                  {
                    color: "#3b82f6",
                  },
                ]}
              >
                Change Password
              </Text>

            </View>

            <MaterialIcons
              name="chevron-right"
              size={24}
              color="#3b82f6"
            />

          </TouchableOpacity>

          {/* LOGOUT */}

          <TouchableOpacity
            onPress={handleLogout}
            style={styles.logoutButton}
            activeOpacity={0.9}
          >

            <MaterialIcons
              name="logout"
              size={22}
              color="white"
              style={{
                marginRight: 10,
              }}
            />

            <Text style={styles.logoutText}>
              Logout
            </Text>

          </TouchableOpacity>

          {/* EXISTING INFORMATION NOTE */}

          <View style={styles.footerNote}>

            <MaterialIcons
              name="info"
              size={18}
              color="#6b7280"
              style={styles.footerIcon}
            />

            <Text style={styles.footerText}>
              For any account related queries, contact your administrator
            </Text>

          </View>

        </View>

        {/* =====================================================
            COMPANY FOOTER
        ===================================================== */}

        <View className="px-5 mt-8 mb-6">

          <View className="border-t border-gray-200 pt-4 items-center">

            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1 text-center">
              Employee Profile
            </Text>

            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}


// =========================================================
// PROFILE SKELETON
// =========================================================

function ProfileSkeleton() {
  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">

      {/* =====================================================
          HEADER
          SAME AS EMPLOYEE DASHBOARD
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

        <View className="flex-row items-center">

          {/* BACK BUTTON SKELETON */}

          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor:
                "rgba(255,255,255,0.25)",
            }}
          />

          {/* TITLE SKELETON */}

          <View
            style={{
              height: 25,
              width: 190,
              borderRadius: 6,
              backgroundColor:
                "rgba(255,255,255,0.25)",
              marginLeft: 16,
            }}
          />

        </View>

      </View>

      {/* =====================================================
          SKELETON CONTENT
      ===================================================== */}

      <ScrollView
        className="flex-1 bg-[#f7f9f8]"
        contentContainerStyle={{
          paddingTop: 110,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* PROFILE CARD */}

        <View style={styles.section}>

          <View style={styles.card}>

            {/* PROFILE HEADER */}

            <View style={styles.profileHeader}>

              {/* AVATAR */}

              <View
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: 64,
                  backgroundColor: "#d9e2de",
                  marginBottom: 16,
                }}
              />

              {/* NAME */}

              <View
                style={{
                  width: 170,
                  height: 25,
                  borderRadius: 6,
                  backgroundColor:
                    "rgba(255,255,255,0.35)",
                  marginTop: 8,
                }}
              />

              {/* EMPLOYEE ID */}

              <View
                style={{
                  width: 120,
                  height: 14,
                  borderRadius: 5,
                  backgroundColor:
                    "rgba(255,255,255,0.25)",
                  marginTop: 10,
                }}
              />

              {/* STATUS */}

              <View
                style={{
                  width: 120,
                  height: 30,
                  borderRadius: 20,
                  backgroundColor:
                    "rgba(255,255,255,0.25)",
                  marginTop: 12,
                }}
              />

            </View>

            {/* DETAILS */}

            <View style={styles.profileDetails}>

              {/* TITLE */}

              <View
                style={{
                  width: 150,
                  height: 14,
                  borderRadius: 5,
                  backgroundColor: "#e2e8e5",
                  marginBottom: 20,
                }}
              />

              <View style={styles.detailsList}>

                <SkeletonDetail />

                <SkeletonDetail />

                <SkeletonDetail />

                <SkeletonDetail />

              </View>

            </View>

          </View>

        </View>

        {/* ACTION BUTTONS */}

        <View style={styles.section}>

          <SkeletonAction />

          <View style={{ height: 16 }} />

          <SkeletonAction />

          {/* LOGOUT */}

          <View
            style={{
              height: 54,
              borderRadius: 12,
              backgroundColor: "#e2e8e5",
              marginTop: 24,
            }}
          />

          {/* INFORMATION NOTE */}

          <View
            style={{
              height: 60,
              borderRadius: 12,
              backgroundColor: "#e8ecea",
              marginTop: 20,
            }}
          />

        </View>

        {/* FOOTER */}

        <View className="px-5 mt-8 mb-6">

          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: "#e5e7eb",
              paddingTop: 16,
              alignItems: "center",
            }}
          >

            <View
              style={{
                width: 170,
                height: 16,
                borderRadius: 5,
                backgroundColor: "#dfe5e2",
              }}
            />

            <View
              style={{
                width: 90,
                height: 12,
                borderRadius: 4,
                backgroundColor: "#e5e9e7",
                marginTop: 8,
              }}
            />

            <View
              style={{
                width: 250,
                height: 11,
                borderRadius: 4,
                backgroundColor: "#e8ecea",
                marginTop: 8,
              }}
            />

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}


// =========================================================
// SKELETON DETAIL ROW
// =========================================================

function SkeletonDetail() {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
      }}
    >

      {/* ICON */}

      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: "#e1e7e4",
          marginRight: 12,
        }}
      />

      {/* TEXT */}

      <View style={{ flex: 1 }}>

        <View
          style={{
            width: "70%",
            height: 16,
            borderRadius: 5,
            backgroundColor: "#dfe5e2",
          }}
        />

        <View
          style={{
            width: "35%",
            height: 11,
            borderRadius: 4,
            backgroundColor: "#e8ecea",
            marginTop: 7,
          }}
        />

      </View>

    </View>
  );
}


// =========================================================
// SKELETON ACTION BUTTON
// =========================================================

function SkeletonAction() {
  return (
    <View
      style={{
        height: 74,
        backgroundColor: "white",
        borderWidth: 2,
        borderColor: "#e5e9e7",
        borderRadius: 12,
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >

        {/* ICON */}

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#e2e8e5",
            marginRight: 12,
          }}
        />

        {/* TEXT */}

        <View
          style={{
            width: 120,
            height: 16,
            borderRadius: 5,
            backgroundColor: "#dfe5e2",
          }}
        />

      </View>

      {/* ARROW */}

      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: "#e2e8e5",
        }}
      />

    </View>
  );
}


// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "500",
  },

  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  errorTitle: {
    color: "#1f2937",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },

  errorSubtitle: {
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 24,
  },

  loginButton: {
    backgroundColor: "#024e32",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },

  loginButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  profileHeader: {
    backgroundColor: "#024e32",
    padding: 32,
    alignItems: "center",
  },

  avatarContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor:
      "rgba(255, 255, 255, 0.2)",
    borderWidth: 4,
    borderColor:
      "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },

  userName: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
    textAlign: "center",
  },

  userId: {
    color: "#d1fae5",
    fontSize: 14,
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: "#10b981",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
  },

  statusText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  profileDetails: {
    padding: 24,
  },

  sectionTitle: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    textTransform: "uppercase",
  },

  detailsList: {
    gap: 16,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  detailText: {
    flex: 1,
  },

  detailValue: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "500",
  },

  detailLabel: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },

  actionButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  actionButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  actionText: {
    fontSize: 16,
    fontWeight: "500",
  },

  logoutButton: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  logoutText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },

  footerNote: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  footerIcon: {
    marginTop: 1,
  },

  footerText: {
    color: "#6b7280",
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});