import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  BackHandler,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import BACKEND_URL from "../../config";
import { USE_NEW_EMPLOYEE_DESIGN } from "../../components/memberDesign";
import { SchemeCards, SchemeCardsSkeleton } from "../../components/employeeSchemes";

/* =========================================================
   SKELETON COMPONENT
========================================================= */

function SchemeSkeleton() {
  return (
    <View className="px-3 pb-10">

      {/* Skeleton title */}
      <View className="h-6 w-56 bg-gray-200 rounded-md mb-4 ml-2" />

      {/* Skeleton table */}
      <View className="rounded-xl overflow-hidden border border-gray-200">

        {/* Header skeleton */}
        <View className="flex-row bg-gray-200 py-3 min-w-[600px]">
          <View className="w-24 items-center">
            <View className="h-4 w-14 bg-gray-300 rounded" />
          </View>

          <View className="w-28 items-center">
            <View className="h-4 w-16 bg-gray-300 rounded" />
          </View>

          <View className="w-24 items-center">
            <View className="h-4 w-14 bg-gray-300 rounded" />
          </View>

          <View className="w-24 items-center">
            <View className="h-4 w-12 bg-gray-300 rounded" />
          </View>

          <View className="w-24 items-center">
            <View className="h-4 w-12 bg-gray-300 rounded" />
          </View>

          <View className="w-28 items-center">
            <View className="h-4 w-16 bg-gray-300 rounded" />
          </View>
        </View>

        {/* Skeleton rows */}
        {[1, 2, 3, 4, 5].map((item) => (
          <View
            key={item}
            className="flex-row border-t border-gray-200 py-4 items-center min-w-[600px]"
          >
            <View className="w-24 items-center">
              <View className="h-4 w-12 bg-gray-200 rounded" />
            </View>

            <View className="w-28 items-center">
              <View className="h-4 w-16 bg-gray-200 rounded" />
            </View>

            <View className="w-24 items-center">
              <View className="h-4 w-10 bg-gray-200 rounded" />
            </View>

            <View className="w-24 items-center">
              <View className="h-4 w-12 bg-gray-200 rounded" />
            </View>

            <View className="w-24 items-center">
              <View className="h-4 w-12 bg-gray-200 rounded" />
            </View>

            <View className="w-28 items-center">
              <View className="h-4 w-16 bg-gray-200 rounded" />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* =========================================================
   FOOTER
========================================================= */

function Footer() {
  return (
    <View className="px-5 mt-5 mb-3">

      <View className="border-t border-gray-200 pt-4 items-center">

        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>

        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Chit Schemes
        </Text>

        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
          {"\n"}All rights reserved.
        </Text>

      </View>

    </View>
  );
}

/* =========================================================
   FAST OPEN: the last list is kept (memory + phone storage) and shown
   at once, then refreshed quietly in the background.
========================================================= */
const SCHEMES_CACHE = "empSchemesCache_v1";
let memSchemes: any[] | null = null;

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function NewlyCommencedGroups() {
  const router = useRouter();

  const [schemes, setSchemes] = useState<any[]>(memSchemes || []);
  const [loading, setLoading] = useState(!memSchemes);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* ================= EMPLOYEE SESSION GUARD ================= */

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

  /* ================= FETCH SCHEMES ================= */

  useEffect(() => {
    // show the saved list straight away, then refresh quietly
    if (!memSchemes) {
      AsyncStorage.getItem(SCHEMES_CACHE)
        .then((raw) => {
          if (!raw || memSchemes) return;
          const saved = JSON.parse(raw);
          if (Array.isArray(saved) && saved.length) {
            memSchemes = saved;
            setSchemes(saved);
            setLoading(false);
          }
        })
        .catch(() => {});
    }
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      setError("");

      const endpoints = [
        `${BACKEND_URL}/chitscheme`,
        `${BACKEND_URL}/chitschemes`,
        `${BACKEND_URL}/api/chitscheme`,
        `${BACKEND_URL}/api/chitschemes`,
      ];

      let success = false;

      for (const endpoint of endpoints) {
        try {
          console.log("Trying endpoint:", endpoint);

          const res = await fetch(endpoint);

          if (res.ok) {
            const data = await res.json();

            console.log(
              "✅ Data fetched successfully:",
              data.length,
              "items"
            );

            setSchemes(data);
            memSchemes = data;
            AsyncStorage.setItem(SCHEMES_CACHE, JSON.stringify(data)).catch(() => {});
            success = true;
            break;
          }
        } catch (err) {
          console.log("Failed for", endpoint);
        }
      }

      // a saved list is already on screen -> no error banner for a slow network
      if (!success && !memSchemes) {
        setError("Could not connect to server");
      }
    } catch (err) {
      console.log("Error fetching schemes", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  /* ================= REFRESH ================= */

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchemes();
  };

  /* ================= UI ================= */

  return (
   <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>

      {/* =====================================================
          HEADER
          SAME HEADER AS OTHER EMPLOYEE PAGES
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.replace("/employee")}
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
            Chit Schemes
          </Text>

        </View>

      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <View
        className="flex-1"
        style={{
          paddingTop: 110,
        }}
      >

        {/* =================================================
            LOADING SKELETON
        ================================================= */}

        {loading ? (
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
          >
            {USE_NEW_EMPLOYEE_DESIGN ? <SchemeCardsSkeleton /> : <SchemeSkeleton />}

            <Footer />
          </ScrollView>
        ) : (

          /* =================================================
             MAIN SCROLL CONTENT
          ================================================= */

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#024e32"]}
                tintColor="#024e32"
              />
            }
          >

            {/* ================= ERROR ================= */}

            {error ? (

              <View className="p-6 items-center">

                <MaterialIcons
                  name="error-outline"
                  size={40}
                  color="#dc2626"
                />

                <Text className="text-red-600 mt-3 text-center">
                  {error}
                </Text>

              </View>

            ) : schemes.length === 0 ? (

              /* ================= EMPTY ================= */

              <View className="py-8 items-center">

                <MaterialIcons
                  name="account-balance-wallet"
                  size={50}
                  color="#ccc"
                />

                <Text className="text-gray-500 mt-3">
                  No chit schemes added yet
                </Text>

              </View>

            ) : USE_NEW_EMPLOYEE_DESIGN ? (

              /* ================= NEW: SCHEME CARDS ================= */

              <SchemeCards schemes={schemes} />

            ) : (

              /* ================= SCHEME TABLE ================= */

              <View className="px-3 pb-10">

                <Text className="text-lg font-semibold text-gray-800 mb-3 px-2">
                  Available Chit Schemes ({schemes.length})
                </Text>

                {/* TABLE WITH HORIZONTAL SCROLL */}

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                >

                  <View className="min-w-full">

                    {/* ================= TABLE HEADER ================= */}

                    <View className="flex-row bg-[#024e32] py-3 rounded-t-xl min-w-[600px]">

                      <Text className="w-24 text-white text-center font-semibold px-1">
                        Chit ID
                      </Text>

                      <Text className="w-28 text-white text-center font-semibold px-1">
                        Amount
                      </Text>

                      <Text className="w-24 text-white text-center font-semibold px-1">
                        Months
                      </Text>

                      <Text className="w-24 text-white text-center font-semibold px-1">
                        Daily
                      </Text>

                      <Text className="w-24 text-white text-center font-semibold px-1">
                        Weekly
                      </Text>

                      <Text className="w-28 text-white text-center font-semibold px-1">
                        Monthly
                      </Text>

                    </View>

                    {/* ================= TABLE ROWS ================= */}

                    {schemes.map((s) => (

                      <View
                        key={s._id}
                        className="flex-row border border-t-0 border-gray-300 py-4 items-center min-w-[600px]"
                      >

                        <Text className="w-24 text-center text-gray-800 font-medium px-1">
                          {s.chitId}
                        </Text>

                        <Text className="w-28 text-center text-gray-800 px-1">
                          ₹
                          {parseInt(
                            s.chitAmount
                          ).toLocaleString("en-IN")}
                        </Text>

                        <Text className="w-24 text-center text-gray-800 px-1">
                          {s.durationMonths}
                        </Text>

                        <Text className="w-24 text-center text-gray-800 px-1">
                          ₹
                          {parseInt(
                            s.dailyAmount
                          ).toLocaleString("en-IN")}
                        </Text>

                        <Text className="w-24 text-center text-gray-800 px-1">
                          ₹
                          {parseInt(
                            s.weeklyAmount
                          ).toLocaleString("en-IN")}
                        </Text>

                        <Text className="w-28 text-center text-gray-800 font-medium px-1">
                          ₹
                          {parseInt(
                            s.monthlyAmount
                          ).toLocaleString("en-IN")}
                        </Text>

                      </View>

                    ))}

                  </View>

                </ScrollView>

              </View>

            )}

            {/* =================================================
                FOOTER
            ================================================= */}

            <Footer />

          </ScrollView>

        )}

      </View>

    </SafeAreaView>
  );
}