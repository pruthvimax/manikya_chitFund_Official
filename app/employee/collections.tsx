import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  AppState,
  BackHandler,
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import BACKEND_URL from "../../config.js";

// =========================================================
// SCREENSHOT PREVENTION FOR ALL PLATFORMS
// =========================================================

let ScreenCapture: any = null;

try {
  const module = require("expo-screen-capture");
  ScreenCapture = module.default || module;
} catch (error) {
  console.log("expo-screen-capture not available");
}

const preventScreenshot = async () => {
  try {
    // Admin exemption. While an admin session is active on this
    // device the app leaves screen capture ENABLED, so only an
    // admin can screenshot. Every other user stays blocked.
    if ((await AsyncStorage.getItem("adminSession")) === "true") {
      await allowScreenshot();
      return;
    }

    if (ScreenCapture && typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
      await ScreenCapture.preventScreenCaptureAsync();
      console.log("✅ Screenshots prevented (expo-screen-capture)");
      return;
    }

    if (Platform.OS === "android") {
      try {
        const { NativeModules } = require("react-native");
        const { SecureViewManager } = NativeModules;
        if (SecureViewManager?.setSecure) {
          await SecureViewManager.setSecure(true);
          console.log("✅ Screenshots prevented (native)");
        }
      } catch (error) {
        console.log("Native SecureViewManager not available");
      }
    }
  } catch (error) {
    console.log("Screenshot prevention error:", error);
  }
};

const allowScreenshot = async () => {
  try {
    if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
      await ScreenCapture.allowScreenCaptureAsync();
      console.log("✅ Screenshots allowed (expo-screen-capture)");
      return;
    }

    if (Platform.OS === "android") {
      try {
        const { NativeModules } = require("react-native");
        const { SecureViewManager } = NativeModules;
        if (SecureViewManager?.setSecure) {
          await SecureViewManager.setSecure(false);
          console.log("✅ Screenshots allowed (native)");
        }
      } catch (error) {
        console.log("Native SecureViewManager not available");
      }
    }
  } catch (error) {
    console.log("Screenshot allow error:", error);
  }
};

/* =====================================================
    TUNABLES
===================================================== */

const GROUPS_CACHE_KEY = "employee:groups:cache:v1";

// NEW: cached member index so member search is instant on
// the second visit, same stale-while-revalidate idea as groups.
const MEMBERS_CACHE_KEY = "employee:members:cache:v1";

// Was 3000. Every tick is a network round-trip; 15s is still
// near-instant for an admin toggle but ~5x less traffic and wake-ups.
const FEATURE_POLL_MS = 15000;

// Typing no longer re-filters the list on every keystroke.
const SEARCH_DEBOUNCE_MS = 180;

// Measured height of one group card including its mb-4 gap.
// Lets FlatList skip measuring every row. If you ever change the card
// layout and see gaps while scrolling, just delete the getItemLayout
// prop below — nothing else depends on this number.
const CARD_HEIGHT = 120;

const CURRENT_YEAR = new Date().getFullYear();

/* =====================================================
    SKELETON LOADING
    Hoisted out of the screen component: defining it inline
    created a brand-new component type on every render, which
    forced React to throw away and rebuild the whole subtree.
===================================================== */

const GroupSkeleton = memo(function GroupSkeleton() {
  return (
    <View className="flex-1">

      {/* ================= SKELETON SEARCH ================= */}

      <View className="bg-white rounded-2xl p-5 mb-5 border border-gray-100">

        {/* Search title skeleton */}
        <View className="flex-row items-center mb-3">

          <View className="w-6 h-6 bg-gray-200 rounded-full" />

          <View className="h-5 w-36 bg-gray-200 rounded ml-2" />

        </View>

        {/* Search input skeleton */}
        <View className="bg-gray-100 rounded-xl h-12 w-full" />

        {/* Count skeleton */}
        <View className="h-4 w-28 bg-gray-200 rounded mt-3" />

      </View>

      {/* ================= SKELETON GROUP CARDS ================= */}

      <View className="px-4">

        {[1, 2, 3, 4].map((item) => (
          <View
            key={item}
            className="bg-white rounded-2xl p-5 mb-4 border border-gray-100"
          >

            <View className="flex-row justify-between items-center">

              <View className="flex-1">

                {/* Group ID */}
                <View className="h-5 w-32 bg-gray-200 rounded mb-3" />

                {/* Chit ID */}
                <View className="h-4 w-28 bg-gray-200 rounded mb-2" />

                {/* Months / Members */}
                <View className="h-4 w-40 bg-gray-200 rounded" />

              </View>

              {/* Arrow */}
              <View className="w-7 h-7 bg-gray-200 rounded-full" />

            </View>

          </View>
        ))}

      </View>

    </View>
  );
});

/* ================= FOOTER ================= */

const Footer = memo(function Footer() {
  return (
    <View className="mt-6 mb-2">

      <View className="border-t border-gray-200 pt-4 items-center">

        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>

        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Collection
        </Text>

        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {CURRENT_YEAR} Manikya Chits Pvt Ltd.
          All rights reserved.
        </Text>

      </View>

    </View>
  );
});

// Built once, not re-created on every render of the screen.
const FOOTER_ELEMENT = <Footer />;

/* ================= GROUP CARD ================= */

type GroupCardProps = {
  item: any;
  onPress: (groupId: string) => void;
};

const GroupCard = memo(function GroupCard({ item, onPress }: GroupCardProps) {
  const handlePress = useCallback(
    () => onPress(item.groupId),
    [item.groupId, onPress]
  );

  return (
    <TouchableOpacity
      onPress={handlePress}

      className="bg-white rounded-2xl p-5 mb-4 border border-gray-100"

      activeOpacity={0.9}
    >

      <View className="flex-row justify-between items-center">

        <View className="flex-1">

          <Text className="text-lg font-bold text-gray-800">
            {item.groupId}
          </Text>

          <Text className="text-gray-600">
            Chit ID: {item.chitId}
          </Text>

          <Text className="text-gray-500 text-sm">
            {item.totalCollections} months ·{" "}
            {item.memberCount || 0} members
          </Text>

        </View>

        <MaterialIcons
          name="chevron-right"
          size={28}
          color="#024e32"
        />

      </View>

    </TouchableOpacity>
  );
});

/* =====================================================
    MEMBER RESULT CARD  (NEW)

    Shown when the employee searches by member name,
    Group Member ID or phone. Every card states which
    GROUP the member belongs to plus the Group Member ID,
    so two members with the same name are never confused.
===================================================== */

type MemberCardProps = {
  item: any;
  onPress: (groupId: string, groupMemberId: string) => void;
};

const MemberCard = memo(function MemberCard({ item, onPress }: MemberCardProps) {
  const handlePress = useCallback(
    () => onPress(item.groupId, item.groupMemberId),
    [item.groupId, item.groupMemberId, onPress]
  );

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="bg-white rounded-2xl p-4 mb-3 border border-[#024e32]/20"
      activeOpacity={0.9}
    >

      <View className="flex-row items-center">

        {/* AVATAR */}
        <View className="w-11 h-11 rounded-full bg-[#024e32]/10 items-center justify-center mr-3">
          <MaterialIcons name="person" size={22} color="#024e32" />
        </View>

        <View className="flex-1">

          <Text className="text-base font-bold text-gray-800">
            {item.memberName || "Unknown"}
          </Text>

          {/* WHICH GROUP + WHICH TICKET - this is what avoids confusion */}
          <View className="flex-row flex-wrap items-center mt-1">

            <View className="bg-[#024e32] rounded-md px-2 py-0.5 mr-2 mb-1">
              <Text className="text-white text-[11px] font-bold">
                {item.groupId}
              </Text>
            </View>

            <View className="bg-amber-100 rounded-md px-2 py-0.5 mr-2 mb-1">
              <Text className="text-amber-800 text-[11px] font-bold">
                {item.groupMemberId}
              </Text>
            </View>

            {item.chitId ? (
              <View className="bg-gray-100 rounded-md px-2 py-0.5 mb-1">
                <Text className="text-gray-700 text-[11px] font-medium">
                  Chit {item.chitId}
                </Text>
              </View>
            ) : null}

          </View>

          <Text className="text-gray-500 text-xs mt-0.5">
            Phone: {item.phone || "-"}
          </Text>

        </View>

        <MaterialIcons
          name="chevron-right"
          size={26}
          color="#024e32"
        />

      </View>

    </TouchableOpacity>
  );
});

/* ================= HELPERS ================= */

const keyExtractor = (item: any) => item.groupId;

const getItemLayout = (_data: any, index: number) => ({
  length: CARD_HEIGHT,
  offset: CARD_HEIGHT * index,
  index,
});

/** Cheap equality check so an unchanged refetch doesn't re-render the list. */
const sameGroups = (a: any[], b: any[]) => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.groupId !== y.groupId ||
      x.chitId !== y.chitId ||
      x.totalCollections !== y.totalCollections ||
      x.memberCount !== y.memberCount
    ) {
      return false;
    }
  }
  return true;
};

/* =====================================================
    SCREEN
===================================================== */

export default function EmployeeCollection() {
  const router = useRouter();

  // =========================================================
  // SCREENSHOT PREVENTION
  // =========================================================

  useEffect(() => {
    preventScreenshot();
    return () => {
      allowScreenshot();
    };
  }, []);

  // =========================================================
  // WEB SCREENSHOT DETECTION
  // =========================================================

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "PrintScreen") {
          e.preventDefault();
          Alert.alert(
            "Screenshot Blocked",
            "Screenshots are not allowed for security reasons."
          );
        }
      };

      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        Alert.alert(
          "Action Blocked",
          "Right-click is disabled for security reasons."
        );
      };

      const handleDevTools = (e: KeyboardEvent) => {
        if (
          (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) ||
          (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) ||
          (e.ctrlKey && e.key === "U") ||
          (e.ctrlKey && e.key === "u") ||
          (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c"))
        ) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Developer tools are disabled for security reasons."
          );
        }
      };

      const handleSave = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Save is disabled for security reasons."
          );
        }
      };

      const handlePrint = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Print is disabled for security reasons."
          );
        }
      };

      const handleCopy = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Copy is disabled for security reasons."
          );
        }
      };

      const handleCut = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "x" || e.key === "X")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Cut is disabled for security reasons."
          );
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("contextmenu", handleContextMenu);
      document.addEventListener("keydown", handleDevTools);
      document.addEventListener("keydown", handleSave);
      document.addEventListener("keydown", handlePrint);
      document.addEventListener("keydown", handleCopy);
      document.addEventListener("keydown", handleCut);

      document.addEventListener("dragstart", (e) => {
        e.preventDefault();
      });

      const style = document.createElement("style");
      style.textContent = `
                body {
                    user-select: none !important;
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                }
                img {
                    -webkit-user-drag: none !important;
                    user-drag: none !important;
                    pointer-events: none !important;
                }
                @media print {
                    body { display: none !important; }
                    * { display: none !important; }
                }
                * {
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                }
            `;
      document.head.appendChild(style);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("contextmenu", handleContextMenu);
        document.removeEventListener("keydown", handleDevTools);
        document.removeEventListener("keydown", handleSave);
        document.removeEventListener("keydown", handlePrint);
        document.removeEventListener("keydown", handleCopy);
        document.removeEventListener("keydown", handleCut);
        document.removeEventListener("dragstart", (e) => {
          e.preventDefault();
        });
        document.head.removeChild(style);
      };
    }
  }, []);

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // NEW: flat list of every member of every group, used only for search
  const [memberIndex, setMemberIndex] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  // `search` drives the input (instant feedback).
  // `query` is the debounced value that actually filters.
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const empIdRef = useRef<string | null>(null);

  /* ================= EMPLOYEE SESSION + FEATURE GUARD ================= */

  // AsyncStorage was being read and JSON.parsed on every single poll.
  // Read it once, then keep the id in a ref.
  const readEmployeeId = useCallback(async () => {
    if (empIdRef.current) return empIdRef.current;

    const stored = await AsyncStorage.getItem("employee");
    if (!stored) return null;

    try {
      empIdRef.current = JSON.parse(stored)?.emp_id ?? null;
    } catch {
      empIdRef.current = null;
    }

    return empIdRef.current;
  }, []);

  const checkSessionAndFeature = useCallback(
    async (signal?: AbortSignal) => {
      const empId = await readEmployeeId();

      if (!empId) {
        router.replace("/employee/login");
        return false;
      }

      try {
        /*
          FIXED:
          was `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/employee/...`
          which resolved to "undefined/api/..." and always failed.
          BACKEND_URL already ends with /api, so no /api here.
        */
        const res = await fetch(
          `${BACKEND_URL}/employee/check-status/${empId}`,
          { signal }
        );

        const data = await res.json();

        // 🔥 BLOCK IF ADMIN DISABLED
        if (!data.featureAccess) {
          Alert.alert(
            "Access Denied",
            "Collection is disabled by admin"
          );

          router.replace("/employee");
          return false;
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.log("Feature check failed", err);
        }
      }

      return true;
    },
    [readEmployeeId, router]
  );

  // useFocusEffect instead of useEffect: expo-router keeps screens mounted
  // when you navigate away, so the old setInterval kept hammering the API
  // from a screen nobody was looking at. This stops on blur and on
  // backgrounding, and resumes on return.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const controller = new AbortController();

      // setTimeout chain, not setInterval: a slow response can never
      // stack up overlapping requests.
      const tick = async () => {
        if (cancelled) return;

        const ok = await checkSessionAndFeature(controller.signal);
        if (cancelled || !ok) return;

        timer = setTimeout(tick, FEATURE_POLL_MS);
      };

      tick();

      const appStateSub = AppState.addEventListener("change", (state) => {
        if (cancelled) return;

        if (timer) clearTimeout(timer);
        if (state === "active") tick();
      });

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          router.replace("/employee");
          return true;
        }
      );

      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
        controller.abort();
        appStateSub.remove();
        backHandler.remove();
      };
    }, [checkSessionAndFeature, router])
  );

  /* ================= END SESSION GUARD ================= */

  /* ================= FETCH GROUPS ================= */

  // Stale-while-revalidate: paint whatever we saw last time immediately,
  // then quietly refresh from the network. This is what removes the
  // 2-3 second blank/skeleton wait on every visit after the first.
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const load = async () => {
      // 1. instant paint from cache
      try {
        const cached = await AsyncStorage.getItem(GROUPS_CACHE_KEY);

        if (cached && alive) {
          const parsed = JSON.parse(cached);

          if (Array.isArray(parsed) && parsed.length > 0) {
            setGroups(parsed);
            setLoading(false);
          }
        }
      } catch {
        // a bad cache entry is never fatal — fall through to the network
      }

      // 2. revalidate in the background
      try {
        const res = await fetch(`${BACKEND_URL}/groups`, {
          signal: controller.signal,
        });

        const data = await res.json();
        if (!alive) return;

        const list = Array.isArray(data) ? data : [];

        setGroups((prev) => (sameGroups(prev, list) ? prev : list));

        AsyncStorage.setItem(
          GROUPS_CACHE_KEY,
          JSON.stringify(list)
        ).catch(() => {});
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("❌ Failed to fetch groups", err);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  /* =====================================================
      BUILD MEMBER SEARCH INDEX  (NEW)

      There is no "all members" endpoint, so this calls the
      SAME endpoint groupMembers.tsx uses -
      /groups/:groupId/members - once per group, and flattens
      the results into one searchable list.

      Cached, and refreshed quietly in the background, so the
      group list never waits for it.
  ===================================================== */

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    const loadMembers = async () => {
      // 1. instant index from cache
      try {
        const cached = await AsyncStorage.getItem(MEMBERS_CACHE_KEY);

        if (cached && alive) {
          const parsed = JSON.parse(cached);

          if (Array.isArray(parsed) && parsed.length > 0) {
            setMemberIndex(parsed);
          }
        }
      } catch {
        // bad cache is never fatal
      }

      if (!groups.length) return;

      // 2. refresh from the network, one request per group
      setMembersLoading(true);

      try {
        const results = await Promise.all(
          groups.map(async (group: any) => {
            try {
              const res = await fetch(
                `${BACKEND_URL}/groups/${group.groupId}/members`,
                { signal: controller.signal }
              );

              const data = await res.json();

              const list = Array.isArray(data?.groupMembers)
                ? data.groupMembers
                : [];

              return list.map((m: any) => ({
                key: `${group.groupId}-${m.groupMemberId}`,
                groupId: group.groupId,
                chitId: group.chitId,
                groupMemberId: String(m.groupMemberId || ""),
                memberName: m.memberName || "",
                phone: String(m.phone || ""),

                // lowercased once here instead of on every keystroke
                searchText: [
                  m.memberName || "",
                  m.groupMemberId || "",
                  m.phone || "",
                  m.memberId || "",
                ]
                  .join(" ")
                  .toLowerCase(),
              }));
            } catch {
              return [];
            }
          })
        );

        if (!alive) return;

        const flat = results.flat();

        setMemberIndex(flat);

        AsyncStorage.setItem(
          MEMBERS_CACHE_KEY,
          JSON.stringify(flat)
        ).catch(() => {});
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.log("Member index load failed", err);
        }
      } finally {
        if (alive) setMembersLoading(false);
      }
    };

    loadMembers();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [groups]);

  /* ================= SEARCH ================= */

  // Debounce: typing "MC1001" used to run 6 full filters + 6 list re-renders.
  useEffect(() => {
    const id = setTimeout(() => setQuery(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  // Lowercase once per data change instead of once per group per keystroke.
  const searchIndex = useMemo(
    () => groups.map((g) => (g.groupId ?? "").toLowerCase()),
    [groups]
  );

  // Derived, not duplicated in state — no second copy of the list to keep
  // in sync, and no extra render pass when it changes.
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;

    const out: any[] = [];
    for (let i = 0; i < groups.length; i++) {
      if (searchIndex[i].includes(q)) out.push(groups[i]);
    }
    return out;
  }, [groups, searchIndex, query]);

  /* NEW: members matching the same query */
  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const out: any[] = [];
    for (let i = 0; i < memberIndex.length; i++) {
      if (memberIndex[i].searchText.includes(q)) out.push(memberIndex[i]);
      if (out.length >= 50) break; // never render a runaway list
    }
    return out;
  }, [memberIndex, query]);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
  }, []);

  /* ================= NAVIGATION ================= */

  const openGroup = useCallback(
    (groupId: string) => {
      router.push({
        pathname: "/employee/groupMembers",
        params: { groupId },
      });
    },
    [router]
  );

  /* NEW: straight to the collect payment screen for that member.
     Same pathname and params groupMembers.tsx already uses. */
  const openMember = useCallback(
    (groupId: string, groupMemberId: string) => {
      router.push({
        pathname: "/employee/collectPayment",
        params: {
          groupId,
          memberId: groupMemberId,
        },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <GroupCard item={item} onPress={openGroup} />
    ),
    [openGroup]
  );

  /* NEW: member results sit above the group list */
  const listHeaderComponent = useMemo(() => {
    if (!query.trim()) return null;
    if (filteredMembers.length === 0) return null;

    return (
      <View className="mb-4">

        <View className="flex-row items-center mb-2">
          <MaterialIcons name="person-search" size={18} color="#024e32" />
          <Text className="text-[#024e32] font-bold text-sm ml-1.5">
            Members ({filteredMembers.length})
          </Text>
          <Text className="text-gray-400 text-xs ml-2">
            tap to collect payment
          </Text>
        </View>

        {filteredMembers.map((m) => (
          <MemberCard key={m.key} item={m} onPress={openMember} />
        ))}

        {filteredGroups.length > 0 ? (
          <View className="flex-row items-center mt-3 mb-1">
            <MaterialIcons name="group" size={18} color="#6b7280" />
            <Text className="text-gray-600 font-bold text-sm ml-1.5">
              Groups ({filteredGroups.length})
            </Text>
          </View>
        ) : null}

      </View>
    );
  }, [query, filteredMembers, filteredGroups.length, openMember]);

  const listEmptyComponent = useMemo(
    () => {
      // Members matched even though no group did - not an empty screen
      if (filteredMembers.length > 0) return null;

      return (
        <View className="flex-1 justify-center items-center py-20">

          <MaterialIcons
            name="group"
            size={40}
            color="#9ca3af"
          />

          <Text className="text-gray-600 mt-3">
            No groups available
          </Text>

          {search.length > 0 && (
            <Text className="text-gray-400 text-sm mt-2 text-center">
              Try searching with another Group ID,{"\n"}member name, member ID or phone
            </Text>
          )}

        </View>
      );
    },
    [search.length, filteredMembers.length]
  );

  const contentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: 16,
      paddingBottom: 20,
      flexGrow:
        filteredGroups.length === 0 && filteredMembers.length === 0 ? 1 : 0,
    }),
    [filteredGroups.length, filteredMembers.length]
  );

  /* getItemLayout assumes every row is CARD_HEIGHT. That is only true
     when there is no member header above the list, so it is switched
     off while member results are showing. */
  const useFixedLayout = filteredMembers.length === 0;

  /* ================= UI ================= */

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">

      {/* =====================================================
          HEADER
          SAME HEADER — NOT CHANGED
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.replace("/employee")}
            className="mt-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <View className="flex-1 ml-4">

            <Text className="text-white text-2xl font-bold mt-1">
              Collections
            </Text>

            <Text className="text-green-100 text-sm mt-1">
              Select a group to collect payments
            </Text>

          </View>

        </View>

      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <View
        className="flex-1"
        style={{
          paddingTop: 130,
        }}
      >

        {/* =================================================
            SKELETON LOADING
        ================================================= */}

        {loading ? (

          <GroupSkeleton />

        ) : (

          <View className="flex-1">

            {/* =================================================
                SEARCH BAR
                YOUR ORIGINAL DESIGN — NOT CHANGED
            ================================================= */}

            <View className="bg-white rounded-2xl p-5 mb-5 border border-gray-100">

              <View className="flex-row items-center mb-3">

                <MaterialIcons
                  name="search"
                  size={22}
                  color="#024e32"
                />

                <Text className="text-lg font-bold text-gray-800 ml-2">
                  Search Groups
                </Text>

              </View>

              <TextInput
                placeholder="Group ID, member name, member ID or phone"
                value={search}
                onChangeText={handleSearch}
                autoCorrect={false}
                autoCapitalize="none"
                returnKeyType="search"
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
              />

              <Text className="text-gray-500 text-sm mt-3">
                {query.trim()
                  ? `${filteredGroups.length} group(s) · ${filteredMembers.length} member(s) found`
                  : `${filteredGroups.length} group(s) found`}
                {membersLoading && !memberIndex.length
                  ? "  ·  loading members..."
                  : ""}
              </Text>

            </View>

            {/* =================================================
                ONE SINGLE GROUP LIST
                (member results render in the list header)
            ================================================= */}

            <FlatList
              data={filteredGroups}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}

              contentContainerStyle={contentContainerStyle}

              /* ================= WINDOWING ================= */

              initialNumToRender={8}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              windowSize={7}
              removeClippedSubviews

              // Delete this one prop if you ever change the card height
              // and see blank gaps while scrolling.
              getItemLayout={useFixedLayout ? getItemLayout : undefined}

              keyboardShouldPersistTaps="handled"

              /* ================= MEMBER RESULTS ================= */

              ListHeaderComponent={listHeaderComponent}

              /* ================= EMPTY STATE ================= */

              ListEmptyComponent={listEmptyComponent}

              /* ================= FOOTER ================= */

              ListFooterComponent={FOOTER_ELEMENT}
            />

          </View>

        )}

      </View>

    </SafeAreaView>
  );
}