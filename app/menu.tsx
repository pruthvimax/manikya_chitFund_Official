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
  Image,
  BackHandler,
  Alert,
  Linking,
  Platform,
  useWindowDimensions,
  RefreshControl,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config";

// =========================================================
// SCREENSHOT PREVENTION (unchanged)
// =========================================================

let ScreenCapture: any = null;

try {
  const module = require("expo-screen-capture");
  ScreenCapture = module.default || module;
} catch (error) {
  console.log("expo-screen-capture not available, using fallback");
}

const preventScreenshot = async () => {
  try {
    if ((await AsyncStorage.getItem("adminSession")) === "true") {
      await allowScreenshot();
      return;
    }

    if (ScreenCapture && typeof ScreenCapture.preventScreenCaptureAsync === "function") {
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
    if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === "function") {
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

// =========================================================
// WEBSITE LINK FOR THE "EXPLORE" BUTTON ON IMAGE SLIDES
// =========================================================
const WEBSITE_URL = "https://www.manikyachitsprivatelimited.com/";

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function HomeScreen() {
  const router = useRouter();
  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const [username, setUsername] = useState("Member");
  const [refreshing, setRefreshing] = useState(false);

  // Notification & badge states
  const [unseenNotificationCount, setUnseenNotificationCount] = useState(0);
  const [newVacancyCount, setNewVacancyCount] = useState(0);
  const [memberUserid, setMemberUserid] = useState<string | null>(null);

  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const dropdownRef = useRef<View>(null);
  const headerRef = useRef<View>(null);

  // =========================================================
  // SLIDESHOW STATE
  // =========================================================
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);

  const sliderRef = useRef<ScrollView>(null);
  const slideIndexRef = useRef(0);
  const userInteractingRef = useRef(false);
  const resumeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Slideshow slides — two promo photo slides (each with an "Explore"
  // button that opens the website) followed by the original Kannada
  // slogan slides. Everything else about the carousel (auto-advance,
  // swipe, arrows, dots) is unchanged and works the same for both
  // slide types.
  // buttonPos is the centre of the "Explore" button that's already
  // drawn onto the image (as a fraction of the image's width/height,
  // 0-1) -- used to place an invisible tap target exactly over it.
  type HeroSlide =
    | { type: "image"; source: any; link: string; buttonPos: { xFrac: number; yFrac: number; wFrac: number; hFrac: number } }
    | { type: "text"; kn: string; en: string };

  const slogans: HeroSlide[] = [
    {
      type: "image",
      source: require("../assets/images/member_slider_1_brand.png"),
      link: WEBSITE_URL,
      // button sits top-centre on this slide
      buttonPos: { xFrac: 0.5, yFrac: 0.073, wFrac: 0.16, hFrac: 0.09 },
    },
    {
      type: "image",
      source: require("../assets/images/member_slider_2_trust.png"),
      link: WEBSITE_URL,
      // button sits on the right edge, vertically centred, on this slide
      buttonPos: { xFrac: 0.882, yFrac: 0.689, wFrac: 0.16, hFrac: 0.09 },
    },
    {
      type: "text",
      kn: "ನಿಮ್ಮ ಪ್ರಗತಿಗೆ ನಮ್ಮ ಆಸರೆ.",
      en: "Our support for your progress.",
    },
    {
      type: "text",
      kn: "ಸಣ್ಣ ಉಳಿತಾಯ, ದೊಡ್ಡ ಕನಸು.",
      en: "Small savings, big dreams.",
    },
    {
      type: "text",
      kn: "ಸುರಕ್ಷಿತ ಹೂಡಿಕೆ, ಸುಖಿ ಜೀವನ.",
      en: "Safe investment, a happy life.",
    },
    {
      type: "text",
      kn: "ಒಟ್ಟಾಗಿ ಉಳಿಸೋಣ, ಜೊತೆಯಾಗಿ ಬೆಳೆಯೋಣ.",
      en: "Let's save together, grow together.",
    },
    {
      type: "text",
      kn: "ಬೇಕಾದಾಗ ಹಣ, ಬೇಡದಿದ್ದಾಗ ಉಳಿತಾಯ.",
      en: "Money when you need it, savings when you don't.",
    },
    {
      type: "text",
      kn: "ಸ್ವಾವಲಂಬಿ ಬದುಕಿಗೆ, ನಮ್ಮ ಚಿಟ್ ಫಂಡ್ ಆಸರೆ.",
      en: "For a self-reliant life, our chit fund is your support.",
    },
    {
      type: "text",
      kn: "ದಿನದ ಸಣ್ಣ ಉಳಿತಾಯ, ಮನೆಗೆ ತರುವುದು ಮಹಾ ಆದಾಯ.",
      en: "A small daily saving brings great income home.",
    },
    {
      type: "text",
      kn: "ಇಂದಿನ ಉಳಿತಾಯ, ಮುಂದಿನ ಆಸ್ತಿ ಆಯ.",
      en: "Today's saving is tomorrow's chosen asset.",
    },
  ];

  // =========================================================
  // INTRO VIDEO
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
  // Extra breakpoint used ONLY by the text slogan slides below, so very
  // small phones (older/compact devices, ~320-359px wide) get their own
  // tighter sizing instead of falling into the same bucket as a normal
  // phone -- that's what was letting the longer Kannada slogans crowd or
  // clip on smaller screens.
  const isSmallPhone = width < 360;

  // =========================================================
  // VIDEO PLAYBACK -> SLIDESHOW HANDOFF
  // =========================================================

  useEffect(() => {
    let active = true;
    let playTimeout: NodeJS.Timeout | null = null;
    let failSafeTimeout: NodeJS.Timeout | null = null;
    let readyListener: any = null;
    let hasStartedPlaying = false;

    const markPlayedOnce = async () => {
      try {
        await AsyncStorage.setItem(introVideoPlayedKey, "true");
      } catch {}
    };

    // Actually starts playback -- safe to call more than once (from the
    // timed attempt AND the "readyToPlay" listener below), since a
    // second play() call on an already-playing player is a harmless no-op.
    const attemptPlay = () => {
      if (!active || hasStartedPlaying) return;
      try {
        introVideoPlayer.play();
        hasStartedPlaying = true;
        markPlayedOnce();
        console.log("✅ Intro video started");
      } catch (error) {
        console.log("❌ Intro video play error:", error);
        setShowSlideshow(true);
      }
    };

    const playIntroVideoOnce = async () => {
      try {
        const alreadyPlayed = await AsyncStorage.getItem(introVideoPlayedKey);

        if (alreadyPlayed === "true" || !active) {
          setShowSlideshow(true);
          return;
        }

        // Resetting currentTime before the video source has actually
        // loaded can throw on some devices -- if it does, that must
        // NOT abort playback, so it gets its own try/catch instead of
        // sharing the outer one (which used to skip straight to the
        // slideshow here, before the video ever got a chance to play).
        try {
          introVideoPlayer.currentTime = 0;
        } catch (e) {
          console.log("⚠️ Intro video currentTime reset skipped:", e);
        }

        // Primary trigger: once the player actually reports it's
        // loaded and ready, start playback right away.
        try {
          readyListener = introVideoPlayer.addListener(
            "statusChange",
            (payload: any) => {
              const status = payload?.status ?? payload;
              if (status === "readyToPlay") {
                attemptPlay();
              } else if (status === "error") {
                console.log("❌ Intro video error, skipping to slideshow");
                setShowSlideshow(true);
              }
            }
          );
        } catch (e) {
          console.log("statusChange listener not supported");
        }

        // Backup trigger: some platforms never fire a distinct
        // "readyToPlay" statusChange, so also try a short delay after
        // mount -- attemptPlay() is a no-op if playback already started.
        playTimeout = setTimeout(() => {
          attemptPlay();
        }, 400);

        // Fail-safe: never leave the user stuck on a black box
        failSafeTimeout = setTimeout(() => {
          if (active) setShowSlideshow(true);
        }, 20000);
      } catch (error) {
        console.log("❌ Intro video preparation error:", error);
        setShowSlideshow(true);
      }
    };

    playIntroVideoOnce();

    return () => {
      active = false;
      if (playTimeout) clearTimeout(playTimeout);
      if (failSafeTimeout) clearTimeout(failSafeTimeout);
      try {
        readyListener?.remove?.();
      } catch {}
    };
  }, [introVideoPlayer]);

  // Detect the end of the video (expo-video emits events on the player)
  useEffect(() => {
    const subs: any[] = [];

    try {
      subs.push(
        introVideoPlayer.addListener("playToEnd", () => {
          console.log("✅ Intro video finished");
          setShowSlideshow(true);
        })
      );
    } catch (e) {
      console.log("playToEnd listener not supported");
    }

    try {
      subs.push(
        introVideoPlayer.addListener("statusChange", (payload: any) => {
          const status = payload?.status ?? payload;
          if (status === "error") {
            console.log("❌ Intro video error, skipping to slideshow");
            setShowSlideshow(true);
          }
        })
      );
    } catch (e) {
      console.log("statusChange listener not supported");
    }

    return () => {
      subs.forEach((s) => {
        try {
          s?.remove?.();
        } catch {}
      });
    };
  }, [introVideoPlayer]);

  // Stop the video once the slideshow takes over
  useEffect(() => {
    if (showSlideshow) {
      try {
        introVideoPlayer.pause();
      } catch {}
    }
  }, [showSlideshow, introVideoPlayer]);

  // =========================================================
  // SLIDESHOW NAVIGATION
  // =========================================================

  const goToSlide = useCallback(
    (index: number, animated = true) => {
      const total = slogans.length;
      if (total === 0) return;

      const next = ((index % total) + total) % total; // safe wrap both directions
      slideIndexRef.current = next;
      setSlideIndex(next);

      if (sliderWidth > 0) {
        sliderRef.current?.scrollTo({ x: next * sliderWidth, y: 0, animated });
      }
    },
    [sliderWidth, slogans.length]
  );

  const goToNextSlide = useCallback(() => {
    goToSlide(slideIndexRef.current + 1);
  }, [goToSlide]);

  const goToPrevSlide = useCallback(() => {
    goToSlide(slideIndexRef.current - 1);
  }, [goToSlide]);

  // Auto-slide every 3 seconds (paused while the user is swiping)
  useEffect(() => {
    if (!showSlideshow || slogans.length === 0 || sliderWidth === 0) return;

    const timer = setInterval(() => {
      if (userInteractingRef.current) return;
      goToSlide(slideIndexRef.current + 1);
    }, 3000);

    return () => clearInterval(timer);
  }, [showSlideshow, sliderWidth, goToSlide, slogans.length]);

  // Keep position correct when the container resizes (rotation / web resize)
  useEffect(() => {
    if (showSlideshow && sliderWidth > 0) {
      sliderRef.current?.scrollTo({
        x: slideIndexRef.current * sliderWidth,
        y: 0,
        animated: false,
      });
    }
  }, [sliderWidth, showSlideshow]);

  const pauseAutoSlide = () => {
    userInteractingRef.current = true;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const resumeAutoSlide = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      userInteractingRef.current = false;
    }, 5000);
  };

  const handleSlideScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (sliderWidth <= 0) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / sliderWidth);
    slideIndexRef.current = index;
    setSlideIndex(index);
    resumeAutoSlide();
  };

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // =========================================================
  // SCREENSHOT PREVENTION & FOCUS
  // =========================================================

  useEffect(() => {
    preventScreenshot();
    return () => {
      allowScreenshot();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      preventScreenshot();
      setProfileMenuVisible(false);
      return () => {};
    }, [])
  );

  // =========================================================
  // WEB SECURITY
  // =========================================================

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        Alert.alert("Screenshot Blocked", "Screenshots are not allowed for security reasons.");
      }
      if (e.ctrlKey && e.shiftKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        Alert.alert("Action Blocked", "Save As is disabled for security reasons.");
      }
      if (e.key === "Escape" && profileMenuVisible) {
        setProfileMenuVisible(false);
      }
      // Arrow keys move the slideshow on web
      if (e.key === "ArrowRight") goToNextSlide();
      if (e.key === "ArrowLeft") goToPrevSlide();
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      Alert.alert("Action Blocked", "Right-click is disabled for security reasons.");
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
        Alert.alert("Action Blocked", "Developer tools are disabled for security reasons.");
      }
    };

    const handleSave = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        Alert.alert("Action Blocked", "Save is disabled for security reasons.");
      }
    };

    const handlePrint = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        Alert.alert("Action Blocked", "Print is disabled for security reasons.");
      }
    };

    const handleCopy = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        Alert.alert("Action Blocked", "Copy is disabled for security reasons.");
      }
    };

    const handleCut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "x" || e.key === "X")) {
        e.preventDefault();
        Alert.alert("Action Blocked", "Cut is disabled for security reasons.");
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuVisible) {
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

    const handleDragStart = (e: Event) => e.preventDefault();

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleDevTools);
    document.addEventListener("keydown", handleSave);
    document.addEventListener("keydown", handlePrint);
    document.addEventListener("keydown", handleCopy);
    document.addEventListener("keydown", handleCut);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleDevTools);
      document.removeEventListener("keydown", handleSave);
      document.removeEventListener("keydown", handlePrint);
      document.removeEventListener("keydown", handleCopy);
      document.removeEventListener("keydown", handleCut);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, [profileMenuVisible, goToNextSlide, goToPrevSlide]);

  // CSS prevention (hook is now unconditional)
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const style = document.createElement("style");
    style.textContent = `
      body { user-select: none !important; -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; }
      img { -webkit-user-drag: none !important; user-drag: none !important; }
      @media print { body { display: none !important; } * { display: none !important; } }
      * { -webkit-touch-callout: none !important; -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; }
      .no-select { -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
      @media print { ::-webkit-scrollbar { display: none; } }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // =========================================================
  // SESSION GUARD & BACK BUTTON
  // =========================================================

  useFocusEffect(
    useCallback(() => {
      const checkSession = async () => {
        const stored = await AsyncStorage.getItem("loggedUser");
        if (!stored) {
          router.replace("/");
        }
      };
      checkSession();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/");
        return true;
      };
      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => backHandler.remove();
    }, [])
  );

  // =========================================================
  // LOAD USER & BADGES
  // =========================================================

  useEffect(() => {
    const loadUser = async () => {
      const storedUser = await AsyncStorage.getItem("loggedUser");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.username) setUsername(parsed.username);
        if (parsed.userid) setMemberUserid(parsed.userid);
      }
    };
    loadUser();
  }, []);

  const loadNotificationCount = useCallback(async () => {
    try {
      if (!memberUserid) return;
      const res = await fetch(`${BACKEND_URL}/notifications/user/${memberUserid}`);
      if (!res.ok) return;
      const data = await res.json();
      const notifications = Array.isArray(data) ? data : [];
      if (notifications.length === 0) {
        setUnseenNotificationCount(0);
        return;
      }
      const lastSeenStr = await AsyncStorage.getItem("lastSeenNotificationAt");
      const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
      const newCount = notifications.filter((n: any) => {
        const created = n.createdAt ? new Date(n.createdAt).getTime() : 0;
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

  const loadVacancyCount = useCallback(async () => {
    try {
      if (!memberUserid) return;
      const res = await fetch(`${BACKEND_URL}/vacancy/open?userid=${encodeURIComponent(memberUserid)}`);
      if (!res.ok) return;
      const data = await res.json();
      const vacancies = Array.isArray(data) ? data : [];
      if (vacancies.length === 0) {
        setNewVacancyCount(0);
        return;
      }
      const lastSeenStr = await AsyncStorage.getItem("lastSeenVacancyAt");
      const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
      const newCount = vacancies.filter((v: any) => {
        const created = v.createdAt ? new Date(v.createdAt).getTime() : 0;
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

  useFocusEffect(
    useCallback(() => {
      loadVacancyCount();
    }, [loadVacancyCount])
  );

  const handleNotificationPress = async () => {
    try {
      await AsyncStorage.setItem("lastSeenNotificationAt", new Date().toISOString());
      setUnseenNotificationCount(0);
    } catch (error) {
      console.log("Mark seen error:", error);
    }
    router.push("/auctionroom");
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    setProfileMenuVisible(false);
    try {
      await AsyncStorage.multiRemove(["loggedUser", introVideoPlayedKey]);
      router.replace("/");
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const showLogoutModal = () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to logout?");
      if (confirmLogout) handleLogout();
      return;
    }
    setLogoutModalVisible(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    const reloadUser = async () => {
      const storedUser = await AsyncStorage.getItem("loggedUser");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.username) setUsername(parsed.username);
      }
      setRefreshing(false);
    };
    reloadUser();
  };

  // =========================================================
  // TEXT-SLIDE RESPONSIVE TYPOGRAPHY
  //
  // The image slides are untouched (still exactly what they were).
  // These sizes are used ONLY by the Kannada/English slogan slides
  // below, and now span 4 breakpoints instead of 2 (isSmallPhone /
  // phone / isTablet / isDesktopOrLaptop / isLargeScreen) so a
  // compact older phone and a wide desktop each get sizing tuned to
  // them, instead of both being lumped into "phone" or "desktop".
  // The Kannada + English Text elements below also get
  // adjustsFontSizeToFit with a numberOfLines cap, so a longer
  // slogan shrinks gracefully to fit the fixed-height slide instead
  // of ever being clipped by the container's overflow:hidden.
  // =========================================================
  const textSlideKnFontSize = isLargeScreen ? 28 : isDesktopOrLaptop ? 24 : isTablet ? 20 : isSmallPhone ? 14 : 17;
  const textSlideKnLineHeight = Math.round(textSlideKnFontSize * 1.4);
  const textSlideEnFontSize = isLargeScreen ? 15 : isDesktopOrLaptop ? 13 : isTablet ? 12 : isSmallPhone ? 10 : 11;
  const textSlideEnLineHeight = Math.round(textSlideEnFontSize * 1.5);
  const textSlideQuoteIconSize = isLargeScreen ? 52 : isDesktopOrLaptop ? 44 : isTablet ? 36 : isSmallPhone ? 26 : 32;
  const textSlidePaddingH = isLargeScreen ? 80 : isDesktopOrLaptop ? 64 : isTablet ? 40 : isSmallPhone ? 18 : 28;
  const textSlidePaddingB = isLargeScreen ? 50 : isDesktopOrLaptop ? 46 : isTablet ? 40 : isSmallPhone ? 28 : 36;
  const textSlideDividerMargin = isLargeScreen ? 18 : isDesktopOrLaptop ? 14 : isTablet ? 12 : isSmallPhone ? 7 : 10;
  const textSlideExploreFontSize = isLargeScreen ? 15 : isDesktopOrLaptop ? 14 : isTablet ? 13 : 12;
  const textSlideExplorePadH = isLargeScreen ? 20 : isDesktopOrLaptop ? 18 : 14;
  const textSlideExplorePadV = isLargeScreen ? 11 : isDesktopOrLaptop ? 10 : 7;
  const textSlideExploreMarginTop = isLargeScreen ? 22 : isDesktopOrLaptop ? 20 : isSmallPhone ? 11 : 15;
  const textSlideCircle1Size = isLargeScreen ? 300 : isDesktopOrLaptop ? 260 : isTablet ? 210 : isSmallPhone ? 130 : 170;
  const textSlideCircle2Size = isLargeScreen ? 210 : isDesktopOrLaptop ? 180 : isTablet ? 145 : isSmallPhone ? 90 : 120;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      {/* HEADER */}
      <View ref={headerRef} className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <Text className="text-white text-2xl font-bold mt-1 flex-1">Member Portal</Text>
          <TouchableOpacity onPress={handleNotificationPress} className="mt-1 mr-4" activeOpacity={0.7}>
            <MaterialIcons name="notifications" size={26} color="white" />
            {unseenNotificationCount > 0 && (
              <View className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] px-1 items-center justify-center border border-white">
                <Text className="text-white text-[10px] font-bold">
                  {unseenNotificationCount > 9 ? "9+" : unseenNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View ref={dropdownRef} className="relative mt-1">
            <TouchableOpacity data-trigger="true" onPress={() => setProfileMenuVisible((v) => !v)} activeOpacity={0.7}>
              <MaterialIcons name="account-circle" size={30} color="white" />
            </TouchableOpacity>
            {profileMenuVisible && (
              <View data-dropdown="true" className="absolute right-0 top-11 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" style={{ width: 190, zIndex: 9999, elevation: 12 }}>
                <TouchableOpacity onPress={() => { setProfileMenuVisible(false); router.push("/myprofile"); }} className="flex-row items-center px-4 py-4 border-b border-gray-100" activeOpacity={0.7}>
                  <MaterialIcons name="person" size={22} color="#024e32" />
                  <Text className="text-gray-800 font-semibold ml-3">Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={showLogoutModal} className="flex-row items-center px-4 py-4" activeOpacity={0.7}>
                  <MaterialIcons name="logout" size={22} color="#dc2626" />
                  <Text className="text-red-600 font-semibold ml-3">Logout</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        className="flex-1 bg-[#f7f9f8]"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 110, paddingBottom: isDesktopOrLaptop ? 40 : 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#024e32"]} tintColor="#024e32" />}
        onScrollBeginDrag={() => { if (profileMenuVisible) setProfileMenuVisible(false); }}
        scrollEventThrottle={16}
      >
        <View
          className={`flex-1 ${isDesktopOrLaptop ? "px-8" : "px-5"}`}
          onStartShouldSetResponder={() => { if (profileMenuVisible) setProfileMenuVisible(false); return false; }}
        >
          {/* ===================================================
              INTRO VIDEO / SLOGAN SLIDESHOW CONTAINER

              Video logic is unchanged — it still plays once, then
              hands off to the slideshow. The slideshow now mixes two
              photo slides (with an Explore button) in with the
              original Kannada/English slogan slides, using the exact
              same swipe / auto-advance / arrows / dots mechanics.
          =================================================== */}
          <View
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0 && Math.abs(w - sliderWidth) > 1) setSliderWidth(w);
            }}
            className={`self-center mt-6 overflow-hidden rounded-3xl border border-[#d2e4dc] shadow-sm ${
              isDesktopOrLaptop ? "w-full max-w-5xl" : isTablet ? "w-[95%]" : "w-[92%]"
            }`}
            style={{
              aspectRatio: 16 / 9,
              maxHeight: isDesktopOrLaptop ? 560 : 420,
              // Video stage stays black; once the slogan slideshow
              // takes over, the whole stage goes brand green so no
              // black flashes at the swipe edges.
              backgroundColor: showSlideshow ? "#024e32" : "#000000",
            }}
          >
            {!showSlideshow ? (
              <VideoView
                player={introVideoPlayer}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
                nativeControls={false}
                allowsPictureInPicture={false}
                allowsFullscreen={false}
              />
            ) : (
              <View style={{ flex: 1, position: "relative" }}>
                {/* SWIPEABLE SLOGAN SLIDER (left / right) */}
                <ScrollView
                  ref={sliderRef}
                  horizontal
                  pagingEnabled
                  bounces={false}
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScrollBeginDrag={pauseAutoSlide}
                  onScrollEndDrag={resumeAutoSlide}
                  onMomentumScrollEnd={handleSlideScrollEnd}
                  style={{ flex: 1 }}
                >
                  {sliderWidth > 0 &&
                    slogans.map((slide, idx) => (
                      <View
                        key={idx}
                        style={{
                          width: sliderWidth,
                          height: "100%",
                          backgroundColor: "#024e32",
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: slide.type === "image" ? 0 : textSlidePaddingH,
                          // Reserve clear space at the bottom so the
                          // pagination dots never sit on top of the
                          // English subtitle text / Explore button.
                          paddingBottom: slide.type === "image" ? 0 : textSlidePaddingB,
                          overflow: "hidden",
                        }}
                      >
                        {slide.type === "image" ? (
                          <>
                            {/* PHOTO SLIDE -- the Explore button is already
                                drawn onto this image; below is just an
                                invisible tap target placed over it. */}
                            <Image
                              source={slide.source}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                width: "100%",
                                height: "100%",
                              }}
                              resizeMode="cover"
                            />

                            {(() => {
                              const slideH = sliderWidth * (9 / 16);
                              const btnW = slide.buttonPos.wFrac * sliderWidth;
                              const btnH = slide.buttonPos.hFrac * slideH;
                              const btnLeft = slide.buttonPos.xFrac * sliderWidth - btnW / 2;
                              const btnTop = slide.buttonPos.yFrac * slideH - btnH / 2;
                              return (
                                <TouchableOpacity
                                  onPress={() => {
                                    pauseAutoSlide();
                                    Linking.openURL(slide.link).catch(() =>
                                      Alert.alert("Unable to open link", "Please try again later.")
                                    );
                                  }}
                                  activeOpacity={0.6}
                                  style={{
                                    position: "absolute",
                                    left: btnLeft,
                                    top: btnTop,
                                    width: btnW,
                                    height: btnH,
                                  }}
                                />
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            {/* TEXT SLOGAN SLIDE -- responsive sizing now
                                spans 5 breakpoints (small phone / phone /
                                tablet / laptop / large desktop) instead
                                of just 2, and the Kannada + English text
                                shrink to fit via adjustsFontSizeToFit
                                instead of risking a clip on a narrow or
                                long-worded slide. */}
                            {/* decorative glow circles for that "wow" depth */}
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                width: textSlideCircle1Size,
                                height: textSlideCircle1Size,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.07)",
                                top: -(textSlideCircle1Size * 0.42),
                                right: -(textSlideCircle1Size * 0.34),
                              }}
                            />
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                width: textSlideCircle2Size,
                                height: textSlideCircle2Size,
                                borderRadius: 999,
                                backgroundColor: "rgba(255,255,255,0.05)",
                                bottom: -(textSlideCircle2Size * 0.36),
                                left: -(textSlideCircle2Size * 0.3),
                              }}
                            />
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                width: 2,
                                height: "70%",
                                backgroundColor: "rgba(255,255,255,0.06)",
                                left: "18%",
                              }}
                            />

                            <MaterialIcons
                              name="format-quote"
                              size={textSlideQuoteIconSize}
                              color="rgba(255,255,255,0.4)"
                              style={{ marginBottom: 6, transform: [{ scaleX: -1 }] }}
                            />

                            <Text
                              style={{
                                color: "#ffffff",
                                fontSize: textSlideKnFontSize,
                                fontWeight: "800",
                                textAlign: "center",
                                lineHeight: textSlideKnLineHeight,
                              }}
                              numberOfLines={3}
                              adjustsFontSizeToFit
                              minimumFontScale={0.55}
                            >
                              {slide.kn}
                            </Text>

                            <View
                              style={{
                                width: 44,
                                height: 3,
                                borderRadius: 2,
                                backgroundColor: "#e8501f",
                                marginVertical: textSlideDividerMargin,
                              }}
                            />

                            <Text
                              style={{
                                color: "rgba(255,255,255,0.85)",
                                fontSize: textSlideEnFontSize,
                                fontWeight: "500",
                                textAlign: "center",
                                lineHeight: textSlideEnLineHeight,
                              }}
                              numberOfLines={2}
                              adjustsFontSizeToFit
                              minimumFontScale={0.6}
                            >
                              {slide.en}
                            </Text>

                            {/* EXPLORE BUTTON -- sits in normal flow,
                                below the subtitle, so it can never
                                overlap the Kannada/English text above
                                it (flex column stacks, never overlaps). */}
                            <TouchableOpacity
                              onPress={() => {
                                pauseAutoSlide();
                                Linking.openURL(WEBSITE_URL).catch(() =>
                                  Alert.alert("Unable to open link", "Please try again later.")
                                );
                              }}
                              activeOpacity={0.85}
                              style={{
                                marginTop: textSlideExploreMarginTop,
                                backgroundColor: "#e8501f",
                                paddingHorizontal: textSlideExplorePadH,
                                paddingVertical: textSlideExplorePadV,
                                borderRadius: 999,
                                flexDirection: "row",
                                alignItems: "center",
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 4,
                                elevation: 4,
                              }}
                            >
                              <Text
                                style={{
                                  color: "#ffffff",
                                  fontWeight: "700",
                                  fontSize: textSlideExploreFontSize,
                                  marginRight: 4,
                                }}
                              >
                                Explore
                              </Text>
                              <MaterialIcons name="arrow-forward" size={textSlideExploreFontSize} color="#ffffff" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    ))}
                </ScrollView>

                {/* PREV ARROW */}
                <TouchableOpacity
                  onPress={() => {
                    pauseAutoSlide();
                    goToPrevSlide();
                    resumeAutoSlide();
                  }}
                  activeOpacity={0.7}
                  style={{
                    position: "absolute",
                    left: 8,
                    top: "50%",
                    marginTop: -20,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.25)",
                  }}
                >
                  <MaterialIcons name="chevron-left" size={28} color="#ffffff" />
                </TouchableOpacity>

                {/* NEXT ARROW */}
                <TouchableOpacity
                  onPress={() => {
                    pauseAutoSlide();
                    goToNextSlide();
                    resumeAutoSlide();
                  }}
                  activeOpacity={0.7}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    marginTop: -20,
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.25)",
                  }}
                >
                  <MaterialIcons name="chevron-right" size={28} color="#ffffff" />
                </TouchableOpacity>

                {/* PAGINATION DOTS -- kept small and low-opacity so they
                    don't sit on top of / distract from slide content */}
                <View
                  style={{
                    position: "absolute",
                    bottom: 8,
                    flexDirection: "row",
                    alignSelf: "center",
                    gap: 4,
                    backgroundColor: "rgba(0,0,0,0.10)",
                    paddingHorizontal: 6,
                    paddingVertical: 4,
                    borderRadius: 8,
                  }}
                >
                  {slogans.map((_, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        pauseAutoSlide();
                        goToSlide(idx);
                        resumeAutoSlide();
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                      style={{
                        width: idx === slideIndex ? 10 : 5,
                        height: 5,
                        borderRadius: 2.5,
                        backgroundColor: idx === slideIndex ? "#ffffff" : "rgba(255,255,255,0.45)",
                      }}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* MENU CARDS */}
          <View className={`mt-8 ${isDesktopOrLaptop ? "flex-row flex-wrap justify-center gap-6" : "flex-row flex-wrap justify-between"}`}>
            {[
              { title: "My Chits", iconName: "folder", route: "/mychits" },
              { title: "My Account Copy", iconName: "credit-card", route: "/myaccountcopy" },
              { title: "My Live payments", subtitle: "My Outstanding", iconName: "attach-money", route: "/myoutstanding" },
              { title: "Newly Commenced Groups", iconName: "group", route: "/newgroups" },
              { title: "Vacancies", iconName: "event-seat", route: "/vacancy" },
              { title: "Contact Us", iconName: "contact-mail", route: "/contact" },
              { title: "Auction Room", iconName: "storefront", route: "/auctionroom" },
              { title: "Bid Now", iconName: "gavel", route: "/bidroom" },
            ].map((item, index) => (
              <MenuCard
                key={index}
                title={item.title}
                subtitle={(item as any).subtitle}
                iconName={item.iconName}
                route={item.route}
                isDesktopOrLaptop={isDesktopOrLaptop}
                isTablet={isTablet}
                badgeCount={item.route === "/vacancy" ? newVacancyCount : 0}
                onPress={() => setProfileMenuVisible(false)}
              />
            ))}
          </View>

          {/* FOOTER */}
          <View className={`mt-8 mb-10 ${isDesktopOrLaptop ? "max-w-4xl mx-auto w-full" : ""}`}>
            <View className={`bg-white rounded-2xl border border-[#e8f0eb] shadow-sm ${isDesktopOrLaptop ? "p-8" : "p-5"}`}>
              <View className="items-center mb-6">
                <Text className={`text-[#024e32] font-bold ${isDesktopOrLaptop ? "text-xl" : "text-lg"}`}>
                  Manikya Chits Private Limited
                </Text>
                <Text className={`text-gray-500 ${isDesktopOrLaptop ? "text-sm" : "text-xs"}`}>
                  Trusted Chit Fund Company Since 2020
                </Text>
              </View>
              <View className="mb-6 space-y-3">
                <View className="flex-row items-center justify-between border-b border-gray-100 pb-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="phone" size={18} color="#024e32" />
                    <Text className={`text-gray-600 ml-3 ${isDesktopOrLaptop ? "text-base" : "text-sm"}`}>Support:</Text>
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL("tel:+917259201729")}>
                    <Text className="text-[#024e32] font-medium">+91 7259201729</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center justify-between border-b border-gray-100 pb-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="email" size={18} color="#024e32" />
                    <Text className={`text-gray-600 ml-3 ${isDesktopOrLaptop ? "text-base" : "text-sm"}`}>Email:</Text>
                  </View>
                  <TouchableOpacity onPress={() => Linking.openURL("mailto:manikyachitsprivatelimited@gmail.com")}>
                    <Text className="text-[#024e32] font-medium text-sm">manikyachitsprivatelimited@gmail.com</Text>
                  </TouchableOpacity>
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <MaterialIcons name="access-time" size={18} color="#024e32" />
                    <Text className={`text-gray-600 ml-3 ${isDesktopOrLaptop ? "text-base" : "text-sm"}`}>Working Hours:</Text>
                  </View>
                  <Text className="text-gray-700 font-medium text-sm">9 AM - 6 PM (Mon-Sat)</Text>
                </View>
              </View>
              <View className="flex-row flex-wrap mb-6">
                {[
                  { value: "100+", label: "Active Groups" },
                  { value: "5K+", label: "Happy Customers" },
                  { value: "₹10Cr+", label: "Transactions" },
                  { value: "5+", label: "Years" },
                ].map((stat, index) => (
                  <View key={index} className="w-1/4 items-center">
                    <Text className="text-[#024e32] font-bold text-sm">{stat.value}</Text>
                    <Text className="text-gray-500 text-[10px] mt-1 text-center">{stat.label}</Text>
                  </View>
                ))}
              </View>
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

      {/* LOGOUT MODAL */}
      <Modal animationType="fade" transparent visible={logoutModalVisible} onRequestClose={() => setLogoutModalVisible(false)}>
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-3xl p-6 mx-5 w-full max-w-sm shadow-2xl">
            <View className="items-center mb-4">
              <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center">
                <MaterialIcons name="logout" size={40} color="#ea580c" />
              </View>
            </View>
            <Text className="text-2xl font-bold text-center text-gray-800 mb-2">Confirm Logout</Text>
            <Text className="text-gray-600 text-center text-base leading-6 mb-6">
              Are you sure you want to logout? You will need to login again to access your account.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setLogoutModalVisible(false)} className="flex-1 bg-gray-200 py-3.5 rounded-xl" activeOpacity={0.7}>
                <Text className="text-gray-700 text-center font-semibold text-base">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleLogout} className="flex-1 bg-red-600 py-3.5 rounded-xl" activeOpacity={0.8}>
                <View className="flex-row items-center justify-center">
                  <MaterialIcons name="logout" size={20} color="white" />
                  <Text className="text-white text-center font-semibold text-base ml-1">Logout</Text>
                </View>
              </TouchableOpacity>
            </View>
            <View className="mt-4 items-center flex-row justify-center">
              <MaterialIcons name="security" size={14} color="#9ca3af" />
              <Text className="text-gray-400 text-xs ml-1">Your session will be terminated</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =========================================================
// MENU CARD
// =========================================================

function MenuCard({
  title,
  subtitle,
  iconName,
  route,
  isDesktopOrLaptop,
  isTablet,
  onPress,
  badgeCount = 0,
}: {
  title: string;
  subtitle?: string;
  iconName: any;
  route: string;
  isDesktopOrLaptop: boolean;
  isTablet: boolean;
  onPress?: () => void;
  badgeCount?: number;
}) {
  const router = useRouter();

  const getCardWidth = () => {
    if (isDesktopOrLaptop) return "w-[30%]";
    else if (isTablet) return "w-[48%]";
    else return "w-[47%]";
  };

  const getCardHeight = () => {
    if (isDesktopOrLaptop) return "py-10";
    else if (isTablet) return "py-9";
    else return "py-8";
  };

  return (
    <TouchableOpacity
      className={`bg-white ${getCardWidth()} ${getCardHeight()} mb-6 rounded-3xl items-center shadow-md border border-[#e8f0eb] ${isDesktopOrLaptop ? "mx-2" : ""}`}
      activeOpacity={0.9}
      onPress={() => {
        if (onPress) onPress();
        router.push(route);
      }}
    >
      <View className={`rounded-2xl items-center justify-center mb-4 ${isDesktopOrLaptop ? "w-20 h-20" : "w-16 h-16"}`}>
        <MaterialIcons
          name={iconName}
          size={isDesktopOrLaptop ? 42 : isTablet ? 36 : 32}
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
      <Text className={`text-[#024e32] font-semibold text-center ${isDesktopOrLaptop ? "text-lg" : "text-base"}`}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          className={`text-gray-500 text-center mt-1 px-2 ${isDesktopOrLaptop ? "text-sm" : "text-xs"}`}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}