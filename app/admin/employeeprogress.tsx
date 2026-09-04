import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

export default function RequestsManagement() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;

  const menus = [
    {
      title: "Leave Requests",
      icon: "event-note",
      route: "/admin/leave-requests",
      description: "View, accept & delete leave requests",
      color: "#024e32",
    },
    
    {
      title: "Meeting Details",
      icon: "meeting-room",
      route: "/admin/meetings-view",
      description: "View all employee meeting records",
      color: "#024e32",
    },
    {
      title: "Enrollments",
      icon: "person-add",
      route: "/admin/enrollments-view",
      description: "View all customer enrollments",
      color: "#024e32",
    },
    {
      title: "Today's Commitments",
      icon: "assignment",
      route: "/admin/commitments-view",
      description: "View all employee commitments",
      color: "#024e32",
    },
    {
      title: "Work Sheets",
      icon: "assignment-turned-in",
      route: "/admin/work-sheets-view",
      description: "View employee work sheets",
      color: "#024e32",
    },
    {
      title: "Employee Targets",
      icon: "trending-up",
      route: "/admin/employee-targets",
      description: "View employee performance & targets",
      color: "#024e32",
    },
    {
      title: "Employee Collections",
      icon: "payments",
      route: "/admin/employee-collections",
      description: "View all employee collection records",
      color: "#024e32",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* ✅ EXACT SAME HEADER AS ADMIN INDEX */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={{ padding: 6 }}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Requests & Commitments
          </Text>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 110, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className={`flex-row flex-wrap justify-between px-5 mt-8 pb-10 ${isDesktopOrLaptop ? 'max-w-6xl mx-auto w-full' : ''}`}>
          {menus.map((item, index) => (
            <TouchableOpacity
              key={index}
              activeOpacity={0.9}
              onPress={() => router.push(item.route as any)}
              className="bg-white w-[47%] py-8 mb-6 rounded-3xl items-center shadow-md border border-[#e8f0eb]"
            >
              <View className="w-16 h-16 rounded-2xl items-center justify-center mb-3">
                <MaterialIcons name={item.icon as any} size={38} color={item.color} />
              </View>
              <Text className="text-[#024e32] font-semibold text-center px-2 text-base">
                {item.title}
              </Text>
              <Text className="text-gray-500 text-xs text-center mt-1 px-2">
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FOOTER - Updated to match Groups.tsx style */}
        <View className="mt-10 pt-6 border-t border-gray-200 px-5">
          <View className="items-center">
            <Text className="text-[#024e32] font-bold text-lg">
              MANIKYA CHITS PVT LTD
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              Requests & Commitments Management
            </Text>
            <Text className="text-gray-400 text-xs mt-1">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}