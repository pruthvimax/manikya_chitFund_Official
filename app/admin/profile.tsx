import {
  SafeAreaView,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function AdminProfile() {
  const router = useRouter();

  const adminInfo = {
    name: "Manikya Chits Pvt Ltd",
    address: "Sagara, Karnataka, India",
    mobile: "+91 7259201729",
    email: "manikyachitsprivatelimited@gmail.com",
  };

  const handleQuickAction = (actionName: string) => {
    Alert.alert(
      "Coming Soon",
      `${actionName} feature will be available in the next update.`,
      [{ text: "OK" }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">

      <StatusBar
        barStyle="light-content"
        backgroundColor="#024e32"
      />

      {/* =====================================================
          HEADER
          EXACT SAME HEADER DESIGN
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Admin Profile
          </Text>

        </View>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 110,
          paddingBottom: 30,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* ===================================================
            PROFILE CARD
        =================================================== */}

        <View className="mx-5 mt-5 bg-white rounded-3xl overflow-hidden border border-gray-100">

          {/* PROFILE TOP */}

          <View className="bg-[#024e32] px-6 pt-8 pb-8 items-center">

            {/* LOGO */}

            <View
              className="w-32 h-32 rounded-full bg-white items-center justify-center overflow-hidden"
              style={{
                elevation: 7,
                shadowColor: "#000",
                shadowOffset: {
                  width: 0,
                  height: 4,
                },
                shadowOpacity: 0.2,
                shadowRadius: 7,
              }}
            >

              <Image
                source={require("../../assets/images/manikyaChits.png")}
                style={{
                  width: 110,
                  height: 110,
                }}
                resizeMode="contain"
              />

            </View>

            {/* COMPANY NAME */}

            <Text className="text-white text-2xl font-bold text-center mt-5">
              {adminInfo.name}
            </Text>

            {/* ADMIN BADGE */}

            <View className="bg-white/20 px-5 py-2 rounded-full mt-3">

              <Text className="text-white text-sm font-medium">
                Administrator
              </Text>

            </View>

          </View>

          {/* =================================================
              COMPANY DETAILS
          ================================================= */}

          <View className="p-5">

            {/* ADDRESS */}

            <View className="flex-row items-center mb-4">

              <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center">

                <MaterialIcons
                  name="location-on"
                  size={24}
                  color="#024e32"
                />

              </View>

              <View className="flex-1 ml-4">

                <Text className="text-gray-400 text-xs font-semibold">
                  ADDRESS
                </Text>

                <Text className="text-gray-800 text-base font-semibold mt-1">
                  {adminInfo.address}
                </Text>

              </View>

            </View>

            {/* MOBILE */}

            <View className="flex-row items-center mb-4">

              <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center">

                <MaterialIcons
                  name="phone"
                  size={23}
                  color="#024e32"
                />

              </View>

              <View className="flex-1 ml-4">

                <Text className="text-gray-400 text-xs font-semibold">
                  MOBILE NUMBER
                </Text>

                <Text className="text-gray-800 text-base font-semibold mt-1">
                  {adminInfo.mobile}
                </Text>

              </View>

            </View>

            {/* EMAIL */}

            <View className="flex-row items-center">

              <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center">

                <MaterialIcons
                  name="email"
                  size={23}
                  color="#024e32"
                />

              </View>

              <View className="flex-1 ml-4">

                <Text className="text-gray-400 text-xs font-semibold">
                  EMAIL ADDRESS
                </Text>

                <Text
                  className="text-gray-800 text-sm font-semibold mt-1"
                  numberOfLines={2}
                >
                  {adminInfo.email}
                </Text>

              </View>

            </View>

          </View>

        </View>

        {/* ===================================================
            QUICK ACTIONS
        =================================================== */}

        <View className="mx-5 mt-7">

          <Text className="text-gray-800 text-xl font-bold mb-1">
            Quick Actions
          </Text>

          <Text className="text-gray-500 text-sm mb-4">
            Manage your administrator account
          </Text>

          <View className="flex-row flex-wrap justify-between">

            {/* EDIT PROFILE */}

            <TouchableOpacity
              className="w-[48%] bg-white rounded-2xl p-5 mb-4 border border-gray-100"
              onPress={() =>
                handleQuickAction("Edit Profile")
              }
              activeOpacity={0.75}
            >

              <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center">

                <MaterialIcons
                  name="edit"
                  size={25}
                  color="#024e32"
                />

              </View>

              <Text className="text-gray-800 font-bold text-base mt-4">
                Edit Profile
              </Text>

              <Text className="text-gray-400 text-xs mt-1">
                Update profile details
              </Text>

            </TouchableOpacity>

            {/* SETTINGS */}

            <TouchableOpacity
              className="w-[48%] bg-white rounded-2xl p-5 mb-4 border border-gray-100"
              onPress={() =>
                handleQuickAction("Settings")
              }
              activeOpacity={0.75}
            >

              <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center">

                <MaterialIcons
                  name="settings"
                  size={25}
                  color="#024e32"
                />

              </View>

              <Text className="text-gray-800 font-bold text-base mt-4">
                Settings
              </Text>

              <Text className="text-gray-400 text-xs mt-1">
                Manage preferences
              </Text>

            </TouchableOpacity>

            {/* SECURITY */}

            <TouchableOpacity
              className="w-[48%] bg-white rounded-2xl p-5 mb-4 border border-gray-100"
              onPress={() =>
                handleQuickAction("Change Password")
              }
              activeOpacity={0.75}
            >

              <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center">

                <MaterialIcons
                  name="security"
                  size={25}
                  color="#024e32"
                />

              </View>

              <Text className="text-gray-800 font-bold text-base mt-4">
                Security
              </Text>

              <Text className="text-gray-400 text-xs mt-1">
                Change password
              </Text>

            </TouchableOpacity>

            {/* HELP */}

            <TouchableOpacity
              className="w-[48%] bg-white rounded-2xl p-5 mb-4 border border-gray-100"
              onPress={() =>
                handleQuickAction("Help & Support")
              }
              activeOpacity={0.75}
            >

              <View className="w-12 h-12 rounded-2xl bg-green-50 items-center justify-center">

                <MaterialIcons
                  name="help-outline"
                  size={25}
                  color="#024e32"
                />

              </View>

              <Text className="text-gray-800 font-bold text-base mt-4">
                Help & Support
              </Text>

              <Text className="text-gray-400 text-xs mt-1">
                Get assistance
              </Text>

            </TouchableOpacity>

          </View>

        </View>

        {/* ===================================================
            COMPANY FOOTER
        =================================================== */}

        <View className="mt-6 mb-5 px-5">

          <View className="border-t border-gray-200 pt-5 items-center">

            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1">
              Admin Profile
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