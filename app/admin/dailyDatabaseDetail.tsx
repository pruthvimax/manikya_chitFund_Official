import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
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
   HOT / WARM / COLD selector (self-contained in this file —
   app/employee/dailyDatabase.tsx has its own identical copy.
   If you ever change the colors/icons/labels here, update
   both files to match.)
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
   ADMIN - DAILY LEADS (one employee's entries)

   Opened from app/admin/dailyDatabaseEmployees.tsx with the
   employee's empId + employeeName as route params. Admin can
   edit, delete, or print (PDF) this employee's leads. The
   employee who submitted them cannot edit or delete.
========================================================= */

/* entry.createdAt is set automatically by Mongoose (the
   DailyDatabase model has { timestamps: true }) the moment the
   employee submits the entry — no extra field needed, we just
   display it here for the admin. */
function formatAddedOn(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
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

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
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
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || "default"}
        multiline={multiline}
        numberOfLines={multiline ? 2 : 1}
        textAlignVertical={multiline ? "top" : "center"}
        className="border border-gray-300 bg-white rounded-xl px-3 py-3 text-base"
        style={multiline ? { minHeight: 56 } : undefined}
      />
    </View>
  );
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
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

      {!!entry.workAddress && (
        <View className="flex-row items-start mt-1.5">
          <MaterialIcons name="storefront" size={14} color="#6b7280" style={{ marginTop: 1 }} />
          <Text className="text-gray-500 text-xs ml-1 flex-1">
            {entry.workAddress}
          </Text>
        </View>
      )}

      {!!entry.permanentAddress && (
        <View className="flex-row items-start mt-1.5">
          <MaterialIcons name="home" size={14} color="#6b7280" style={{ marginTop: 1 }} />
          <Text className="text-gray-500 text-xs ml-1 flex-1">
            {entry.permanentAddress}
          </Text>
        </View>
      )}

      {!!entry.createdAt && (
        <View className="flex-row items-center mt-2 bg-gray-50 self-start px-2 py-1 rounded-lg">
          <MaterialIcons name="schedule" size={12} color="#9ca3af" />
          <Text className="text-gray-400 text-[10px] ml-1 font-medium">
            Added {formatAddedOn(entry.createdAt)}
          </Text>
        </View>
      )}

      <View className="flex-row mt-3 pt-3 border-t border-gray-100">
        <TouchableOpacity
          onPress={onEdit}
          className="flex-row items-center bg-gray-100 px-3 py-2 rounded-lg mr-2"
        >
          <MaterialIcons name="edit" size={16} color="#374151" />
          <Text className="text-gray-700 text-xs font-semibold ml-1">Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onDelete}
          className="flex-row items-center bg-red-50 px-3 py-2 rounded-lg"
        >
          <MaterialIcons name="delete-outline" size={16} color="#dc2626" />
          <Text className="text-red-600 text-xs font-semibold ml-1">Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DailyDatabaseDetail() {
  const router = useRouter();
  const { empId, employeeName } = useLocalSearchParams<{
    empId: string;
    employeeName: string;
  }>();

  /* Same header-safe-area fix used on EmployeeDetail.tsx and
     dailyDatabaseEmployees.tsx — plain View (not SafeAreaView) so
     the green header reaches the top edge on iOS, with the inset
     applied as the header's own paddingTop instead. */
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Platform.OS === "ios" ? insets.top + 12 : 48;

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  const [editTarget, setEditTarget] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editOccupation, setEditOccupation] = useState("");
  const [editWorkAddress, setEditWorkAddress] = useState("");
  const [editPermanentAddress, setEditPermanentAddress] = useState("");
  const [editAction, setEditAction] = useState<ActionType>("Warm");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState("");

  /* Search inside THIS employee's entries only — by the lead's
     name, phone number, or occupation. */
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;

    const qDigits = q.replace(/\s+/g, "");
    return entries.filter((entry) => {
      const name = String(entry.name || "").toLowerCase();
      const occupation = String(entry.occupation || "").toLowerCase();
      const phone = String(entry.phone || "").replace(/\s+/g, "");
      return (
        name.includes(q) ||
        occupation.includes(q) ||
        (qDigits.length > 0 && phone.includes(qDigits))
      );
    });
  }, [entries, search]);

  const loadEntries = async () => {
    if (!empId) return;
    try {
      setError("");
      const res = await fetch(
        `${BACKEND_URL}/daily-database/employee/${encodeURIComponent(empId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Load entries error:", err);
      setError("Could not connect to server");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [empId])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadEntries();
  };

  /* ================= EDIT ================= */
  const openEdit = (entry: any) => {
    setEditTarget(entry);
    setEditName(entry.name || "");
    setEditPhone(entry.phone || "");
    setEditOccupation(entry.occupation || "");
    setEditWorkAddress(entry.workAddress || "");
    setEditPermanentAddress(entry.permanentAddress || "");
    setEditAction((entry.action as ActionType) || "Warm");
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editName.trim() || !editPhone.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/daily-database/${editTarget._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          occupation: editOccupation.trim(),
          workAddress: editWorkAddress.trim(),
          permanentAddress: editPermanentAddress.trim(),
          action: editAction,
        }),
      });

      if (res.ok) {
        setEditTarget(null);
        loadEntries();
      }
    } catch (err) {
      console.log("Save edit error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ================= DELETE ================= */
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${BACKEND_URL}/daily-database/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeleteTarget(null);
        loadEntries();
      }
    } catch (err) {
      console.log("Delete entry error:", err);
    } finally {
      setDeleting(false);
    }
  };

  /* ================= PRINT (PDF) ================= */
  const printAllEntries = async () => {
    if (entries.length === 0) return;
    setPrinting(true);

    try {
      const ratingColor = (action: string) =>
        action === "Hot" ? "#dc2626" : action === "Cold" ? "#0369a1" : "#d97706";

      const rows = entries
        .map(
          (e) => `
            <tr>
              <td class="name">${e.name || ""}</td>
              <td class="nowrap">${e.phone || ""}</td>
              <td>${e.occupation || ""}</td>
              <td>${e.workAddress || ""}</td>
              <td>${e.permanentAddress || ""}</td>
              <td class="rating nowrap" style="color:${ratingColor(
                e.action
              )} !important;">${(e.action || "Warm").toUpperCase()}</td>
              <td class="added nowrap">${formatAddedOn(e.createdAt)}</td>
            </tr>`
        )
        .join("");

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <!-- This is the actual fix for the blue underlined phone
                 numbers / addresses: WebKit (used internally by
                 expo-print) auto-detects phone numbers, addresses and
                 dates in printed HTML and turns them into clickable
                 links with its own blue/underline styling that our CSS
                 can't override, because it injects its own <a> tag
                 around the text. This meta tag tells it not to. -->
            <meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no" />
            <style>
              * { box-sizing: border-box; }
              body {
                font-family: -apple-system, Helvetica, Arial, sans-serif;
                padding: 28px;
                color: #111827;
              }
              h1 { color: #024e32; margin: 0 0 4px 0; font-size: 20px; }
              .sub { color: #6b7280; font-size: 12px; margin-bottom: 18px; }

              table {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                border: 1px solid #e5e7eb;
              }

              th {
                background: #024e32;
                color: #ffffff;
                text-align: left;
                padding: 8px 6px;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                white-space: nowrap;
                border-right: 1px solid rgba(255, 255, 255, 0.25);
              }
              th:last-child { border-right: none; }

              th:nth-child(1) { width: 13%; }
              th:nth-child(2) { width: 11%; }
              th:nth-child(3) { width: 11%; }
              th:nth-child(4) { width: 20%; }
              th:nth-child(5) { width: 20%; }
              th:nth-child(6) { width: 10%; }
              th:nth-child(7) { width: 15%; }

              td {
                padding: 8px 6px;
                border-bottom: 1px solid #e5e7eb;
                border-right: 1px solid #e5e7eb;
                font-size: 11px;
                color: #111827;
                vertical-align: top;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
              td:last-child { border-right: none; }
              tr:nth-child(even) td { background: #f9fafb; }

              td.name { font-weight: 600; }
              td.rating { font-weight: bold; text-align: left; }
              td.added { color: #6b7280; font-size: 10px; }
              .nowrap { white-space: nowrap; }

              /* Belt-and-suspenders: if a phone/address still gets
                 auto-linked despite format-detection above, force it
                 back to plain text styling instead of the link blue. */
              a {
                color: inherit !important;
                text-decoration: none !important;
                pointer-events: none;
              }
            </style>
          </head>
          <body>
            <h1>Daily Leads — ${employeeName || ""}</h1>
            <div class="sub">Employee ID: ${empId || ""} · ${entries.length} entries · Generated ${new Date().toLocaleDateString()}</div>
            <table>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Occupation</th>
                <th>Work / Shop Address</th>
                <th>Permanent Address</th>
                <th>Rating</th>
                <th>Added</th>
              </tr>
              ${rows}
            </table>
          </body>
        </html>`;

      if (Platform.OS === "web") {
        /* Laptop / desktop: expo-print's web bridge (Print.printAsync)
           silently does nothing in some browsers / preview setups —
           that's the "nothing happens" bug you saw. Instead we open a
           dedicated print window ourselves and call the browser's own
           window.print() on it directly. That always shows the native
           print dialog, where "Save as PDF" gives the exact same PDF
           the phones produce. */
        // @ts-ignore - window only exists on web
        const printWindow = window.open("", "_blank", "width=900,height=700");

        if (!printWindow) {
          Alert.alert(
            "Pop-up blocked",
            "Your browser blocked the print window. Please allow pop-ups for this site and tap Print again."
          );
          return;
        }

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();

        const triggerPrint = () => {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (e) {
            console.log("Web print trigger failed:", e);
          }
        };
        printWindow.onload = triggerPrint;
        // Safety net — not every browser fires onload reliably here.
        setTimeout(triggerPrint, 400);
        return;
      }

      /* iOS / Android: render a real PDF file, then hand it to the
         native share sheet so the admin can save, print to an
         AirPrint/Android printer, or send it via WhatsApp/email. */
      try {
        const { uri } = await Print.printToFileAsync({ html });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Daily Leads - ${employeeName}`,
          });
        } else {
          // No share sheet on this device — fall back to the direct
          // system print dialog below instead of leaving the admin
          // with nothing.
          await Print.printAsync({ html });
        }
      } catch (nativeErr) {
        /* Some older / heavily customized Android builds (old Vivo
           FunTouch OS, etc. on Android versions whose System WebView
           is outdated) fail to render a PDF file this way. This is a
           genuine device limitation — Android's own Print framework
           is what's missing or broken, not something our app can
           patch around. Print.printAsync uses a different internal
           path and succeeds on some of those devices where file
           generation doesn't, so we try it as a second attempt before
           telling the admin printing isn't possible on that phone. */
        console.log("PDF file generation failed, trying direct print:", nativeErr);
        try {
          await Print.printAsync({ html });
        } catch (fallbackErr) {
          console.log("Direct print also failed:", fallbackErr);
          Alert.alert(
            "Couldn't print on this device",
            "This phone's print service isn't working. Try again from a newer phone, a laptop, or a desktop browser."
          );
        }
      }
    } catch (err) {
      console.log("Print error:", err);
      Alert.alert("Couldn't print", "Something went wrong while preparing the PDF. Please try again.");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#024e32" />

      {/* HEADER */}
      <View
        className="bg-[#024e32] px-5 pb-5 shadow-md"
        style={{ paddingTop: headerPaddingTop }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/admin/dailyDatabaseEmployees");
                }
              }}
              className="p-1"
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <View className="ml-4 flex-1">
              <Text className="text-white text-xl font-bold" numberOfLines={1}>
                {employeeName}
              </Text>
              <Text className="text-green-100 text-xs mt-0.5">
                ID: {empId} · {entries.length} entries
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={printAllEntries}
            disabled={printing || entries.length === 0}
            className="bg-white/20 px-3 py-2 rounded-lg flex-row items-center ml-2"
            style={{ opacity: entries.length === 0 ? 0.5 : 1 }}
          >
            {printing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <MaterialIcons name="print" size={18} color="white" />
                <Text className="text-white text-xs font-semibold ml-1">
                  Print
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH BAR */}
      {!loading && !error && entries.length > 0 && (
        <View className="px-5 pt-4 pb-1">
          <View className="flex-row items-center bg-white border border-gray-200 rounded-2xl px-4 shadow-sm">
            <MaterialIcons name="search" size={20} color="#9ca3af" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name, phone or occupation"
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
      )}

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
              onPress={loadEntries}
              className="bg-[#024e32] px-6 py-3 rounded-xl mt-4"
            >
              <Text className="text-white font-medium">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : entries.length === 0 ? (
          <View className="py-20 items-center">
            <MaterialIcons name="inbox" size={54} color="#ccc" />
            <Text className="text-gray-500 mt-4 text-base">
              No entries from this employee yet
            </Text>
          </View>
        ) : filteredEntries.length === 0 ? (
          <View className="py-20 items-center">
            <MaterialIcons name="search-off" size={50} color="#ccc" />
            <Text className="text-gray-500 mt-4 text-base">
              No entry matches "{search}"
            </Text>
          </View>
        ) : (
          filteredEntries.map((entry) => (
            <EntryCard
              key={entry._id}
              entry={entry}
              onEdit={() => openEdit(entry)}
              onDelete={() => setDeleteTarget(entry)}
            />
          ))
        )}

        {!loading && !error && <Footer />}
      </ScrollView>

      {/* ========== EDIT MODAL ========== */}
      <Modal
        visible={!!editTarget}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!saving) setEditTarget(null);
        }}
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-4">
          <View
            className="bg-white w-full max-w-md rounded-3xl overflow-hidden"
            style={{ maxHeight: "90%" }}
          >
            <View className="bg-[#024e32] px-6 py-5">
              <Text className="text-white text-lg font-bold">Edit Lead</Text>
              <Text className="text-green-100 text-xs mt-0.5">
                Update this lead's details below
              </Text>
            </View>

            <ScrollView
              className="px-6 pt-5"
              style={{ flexGrow: 0, flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FormField
                label="Full Name *"
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
              />
              <FormField
                label="Phone Number *"
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
              <FormField
                label="Occupation"
                value={editOccupation}
                onChangeText={setEditOccupation}
                placeholder="Occupation"
              />
              <FormField
                label="Work / Shop Address"
                value={editWorkAddress}
                onChangeText={setEditWorkAddress}
                placeholder="Work or shop address"
                multiline
              />
              <FormField
                label="Permanent Address"
                value={editPermanentAddress}
                onChangeText={setEditPermanentAddress}
                placeholder="Permanent address"
                multiline
              />

              <View className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mt-1">
                <Text className="text-gray-700 text-sm font-semibold mb-3 ml-1">
                  Lead Rating
                </Text>
                <ActionSelector value={editAction} onChange={setEditAction} />
              </View>
            </ScrollView>

            <View className="px-6 py-5 border-t border-gray-100">
              <TouchableOpacity
                onPress={saveEdit}
                disabled={saving}
                className="bg-[#024e32] py-4 rounded-2xl"
                style={{ opacity: saving ? 0.7 : 1 }}
              >
                <Text className="text-white text-center font-bold text-base">
                  {saving ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditTarget(null)}
                disabled={saving}
                className="mt-3 py-4 rounded-2xl bg-gray-100"
              >
                <Text className="text-gray-700 text-center font-semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== DELETE CONFIRM MODAL ========== */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      >
        <Pressable
          onPress={() => !deleting && setDeleteTarget(null)}
          className="flex-1 bg-black/60 justify-center items-center px-6"
        >
          <Pressable onPress={(e) => e.stopPropagation()} className="w-full max-w-sm">
            <View className="bg-white rounded-3xl p-7">
              <View className="w-16 h-16 rounded-full bg-red-100 self-center items-center justify-center mb-4">
                <MaterialIcons name="delete-outline" size={32} color="#dc2626" />
              </View>
              <Text className="text-center text-xl font-bold text-gray-900">
                Delete this entry?
              </Text>
              <Text className="text-center text-gray-500 text-sm mt-2 leading-5">
                {deleteTarget?.name}'s lead entry will be permanently removed.
                This cannot be undone.
              </Text>

              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deleting}
                className="bg-red-600 py-4 rounded-2xl mt-6"
                style={{ opacity: deleting ? 0.7 : 1 }}
              >
                <Text className="text-white text-center font-bold text-base">
                  {deleting ? "Deleting..." : "Yes, delete"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setDeleteTarget(null)}
                disabled={deleting}
                className="mt-3 py-4 rounded-2xl bg-gray-100"
              >
                <Text className="text-gray-700 text-center font-semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
