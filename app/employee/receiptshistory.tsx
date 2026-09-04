import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import BACKEND_URL from "../../config.js";

export default function ReceiptsHistory() {

  const router = useRouter();

  const params = useLocalSearchParams();

  const groupId = params.groupId as string;
  const groupMemberId = params.groupMemberId as string;
  const monthIndex = params.monthIndex as string;

  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔹 Reprint function
  const handleReprint = (receipt: any) => {
    router.push({
      pathname: "/employee/receipt",
      params: {
        receipt: JSON.stringify(receipt),
      },
    });
  };

  // 🔹 Load receipts
  const loadReceipts = async () => {
    try {
      setLoading(true);

      const url = `${BACKEND_URL}/groups/${groupId}/members/${groupMemberId}/receipts/${monthIndex}`;

      console.log("Fetching receipts from:", url);

      const res = await fetch(url);

      const data = await res.json();

      console.log("Receipts API response:", data);

      setReceipts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("❌ Receipt History Load Error:", error);
      Alert.alert("Error", "Failed to load receipt history");
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!groupId || !groupMemberId || !monthIndex) {
      Alert.alert("Error", "Missing receipt history parameters");
      return;
    }

    loadReceipts();
  }, []);

  /* ================= HELPERS ================= */
  const formatDate = (dateString: any) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: any) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  };

  /* ================= UI ================= */
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 flex-1">
            Receipt History
          </Text>
        </View>

        <Text className="text-white text-sm mt-2 opacity-80">
          Group: {groupId} • Month: {monthIndex}
        </Text>
      </View>

      {/* BODY */}
      <ScrollView className="flex-1 px-5 pt-6">
        {loading ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#024e32" />
            <Text className="text-gray-600 mt-4">
              Loading receipts...
            </Text>
          </View>
        ) : receipts.length === 0 ? (
          <View className="py-20 items-center">
            <MaterialIcons name="receipt-long" size={60} color="#d1d5db" />
            <Text className="text-gray-500 text-lg mt-4 text-center">
              No receipts found for Month {monthIndex}
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Once payments are collected, receipts will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* SUMMARY */}
            <View className="bg-[#f0f9ff] rounded-2xl p-5 mb-6 border border-blue-100">
              <Text className="text-blue-900 text-xl font-bold">
                Total Receipts: {receipts.length}
              </Text>
              <Text className="text-blue-700 mt-1">
                Tap any receipt to reprint instantly
              </Text>
            </View>

            {/* RECEIPT LIST */}
            <FlatList
              data={receipts}
              scrollEnabled={false}
              keyExtractor={(item, index) =>
                item.receiptId || index.toString()
              }
             renderItem={({ item }) => (
  <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200 shadow-sm">

    {/* TOP ROW */}
    <View className="flex-row justify-between items-center mb-3">
      <View>
        <Text className="text-[#024e32] font-bold text-lg">
          {item.receiptId}
        </Text>
        <Text className="text-gray-500 text-sm">
          Date: {formatDate(item.createdAt)}
        </Text>
      </View>

      {/* PRINT BUTTON */}
      <TouchableOpacity
        onPress={() => handleReprint(item)}
        className="bg-[#024e32] px-3 py-2 rounded-lg flex-row items-center"
      >
        <MaterialIcons name="print" size={18} color="white" />
        <Text className="text-white ml-1 font-semibold">
          Print
        </Text>
      </TouchableOpacity>
    </View>

    {/* DETAILS */}
    <View className="space-y-2">
      <Text className="text-gray-700">
        Installment Paid Today:{" "}
        <Text className="font-bold">
          {formatCurrency(item.todayInstallmentPaid)}
        </Text>
      </Text>

      <Text className="text-gray-700">
        Penalty Paid Today:{" "}
        <Text className="font-bold">
          {formatCurrency(item.todayPenaltyPaid)}
        </Text>
      </Text>

      <Text className="text-gray-700">
        Total Due:{" "}
        <Text className="font-bold text-red-600">
          {formatCurrency(item.totalDue)}
        </Text>
      </Text>
    </View>

    {/* FOOTER */}
    <View className="mt-4 pt-3 border-t border-gray-200 flex-row justify-between">
      <Text className="text-gray-500 text-sm">
        Month {item.monthIndex}
      </Text>

      <Text className="text-green-600 font-semibold text-sm">
        Verified ✅
      </Text>
    </View>

  </View>
)}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
