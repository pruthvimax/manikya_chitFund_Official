// app/employee/groupMembers.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  BackHandler,
  TextInput,
} from "react-native";

import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";

import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EmployeeGroupMembers() {
  const router = useRouter();

  const { groupId } =
    useLocalSearchParams<{ groupId: string }>();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* =====================================================
      SESSION + BACK BUTTON GUARD
  ===================================================== */

  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("employee");

      if (!stored) {
        console.log(
          "No employee session → redirecting to login"
        );

        router.replace("/employee/login");
        return;
      }
    };

    checkSession();

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/employee/collections");
        return true;
      }
    );

    return () => {
      backHandler.remove();
    };
  }, []);

  /* =====================================================
      FETCH MEMBERS – SORT BY groupMemberId
  ===================================================== */

  useEffect(() => {
    const loadMembers = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/groups/${groupId}/members`
        );

        const data = await res.json();

// ✅ Sort by Group Member ID (GM001, GM002, GM003... GM010...)
const sorted = (data.groupMembers || []).sort((a: any, b: any) => {
  const idA = String(a.groupMemberId || "").trim();
  const idB = String(b.groupMemberId || "").trim();

  const numA = Number(idA.replace(/\D/g, ""));
  const numB = Number(idB.replace(/\D/g, ""));

  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  return idA.localeCompare(idB, undefined, {
    numeric: true,
    sensitivity: "base",
  });
});

        setMembers(sorted);
      } catch (err) {
        console.log(
          "❌ Failed to load members",
          err
        );
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      loadMembers();
    }
  }, [groupId]);

  /* =====================================================
      FILTERED MEMBERS – search by name OR member ID OR phone
  ===================================================== */

  const filteredMembers = members.filter((item) => {
    const name =
      item.memberName?.toLowerCase() || "";

    const id = String(
      item.groupMemberId || ""
    ).toLowerCase();

    const phone = String(
      item.phone || ""
    ).toLowerCase();

    const text = search.toLowerCase();

    return (
      name.includes(text) ||
      id.includes(text) ||
      phone.includes(text)
    );
  });

  /* =====================================================
      MEMBER SKELETON
  ===================================================== */

  const MemberSkeleton = () => {
    return (
      <View className="flex-1">

        {/* SEARCH SKELETON */}

        <View className="px-5 py-3 bg-white border-b border-gray-200">

          <View className="flex-row items-center bg-gray-100 rounded-xl px-3">

            <View className="w-6 h-6 bg-gray-200 rounded-full" />

            <View className="flex-1 h-5 bg-gray-200 rounded ml-3" />

          </View>

        </View>

        {/* MEMBER CARD SKELETONS */}

        <View className="px-4 pt-4">

          {[1, 2, 3, 4, 5].map((item) => (
            <View
              key={item}
              className="bg-white rounded-2xl p-5 mb-4 border border-gray-200"
            >

              <View className="flex-row justify-between items-center">

                <View className="flex-1">

                  {/* Member name */}
                  <View className="h-5 w-40 bg-gray-200 rounded mb-3" />

                  {/* Phone */}
                  <View className="h-4 w-32 bg-gray-200 rounded mb-2" />

                  {/* Member ID */}
                  <View className="h-4 w-44 bg-gray-200 rounded" />

                </View>

                {/* Arrow */}
                <View className="w-7 h-7 bg-gray-200 rounded-full" />

              </View>

            </View>
          ))}

        </View>

      </View>
    );
  };

  /* =====================================================
      FOOTER
  ===================================================== */

  const Footer = () => (
    <View className="mt-6 mb-2">

      <View className="border-t border-gray-200 pt-4 items-center">

        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>

        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Collection Group Members
        </Text>

        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
          All rights reserved.
        </Text>

      </View>

    </View>
  );

  /* =====================================================
      UI
  ===================================================== */

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">

      {/* =====================================================
          HEADER
          FIXED — SAME AS YOUR OTHER EMPLOYEE PAGES
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() =>
              router.replace("/employee/collections")
            }
            className="mt-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Group Members
          </Text>

        </View>

      </View>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <View
        className="flex-1"
        style={{
          paddingTop: 110,
        }}
      >

        {/* =================================================
            SEARCH BAR
            FIXED — DOES NOT SCROLL
        ================================================= */}

        <View className="px-5 py-3 bg-white border-b border-gray-200">

          <View className="flex-row items-center bg-gray-100 rounded-xl px-3">

            <MaterialIcons
              name="search"
              size={22}
              color="#6b7280"
            />

            <TextInput
              placeholder="Search by name, Group Member ID or phone..."
              value={search}
              onChangeText={setSearch}
              className="flex-1 px-3 py-2 text-base text-gray-800"
              autoCorrect={false}
              autoCapitalize="none"
            />

            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            )}

          </View>

        </View>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (

          <View className="flex-1">

            {/* Skeleton cards only.
                Search bar remains visible above. */}

            <View className="px-4 pt-4">

              {[1, 2, 3, 4, 5].map((item) => (
                <View
                  key={item}
                  className="bg-white rounded-2xl p-5 mb-4 border border-gray-200"
                >

                  <View className="flex-row justify-between items-center">

                    <View className="flex-1">

                      <View className="h-5 w-40 bg-gray-200 rounded mb-3" />

                      <View className="h-4 w-32 bg-gray-200 rounded mb-2" />

                      <View className="h-4 w-44 bg-gray-200 rounded" />

                    </View>

                    <View className="w-7 h-7 bg-gray-200 rounded-full" />

                  </View>

                </View>
              ))}

            </View>

          </View>

        ) : filteredMembers.length === 0 ? (

          /* =================================================
              NO MEMBERS
          ================================================= */

          <View className="flex-1">

            <View className="flex-1 justify-center items-center">

              <MaterialIcons
                name="search-off"
                size={40}
                color="#9ca3af"
              />

              <Text className="text-gray-600 mt-3">
                No matching members found
              </Text>

            </View>

            <View className="px-5 pb-2">
              <Footer />
            </View>

          </View>

        ) : (

          /* =================================================
              MEMBERS LIST
              ONLY THIS SECTION SCROLLS
          ================================================= */

          <FlatList
            data={filteredMembers}

            keyExtractor={(item, index) =>
              `${item.groupMemberId}-${index}`
            }

            contentContainerStyle={{
              padding: 16,
              paddingBottom: 10,
            }}

            showsVerticalScrollIndicator={false}

            renderItem={({ item }) => (

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname:
                      "/employee/collectPayment",

                    params: {
                      groupId,
                      memberId:
                        item.groupMemberId,
                    },
                  })
                }

                className="bg-white rounded-2xl p-5 mb-4 border border-gray-200"

                activeOpacity={0.9}
              >

                <View className="flex-row justify-between items-center">

                  <View>

                    <Text className="text-lg font-bold text-gray-800">
                      {item.memberName ||
                        "Unknown"}
                    </Text>

                    <Text className="text-gray-600">
                      Phone: {item.phone || "-"}
                    </Text>

                    <Text className="text-gray-500 text-sm">
                      Group Member ID:{" "}
                      {item.groupMemberId}
                    </Text>

                  </View>

                  <MaterialIcons
                    name="chevron-right"
                    size={28}
                    color="#024e32"
                  />

                </View>

              </TouchableOpacity>

            )}

            /* =================================================
                FOOTER
                PART OF SAME MEMBER SCROLL
            ================================================= */

            ListFooterComponent={<Footer />}
          />

        )}

      </View>

    </SafeAreaView>
  );
}