import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Modal,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config";

/* ================= SKELETON HELPERS ================= */
function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

function SkeletonBox({ className = "", style = {} }: { className?: string; style?: object }) {
  const opacity = useSkeletonPulse();
  return (
    <Animated.View
      className={`bg-gray-200 rounded-lg ${className}`}
      style={[{ opacity }, style]}
    />
  );
}

function SchemeCardSkeleton() {
  return (
    <View className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-4">
      <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100">
        <SkeletonBox className="h-4 rounded" style={{ width: 110 }} />
        <SkeletonBox className="h-5 rounded-full" style={{ width: 56 }} />
      </View>

      <View>
        {["Amount", "Duration", "Daily", "Weekly", "Monthly"].map((label) => (
          <View key={label} className="flex-row justify-between mb-3">
            <SkeletonBox className="h-3 rounded" style={{ width: 60 }} />
            <SkeletonBox className="h-3 rounded" style={{ width: 80 }} />
          </View>
        ))}
      </View>

      <SkeletonBox className="w-full h-12 rounded-xl mt-1" />
    </View>
  );
}

function SchemesSkeleton() {
  return (
    <View className="px-4 py-5">
      <View className="mb-6">
        <SkeletonBox className="h-6 rounded mb-2" style={{ width: 200 }} />
        <SkeletonBox className="h-3 rounded" style={{ width: 140 }} />
      </View>

      <SchemeCardSkeleton />
      <SchemeCardSkeleton />
      <SchemeCardSkeleton />

      {/* FOOTER SKELETON */}
      <View className="mt-6 mb-4 items-center">
        <View className="w-full border-t border-gray-200 pt-4 items-center">
          <SkeletonBox className="h-4 rounded" style={{ width: 155 }} />
          <SkeletonBox className="h-3 rounded mt-2" style={{ width: 95 }} />
          <SkeletonBox className="h-3 rounded mt-2" style={{ width: 250 }} />
        </View>
      </View>
    </View>
  );
}

/* ================= HELPER: race endpoints, first success wins ================= */
function firstSuccessful<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let remaining = promises.length;
    if (remaining === 0) {
      reject(new Error("No endpoints to try"));
      return;
    }
    promises.forEach((p) => {
      p.then(resolve).catch(() => {
        remaining -= 1;
        if (remaining === 0) {
          reject(new Error("All endpoints failed"));
        }
      });
    });
  });
}

/* ================= MAIN COMPONENT ================= */
export default function NewlyCommencedGroups() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  // Device type detection for responsive design
  const isMobile = width < 768; // Tablet breakpoint
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  // State variables
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

const [showContactConfirm, setShowContactConfirm] = useState(false);
const [selectedScheme, setSelectedScheme] = useState<any | null>(null);
const [sendingContactRequest, setSendingContactRequest] = useState(false);
  /* ================= SESSION GUARD ================= */
  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("loggedUser");
      if (!stored) {
        router.replace("/"); // 🔒 force to login if no session
      }
    };

    checkSession();
  }, []);

  /* ================= INITIAL DATA FETCH ================= */
  useEffect(() => {
    fetchSchemes();
  }, []);

  /* ================= FETCH SCHEMES (parallel race instead of sequential fallback) ================= */
  const fetchSchemes = async () => {
    try {
      setError("");
      setRefreshing(true);

      const endpoints = [
        `${BACKEND_URL}/chitscheme`,
        `${BACKEND_URL}/chitschemes`,
        `${BACKEND_URL}/api/chitscheme`,
        `${BACKEND_URL}/api/chitschemes`,
      ];

      // Try all endpoints at once and use whichever responds first with valid data,
      // instead of awaiting them one at a time (this was the main source of slow loads).
      const attempt = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Bad status from ${url}`);
        const data = await res.json();
        return data;
      };

      const data = await firstSuccessful(endpoints.map(attempt));
      setSchemes(data);
    } catch (err) {
      console.log("Error fetching schemes", err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ================= REFRESH HANDLER ================= */
  const onRefresh = () => {
    setRefreshing(true);
    fetchSchemes();
  };

const confirmContactRequest = (scheme: any) => {
  setSelectedScheme(scheme);
  setShowContactConfirm(true);
};

/* Close the confirm popup */
const closeContactPopup = () => {
  setSendingContactRequest(false);
  setShowContactConfirm(false);
  setSelectedScheme(null);
};

const sendContactRequest = async (scheme: any) => {
  try {
    setSendingContactRequest(true);

    const storedUser = await AsyncStorage.getItem("loggedUser");

    if (!storedUser) {
      closeContactPopup();
      Alert.alert("Error", "Please login again.");
      return;
    }

    const user = JSON.parse(storedUser);

    const userid = String(
      user?.userid ||
      user?.memberId ||
      user?.id ||
      ""
    );

    if (!userid) {
      closeContactPopup();
      Alert.alert("Error", "Member information not found.");
      return;
    }

    const response = await fetch(
      `${BACKEND_URL}/contact-requests`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userid,

          chitSchemeId:
            scheme?._id ||
            scheme?.id ||
            "",

          chitId:
            scheme?.chitId ||
            "",

          chitAmount:
            scheme?.chitAmount ||
            scheme?.amount ||
            0,

          durationMonths:
            scheme?.durationMonths ||
            scheme?.duration ||
            0,

          dailyAmount:
            scheme?.dailyAmount ||
            0,

          weeklyAmount:
            scheme?.weeklyAmount ||
            0,

          monthlyAmount:
            scheme?.monthlyAmount ||
            0,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.message || "Unable to send contact request"
      );
    }

    // Popup disappears first, then the success message shows
    closeContactPopup();

    Alert.alert(
      "Request Sent",
      "Your request has been sent to admin. Admin will contact you for details."
    );
  } catch (error: any) {
    console.error("❌ CONTACT REQUEST ERROR:", error);

    closeContactPopup();

    Alert.alert(
      "Request Failed",
      error?.message || "Unable to send request."
    );
  }
};

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Modal
  visible={showContactConfirm}
  transparent
  animationType="fade"
  onRequestClose={() => {
    if (!sendingContactRequest) {
      setShowContactConfirm(false);
      setSelectedScheme(null);
    }
  }}
>
  <View className="flex-1 bg-black/50 items-center justify-center px-5">
    <View className="bg-white w-full max-w-[430px] rounded-3xl overflow-hidden">

      {/* TOP ICON */}
      <View className="items-center pt-7">
        <View className="w-16 h-16 rounded-full bg-green-50 items-center justify-center">
          <MaterialIcons
            name="support-agent"
            size={34}
            color="#024e32"
          />
        </View>
      </View>

      {/* TITLE */}
      <View className="px-6 pt-5 items-center">
        <Text className="text-gray-900 text-xl font-bold text-center">
          Contact for Details?
        </Text>

        <Text className="text-gray-500 text-sm text-center mt-2 leading-5">
          Would you like to send a request to our admin
          for more details about this chit scheme?
        </Text>
      </View>

      {/* SCHEME DETAILS */}
      {selectedScheme && (
        <View className="mx-5 mt-5 bg-gray-50 rounded-2xl p-4">

          <View className="flex-row justify-between mb-3">
            <Text className="text-gray-500 text-sm">
              Chit ID
            </Text>

            <Text className="text-gray-900 font-bold text-sm">
              {selectedScheme?.chitId || "-"}
            </Text>
          </View>

          <View className="flex-row justify-between mb-3">
            <Text className="text-gray-500 text-sm">
              Chit Amount
            </Text>

            <Text className="text-gray-900 font-bold text-sm">
              ₹
              {Number(
                selectedScheme?.chitAmount ||
                selectedScheme?.amount ||
                0
              ).toLocaleString("en-IN")}
            </Text>
          </View>

          <View className="flex-row justify-between">
            <Text className="text-gray-500 text-sm">
              Duration
            </Text>

            <Text className="text-gray-900 font-bold text-sm">
              {selectedScheme?.durationMonths ||
                selectedScheme?.duration ||
                0}{" "}
              months
            </Text>
          </View>

        </View>
      )}

      {/* INFORMATION */}
      <View className="mx-5 mt-4 flex-row bg-green-50 rounded-xl p-3">
        <MaterialIcons
          name="info-outline"
          size={20}
          color="#024e32"
        />

        <Text className="flex-1 ml-2 text-green-800 text-xs leading-5">
          After confirming, your details will be shared
          with the admin so they can contact you regarding
          this chit scheme.
        </Text>
      </View>

      {/* BUTTONS */}
      <View className="px-5 pt-5 pb-6">

        {/* CONFIRM */}
        <TouchableOpacity
          disabled={sendingContactRequest}
          onPress={() => {
            if (selectedScheme) {
              sendContactRequest(selectedScheme);
            }
          }}
          className={`w-full py-3.5 rounded-xl items-center ${
            sendingContactRequest
              ? "bg-gray-400"
              : "bg-[#024e32]"
          }`}
        >
          {sendingContactRequest ? (
            <View className="flex-row items-center">
              <Text className="text-white font-bold">
                Sending...
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center">
              <MaterialIcons
                name="send"
                size={19}
                color="white"
              />

              <Text className="text-white font-bold ml-2">
                Yes, Contact Me
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* CANCEL */}
        <TouchableOpacity
          disabled={sendingContactRequest}
          onPress={() => {
            setShowContactConfirm(false);
            setSelectedScheme(null);
          }}
          className="w-full py-3.5 rounded-xl items-center mt-3 border border-gray-200"
        >
          <Text className="text-gray-700 font-semibold">
            Cancel
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  </View>
</Modal>
      {/* HEADER - SAME STANDARD EMPLOYEE HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mt-1">
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Newly Commenced Groups
          </Text>
        </View>
      </View>

      {/* ScrollView with Refresh Control */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 110, paddingBottom: 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
        showsVerticalScrollIndicator={true}
      >
        {loading ? (
          <SchemesSkeleton />
        ) : error ? (
          <View className="p-6 items-center justify-center min-h-[400px]">
            <MaterialIcons name="error-outline" size={50} color="#dc2626" />
            <Text className="text-red-600 mt-4 text-lg">{error}</Text>
            <TouchableOpacity
              onPress={fetchSchemes}
              className="bg-[#024e32] px-6 py-3 rounded-lg mt-4"
            >
              <Text className="text-white font-medium">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : schemes.length === 0 ? (
          <View className="py-8 items-center justify-center min-h-[400px]">
            <MaterialIcons name="account-balance-wallet" size={60} color="#ccc" />
            <Text className="text-gray-500 mt-4 text-lg">No chit schemes available</Text>
            <TouchableOpacity
              onPress={onRefresh}
              className="flex-row items-center bg-gray-100 px-4 py-2 rounded-lg mt-3"
            >
              <MaterialIcons name="refresh" size={20} color="#666" />
              <Text className="text-gray-600 ml-2">Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className={`${isDesktop ? "px-8 py-6" : "px-4 py-5"}`}>
            {/* Header with count */}
            <View className="mb-6">
              <Text className={`${isDesktop ? "text-2xl" : "text-xl"} font-bold text-gray-900`}>
                Available Chit Schemes
              </Text>
              <Text className="text-gray-600 mt-1">
                Total {schemes.length} scheme{schemes.length !== 1 ? 's' : ''} available
              </Text>
            </View>

            {/* Responsive Table Container */}
            {isMobile ? (
              /* ================= MOBILE VIEW ================= */
              <View className="space-y-4">
                {schemes.map((s, index) => (
                  <View
                    key={s._id || index}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
                  >
                    {/* Header Row */}
                    <View className="flex-row justify-between items-center mb-3 pb-3 border-b border-gray-100">
                      <Text className="font-bold text-gray-900">Chit ID: {s.chitId}</Text>
                      <View className="bg-green-50 px-3 py-1 rounded-full">
                        <Text className="text-green-700 text-sm font-medium">Active</Text>
                      </View>
                    </View>

                    {/* Details Grid */}
                    <View className="space-y-3">
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Amount</Text>
                        <Text className="font-bold text-gray-900">
                          ₹{parseInt(s.chitAmount).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Duration</Text>
                        <Text className="text-gray-900">{s.durationMonths} months</Text>
                      </View>

                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Daily</Text>
                        <Text className="text-gray-900">
                          ₹{parseInt(s.dailyAmount).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Weekly</Text>
                        <Text className="text-gray-900">
                          ₹{parseInt(s.weeklyAmount).toLocaleString('en-IN')}
                        </Text>
                      </View>

                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Monthly</Text>
                        <Text className="font-bold text-gray-900">
                          ₹{parseInt(s.monthlyAmount).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity
                     onPress={() => confirmContactRequest(s)}
                      className="bg-[#024e32] mt-4 py-3 rounded-xl w-full"
                    >
                      <Text className="text-white text-center font-semibold">
                        Contact for Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : isTablet ? (
              /* ================= TABLET VIEW ================= */
              <View className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {/* Table Header */}
                <View className="flex-row bg-[#024e32] py-4 min-w-[700px]">
                  <Text className="w-24 text-white text-center font-semibold">Chit ID</Text>
                  <Text className="w-28 text-white text-center font-semibold">Amount</Text>
                  <Text className="w-24 text-white text-center font-semibold">Months</Text>
                  <Text className="w-24 text-white text-center font-semibold">Daily</Text>
                  <Text className="w-24 text-white text-center font-semibold">Weekly</Text>
                  <Text className="w-24 text-white text-center font-semibold">Monthly</Text>
                  <Text className="w-28 text-white text-center font-semibold">Action</Text>
                </View>

                {/* Table Rows */}
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View className="min-w-[700px]">
                    {schemes.map((s, index) => (
                      <View
                        key={s._id || index}
                        className={`flex-row border-t border-gray-100 py-4 items-center min-w-[700px]
                          ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                      >
                        <Text className="w-24 text-center text-gray-900 font-medium">
                          {s.chitId}
                        </Text>
                        <Text className="w-28 text-center text-gray-900">
                          ₹{parseInt(s.chitAmount).toLocaleString('en-IN')}
                        </Text>
                        <Text className="w-24 text-center text-gray-900">
                          {s.durationMonths}
                        </Text>
                        <Text className="w-24 text-center text-gray-900">
                          ₹{parseInt(s.dailyAmount).toLocaleString('en-IN')}
                        </Text>
                        <Text className="w-24 text-center text-gray-900">
                          ₹{parseInt(s.weeklyAmount).toLocaleString('en-IN')}
                        </Text>
                        <Text className="w-24 text-center text-gray-900 font-bold">
                          ₹{parseInt(s.monthlyAmount).toLocaleString('en-IN')}
                        </Text>
                        <View className="w-28 items-center justify-center">
                          <TouchableOpacity
                            onPress={() => confirmContactRequest(s)}
                            className="bg-[#024e32] px-4 py-2.5 rounded-lg w-24"
                          >
                            <Text className="text-white text-sm font-medium text-center">
                              Contact
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            ) : (
              /* ================= DESKTOP VIEW ================= */
              <View className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {/* Enhanced Table Header */}
                <View className="flex-row bg-[#024e32] py-5">
                  <Text className="flex-1 text-white text-center font-semibold text-lg">Chit ID</Text>
                  <Text className="flex-1 text-white text-center font-semibold text-lg">Amount</Text>
                  <Text className="flex-1 text-white text-center font-semibold text-lg">Duration</Text>
                  <Text className="flex-1 text-white text-center font-semibold text-lg">Daily Payment</Text>
                  <Text className="flex-1 text-white text-center font-semibold text-lg">Weekly Payment</Text>
                  <Text className="flex-1 text-white text-center font-semibold text-lg">Monthly Payment</Text>
                  <Text className="flex-1 text-white text-center font-semibold text-lg">Action</Text>
                </View>

                {/* Table Rows - No horizontal scroll on desktop */}
                <View>
                  {schemes.map((s, index) => (
                    <View
                      key={s._id || index}
                      className={`flex-row py-5 items-center border-t border-gray-100
                        ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                        hover:bg-gray-100 transition-colors`}
                    >
                      <Text className="flex-1 text-center text-gray-900 font-medium text-lg">
                        {s.chitId}
                      </Text>
                      <Text className="flex-1 text-center text-gray-900 text-lg font-bold">
                        ₹{parseInt(s.chitAmount).toLocaleString('en-IN')}
                      </Text>
                      <Text className="flex-1 text-center text-gray-900 text-lg">
                        {s.durationMonths} months
                      </Text>
                      <Text className="flex-1 text-center text-gray-900 text-lg">
                        ₹{parseInt(s.dailyAmount).toLocaleString('en-IN')}
                      </Text>
                      <Text className="flex-1 text-center text-gray-900 text-lg">
                        ₹{parseInt(s.weeklyAmount).toLocaleString('en-IN')}
                      </Text>
                      <Text className="flex-1 text-center text-gray-900 text-lg font-bold">
                        ₹{parseInt(s.monthlyAmount).toLocaleString('en-IN')}
                      </Text>
                      <View className="flex-1 items-center justify-center">
                        <TouchableOpacity
                          onPress={() => confirmContactRequest(s)}
                          className="bg-[#024e32] hover:bg-[#013825] px-6 py-3 rounded-lg transition-colors"
                        >
                          <Text className="text-white text-lg font-medium">Contact</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Refresh Button for all views */}
            <View className="mt-8 items-center">
              <TouchableOpacity
                onPress={onRefresh}
                className={`flex-row items-center ${isDesktop ? 'px-8 py-4' : 'px-6 py-3'}
                  bg-gray-100 rounded-xl border border-gray-200 active:bg-gray-200`}
              >
                <MaterialIcons
                  name="refresh"
                  size={isDesktop ? 24 : 20}
                  color="#024e32"
                  style={{ marginRight: 8 }}
                />
                <Text className={`${isDesktop ? 'text-lg' : 'text-base'} text-[#024e32] font-medium`}>
                  Refresh Data
                </Text>
              </TouchableOpacity>

              {/* Last Updated Info */}
              <Text className="text-gray-500 text-sm mt-4">
                Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}

        {/* FOOTER */}
        <View className="mt-6 mb-6 px-4 items-center">
          <View className="w-full border-t border-gray-200 pt-4 items-center">
            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1 text-center">
              Newly Commenced Groups 
            </Text>

            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>
          </View>
        </View>

        {/* Bottom spacing */}
        <View className="h-4" />
      </ScrollView>
    </SafeAreaView>
  );
}