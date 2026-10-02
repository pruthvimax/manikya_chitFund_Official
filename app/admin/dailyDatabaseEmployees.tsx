import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import BACKEND_URL from "../../config";

/* Reads the real app version straight from app.json (expo.version),
   matching the same pattern used on EmployeeDetail.tsx's footer. */
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

/* =========================================================
   ADMIN - DAILY LEADS (employee list)

   Shows one card per employee who has submitted at least one
   Daily Leads entry, with their name, employee ID, total entry
   count and a Hot/Warm/Cold breakdown. Tapping a card opens
   app/admin/dailyDatabaseDetail.tsx for that employee's entries.
========================================================= */

function EmployeeSummaryCard({ item }: { item: any }) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: "/admin/dailyDatabaseDetail",
          params: { empId: item.empId, employeeName: item.employeeName },
        })
      }
      activeOpacity={0.85}
      className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-[#e8f0eb] items-center justify-center">
          <MaterialIcons name="badge" size={24} color="#024e32" />
        </View>

        <View className="flex-1 ml-3">
          <Text className="text-gray-900 font-bold text-base">
            {item.employeeName}
          </Text>
          <Text className="text-gray-400 text-xs mt-0.5">
            ID: {item.empId}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[#024e32] font-extrabold text-lg">
            {item.totalEntries}
          </Text>
          <Text className="text-gray-400 text-[10px]">entries</Text>
        </View>

        <MaterialIcons
          name="chevron-right"
          size={24}
          color="#9ca3af"
          style={{ marginLeft: 6 }}
        />
      </View>

      <View className="flex-row mt-4">
        <StatChip label="Hot" count={item.hotCount} colors={["#ff6b4a", "#dc2626"]} />
        <StatChip label="Warm" count={item.warmCount} colors={["#fcd34d", "#d97706"]} />
        <StatChip label="Cold" count={item.coldCount} colors={["#7dd3fc", "#0369a1"]} />
      </View>
    </TouchableOpacity>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  return (
    <View className="mt-8 items-center border-t border-gray-200 pt-6">
      <View className="flex-row items-center mb-2">
        <MaterialIcons name="verified-user" size={16} color="#024e32" />
        <Text className="text-[#024e32] font-semibold text-sm ml-1">
          Admin Panel
        </Text>
      </View>
      <Text className="text-gray-400 text-xs">
        Daily Leads are synced in real time
      </Text>
      <Text className="text-gray-400 text-xs mt-1">
        © {new Date().getFullYear()} · v{APP_VERSION}
      </Text>
    </View>
  );
}

function StatChip({
  label,
  count,
  colors,
}: {
  label: string;
  count: number;
  colors: [string, string];
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 8,
      }}
    >
      <Text className="text-white text-[11px] font-bold">
        {label}: {count}
      </Text>
    </LinearGradient>
  );
}

export default function DailyDatabaseEmployees() {
  const router = useRouter();

  /* Real device safe-area insets — matches the header pattern used
     on EmployeeDetail.tsx etc. A plain View (not SafeAreaView) is
     used below so the green header reaches the very top edge on
     iOS instead of leaving a grey gap above it; the inset is
     applied inside the header's own paddingTop instead. */
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Platform.OS === "ios" ? insets.top + 12 : 48;

  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  /* Matches emp ID, employee name, or (once the backend sends it)
     employeePhone — all case/spacing-insensitive. */
  const filteredSummary = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summary;

    return summary.filter((item) => {
      const empId = String(item.empId || "").toLowerCase();
      const name = String(item.employeeName || "").toLowerCase();
      const phone = String(item.employeePhone || "").replace(/\s+/g, "");
      const qDigits = q.replace(/\s+/g, "");

      return (
        empId.includes(q) ||
        name.includes(q) ||
        (qDigits.length > 0 && phone.includes(qDigits))
      );
    });
  }, [summary, search]);

  const loadSummary = async () => {
    try {
      setError("");
      const res = await fetch(`${BACKEND_URL}/daily-database/employees-summary`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load daily leads summary error:", err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSummary();
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#024e32" />

      {/* HEADER */}
      <View
        className="bg-[#024e32] px-5 pb-5 shadow-md"
        style={{ paddingTop: headerPaddingTop }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/admin");
              }
            }}
            className="p-1"
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <View className="ml-4">
            <Text className="text-white text-2xl font-bold">Daily Leads</Text>
            <Text className="text-green-100 text-xs mt-0.5">
              Tap an employee to view their entries
            </Text>
          </View>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 shadow-sm">
          <MaterialIcons name="search" size={20} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by emp ID, name or mobile number"
            placeholderTextColor="#9ca3af"
            className="flex-1 py-3 px-2 text-base text-gray-900"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <MaterialIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: 20,
          paddingTop: 8,
          paddingBottom: 40 + insets.bottom,
        }}
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
        {loading ? (
          <ActivityIndicator color="#024e32" style={{ marginTop: 40 }} />
        ) : error ? (
          <View className="py-20 items-center">
            <MaterialIcons name="error-outline" size={50} color="#dc2626" />
            <Text className="text-red-600 mt-4 text-base">{error}</Text>
            <TouchableOpacity
              onPress={loadSummary}
              className="bg-[#024e32] px-6 py-3 rounded-xl mt-4"
            >
              <Text className="text-white font-medium">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : summary.length === 0 ? (
          <View className="py-20 items-center">
            <MaterialIcons name="inbox" size={54} color="#ccc" />
            <Text className="text-gray-500 mt-4 text-base">
              No employee has submitted any leads yet
            </Text>
          </View>
        ) : filteredSummary.length === 0 ? (
          <View className="py-20 items-center">
            <MaterialIcons name="search-off" size={50} color="#ccc" />
            <Text className="text-gray-500 mt-4 text-base">
              No employee matches "{search}"
            </Text>
          </View>
        ) : (
          filteredSummary.map((item) => (
            <EmployeeSummaryCard key={item.empId} item={item} />
          ))
        )}

        {!loading && !error && <Footer />}
      </ScrollView>
    </View>
  );
}
