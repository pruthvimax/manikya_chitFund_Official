import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function WorkTracker() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const menus = [
    {
      title: "Morning Meeting",
      icon: "wb-sunny",
      route: "/employee/morningMeeting",
    },
    {
      title: "Customer Database",
      icon: "assignment",
      route: "/employee/commitments",
    },
    {
      title: "Work Sheet",
      icon: "call",
      route: "/employee/workSheet",
    },
    {
      title: "Leave Request",
      icon: "event-busy",
      route: "/employee/leaveRequest",
    },
    {
      title: "Work Sheet History",
      icon: "history",
      route: "/employee/workSheet-history",
    },
    {
      title: "New Enrollment",
      icon: "person-add",
      route: "/employee/newEnrollment",
    },
    {
      title: "Enrollment History",
      icon: "history",
      route: "/employee/enrollment-history",
    },
    {
      title: "My Goals",
      icon: "track-changes",
      route: "/employee/my-targets",
    },
  ];

  /* =========================================================
     LOADING
     Only for displaying the skeleton when page opens.
  ========================================================= */
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  /* =========================================================
     SKELETON
  ========================================================= */
  const WorkTrackerSkeleton = () => {
    return (
      <View className="px-5 pt-5">
        <View className="flex-row flex-wrap justify-between">
          {menus.map((_, index) => (
            <View
              key={index}
              className="bg-white w-[47%] py-8 mb-5 rounded-3xl items-center border border-[#e8f0eb]"
            >
              {/* Icon skeleton */}
              <View className="w-16 h-16 rounded-2xl bg-gray-200 mb-3" />

              {/* Text skeleton */}
              <View
                className="h-4 bg-gray-200 rounded"
                style={{
                  width: index % 2 === 0 ? 105 : 120,
                }}
              />
            </View>
          ))}
        </View>

        {/* FOOTER SKELETON */}
        <View className="mt-4 mb-6">
          <View className="border-t border-gray-200 pt-4 items-center">
            <View
              className="h-4 bg-gray-200 rounded"
              style={{ width: 150 }}
            />

            <View
              className="h-3 bg-gray-200 rounded mt-2"
              style={{ width: 190 }}
            />

            <View
              className="h-3 bg-gray-200 rounded mt-2"
              style={{ width: 250 }}
            />
          </View>
        </View>
      </View>
    );
  };

  /* =========================================================
     FOOTER
  ========================================================= */
  const Footer = () => {
    return (
      <View className="mt-4 mb-6 px-5">
        <View className="border-t border-gray-200 pt-4 items-center">
          <Text className="text-[#024e32] font-bold text-base">
            MANIKYA CHITS PVT LTD
          </Text>

          <Text className="text-gray-500 text-xs mt-1 text-center">
            Employee Work Tracker
          </Text>

          <Text className="text-gray-400 text-xs mt-1 text-center">
            © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights
            reserved.
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">

      {/* =====================================================
          HEADER
          SAME STANDARD EMPLOYEE HEADER
      ===================================================== */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-1"
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <View className="flex-1 ml-4">
            <Text className="text-white text-2xl font-bold mt-1">
              Work Track
            </Text>

            <Text className="text-green-100 text-sm mt-1">
              Manage your daily work activities
            </Text>
          </View>

        </View>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 130,
          paddingBottom: 10,
        }}
      >

        {/* =================================================
            SKELETON
        ================================================= */}
        {loading ? (
          <WorkTrackerSkeleton />
        ) : (
          <>
            {/* =================================================
                MENU CARDS
                ORIGINAL MENU LOGIC UNCHANGED
            ================================================= */}
            <View className="flex-row flex-wrap justify-between px-5 pt-5">

              {menus.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.9}
                  onPress={() => router.push(item.route as any)}
                  className="bg-white w-[47%] py-8 mb-5 rounded-3xl items-center shadow-md border border-[#e8f0eb]"
                >
                  <View className="w-16 h-16 rounded-2xl items-center justify-center mb-3">
                    <MaterialIcons
                      name={item.icon as any}
                      size={38}
                      color="#024e32"
                    />
                  </View>

                  <Text className="text-[#024e32] font-semibold text-center px-2">
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}

            </View>

            {/* =================================================
                FOOTER
            ================================================= */}
            <Footer />
          </>
        )}

      </ScrollView>

    </SafeAreaView>
  );
}