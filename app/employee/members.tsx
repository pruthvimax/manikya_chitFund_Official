// app/employee/members.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BACKEND_URL from "../../config";

export default function Members() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD MEMBERS ================= */
  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/groups/${groupId}/members`
        );
        const data = await res.json();
        setMembers(data.groupMembers || []);
      } catch (err) {
        console.log("Failed to load members", err);
      } finally {
        setLoading(false);
      }
    };

    loadMembers();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#024e32]">
      <ScrollView className="flex-1 bg-[#f7f9f8]">
        {/* HEADER */}
        <View className="bg-[#024e32] flex-row items-center justify-center relative py-5 shadow-md">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-5"
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">
            Members (Group {groupId})
          </Text>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center mt-20">
            <ActivityIndicator size="large" color="#024e32" />
            <Text className="text-gray-600 mt-3">
              Loading members...
            </Text>
          </View>
        ) : members.length === 0 ? (
          <View className="items-center mt-20">
            <MaterialIcons name="people" size={48} color="#9ca3af" />
            <Text className="text-gray-500 mt-3">
              No members found
            </Text>
          </View>
        ) : (
          <View className="px-6 py-6">
            {members.map((m, index) => (
              <TouchableOpacity
                key={index}
                onPress={() =>
                  router.push({
                    pathname: "/employee/collectPayment",
                    params: {
                      groupId,
                      memberId: m.groupMemberId, // ✅ IMPORTANT
                    },
                  })
                }
                className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-4"
              >
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-lg font-semibold text-gray-800">
                      {m.memberName}
                    </Text>
                    <Text className="text-gray-600 text-sm mt-1">
                      Member ID: {m.groupMemberId}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      Phone: {m.phone}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={26}
                    color="#024e32"
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
