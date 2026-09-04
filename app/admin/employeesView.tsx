import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BACKEND_URL from "../../config.js";

export default function EmployeesView() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Search State
  const [searchText, setSearchText] = useState("");

  const router = useRouter();

  /* =========================================================
     SKELETON ANIMATION
  ========================================================= */

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

  /* =========================================================
     FETCH EMPLOYEES
  ========================================================= */

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/employee`);
      const data = await res.json();

      // ✅ Show recently added first
      setEmployees(
        Array.isArray(data) ? data.reverse() : []
      );
    } catch (err) {
      console.log("Error loading employees:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  /* =========================================================
     REFRESH
  ========================================================= */

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  /* =========================================================
     STATUS COLOR
  ========================================================= */

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";

      case "inactive":
        return "bg-gray-100 text-gray-800";

      case "pending":
        return "bg-yellow-100 text-yellow-800";

      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  /* =========================================================
     SEARCH FILTER
  ========================================================= */

  const filteredEmployees = employees.filter((emp) => {
    const query = searchText.toLowerCase();

    return (
      emp.name?.toLowerCase().includes(query) ||
      emp.emp_id?.toLowerCase().includes(query) ||
      emp.phone?.toString().includes(query)
    );
  });

  /* =========================================================
     SKELETON CARD
  ========================================================= */

  const SkeletonEmployeeCard = () => {
    return (
      <Animated.View
        style={{
          opacity: skeletonOpacity,
        }}
        className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
      >
        <View className="flex-row justify-between items-start">

          {/* LEFT SIDE */}

          <View className="flex-1">

            {/* Employee Name */}

            <View className="h-5 w-40 bg-gray-200 rounded-md" />

            {/* Employee ID */}

            <View className="flex-row items-center mt-3">

              <View className="h-4 w-4 bg-gray-200 rounded-full" />

              <View className="h-3 w-28 bg-gray-200 rounded-md ml-2" />

            </View>

            {/* Phone */}

            <View className="flex-row items-center mt-2">

              <View className="h-4 w-4 bg-gray-200 rounded-full" />

              <View className="h-3 w-32 bg-gray-200 rounded-md ml-2" />

            </View>

            {/* Email */}

            <View className="flex-row items-center mt-2">

              <View className="h-4 w-4 bg-gray-200 rounded-full" />

              <View className="h-3 w-44 bg-gray-200 rounded-md ml-2" />

            </View>

          </View>

          {/* STATUS */}

          <View className="h-7 w-20 bg-gray-200 rounded-full" />

        </View>

        {/* ADDRESS */}

        <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">

          <View className="h-4 w-4 bg-gray-200 rounded-full" />

          <View className="h-3 w-52 bg-gray-200 rounded-md ml-2" />

        </View>

      </Animated.View>
    );
  };

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <View className="flex-1 bg-[#f9fafb]">

        {/* ================= HEADER ================= */}

        <View className="bg-[#024e32] px-5 pt-16 pb-6">

          <View className="flex-row items-center">

            <TouchableOpacity
              onPress={() => router.push("/admin")}
              className="mt-1"
            >
              <MaterialIcons
                name="arrow-back"
                size={26}
                color="white"
              />
            </TouchableOpacity>

            <Text className="text-white text-2xl font-bold ml-4">
              Employee View
            </Text>

          </View>

        </View>

        {/* ================= SKELETON ================= */}

        <View className="flex-1 px-4 pt-4">

          {/* SEARCH SKELETON */}

          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-3 mb-4">

            <View className="h-5 w-5 bg-gray-200 rounded-full" />

            <View className="h-4 flex-1 bg-gray-200 rounded-md ml-3" />

          </View>

          {/* EMPLOYEE SKELETON CARDS */}

          <SkeletonEmployeeCard />
          <SkeletonEmployeeCard />
          <SkeletonEmployeeCard />
          <SkeletonEmployeeCard />

          <View className="items-center mt-2">

            <ActivityIndicator
              size="small"
              color="#024e32"
            />

            <Text className="text-gray-400 text-xs mt-2">
              Loading employees...
            </Text>

          </View>

        </View>

      </View>
    );
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <View className="flex-1 bg-[#f9fafb]">

      {/* =====================================================
          HEADER
          YOUR ORIGINAL HEADER DESIGN - NOT CHANGED
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.push("/admin")}
            className="mt-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4">
            Employee View
          </Text>

        </View>

      </View>

      {/* ================= SEARCH BAR ================= */}

      <View className="px-4 mt-4">

        <View className="flex-row items-center bg-white border border-gray-300 rounded-xl px-3 py-2">

          <MaterialIcons
            name="search"
            size={22}
            color="#6B7280"
          />

          <TextInput
            placeholder="Search by Name / ID / Phone..."
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 ml-2 text-base"
          />

          {/* Clear Button */}

          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText("")}
            >
              <MaterialIcons
                name="close"
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          )}

        </View>

      </View>

      {/* ================= EMPLOYEES LIST ================= */}

      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
        showsVerticalScrollIndicator={false}
      >

        {filteredEmployees.length === 0 ? (

          /* ================= EMPTY STATE ================= */

          <View className="flex-1 justify-center items-center py-20">

            <MaterialIcons
              name="badge"
              size={60}
              color="#9CA3AF"
            />

            <Text className="text-center text-gray-500 text-lg mt-4">
              No employees found
            </Text>

            {searchText.length > 0 && (
              <Text className="text-gray-400 text-sm mt-2">
                Try searching with another name or ID
              </Text>
            )}

          </View>

        ) : (

          /* ================= EMPLOYEES ================= */

          filteredEmployees.map(
            (employee, index) => (

              <TouchableOpacity
                key={
                  employee._id ||
                  employee.emp_id ||
                  index
                }
                onPress={() =>
                  router.push({
                    pathname:
                      "/admin/employeesDetail",
                    params: {
                      emp_id:
                        employee.emp_id,
                    },
                  })
                }
                activeOpacity={0.7}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
              >

                <View className="flex-row justify-between items-start">

                  {/* LEFT SIDE */}

                  <View className="flex-1">

                    <Text className="text-lg font-bold text-gray-800">
                      {employee.name ||
                        employee.username ||
                        "Unknown"}
                    </Text>

                    {/* Employee ID */}

                    {employee.emp_id && (
                      <View className="flex-row items-center mt-1">

                        <MaterialIcons
                          name="badge"
                          size={16}
                          color="#6B7280"
                        />

                        <Text className="text-gray-500 ml-1 text-xs">
                          ID:{" "}
                          {employee.emp_id}
                        </Text>

                      </View>
                    )}

                    {/* Phone */}

                    {employee.phone && (
                      <View className="flex-row items-center mt-1">

                        <MaterialIcons
                          name="phone"
                          size={16}
                          color="#6B7280"
                        />

                        <Text className="text-gray-600 ml-1 text-sm">
                          {employee.phone}
                        </Text>

                      </View>
                    )}

                    {/* Email */}

                    {employee.email && (
                      <View className="flex-row items-center mt-1">

                        <MaterialIcons
                          name="email"
                          size={16}
                          color="#6B7280"
                        />

                        <Text className="text-gray-600 ml-1 text-sm">
                          {employee.email}
                        </Text>

                      </View>
                    )}

                  </View>

                  {/* STATUS BADGE */}

                  <View
                    className={`px-3 py-1 rounded-full ${getStatusColor(
                      employee.status
                    )}`}
                  >

                    <Text className="text-xs font-medium">
                      {employee.status ||
                        "Active"}
                    </Text>

                  </View>

                </View>

                {/* Address */}

                {employee.address && (
                  <View className="flex-row items-center mt-2 pt-2 border-t border-gray-100">

                    <MaterialIcons
                      name="location-on"
                      size={16}
                      color="#6B7280"
                    />

                    <Text
                      className="text-gray-500 ml-1 text-xs flex-1"
                      numberOfLines={1}
                    >
                      {employee.address}
                    </Text>

                  </View>
                )}

              </TouchableOpacity>

            )
          )
        )}

        {/* =================================================
            COMPANY FOOTER
        ================================================= */}

        <View className="mt-6 mb-6 px-5">

          <View className="border-t border-gray-200 pt-4 items-center">

            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1 text-center">
              Employee View
            </Text>

            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>

          </View>

        </View>

        {/* Bottom Space */}

        <View className="h-20" />

      </ScrollView>

      {/* ================= ADD EMPLOYEE BUTTON ================= */}

      <TouchableOpacity
        onPress={() =>
          router.push("/admin/employeesAdd")
        }
        className="absolute bottom-6 right-6 bg-[#024e32] w-14 h-14 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <MaterialIcons
          name="add"
          size={30}
          color="white"
        />
      </TouchableOpacity>

    </View>
  );
}