import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Animated,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config.js";

export default function MembersView() {
  const [members, setMembers] = useState<any[]>([]);
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
  }, []);

  /* =========================================================
     FETCH MEMBERS
  ========================================================= */

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/members`);
      const data = await res.json();

      // ✅ Reverse to show recently added first
      setMembers(Array.isArray(data) ? data.reverse() : []);
    } catch (err) {
      console.log("Error loading members:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  /* =========================================================
     REFRESH
  ========================================================= */

  const onRefresh = () => {
    setRefreshing(true);
    fetchMembers();
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

  const filteredMembers = members.filter((member) => {
    const query = searchText.toLowerCase();

    return (
      member.username?.toLowerCase().includes(query) ||
      member.userid?.toLowerCase().includes(query) ||
      member.phone?.toString().includes(query)
    );
  });

  /* =========================================================
     SKELETON CARD
  ========================================================= */

  const SkeletonCard = () => {
    return (
      <Animated.View
        style={{
          opacity: skeletonOpacity,
        }}
        className="bg-white rounded-xl p-4 mb-3 border border-gray-100"
      >
        {/* Header */}
        <View className="flex-row justify-between items-start">
          <View className="flex-1">

            {/* Name */}
            <View className="h-5 w-40 bg-gray-200 rounded-md" />

            {/* Phone */}
            <View className="flex-row items-center mt-3">
              <View className="h-4 w-4 bg-gray-200 rounded-full" />
              <View className="h-3 w-28 bg-gray-200 rounded-md ml-2" />
            </View>

            {/* User ID */}
            <View className="flex-row items-center mt-2">
              <View className="h-4 w-4 bg-gray-200 rounded-full" />
              <View className="h-3 w-32 bg-gray-200 rounded-md ml-2" />
            </View>
          </View>

          {/* Status */}
          <View className="h-7 w-20 bg-gray-200 rounded-full" />
        </View>

        {/* Address */}
        <View className="flex-row items-center mt-3 pt-3 border-t border-gray-100">
          <View className="h-4 w-4 bg-gray-200 rounded-full" />
          <View className="h-3 w-48 bg-gray-200 rounded-md ml-2" />
        </View>
      </Animated.View>
    );
  };

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#f9fafb]">
        <StatusBar
          barStyle="light-content"
          backgroundColor="#024e32"
        />

        {/* ================= HEADER - SAME AS CHIT SCHEMES ================= */}
        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.push("/admin")}
              className="mt-1"
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={26}
                color="white"
              />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
              View Members
            </Text>
          </View>
        </View>

        {/* ================= SKELETON CONTENT ================= */}

        <View className="flex-1 px-4 pt-4" style={{ paddingTop: 110 }}>

          {/* Search Skeleton */}
          <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-3 py-3 mb-4">
            <View className="h-5 w-5 bg-gray-200 rounded-full" />
            <View className="h-4 flex-1 bg-gray-200 rounded-md ml-3" />
          </View>

          {/* Skeleton Cards */}
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />

          {/* Loading indicator */}
          <View className="items-center mt-2 mb-6">
            <ActivityIndicator
              size="small"
              color="#024e32"
            />

            <Text className="text-gray-400 text-xs mt-2">
              Loading members...
            </Text>
          </View>

        </View>
      </SafeAreaView>
    );
  }

  /* =========================================================
     MAIN PAGE
  ========================================================= */

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">
      <StatusBar
        barStyle="light-content"
        backgroundColor="#024e32"
      />

      {/* ================= HEADER - SAME AS CHIT SCHEMES ================= */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.push("/admin")}
            className="mt-1"
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            View Members
          </Text>
        </View>
      </View>

      {/* ================= SEARCH BAR ================= */}

      <View className="px-4 mt-4" style={{ marginTop: 114 }}>
        <View className="flex-row items-center bg-white border border-gray-300 rounded-xl px-3 py-2">

          <MaterialIcons
            name="search"
            size={22}
            color="#6B7280"
          />

          <TextInput
            placeholder="Search by Name / UserID / Phone..."
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 ml-2 text-base"
          />

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

      {/* ================= MEMBERS LIST ================= */}

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

        {filteredMembers.length === 0 ? (

          /* ================= NO MEMBERS ================= */

          <View className="flex-1 justify-center items-center py-20">

            <MaterialIcons
              name="people-outline"
              size={60}
              color="#9CA3AF"
            />

            <Text className="text-center text-gray-500 text-lg mt-4">
              No members found
            </Text>

            {searchText.length > 0 && (
              <Text className="text-gray-400 text-sm mt-2">
                Try searching with another name or ID
              </Text>
            )}

          </View>

        ) : (

          /* ================= MEMBER CARDS ================= */

          filteredMembers.map((member, index) => (

            <TouchableOpacity
              key={member._id || index}
              onPress={() =>
                router.push({
                  pathname: "/admin/memberDetail",
                  params: {
                    userid: member.userid,
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
                    {member.username || "Unknown"}
                  </Text>

                  {/* Phone */}

                  <View className="flex-row items-center mt-1">

                    <MaterialIcons
                      name="phone"
                      size={16}
                      color="#6B7280"
                    />

                    <Text className="text-gray-600 ml-1 text-sm">
                      {member.phone || "N/A"}
                    </Text>

                  </View>

                  {/* UserID */}

                  <View className="flex-row items-center mt-1">

                    <MaterialIcons
                      name="badge"
                      size={16}
                      color="#6B7280"
                    />

                    <Text className="text-gray-500 ml-1 text-xs">
                      ID: {member.userid}
                    </Text>

                  </View>

                </View>

                {/* STATUS BADGE */}

                <View
                  className={`px-3 py-1 rounded-full ${getStatusColor(
                    member.status
                  )}`}
                >

                  <Text className="text-xs font-medium">
                    {member.status || "Active"}
                  </Text>

                </View>

              </View>

              {/* Address */}

              {member.address && (
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
                    {member.address}
                  </Text>

                </View>
              )}

            </TouchableOpacity>

          ))
        )}

        {/* ================= FOOTER SPACE ================= */}

        <View className="h-10" />

        {/* ================= COMPANY FOOTER - SAME AS CHIT SCHEMES ================= */}

        <View className="mt-6 mb-6 px-5">

          <View className="border-t border-gray-200 pt-4 items-center">

            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1 text-center">
              View Members
            </Text>

            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>

          </View>

        </View>

        {/* Extra Space Bottom */}

        <View className="h-20" />

      </ScrollView>

      {/* ================= ADD MEMBER BUTTON ================= */}

      <TouchableOpacity
        onPress={() => router.push("/admin/membersAdd")}
        className="absolute bottom-6 right-6 bg-[#024e32] w-14 h-14 rounded-full items-center justify-center shadow-lg"
        activeOpacity={0.8}
      >
        <MaterialIcons
          name="add"
          size={30}
          color="white"
        />
      </TouchableOpacity>

    </SafeAreaView>
  );
}