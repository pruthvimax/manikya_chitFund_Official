import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import Constants from "expo-constants";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
  RefreshControl,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config";

// =========================================================
// SCREENSHOT PREVENTION FOR ALL PLATFORMS
// =========================================================

// For Android & iOS using expo-screen-capture
let ScreenCapture: any = null;

try {
  // Try to import expo-screen-capture
  const module = require("expo-screen-capture");
  ScreenCapture = module.default || module;
} catch (error) {
  console.log("expo-screen-capture not available, using fallback");
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

    // Android & iOS with expo-screen-capture
    if (ScreenCapture && typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
      await ScreenCapture.preventScreenCaptureAsync();
      console.log("✅ Screenshots prevented (expo-screen-capture)");
      return;
    }

    // Fallback: Android native module
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
    // Android & iOS with expo-screen-capture
    if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
      await ScreenCapture.allowScreenCaptureAsync();
      console.log("✅ Screenshots allowed (expo-screen-capture)");
      return;
    }

    // Fallback: Android native module
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

export default function HomeScreen() {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const [username, setUsername] = useState("Member");
  const [refreshing, setRefreshing] = useState(false);

  // =========================================================
  // NOTIFICATION BELL - NEW AUCTION NOTIFICATION COUNT
  // =========================================================

  const [unseenNotificationCount, setUnseenNotificationCount] = useState(0);
  const [newVacancyCount, setNewVacancyCount] = useState(0);
  const [memberUserid, setMemberUserid] = useState<string | null>(null);
  
  // Logout modal state
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Profile / logout dropdown menu
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  
  // Ref for the dropdown to detect outside clicks
  const dropdownRef = useRef<View>(null);
  const headerRef = useRef<View>(null);

  // =========================================================
  // LOGIN INTRO VIDEO
  // Plays once after login and is remembered until logout.
  // =========================================================
  const introVideoPlayedKey = "memberIntroVideoPlayed";
const introVideoPlayer = useVideoPlayer(
  require("../assets/images/mcpl logo 2.mp4"),
  (player) => {
    player.loop = false;
    player.muted = false;
    player.volume = 1.0;
    player.preservesPitch = true;
    player.staysActiveInBackground = false;
  }
);

  const { width } = useWindowDimensions();

  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  // =========================================================
  // LOGIN INTRO VIDEO - PLAY ONLY ONCE PER LOGIN
  // The flag is removed on logout, so the next login plays it again.
  // Navigating away and coming back does NOT replay it.
  // =========================================================

  useEffect(() => {
    let active = true;
    let playTimeout: NodeJS.Timeout | null = null;

   const playIntroVideoOnce = async () => {
  try {
    const alreadyPlayed = await AsyncStorage.getItem(
      introVideoPlayedKey
    );

    if (alreadyPlayed === "true" || !active) {
      return;
    }

    introVideoPlayer.currentTime = 0;

    playTimeout = setTimeout(async () => {
      if (!active) return;

      try {
        introVideoPlayer.play();

        await AsyncStorage.setItem(
          introVideoPlayedKey,
          "true"
        );

        console.log("✅ Intro video started");
      } catch (error) {
        console.log(
          "❌ Intro video play error:",
          error
        );
      }
    }, 500);

  } catch (error) {
    console.log(
      "❌ Intro video preparation error:",
      error
    );
  }
};

    // ✅ Preload the video when component mounts (even before playing)
    // This makes the video ready to play instantly
    introVideoPlayer.currentTime = 0;
    
    playIntroVideoOnce();

return () => {
  active = false;

  if (playTimeout) {
    clearTimeout(playTimeout);
  }
};
  }, [introVideoPlayer]);

  // =========================================================
  // SCREENSHOT PREVENTION - MOUNT / UNMOUNT
  // =========================================================

  useEffect(() => {
    // Prevent screenshots when component mounts
    preventScreenshot();

    // Cleanup - allow screenshots when component unmounts
    return () => {
      allowScreenshot();
    };
  }, []);

  // =========================================================
  // SCREENSHOT PREVENTION - FOCUS / BLUR (for Android)
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      // Re-apply screenshot prevention when screen comes into focus
      preventScreenshot();
      
      // ✅ Close profile menu when screen comes into focus (navigation back)
      setProfileMenuVisible(false);
      
      return () => {
        // Allow screenshots when screen loses focus (optional)
        // Comment this out if you want to keep blocking even in background
        // allowScreenshot();
      };
    }, [])
  );

  // =========================================================
  // SCREENSHOT DETECTION (Web only)
  // =========================================================

  useEffect(() => {
    if (Platform.OS === "web") {
      // Disable Print Screen key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "PrintScreen") {
          e.preventDefault();
          Alert.alert(
            "Screenshot Blocked",
            "Screenshots are not allowed for security reasons."
          );
        }
        
        // Disable Ctrl+Shift+S (Save As)
        if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Save As is disabled for security reasons."
          );
        }
        
        // ✅ Close dropdown on Escape key
        if (e.key === "Escape" && profileMenuVisible) {
          setProfileMenuVisible(false);
        }
      };

      // Disable right-click
      const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        Alert.alert(
          "Action Blocked",
          "Right-click is disabled for security reasons."
        );
      };

      // Disable Ctrl+Shift+I (Developer Tools)
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

      // Disable Ctrl+S (Save)
      const handleSave = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Save is disabled for security reasons."
          );
        }
      };

      // Disable Ctrl+P (Print)
      const handlePrint = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Print is disabled for security reasons."
          );
        }
      };

      // Disable Ctrl+C (Copy)
      const handleCopy = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Copy is disabled for security reasons."
          );
        }
      };

      // Disable Ctrl+X (Cut)
      const handleCut = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "x" || e.key === "X")) {
          e.preventDefault();
          Alert.alert(
            "Action Blocked",
            "Cut is disabled for security reasons."
          );
        }
      };

      // ✅ Click outside to close dropdown
      const handleClickOutside = (e: MouseEvent) => {
        if (profileMenuVisible) {
          // Check if click is on the dropdown menu itself
          const target = e.target as HTMLElement;
          const dropdownElement = document.querySelector('[data-dropdown="true"]');
          const triggerElement = document.querySelector('[data-trigger="true"]');
          
          if (dropdownElement && triggerElement) {
            const isClickOnDropdown = dropdownElement.contains(target);
            const isClickOnTrigger = triggerElement.contains(target);
            
            if (!isClickOnDropdown && !isClickOnTrigger) {
              setProfileMenuVisible(false);
            }
          }
        }
      };

      // Add event listeners
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("contextmenu", handleContextMenu);
      document.addEventListener("keydown", handleDevTools);
      document.addEventListener("keydown", handleSave);
      document.addEventListener("keydown", handlePrint);
      document.addEventListener("keydown", handleCopy);
      document.addEventListener("keydown", handleCut);
      document.addEventListener("mousedown", handleClickOutside);

      // Prevent drag and drop of images
      document.addEventListener("dragstart", (e) => {
        e.preventDefault();
      });

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("contextmenu", handleContextMenu);
        document.removeEventListener("keydown", handleDevTools);
        document.removeEventListener("keydown", handleSave);
        document.removeEventListener("keydown", handlePrint);
        document.removeEventListener("keydown", handleCopy);
        document.removeEventListener("keydown", handleCut);
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("dragstart", (e) => {
          e.preventDefault();
        });
      };
    }
  }, [profileMenuVisible]);

  // =========================================================
  // CSS TO PREVENT SELECTION AND SCREENSHOTS (Web)
  // =========================================================

  if (Platform.OS === "web") {
    useEffect(() => {
      // Add CSS to prevent selection and screenshots
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
        /* Prevent print */
        @media print {
          body { display: none !important; }
          * { display: none !important; }
        }
        /* Disable selection on all elements */
        * {
          -webkit-touch-callout: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
        }
        /* Prevent text selection on double click */
        .no-select {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        /* Hide scrollbar when printing */
        @media print {
          ::-webkit-scrollbar {
            display: none;
          }
        }
      `;
      document.head.appendChild(style);

      return () => {
        document.head.removeChild(style);
      };
    }, []);
  }

  // =========================================================
  // iOS SCREENSHOT DETECTION
  // =========================================================

  useEffect(() => {
    if (Platform.OS === "ios") {
      // iOS doesn't have native screenshot prevention
      // but we can detect when the app goes to background
      // which might indicate screenshot capture
      
      const handleAppStateChange = async (nextAppState: any) => {
        if (nextAppState === "background") {
          // Small delay to detect if screenshot was taken
          setTimeout(() => {
            console.log("App went to background - possible screenshot");
          }, 1000);
        }
      };

      return () => {
        // Cleanup
      };
    }
  }, []);

  /* ================= SESSION GUARD ================= */

  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        const stored = await AsyncStorage.getItem("loggedUser");
        await AsyncStorage.removeItem(
  "memberIntroVideoPlayed"
);

        if (!stored) {
          router.replace("/");
        }
      };

      checkSession();
    }, [])
  );

  /* ================= BACK BUTTON LOCK ================= */

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/");
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction
      );

      return () => backHandler.remove();
    }, [])
  );

  /* ================= LOAD USERNAME ================= */

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("loggedUser");

      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        if (parsed.username) {
          setUsername(parsed.username);
        }

        if (parsed.userid) {
          setMemberUserid(parsed.userid);
        }
      }
    };

    loadUser();
  }, []);

  /* =========================================================
     LOAD NEW NOTIFICATION COUNT
     A notification is "new" if it was created AFTER the
     last time the member opened the Auction Room.
     The last-seen time is stored in AsyncStorage.
  ========================================================= */

  const loadNotificationCount = useCallback(async () => {
    try {
      if (!memberUserid) return;

      const res = await fetch(
        `${BACKEND_URL}/notifications/user/${memberUserid}`
      );

      if (!res.ok) return;

      const data = await res.json();
      const notifications = Array.isArray(data) ? data : [];

      if (notifications.length === 0) {
        setUnseenNotificationCount(0);
        return;
      }

      const lastSeenStr = await AsyncStorage.getItem(
        "lastSeenNotificationAt"
      );

      const lastSeenTime = lastSeenStr
        ? new Date(lastSeenStr).getTime()
        : 0;

      const newCount = notifications.filter((n: any) => {
        const created = n.createdAt
          ? new Date(n.createdAt).getTime()
          : 0;
        return created > lastSeenTime;
      }).length;

      setUnseenNotificationCount(newCount);
    } catch (error) {
      console.log("Notification count load error:", error);
    }
  }, [memberUserid]);

  useEffect(() => {
    loadNotificationCount();
  }, [loadNotificationCount, refreshing]);

  /* =========================================================
     LOAD NEW VACANCY COUNT
     A vacancy is "new" if it was published AFTER the last
     time the member opened the Vacancies page. The last-seen
     time is stored in AsyncStorage by app/vacancy.tsx, so the
     badge clears as soon as they come back from it.
  ========================================================= */

  const loadVacancyCount = useCallback(async () => {
    try {
      if (!memberUserid) return;

      const res = await fetch(
        `${BACKEND_URL}/vacancy/open?userid=${encodeURIComponent(
          memberUserid
        )}`
      );

      if (!res.ok) return;

      const data = await res.json();
      const vacancies = Array.isArray(data) ? data : [];

      if (vacancies.length === 0) {
        setNewVacancyCount(0);
        return;
      }

      const lastSeenStr = await AsyncStorage.getItem(
        "lastSeenVacancyAt"
      );

      const lastSeenTime = lastSeenStr
        ? new Date(lastSeenStr).getTime()
        : 0;

      const newCount = vacancies.filter((v: any) => {
        const created = v.createdAt
          ? new Date(v.createdAt).getTime()
          : 0;
        return created > lastSeenTime;
      }).length;

      setNewVacancyCount(newCount);
    } catch (error) {
      console.log("Vacancy count load error:", error);
    }
  }, [memberUserid]);

  useEffect(() => {
    loadVacancyCount();
  }, [loadVacancyCount, refreshing]);

  /* Re-check on every focus so the badge disappears the moment
     the member returns from the Vacancies page. */
  useFocusEffect(
    useCallback(() => {
      loadVacancyCount();
    }, [loadVacancyCount])
  );

  /* =========================================================
     BELL PRESS -> MARK ALL AS SEEN + OPEN AUCTION ROOM
  ========================================================= */

  const handleNotificationPress = async () => {
    try {
      // Mark everything as seen so the badge disappears
      await AsyncStorage.setItem(
        "lastSeenNotificationAt",
        new Date().toISOString()
      );
      setUnseenNotificationCount(0);
    } catch (error) {
      console.log("Mark seen error:", error);
    }

    router.push("/auctionroom");
  };

  /* ================= LOGOUT ================= */

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    setProfileMenuVisible(false);
    
    try {
      await AsyncStorage.multiRemove([
        "loggedUser",
        introVideoPlayedKey,
      ]);
      router.replace("/");
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const showLogoutModal = () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm(
        "Are you sure you want to logout?"
      );
      if (confirmLogout) {
        handleLogout();
      }
      return;
    }
    setLogoutModalVisible(true);
  };

  /* ================= PULL TO REFRESH ================= */

  const handleRefresh = () => {
    setRefreshing(true);

    const reloadUser = async () => {
      const storedUser = await AsyncStorage.getItem("loggedUser");

      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        if (parsed.username) {
          setUsername(parsed.username);
        }
      }

      setRefreshing(false);
    };

    reloadUser();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <View ref={headerRef} className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">

          <Text className="text-white text-2xl font-bold mt-1 flex-1">
            Member Portal
          </Text>

          {/* NOTIFICATION BELL -> AUCTION ROOM */}
          <TouchableOpacity
            onPress={handleNotificationPress}
            className="mt-1 mr-4"
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="notifications"
              size={26}
              color="white"
            />

            {unseenNotificationCount > 0 && (
              <View className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center border border-white">
                <Text className="text-white text-[10px] font-bold">
                  {unseenNotificationCount > 9
                    ? "9+"
                    : unseenNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* PROFILE / LOGOUT DROPDOWN */}
          <View ref={dropdownRef} className="relative mt-1">
            <TouchableOpacity
              data-trigger="true"
              onPress={() => {
                setProfileMenuVisible((visible) => !visible);
              }}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="account-circle"
                size={30}
                color="white"
              />
            </TouchableOpacity>

            {profileMenuVisible && (
              <View
                data-dropdown="true"
                className="absolute right-0 top-11 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                style={{
                  width: 190,
                  zIndex: 9999,
                  elevation: 12,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setProfileMenuVisible(false);
                    router.push("/myprofile");
                  }}
                  className="flex-row items-center px-4 py-4 border-b border-gray-100"
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="person"
                    size={22}
                    color="#024e32"
                  />
                  <Text className="text-gray-800 font-semibold ml-3">
                    Profile
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={showLogoutModal}
                  className="flex-row items-center px-4 py-4"
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="logout"
                    size={22}
                    color="#dc2626"
                  />
                  <Text className="text-red-600 font-semibold ml-3">
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

        </View>
      </View>

      {/* =====================================================
          SCROLLABLE CONTENT - Close dropdown on scroll
      ===================================================== */}

      <ScrollView
        className="flex-1 bg-[#f7f9f8]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 110,
          paddingBottom: isDesktopOrLaptop ? 40 : 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
        // ✅ Close dropdown when scrolling
        onScrollBeginDrag={() => {
          if (profileMenuVisible) setProfileMenuVisible(false);
        }}
        scrollEventThrottle={16}
      >

        <View
          className={`flex-1 ${
            isDesktopOrLaptop ? "px-8" : "px-5"
          }`}
          // ✅ Close dropdown when tapping on content
          onStartShouldSetResponder={() => {
            if (profileMenuVisible) {
              setProfileMenuVisible(false);
            }
            return false;
          }}
        >

          {/* ================= LOGIN INTRO VIDEO ================= */}

          <View
            className={`self-center mt-6 overflow-hidden rounded-3xl border border-[#d2e4dc] bg-black shadow-sm ${
              isDesktopOrLaptop
                ? "w-full max-w-5xl"
                : isTablet
                ? "w-[95%]"
                : "w-[92%]"
            }`}
            style={{
              aspectRatio: 16 / 9,
              maxHeight: isDesktopOrLaptop ? 560 : 420,
            }}
          >
            <VideoView
              player={introVideoPlayer}
              style={{
                width: "100%",
                height: "100%",
              }}
              contentFit="contain"
              nativeControls={false}
              allowsPictureInPicture={false}
              allowsFullscreen={false}
            />
          </View>

          {/* ================= MENU CARDS ================= */}

          <View
            className={`mt-8 ${
              isDesktopOrLaptop
                ? "flex-row flex-wrap justify-center gap-6"
                : "flex-row flex-wrap justify-between"
            }`}
          >

            {[
              {
                title: "My Chits",
                iconName: "folder",
                route: "/mychits",
              },
              {
                title: "My Account Copy",
                iconName: "credit-card",
                route: "/myaccountcopy",
              },
              {
                title: "My Outstanding",
                iconName: "attach-money",
                route: "/myoutstanding",
              },
              {
                title: "Newly Commenced Groups",
                iconName: "group",
                route: "/newgroups",
              },
              {
                title: "Vacancies",
                iconName: "event-seat",
                route: "/vacancy",
              },
              {
                title: "Contact Us",
                iconName: "contact-mail",
                route: "/contact",
              },
              {
                title: "Auction Room",
                iconName: "storefront",
                route: "/auctionroom",
              },
              {
                title: "Bid Now",
                iconName: "gavel",
                route: "/bidroom",
              },
            ].map((item, index) => (
              <MenuCard
                key={index}
                title={item.title}
                iconName={item.iconName}
                route={item.route}
                isDesktopOrLaptop={isDesktopOrLaptop}
                isTablet={isTablet}
                badgeCount={
                  item.route === "/vacancy" ? newVacancyCount : 0
                }
                onPress={() => setProfileMenuVisible(false)}
              />
            ))}

          </View>

          {/* ================= FOOTER ================= */}

          <View
            className={`mt-8 mb-10 ${
              isDesktopOrLaptop
                ? "max-w-4xl mx-auto w-full"
                : ""
            }`}
          >

            <View
              className={`bg-white rounded-2xl border border-[#e8f0eb] shadow-sm ${
                isDesktopOrLaptop
                  ? "p-8"
                  : "p-5"
              }`}
            >

              {/* COMPANY INFO */}

              <View className="items-center mb-6">

                <Text
                  className={`text-[#024e32] font-bold ${
                    isDesktopOrLaptop
                      ? "text-xl"
                      : "text-lg"
                  }`}
                >
                  Manikya Chits Private Limited
                </Text>

                <Text
                  className={`text-gray-500 ${
                    isDesktopOrLaptop
                      ? "text-sm"
                      : "text-xs"
                  }`}
                >
                  Trusted Chit Fund Company Since 2020
                </Text>

              </View>

              {/* CONTACT INFO */}

              <View className="mb-6 space-y-3">

                {/* PHONE */}

                <View className="flex-row items-center justify-between border-b border-gray-100 pb-2">

                  <View className="flex-row items-center">

                    <MaterialIcons
                      name="phone"
                      size={18}
                      color="#024e32"
                    />

                    <Text
                      className={`text-gray-600 ml-3 ${
                        isDesktopOrLaptop
                          ? "text-base"
                          : "text-sm"
                      }`}
                    >
                      Support:
                    </Text>

                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        "tel:+917259201729"
                      )
                    }
                  >
                    <Text className="text-[#024e32] font-medium">
                      +91 7259201729
                    </Text>
                  </TouchableOpacity>

                </View>

                {/* EMAIL */}

                <View className="flex-row items-center justify-between border-b border-gray-100 pb-2">

                  <View className="flex-row items-center">

                    <MaterialIcons
                      name="email"
                      size={18}
                      color="#024e32"
                    />

                    <Text
                      className={`text-gray-600 ml-3 ${
                        isDesktopOrLaptop
                          ? "text-base"
                          : "text-sm"
                      }`}
                    >
                      Email:
                    </Text>

                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        "mailto:manikyachitsprivatelimited@gmail.com"
                      )
                    }
                  >
                    <Text className="text-[#024e32] font-medium text-sm">
                      manikyachitsprivatelimited@gmail.com
                    </Text>
                  </TouchableOpacity>

                </View>

                {/* WORKING HOURS */}

                <View className="flex-row items-center justify-between">

                  <View className="flex-row items-center">

                    <MaterialIcons
                      name="access-time"
                      size={18}
                      color="#024e32"
                    />

                    <Text
                      className={`text-gray-600 ml-3 ${
                        isDesktopOrLaptop
                          ? "text-base"
                          : "text-sm"
                      }`}
                    >
                      Working Hours:
                    </Text>

                  </View>

                  <Text className="text-gray-700 font-medium text-sm">
                    9 AM - 6 PM (Mon-Sat)
                  </Text>

                </View>

              </View>

              {/* QUICK STATS */}

              <View className="flex-row flex-wrap mb-6">

                {[
                  {
                    value: "100+",
                    label: "Active Groups",
                  },
                  {
                    value: "5K+",
                    label: "Happy Customers",
                  },
                  {
                    value: "₹10Cr+",
                    label: "Transactions",
                  },
                  {
                    value: "6+",
                    label: "Years",
                  },
                ].map((stat, index) => (
                  <View
                    key={index}
                    className="w-1/4 items-center"
                  >

                    <Text className="text-[#024e32] font-bold text-sm">
                      {stat.value}
                    </Text>

                    <Text className="text-gray-500 text-[10px] mt-1 text-center">
                      {stat.label}
                    </Text>

                  </View>
                ))}

              </View>

              {/* VERSION INFO */}

              <View className="pt-4 border-t border-gray-200">

                <View className="flex-row items-center justify-center">

                  <Text className="text-gray-400 text-xs">
                    Member App v{appVersion} • © {new Date().getFullYear()} Manikya Chits
                  </Text>

                </View>

              </View>

            </View>

          </View>

        </View>

      </ScrollView>

      {/* =====================================================
          CUSTOM LOGOUT CONFIRMATION MODAL
      ===================================================== */}

      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-3xl p-6 mx-5 w-full max-w-sm shadow-2xl">

            {/* Icon Circle */}
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center">
                <MaterialIcons name="logout" size={40} color="#ea580c" />
              </View>
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
              Confirm Logout
            </Text>

            {/* Message */}
            <Text className="text-gray-600 text-center text-base leading-6 mb-6">
              Are you sure you want to logout? You will need to login again to access your account.
            </Text>

            {/* Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setLogoutModalVisible(false)}
                className="flex-1 bg-gray-200 py-3.5 rounded-xl"
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 text-center font-semibold text-base">
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                className="flex-1 bg-red-600 py-3.5 rounded-xl"
                activeOpacity={0.8}
              >
                <View className="flex-row items-center justify-center">
                  <MaterialIcons name="logout" size={20} color="white" />
                  <Text className="text-white text-center font-semibold text-base ml-1">
                    Logout
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Security Note */}
            <View className="mt-4 items-center flex-row justify-center">
              <MaterialIcons name="security" size={14} color="#9ca3af" />
              <Text className="text-gray-400 text-xs ml-1">
                Your session will be terminated
              </Text>
            </View>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

/* =========================================================
   MENU CARD
========================================================= */

function MenuCard({
  title,
  iconName,
  route,
  isDesktopOrLaptop,
  isTablet,
  onPress,
  badgeCount = 0,
}: {
  title: string;
  iconName: any;
  route: string;
  isDesktopOrLaptop: boolean;
  isTablet: boolean;
  onPress?: () => void;
  badgeCount?: number;
}) {
  const router = useRouter();

  const getCardWidth = () => {
    if (isDesktopOrLaptop) {
      return "w-[30%]";
    } else if (isTablet) {
      return "w-[48%]";
    } else {
      return "w-[47%]";
    }
  };

  const getCardHeight = () => {
    if (isDesktopOrLaptop) {
      return "py-10";
    } else if (isTablet) {
      return "py-9";
    } else {
      return "py-8";
    }
  };

  return (
    <TouchableOpacity
      className={`bg-white ${getCardWidth()} ${getCardHeight()} mb-6 rounded-3xl items-center shadow-md border border-[#e8f0eb] ${
        isDesktopOrLaptop ? "mx-2" : ""
      }`}
      activeOpacity={0.9}
      onPress={() => {
        if (onPress) onPress();
        router.push(route);
      }}
    >

      <View
        className={`rounded-2xl items-center justify-center mb-4 ${
          isDesktopOrLaptop
            ? "w-20 h-20"
            : "w-16 h-16"
        }`}
      >

        <MaterialIcons
          name={iconName}
          size={
            isDesktopOrLaptop
              ? 42
              : isTablet
              ? 36
              : 32
          }
          color="#024e32"
        />

        {badgeCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[20px] h-[20px] px-1 items-center justify-center border border-white">
            <Text className="text-white text-[10px] font-bold">
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        )}

      </View>

      <Text
        className={`text-[#024e32] font-semibold text-center ${
          isDesktopOrLaptop
            ? "text-lg"
            : "text-base"
        }`}
      >
        {title}
      </Text>

    </TouchableOpacity>
  );
}