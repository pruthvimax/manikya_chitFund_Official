import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Linking,
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
import {
  FollowUpChip,
  FollowUpDateField,
  followUpState,
  formatFollowUp,
  daysBetween,
  todayStr,
} from "../../components/followUp";

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
  maxLength,
}: {
  label: string;
  icon: any;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: "default" | "phone-pad";
  multiline?: boolean;
  maxLength?: number;
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
          maxLength={maxLength}
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

/* FIXED: tap-to-call for the phone number shown on each entry card.
   Always asks for confirmation BEFORE opening the dialer -- never
   dials straight away. Same pattern as app/admin/dailyDatabaseDetail.tsx. */
function handleCallPress(phone: string) {
  if (!phone) return;

  if (Platform.OS === "web") {
    // @ts-ignore - window only exists on web
    const confirmed = window.confirm(`Call ${phone}?`);
    if (confirmed) {
      Linking.openURL(`tel:${phone}`);
    }
    return;
  }

  Alert.alert("Call this number?", phone, [
    { text: "Cancel", style: "cancel" },
    { text: "Call", onPress: () => Linking.openURL(`tel:${phone}`) },
  ]);
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
        <TouchableOpacity
          onPress={() => handleCallPress(entry.phone)}
          disabled={!entry.phone}
          activeOpacity={0.6}
          hitSlop={8}
          className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg"
        >
          <MaterialIcons name="call" size={14} color="#024e32" />
          <Text className="text-[#024e32] text-xs ml-1 font-semibold">
            {entry.phone}
          </Text>
        </TouchableOpacity>
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

      {/* Telephone Number -- only shown when this entry actually has
          one (it's optional). Same tap-to-call confirm-first behavior
          as the Phone Number above. */}
      {!!entry.telephone && (
        <View className="flex-row items-center mt-1.5">
          <TouchableOpacity
            onPress={() => handleCallPress(entry.telephone)}
            activeOpacity={0.6}
            hitSlop={8}
            className="flex-row items-center bg-blue-50 px-2 py-1 rounded-lg"
          >
            <MaterialIcons name="dialpad" size={14} color="#1d4ed8" />
            <Text className="text-blue-700 text-xs ml-1 font-semibold">
              {entry.telephone}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Follow-up date status (only when this lead has one) */}
      {!!entry.followUpDate && (
        <View className="flex-row mt-2">
          <FollowUpChip entry={entry} />
        </View>
      )}
    </View>
  );
}

/* ================= FOLLOW-UP DUE CARD =================
   Shown in the "Follow-ups due" list at the top: the lead's follow-up
   date is today or already passed and it is not marked done yet. The
   employee can only mark it done -- changing the date is admin-only. */
function DueFollowUpCard({
  entry,
  onDone,
  marking,
}: {
  entry: any;
  onDone: () => void;
  marking: boolean;
}) {
  const today = todayStr();
  const overdueDays = daysBetween(entry.followUpDate, today);
  const isToday = overdueDays <= 0;

  return (
    <View
      className="bg-white rounded-2xl p-4 mb-3 border"
      style={{ borderColor: isToday ? "#fdba74" : "#fca5a5" }}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-gray-900 font-bold text-base flex-1" numberOfLines={1}>
          {entry.name}
        </Text>
        <View
          className="px-2 py-1 rounded-full"
          style={{ backgroundColor: isToday ? "#ffedd5" : "#fee2e2" }}
        >
          <Text
            style={{
              color: isToday ? "#c2410c" : "#b91c1c",
              fontSize: 10,
              fontWeight: "800",
            }}
          >
            {isToday
              ? "TODAY"
              : `OVERDUE ${overdueDays} DAY${overdueDays === 1 ? "" : "S"}`}
          </Text>
        </View>
      </View>

      <Text className="text-gray-500 text-xs mt-1">
        Follow-up date: {formatFollowUp(entry.followUpDate)}
      </Text>

      <View className="flex-row items-center mt-2">
        <TouchableOpacity
          onPress={() => handleCallPress(entry.phone)}
          disabled={!entry.phone}
          activeOpacity={0.6}
          hitSlop={8}
          className="flex-row items-center bg-green-50 px-2 py-1 rounded-lg"
        >
          <MaterialIcons name="call" size={14} color="#024e32" />
          <Text className="text-[#024e32] text-xs ml-1 font-semibold">
            {entry.phone}
          </Text>
        </TouchableOpacity>
        {!!entry.occupation && (
          <>
            <Text className="text-gray-300 mx-2">•</Text>
            <Text className="text-gray-500 text-xs">{entry.occupation}</Text>
          </>
        )}
      </View>

      <TouchableOpacity
        onPress={onDone}
        disabled={marking}
        activeOpacity={0.85}
        className="flex-row items-center justify-center bg-[#024e32] rounded-xl py-3 mt-3"
        style={{ opacity: marking ? 0.6 : 1 }}
      >
        {marking ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <MaterialIcons name="check-circle" size={18} color="white" />
            <Text className="text-white font-bold text-sm ml-2">Mark done</Text>
          </>
        )}
      </TouchableOpacity>
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
  const [telephone, setTelephone] = useState("");
  const [occupation, setOccupation] = useState("");
  const [workAddress, setWorkAddress] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [action, setAction] = useState<ActionType>("Warm");
  const [followUpDate, setFollowUpDate] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

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

  // FIXED: Phone Number was plain free text before -- it silently
  // accepted letters and any length. This strips anything that isn't a
  // digit on every keystroke and hard-caps it at 10 characters, so only
  // a clean 10-digit mobile number can ever land in this field (not just
  // a soft keyboard hint that a user could still paste letters into).
  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 10);
    setPhone(digitsOnly);
  };

  // Telephone Number is the new OPTIONAL field for landline / telephone
  // numbers that don't fit the strict 10-digit mobile format above --
  // still digits-only (no alphabets allowed), just not capped at 10
  // since landline numbers (with STD codes) can run longer.
  const handleTelephoneChange = (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 15);
    setTelephone(digitsOnly);
  };

  const resetForm = () => {
    setName("");
    setPhone("");
    setTelephone("");
    setOccupation("");
    setWorkAddress("");
    setPermanentAddress("");
    setAction("Warm");
    setFollowUpDate("");
  };

  /* Mark one due follow-up as done (employee can only do this; the date
     itself can only be changed by the admin). Asks first. */
  const markFollowUpDone = (entry: any) => {
    if (!empId) return;

    const run = async () => {
      setMarkingId(entry._id);
      try {
        const res = await fetch(
          `${BACKEND_URL}/daily-database/follow-ups/${entry._id}/done`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ empId }),
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          flash(data?.message || "Could not mark as done", "error");
          return;
        }
        flash("✓ Follow-up marked as done");
        loadEntries(empId);
      } catch (err) {
        console.log("Mark follow-up done error:", err);
        flash("Could not reach the server", "error");
      } finally {
        setMarkingId(null);
      }
    };

    if (Platform.OS === "web") {
      // @ts-ignore - window only exists on web
      if (window.confirm(`Mark follow-up with ${entry.name} as done?`)) run();
      return;
    }
    Alert.alert("Mark as done?", `Follow-up with ${entry.name}`, [
      { text: "Cancel", style: "cancel" },
      { text: "Mark done", onPress: run },
    ]);
  };

  // follow-ups whose date is today or already passed, not done yet
  const dueFollowUps = entries
    .filter((e) => {
      const s = followUpState(e);
      return s === "today" || s === "overdue";
    })
    .sort((a, b) =>
      String(a.followUpDate).localeCompare(String(b.followUpDate))
    );

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
          telephone: telephone.trim(),
          occupation: occupation.trim(),
          workAddress: workAddress.trim(),
          permanentAddress: permanentAddress.trim(),
          action,
          followUpDate,
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

            {/* FOLLOW-UPS DUE (today / overdue, not done) */}
            {dueFollowUps.length > 0 && (
              <View className="mb-6">
                <View className="flex-row items-center mb-3">
                  <MaterialIcons name="notifications-active" size={20} color="#dc2626" />
                  <Text className="text-red-600 font-bold text-base ml-2 flex-1">
                    Follow-ups due
                  </Text>
                  <View className="bg-red-600 rounded-full px-2.5 py-0.5">
                    <Text className="text-white text-xs font-bold">
                      {dueFollowUps.length}
                    </Text>
                  </View>
                </View>
                {dueFollowUps.map((entry) => (
                  <DueFollowUpCard
                    key={entry._id}
                    entry={entry}
                    marking={markingId === entry._id}
                    onDone={() => markFollowUpDone(entry)}
                  />
                ))}
              </View>
            )}

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
                onChangeText={handlePhoneChange}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <FormField
                label="Telephone Number (optional)"
                icon="dialpad"
                value={telephone}
                onChangeText={handleTelephoneChange}
                placeholder="Enter landline / telephone number"
                keyboardType="phone-pad"
                maxLength={15}
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

              <FollowUpDateField
                label="Follow-up Date (optional)"
                value={followUpDate}
                onChange={setFollowUpDate}
                minToday
                hint="If the customer asked you to call back on a date, pick it here. You will get a reminder on that day."
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