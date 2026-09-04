import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View, BackHandler } from "react-native"; // ✅ ADDED BackHandler
import AsyncStorage from "@react-native-async-storage/async-storage"; // ✅ ADDED
import { useEffect } from "react"; // ✅ ADDED

export default function TargetScreen() {
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
        // Always go back to Employee Dashboard
        router.replace("/employee");
        return true;
      }
    );

    return () => {
      backHandler.remove(); // ✅ CLEANUP
    };
  }, []);
  /* ================= END SESSION GUARD ================= */

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* HEADER - SAME SIZE */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mt-1">
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Target & Goals
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* UNDER CONSTRUCTION CARD */}
        <View className="mx-5 mt-8">
          <View className="bg-white p-6 rounded-2xl shadow-sm border border-[#e5e7eb] items-center">
            <View className="w-20 h-20 rounded-full bg-amber-50 items-center justify-center mb-4">
              <MaterialIcons name="construction" size={36} color="#f59e0b" />
            </View>
            <Text className="text-2xl font-bold text-[#1f2937] text-center mb-2">
              Coming Soon
            </Text>
            <Text className="text-gray-600 text-center">
              The Target & Goals feature is currently under development
            </Text>
          </View>
        </View>

        {/* WHAT TO EXPECT SECTION */}
        <View className="mx-5 mt-8">
          <Text className="text-xl font-bold text-[#1f2937] mb-4">
            About Target Feature
          </Text>
          
          <View className="space-y-4">
            <View className="bg-white p-5 rounded-2xl border border-[#e5e7eb]">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-xl bg-blue-50 items-center justify-center mr-3">
                  <MaterialIcons name="track-changes" size={24} color="#3b82f6" />
                </View>
                <Text className="font-bold text-lg text-[#1f2937]">Set Financial Goals</Text>
              </View>
              <Text className="text-gray-600">
                Define specific savings targets for chit fund participation, education, marriage, or business goals
              </Text>
            </View>

            <View className="bg-white p-5 rounded-2xl border border-[#e5e7eb]">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-xl bg-green-50 items-center justify-center mr-3">
                  <MaterialIcons name="trending-up" size={24} color="#10b981" />
                </View>
                <Text className="font-bold text-lg text-[#1f2937]">Progress Tracking</Text>
              </View>
              <Text className="text-gray-600">
                Visual progress bars and milestones to track how close you are to achieving your financial targets
              </Text>
            </View>

            <View className="bg-white p-5 rounded-2xl border border-[#e5e7eb]">
              <View className="flex-row items-center mb-3">
                <View className="w-12 h-12 rounded-xl bg-purple-50 items-center justify-center mr-3">
                  <MaterialIcons name="notifications-active" size={24} color="#8b5cf6" />
                </View>
                <Text className="font-bold text-lg text-[#1f2937]">Smart Reminders</Text>
              </View>
              <Text className="text-gray-600">
                Get notified about payment due dates and receive suggestions to help reach your goals faster
              </Text>
            </View>
          </View>
        </View>

        {/* COMING FEATURES */}
        <View className="mx-5 mt-8 mb-10">
          <Text className="text-xl font-bold text-[#1f2937] mb-4">
            Planned Features
          </Text>
          
          <View className="bg-[#f0f9ff] p-5 rounded-2xl border border-blue-100">
            <View className="flex-row items-center mb-4">
              <MaterialIcons name="check-circle" size={20} color="#3b82f6" />
              <Text className="text-[#1f2937] font-medium ml-2">Goal-based investment planning</Text>
            </View>
            
            <View className="flex-row items-center mb-4">
              <MaterialIcons name="check-circle" size={20} color="#3b82f6" />
              <Text className="text-[#1f2937] font-medium ml-2">Real-time progress analytics</Text>
            </View>
            
            <View className="flex-row items-center mb-4">
              <MaterialIcons name="check-circle" size={20} color="#3b82f6" />
              <Text className="text-[#1f2937] font-medium ml-2">Comparative performance charts</Text>
            </View>
            
            <View className="flex-row items-center mb-2">
              <MaterialIcons name="check-circle" size={20} color="#3b82f6" />
              <Text className="text-[#1f2937] font-medium ml-2">Automated savings suggestions</Text>
            </View>
          </View>

          {/* RELEASE TIMELINE */}
          <View className="bg-white p-5 rounded-2xl border border-[#e5e7eb] mt-6">
            <View className="flex-row items-center mb-3">
              <MaterialIcons name="schedule" size={24} color="#024e32" />
              <Text className="font-bold text-lg text-[#1f2937] ml-2">Expected Release</Text>
            </View>
            <Text className="text-gray-600 mb-3">
              Target feature is scheduled to launch in the next major update
            </Text>
            <View className="bg-[#f0f9ff] p-3 rounded-lg">
              <Text className="text-blue-700 text-sm text-center">
                Q1 2024 • Stay Tuned!
              </Text>
            </View>
          </View>

          {/* BACK TO DASHBOARD BUTTON */}
          <TouchableOpacity 
            onPress={() => router.back()}
            className="bg-[#024e32] py-4 rounded-xl items-center mt-8"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">Back to Dashboard</Text>
            <Text className="text-white/80 text-xs mt-1">Return to main menu</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
