import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import BACKEND_URL from "../../config";

/* =========================================================
   ADMIN - VACANCY NOTIFICATIONS

   Every subscription request a member raised from the member
   Vacancies page lands here.

   Approving does TWO things, in this order:

     1. POST /api/groups/:groupId/members   <- YOUR EXISTING
        endpoint, completely unchanged. This is the only place
        the member is actually added to the group, so the group
        member list and the vacancy count follow automatically.

     2. PUT /api/vacancy/requests/:id/approve
        which only flips Pending -> Approved AFTER verifying the
        member really is in the group.

   Nothing here keeps its own member count.
========================================================= */

const FILTERS = ["Pending", "Approved", "Rejected", "All"] as const;

const formatAmount = (amount: any) =>
  `₹${parseInt(String(amount || 0), 10).toLocaleString("en-IN")}`;

const formatDate = (value: any) => {
  if (!value) return "-";

  const d = new Date(value);

  if (isNaN(d.getTime())) return "-";

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
};

/* =========================================================
   SKELETON
========================================================= */

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

function SkeletonBox({
  className = "",
  style = {},
}: {
  className?: string;
  style?: object;
}) {
  const opacity = useSkeletonPulse();

  return (
    <Animated.View
      className={`bg-gray-200 rounded-lg ${className}`}
      style={[{ opacity }, style]}
    />
  );
}

/* One placeholder request card, same shape as the real one */
function RequestCardSkeleton() {
  return (
    <View className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm">
      {/* TOP ROW */}
      <View className="flex-row items-start">
        <SkeletonBox className="w-11 h-11 rounded-full" />

        <View className="flex-1 ml-3">
          <SkeletonBox className="h-4 rounded" style={{ width: "75%" }} />
          <SkeletonBox
            className="h-3 rounded mt-2"
            style={{ width: 110 }}
          />
        </View>

        <SkeletonBox className="h-6 rounded-full" style={{ width: 68 }} />
      </View>

      {/* DETAIL ROWS */}
      <View className="mt-4 border-t border-gray-100 pt-3">
        {[70, 60, 55, 50, 62, 90].map((w, i) => (
          <View
            key={i}
            className="flex-row justify-between items-center py-1.5"
          >
            <SkeletonBox className="h-3 rounded" style={{ width: 90 }} />
            <SkeletonBox
              className="h-3 rounded"
              style={{ width: `${w}%`, maxWidth: 150 }}
            />
          </View>
        ))}
      </View>

      {/* OPEN REQUEST */}
      <View className="flex-row items-center justify-end mt-3">
        <SkeletonBox className="h-3 rounded" style={{ width: 90 }} />
        <SkeletonBox className="w-5 h-5 rounded-full ml-2" />
      </View>
    </View>
  );
}

function RequestsSkeleton() {
  return (
    <View>
      <RequestCardSkeleton />
      <RequestCardSkeleton />
      <RequestCardSkeleton />
    </View>
  );
}

/* =========================================================
   CONFIRM OVERLAY

   NOT a <Modal>. iOS presents each Modal as its own native
   view controller, so a Modal shown from inside another Modal
   ends up invisible / untappable. A plain absolute overlay
   works both on the page and inside the detail modal.
========================================================= */

function ConfirmOverlay({
  visible,
  tone = "primary",
  icon,
  title,
  children,
  confirmText,
  cancelText = "Cancel",
  busy = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  tone?: "primary" | "danger" | "neutral";
  icon: any;
  title: string;
  children?: React.ReactNode;
  confirmText: string;
  cancelText?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;

  const danger = tone === "danger";
  const neutral = tone === "neutral";

  const iconBg = danger
    ? "bg-red-100"
    : neutral
    ? "bg-gray-100"
    : "bg-[#eaf4ef]";

  const iconColor = danger ? "#dc2626" : neutral ? "#6b7280" : "#024e32";

  const confirmBg = busy
    ? "bg-gray-400"
    : danger
    ? "bg-red-600"
    : "bg-[#024e32]";

  return (
    <View className="absolute inset-0 bg-black/60 justify-center items-center px-4 z-[100]">
      <View className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
        {/* ICON */}
        <View className="items-center mb-4">
          <View
            className={`w-16 h-16 rounded-full items-center justify-center ${iconBg}`}
          >
            <MaterialIcons name={icon} size={34} color={iconColor} />
          </View>

          <Text className="text-xl font-bold text-gray-900 mt-3 text-center">
            {title}
          </Text>
        </View>

        {/* BODY */}
        {children ? <View className="mb-6">{children}</View> : null}

        {/* BUTTONS */}
        <TouchableOpacity
          onPress={onConfirm}
          disabled={busy}
          activeOpacity={0.85}
          className={`py-3.5 rounded-xl ${confirmBg}`}
        >
          {busy ? (
            <View className="flex-row items-center justify-center">
              <ActivityIndicator size="small" color="white" />
              <Text className="text-white font-semibold ml-2">
                Please wait...
              </Text>
            </View>
          ) : (
            <Text className="text-white text-center font-semibold text-base">
              {confirmText}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCancel}
          disabled={busy}
          activeOpacity={0.85}
          className="py-3.5 rounded-xl mt-3 bg-gray-100"
        >
          <Text className="text-gray-700 text-center font-semibold text-base">
            {cancelText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminVacancyNotifications() {
  const router = useRouter();

const { from } = useLocalSearchParams<{
  from?: string;
}>();

  const [requests, setRequests] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  const [filter, setFilter] = useState<string>("Pending");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [openRequest, setOpenRequest] = useState<any>(null);
  const [groupMemberId, setGroupMemberId] = useState("");

  /* What the ID was when the request was opened - used to
     detect unsaved edits before closing the modal. */
  const [initialGroupMemberId, setInitialGroupMemberId] = useState("");

  const [processing, setProcessing] = useState(false);

  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejecting, setRejecting] = useState(false);

  /* Confirmations */
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmLeavePage, setConfirmLeavePage] = useState(false);
  const [confirmOpenGroup, setConfirmOpenGroup] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const [banner, setBanner] = useState("");
  const [bannerType, setBannerType] = useState<"success" | "error">("success");

  /*
    Alert.alert fired while a Modal is open is unreliable on iOS -
    the alert never appears, so the button looks dead even though
    it ran. Errors now render inside the modal instead.
  */
  const [modalError, setModalError] = useState("");

  const flash = (text: string, type: "success" | "error" = "success") => {
    setBanner(text);
    setBannerType(type);
    setTimeout(() => setBanner(""), 4500);
  };

  /* ================= LOAD ================= */
  const load = async (activeFilter = filter) => {
    try {
      const query =
        activeFilter && activeFilter !== "All"
          ? `?status=${encodeURIComponent(activeFilter)}`
          : "";

      const res = await fetch(`${BACKEND_URL}/vacancy/requests${query}`);
      const data = await res.json();

      setRequests(Array.isArray(data?.requests) ? data.requests : []);
      setPendingCount(Number(data?.pendingCount || 0));
    } catch (err) {
      console.log("Load requests error:", err);
      flash("Could not reach the server", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* Opening this page clears the red tick on the card */
  const markSeen = async () => {
    try {
      await fetch(`${BACKEND_URL}/vacancy/requests/seen`, { method: "PUT" });
    } catch (err) {
      console.log("Mark seen error:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
      markSeen();
    }, [filter])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  /* ================= OPEN / CLOSE REQUEST ================= */
  const openDetail = (request: any) => {
    const suggested = request.suggestedGroupMemberId || "";

    setModalError("");
    setConfirmApprove(false);
    setConfirmOpenGroup(false);
    setConfirmDiscard(false);
    setRejectTarget(null);
    setOpenRequest(request);
    setGroupMemberId(suggested);
    setInitialGroupMemberId(suggested);
  };

  /* Closes without asking - used after a completed action */
  const closeDetail = () => {
    setModalError("");
    setConfirmApprove(false);
    setConfirmOpenGroup(false);
    setConfirmDiscard(false);
    setRejectTarget(null);
    setOpenRequest(null);
    setGroupMemberId("");
    setInitialGroupMemberId("");
  };

  /* Close requested by the user - asks first if the ID was edited */
  const askCloseDetail = () => {
    const edited =
      openRequest?.status === "Pending" &&
      !openRequest?.alreadyInGroup &&
      groupMemberId.trim() !== initialGroupMemberId.trim();

    if (edited) {
      setConfirmDiscard(true);
      return;
    }

    closeDetail();
  };

  /* ================= HEADER BACK ================= */
  const askLeavePage = () => {
    setConfirmLeavePage(true);
  };
/* ================= HEADER BACK ================= */

const leavePage = () => {
  router.replace(
    from === "vacancy"
      ? "/admin/vacancies"
      : "/admin"
  );
};

  /* ================= OPEN GROUP ================= */
  const openGroupPage = () => {
    const gid = openRequest?.groupId;
    setConfirmOpenGroup(false);
    closeDetail();
    router.push(`/admin/groupMembers?groupId=${gid}`);
  };

  /* =========================================================
     STEP 1 — VALIDATE, THEN ASK FOR CONFIRMATION
  ========================================================= */
  const askApprove = () => {
    if (!openRequest) return;

    setModalError("");

    const trimmedId = groupMemberId.trim();

    if (!openRequest.alreadyInGroup && !trimmedId) {
      setModalError("Group Member ID is required");
      return;
    }

    if (openRequest.availableSeats <= 0 && !openRequest.alreadyInGroup) {
      setModalError(
        "This group has no free seat left. Remove a member or increase the group first."
      );
      return;
    }

    setConfirmApprove(true);
  };

  /* =========================================================
     STEP 2 — ADD MEMBER TO GROUP (existing endpoint) THEN APPROVE
  ========================================================= */
  const addMemberAndApprove = async () => {
    if (!openRequest) return;

    const trimmedId = groupMemberId.trim();

    setProcessing(true);

    try {
      /* ---------- STEP 1: EXISTING GROUP MEMBER API ---------- */
      if (!openRequest.alreadyInGroup) {
        const addRes = await fetch(
          `${BACKEND_URL}/groups/${openRequest.groupId}/members`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              memberId: openRequest.memberId,
              groupMemberId: trimmedId,
            }),
          }
        );

        const addData = await addRes.json().catch(() => ({}));

        if (!addRes.ok) {
          setConfirmApprove(false);
          setModalError(
            addData?.message || "Could not add the member to the group"
          );
          setProcessing(false);
          return;
        }
      }

      /* ---------- STEP 2: MARK THE REQUEST APPROVED ---------- */
      const approveRes = await fetch(
        `${BACKEND_URL}/vacancy/requests/${openRequest._id}/approve`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupMemberId: trimmedId }),
        }
      );

      const approveData = await approveRes.json().catch(() => ({}));

      if (!approveRes.ok) {
        setConfirmApprove(false);
        setModalError(
          approveData?.message ||
            "Member was added but the request could not be marked approved"
        );
        setProcessing(false);
        return;
      }

      const memberName = openRequest.memberName;
      const groupIdValue = openRequest.groupId;

      closeDetail();

      flash(`${memberName} added to group ${groupIdValue} as ${trimmedId}`);

      await load();
    } catch (err) {
      console.log("Approve error:", err);
      setConfirmApprove(false);
      setModalError("Could not reach the server");
    } finally {
      setProcessing(false);
    }
  };

  /* ================= REJECT ================= */
  const confirmReject = async () => {
    if (!rejectTarget) return;

    setRejecting(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/vacancy/requests/${rejectTarget._id}/reject`,
        { method: "PUT" }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRejectTarget(null);
        setModalError(data?.message || "Could not reject the request");
        setRejecting(false);
        return;
      }

      setRejectTarget(null);
      closeDetail();
      flash("Request rejected");

      await load();
    } catch (err) {
      console.log("Reject error:", err);
      setRejectTarget(null);
      setModalError("Could not reach the server");
    } finally {
      setRejecting(false);
    }
  };

  /* ================= UI ================= */
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={leavePage}
            activeOpacity={0.85}
            className="mt-1"
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Vacancy Notifications
          </Text>

          {pendingCount > 0 && (
            <View className="bg-red-600 rounded-full px-2.5 py-1 mt-1">
              <Text className="text-white text-xs font-bold">
                {pendingCount}
              </Text>
            </View>
          )}
        </View>
      </View>

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
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pb-10">
          {/* BANNER */}
          {banner ? (
            <View
              className={`mb-4 border rounded-xl py-3 px-4 ${
                bannerType === "success"
                  ? "bg-green-100 border-green-400"
                  : "bg-red-100 border-red-400"
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  bannerType === "success" ? "text-green-800" : "text-red-800"
                }`}
              >
                {banner}
              </Text>
            </View>
          ) : null}

          {/* FILTERS - stay usable while the list loads */}
          <View className="flex-row mb-5">
            {FILTERS.map((f) => {
              const active = filter === f;

              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    setFilter(f);
                    setLoading(true);
                  }}
                  activeOpacity={0.85}
                  className={`flex-1 py-2.5 rounded-xl mr-2 border ${
                    active
                      ? "bg-[#024e32] border-[#024e32]"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text
                    className={`text-center text-xs font-semibold ${
                      active ? "text-white" : "text-gray-700"
                    }`}
                  >
                    {f}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            /* ================= SKELETON ================= */
            <RequestsSkeleton />
          ) : requests.length === 0 ? (
            <View className="py-20 items-center bg-gray-50 rounded-2xl border border-gray-200">
              <MaterialIcons name="notifications-none" size={56} color="#ccc" />
              <Text className="text-gray-500 mt-3">
                No {filter === "All" ? "" : filter.toLowerCase()} requests
              </Text>
            </View>
          ) : (
            requests.map((r) => (
              <TouchableOpacity
                key={r._id}
                onPress={() => openDetail(r)}
                activeOpacity={0.9}
                className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm"
              >
                <View className="flex-row items-start">
                  <View className="w-11 h-11 rounded-full bg-[#eaf4ef] items-center justify-center">
                    <MaterialIcons name="person" size={24} color="#024e32" />

                    {r.status === "Pending" && !r.seenByAdmin && (
                      <View className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-white" />
                    )}
                  </View>

                  <View className="flex-1 ml-3">
                    <Text className="text-gray-900 font-bold text-base">
                      New Chit Subscription Request
                    </Text>
                    <Text className="text-gray-500 text-xs mt-0.5">
                      {formatDate(r.requestDate)}
                    </Text>
                  </View>

                  <View
                    className={`px-3 py-1 rounded-full ${
                      r.status === "Pending"
                        ? "bg-orange-100"
                        : r.status === "Approved"
                        ? "bg-green-100"
                        : "bg-red-100"
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        r.status === "Pending"
                          ? "text-orange-800"
                          : r.status === "Approved"
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {r.status}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 border-t border-gray-100 pt-3">
                  <Row label="Member Name" value={r.memberName} />
                  <Row label="Member ID" value={r.memberId} />
                  <Row label="Mobile" value={r.memberPhone} />
                  <Row label="Chit" value={formatAmount(r.chitAmount)} />
                  <Row label="Group ID" value={r.groupId} />
                  <Row
                    label="Seats"
                    value={`${r.filledSeats}/${r.capacity} filled · ${r.availableSeats} free`}
                  />
                </View>

                <View className="flex-row items-center justify-end mt-3">
                  <Text className="text-[#024e32] font-semibold text-sm mr-1">
                    Open request
                  </Text>
                  <MaterialIcons name="chevron-right" size={20} color="#024e32" />
                </View>
              </TouchableOpacity>
            ))
          )}

          {/* FOOTER */}
          <View className="mt-8 mb-6">
            <View className="border-t border-gray-200 pt-4 items-center">
              <Text className="text-[#024e32] font-bold text-base">
                MANIKYA CHITS PVT LTD
              </Text>
              <Text className="text-gray-500 text-xs mt-1">
                Vacancy Notifications
              </Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights
                reserved.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ================= LEAVE PAGE CONFIRMATION ================= */}
      <ConfirmOverlay
        visible={confirmLeavePage}
        tone="neutral"
        icon="arrow-back"
        title="Leave this page?"
        confirmText="Yes, go back"
        cancelText="Stay here"
        onConfirm={leavePage}
        onCancel={() => setConfirmLeavePage(false)}
      >
        <Text className="text-gray-500 text-sm text-center leading-5">
          You will return to the Vacancies page.
          {pendingCount > 0
            ? ` ${pendingCount} request${
                pendingCount === 1 ? " is" : "s are"
              } still pending.`
            : ""}
        </Text>
      </ConfirmOverlay>

      {/* ================= REQUEST DETAIL / ADD MEMBER ================= */}
      <Modal
        visible={!!openRequest}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={askCloseDetail}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[92%]">
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View className="p-6">
                {/* TITLE */}
                <View className="flex-row items-center mb-4">
                  <View className="bg-[#eaf4ef] p-2.5 rounded-full">
                    <MaterialIcons
                      name="notifications-active"
                      size={26}
                      color="#024e32"
                    />
                  </View>

                  <Text className="text-lg font-bold text-gray-900 ml-3 flex-1">
                    New Chit Subscription Request
                  </Text>

                  <TouchableOpacity
                    onPress={askCloseDetail}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="close" size={26} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                {/* IN-MODAL ERROR (replaces Alert.alert, which iOS hides) */}
                {modalError ? (
                  <View className="mb-4 bg-red-50 border border-red-300 rounded-xl p-3">
                    <Text className="text-red-700 text-sm text-center">
                      {modalError}
                    </Text>
                  </View>
                ) : null}

                {/* MEMBER */}
                <SectionTitle text="Member Details" />
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <Row label="Member Name" value={openRequest?.memberName} />
                  <Row label="Member ID" value={openRequest?.memberId} />
                  <Row label="Mobile" value={openRequest?.memberPhone} />
                  <Row label="Email" value={openRequest?.memberEmail} />
                  <Row label="Address" value={openRequest?.memberAddress} />
                  <Row label="Account" value={openRequest?.memberStatus} />
                </View>

                {/* INTEREST */}
                <SectionTitle text="Interested In" />
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <Row
                    label="Chit"
                    value={formatAmount(openRequest?.chitAmount)}
                  />
                  <Row label="Chit ID" value={openRequest?.chitId} />
                  <Row label="Group ID" value={openRequest?.groupId} />
                  <Row
                    label="Duration"
                    value={`${openRequest?.durationMonths} months`}
                  />
                  <Row
                    label="Max Bid %"
                    value={
                      openRequest?.maxBidPercent === null
                        ? "-"
                        : `${openRequest?.maxBidPercent}%`
                    }
                  />
                  <Row label="Frequency" value={openRequest?.frequency} />
                  <Row
                    label="Subscription"
                    value={formatAmount(openRequest?.subscriptionAmount)}
                  />
                </View>

                {/* REQUEST */}
                <SectionTitle text="Request" />
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <Row
                    label="Subscription Date"
                    value={formatDate(openRequest?.requestDate)}
                  />
                  <Row label="Status" value={openRequest?.status} />
                  {openRequest?.approvedGroupMemberId ? (
                    <Row
                      label="Group Member ID"
                      value={openRequest?.approvedGroupMemberId}
                    />
                  ) : null}
                  {openRequest?.approvedAt ? (
                    <Row
                      label="Approved On"
                      value={formatDate(openRequest?.approvedAt)}
                    />
                  ) : null}
                </View>

                {/* SEATS */}
                <View
                  className={`rounded-xl py-3 mb-5 ${
                    openRequest?.availableSeats > 0 ? "bg-[#eaf4ef]" : "bg-red-50"
                  }`}
                >
                  <Text
                    className={`text-center font-bold ${
                      openRequest?.availableSeats > 0
                        ? "text-[#024e32]"
                        : "text-red-700"
                    }`}
                  >
                    {openRequest?.filledSeats}/{openRequest?.capacity} members ·{" "}
                    {openRequest?.availableSeats} seat
                    {openRequest?.availableSeats === 1 ? "" : "s"} free
                  </Text>
                </View>

                {/* ACTION */}
                {openRequest?.status === "Pending" ? (
                  openRequest?.alreadyInGroup ? (
                    <>
                      <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                        <Text className="text-blue-800 text-sm text-center">
                          This member is already in group{" "}
                          {openRequest?.groupId}. Confirming will only mark the
                          request approved.
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={askApprove}
                        disabled={processing}
                        activeOpacity={0.85}
                        className={`py-4 rounded-xl mb-3 ${
                          processing ? "bg-gray-400" : "bg-[#024e32]"
                        }`}
                      >
                        <Text className="text-white text-center font-semibold text-base">
                          Confirm & Mark Approved
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <SectionTitle text="Add Member To Group" />

                      <Text className="text-gray-600 text-xs mb-2">
                        Group Member ID (suggested from the group's existing
                        members — you can change it)
                      </Text>

                      <TextInput
                        value={groupMemberId}
                        onChangeText={(t) => {
                          setGroupMemberId(t);
                          if (modalError) setModalError("");
                        }}
                        placeholder="e.g. M01"
                        autoCapitalize="characters"
                        className="border border-gray-300 px-4 py-4 rounded-xl mb-3 bg-gray-50"
                        placeholderTextColor="#9CA3AF"
                      />

                      <Text className="text-gray-400 text-[11px] mb-4">
                        This uses your existing Add Member API, so the group
                        member list and the vacancy count update the same way as
                        Group Members page.
                      </Text>

                      <TouchableOpacity
                        onPress={askApprove}
                        disabled={processing || openRequest?.availableSeats <= 0}
                        activeOpacity={0.85}
                        className={`py-4 rounded-xl mb-3 ${
                          processing || openRequest?.availableSeats <= 0
                            ? "bg-gray-400"
                            : "bg-[#024e32]"
                        }`}
                      >
                        <Text className="text-white text-center font-semibold text-base">
                          {openRequest?.availableSeats <= 0
                            ? "Group Full"
                            : "Add Member & Approve"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )
                ) : null}

                <View className="flex-row mb-2">
                  <TouchableOpacity
                    onPress={() => setConfirmOpenGroup(true)}
                    activeOpacity={0.85}
                    className="flex-1 bg-gray-100 py-3.5 rounded-xl mr-2"
                  >
                    <Text className="text-gray-700 text-center font-semibold">
                      Open Group
                    </Text>
                  </TouchableOpacity>

                  {openRequest?.status === "Pending" ? (
                    <TouchableOpacity
                      onPress={() => {
                        setModalError("");
                        setRejectTarget(openRequest);
                      }}
                      activeOpacity={0.85}
                      className="flex-1 bg-red-600 py-3.5 rounded-xl ml-2"
                    >
                      <Text className="text-white text-center font-semibold">
                        Reject
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={askCloseDetail}
                      activeOpacity={0.85}
                      className="flex-1 bg-gray-200 py-3.5 rounded-xl ml-2"
                    >
                      <Text className="text-gray-700 text-center font-semibold">
                        Close
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>

          {/* ================= APPROVE CONFIRMATION ================= */}
          <ConfirmOverlay
            visible={confirmApprove}
            tone="primary"
            icon="how-to-reg"
            title={
              openRequest?.alreadyInGroup
                ? "Mark this request approved?"
                : "Add member to group?"
            }
            confirmText={
              openRequest?.alreadyInGroup
                ? "Yes, mark approved"
                : "Yes, add & approve"
            }
            cancelText="Go back"
            busy={processing}
            onConfirm={addMemberAndApprove}
            onCancel={() => setConfirmApprove(false)}
          >
            <View className="bg-gray-50 rounded-2xl p-4">
              <Row label="Member" value={openRequest?.memberName} />
              <Row label="Member ID" value={openRequest?.memberId} />
              <Row label="Group" value={openRequest?.groupId} />

              {!openRequest?.alreadyInGroup ? (
                <Row
                  label="Group Member ID"
                  value={groupMemberId.trim().toUpperCase()}
                />
              ) : null}

              <Row
                label="Chit"
                value={formatAmount(openRequest?.chitAmount)}
              />
            </View>

            <Text className="text-gray-500 text-xs text-center mt-3 leading-5">
              {openRequest?.alreadyInGroup
                ? "The member is already in this group, so only the request status changes."
                : "The member will be added to the group and the request marked approved."}
            </Text>
          </ConfirmOverlay>

          {/* ================= REJECT CONFIRMATION ================= */}
          <ConfirmOverlay
            visible={!!rejectTarget}
            tone="danger"
            icon="cancel"
            title="Reject this request?"
            confirmText="Yes, reject request"
            cancelText="Keep pending"
            busy={rejecting}
            onConfirm={confirmReject}
            onCancel={() => setRejectTarget(null)}
          >
            <View className="bg-gray-50 rounded-2xl p-4">
              <Row label="Member" value={rejectTarget?.memberName} />
              <Row label="Member ID" value={rejectTarget?.memberId} />
              <Row label="Group" value={rejectTarget?.groupId} />
              <Row
                label="Chit"
                value={formatAmount(rejectTarget?.chitAmount)}
              />
            </View>

            <Text className="text-gray-500 text-xs text-center mt-3 leading-5">
              The member will not be added to any group. This cannot be undone
              from here.
            </Text>
          </ConfirmOverlay>

          {/* ================= OPEN GROUP CONFIRMATION ================= */}
          <ConfirmOverlay
            visible={confirmOpenGroup}
            tone="primary"
            icon="groups"
            title="Open group members?"
            confirmText="Yes, open group"
            cancelText="Stay here"
            onConfirm={openGroupPage}
            onCancel={() => setConfirmOpenGroup(false)}
          >
            <View className="bg-gray-50 rounded-2xl p-4">
              <Row label="Group" value={openRequest?.groupId} />
              <Row
                label="Seats"
                value={`${openRequest?.filledSeats}/${openRequest?.capacity} filled`}
              />
            </View>

            <Text className="text-gray-500 text-xs text-center mt-3 leading-5">
              This request will close and you will move to the Group Members
              page.
            </Text>
          </ConfirmOverlay>

          {/* ================= DISCARD CHANGES CONFIRMATION ================= */}
          <ConfirmOverlay
            visible={confirmDiscard}
            tone="danger"
            icon="close"
            title="Discard changes?"
            confirmText="Yes, discard"
            cancelText="Keep editing"
            onConfirm={closeDetail}
            onCancel={() => setConfirmDiscard(false)}
          >
            <Text className="text-gray-500 text-sm text-center leading-5">
              The Group Member ID you typed has not been saved. Closing now will
              lose it.
            </Text>
          </ConfirmOverlay>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= SMALL PIECES ================= */

function SectionTitle({ text }: { text: string }) {
  return (
    <Text className="text-gray-800 font-bold text-sm mb-2">{text}</Text>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <View className="flex-row justify-between items-start py-1.5">
      <Text className="text-gray-600 mr-3">{label}</Text>
      <Text className="text-gray-900 font-semibold flex-1 text-right">
        {value === undefined || value === null || value === "" ? "-" : value}
      </Text>
    </View>
  );
}