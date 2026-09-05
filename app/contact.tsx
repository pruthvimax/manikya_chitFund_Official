import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Animated,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ================= SKELETON HELPERS ================= */
function useSkeletonPulse() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

function SkeletonBox({ className = "", style = {} }: { className?: string; style?: object }) {
  const opacity = useSkeletonPulse();
  return (
    <Animated.View
      className={`bg-gray-200 rounded-lg ${className}`}
      style={[{ opacity }, style]}
    />
  );
}

function InfoCardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <View className="bg-white rounded-3xl shadow-sm border border-[#d7e5dd] p-5 mb-6">
      <View className="flex-row items-center mb-4">
        <SkeletonBox className="w-10 h-10 rounded-full" />
        <SkeletonBox className="h-4 rounded ml-3" style={{ width: 150 }} />
      </View>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBox
          key={i}
          className="h-3 rounded mb-3 ml-2"
          style={{ width: i % 2 === 0 ? "80%" : "55%" }}
        />
      ))}
    </View>
  );
}

function ContactSkeleton() {
  return (
    <View className="px-4 max-w-4xl mx-auto w-full">
      <View className="bg-[#024e32] rounded-3xl p-6 mb-6">
        <View className="flex-row items-center">
          <SkeletonBox className="w-14 h-14 rounded-2xl" />
          <View className="ml-4 flex-1">
            <SkeletonBox className="h-5 rounded" style={{ width: 150 }} />
            <SkeletonBox className="h-3 rounded mt-2" style={{ width: 220 }} />
          </View>
        </View>
        <View className="flex-row mt-5">
          <SkeletonBox className="flex-1 h-16 rounded-xl mr-2" />
          <SkeletonBox className="flex-1 h-16 rounded-xl ml-2" />
        </View>
      </View>

      <InfoCardSkeleton lines={2} />
      <InfoCardSkeleton lines={2} />
      <InfoCardSkeleton lines={2} />
      <InfoCardSkeleton lines={3} />
      <View className="bg-white rounded-3xl shadow-sm border border-[#d7e5dd] p-5 mb-6">
        <View className="flex-row items-center mb-4">
          <SkeletonBox className="w-10 h-10 rounded-full" />
          <SkeletonBox className="h-4 rounded ml-3" style={{ width: 130 }} />
        </View>
        <View className="flex-row gap-4 ml-2">
          <SkeletonBox className="w-14 h-14 rounded-full" />
          <SkeletonBox className="w-14 h-14 rounded-full" />
          <SkeletonBox className="w-14 h-14 rounded-full" />
        </View>
      </View>
    </View>
  );
}

/* ================= MAIN COMPONENT ================= */
export default function Contact() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  /* ================= SESSION GUARD ================= */
  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("loggedUser");
      if (!stored) {
        router.replace("/");
        return;
      }
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  /* ================= LINKS ================= */
  const openWhatsApp = () =>
    Linking.openURL("https://wa.me/917259201729?text=Hello%20Manikya%20Chits!");
  const openInstagram = () =>
    Linking.openURL("https://instagram.com/manikya_chits_pvt_limited");
  const openFacebook = () => Linking.openURL("https://www.facebook.com/");
  const dialNumber = () => Linking.openURL("tel:+917259201729");
  const sendEmail = () =>
    Linking.openURL("mailto:manikyachitsprivatelimited@gmail.com");
  const dialDevTeam = () => Linking.openURL("tel:+917899698083");
  const emailDevTeam = () =>
    Linking.openURL("mailto:dynamicwebwork@gmail.com");

  return (
    <SafeAreaView className="flex-1 bg-[#f6fbf8]">
      {/* ================= PREMIUM HEADER ================= */}
      <View
        className="bg-[#024e32] px-5 pb-6 absolute top-0 left-0 right-0 z-50"
        style={{
          paddingTop: Platform.OS === "ios" ? 55 : 45,
        }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-white/10 items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View className="ml-4 flex-1">
            <Text className="text-white text-2xl font-bold">
              Contact Us
            </Text>
            <Text className="text-green-100 text-xs mt-1">
              We're here to help you
            </Text>
          </View>

          <View className="w-10 h-10 rounded-full bg-white/10 items-center justify-center">
            <MaterialIcons name="support-agent" size={23} color="white" />
          </View>
        </View>
      </View>

      {/* ✅ SCROLL CONTENT */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 130,
          paddingBottom: 35,
        }}
      >
        {checkingSession ? (
          <ContactSkeleton />
        ) : (
          <View className="px-4 max-w-4xl mx-auto w-full">

            {/* ================= CONTACT INTRO ================= */}
            <View className="bg-[#024e32] rounded-3xl p-6 mb-6 overflow-hidden">
              <View className="flex-row items-center">
                <View className="w-14 h-14 rounded-2xl bg-white/15 items-center justify-center">
                  <MaterialIcons name="headset-mic" size={30} color="white" />
                </View>

                <View className="flex-1 ml-4">
                  <Text className="text-white text-xl font-bold">
                    Need Assistance?
                  </Text>
                  <Text className="text-green-100 text-sm mt-1">
                    Reach out to Manikya Chits. Our team is happy to help.
                  </Text>
                </View>
              </View>

              <View className="flex-row mt-5">
                <View className="flex-1 bg-white/10 rounded-xl p-3 mr-2">
                  <MaterialIcons name="call" size={19} color="white" />
                  <Text className="text-green-100 text-xs mt-2">
                    Quick Support
                  </Text>
                </View>

                <View className="flex-1 bg-white/10 rounded-xl p-3 ml-2">
                  <MaterialIcons name="schedule" size={19} color="white" />
                  <Text className="text-green-100 text-xs mt-2">
                    Mon - Sat
                  </Text>
                </View>
              </View>
            </View>

            {/* BUSINESS HOURS */}
            <View className="bg-white rounded-3xl shadow-sm border border-[#d7e5dd] p-5 mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-11 h-11 bg-[#024e32]/10 rounded-2xl items-center justify-center">
                  <MaterialIcons name="access-time" size={22} color="#024e32" />
                </View>
                <Text className="text-lg font-semibold text-[#024e32] ml-3">
                  Business Hours
                </Text>
              </View>

              <Text className="text-base text-gray-700 mb-1 ml-2">
                Monday to Saturday:{" "}
                <Text className="font-medium">9:30 AM – 6:30 PM</Text>
              </Text>

              <Text className="text-base font-medium text-gray-700 ml-2">
                Closed on Sundays
              </Text>
            </View>

            {/* GET IN TOUCH */}
            <View className="bg-white rounded-3xl shadow-sm border border-[#d7e5dd] p-5 mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-11 h-11 bg-[#024e32]/10 rounded-2xl items-center justify-center">
                  <MaterialIcons name="call" size={22} color="#024e32" />
                </View>
                <Text className="text-lg font-semibold text-[#024e32] ml-3">
                  Get in Touch
                </Text>
              </View>

             <TouchableOpacity
  onPress={() => Linking.openURL("tel:+917259201729")}
  className="mb-2"
>
  <Text className="text-base text-gray-700 ml-2">
    Call:{" "}
    <Text className="font-medium text-[#c64900] underline">
      +91 7259201729 </Text>[Mr. Mohan]
    
  </Text>
</TouchableOpacity>

<TouchableOpacity
  onPress={() => Linking.openURL("tel:+919611418376")}
  className="mb-2"
>
  <Text className="text-base text-gray-700 ml-2">
    Call:{" "}
    <Text className="font-medium text-[#c64900] underline">
      +91 9611418376</Text> [Mr. Ram ]
    
  </Text>
</TouchableOpacity>

              <TouchableOpacity onPress={sendEmail}>
                <Text className="text-base text-gray-700 ml-2">
                  Email:{" "}
                  <Text className="font-medium text-[#c64900] underline">
                    manikyachitsprivatelimited@gmail
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* OFFICE ADDRESS */}
            <View className="bg-white rounded-3xl shadow-sm border border-[#d7e5dd] p-5 mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-11 h-11 bg-[#024e32]/10 rounded-2xl items-center justify-center">
                  <MaterialIcons name="location-on" size={22} color="#024e32" />
                </View>
                <Text className="text-lg font-semibold text-[#024e32] ml-3">
                  Office Address
                </Text>
              </View>

              <Text className="text-base text-gray-700 leading-6 ml-2">
                #102 Shri Siddivinayaka complex, infront of Government Hospital,
                JC road{"\n"}
                Sagara, Shivamogga, Karnataka – 577401
              </Text>
            </View>

            {/* ✅ MEET OUR DEVELOPMENT TEAM */}
            <View className="bg-white rounded-3xl shadow-sm border border-[#d7e5dd] p-5 mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-11 h-11 bg-[#024e32]/10 rounded-2xl items-center justify-center">
                  <MaterialIcons name="code" size={22} color="#024e32" />
                </View>
                <Text className="text-lg font-semibold text-[#024e32] ml-3">
                  Meet Our Development Team
                </Text>
              </View>

              <Text className="text-base font-medium text-gray-700 mb-2 ml-2">
                Manikya Dynamic Web Works
              </Text>

              <Text className="text-base text-gray-700 mb-4 ml-2">
                We provide professional website development, mobile applications,
                and custom software solutions tailored to your business needs.
              </Text>

              <TouchableOpacity onPress={dialDevTeam} className="mb-2">
  <Text className="text-base text-gray-700 ml-2">
    Technical Support:
  </Text>
</TouchableOpacity>

<TouchableOpacity
  onPress={() => Linking.openURL("tel:+917899698083")}
  className="mb-2"
>
  <Text className="text-base text-gray-700 ml-2">
    <Text className="font-medium text-[#c64900] underline">
      +91 7899698083</Text> [Mr. Pruthvi G]
    
  </Text>
</TouchableOpacity>

<TouchableOpacity
  onPress={() => Linking.openURL("tel:+919731975121")}
  className="mb-2"
>
  <Text className="text-base text-gray-700 ml-2">
    <Text className="font-medium text-[#c64900] underline">
      +91 9731975121</Text> [Mr. Harish Patil]
    
  </Text>
</TouchableOpacity>


<TouchableOpacity
  onPress={() => Linking.openURL("tel:+917899698083")}
  className="mb-2"
>
  <Text className="text-base text-gray-700 ml-2">
    <Text className="font-medium text-[#c64900] underline">
      +91 7259201729</Text> [Mr. Mohan]
    
  </Text>
</TouchableOpacity>

              <TouchableOpacity onPress={emailDevTeam}>
                <Text className="text-base text-gray-700 ml-2">
                  Email:{" "}
                  <Text className="font-medium text-[#c64900] underline">
                    Dynamicwebworks@gmail.com
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* CONNECT WITH US */}
            <View className="bg-white rounded-3xl shadow-sm border border-[#d7e5dd] p-5 mb-6">
              <View className="flex-row items-center mb-4">
                <View className="w-11 h-11 bg-[#024e32]/10 rounded-2xl items-center justify-center">
                  <MaterialIcons name="share" size={22} color="#024e32" />
                </View>
                <Text className="text-lg font-semibold text-[#024e32] ml-3">
                  Connect with Us
                </Text>
              </View>

              <View className="flex-row gap-4 ml-2">
                <TouchableOpacity
                  onPress={openWhatsApp}
                  className="w-14 h-14 bg-[#25D366] rounded-full items-center justify-center shadow-sm"
                >
                  <FontAwesome name="whatsapp" size={28} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={openInstagram}
                  className="w-14 h-14 bg-[#E4405F] rounded-full items-center justify-center shadow-sm"
                >
                  <FontAwesome name="instagram" size={28} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={openFacebook}
                  className="w-14 h-14 bg-[#1877F2] rounded-full items-center justify-center shadow-sm"
                >
                  <FontAwesome name="facebook" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ================= FOOTER ================= */}
            <View className="mt-2 mb-2 pt-5 border-t border-[#d7e5dd] items-center">
              <Text className="text-[#024e32] font-bold text-base">
                MANIKYA CHITS PVT LTD
              </Text>

              <Text className="text-gray-500 text-xs mt-1">
                Customer Support & Contact
              </Text>

              <Text className="text-gray-400 text-xs mt-2 text-center">
                © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}