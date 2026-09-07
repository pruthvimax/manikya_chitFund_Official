import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  ScrollView,
  Animated,
  ActivityIndicator,
  Platform,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import BACKEND_URL from "../../config";

export default function AdminNotification() {
  const router = useRouter();

  const [groups, setGroups] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [groupId, setGroupId] = useState("");
  const [auctionEndDate, setAuctionDate] = useState("");
  const [auctionEndTime, setAuctionEndTime] = useState("");
  const [minBidAmount, setMinBidAmount] = useState("");
  const [maxBidAmount, setMaxBidAmount] = useState("");
  const [message, setMessage] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // =========================================================
  // WINNER DETAILS STATE (Admin manually enters)
  // =========================================================

  const [winnerName, setWinnerName] = useState("");
  const [winnerGroupId, setWinnerGroupId] = useState("");
  const [winnerBidAmount, setWinnerBidAmount] = useState("");

  // =========================================================
  // SEARCHABLE DROPDOWN STATE
  // =========================================================

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupLabel, setSelectedGroupLabel] = useState("Choose a group");

  // =========================================================
  // SEARCH CREATED AUCTIONS BY GROUP ID
  // =========================================================

  const [notificationSearch, setNotificationSearch] = useState("");

  const filteredNotifications = notifications.filter((n: any) => {
    const query = notificationSearch.trim().toLowerCase();

    if (!query) return true;

    const gid = String(n.groupId?.groupId || "").toLowerCase();
    const gname = String(n.groupId?.groupName || "").toLowerCase();
    const endDate = String(n.auctionEndDate || "").toLowerCase();
    const endTime = String(n.auctionEndTime || "").toLowerCase();
    const winner = String(n.winnerName || "").toLowerCase();

    return (
      gid.includes(query) ||
      gname.includes(query) ||
      endDate.includes(query) ||
      endTime.includes(query) ||
      winner.includes(query)
    );
  });

  const filteredGroups = groups.filter((g: any) => {
    const searchLower = searchQuery.toLowerCase();
    const groupIdMatch = g.groupId?.toLowerCase().includes(searchLower) || false;
    const groupNameMatch = g.groupName?.toLowerCase().includes(searchLower) || false;
    return groupIdMatch || groupNameMatch;
  });

  // =========================================================
  // DATE PICKER STATE
  // =========================================================

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  // =========================================================
  // TIME PICKER STATE - End Time (for countdown)
  // =========================================================

  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempEndTime, setTempEndTime] = useState(new Date());

  // =========================================================
  // LOADING STATE
  // =========================================================

  const [loading, setLoading] = useState(true);

  // =========================================================
  // CUSTOM POPUP MODAL STATE
  // =========================================================

  const [popupVisible, setPopupVisible] = useState(false);
  const [popupType, setPopupType] = useState<"success" | "error" | "info" | "warning" | "confirm">("success");
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIcon, setPopupIcon] = useState("check-circle");
  const [popupIconColor, setPopupIconColor] = useState("#22c55e");
  const [popupConfirmText, setPopupConfirmText] = useState("Confirm");
  const [popupCancelText, setPopupCancelText] = useState("Cancel");
  const [popupOnConfirm, setPopupOnConfirm] = useState<(() => void) | null>(null);
  const [popupOnCancel, setPopupOnCancel] = useState<(() => void) | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // =========================================================
  // ADD WINNER MODAL STATE
  // =========================================================

  const [winnerModalVisible, setWinnerModalVisible] = useState(false);
  const [winnerModalNotif, setWinnerModalNotif] = useState<any>(null);
  const [modalWinnerName, setModalWinnerName] = useState("");
  const [modalWinnerId, setModalWinnerId] = useState("");
  const [modalWinnerGroupId, setModalWinnerGroupId] = useState("");
  const [modalWinnerBidAmount, setModalWinnerBidAmount] = useState("");
  const [savingWinner, setSavingWinner] = useState(false);
  const [modalHighestBid, setModalHighestBid] = useState(0);
  const [winnerGroupLabel, setWinnerGroupLabel] = useState("Choose a group");

  // Which screen the searchable dropdown edits:
  // "form" = add/edit notification form, "winner" = add winner modal
  const [dropdownTarget, setDropdownTarget] = useState<"form" | "winner">("form");

  // =========================================================
  // SKELETON ANIMATION
  // =========================================================

  const skeletonOpacity = useRef(
    new Animated.Value(0.5)
  ).current;

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

    return () => {
      animation.stop();
    };
  }, [skeletonOpacity]);

  /* ================= LOAD GROUPS ================= */

  const loadGroups = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/admin/all`
      );

      const data = await res.json();

      setGroups(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.log("Group load error:", err);
    }
  };

  /* ================= LOAD NOTIFICATIONS ================= */

  const loadNotifications = async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/notifications`
      );

      const data = await res.json();

      setNotifications(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.log("Notification load error:", err);
    }
  };

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);

      try {
        await Promise.all([
          loadGroups(),
          loadNotifications(),
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, []);

  /* ================= SHOW CUSTOM POPUP ================= */

  const showPopup = (
    type: "success" | "error" | "info" | "warning" | "confirm",
    title: string,
    message: string,
    onConfirm?: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    const configs = {
      success: {
        icon: "check-circle",
        iconColor: "#22c55e",
        confirmText: "OK",
        cancelText: "",
      },
      error: {
        icon: "error",
        iconColor: "#ef4444",
        confirmText: "OK",
        cancelText: "",
      },
      info: {
        icon: "info",
        iconColor: "#3b82f6",
        confirmText: "Got it",
        cancelText: "",
      },
      warning: {
        icon: "warning",
        iconColor: "#f59e0b",
        confirmText: "I understand",
        cancelText: "",
      },
      confirm: {
        icon: "help",
        iconColor: "#024e32",
        confirmText: confirmText || "Confirm",
        cancelText: cancelText || "Cancel",
      },
    };

    const config = configs[type];
    setPopupType(type);
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupIcon(config.icon);
    setPopupIconColor(config.iconColor);
    setPopupConfirmText(config.confirmText);
    setPopupCancelText(config.cancelText || "");
    setPopupOnConfirm(() => onConfirm || null);
    setPopupOnCancel(() => onCancel || null);
    setPopupVisible(true);
  };

  /* ================= SAVE ================= */

 const saveNotification = async () => {
  if (
    !groupId ||
    !auctionEndDate ||
    !auctionEndTime ||
    !minBidAmount ||
    !maxBidAmount ||
    !message.trim()
  ) {
    showPopup(
      "warning",
      "⚠️ Missing Fields",
      "Please fill in all required fields including Start Bid, End Bid, End Date, End Time and Message."
    );

    return;
  }

  const minBid = Number(minBidAmount);
  const maxBid = Number(maxBidAmount);

  if (!Number.isFinite(minBid) || !Number.isFinite(maxBid) || minBid <= 0 || maxBid <= 0) {
    showPopup("warning", "⚠️ Invalid Bid Limit", "Please enter valid bid amounts greater than 0.");
    return;
  }

  if (minBid > maxBid) {
    showPopup("warning", "⚠️ Invalid Bid Range", "Start Bid cannot be greater than End Bid.");
    return;
  }

  showPopup(
    "confirm",
    editId
      ? "✏️ Confirm Update"
      : "📝 Confirm Add",
    `Are you sure you want to ${
      editId ? "update" : "add"
    } this notification?\n\n` +
      `Group: ${selectedGroupLabel}\n` +
      `End Date: ${auctionEndDate}\n` +
      `End Time: ${auctionEndTime}\n` +
      `Message: ${message.trim()}`,

    async () => {
      try {
        setPopupVisible(false);

        const payload = {
          groupId,
          auctionEndDate,
          auctionEndTime,
          minBidAmount: minBid,
          maxBidAmount: maxBid,
          message: message.trim(),
          winnerName: winnerName.trim(),
          winnerGroupId: winnerGroupId.trim(),
          winnerBidAmount: winnerBidAmount ? Number(winnerBidAmount) : 0,
        };

        console.log(
          "========== NOTIFICATION SAVE =========="
        );

        console.log(
          "MODE:",
          editId ? "UPDATE" : "ADD"
        );

        console.log(
          "PAYLOAD:",
          JSON.stringify(payload, null, 2)
        );

        const url = editId
          ? `${BACKEND_URL}/notifications/${editId}`
          : `${BACKEND_URL}/notifications`;

        const method = editId
          ? "PUT"
          : "POST";

        console.log(
          "URL:",
          url
        );

        const response = await fetch(
          url,
          {
            method,
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(payload),
          }
        );

        const rawResponse =
          await response.text();

        console.log(
          "RESPONSE STATUS:",
          response.status
        );

        console.log(
          "RESPONSE:",
          rawResponse
        );

        let data: any = {};

        try {
          data = rawResponse
            ? JSON.parse(rawResponse)
            : {};
        } catch {
          console.log(
            "❌ Invalid JSON response"
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              `Server returned ${response.status}`
          );
        }

        // Clear form
        setEditId(null);
        setGroupId("");
        setAuctionDate("");
        setAuctionEndTime("");
        setMinBidAmount("");
        setMaxBidAmount("");
        setMessage("");
        setWinnerName("");
        setWinnerGroupId("");
        setWinnerBidAmount("");
        setSelectedGroupLabel(
          "Choose a group"
        );

        // Reload list
        await loadNotifications();

        showPopup(
          "success",
          editId
            ? "✅ Notification Updated!"
            : "✅ Notification Added!",
          editId
            ? "The notification has been updated successfully."
            : "New auction notification has been added successfully."
        );

      } catch (err: any) {
        console.error(
          "❌ SAVE NOTIFICATION ERROR:",
          err
        );

        showPopup(
          "error",
          "❌ Failed to Save",
          err?.message ||
            "Unable to save notification. Please try again."
        );
      }
    },

    () => {
      setPopupVisible(false);
    },

    editId
      ? "Update"
      : "Add",

    "Cancel"
  );
};

  /* ================= DELETE ================= */

 const handleDeleteClick = (id: string) => {
  console.log("🗑️ DELETE CLICKED:", id);

  showPopup(
    "confirm",
    "🗑️ Delete Notification",
    "Are you sure you want to delete this notification?\n\nThis action cannot be undone.",
    async () => {
      try {
        console.log(
          "🗑️ DELETE REQUEST:",
          `${BACKEND_URL}/notifications/${id}`
        );

        // Close confirmation popup immediately
        setPopupVisible(false);

        const response = await fetch(
          `${BACKEND_URL}/notifications/${id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const rawResponse = await response.text();

        console.log(
          "🗑️ DELETE STATUS:",
          response.status
        );

        console.log(
          "🗑️ DELETE RESPONSE:",
          rawResponse
        );

        let data: any = {};

        try {
          data = rawResponse
            ? JSON.parse(rawResponse)
            : {};
        } catch {
          console.log(
            "❌ Delete returned non-JSON response"
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              `Delete failed with status ${response.status}`
          );
        }

        // Remove immediately from screen
        setNotifications((prev) =>
          prev.filter(
            (notification) =>
              notification._id !== id
          )
        );

        setPendingDeleteId(null);

        showPopup(
          "success",
          "✅ Notification Deleted!",
          "The notification has been removed successfully."
        );

        // Reload from backend
        await loadNotifications();

      } catch (err: any) {
        console.error(
          "❌ DELETE NOTIFICATION ERROR:",
          err
        );

        setPendingDeleteId(null);

        showPopup(
          "error",
          "❌ Failed to Delete",
          err?.message ||
            "Unable to delete notification. Please try again."
        );
      }
    },
    () => {
      console.log(
        "Delete cancelled"
      );

      setPopupVisible(false);
      setPendingDeleteId(null);
    },
    "Delete",
    "Cancel"
  );
};

  /* ================= FORMAT AMOUNT ================= */

  const formatAmount = (amount: number) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  /* =========================================================
     OPEN ADD WINNER MODAL FOR A NOTIFICATION
  ========================================================= */

const openWinnerModal = async (item: any) => {
  setWinnerModalNotif(item);

  setModalWinnerName(item.winnerName || "");
  setModalWinnerId(item.winnerId || "");

  // IMPORTANT:
  // winnerGroupId now stores the EXACT groupMemberId
  // such as M01, M02, M03...
  setModalWinnerGroupId(item.winnerGroupId || "");

  setModalWinnerBidAmount(
    item.winnerBidAmount
      ? String(item.winnerBidAmount)
      : ""
  );

  setWinnerGroupLabel(
    `Group ${item.groupId?.groupId || ""}`
  );

  setWinnerModalVisible(true);

  // Fetch bids so we can identify the exact groupMemberId
  setModalHighestBid(0);

  const gid = item.groupId?._id || "";

  if (gid) {
    try {
      /*
        AUCTION IDENTITY:
        groupId + auctionDate + auctionTime

        Without the auction date/time the backend would return the
        bids of every auction of this group.
      */
      const auctionDate = String(
        item.auctionEndDate || ""
      ).trim();

      const auctionTime = String(
        item.auctionEndTime || ""
      ).trim();

      const response = await fetch(
        `${BACKEND_URL}/bids/live?groupId=${encodeURIComponent(gid)}` +
          `&auctionDate=${encodeURIComponent(auctionDate)}` +
          `&auctionTime=${encodeURIComponent(auctionTime)}`
      );

      const data = await response.json();

      const bids = Array.isArray(data)
        ? data
        : Array.isArray(data?.bids)
        ? data.bids
        : [];

      // Highest bid
      const highest = bids.reduce(
        (best: any, bid: any) => {
          if (
            !best ||
            Number(bid.bidAmount || 0) >
              Number(best.bidAmount || 0)
          ) {
            return bid;
          }

          return best;
        },
        null
      );

      if (highest) {
        setModalHighestBid(
          Number(highest.bidAmount || 0)
        );

        /*
          If admin has already entered a winner memberId,
          find that EXACT member's bid and get its
          groupMemberId.
        */
        const selectedWinnerBid =
          bids.find(
            (bid: any) =>
              String(bid.memberId) ===
              String(item.winnerId)
          );

        if (selectedWinnerBid?.groupMemberId) {
          setModalWinnerGroupId(
            String(
              selectedWinnerBid.groupMemberId
            )
          );
        }
      }
    } catch (error) {
      console.log(
        "❌ Failed to load winner bids:",
        error
      );

      setModalHighestBid(0);
    }
  }
};

  /* =========================================================
     SAVE WINNER DETAILS (PUT to backend)
  ========================================================= */

  const saveWinnerDetails = async () => {
    if (!winnerModalNotif) return;

    if (!modalWinnerName.trim()) {
      showPopup("warning", "⚠️ Missing Field", "Please enter the winner name.");
      return;
    }

    // Hide the winner modal first so the confirmation popup shows on top
    setWinnerModalVisible(false);

    showPopup(
      "confirm",
      "🏆 Confirm Winner",
      `Are you sure you want to save the winner for Group ${winnerModalNotif.groupId?.groupId}?\n\n` +
        `Name: ${modalWinnerName.trim()}\n` +
        (modalWinnerGroupId.trim() ? `Group ID: ${modalWinnerGroupId.trim()}\n` : "") +
        (modalWinnerBidAmount ? `Bid Amount: ₹${Number(modalWinnerBidAmount).toLocaleString("en-IN")}` : ""),
      async () => {
        try {
          setPopupVisible(false);
          setSavingWinner(true);

          const response = await fetch(
            `${BACKEND_URL}/notifications/${winnerModalNotif._id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                groupId: winnerModalNotif.groupId?._id || winnerModalNotif.groupId,
                auctionEndDate: winnerModalNotif.auctionEndDate,
                auctionEndTime: winnerModalNotif.auctionEndTime,
                minBidAmount: Number(winnerModalNotif.minBidAmount || 0),
                maxBidAmount: Number(winnerModalNotif.maxBidAmount || 0),
                message: winnerModalNotif.message,
                status: winnerModalNotif.status,
                winnerName: modalWinnerName.trim(),
                winnerId: modalWinnerId.trim(),
                winnerGroupId: modalWinnerGroupId.trim(),
                winnerBidAmount: modalWinnerBidAmount ? Number(modalWinnerBidAmount) : 0,
              }),
            }
          );

          if (!response.ok) {
            let data: any = {};
            try { data = await response.json(); } catch {}
            throw new Error(data?.message || `Server returned ${response.status}`);
          }

          setWinnerModalVisible(false);
          await loadNotifications();

          showPopup(
            "success",
            "✅ Winner Saved!",
            "The winner details have been added successfully and are now visible to members."
          );
        } catch (err: any) {
          console.error("❌ SAVE WINNER ERROR:", err);
          showPopup(
            "error",
            "❌ Failed to Save Winner",
            err?.message || "Unable to save winner details. Please try again."
          );
        } finally {
          setSavingWinner(false);
        }
      },
      () => {
        setPopupVisible(false);
        setWinnerModalVisible(true);
      },
      "Save Winner",
      "Cancel"
    );
  };


  /* =========================================================
   DELETE WINNER ONLY
   Keeps the auction notification
========================================================= */

const handleDeleteWinner = (item: any) => {
  if (!item?._id || !item?.winnerName) return;

  showPopup(
    "confirm",
    "🗑️ Delete Winner",
    `Are you sure you want to remove the winner?\n\n` +
      `Winner: ${item.winnerName}\n` +
      `Group: ${item.winnerGroupId || "N/A"}\n\n` +
      `The auction notification will NOT be deleted.`,
    async () => {
      try {
        setPopupVisible(false);

        const response = await fetch(
          `${BACKEND_URL}/notifications/${item._id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              groupId: item.groupId?._id || item.groupId,
              auctionEndDate: item.auctionEndDate,
              auctionEndTime: item.auctionEndTime,
              minBidAmount: Number(item.minBidAmount || 0),
              maxBidAmount: Number(item.maxBidAmount || 0),
              message: item.message,
              status: item.status,

              // CLEAR WINNER ONLY
              winnerName: "",
              winnerId: "",
              winnerGroupId: "",
              winnerBidAmount: 0,
            }),
          }
        );

        const rawResponse = await response.text();

        let data: any = {};

        try {
          data = rawResponse ? JSON.parse(rawResponse) : {};
        } catch {
          console.log("Delete winner returned non-JSON response");
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              `Server returned ${response.status}`
          );
        }

        // Update screen immediately
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === item._id
              ? {
                  ...notification,
                  winnerName: "",
                  winnerId: "",
                  winnerGroupId: "",
                  winnerBidAmount: 0,
                }
              : notification
          )
        );

        showPopup(
          "success",
          "✅ Winner Deleted!",
          "Winner details have been removed successfully. The auction notification is still available."
        );

        // Reload from backend
        await loadNotifications();

      } catch (err: any) {
        console.error("❌ DELETE WINNER ERROR:", err);

        showPopup(
          "error",
          "❌ Failed to Delete Winner",
          err?.message ||
            "Unable to delete winner details. Please try again."
        );
      }
    },
    () => {
      setPopupVisible(false);
    },
    "Delete Winner",
    "Cancel"
  );
};
  /* =========================================================
     RENDER ADD WINNER MODAL
  ========================================================= */

  const renderWinnerModal = () => (
    <Modal
      visible={winnerModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setWinnerModalVisible(false)}
    >
      <View className="flex-1 justify-center items-center bg-black/60 px-4">
        <View className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
          
          {/* HEADER */}
          <View className="flex-row items-center mb-4">
            <View className="w-11 h-11 rounded-full bg-amber-100 items-center justify-center mr-3">
              <MaterialIcons name="emoji-events" size={24} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-800">Add Winner</Text>
              <Text className="text-gray-500 text-sm">
                Group: {winnerModalNotif?.groupId?.groupId || "N/A"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setWinnerModalVisible(false)}
              className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center"
            >
              <MaterialIcons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* WINNER NAME */}
          <Text className="text-gray-700 font-medium mb-2">Winner Name *</Text>
          <TextInput
            placeholder="Enter winner member name..."
            value={modalWinnerName}
            onChangeText={setModalWinnerName}
            className="border border-gray-300 px-4 py-3 rounded-xl bg-white text-gray-800 mb-4"
          />

          {/* WINNER MEMBER ID */}
          <Text className="text-gray-700 font-medium mb-2">Member ID</Text>
          <TextInput
            placeholder="Enter winner member ID..."
            value={modalWinnerId}
            onChangeText={setModalWinnerId}
            autoCapitalize="none"
            className="border border-gray-300 px-4 py-3 rounded-xl bg-white text-gray-800 mb-4"
          />

          {/* WINNER GROUP (taken automatically from this notification) */}
          {/* WINNER GROUP MEMBER ID */}
<Text className="text-gray-700 font-medium mb-2">
  Winner Group Member ID
</Text>

<TextInput
  placeholder="Enter Group Member ID (e.g. M02)..."
  value={modalWinnerGroupId}
  onChangeText={setModalWinnerGroupId}
  autoCapitalize="characters"
  className="border border-gray-300 px-4 py-3 rounded-xl bg-white text-gray-800 mb-4"
/>
          <View className="border border-gray-300 px-4 py-3 rounded-xl bg-gray-50 flex-row items-center mb-4">
            <MaterialIcons name="group" size={20} color="#6b7280" />
            <Text className="ml-2 text-gray-800 font-semibold">
              {winnerModalNotif?.groupId?.groupId || "N/A"}
            </Text>
          </View>

          {/* HIGHEST BID AMOUNT (live from bids) */}
          <Text className="text-gray-700 font-medium mb-2">Highest Bid Amount</Text>
          <View className="bg-[#024e32]/5 rounded-xl px-4 py-3 mb-4 border border-[#024e32]/10 flex-row items-center justify-between">
            <Text className="text-gray-600 text-sm">Current Highest Bid</Text>
            <Text className="text-[#024e32] font-bold text-base">
              {modalHighestBid > 0 ? formatAmount(modalHighestBid) : "No bids yet"}
            </Text>
          </View>

          {/* WINNER BID AMOUNT */}
          <Text className="text-gray-700 font-medium mb-2">Winning Bid Amount</Text>
          <View className="flex-row items-center border border-gray-300 rounded-xl bg-white px-4 mb-6">
            <Text className="text-[#024e32] text-lg font-bold mr-2">₹</Text>
            <TextInput
              placeholder="Enter winning bid amount..."
              value={modalWinnerBidAmount}
              onChangeText={(text) => setModalWinnerBidAmount(text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              className="flex-1 py-3 text-gray-800"
            />
          </View>

          {/* BUTTONS */}
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => setWinnerModalVisible(false)}
              className="flex-1 py-3 rounded-xl bg-gray-200"
              activeOpacity={0.8}
            >
              <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveWinnerDetails}
              disabled={savingWinner}
              className="flex-1 py-3 rounded-xl bg-[#024e32]"
              activeOpacity={0.8}
            >
              <Text className="text-white text-center font-semibold">
                {savingWinner ? "Saving..." : "Save Winner"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  /* =========================================================
     SKELETON COMPONENT - SMALLER
  ========================================================= */

  const NotificationSkeleton = () => {
    return (
      <Animated.View
        style={{
          opacity: skeletonOpacity,
        }}
        className="mx-5"
      >

        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-100">

          <View className="h-5 w-40 bg-gray-200 rounded-md mb-4" />

          <View className="h-3 w-20 bg-gray-200 rounded-md mb-1.5" />
          <View className="h-10 w-full bg-gray-200 rounded-xl mb-3" />

          <View className="h-3 w-20 bg-gray-200 rounded-md mb-1.5" />
          <View className="h-10 w-full bg-gray-200 rounded-xl mb-3" />

          <View className="h-3 w-20 bg-gray-200 rounded-md mb-1.5" />
          <View className="h-10 w-full bg-gray-200 rounded-xl mb-3" />

          <View className="h-3 w-16 bg-gray-200 rounded-md mb-1.5" />
          <View className="h-20 w-full bg-gray-200 rounded-xl mb-5" />

          <View className="h-10 w-full bg-gray-200 rounded-xl" />

        </View>

        <View className="flex-row justify-between items-center mb-3">
          <View className="h-4 w-36 bg-gray-200 rounded-md" />
          <View className="h-6 w-16 bg-gray-200 rounded-lg" />
        </View>

        <NotificationCardSkeleton />
        <NotificationCardSkeleton />
        <NotificationCardSkeleton />

      </Animated.View>
    );
  };

  /* =========================================================
     NOTIFICATION CARD SKELETON - SMALLER
  ========================================================= */

  const NotificationCardSkeleton = () => {
    return (
      <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
        <View className="flex-row items-center mb-3">
          <View className="w-8 h-8 rounded-full bg-gray-200 mr-3" />
          <View className="flex-1">
            <View className="h-4 w-28 bg-gray-200 rounded-md" />
            <View className="h-3 w-24 bg-gray-200 rounded-md mt-1" />
          </View>
        </View>

        <View className="flex-row items-center mb-2">
          <View className="w-4 h-4 bg-gray-200 rounded-full mr-3" />
          <View className="h-3 w-32 bg-gray-200 rounded-md" />
        </View>

        <View className="flex-row items-center mb-2">
          <View className="w-4 h-4 bg-gray-200 rounded-full mr-3" />
          <View className="h-3 w-28 bg-gray-200 rounded-md" />
        </View>

        <View className="flex-row items-start mb-3">
          <View className="w-4 h-4 bg-gray-200 rounded-full mr-3" />
          <View className="flex-1">
            <View className="h-3 w-full bg-gray-200 rounded-md" />
            <View className="h-3 w-4/5 bg-gray-200 rounded-md mt-1.5" />
          </View>
        </View>

        <View className="flex-row justify-end">
          <View className="h-7 w-14 bg-gray-200 rounded-lg mr-2" />
          <View className="h-7 w-14 bg-gray-200 rounded-lg" />
        </View>
      </View>
    );
  };

  /* =========================================================
     FOOTER - SMALLER
  ========================================================= */

  const Footer = () => {
    return (
      <View className="mt-4 mb-4 px-5">
        <View className="border-t border-gray-200 pt-3 items-center">
          <Text className="text-[#024e32] font-bold text-sm">
            MANIKYA CHITS PVT LTD
          </Text>
          <Text className="text-gray-500 text-[10px] mt-1 text-center">
            Auction Notifications
          </Text>
          <Text className="text-gray-400 text-[10px] mt-1 text-center">
            © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
          </Text>
        </View>
      </View>
    );
  };

  /* =========================================================
     DATE PICKER HANDLERS
  ========================================================= */

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedDate) {
      setTempDate(selectedDate);
      const day = String(selectedDate.getDate()).padStart(2, "0");
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const year = selectedDate.getFullYear();
      setAuctionDate(`${day}-${month}-${year}`);
    }
  };

const handleWebDateChange = (
  e: React.ChangeEvent<HTMLInputElement>
) => {
  const dateValue = e.target.value;

  if (!dateValue) {
    return;
  }

  // HTML date input gives YYYY-MM-DD.
  // Parse manually to avoid timezone issues.
  const parts = dateValue.split("-");

  if (parts.length !== 3) {
    return;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return;
  }

  const selectedDate =
    new Date(
      year,
      month - 1,
      day
    );

  setTempDate(selectedDate);

  const formattedDay =
    String(day).padStart(2, "0");

  const formattedMonth =
    String(month).padStart(2, "0");

  setAuctionDate(
    `${formattedDay}-${formattedMonth}-${year}`
  );

  console.log(
    "📅 Selected auction end date:",
    `${formattedDay}-${formattedMonth}-${year}`
  );
};

  const openDatePicker = () => {
    if (auctionEndDate) {
      const parts = auctionEndDate.split("-");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          setTempDate(new Date(year, month, day));
        }
      }
    }
    setShowDatePicker(true);
  };

  /* =========================================================
     END TIME PICKER HANDLERS (for countdown)
  ========================================================= */

  const handleEndTimeChange = (event: any, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowEndTimePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (selectedTime) {
      setTempEndTime(selectedTime);
      const hours = String(selectedTime.getHours()).padStart(2, "0");
      const minutes = String(selectedTime.getMinutes()).padStart(2, "0");
      setAuctionEndTime(`${hours}:${minutes}`);
    }
  };

  const handleWebEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeValue = e.target.value;
    if (timeValue) {
      const [hours, minutes] = timeValue.split(":");
      if (hours && minutes) {
        const date = new Date();
        date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        setTempEndTime(date);
        setAuctionEndTime(`${hours}:${minutes}`);
      }
    }
  };

  const openEndTimePicker = () => {
    if (auctionEndTime) {
      const parts = auctionEndTime.split(":");
      if (parts.length === 2) {
        const hours = parseInt(parts[0], 10);
        const minutes = parseInt(parts[1], 10);
        if (!isNaN(hours) && !isNaN(minutes)) {
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          setTempEndTime(date);
        }
      }
    }
    setShowEndTimePicker(true);
  };

  /* =========================================================
     SEARCHABLE DROPDOWN HANDLERS
  ========================================================= */

const handleSelectGroup = (group: any) => {
  setGroupId(group._id);
  setSelectedGroupLabel(`Group ${group.groupId}`);

  setDropdownVisible(false);
  setSearchQuery("");
};
  /* =========================================================
     RENDER SEARCHABLE DROPDOWN MODAL
  ========================================================= */

  const renderSearchableDropdown = () => (
    <Modal
      visible={dropdownVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setDropdownVisible(false);
        setSearchQuery("");
      }}
    >
      <View className="flex-1 bg-black/50 justify-center items-center px-4">
        <View className="bg-white rounded-2xl w-full max-w-md max-h-[80%] overflow-hidden shadow-2xl">
          
          <View className="bg-[#024e32] px-5 py-4 flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                setDropdownVisible(false);
                setSearchQuery("");
              }}
            >
              <MaterialIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold ml-3">Select Group</Text>
          </View>

          <View className="px-4 pt-4 pb-2 border-b border-gray-200">
            <View className="bg-gray-50 rounded-xl px-4 flex-row items-center border border-gray-200">
              <MaterialIcons name="search" size={22} color="#6b7280" />
              <TextInput
                placeholder="Search by Group ID or Name..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                className="flex-1 py-3 px-2 text-base"
                autoFocus={Platform.OS === "web" ? true : false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <MaterialIcons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
            <Text className="text-gray-400 text-xs mt-1 ml-1">
              {filteredGroups.length} groups found
            </Text>
          </View>

          <FlatList
            data={filteredGroups}
            keyExtractor={(item: any) => item._id}
            className="p-2"
            showsVerticalScrollIndicator={true}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                onPress={() => handleSelectGroup(item)}
                className={`px-4 py-3 rounded-xl mb-1 flex-row items-center ${
                  dropdownTarget === "winner"
                    ? modalWinnerGroupId === String(item.groupId)
                      ? "bg-[#024e32]/10"
                      : "bg-white"
                    : groupId === item._id
                    ? "bg-[#024e32]/10"
                    : "bg-white"
                }`}
                activeOpacity={0.7}
              >
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  dropdownTarget === "winner"
                    ? modalWinnerGroupId === String(item.groupId)
                      ? "bg-[#024e32]"
                      : "bg-gray-100"
                    : groupId === item._id
                    ? "bg-[#024e32]"
                    : "bg-gray-100"
                }`}>
                  <Text className={`font-bold ${
                    dropdownTarget === "winner"
                      ? modalWinnerGroupId === String(item.groupId)
                        ? "text-white"
                        : "text-[#024e32]"
                      : groupId === item._id
                      ? "text-white"
                      : "text-[#024e32]"
                  }`}>
                    {item.groupId?.charAt(0) || "G"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-base font-semibold ${
                    groupId === item._id ? "text-[#024e32]" : "text-gray-800"
                  }`}>
                    Group {item.groupId}
                  </Text>
                  {item.groupName && (
                    <Text className="text-gray-500 text-sm">
                      {item.groupName}
                    </Text>
                  )}
                </View>
                {(dropdownTarget === "winner"
                  ? modalWinnerGroupId === String(item.groupId)
                  : groupId === item._id) && (
                  <MaterialIcons name="check-circle" size={24} color="#024e32" />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View className="items-center py-8">
                <MaterialIcons name="search-off" size={50} color="#d1d5db" />
                <Text className="text-gray-500 text-lg mt-3">No groups found</Text>
                <Text className="text-gray-400 text-sm mt-1">
                  Try a different search term
                </Text>
              </View>
            )}
          />

          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={() => {
                setDropdownVisible(false);
                setSearchQuery("");
              }}
              className="bg-gray-200 py-3 rounded-xl"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 text-center font-semibold">
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  /* =========================================================
     RENDER CUSTOM POPUP MODAL - IMPROVED WITH CONFIRM/CANCEL
  ========================================================= */

  const renderPopup = () => {
    const isConfirm = popupType === "confirm";
    const isSuccess = popupType === "success";
    const isError = popupType === "error";
    const isWarning = popupType === "warning";
    const isInfo = popupType === "info";

    let bgColor = "#22c55e";
    let borderColor = "#22c55e";
    
    if (isSuccess) { bgColor = "#22c55e"; borderColor = "#22c55e"; }
    else if (isError) { bgColor = "#ef4444"; borderColor = "#ef4444"; }
    else if (isWarning) { bgColor = "#f59e0b"; borderColor = "#f59e0b"; }
    else if (isInfo) { bgColor = "#3b82f6"; borderColor = "#3b82f6"; }
    else if (isConfirm) { bgColor = "#024e32"; borderColor = "#024e32"; }

    return (
      <Modal
        visible={popupVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!isConfirm) {
            setPopupVisible(false);
          }
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/60 px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-l-4" style={{ borderLeftColor: borderColor }}>
            
            {/* Icon */}
            <View className="items-center mb-4">
              <View 
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: `${bgColor}15` }}
              >
                <MaterialIcons name={popupIcon as any} size={45} color={bgColor} />
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
              {popupTitle}
            </Text>

            {/* Message */}
            <Text className="text-gray-600 text-center text-base leading-6 mb-6 whitespace-pre-line">
              {popupMessage}
            </Text>

            {/* Buttons */}
            {isConfirm ? (
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={() => {
                    if (popupOnCancel) {
                      popupOnCancel();
                    } else {
                      setPopupVisible(false);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-xl bg-gray-200"
                  activeOpacity={0.8}
                >
                  <Text className="text-gray-700 text-center font-semibold text-base">
                    {popupCancelText || "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (popupOnConfirm) {
                      popupOnConfirm();
                    }
                  }}
                  className="flex-1 py-3.5 rounded-xl"
                  style={{ backgroundColor: bgColor }}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-center font-semibold text-base">
                    {popupConfirmText || "Confirm"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setPopupVisible(false)}
                className="py-3.5 rounded-xl"
                style={{ backgroundColor: bgColor }}
                activeOpacity={0.8}
              >
                <Text className="text-white text-center font-semibold text-base">
                  {popupConfirmText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  /* =========================================================
     RENDER DATE PICKER
  ========================================================= */

  const renderDatePicker = () => {
    if (Platform.OS === "web") {
      const dateValue = auctionEndDate ? auctionEndDate.split("-").reverse().join("-") : "";
      return (
        <View className="mt-2">
          <input
            type="date"
            value={dateValue}
            onChange={handleWebDateChange}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #d1d5db",
              fontSize: "16px",
              backgroundColor: "white",
              color: "#1f2937",
              outline: "none",
            }}
            onFocus={() => setShowDatePicker(false)}
          />
          <TouchableOpacity
            onPress={() => setShowDatePicker(false)}
            className="mt-2 bg-[#024e32] py-2 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (showDatePicker) {
      return (
        <View className="mt-2">
          {Platform.OS === "ios" ? (
            <View className="bg-white rounded-xl border border-gray-200 p-2">
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
              />
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className="bg-[#024e32] py-2 rounded-lg mt-2"
              >
                <Text className="text-white text-center font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
            />
          )}
        </View>
      );
    }
    return null;
  };

  /* =========================================================
     RENDER END TIME PICKER
  ========================================================= */

  const renderEndTimePicker = () => {
    if (Platform.OS === "web") {
      return (
        <View className="mt-2">
          <input
            type="time"
            value={auctionEndTime || ""}
            onChange={handleWebEndTimeChange}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid #d1d5db",
              fontSize: "16px",
              backgroundColor: "white",
              color: "#1f2937",
              outline: "none",
            }}
            onFocus={() => setShowEndTimePicker(false)}
          />
          <TouchableOpacity
            onPress={() => setShowEndTimePicker(false)}
            className="mt-2 bg-[#024e32] py-2 rounded-lg"
          >
            <Text className="text-white text-center font-semibold">Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (showEndTimePicker) {
      return (
        <View className="mt-2">
          {Platform.OS === "ios" ? (
            <View className="bg-white rounded-xl border border-gray-200 p-2">
              <DateTimePicker
                value={tempEndTime}
                mode="time"
                display="spinner"
                onChange={handleEndTimeChange}
              />
              <TouchableOpacity
                onPress={() => setShowEndTimePicker(false)}
                className="bg-[#024e32] py-2 rounded-lg mt-2"
              >
                <Text className="text-white text-center font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <DateTimePicker
              value={tempEndTime}
              mode="time"
              display="default"
              onChange={handleEndTimeChange}
            />
          )}
        </View>
      );
    }
    return null;
  };

  /* =========================================================
     FORMAT DATE DISPLAY
  ========================================================= */

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parts[0]} ${monthNames[parseInt(parts[1]) - 1]} ${parts[2]}`;
  };

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <SafeAreaView className="flex-1 bg-gray-50">

      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Auction Notifications
          </Text>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 110,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >

        {loading ? (
          <>
            <NotificationSkeleton />
            <View className="items-center mt-1 mb-6">
              <ActivityIndicator size="small" color="#024e32" />
              <Text className="text-gray-400 text-xs mt-2">
                Loading notifications...
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* FORM CARD - KEPT SAME SIZE */}
            <View className="bg-white rounded-2xl p-5 mb-6 mx-5 shadow-sm border border-gray-100">

              <Text className="text-lg font-bold text-gray-800 mb-4">
                {editId ? "✏️ Edit Notification" : "➕ Add New Notification"}
              </Text>

              {/* GROUP SELECTION */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Select Group
                </Text>
                <TouchableOpacity
                  onPress={() => setDropdownVisible(true)}
                  className="border border-gray-300 px-4 py-3 rounded-xl bg-white flex-row justify-between items-center"
                  activeOpacity={0.7}
                >
                  <View className="flex-row items-center flex-1">
                    <MaterialIcons name="group" size={20} color="#6b7280" />
                    <Text className={`ml-2 flex-1 ${groupId ? "text-gray-800" : "text-gray-400"}`}>
                      {selectedGroupLabel}
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#6b7280" />
                </TouchableOpacity>
                {groupId && (
                  <TouchableOpacity
                    onPress={() => {
                      setGroupId("");
                      setSelectedGroupLabel("Choose a group");
                    }}
                    className="mt-1 self-start"
                  >
                    <Text className="text-red-500 text-xs">Clear selection</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* AUCTION END DATE INPUT */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Auction End Date
                </Text>
                <TouchableOpacity
                  onPress={openDatePicker}
                  className="border border-gray-300 px-4 py-3 rounded-xl bg-white flex-row justify-between items-center"
                  activeOpacity={0.7}
                >
                  <Text className={auctionEndDate ? "text-gray-800" : "text-gray-400"}>
                    {auctionEndDate || "DD-MM-YYYY"}
                  </Text>
                  <MaterialIcons name="calendar-today" size={22} color="#6b7280" />
                </TouchableOpacity>
                {renderDatePicker()}
              </View>

              {/* END TIME INPUT (for countdown) */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Auction End Time <Text className="text-red-500">*</Text>
                  <Text className="text-gray-400 text-xs font-normal ml-1">
                    (Used for countdown)
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={openEndTimePicker}
                  className="border border-gray-300 px-4 py-3 rounded-xl bg-white flex-row justify-between items-center"
                  activeOpacity={0.7}
                >
                  <Text className={auctionEndTime ? "text-gray-800" : "text-gray-400"}>
                    {auctionEndTime || "HH:MM"}
                  </Text>
                  <MaterialIcons name="access-time" size={22} color="#6b7280" />
                </TouchableOpacity>
                {renderEndTimePicker()}
                <Text className="text-gray-400 text-xs mt-1 ml-1">
                  ⏱️ This time will be used for the countdown timer
                </Text>
              </View>

              {/* START BID AMOUNT */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Start Bid Amount <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl bg-white px-4">
                  <Text className="text-[#024e32] text-lg font-bold mr-2">₹</Text>
                  <TextInput
                    placeholder="Enter minimum starting bid..."
                    value={minBidAmount}
                    onChangeText={(text) => setMinBidAmount(text.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    className="flex-1 py-3 text-gray-800"
                  />
                </View>
                <Text className="text-gray-400 text-xs mt-1 ml-1">
                  Minimum amount allowed for bidding
                </Text>
              </View>

              {/* END BID AMOUNT */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  End Bid Amount <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row items-center border border-gray-300 rounded-xl bg-white px-4">
                  <Text className="text-[#024e32] text-lg font-bold mr-2">₹</Text>
                  <TextInput
                    placeholder="Enter maximum ending bid..."
                    value={maxBidAmount}
                    onChangeText={(text) => setMaxBidAmount(text.replace(/[^0-9]/g, ""))}
                    keyboardType="number-pad"
                    className="flex-1 py-3 text-gray-800"
                  />
                </View>
                <Text className="text-gray-400 text-xs mt-1 ml-1">
                  Maximum amount allowed for bidding
                </Text>
              </View>

              {/* MESSAGE INPUT */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Message
                </Text>
                <TextInput
                  placeholder="Enter notification message..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={3}
                  className="border border-gray-300 px-4 py-3 rounded-xl bg-white text-gray-800"
                />
              </View>

              {/* SUBMIT BUTTON */}
              <TouchableOpacity
                onPress={saveNotification}
                className={`py-3.5 rounded-xl ${
                  editId ? "bg-amber-600" : "bg-[#024e32]"
                } active:opacity-90`}
                activeOpacity={0.8}
              >
                <Text className="text-white text-center font-semibold text-base">
                  {editId ? "Update Notification" : "Add Notification"}
                </Text>
              </TouchableOpacity>

              {/* CANCEL EDIT */}
              {editId && (
                <TouchableOpacity
                  onPress={() => {
                    setEditId(null);
                    setGroupId("");
                    setAuctionDate("");
                    setAuctionEndTime("");
                    setMinBidAmount("");
                    setMaxBidAmount("");
                    setMessage("");
                    setWinnerName("");
                    setWinnerGroupId("");
                    setWinnerBidAmount("");
                    setSelectedGroupLabel("Choose a group");
                  }}
                  className="mt-3 py-3 border border-gray-400 rounded-xl active:opacity-80"
                  activeOpacity={0.8}
                >
                  <Text className="text-gray-700 text-center font-medium">
                    Cancel Edit
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* NOTIFICATIONS LIST - SMALLER */}
            <View className="mx-5 mb-8">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base font-bold text-gray-800">
                  All Notifications ({filteredNotifications.length})
                </Text>
                {notifications.length > 0 && (
                  <View className="bg-[#024e32]/10 px-2 py-0.5 rounded-lg">
                    <Text className="text-[#024e32] text-xs font-medium">
                      {notifications.length} total
                    </Text>
                  </View>
                )}
              </View>

              {/* =================================================
                  SEARCH CREATED AUCTIONS BY GROUP ID
              ================================================= */}
              {notifications.length > 0 && (
                <View className="mb-3">
                  <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 h-11">
                    <MaterialIcons name="search" size={20} color="#6b7280" />
                    <TextInput
                      value={notificationSearch}
                      onChangeText={setNotificationSearch}
                      placeholder="Search auction by Group ID..."
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="characters"
                      className="flex-1 ml-2 text-gray-800 text-sm"
                    />
                    {notificationSearch.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setNotificationSearch("")}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons name="close" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {notificationSearch.length > 0 && (
                    <Text className="text-gray-500 text-[11px] mt-1.5 ml-1">
                      {filteredNotifications.length} auction
                      {filteredNotifications.length === 1 ? "" : "s"} found for
                      "{notificationSearch}"
                    </Text>
                  )}
                </View>
              )}

              {notifications.length === 0 ? (
                <View className="bg-white rounded-2xl p-6 items-center shadow-sm border border-gray-100">
                  <MaterialIcons name="notifications-none" size={40} color="#d1d5db" />
                  <Text className="text-gray-700 font-medium text-base mt-3 mb-1">
                    No Notifications Yet
                  </Text>
                  <Text className="text-gray-500 text-xs text-center">
                    Add your first auction notification using the form above
                  </Text>
                </View>
              ) : (
                filteredNotifications.length === 0 ? (
                <View className="bg-white rounded-2xl p-6 items-center shadow-sm border border-gray-100">
                  <MaterialIcons name="search-off" size={40} color="#d1d5db" />
                  <Text className="text-gray-700 font-medium text-base mt-3 mb-1">
                    No Auction Found
                  </Text>
                  <Text className="text-gray-500 text-xs text-center">
                    No auction matches "{notificationSearch}". Try another Group ID.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredNotifications}
                  keyExtractor={(item: any) => item._id}
                  scrollEnabled={false}
                  renderItem={({ item }: any) => (
                    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
                      <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1">
                          <View className="flex-row items-center mb-1">
                            <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center mr-2">
                              <MaterialIcons name="notifications" size={18} color="#2563eb" />
                            </View>
                            <View>
                              <Text className="text-gray-800 font-bold text-sm">
                                Group ID: {item.groupId?.groupId}
                              </Text>
                              <Text className="text-gray-500 text-xs">
                                Auction Notification
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* AUCTION END DATE */}
                      <View className="flex-row items-center mb-1">
                        <MaterialIcons name="date-range" size={14} color="#6b7280" style={{ marginRight: 8 }} />
                        <Text className="text-gray-600 text-xs">
                          <Text className="font-medium">End Date:</Text> {item.auctionEndDate || "-"}
                        </Text>
                      </View>

                      {/* END TIME */}
                      <View className="flex-row items-center mb-1">
                        <MaterialIcons name="access-time" size={14} color="#6b7280" style={{ marginRight: 8 }} />
                        <Text className="text-gray-600 text-xs">
                          <Text className="font-medium">End Time:</Text> {item.auctionEndTime || "-"}
                          <Text className="text-gray-400 text-[10px] ml-1"> (Countdown target)</Text>
                        </Text>
                      </View>

                      {/* BID LIMITS */}
                      {(item.minBidAmount !== undefined || item.maxBidAmount !== undefined) && (
                        <View className="flex-row items-center mb-1">
                          <MaterialIcons name="gavel" size={14} color="#6b7280" style={{ marginRight: 8 }} />
                          <Text className="text-gray-600 text-xs">
                            <Text className="font-medium">Bid Range:</Text>{" "}
                            ₹{Number(item.minBidAmount || 0).toLocaleString("en-IN")} - ₹{Number(item.maxBidAmount || 0).toLocaleString("en-IN")}
                          </Text>
                        </View>
                      )}

                      {/* CREATED AT */}
                      <View className="flex-row items-center mb-1">
                        <MaterialIcons name="schedule" size={14} color="#6b7280" style={{ marginRight: 8 }} />
                        <Text className="text-gray-500 text-[10px]">
                          <Text className="font-medium">Created:</Text> {new Date(item.createdAt).toLocaleString()}
                        </Text>
                      </View>

                      {/* MESSAGE */}
                      <View className="flex-row items-start mb-2">
                        <MaterialIcons name="message" size={14} color="#6b7280" style={{ marginRight: 8, marginTop: 1 }} />
                        <Text className="text-gray-600 text-xs flex-1">
                          <Text className="font-medium">Message:</Text> {item.message}
                        </Text>
                      </View>

                      {/* WINNER DETAILS */}
                      {item.winnerName && (
                        <View className="mt-2 bg-amber-50 rounded-xl p-3 border border-amber-200">
                          <View className="flex-row items-center mb-1">
                            <MaterialIcons name="emoji-events" size={16} color="#d97706" />
                            <Text className="text-amber-800 font-bold text-xs ml-1">
                              🏆 Winner
                            </Text>
                          </View>

                          <View className="flex-row mt-1">
                            <Text className="text-gray-600 text-xs flex-1">
                              <Text className="font-medium">Name:</Text> {item.winnerName}
                            </Text>
                          </View>

                          {item.winnerGroupId && (
                            <View className="flex-row mt-0.5">
                              <Text className="text-gray-600 text-xs flex-1">
                                <Text className="font-medium">Group Member ID:</Text> {item.winnerGroupId}
                              </Text>
                            </View>
                          )}

                          {item.winnerBidAmount > 0 && (
                            <View className="flex-row mt-0.5">
                              <Text className="text-gray-600 text-xs flex-1">
                                <Text className="font-medium">Bid Amount:</Text> ₹{Number(item.winnerBidAmount).toLocaleString("en-IN")}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {/* ADD / EDIT WINNER BUTTON */}
                      <TouchableOpacity
                        onPress={() => openWinnerModal(item)}
                        className={`mt-3 py-1.5 rounded-lg border flex-row items-center justify-center ${
                          item.winnerName
                            ? "bg-amber-50 border-amber-200"
                            : "bg-[#d97706] border-[#d97706]"
                        }`}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="emoji-events" size={14} color={item.winnerName ? "#d97706" : "white"} />
                        <Text
                          className={`font-semibold text-xs ml-1 ${
                            item.winnerName ? "text-amber-700" : "text-white"
                          }`}
                        >
                          {item.winnerName ? "Edit Winner" : "🏆 Add Winner"}
                        </Text>
                      </TouchableOpacity>


{/* DELETE WINNER BUTTON */}
{item.winnerName && (
  <TouchableOpacity
    onPress={() => handleDeleteWinner(item)}
    className="mt-2 py-1.5 rounded-lg border border-red-200 bg-red-50 flex-row items-center justify-center"
    activeOpacity={0.8}
  >
    <MaterialIcons
      name="delete-outline"
      size={14}
      color="#dc2626"
    />

    <Text className="text-red-700 font-semibold text-xs ml-1">
      Delete Winner
    </Text>
  </TouchableOpacity>
)}


                      {/* BUTTONS */}
                      <View className="flex-row justify-end mt-3 flex-wrap">
                        {/* VIEW BIDS */}
                        <TouchableOpacity
                          onPress={() => {
                            router.push({
                              pathname: "/admin/bidroom",
                              params: {
                                notificationId: item._id,
                                groupId: item.groupId?._id || "",
                                groupCode: item.groupId?.groupId || "",
                                auctionEndDate: item.auctionEndDate || "",
                                auctionEndTime: item.auctionEndTime || "",
                                minBidAmount: String(item.minBidAmount ?? ""),
                                maxBidAmount: String(item.maxBidAmount ?? ""),

                                /* WINNER DETAILS (shown at the top of the bid room) */
                                winnerName: item.winnerName || "",
                                winnerId: item.winnerId || "",
                                winnerGroupId: item.winnerGroupId || "",
                                winnerBidAmount: String(item.winnerBidAmount ?? ""),
                              },
                            });
                          }}
                          className="px-3 py-1.5 bg-[#024e32] rounded-lg border border-[#024e32]"
                          activeOpacity={0.8}
                        >
                          <View className="flex-row items-center">
                            <MaterialIcons name="gavel" size={14} color="white" />
                            <Text className="text-white font-semibold text-xs ml-1">View Bids</Text>
                          </View>
                        </TouchableOpacity>

                        {/* EDIT */}
                        <TouchableOpacity
                          onPress={() => {
                            setEditId(item._id);
                            setGroupId(item.groupId?._id);
                            setSelectedGroupLabel(`Group ${item.groupId?.groupId}`);
                            setAuctionDate(item.auctionEndDate);
                            setAuctionEndTime(item.auctionEndTime);
                            setMinBidAmount(item.minBidAmount != null ? String(item.minBidAmount) : "");
                            setMaxBidAmount(item.maxBidAmount != null ? String(item.maxBidAmount) : "");
                            setMessage(item.message);
                            setWinnerName(item.winnerName || "");
                            setWinnerGroupId(item.winnerGroupId || "");
                            setWinnerBidAmount(item.winnerBidAmount ? String(item.winnerBidAmount) : "");
                          }}
                          className="px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200 active:opacity-80 ml-2"
                          activeOpacity={0.8}
                        >
                          <Text className="text-blue-700 font-medium text-xs">Edit</Text>
                        </TouchableOpacity>

                        {/* DELETE */}
                        <TouchableOpacity
                          onPress={() => handleDeleteClick(item._id)}
                          className="px-3 py-1.5 bg-red-50 rounded-lg border border-red-200 active:opacity-80 ml-2"
                          activeOpacity={0.8}
                        >
                          <Text className="text-red-700 font-medium text-xs">Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )
              )}
            </View>

            <Footer />
          </>
        )}
      </ScrollView>

      {renderSearchableDropdown()}
      {renderPopup()}
      {renderWinnerModal()}

    </SafeAreaView>
  );
}   