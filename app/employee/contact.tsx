import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import {
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Contact() {
  const router = useRouter();

  /* ================= EMPLOYEE SESSION + BACK BUTTON GUARD ================= */
  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("employee");

      if (!stored) {
        console.log("No employee session → redirecting to login");
        router.replace("/employee/login");
        return;
      }
    };

    checkSession();

    // 🔒 BACK BUTTON CONTROL FOR CHILD PAGE
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/employee");
        return true;
      }
    );

    return () => {
      backHandler.remove();
    };
  }, []);

  /* ================= SOCIAL / CONTACT ACTIONS ================= */

  const openWhatsApp = () =>
    Linking.openURL(
      "https://wa.me/917259201729?text=Hello%20Manikya%20Chits!"
    );

  const openInstagram = () =>
    Linking.openURL(
      "https://instagram.com/manikya_chits_pvt_limited"
    );

  const openFacebook = () =>
    Linking.openURL("https://www.facebook.com/");

  const dialNumber = () =>
    Linking.openURL("tel:+917259201729");

  const sendEmail = () =>
    Linking.openURL(
      "mailto:manikyachitsprivatelimited@gmail.com"
    );

  return (
    <SafeAreaView className="flex-1 bg-[#f6fbf8]">

      {/* =====================================================
          FIXED HEADER
          SAME SIZE / STYLE AS OTHER EMPLOYEE PAGES
      ===================================================== */}

      <View
        className="bg-[#024e32] absolute top-0 left-0 right-0 z-50"
        style={{
          paddingTop: Platform.OS === "ios" ? 52 : 42,
        }}
      >
        <View className="px-5 pb-5">

          <View className="flex-row items-center">

            {/* BACK BUTTON */}
            <TouchableOpacity
              onPress={() => router.replace("/employee")}
              activeOpacity={0.75}
              className="mt-1"
            >
              <MaterialIcons
                name="arrow-back"
                size={26}
                color="white"
              />
            </TouchableOpacity>

            {/* HEADER TITLE */}
            <View className="flex-1 ml-4">

              <Text className="text-white text-2xl font-bold">
                Contact Us
              </Text>

              <Text className="text-green-100 text-sm mt-1">
                We're here to help you
              </Text>

            </View>

            {/* SUPPORT ICON */}
            <View className="w-10 h-10 rounded-xl bg-white/10 items-center justify-center">
              <MaterialIcons
                name="support-agent"
                size={24}
                color="white"
              />
            </View>

          </View>

        </View>

        {/* SMALL BRAND ACCENT */}
        <View className="h-1 bg-[#c64900]" />

      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 115,
          paddingBottom: 25,
        }}
      >

        <View className="px-5">

          {/* =================================================
              BUSINESS HOURS
          ================================================= */}

          <View className="bg-white rounded-2xl border border-[#d7e5dd] p-5 mb-5">

            <View className="flex-row items-center mb-4">

              <View className="w-11 h-11 rounded-xl bg-[#024e32]/10 items-center justify-center">
                <MaterialIcons
                  name="access-time"
                  size={24}
                  color="#024e32"
                />
              </View>

              <Text className="text-xl font-semibold text-[#024e32] ml-3">
                Business Hours
              </Text>

            </View>

            <Text className="text-base text-gray-700 mb-2">
              Monday to Saturday:{" "}
              <Text className="font-semibold">
                9:30 AM – 6:30 PM
              </Text>
            </Text>

            <Text className="text-base font-medium text-gray-700">
              Closed on Sundays
            </Text>

          </View>

          {/* =================================================
              CONTACT DETAILS
          ================================================= */}

          <View className="bg-white rounded-2xl border border-[#d7e5dd] p-5 mb-5">

            <View className="flex-row items-center mb-4">

              <View className="w-11 h-11 rounded-xl bg-[#024e32]/10 items-center justify-center">
                <MaterialIcons
                  name="call"
                  size={24}
                  color="#024e32"
                />
              </View>

              <Text className="text-xl font-semibold text-[#024e32] ml-3">
                Get in Touch
              </Text>

            </View>

            {/* PHONE */}

            <TouchableOpacity
              onPress={dialNumber}
              activeOpacity={0.7}
              className="bg-gray-50 rounded-xl px-4 py-3 mb-3"
            >
              <View className="flex-row items-center">

                <MaterialIcons
                  name="phone"
                  size={20}
                  color="#024e32"
                />

                <View className="ml-3">

                  <Text className="text-gray-500 text-xs">
                    Phone Number
                  </Text>

                  <Text className="text-base font-semibold text-[#c64900]">
                    +91 7259201729
                  </Text>

                </View>

              </View>
            </TouchableOpacity>

            {/* EMAIL */}

            <TouchableOpacity
              onPress={sendEmail}
              activeOpacity={0.7}
              className="bg-gray-50 rounded-xl px-4 py-3"
            >
              <View className="flex-row items-center">

                <MaterialIcons
                  name="email"
                  size={20}
                  color="#024e32"
                />

                <View className="ml-3 flex-1">

                  <Text className="text-gray-500 text-xs">
                    Email Address
                  </Text>

                  <Text
                    className="text-base font-semibold text-[#c64900]"
                    numberOfLines={2}
                  >
                    manikyachitsprivatelimited@gmail.com
                  </Text>

                </View>

              </View>
            </TouchableOpacity>

          </View>

          {/* =================================================
              OFFICE ADDRESS
          ================================================= */}

          <View className="bg-white rounded-2xl border border-[#d7e5dd] p-5 mb-5">

            <View className="flex-row items-center mb-4">

              <View className="w-11 h-11 rounded-xl bg-[#024e32]/10 items-center justify-center">
                <MaterialIcons
                  name="location-on"
                  size={24}
                  color="#024e32"
                />
              </View>

              <Text className="text-xl font-semibold text-[#024e32] ml-3">
                Office Address
              </Text>

            </View>

            <View className="bg-gray-50 rounded-xl p-4">

              <Text className="text-base text-gray-700 leading-6">
                #102 Shri Siddhivinayaka Complex,{"\n"}
                In front of Government Hospital, JC Road{"\n"}
                Sagara, Shivamogga, Karnataka – 577401
              </Text>

            </View>

          </View>

          {/* =================================================
              SOCIAL
          ================================================= */}

          <View className="bg-white rounded-2xl border border-[#d7e5dd] p-5 mb-6">

            <View className="flex-row items-center mb-5">

              <View className="w-11 h-11 rounded-xl bg-[#024e32]/10 items-center justify-center">
                <MaterialIcons
                  name="share"
                  size={24}
                  color="#024e32"
                />
              </View>

              <View className="ml-3">

                <Text className="text-xl font-semibold text-[#024e32]">
                  Connect with Us
                </Text>

                <Text className="text-gray-500 text-xs mt-1">
                  Follow us on social media
                </Text>

              </View>

            </View>

            <View className="flex-row items-center">

              {/* WHATSAPP */}

              <TouchableOpacity
                onPress={openWhatsApp}
                activeOpacity={0.8}
                className="w-14 h-14 bg-[#25D366] rounded-2xl items-center justify-center mr-4"
              >
                <FontAwesome
                  name="whatsapp"
                  size={29}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* INSTAGRAM */}

              <TouchableOpacity
                onPress={openInstagram}
                activeOpacity={0.8}
                className="w-14 h-14 bg-[#E4405F] rounded-2xl items-center justify-center mr-4"
              >
                <FontAwesome
                  name="instagram"
                  size={29}
                  color="#fff"
                />
              </TouchableOpacity>

              {/* FACEBOOK */}

              <TouchableOpacity
                onPress={openFacebook}
                activeOpacity={0.8}
                className="w-14 h-14 bg-[#1877F2] rounded-2xl items-center justify-center"
              >
                <FontAwesome
                  name="facebook"
                  size={29}
                  color="#fff"
                />
              </TouchableOpacity>

            </View>

          </View>

          {/* =================================================
              ATTRACTIVE FOOTER
          ================================================= */}

          <View className="bg-[#024e32] rounded-3xl px-5 py-6 mb-3">

            <View className="items-center">

              {/* COMPANY ICON */}

              <View className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 items-center justify-center mb-3">

                <MaterialIcons
                  name="business"
                  size={28}
                  color="white"
                />

              </View>

              {/* COMPANY NAME */}

              <Text className="text-white text-lg font-bold text-center">
                MANIKYA CHITS PVT LTD
              </Text>

              <Text className="text-green-100 text-xs mt-1 text-center">
                Trusted Chit Fund Services
              </Text>

              {/* ACCENT */}

              <View className="w-14 h-1 bg-[#c64900] rounded-full my-4" />

              <Text className="text-green-100 text-xs text-center">
                Thank you for choosing Manikya Chits.
              </Text>

              <Text className="text-white/70 text-xs text-center mt-3">
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
              </Text>

              <Text className="text-white/50 text-[10px] text-center mt-1">
                All rights reserved.
              </Text>

            </View>

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}