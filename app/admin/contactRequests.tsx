import React, { useCallback, useState, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Modal,
  Animated,
  StatusBar,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import BACKEND_URL from "../../config";

type ContactRequest = {
  _id: string;

  memberId: string;
  memberName: string;
  phone: string;
  email?: string;
  aadhaar: string;
  address?: string;

  joiningDate?: string;
  lastLogin?: string;
  status?: string;

  chitSchemeId?: string;
  chitId?: string;
  chitAmount?: number;
  durationMonths?: number;

  dailyAmount?: number;
  weeklyAmount?: number;
  monthlyAmount?: number;

  read: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const formatAmount = (amount: number = 0) => {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
};

const formatDate = (date?: string) => {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
};

const formatDateTime = (date?: string) => {
  if (!date) return "-";

  try {
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

/* ========== SKELETON LOADING ========== */
const SkeletonCard = () => {
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

  return (
    <Animated.View
      style={{ opacity: skeletonOpacity }}
      className="bg-white rounded-3xl p-5 mb-5 border border-gray-100"
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-gray-200" />
        <View className="flex-1 ml-3">
          <View className="h-5 w-40 bg-gray-200 rounded-md" />
          <View className="h-4 w-28 bg-gray-200 rounded-md mt-1" />
        </View>
        <View className="h-6 w-14 bg-gray-200 rounded-full" />
      </View>

      <View className="mt-4 bg-gray-100 rounded-2xl p-4">
        <View className="h-5 w-36 bg-gray-200 rounded-md" />
        <View className="h-4 w-56 bg-gray-200 rounded-md mt-2" />
      </View>

      <View className="mt-5">
        <View className="h-5 w-32 bg-gray-200 rounded-md" />
        <View className="mt-3 space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <View key={i} className="flex-row items-center py-2 border-b border-gray-100">
              <View className="w-5 h-5 bg-gray-200 rounded-full" />
              <View className="h-4 w-24 bg-gray-200 rounded-md ml-3" />
              <View className="h-4 w-32 bg-gray-200 rounded-md ml-auto" />
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
};

/* ========== MAIN COMPONENT ========== */
export default function ContactRequestsScreen() {
  const router = useRouter();

  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Call modal state
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callPhoneNumber, setCallPhoneNumber] = useState<string>("");

  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContactRequest | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/contact-requests`);

      const raw = await response.text();

      let data: any;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Server returned invalid response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load contact requests");
      }

      setRequests(data?.requests || []);
    } catch (error) {
      console.error("❌ CONTACT REQUESTS LOAD ERROR:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const openRequest = async (request: ContactRequest) => {
    try {
      setOpeningId(request._id);

      if (!request.read) {
        const response = await fetch(
          `${BACKEND_URL}/contact-requests/${request._id}/read`,
          {
            method: "PATCH",
          }
        );

        const raw = await response.text();

        let data: any;

        try {
          data = JSON.parse(raw);
        } catch {
          data = null;
        }

        if (!response.ok) {
          throw new Error(data?.message || "Failed to mark notification as read");
        }

        setRequests((current) =>
          current.map((item) =>
            item._id === request._id ? { ...item, read: true } : item
          )
        );
      }
    } catch (error) {
      console.error("❌ MARK CONTACT REQUEST READ ERROR:", error);
    } finally {
      setOpeningId(null);
    }
  };

  // Show delete confirmation modal
  const confirmDelete = (request: ContactRequest) => {
    setDeleteTarget(request);
    setDeleteModalVisible(true);
  };

  // Perform actual delete
  const performDelete = async () => {
    if (!deleteTarget) return;

    try {
      setDeletingId(deleteTarget._id);

      const response = await fetch(
        `${BACKEND_URL}/contact-requests/${deleteTarget._id}`,
        {
          method: "DELETE",
        }
      );

      const raw = await response.text();

      let data: any;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Server returned invalid response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete contact request");
      }

      setRequests((current) =>
        current.filter((item) => item._id !== deleteTarget._id)
      );

      // Close modal and reset
      setDeleteModalVisible(false);
      setDeleteTarget(null);
    } catch (error: any) {
      console.error("❌ DELETE CONTACT REQUEST ERROR:", error);
      // Show error in a simple Alert – we can keep this as a fallback
      Alert.alert("Delete Failed", error?.message || "Unable to delete contact request.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleCall = (phoneNumber: string) => {
    if (!phoneNumber) return;
    setCallPhoneNumber(phoneNumber);
    setCallModalVisible(true);
  };

  const initiateCall = () => {
    setCallModalVisible(false);
    Linking.openURL(`tel:${callPhoneNumber}`).catch((err) =>
      console.error("Failed to open dialer:", err)
    );
  };

  const unreadCount = requests.filter((item) => !item.read).length;

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">
      <StatusBar barStyle="light-content" backgroundColor="#024e32" />

      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-1"
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <View className="flex-1 ml-3">
            <Text className="text-white text-xl font-bold">Contact Requests</Text>
            <Text className="text-green-100 text-xs mt-1">
              Member requests for chit scheme details
            </Text>
          </View>
          {unreadCount > 0 && (
            <View className="bg-red-500 rounded-full min-w-[30px] h-[30px] items-center justify-center px-2 mt-1">
              <Text className="text-white text-xs font-bold">
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 16,
          paddingTop: 130,
          paddingBottom: 40,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* SUMMARY */}
        <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-100">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-green-50 items-center justify-center">
              <MaterialIcons name="support-agent" size={24} color="#024E32" />
            </View>

            <View className="flex-1 ml-3">
              <Text className="text-gray-900 font-bold text-base">
                Contact for Details
              </Text>

              <Text className="text-gray-500 text-xs mt-1">
                {requests.length} total request
                {requests.length === 1 ? "" : "s"}
              </Text>
            </View>

            {unreadCount > 0 && (
              <View>
                <Text className="text-red-500 text-xs font-bold">
                  {unreadCount} NEW
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* LOADING – skeleton cards */}
        {loading && (
          <View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <View className="items-center mt-2 mb-6">
              <ActivityIndicator size="small" color="#024e32" />
              <Text className="text-gray-400 text-xs mt-2">Loading contact requests...</Text>
            </View>
          </View>
        )}

        {/* EMPTY */}
        {!loading && requests.length === 0 && (
          <View className="bg-white rounded-3xl p-8 items-center border border-gray-100">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center">
              <MaterialIcons name="notifications-none" size={32} color="#9CA3AF" />
            </View>

            <Text className="text-gray-900 text-lg font-bold mt-4">
              No Contact Requests
            </Text>

            <Text className="text-gray-500 text-sm text-center mt-2">
              When a member taps "Contact for Details", their request will appear here.
            </Text>
          </View>
        )}

        {/* REQUEST CARDS */}
        {!loading &&
          requests.map((request) => {
            const isUnread = !request.read;
            const isOpening = openingId === request._id;

            return (
              <TouchableOpacity
                key={request._id}
                activeOpacity={0.9}
                onPress={() => openRequest(request)}
                disabled={isOpening}
                className={`bg-white rounded-3xl p-5 mb-5 border ${
                  isUnread ? "border-red-300" : "border-gray-100"
                }`}
              >
                {/* CARD HEADER */}
                <View className="flex-row items-center">
                  <View
                    className={`w-12 h-12 rounded-full items-center justify-center ${
                      isUnread ? "bg-red-100" : "bg-gray-100"
                    }`}
                  >
                    <MaterialIcons
                      name="person"
                      size={25}
                      color={isUnread ? "#DC2626" : "#6B7280"}
                    />
                  </View>

                  <View className="flex-1 ml-3">
                    <Text className="text-gray-900 text-base font-bold">
                      {request.memberName || "Unknown Member"}
                    </Text>

                    <Text className="text-gray-500 text-xs mt-1">
                      Member ID: {request.memberId || "-"}
                    </Text>
                  </View>

                  {isUnread && (
                    <View className="bg-red-500 rounded-full px-3 py-1">
                      <Text className="text-white text-[10px] font-bold">NEW</Text>
                    </View>
                  )}
                </View>

                {/* REQUEST INFO */}
                <View className="mt-4 bg-green-50 rounded-2xl p-4">
                  <View className="flex-row items-center">
                    <MaterialIcons name="support-agent" size={20} color="#024E32" />

                    <Text className="text-[#024E32] font-bold ml-2">
                      Contact for Details
                    </Text>
                  </View>

                  <Text className="text-gray-600 text-xs mt-2">
                    Member has requested more information about this chit scheme.
                  </Text>
                </View>

                {/* MEMBER DETAILS */}
                <Text className="text-[#024E32] font-bold text-base mt-5 mb-3">
                  Member Details
                </Text>

                <View className="bg-gray-50 rounded-2xl p-4">
                  <DetailRow icon="badge" label="Member ID" value={request.memberId} />

                  <DetailRow icon="person" label="Name" value={request.memberName} />

                  <DetailRow
                    icon="phone"
                    label="Phone"
                    value={request.phone}
                    onPress={() => handleCall(request.phone)}
                  />

                  <DetailRow icon="email" label="Email" value={request.email} />

                  <DetailRow icon="fingerprint" label="Aadhaar" value={request.aadhaar} />

                  <DetailRow icon="home" label="Address" value={request.address} />

                  <DetailRow
                    icon="event"
                    label="Joining Date"
                    value={formatDate(request.joiningDate)}
                  />

                  <DetailRow
                    icon="verified-user"
                    label="Status"
                    value={request.status || "active"}
                    last
                  />
                </View>

                {/* CHIT DETAILS */}
                <Text className="text-[#024E32] font-bold text-base mt-5 mb-3">
                  Chit Scheme Details
                </Text>

                <View className="bg-gray-50 rounded-2xl p-4">
                  <DetailRow
                    icon="confirmation-number"
                    label="Chit ID"
                    value={request.chitId}
                  />

                  <DetailRow
                    icon="account-balance-wallet"
                    label="Chit Amount"
                    value={formatAmount(Number(request.chitAmount || 0))}
                  />

                  <DetailRow
                    icon="calendar-month"
                    label="Duration"
                    value={
                      request.durationMonths
                        ? `${request.durationMonths} months`
                        : "-"
                    }
                  />

                  <DetailRow
                    icon="today"
                    label="Daily"
                    value={formatAmount(Number(request.dailyAmount || 0))}
                  />

                  <DetailRow
                    icon="date-range"
                    label="Weekly"
                    value={formatAmount(Number(request.weeklyAmount || 0))}
                  />

                  <DetailRow
                    icon="calendar-today"
                    label="Monthly"
                    value={formatAmount(Number(request.monthlyAmount || 0))}
                    last
                  />
                </View>

                {/* REQUEST TIME */}
                <View className="flex-row items-center mt-4">
                  <MaterialIcons name="schedule" size={16} color="#9CA3AF" />

                  <Text className="text-gray-400 text-xs ml-2">
                    Requested: {formatDateTime(request.createdAt)}
                  </Text>
                </View>

                {/* OPEN STATUS */}
                {isOpening && (
                  <View className="flex-row items-center mt-3">
                    <ActivityIndicator size="small" color="#024E32" />

                    <Text className="text-gray-500 text-xs ml-2">
                      Opening request...
                    </Text>
                  </View>
                )}

                {!isUnread && !isOpening && (
                  <View className="flex-row items-center mt-3">
                    <MaterialIcons name="done" size={16} color="#16A34A" />

                    <Text className="text-green-600 text-xs ml-2 font-medium">
                      Read
                    </Text>
                  </View>
                )}

                {/* DELETE BUTTON */}
                <TouchableOpacity
                  onPress={() => confirmDelete(request)}
                  disabled={deletingId === request._id}
                  activeOpacity={0.8}
                  className="mt-4 bg-red-50 border border-red-200 rounded-xl py-3 flex-row items-center justify-center"
                >
                  {deletingId === request._id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <>
                      <MaterialIcons name="delete-outline" size={20} color="#DC2626" />
                      <Text className="text-red-600 font-bold ml-2">
                        Delete Request
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}

        {/* FOOTER */}
        <View className="mt-6 mb-6 px-5">
          <View className="border-t border-gray-200 pt-4 items-center">
            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>
            <Text className="text-gray-500 text-xs mt-1 text-center">
              Contact Requests
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>
          </View>
        </View>
        <View className="h-20" />
      </ScrollView>

      {/* CUSTOM CALL CONFIRMATION MODAL */}
      <Modal
        transparent
        visible={callModalVisible}
        animationType="fade"
        onRequestClose={() => setCallModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setCallModalVisible(false)}
        >
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-4">
                <MaterialIcons name="phone" size={32} color="#024E32" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">Call Member</Text>
              <Text className="text-gray-500 text-sm mt-1 text-center">
                Do you want to call {callPhoneNumber}?
              </Text>
            </View>

            <View className="flex-row mt-6 space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
                onPress={() => setCallModalVisible(false)}
              >
                <Text className="text-gray-700 font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-[#024E32] py-3 rounded-xl items-center"
                onPress={initiateCall}
              >
                <Text className="text-white font-semibold">Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      <Modal
        transparent
        visible={deleteModalVisible}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setDeleteModalVisible(false)}
        >
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <View className="items-center">
              <View className="w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4">
                <MaterialIcons name="delete-forever" size={32} color="#DC2626" />
              </View>
              <Text className="text-gray-900 text-lg font-bold">Delete Request</Text>
              <Text className="text-gray-500 text-sm mt-2 text-center">
                Are you sure you want to delete the contact request from{' '}
                <Text className="font-bold text-gray-700">
                  {deleteTarget?.memberName || "this member"}
                </Text>?
              </Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                This action cannot be undone.
              </Text>
            </View>

            <View className="flex-row mt-6 space-x-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 py-3 rounded-xl items-center"
                onPress={() => setDeleteModalVisible(false)}
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
  );
}

/* DETAIL ROW – with optional onPress */
function DetailRow({
  icon,
  label,
  value,
  last = false,
  onPress,
}: {
  icon: any;
  label: string;
  value?: string;
  last?: boolean;
  onPress?: () => void;
}) {
  const valueElement = onPress ? (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Text className="text-blue-600 text-sm font-semibold underline">
        {value || "-"}
      </Text>
    </TouchableOpacity>
  ) : (
    <Text className="text-gray-900 text-sm font-semibold flex-1">
      {value || "-"}
    </Text>
  );

  return (
    <View
      className={`flex-row py-3 ${!last ? "border-b border-gray-200" : ""}`}
    >
      <MaterialIcons name={icon} size={18} color="#6B7280" />
      <Text className="text-gray-500 text-xs ml-3 w-[105px]">{label}</Text>
      <View className="flex-1">{valueElement}</View>
    </View>
  );
}