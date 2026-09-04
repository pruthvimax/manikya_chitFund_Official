import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config";

export default function AdminPaymentHistory() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${groupId}/members`);
      const data = await res.json();
      setMembers(data.groupMembers || []);
    } catch (err) {
      Alert.alert("Error", "Failed to load payment history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) fetchMembers();
  }, [groupId]);

  const getTotalPaid = (payments: any[]) =>
    payments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#024e32" />
        <Text className="mt-3 text-gray-600">Loading payments...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* HEADER */}
      <View className="bg-[#024e32] px-5 pt-12 pb-4 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">
          Payment History – {groupId}
        </Text>
      </View>

      <ScrollView className="p-5">
        {members.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">
            No members found
          </Text>
        ) : (
          members.map((m) => (
            <View
              key={m.groupMemberId}
              className="bg-white rounded-2xl p-4 mb-4 border border-gray-200"
            >
              <Text className="text-lg font-bold text-gray-800">
                {m.memberName}
              </Text>
              <Text className="text-gray-500 mb-2">
                Group Member ID: {m.groupMemberId}
              </Text>

              {m.collections.map((c: any) => (
                <View
                  key={c.index}
                  className="mt-3 p-3 bg-gray-50 rounded-xl"
                >
                  <Text className="font-semibold">
                    Month {c.index}
                  </Text>

                  {c.payments.length === 0 ? (
                    <Text className="text-gray-400 mt-1">
                      No payments
                    </Text>
                  ) : (
                    c.payments.map((p: any, i: number) => (
                      <View
                        key={i}
                        className="flex-row justify-between mt-1"
                      >
                        <Text>₹{p.amount}</Text>
                        <Text className="text-gray-500 text-sm">
                          {new Date(p.paidAt).toLocaleDateString("en-IN")}
                        </Text>
                      </View>
                    ))
                  )}

                  <Text className="mt-2 font-semibold text-green-700">
                    Total Paid: ₹{getTotalPaid(c.payments)}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
