// app/employee/notifications.tsx
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView, Text, TouchableOpacity, View, ScrollView } from "react-native";

export default function Notifications() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-[#024e32]">
      <ScrollView className="flex-1 bg-[#f7f9f8]">
        <View className="bg-[#024e32] flex-row items-center justify-center relative py-5 shadow-md">
          <TouchableOpacity onPress={() => router.back()} className="absolute left-5">
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">Notifications</Text>
        </View>

        <View className="px-6 py-8">
          <Text className="text-gray-700 text-base mb-4">
            Latest updates and announcements.
          </Text>
          <View className="bg-white p-5 rounded-2xl border border-[#e2ece6] shadow-sm">
            <Text className="text-[#024e32] text-lg font-semibold mb-2">
              Recent Notifications
            </Text>
            <Text className="text-gray-600">• Auction scheduled for Group A — Nov 10</Text>
            <Text className="text-gray-600 mt-1">• Payment reminder for Group B — Nov 12</Text>
            <Text className="text-gray-600 mt-1">• New chit group added — Group D</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
