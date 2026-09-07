import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
   ADMIN - VACANCIES

   Vacancies are built ONLY from chits and groups that already
   exist. Nothing on this page creates a chit or a group, and
   the seat count is always the real one from the group:

       available = group.totalCollections - group.members.length

   which the backend computes live on every read.
========================================================= */

const FREQUENCIES = ["Daily", "Weekly", "Monthly"] as const;

const formatAmount = (amount: any) =>
  `₹${parseInt(String(amount || 0), 10).toLocaleString("en-IN")}`;

export default function AdminVacancies() {
  const router = useRouter();

  /* existing data (read only) */
  const [chits, setChits] = useState<any[]>([]);
  const [groupsOfChit, setGroupsOfChit] = useState<any[]>([]);

  /* vacancies */
  const [vacancies, setVacancies] = useState<any[]>([]);

  /* request badge */
  const [pendingCount, setPendingCount] = useState(0);
  const [unseenCount, setUnseenCount] = useState(0);

  /* form */
  const [selectedChitId, setSelectedChitId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [maxBidPercent, setMaxBidPercent] = useState("");
  const [frequency, setFrequency] = useState<string>("Monthly");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<"Open" | "Closed">("Open");

  /* ui */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [editTarget, setEditTarget] = useState<any>(null);
  const [editMaxBid, setEditMaxBid] = useState("");
  const [editFrequency, setEditFrequency] = useState<string>("Monthly");
  const [editDetails, setEditDetails] = useState("");
  const [editStatus, setEditStatus] = useState<"Open" | "Closed">("Open");

  const flash = (text: string, type: "success" | "error" = "success") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3500);
  };

  /* ================= LOAD EXISTING CHITS ================= */
  const loadChits = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/chitscheme`);
      const data = await res.json();
      setChits(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load chits error:", err);
    }
  };

  /* ============ LOAD EXISTING GROUPS OF A CHIT ============ */
  const loadGroupsOfChit = async (chitId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${chitId}`);
      const data = await res.json();
      setGroupsOfChit(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load groups error:", err);
      setGroupsOfChit([]);
    }
  };

  /* ================= LOAD VACANCIES ================= */
  const loadVacancies = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/vacancy`);
      const data = await res.json();
      setVacancies(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load vacancies error:", err);
    }
  };

  /* ================= LOAD REQUEST BADGE ================= */
  const loadBadge = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/vacancy/requests/count`);
      const data = await res.json();
      setPendingCount(Number(data?.pendingCount || 0));
      setUnseenCount(Number(data?.unseenCount || 0));
    } catch (err) {
      console.log("Load badge error:", err);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadChits(), loadVacancies(), loadBadge()]);
    setLoading(false);
    setRefreshing(false);
  };

  /* Reload every time the screen is focused so the seat counts
     reflect any member added or removed elsewhere. */
  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  /* ================= SELECT EXISTING CHIT ================= */
  const pickChit = (chitId: string) => {
    setSelectedChitId(chitId);
    setSelectedGroupId(null);
    setGroupsOfChit([]);
    loadGroupsOfChit(chitId);
  };

  const resetForm = () => {
    setSelectedChitId(null);
    setSelectedGroupId(null);
    setGroupsOfChit([]);
    setMaxBidPercent("");
    setFrequency("Monthly");
    setDetails("");
    setStatus("Open");
    setShowForm(false);
  };

  /* ================= VALIDATE + CONFIRM ================= */
  const handlePublish = () => {
    if (!selectedChitId) {
      flash("Select an existing Chit", "error");
      return;
    }

    if (!selectedGroupId) {
      flash("Select an existing Group", "error");
      return;
    }

    const bid = Number(maxBidPercent);

    if (!maxBidPercent || !Number.isFinite(bid) || bid < 0 || bid > 100) {
      flash("Max Bid % must be between 0 and 100", "error");
      return;
    }

    const duplicate = vacancies.some(
      (v) => v.chitId === selectedChitId && v.groupId === selectedGroupId
    );

    if (duplicate) {
      flash(`A vacancy already exists for group ${selectedGroupId}`, "error");
      return;
    }

    setConfirmVisible(true);
  };

  /* ================= CREATE VACANCY ================= */
  const publishVacancy = async () => {
    setConfirmVisible(false);
    setSaving(true);

    try {
      const res = await fetch(`${BACKEND_URL}/vacancy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chitId: selectedChitId,
          groupId: selectedGroupId,
          maxBidPercent: Number(maxBidPercent),
          frequency,
          details,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        flash(data?.message || "Failed to publish vacancy", "error");
        return;
      }

      flash(`Vacancy published for group ${selectedGroupId}`);
      resetForm();
      await loadVacancies();
    } catch (err) {
      console.log("Publish vacancy error:", err);
      flash("Could not reach the server", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ================= EDIT VACANCY ================= */
  const openEdit = (v: any) => {
    setEditTarget(v);
    setEditMaxBid(String(v.maxBidPercent ?? ""));
    setEditFrequency(v.frequency || "Monthly");
    setEditDetails(v.details || "");
    setEditStatus(v.status === "Closed" ? "Closed" : "Open");
  };

  const saveEdit = async () => {
    if (!editTarget) return;

    const bid = Number(editMaxBid);

    if (!Number.isFinite(bid) || bid < 0 || bid > 100) {
      Alert.alert("Error", "Max Bid % must be between 0 and 100");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/vacancy/${editTarget._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxBidPercent: bid,
          frequency: editFrequency,
          details: editDetails,
          status: editStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to update vacancy");
        return;
      }

      setEditTarget(null);
      flash("Vacancy updated successfully");
      await loadVacancies();
    } catch (err) {
      console.log("Update vacancy error:", err);
      Alert.alert("Error", "Could not reach the server");
    }
  };

  /* ================= DELETE VACANCY ================= */
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`${BACKEND_URL}/vacancy/${deleteTarget._id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert("Error", data?.message || "Failed to delete vacancy");
        return;
      }

      setDeleteTarget(null);
      flash("Vacancy deleted successfully");
      await Promise.all([loadVacancies(), loadBadge()]);
    } catch (err) {
      console.log("Delete vacancy error:", err);
      Alert.alert("Error", "Could not reach the server");
    }
  };

  const selectedChit = chits.find((c) => c.chitId === selectedChitId);

  const previewSubscription = () => {
    if (!selectedChit) return 0;
    if (frequency === "Daily") return selectedChit.dailyAmount;
    if (frequency === "Weekly") return selectedChit.weeklyAmount;
    return selectedChit.monthlyAmount;
  };

  const selectedGroup = groupsOfChit.find((g) => g.groupId === selectedGroupId);

  const selectedGroupSeats = selectedGroup
    ? Math.max(
        Number(selectedGroup.totalCollections || 0) -
          (selectedGroup.members?.length || 0),
        0
      )
    : 0;

  /* ================= UI ================= */
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.replace("/admin")} className="mt-1">
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Vacancies
          </Text>
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
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#024e32" />
            <Text className="text-gray-500 mt-3">Loading vacancies...</Text>
          </View>
        ) : (
          <View className="px-5 pb-10">
            {/* ===============================================
                VACANCY NOTIFICATION CARD (RED TICK)
            =============================================== */}
            <TouchableOpacity
              onPress={() =>
  router.push("/admin/vacancyNotifications?from=vacancy")
}
              activeOpacity={0.9}
              className="bg-white rounded-2xl border border-[#e8f0eb] shadow-md p-5 mb-6 flex-row items-center"
            >
              <View className="w-14 h-14 rounded-2xl bg-[#eaf4ef] items-center justify-center">
                <MaterialIcons name="notifications-active" size={30} color="#024e32" />

                {unseenCount > 0 && (
                  <View className="absolute -top-1 -right-1 bg-red-600 min-w-[22px] h-[22px] rounded-full items-center justify-center px-1 border-2 border-white">
                    <Text className="text-white text-[11px] font-bold">
                      {unseenCount > 99 ? "99+" : unseenCount}
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-1 ml-4">
                <Text className="text-[#024e32] text-base font-semibold">
                  Vacancy Notifications
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  {pendingCount === 0
                    ? "No pending subscription requests"
                    : `${pendingCount} pending subscription request${
                        pendingCount === 1 ? "" : "s"
                      }`}
                </Text>
              </View>

              <MaterialIcons name="chevron-right" size={26} color="#9ca3af" />
            </TouchableOpacity>

            {/* MESSAGE */}
            {message ? (
              <View
                className={`mb-4 border rounded-xl py-3 px-4 ${
                  messageType === "success"
                    ? "bg-green-100 border-green-400"
                    : "bg-red-100 border-red-400"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    messageType === "success" ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {message}
                </Text>
              </View>
            ) : null}

            {/* ===============================================
                CREATE VACANCY
            =============================================== */}
            {!showForm ? (
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-[#024e32] py-4 rounded-2xl shadow-lg shadow-green-900/30 mb-6"
                activeOpacity={0.85}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  ✚ Create Vacancy
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6">
                <Text className="text-gray-800 font-bold text-lg mb-1">
                  New Vacancy
                </Text>
                <Text className="text-gray-500 text-xs mb-4">
                  Uses your existing Chit Schemes and Groups only
                </Text>

                {/* ---------- SELECT EXISTING CHIT ---------- */}
                <Text className="text-gray-700 font-semibold mb-2">
                  Chit <Text className="text-gray-400 text-xs">(existing)</Text>
                </Text>

                {chits.length === 0 ? (
                  <Text className="text-red-600 text-sm mb-4">
                    No chit schemes found. Add one in Chit Schemes first.
                  </Text>
                ) : (
                  <View className="flex-row flex-wrap mb-4">
                    {chits.map((c) => {
                      const active = selectedChitId === c.chitId;

                      return (
                        <TouchableOpacity
                          key={c._id || c.chitId}
                          onPress={() => pickChit(c.chitId)}
                          activeOpacity={0.85}
                          className={`mr-2 mb-2 px-4 py-3 rounded-xl border ${
                            active
                              ? "bg-[#024e32] border-[#024e32]"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          <Text
                            className={`font-bold ${
                              active ? "text-white" : "text-gray-800"
                            }`}
                          >
                            {formatAmount(c.chitAmount)}
                          </Text>
                          <Text
                            className={`text-xs mt-0.5 ${
                              active ? "text-green-100" : "text-gray-500"
                            }`}
                          >
                            {c.chitId} · {c.durationMonths} months
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* ---------- SELECT EXISTING GROUP ---------- */}
                {selectedChitId ? (
                  <>
                    <Text className="text-gray-700 font-semibold mb-2">
                      Group{" "}
                      <Text className="text-gray-400 text-xs">
                        (existing groups of {selectedChitId})
                      </Text>
                    </Text>

                    {groupsOfChit.length === 0 ? (
                      <Text className="text-red-600 text-sm mb-4">
                        No groups found for this chit. Create one in Groups first.
                      </Text>
                    ) : (
                      <View className="flex-row flex-wrap mb-4">
                        {groupsOfChit.map((g) => {
                          const active = selectedGroupId === g.groupId;
                          const capacity = Number(g.totalCollections || 0);
                          const filled = g.members?.length || 0;
                          const free = Math.max(capacity - filled, 0);

                          return (
                            <TouchableOpacity
                              key={g._id || g.groupId}
                              onPress={() => setSelectedGroupId(g.groupId)}
                              activeOpacity={0.85}
                              className={`mr-2 mb-2 px-4 py-3 rounded-xl border ${
                                active
                                  ? "bg-[#024e32] border-[#024e32]"
                                  : free === 0
                                  ? "bg-gray-100 border-gray-300"
                                  : "bg-white border-gray-300"
                              }`}
                            >
                              <Text
                                className={`font-bold ${
                                  active ? "text-white" : "text-gray-800"
                                }`}
                              >
                                {g.groupId}
                              </Text>
                              <Text
                                className={`text-xs mt-0.5 ${
                                  active ? "text-green-100" : "text-gray-500"
                                }`}
                              >
                                {filled}/{capacity} filled · {free} free
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </>
                ) : null}

                {/* ---------- VACANCY-ONLY FIELDS ---------- */}
                <Text className="text-gray-700 font-semibold mb-2">
                  Maximum Bid %
                </Text>
                <TextInput
                  placeholder="e.g. 30"
                  keyboardType="number-pad"
                  value={maxBidPercent}
                  onChangeText={setMaxBidPercent}
                  className="border border-gray-300 px-4 py-4 rounded-xl mb-4 bg-white"
                  placeholderTextColor="#9CA3AF"
                />

                <Text className="text-gray-700 font-semibold mb-2">Frequency</Text>
                <View className="flex-row mb-4">
                  {FREQUENCIES.map((f) => {
                    const active = frequency === f;

                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setFrequency(f)}
                        activeOpacity={0.85}
                        className={`flex-1 py-3 rounded-xl mr-2 border ${
                          active
                            ? "bg-[#024e32] border-[#024e32]"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            active ? "text-white" : "text-gray-700"
                          }`}
                        >
                          {f}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Subscription is READ from the chit scheme, never typed */}
                {selectedChit ? (
                  <View className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                    <Text className="text-gray-500 text-xs">
                      Subscription (from Chit Scheme, not editable)
                    </Text>
                    <Text className="text-[#024e32] text-xl font-bold mt-1">
                      {formatAmount(previewSubscription())}
                    </Text>
                    {selectedGroup ? (
                      <Text className="text-gray-500 text-xs mt-2">
                        Group capacity {selectedGroup.totalCollections} ·{" "}
                        {selectedGroup.members?.length || 0} members ·{" "}
                        <Text className="text-[#024e32] font-semibold">
                          {selectedGroupSeats} seats free
                        </Text>
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                <Text className="text-gray-700 font-semibold mb-2">
                  Vacancy Details{" "}
                  <Text className="text-gray-400 text-xs">(optional)</Text>
                </Text>
                <TextInput
                  placeholder="Anything the member should know"
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  className="border border-gray-300 px-4 py-4 rounded-xl mb-4 bg-white min-h-[70px]"
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />

                <Text className="text-gray-700 font-semibold mb-2">Status</Text>
                <View className="flex-row mb-5">
                  {(["Open", "Closed"] as const).map((s) => {
                    const active = status === s;

                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setStatus(s)}
                        activeOpacity={0.85}
                        className={`flex-1 py-3 rounded-xl mr-2 border ${
                          active
                            ? s === "Open"
                              ? "bg-[#024e32] border-[#024e32]"
                              : "bg-gray-700 border-gray-700"
                            : "bg-white border-gray-300"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            active ? "text-white" : "text-gray-700"
                          }`}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View className="flex-row">
                  <TouchableOpacity
                    onPress={resetForm}
                    className="flex-1 bg-gray-200 py-3.5 rounded-xl mr-2"
                    activeOpacity={0.8}
                  >
                    <Text className="text-gray-700 text-center font-semibold">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handlePublish}
                    disabled={saving}
                    className={`flex-1 py-3.5 rounded-xl ml-2 ${
                      saving ? "bg-gray-400" : "bg-[#024e32]"
                    }`}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text className="text-white text-center font-semibold">
                        Publish Vacancy
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ===============================================
                PUBLISHED VACANCIES
            =============================================== */}
            <Text className="text-lg font-semibold text-gray-800 mb-3">
              Published Vacancies ({vacancies.length})
            </Text>

            {vacancies.length === 0 ? (
              <View className="py-10 items-center bg-gray-50 rounded-2xl border border-gray-200">
                <MaterialIcons name="event-seat" size={50} color="#ccc" />
                <Text className="text-gray-500 mt-3">
                  No vacancies published yet
                </Text>
              </View>
            ) : (
              vacancies.map((v) => {
                const full = v.availableSeats <= 0;

                return (
                  <View
                    key={v._id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 shadow-sm"
                  >
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-2xl font-bold text-[#024e32]">
                          {formatAmount(v.chitAmount)}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-0.5">
                          Chit {v.chitId} · Group {v.groupId}
                        </Text>
                      </View>

                      <View
                        className={`px-3 py-1 rounded-full ${
                          v.status === "Open" ? "bg-green-100" : "bg-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            v.status === "Open" ? "text-green-800" : "text-gray-700"
                          }`}
                        >
                          {v.status}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 border-t border-gray-100 pt-3">
                      <Row label="Max Bid %" value={`${v.maxBidPercent}%`} />
                      <Row label="Frequency" value={v.frequency} />
                      <Row
                        label="Subscription"
                        value={formatAmount(v.subscriptionAmount)}
                      />
                      <Row label="Duration" value={`${v.durationMonths} months`} />
                      <Row
                        label="Group capacity"
                        value={`${v.filledSeats}/${v.capacity} filled`}
                      />
                    </View>

                    <View
                      className={`mt-3 rounded-xl py-2.5 ${
                        full ? "bg-red-50" : "bg-[#eaf4ef]"
                      }`}
                    >
                      <Text
                        className={`text-center font-bold ${
                          full ? "text-red-700" : "text-[#024e32]"
                        }`}
                      >
                        {full
                          ? "Group full · 0 seats"
                          : `${v.availableSeats} seat${
                              v.availableSeats === 1 ? "" : "s"
                            } available`}
                      </Text>
                    </View>

                    {v.details ? (
                      <Text className="text-gray-600 text-sm mt-3">{v.details}</Text>
                    ) : null}

                    <View className="flex-row mt-4">
                      <TouchableOpacity
                        onPress={() =>
                          router.push(`/admin/groupMembers?groupId=${v.groupId}`)
                        }
                        className="flex-1 bg-gray-100 py-3 rounded-xl mr-2"
                        activeOpacity={0.8}
                      >
                        <Text className="text-gray-700 text-center font-semibold text-sm">
                          Members
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => openEdit(v)}
                        className="flex-1 bg-[#024e32] py-3 rounded-xl mr-2"
                        activeOpacity={0.85}
                      >
                        <Text className="text-white text-center font-semibold text-sm">
                          Edit
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setDeleteTarget(v)}
                        className="flex-1 bg-red-600 py-3 rounded-xl"
                        activeOpacity={0.85}
                      >
                        <Text className="text-white text-center font-semibold text-sm">
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}

            {/* FOOTER */}
            <View className="mt-8 mb-6">
              <View className="border-t border-gray-200 pt-4 items-center">
                <Text className="text-[#024e32] font-bold text-base">
                  MANIKYA CHITS PVT LTD
                </Text>
                <Text className="text-gray-500 text-xs mt-1">Vacancies</Text>
                <Text className="text-gray-400 text-xs mt-1 text-center">
                  © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights
                  reserved.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ================= CONFIRM PUBLISH MODAL ================= */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <View className="items-center mb-4">
              <View className="bg-[#024e32]/10 p-3 rounded-full">
                <MaterialIcons name="event-seat" size={46} color="#024e32" />
              </View>
              <Text className="text-xl font-bold text-gray-800 mt-3">
                Confirm Vacancy
              </Text>
            </View>

            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <Row label="Chit" value={`${selectedChitId}`} />
              <Row
                label="Chit Amount"
                value={formatAmount(selectedChit?.chitAmount)}
              />
              <Row label="Group" value={`${selectedGroupId}`} />
              <Row label="Max Bid %" value={`${maxBidPercent}%`} />
              <Row label="Frequency" value={frequency} />
              <Row
                label="Subscription"
                value={formatAmount(previewSubscription())}
              />
              <Row label="Seats free now" value={`${selectedGroupSeats}`} />
              <Row label="Status" value={status} />
            </View>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setConfirmVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl mr-2"
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={publishVacancy}
                className="flex-1 bg-[#024e32] py-3 rounded-xl ml-2"
              >
                <Text className="text-white text-center font-semibold">
                  Publish
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= EDIT MODAL ================= */}
      <Modal visible={!!editTarget} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <Text className="text-xl font-bold text-gray-800 mb-1">
              Edit Vacancy
            </Text>
            <Text className="text-gray-500 text-xs mb-4">
              Chit {editTarget?.chitId} · Group {editTarget?.groupId}
            </Text>

            <Text className="text-gray-700 font-semibold mb-2">Maximum Bid %</Text>
            <TextInput
              keyboardType="number-pad"
              value={editMaxBid}
              onChangeText={setEditMaxBid}
              className="border border-gray-300 px-4 py-3.5 rounded-xl mb-4 bg-gray-50"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-700 font-semibold mb-2">Frequency</Text>
            <View className="flex-row mb-4">
              {FREQUENCIES.map((f) => {
                const active = editFrequency === f;

                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setEditFrequency(f)}
                    className={`flex-1 py-3 rounded-xl mr-2 border ${
                      active
                        ? "bg-[#024e32] border-[#024e32]"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        active ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-gray-700 font-semibold mb-2">Details</Text>
            <TextInput
              value={editDetails}
              onChangeText={setEditDetails}
              multiline
              className="border border-gray-300 px-4 py-3.5 rounded-xl mb-4 bg-gray-50 min-h-[60px]"
              textAlignVertical="top"
              placeholderTextColor="#9CA3AF"
            />

            <Text className="text-gray-700 font-semibold mb-2">Status</Text>
            <View className="flex-row mb-5">
              {(["Open", "Closed"] as const).map((s) => {
                const active = editStatus === s;

                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setEditStatus(s)}
                    className={`flex-1 py-3 rounded-xl mr-2 border ${
                      active
                        ? s === "Open"
                          ? "bg-[#024e32] border-[#024e32]"
                          : "bg-gray-700 border-gray-700"
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        active ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setEditTarget(null)}
                className="flex-1 bg-gray-200 py-3 rounded-xl mr-2"
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveEdit}
                className="flex-1 bg-[#024e32] py-3 rounded-xl ml-2"
              >
                <Text className="text-white text-center font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= DELETE MODAL ================= */}
      <Modal visible={!!deleteTarget} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <View className="items-center mb-4">
              <View className="bg-red-100 p-3 rounded-full">
                <MaterialIcons name="warning" size={46} color="#dc2626" />
              </View>
              <Text className="text-xl font-bold text-gray-800 mt-3">
                Delete Vacancy
              </Text>
            </View>

            <Text className="text-gray-600 text-center mb-2">
              Remove the vacancy for group{" "}
              <Text className="font-bold text-[#024e32]">
                {deleteTarget?.groupId}
              </Text>
              ?
            </Text>

            <Text className="text-gray-500 text-xs text-center mb-6">
              The chit, the group and all group members stay untouched. Only the
              vacancy and its subscription requests are removed.
            </Text>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => setDeleteTarget(null)}
                className="flex-1 bg-gray-200 py-3 rounded-xl mr-2"
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmDelete}
                className="flex-1 bg-red-600 py-3 rounded-xl ml-2"
              >
                <Text className="text-white text-center font-semibold">
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ================= SMALL ROW ================= */
function Row({ label, value }: { label: string; value: any }) {
  return (
    <View className="flex-row justify-between items-center py-1.5">
      <Text className="text-gray-600">{label}</Text>
      <Text className="text-gray-900 font-semibold">{value}</Text>
    </View>
  );
}
