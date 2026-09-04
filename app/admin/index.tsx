import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import BACKEND_URL from "../../config";

import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";

export default function AdminIndex() {
  const router = useRouter();

  // ✅ LOGOUT MODAL STATE
  const [logoutVisible, setLogoutVisible] = useState(false);

  /* =========================================================
     VACANCY SUBSCRIPTION REQUEST BADGE

     Red badge on the Vacancies card whenever a member has
     tapped Subscribe and the admin has not opened the Vacancy
     Notifications page yet. Reads the same count the
     notifications page already uses - nothing new is stored.
  ========================================================= */

  const [newRequestCount, setNewRequestCount] = useState(0);

  const loadRequestCount = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/vacancy/requests/count`);

      if (!res.ok) return;

      const data = await res.json();
      setNewRequestCount(Number(data?.unseenCount || 0));
    } catch (error) {
      console.log("Vacancy request count load error:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRequestCount();
    }, [loadRequestCount])
  );

  // ✅ FINAL LOGOUT FUNCTION (ALL DEVICES)
  const confirmLogout = async () => {
    try {
      // ✅ Clear Storage
      await AsyncStorage.removeItem("adminInfo");
      await AsyncStorage.removeItem("adminToken");
      await AsyncStorage.removeItem("adminSession");

      // ✅ Close Modal
      setLogoutVisible(false);

      // ✅ Redirect
      router.replace("/admin/login");
    } catch (err) {
      console.log("Logout Error:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">

      {/* =====================================================
          HEADER
          ⚠️ YOUR ORIGINAL HEADER — DO NOT CHANGE
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center justify-between">

          <Text className="text-white text-2xl font-bold">
            MANIKYA CHITS - ADMIN
          </Text>

          {/* ✅ LOGOUT BUTTON */}

          <TouchableOpacity
            onPress={() => setLogoutVisible(true)}
            activeOpacity={0.7}
            style={{ padding: 6 }}
          >
            <MaterialIcons
              name="logout"
              size={26}
              color="white"
            />
          </TouchableOpacity>

        </View>
      </View>

      {/* =====================================================
          LOGOUT CONFIRM MODAL
      ===================================================== */}

      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center">

          <View className="bg-white w-80 rounded-2xl p-6">

            <Text className="text-xl font-bold text-gray-800 text-center">
              Logout Confirmation
            </Text>

            <Text className="text-gray-600 text-center mt-3">
              Are you sure you want to logout as Admin?
            </Text>

            <View className="flex-row mt-6">

              {/* CANCEL */}

              <TouchableOpacity
                onPress={() => setLogoutVisible(false)}
                className="flex-1 bg-gray-200 py-3 rounded-xl mr-2"
              >
                <Text className="text-center font-semibold text-gray-700">
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* LOGOUT */}

              <TouchableOpacity
                onPress={confirmLogout}
                className="flex-1 bg-red-600 py-3 rounded-xl ml-2"
              >
                <Text className="text-center font-semibold text-white">
                  Logout
                </Text>
              </TouchableOpacity>

            </View>

          </View>

        </View>
      </Modal>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 110,
          paddingBottom: 20,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* ===================================================
            LOGO
        =================================================== */}

        <View className="items-center mt-6">

          <Image
            source={require("../../assets/images/manikyaChits.png")}
            style={{
              width: 160,
              height: 160,
            }}
            resizeMode="contain"
          />

        </View>

        {/* ===================================================
            DASHBOARD
        =================================================== */}

        <View className="flex-row flex-wrap justify-between px-5 mt-8 pb-10">

          <MenuCard
            title="Chit Schemes"
            icon="account-balance-wallet"
            route="/admin/chitSchemes"
          />

          <MenuCard
            title="Groups"
            icon="group-work"
            route="/admin/groups"
          />

          <MenuCard
            title="Vacancies"
            icon="event-seat"
            route="/admin/vacancies"
            badgeCount={newRequestCount}
          />

          <MenuCard
            title="Vacancy Notifications"
            icon="notifications-active"
            route="/admin/vacancyNotifications"
          />

          {/* ✅ INTERESTED MEMBERS TAB */}

          <MenuCard
            title="Intrested Members"
            icon="person-add"
            route="/admin/interestedMembers"
          />

          <MenuCard
            title="Members"
            icon="people"
            route="/admin/membersView"
          />

          <MenuCard
            title="Member History"
            icon="history"
            route="/admin/memberHistory"
          />

          <MenuCard
            title="Employees"
            icon="badge"
            route="/admin/employeesView"
          />

          <MenuCard
            title="Employee Performance"
            icon="trending-up"
            route="/admin/employeeprogress"
          />

          <MenuCard
            title="Notifications"
            icon="notifications"
            route="/admin/notifications"
          />

          <MenuCard
            title="Profile"
            icon="person"
            route="/admin/profile"
          />

        </View>

        {/* ===================================================
            COMPANY FOOTER
            ✅ ONLY NEW PART
        =================================================== */}

        <View className="mt-2 mb-6 px-5">

          <View className="border-t border-gray-200 pt-5 items-center">

            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1">
              Admin Dashboard
            </Text>

            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

/* =========================================================
   MENU CARD
   ORIGINAL CODE
========================================================= */

function MenuCard({
  title,
  icon,
  route,
  badgeCount = 0,
}: {
  title: string;
  icon: any;
  route: string;
  badgeCount?: number;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(route)}
      className="bg-white w-[47%] py-8 mb-6 rounded-3xl items-center shadow-md border border-[#e8f0eb]"
      activeOpacity={0.9}
      style={{ padding: 5 }}
    >

      <View className="w-14 h-14 rounded-2xl bg-[#eaf4ef] items-center justify-center mb-3">

        <MaterialIcons
          name={icon}
          size={30}
          color="#024e32"
        />

        {badgeCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-[20px] px-1 items-center justify-center border border-white">
            <Text className="text-white text-[10px] font-bold">
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        )}

      </View>

      <Text className="text-[#024e32] text-base font-semibold text-center">
        {title}
      </Text>

    </TouchableOpacity>
  );
}