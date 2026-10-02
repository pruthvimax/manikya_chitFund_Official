import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import BACKEND_URL from "../../config";

/* Reads the real app version straight from app.json (expo.version),
   matching the same pattern used on the admin side's footers. */
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

/* =========================================================
   HOT / WARM / COLD selector (self-contained in this file —
   the admin edit screen, app/admin/dailyDatabaseDetail.tsx,
   has its own identical copy of this block. If you ever change
   the colors/icons/labels here, update both files to match.)
========================================================= */

type ActionType = "Hot" | "Warm" | "Cold";

const ACTION_CONFIG: Record<
  ActionType,
  { icon: any; colors: [string, string]; glow: string; label: string }
> = {
  Hot: {
    icon: "local-fire-department",
    colors: ["#ff6b4a", "#dc2626"],
    glow: "#ff5a3c",
    label: "HOT",
  },
  Warm: {
    icon: "wb-sunny",
    colors: ["#fcd34d", "#d97706"],
    glow: "#f59e0b",
    label: "WARM",
  },
  Cold: {
    icon: "ac-unit",
    colors: ["#7dd3fc", "#0369a1"],
    glow: "#38bdf8",
    label: "COLD",
  },
};

function ActionTile({
  type,
  selected,
  onPress,
}: {
  type: ActionType;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(selected ? 1.06 : 1)).current;
  const cfg = ACTION_CONFIG[type];

  useEffect(() => {
    Animated.spring(scale, {
      toValue: selected ? 1.06 : 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [selected, scale]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ flex: 1, marginHorizontal: 5 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={selected ? cfg.colors : ["#f3f4f6", "#e5e7eb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 18,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: selected ? cfg.glow : "transparent",
            shadowOpacity: selected ? 0.55 : 0,
            shadowRadius: selected ? 12 : 0,
            shadowOffset: { width: 0, height: 5 },
            elevation: selected ? 7 : 0,
            borderWidth: selected ? 0 : 1,
            borderColor: "#e5e7eb",
          }}
        >
          <MaterialIcons
            name={cfg.icon}
            size={28}
            color={selected ? "white" : "#9ca3af"}
          />
          <Text
            style={{
              marginTop: 6,
              fontWeight: "800",
              fontSize: 12,
              letterSpacing: 1.2,
              color: selected ? "white" : "#9ca3af",
            }}
          >
            {cfg.label}
          </Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

function ActionSelector({
  value,
  onChange,
}: {
  value: ActionType;
  onChange: (v: ActionType) => void;
}) {
  return (
    <View className="flex-row mt-1" style={{ marginHorizontal: -5 }}>
      {(Object.keys(ACTION_CONFIG) as ActionType[]).map((key) => (
        <ActionTile
          key={key}
          type={key}
          selected={value === key}
          onPress={() => onChange(key)}
        />
      ))}
    </View>
  );
}

function ActionBadge({ action }: { action: ActionType }) {
  const cfg = ACTION_CONFIG[action] || ACTION_CONFIG.Warm;
  return (
    <LinearGradient
      colors={cfg.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <MaterialIcons name={cfg.icon} size={13} color="white" />
      <Text className="text-white text-[10px] font-bold ml-1">{cfg.label}</Text>
    </LinearGradient>
  );
}

/* =========================================================
   EMPLOYEE - DAILY LEADS ("Daily Database")

   A simple field-visit lead form: employee enters the prospect's
   name, phone, occupation, where they work/their shop address,
   and their permanent address, then rates the lead Hot / Warm /
   Cold for follow-up priority.

   Employees can ADD entries and see their own list below the
   form, but cannot edit or delete once submitted — only the
   admin can (see app/admin/dailyDatabaseEmployees.tsx and
   app/admin/dailyDatabaseDetail.tsx).
========================================================= */

/* ================= FORM FIELD ================= */
function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  icon: any;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
        {label}
      </Text>
      <View
        className={`flex-row border border-gray-300 bg-white rounded-xl px-3 ${
          multiline ? "items-start py-1" : "items-center"
        }`}
      >
        <MaterialIcons
          name={icon}
          size={20}
          color="#6b7280"
          style={{ marginTop: multiline ? 10 : 0 }}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType || "default"}
          multiline={multiline}
          numberOfLines={multiline ? 2 : 1}
          textAlignVertical={multiline ? "top" : "center"}
          className="flex-1 py-3 text-base ml-2"
          style={multiline ? { minHeight: 56 } : undefined}
        />
      </View>
    </View>
  );
}

/* ================= FOOTER ================= */
function Footer() {
  return (
    <View className="mt-8 items-center border-t border-gray-200 pt-6">
      <View className="flex-row items-center mb-2">
        <MaterialIcons name="verified-user" size={16} color="#024e32" />
        <Text className="text-[#024e32] font-semibold text-sm ml-1">
          Employee Panel
        </Text>
      </View>
      <Text className="text-gray-400 text-xs">
        Your leads are synced in real time
      </Text>
      <Text className="text-gray-400 text-xs mt-1">
        © {new Date().getFullYear()} · v{APP_VERSION}
      </Text>
    </View>
  );
}

/* ================= ENTRY CARD (today's own entries) ================= */
function EntryCard({ entry }: { entry: any }) {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-gray-900 font-bold text-base flex-1" numberOfLines={1}>
          {entry.name}
        </Text>
        <ActionBadge action={(entry.action as ActionType) || "Warm"} />
      </View>

      <View className="flex-row items-center mt-2">
        <MaterialIcons name="call" size={14} color="#6b7280" />
        <Text className="text-gray-500 text-xs ml-1">{entry.phone}</Text>
        {!!entry.occupation && (
          <>
            <Text className="text-gray-300 mx-2">•</Text>
            <MaterialIcons name="work-outline" size={14} color="#6b7280" />
            <Text className="text-gray-500 text-xs ml-1">
              {entry.occupation}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/* ================= MAIN ================= */
export default function DailyDatabase() {
  const router = useRouter();

  const [empId, setEmpId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);

  const [entries, setEntries] = useState<any[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [action, setAction] = useState<ActionType>("Warm");

  const [submitting, setSubmitting] = useState(false);
  const [banner, setBanner] = useState("");
  const [bannerType, setBannerType] = useState<"success" | "error">("success");

  const flash = (text: string, type: "success" | "error" = "success") => {
    setBanner(text);
    setBannerType(type);
    setTimeout(() => setBanner(""), 3500);
  };

  const loadEntries = async (uid: string) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/daily-database/employee/${encodeURIComponent(uid)}`
      );
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load daily leads error:", err);
    } finally {
      setLoadingEntries(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const boot = async () => {
        const stored = await AsyncStorage.getItem("employee");
        if (!stored) {
          router.replace("/employee/login");
          return;
        }
        const parsed = JSON.parse(stored);
        if (!active) return;

        setEmpId(parsed?.emp_id || null);
        setEmployeeName(parsed?.name || "Employee");

        if (parsed?.emp_id) {
          await loadEntries(parsed.emp_id);
        } else {
          setLoadingEntries(false);
        }
      };

      boot();
      return () => {
        active = false;
      };
    }, [])
  );

  const onRefresh = () => {
    if (!empId) return;
    setRefreshing(true);
    loadEntries(empId);
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setOccupation("");
    setWorkAddress("");
    setPermanentAddress("");
    setAction("Warm");
  };

  const submitEntry = async () => {
    if (!empId || !employeeName) return;

    if (!name.trim() || !phone.trim()) {
      flash("Name and phone are required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/daily-database`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empId,
          employeeName,
          name: name.trim(),
          phone: phone.trim(),
          occupation: occupation.trim(),
          workAddress: workAddress.trim(),
          permanentAddress: permanentAddress.trim(),
          action,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        flash(data?.message || "Could not save entry", "error");
        return;
      }

      flash("✓ Lead saved successfully");
      resetForm();
      loadEntries(empId);
    } catch (err) {
      console.log("Submit daily lead error:", err);
      flash("Could not reach the server", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-gray-50"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f9fafb" }}>
        {/* HEADER */}
        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/employee");
                }
              }}
              className="mt-1"
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
              Daily Leads
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 130, paddingBottom: 40 }}
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
          <View className="px-5">
            {/* BANNER */}
            {banner ? (
              <View
                className={`mb-4 border rounded-xl py-3 px-4 ${
                  bannerType === "success"
                    ? "bg-green-50 border-green-400"
                    : "bg-red-50 border-red-400"
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    bannerType === "success" ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {banner}
                </Text>
              </View>
            ) : null}

            {/* FORM CARD */}
            <View className="bg-white rounded-3xl shadow-lg p-5 mb-6 border border-gray-100">
              <Text className="text-gray-900 font-bold text-lg mb-1">
                New Lead Entry
              </Text>
              <Text className="text-gray-400 text-xs mb-4">
                Fill in the details of the person you met today
              </Text>

              <FormField
                label="Full Name *"
                icon="person"
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
              />

              <FormField
                label="Phone Number *"
                icon="phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />

              <FormField
                label="Occupation"
                icon="work-outline"
                value={occupation}
                onChangeText={setOccupation}
                placeholder="e.g. Shop owner, Farmer, Teacher"
              />

              <FormField
                label="Work / Shop Address"
                icon="storefront"
                value={workAddress}
                onChangeText={setWorkAddress}
                placeholder="Enter work or shop address"
                multiline
              />

              <FormField
                label="Permanent Address"
                icon="home"
                value={permanentAddress}
                onChangeText={setPermanentAddress}
                placeholder="Enter permanent address"
                multiline
              />

              <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1 mt-1">
                Lead Rating
              </Text>
              <ActionSelector value={action} onChange={setAction} />

              <TouchableOpacity
                onPress={submitEntry}
                disabled={submitting}
                activeOpacity={0.85}
                style={{ borderRadius: 16, overflow: "hidden", marginTop: 20 }}
              >
                <LinearGradient
                  colors={["#024e32", "#016b44"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ padding: 16, opacity: submitting ? 0.7 : 1 }}
                >
                  {submitting ? (
                    <View className="flex-row items-center justify-center">
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-semibold ml-2">
                        Saving...
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center justify-center">
                      <MaterialIcons name="add-circle-outline" size={20} color="white" />
                      <Text className="text-white text-center font-bold text-base ml-2">
                        Save Lead
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* MY ENTRIES */}
            <Text className="text-gray-700 font-bold text-base mb-3">
              My Entries ({entries.length})
            </Text>

            {loadingEntries ? (
              <ActivityIndicator color="#024e32" style={{ marginTop: 10 }} />
            ) : entries.length === 0 ? (
              <View className="items-center py-10">
                <MaterialIcons name="inbox" size={44} color="#d1d5db" />
                <Text className="text-gray-400 mt-3 text-sm">
                  No leads added yet
                </Text>
              </View>
            ) : (
              entries.map((entry) => <EntryCard key={entry._id} entry={entry} />)
            )}

            <Text className="text-gray-400 text-[11px] text-center mt-2">
              Once saved, entries can only be edited or removed by the admin.
            </Text>

            <Footer />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
