import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  StatusBar,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import BACKEND_URL from "../../config";

/* =========================================================
   TYPES
========================================================= */

type Bid = {
  _id: string;
  groupId: string;
  chitId: string;
  memberId: string;
  groupMemberId: string;
  customerName?: string;
  phone?: string;
  bidAmount: number;
  auctionDate: string;
  auctionTime: string;
  bidTime: string;
  createdAt?: string;
};

type CustomerHistory = {
  memberId: string;
  customerName: string;
  phone: string;
  bids: Bid[];
};

/* =========================================================
   ADMIN BID ROOM
========================================================= */

export default function AdminBidRoom() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;

  const params = useLocalSearchParams<{
    groupId?: string;
    groupCode?: string;
    auctionDate?: string;
    auctionTime?: string;

    /*
      admin/notifications.tsx sends the auction identity as
      auctionEndDate / auctionEndTime, so we must accept those
      names too - otherwise no auction date/time reaches the
      /bids/auction query and every auction of the same group
      returns the same bid list.
    */
    auctionEndDate?: string;
    auctionEndTime?: string;

    /* WINNER DETAILS (admin entered on the notification) */
    winnerName?: string;
    winnerId?: string;
    winnerGroupId?: string;
    winnerBidAmount?: string;
  }>();

  /* =======================================================
     PARAMS
  ======================================================= */

  const groupId = String(params.groupId || "");
  const groupCode = String(params.groupCode || "");

  /*
    AUCTION IDENTITY:
    groupId + auctionDate + auctionTime

    Existing approach preserved:
      auctionDate || auctionEndDate
      auctionTime || auctionEndTime
  */
  const passedAuctionDate = String(
    params.auctionDate || params.auctionEndDate || ""
  );

  const passedAuctionTime = String(
    params.auctionTime || params.auctionEndTime || ""
  );

  /* WINNER DETAILS */
  const winnerName = String(params.winnerName || "");
  const winnerId = String(params.winnerId || "");
  const winnerGroupId = String(params.winnerGroupId || "");
  const winnerBidAmount = Number(params.winnerBidAmount || 0);

  /* =======================================================
     STATE
  ======================================================= */

  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerHistory | null>(null);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingBidId, setDeletingBidId] = useState<string | null>(null);
  const [backendAuctionDate, setBackendAuctionDate] = useState("");
  const [backendAuctionEndDate, setBackendAuctionEndDate] = useState("");
  const [backendAuctionEndTime, setBackendAuctionEndTime] = useState("");

  /* =========================================================
     FORMAT AMOUNT
  ========================================================= */

  const formatAmount = (amount: number) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  /* =========================================================
     FORMAT BID TIME
  ========================================================= */

  const formatTime = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const displayDate =
    backendAuctionDate ||
    backendAuctionEndDate ||
    passedAuctionDate ||
    (bids.length > 0 ? bids[0].auctionDate : "-");

  /* =========================================================
     LOAD ADMIN BIDS
  ========================================================= */

  const loadBids = async () => {
    if (!groupId && !groupCode) {
      console.log("========== ADMIN BID VALIDATION ==========");
      console.log("groupId:", groupId);
      console.log("groupCode:", groupCode);
      console.log("❌ Missing group information");
      setBids([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setLoading(true);

      const auctionGroupId = groupCode || groupId;

      let url =
        `${BACKEND_URL}/bids/auction` +
        `?groupId=${encodeURIComponent(auctionGroupId)}`;

      if (passedAuctionDate) {
        url += `&auctionDate=${encodeURIComponent(passedAuctionDate)}`;
      }

      if (passedAuctionTime) {
        url += `&auctionTime=${encodeURIComponent(passedAuctionTime)}`;
      }

      console.log("==========================================");
      console.log("========== LOAD ADMIN BIDS ==========");
      console.log("Mongo groupId:", groupId);
      console.log("Public groupCode:", groupCode);
      console.log("API groupId:", auctionGroupId);
      console.log("Passed auctionDate:", passedAuctionDate || "(none)");
      console.log("Passed auctionTime:", passedAuctionTime || "(none)");
      console.log("API URL:", url);
      console.log("==========================================");

      const response = await fetch(url);
      const rawResponse = await response.text();

      console.log("ADMIN BID RESPONSE STATUS:", response.status);
      console.log("ADMIN BID RAW RESPONSE:", rawResponse);

      let data: any;

      try {
        data = JSON.parse(rawResponse);
      } catch {
        throw new Error(`Server returned invalid response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load auction bids");
      }

      let loadedBids: Bid[] = [];

      if (Array.isArray(data)) {
        loadedBids = data;
      } else if (Array.isArray(data?.bids)) {
        loadedBids = data.bids;
      } else if (Array.isArray(data?.data)) {
        loadedBids = data.data;
      } else if (Array.isArray(data?.results)) {
        loadedBids = data.results;
      }

      loadedBids.sort((a, b) => Number(b.bidAmount || 0) - Number(a.bidAmount || 0));

      setBackendAuctionDate(data?.auctionDate ? String(data.auctionDate) : "");
      setBackendAuctionEndDate(data?.auctionEndDate ? String(data.auctionEndDate) : "");
      setBackendAuctionEndTime(data?.auctionEndTime ? String(data.auctionEndTime) : "");

      console.log("========== ADMIN BID DATA ==========");
      console.log("Backend auction date:", data?.auctionDate);
      console.log("Backend end date:", data?.auctionEndDate);
      console.log("Backend end time:", data?.auctionEndTime);
      console.log("Total bids:", loadedBids.length);
      console.log("====================================");

      setBids(loadedBids);
    } catch (error: any) {
      console.error("❌ Admin bid loading error:", error);
      setBids([]);
      Alert.alert(
        "Unable to load bids",
        error?.message || "Something went wrong while loading bids."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

    /* =========================================================
     DELETE BID
  ========================================================= */

  const deleteBid = (bid: Bid) => {
    Alert.alert(
      "Delete Bid",
      `Are you sure you want to delete the bid from ${
        bid.customerName || bid.memberId || "this member"
      }?\n\nBid Amount: ${formatAmount(Number(bid.bidAmount || 0))}`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingBidId(String(bid._id));

              const url = `${BACKEND_URL}/bids/${encodeURIComponent(
                String(bid._id)
              )}`;

              console.log("========== DELETE BID ==========");
              console.log("Bid ID:", bid._id);
              console.log("Delete URL:", url);

              const response = await fetch(url, {
                method: "DELETE",
              });

              const rawResponse = await response.text();

              console.log("DELETE BID STATUS:", response.status);
              console.log("DELETE BID RESPONSE:", rawResponse);

              let data: any;

              try {
                data = JSON.parse(rawResponse);
              } catch {
                throw new Error(
                  `Server returned invalid response (${response.status})`
                );
              }

              if (!response.ok) {
                throw new Error(
                  data?.message || "Failed to delete bid"
                );
              }

              // Remove deleted bid immediately from the screen
              setBids((currentBids) =>
                currentBids.filter(
                  (item) => String(item._id) !== String(bid._id)
                )
              );

              // Close member details modal if this bid was selected
              if (
                selectedBid &&
                String(selectedBid._id) === String(bid._id)
              ) {
                closeCustomerHistory();
              }

              Alert.alert(
                "Bid Deleted",
                "The bid has been deleted successfully."
              );
            } catch (error: any) {
              console.error("❌ DELETE BID ERROR:", error);

              Alert.alert(
                "Delete Failed",
                error?.message || "Unable to delete the bid."
              );
            } finally {
              setDeletingBidId(null);
            }
          },
        },
      ]
    );
  };
  /* =========================================================
     PAGE FOCUS
  ========================================================= */

  useFocusEffect(
    useCallback(() => {
      loadBids();
    }, [groupId, groupCode, passedAuctionDate, passedAuctionTime])
  );

  /* =========================================================
     REFRESH
  ========================================================= */

  const onRefresh = () => {
    setRefreshing(true);
    loadBids();
  };

  /* =========================================================
     HIGHEST BID
  ========================================================= */

  const highestBidAmount =
    bids.length > 0
      ? Math.max(...bids.map((item) => Number(item.bidAmount || 0)))
      : 0;

  /* =========================================================
     TICKET NUMBERS
     Tickets are assigned chronologically (earliest bid = #1),
     same as the member bid room.
  ========================================================= */

  const chronologicalBids = [...bids].sort(
    (a, b) =>
      new Date(a.bidTime || 0).getTime() -
      new Date(b.bidTime || 0).getTime()
  );

  const getTicketNumber = (bidId: string) => {
    if (!bidId) return 0;
    const idx = chronologicalBids.findIndex(
      (b) => String(b._id) === String(bidId)
    );
    return idx >= 0 ? idx + 1 : 0;
  };

  /* =========================================================
     OPEN BID DETAILS
  ========================================================= */

  const openBidDetails = (bid: Bid) => {
    setSelectedBid(bid);
    openCustomerHistory(String(bid.memberId));
  };

  /* =========================================================
     CUSTOMER HISTORY
  ========================================================= */

  const openCustomerHistory = async (memberId: string) => {
    try {
      setHistoryLoading(true);

      /*
        IMPORTANT:
        Clear the previously opened member's history first,
        otherwise the modal briefly (or on a failed request,
        permanently) shows the previous member's bids.
      */
      setSelectedCustomer(null);

      const auctionGroupId = groupCode || groupId;

      const url =
        `${BACKEND_URL}/bids/customer-history` +
        `?groupId=${encodeURIComponent(auctionGroupId)}` +
        `&memberId=${encodeURIComponent(memberId)}`;

      console.log("========== CUSTOMER HISTORY ==========");
      console.log("memberId:", memberId);
      console.log("groupId:", auctionGroupId);
      console.log("URL:", url);

      const response = await fetch(url);
      const rawResponse = await response.text();

      console.log("CUSTOMER HISTORY STATUS:", response.status);
      console.log("CUSTOMER HISTORY RESPONSE:", rawResponse);

      let data: any;

      try {
        data = JSON.parse(rawResponse);
      } catch {
        throw new Error(`Server returned invalid response (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(data?.message || "Failed to load customer history");
      }

      setSelectedCustomer(data);
    } catch (error: any) {
      console.error("❌ Customer bid history error:", error);
      Alert.alert(
        "History unavailable",
        error?.message || "Customer history could not be loaded."
      );
    } finally {
      setHistoryLoading(false);
    }
  };

  /* =========================================================
     CLOSE DETAILS
  ========================================================= */

  const closeCustomerHistory = () => {
    setSelectedCustomer(null);
    setSelectedBid(null);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F5F7F6" }}>
      <StatusBar barStyle="light-content" backgroundColor="#024E32" />

      {/* =====================================================
          HEADER - SAME AS CHIT SCHEMES PAGE
      ===================================================== */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mt-1"
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Auction Bids
          </Text>
        </View>
      </View>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ 
          paddingTop: 110,
          paddingBottom: 20
        }}
      >
        <View className={`pb-10 ${isDesktopOrLaptop ? 'px-8' : 'px-5'}`}>
          {/* ===================================================
              AUCTION INFO
          =================================================== */}
          <View className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm shadow-black/5">
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-2xl bg-[#EAF5EF] items-center justify-center">
                <MaterialIcons name="gavel" size={27} color="#024E32" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-gray-400 text-xs font-semibold tracking-wider uppercase">
                  Auction
                </Text>
                <Text className="text-gray-900 text-xl font-bold mt-1">
                  {groupCode || groupId}
                </Text>
              </View>
              <View className="bg-[#EAF5EF] px-3 py-1.5 rounded-full">
                <Text className="text-[#024E32] text-[10px] font-bold tracking-wider">
                  {bids.length} BIDS
                </Text>
              </View>
            </View>

            <View className="h-px bg-gray-100 my-5" />

            <View className="flex-row flex-wrap">
              <View className="flex-1 min-w-[100px]">
                <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                  📅 Auction Date
                </Text>
                <Text className="text-gray-800 font-semibold mt-1 text-base">
                  {displayDate}
                </Text>
              </View>
              <View className="flex-1 min-w-[100px]">
                <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                  ⏰ End Time
                </Text>
                <Text className="text-gray-800 font-semibold mt-1 text-base">
                  {backendAuctionEndTime || passedAuctionTime || "-"}
                </Text>
              </View>
            </View>
          </View>

          {/* ===================================================
              WINNER (shown only when admin has added a winner)
          =================================================== */}
          {winnerName ? (
            <View className="bg-amber-50 rounded-3xl p-5 mt-4 border border-amber-200">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-2xl bg-amber-100 items-center justify-center">
                  <MaterialIcons name="emoji-events" size={27} color="#D97706" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-amber-700 text-[10px] font-semibold tracking-wider uppercase">
                    🏆 Auction Winner
                  </Text>
                  <Text className="text-gray-900 text-xl font-bold mt-1">
                    {winnerName}
                  </Text>
                </View>
              </View>

              <View className="h-px bg-amber-200 my-4" />

              <View className="flex-row flex-wrap">
                <View className="flex-1 min-w-[100px]">
                  <Text className="text-amber-700/70 text-[10px] font-semibold tracking-wider uppercase">
                    Member ID
                  </Text>
                  <Text className="text-gray-800 font-semibold mt-1 text-sm">
                    {winnerId || "-"}
                  </Text>
                </View>
                <View className="flex-1 min-w-[100px]">
                  <Text className="text-amber-700/70 text-[10px] font-semibold tracking-wider uppercase">
                    Group Member ID
                  </Text>
                  <Text className="text-gray-800 font-semibold mt-1 text-sm">
                    {winnerGroupId || "-"}
                  </Text>
                </View>
                <View className="flex-1 min-w-[100px]">
                  <Text className="text-amber-700/70 text-[10px] font-semibold tracking-wider uppercase">
                    Winning Bid
                  </Text>
                  <Text className="text-amber-700 font-extrabold mt-1 text-base">
                    {winnerBidAmount > 0 ? formatAmount(winnerBidAmount) : "-"}
                  </Text>
                </View>
              </View>

              <Text className="text-amber-700/70 text-[10px] mt-3">
                Winner of {passedAuctionDate || displayDate}
                {passedAuctionTime ? ` • ${passedAuctionTime}` : ""}
              </Text>
            </View>
          ) : null}

          {/* ===================================================
              SUMMARY
          =================================================== */}
          <View className="flex-row mt-4">
            <View className="flex-1 bg-white rounded-2xl p-4 mr-2 border border-gray-100 shadow-sm shadow-black/5">
              <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                Total Bids
              </Text>
              <Text className="text-[#024E32] text-2xl font-bold mt-1">
                {bids.length}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl p-4 ml-2 border border-gray-100 shadow-sm shadow-black/5">
              <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                Highest Bid
              </Text>
              <Text className="text-[#024E32] text-xl font-bold mt-1">
                {highestBidAmount ? formatAmount(highestBidAmount) : "-"}
              </Text>
            </View>
          </View>

          {/* ===================================================
              TITLE
          =================================================== */}
          <View className="mt-7 mb-3">
            <View className="flex-row items-center">
              <MaterialIcons name="people" size={24} color="#024E32" />
              <Text className="text-gray-900 text-xl font-bold ml-2">
                Bided Members
              </Text>
              {bids.length > 0 && (
                <View className="ml-2 bg-[#EAF5EF] px-2.5 py-0.5 rounded-full">
                  <Text className="text-[#024E32] text-xs font-bold">{bids.length}</Text>
                </View>
              )}
            </View>
            <Text className="text-gray-500 text-xs mt-1 ml-9">
              Highest bid appears first. Tap a bid to view member details.
            </Text>
          </View>

          {/* ===================================================
              LOADING
          =================================================== */}
          {loading ? (
<View
  style={{
    alignItems: "center",
    paddingVertical: 64,
    backgroundColor: "#fff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  }}
>
  <ActivityIndicator size="large" color="#024E32" />
  <Text
    style={{
      color: "#6b7280",
      marginTop: 12,
      fontWeight: "500",
    }}
  >
    Loading bids...
  </Text>
</View>
          ) : bids.length === 0 ? (
            /* ================================================
               NO BIDS
            ================================================= */
            <View className="bg-white rounded-3xl p-8 items-center border border-gray-100 shadow-sm">
              <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center">
                <MaterialIcons name="gavel" size={36} color="#9CA3AF" />
              </View>
              <Text className="text-gray-800 font-bold text-lg mt-4">No bids yet</Text>
              <Text className="text-gray-500 text-center text-sm mt-2 max-w-xs">
                Bids for this auction will appear here once customers start bidding.
              </Text>
            </View>
          ) : (
            /* ================================================
               BID LIST
            ================================================= */
            bids.map((bid, index) => {
              const amount = Number(bid.bidAmount || 0);
              const isHighest = amount === highestBidAmount;

              return (
                <TouchableOpacity
                  key={bid._id || `${bid.memberId}-${index}`}
                  activeOpacity={0.88}
                  onPress={() => openBidDetails(bid)}
                  className={`bg-white rounded-3xl p-5 mb-4 border shadow-sm ${
                    isHighest
                      ? "border-[#024E32] border-2 bg-[#FAFDFB]"
                      : "border-gray-100"
                  }`}
                >
                  {/* ====================================
                      TOP
                  ==================================== */}
                  <View className="flex-row items-center">
                    <View
                      className={`w-12 h-12 rounded-2xl items-center justify-center ${
                        isHighest ? "bg-yellow-100" : "bg-gray-100"
                      }`}
                    >
                      <MaterialIcons
                        name={isHighest ? "emoji-events" : "person"}
                        size={26}
                        color={isHighest ? "#D97706" : "#6B7280"}
                      />
                    </View>

                    <View className="ml-3 flex-1">
                      <Text className="text-gray-900 font-bold text-base">
                        {bid.customerName || "Customer"}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <MaterialIcons name="phone" size={13} color="#9CA3AF" />
                        <Text className="text-gray-500 text-xs ml-1">
                          {bid.phone || "-"}
                        </Text>
                      </View>
                    </View>

                    {isHighest && (
                      <View className="bg-yellow-100 rounded-full px-3 py-1 border border-yellow-200">
                        <Text className="text-yellow-700 text-[10px] font-bold">
                          🏆 HIGHEST
                        </Text>
                      </View>
                    )}
                  </View>

                  <View className="h-px bg-gray-100 my-4" />

                  {/* ====================================
                      MEMBER INFORMATION
                  ==================================== */}
                  <View className="flex-row">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                        Ticket No
                      </Text>
                      <Text className="text-[#024E32] font-bold mt-1">
                        {`#${getTicketNumber(String(bid._id || ""))}`} - {bid.groupMemberId || "-"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                        Member ID
                      </Text>
                      <Text className="text-gray-800 font-bold mt-1">
                        {bid.memberId || "-"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                        Group Member ID
                      </Text>
                      <Text className="text-gray-800 font-bold mt-1">
                        {bid.groupMemberId || "-"}
                      </Text>
                    </View>
                  </View>

                  {/* ====================================
                      BID AMOUNT
                  ==================================== */}
                 <View className="flex-row items-end mt-5">
  <View className="flex-1">
    <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
      Bid Amount
    </Text>

    <Text className="text-[#024E32] text-2xl font-extrabold mt-1">
      {formatAmount(amount)}
    </Text>
  </View>

  <View className="items-end mr-3">
    <Text className="text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
      Bid Time
    </Text>

    <Text className="text-gray-700 text-xs font-semibold mt-1">
      {formatTime(bid.bidTime)}
    </Text>
  </View>

  {/* DELETE BID */}
  <TouchableOpacity
    onPress={(event) => {
      event.stopPropagation();
      deleteBid(bid);
    }}
    disabled={deletingBidId === String(bid._id)}
    activeOpacity={0.8}
    className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 items-center justify-center"
  >
    {deletingBidId === String(bid._id) ? (
      <ActivityIndicator
        size="small"
        color="#DC2626"
      />
    ) : (
      <MaterialIcons
        name="delete-outline"
        size={21}
        color="#DC2626"
      />
    )}
  </TouchableOpacity>
</View>                </TouchableOpacity>
              );
            })
          )}

          

          {/* ===================================================
              FOOTER - SAME AS CHIT SCHEMES PAGE
          =================================================== */}
          <View className="mt-8 mb-6 px-5">
            <View className="border-t border-gray-200 pt-4 items-center">
              <Text className="text-[#024e32] font-bold text-base">
                MANIKYA CHITS PVT LTD
              </Text>
              <Text className="text-gray-500 text-xs mt-1 text-center">
                Auction Bids Management
              </Text>
              <Text className="text-gray-400 text-xs mt-1 text-center">
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* =====================================================
          MEMBER DETAILS MODAL
      ===================================================== */}
      <Modal
        visible={!!selectedBid}
        transparent
        animationType="slide"
        onRequestClose={closeCustomerHistory}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-[#F5F7F6] rounded-t-3xl overflow-hidden"
            style={{ maxHeight: "80%" }}
          >
            {/* =============================================
                FIXED HEADER
            ============================================= */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-3 bg-white border-b border-gray-100">
              <View className="flex-row items-center flex-1">
                <View className="w-9 h-9 rounded-xl bg-[#EAF5EF] items-center justify-center mr-2.5">
                  <MaterialIcons name="person" size={18} color="#024E32" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 text-sm font-bold" numberOfLines={1}>
                    {selectedBid?.customerName ||
                      selectedCustomer?.customerName ||
                      "Member Details"}
                  </Text>
                  <Text className="text-gray-400 text-[10px]">
                    Bidder info & bidding history
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={closeCustomerHistory}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
                activeOpacity={0.8}
              >
                <MaterialIcons name="close" size={18} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* =============================================
                SCROLLABLE BODY
            ============================================= */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingTop: 12,
                paddingBottom: 24,
              }}
            >
              {/* MEMBER INFO CARD */}
              {selectedBid && (
                <View className="bg-white rounded-2xl p-3.5 border border-gray-100 mb-3">
                  {/* INFO ROWS */}
                  <View className="flex-row mb-2.5">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                        Member ID
                      </Text>
                      <Text className="text-gray-800 font-semibold text-xs mt-0.5">
                        {selectedBid.memberId || "-"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                        Group Member ID
                      </Text>
                      <Text className="text-gray-800 font-semibold text-xs mt-0.5">
                        {selectedBid.groupMemberId || "-"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row mb-2.5">
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                        Phone
                      </Text>
                      <Text className="text-gray-800 font-semibold text-xs mt-0.5">
                        {selectedBid.phone || selectedCustomer?.phone || "-"}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                        Bid Time
                      </Text>
                      <Text className="text-gray-800 font-semibold text-xs mt-0.5">
                        {formatTime(selectedBid.bidTime)}
                      </Text>
                    </View>
                  </View>

                  {/* CURRENT BID HIGHLIGHT */}
                  <View className="bg-[#EAF5EF] rounded-xl px-3 py-2.5 flex-row items-center justify-between border border-[#024E32]/10">
                    <Text className="text-gray-500 text-[10px] font-semibold tracking-wider uppercase">
                      Current Bid
                    </Text>
                    <Text className="text-[#024E32] text-lg font-extrabold">
                      {formatAmount(selectedBid.bidAmount)}
                    </Text>
                  </View>
                </View>
              )}

              {/* HISTORY TITLE */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-800 font-bold text-sm">
                  Bidding History
                </Text>
                {selectedCustomer?.bids && selectedCustomer.bids.length > 0 && (
                  <View className="bg-[#024e32]/10 px-2 py-0.5 rounded-full">
                    <Text className="text-[#024e32] text-[10px] font-bold">
                      {selectedCustomer.bids.length}
                    </Text>
                  </View>
                )}
              </View>

              {historyLoading ? (
                <View className="items-center py-8 bg-white rounded-2xl border border-gray-100">
                  <ActivityIndicator size="small" color="#024E32" />
                  <Text className="text-gray-500 text-xs mt-2">
                    Loading bidding history...
                  </Text>
                </View>
              ) : selectedCustomer?.bids && selectedCustomer.bids.length > 0 ? (
                /* ==================================================
                   HISTORY GROUPED PER AUCTION

                   The same group can have MANY auctions, so a flat
                   list looked identical for every auction. The bids
                   are therefore grouped by their own auction identity:

                     auctionDate + auctionTime

                   The auction currently open is shown first and
                   labelled, the rest are shown as previous auctions.
                ================================================== */
                (() => {
                  const currentKey = `${passedAuctionDate}|${passedAuctionTime}`;

                  const groups: Record<string, Bid[]> = {};

                  selectedCustomer.bids.forEach((bid) => {
                    const key = `${bid.auctionDate || "-"}|${bid.auctionTime || "-"}`;
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(bid);
                  });

                  /* DD-MM-YYYY + HH:MM -> sortable number */
                  const toSortValue = (key: string) => {
                    const [d, t] = key.split("|");
                    const dp = String(d || "").split("-");
                    const tp = String(t || "").split(":");
                    if (dp.length !== 3) return 0;
                    return new Date(
                      Number(dp[2]),
                      Number(dp[1]) - 1,
                      Number(dp[0]),
                      Number(tp[0] || 0),
                      Number(tp[1] || 0)
                    ).getTime();
                  };

                  const orderedKeys = Object.keys(groups).sort((a, b) => {
                    if (a === currentKey) return -1;
                    if (b === currentKey) return 1;
                    return toSortValue(b) - toSortValue(a);
                  });

                  return orderedKeys.map((key) => {
                    const groupBids = groups[key]
                      .slice()
                      .sort(
                        (a, b) => Number(b.bidAmount || 0) - Number(a.bidAmount || 0)
                      );

                    const groupHighest = Math.max(
                      ...groupBids.map((b) => Number(b.bidAmount || 0))
                    );

                    const [gDate, gTime] = key.split("|");
                    const isCurrentAuction = key === currentKey;

                    return (
                      <View key={key} className="mb-3">
                        {/* AUCTION SECTION HEADER */}
                        <View
                          className={`flex-row items-center justify-between rounded-xl px-3 py-2 mb-2 border ${
                            isCurrentAuction
                              ? "bg-[#EAF5EF] border-[#024E32]/20"
                              : "bg-gray-100 border-gray-200"
                          }`}
                        >
                          <View className="flex-row items-center flex-1">
                            <MaterialIcons
                              name={isCurrentAuction ? "gavel" : "history"}
                              size={14}
                              color={isCurrentAuction ? "#024E32" : "#6B7280"}
                            />
                            <View className="ml-2 flex-1">
                              <Text
                                className={`text-[9px] font-bold tracking-wider uppercase ${
                                  isCurrentAuction
                                    ? "text-[#024E32]"
                                    : "text-gray-500"
                                }`}
                              >
                                {isCurrentAuction
                                  ? "This Auction"
                                  : "Previous Auction"}
                              </Text>
                              <Text className="text-gray-700 text-[11px] font-semibold mt-0.5">
                                {gDate || "-"}
                                {gTime && gTime !== "-" ? `  •  ${gTime}` : ""}
                              </Text>
                            </View>
                          </View>

                          <View
                            className={`px-2 py-0.5 rounded-full ${
                              isCurrentAuction ? "bg-[#024E32]" : "bg-gray-400"
                            }`}
                          >
                            <Text className="text-white text-[9px] font-bold">
                              {groupBids.length}
                            </Text>
                          </View>
                        </View>

                        {/* BIDS OF THIS AUCTION */}
                        {groupBids.map((bid, index) => {
                          const isHighestHistory =
                            Number(bid.bidAmount || 0) === groupHighest;

                          return (
                            <View
                              key={bid._id || `${bid.memberId}-${index}`}
                              className={`rounded-xl p-3 mb-2 border ${
                                isHighestHistory
                                  ? "bg-yellow-50 border-yellow-200"
                                  : "bg-white border-gray-100"
                              }`}
                            >
                              <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                  <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                                    Group Member ID
                                  </Text>
                                  <Text className="text-gray-800 font-semibold text-xs mt-0.5">
                                    {bid.groupMemberId || "-"}
                                  </Text>
                                </View>
                                <View className="items-end">
                                  <Text className="text-gray-400 text-[9px] font-semibold tracking-wider uppercase">
                                    Bid Amount
                                  </Text>
                                  <Text
                                    className={`font-bold text-sm mt-0.5 ${
                                      isHighestHistory
                                        ? "text-yellow-700"
                                        : "text-[#024E32]"
                                    }`}
                                  >
                                    {formatAmount(bid.bidAmount)}
                                  </Text>
                                </View>
                              </View>

                              <View className="flex-row justify-between mt-1.5 pt-1.5 border-t border-gray-100">
                                <Text className="text-gray-400 text-[10px]">
                                  {bid.auctionDate || "-"}
                                  {bid.auctionTime ? `  •  ${bid.auctionTime}` : ""}
                                </Text>
                                <Text className="text-gray-400 text-[10px]">
                                  {formatTime(bid.bidTime)}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    );
                  });
                })()
              ) : (
                <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
                  <MaterialIcons name="history" size={28} color="#9CA3AF" />
                  <Text className="text-gray-700 font-semibold text-xs mt-2">
                    No bid history
                  </Text>
                  <Text className="text-gray-400 text-[10px] mt-1 text-center">
                    The current bid details are shown above.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}