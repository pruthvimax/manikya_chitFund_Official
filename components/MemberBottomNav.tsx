import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  UIManager,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config";
import { USE_NEW_MEMBER_DESIGN } from "./memberDesign";
import { subscribeNavCompact } from "./navScrollBus";
import { useLiveBadges } from "./useLiveBadges";

// =========================================================
// Floating bottom navigation for ALL member pages.
// It sits under the page (not on top of it), so no content is hidden.
// Switch it off with USE_NEW_MEMBER_DESIGN = false (memberDesign.ts).
// =========================================================

const BRAND = "#024e32";

// Pages where the member should see the navigation.
const MEMBER_ROUTES = [
  "/menu",
  "/mychits",
  "/newgroups",
  "/auctionroom",
  "/bidroom",
  // "/bidnow" is left out on purpose: the Bid Now page has its own bid bar, and a second bar
  // under it made the page jump when the keyboard opened. Add it back here to show the bar again.
  "/myaccountcopy",
  "/myoutstanding",
  "/mynextdue",
  "/myreceipts",
  "/vacancy",
  "/contact",
  "/myprofile",
  "/notifications",
];

const MORE_ROUTES = ["/myaccountcopy", "/myoutstanding", "/mynextdue", "/myreceipts", "/vacancy", "/bidroom", "/bidnow", "/contact"];

type NavItem = { key: string; label: string; icon: any; route?: string };

const PRIMARY: NavItem[] = [
  { key: "home", label: "Home", icon: "home", route: "/menu" },
  { key: "chits", label: "My Chits", icon: "folder", route: "/mychits" },
  { key: "new", label: "New Chits", icon: "group-add", route: "/newgroups" },
  { key: "auction", label: "Auction", icon: "storefront", route: "/auctionroom" },
  { key: "more", label: "More", icon: "apps" },
];

const QUICK_LINKS = [
  { label: "My Account Copy", icon: "credit-card", route: "/myaccountcopy" },
  { label: "My Live Payments", icon: "attach-money", route: "/myoutstanding" },
  { label: "My Next Due", icon: "event-note", route: "/mynextdue" },
  { label: "My Receipts", icon: "receipt-long", route: "/myreceipts" },
  { label: "Vacancies", icon: "event-seat", route: "/vacancy" },
  { label: "Bid Now", icon: "gavel", route: "/bidroom" },
  { label: "Contact Us", icon: "contact-mail", route: "/contact" },
];

function cleanPath(p: string | null | undefined) {
  if (!p) return "/";
  const x = p.split("?")[0];
  return x.length > 1 && x.endsWith("/") ? x.slice(0, -1) : x;
}

export default function MemberBottomNav() {
  const pathname = cleanPath(usePathname());
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);
  const [vacancyCount, setVacancyCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0); // same number as the bell on the menu page
  const [compact, setCompact] = useState(false);
  const lastTap = useRef(0);
  const smallAnim = useRef(new Animated.Value(0)).current; // Android: 0 = full, 1 = small
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const lastVacancyFetch = useRef(0);

  const visible = USE_NEW_MEMBER_DESIGN && MEMBER_ROUTES.includes(pathname);

  // hide while the keyboard is open (so it never sits on top of inputs)
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const a = Keyboard.addListener(showEvt, () => setKeyboardUp(true));
    const b = Keyboard.addListener(hideEvt, () => setKeyboardUp(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  // small red numbers: "More" = new vacancies, "Home" = new notifications
  // (same rules as the bell on the menu page). Re-counted on every page change
  // and instantly when the server says something changed.
  const countBadges = useCallback(async () => {
    const now = Date.now();
    if (now - lastVacancyFetch.current < 1200) return;
    lastVacancyFetch.current = now;
    try {
      const stored = await AsyncStorage.getItem("loggedUser");
      const userid = stored ? JSON.parse(stored)?.userid : null;
      if (!userid) return;
      let bellVac = 0;
      let bellNotif = 0;
      const [vRes, nRes] = await Promise.all([
        fetch(`${BACKEND_URL}/vacancy/open?userid=${encodeURIComponent(userid)}`).catch(() => null),
        fetch(`${BACKEND_URL}/notifications/user/${encodeURIComponent(userid)}`).catch(() => null),
      ]);
      if (vRes && vRes.ok) {
        const data = await vRes.json();
        const list = Array.isArray(data) ? data : [];
        const lastSeenStr = await AsyncStorage.getItem("lastSeenVacancyAt");
        const lastSeen = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
        setVacancyCount(
          list.filter((v: any) => (v.createdAt ? new Date(v.createdAt).getTime() : 0) > lastSeen).length
        );
        const bellStr = await AsyncStorage.getItem("bellSeenVacancyAt");
        const bellSeen = bellStr ? new Date(bellStr).getTime() : 0;
        bellVac = list.filter((v: any) => (v.createdAt ? new Date(v.createdAt).getTime() : 0) > bellSeen).length;
      }
      if (nRes && nRes.ok) {
        const data = await nRes.json();
        const list = Array.isArray(data) ? data : [];
        const lastSeenStr = await AsyncStorage.getItem("lastSeenNotificationAt");
        const lastSeen = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
        bellNotif = list.filter((n: any) => (n.createdAt ? new Date(n.createdAt).getTime() : 0) > lastSeen).length;
      }
      setNotifCount(bellNotif + bellVac);
    } catch {}
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (pathname === "/notifications") {
      // opening the notifications page clears the bell number (Home tab). The
      // vacancy number on "More" stays until the Vacancy page is opened.
      const stamp = new Date().toISOString();
      setNotifCount(0);
      AsyncStorage.setItem("lastSeenNotificationAt", stamp).catch(() => {});
      AsyncStorage.setItem("bellSeenVacancyAt", stamp).catch(() => {});
      return;
    }
    lastVacancyFetch.current = 0;
    countBadges();
  }, [pathname, visible, countBadges]);

  useLiveBadges(visible, () => {
    lastVacancyFetch.current = 0;
    countBadges();
  });

  // close the sheet whenever the page changes (and show the full bar again)
  useEffect(() => {
    setMoreOpen(false);
    setCompact(false);
  }, [pathname]);

  // small while scrolling down, full again when scrolling up
  useEffect(() => {
    try {
      (UIManager as any).setLayoutAnimationEnabledExperimental?.(true);
    } catch {}
    return subscribeNavCompact((c) => {
      setCompact((prev) => {
        if (prev === c) return prev;
        if (Platform.OS === "ios") {
          LayoutAnimation.configureNext(LayoutAnimation.create(180, "easeInEaseOut", "opacity"));
        }
        return c;
      });
    });
  }, []);

  // Android: shrink with transforms only (runs on the UI thread, so the page behind is
  // never re-measured while animating -> no stutter). iPhone keeps its own smooth animation.
  useEffect(() => {
    Animated.timing(smallAnim, {
      toValue: compact ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [compact, smallAnim]);

  useEffect(() => {
    if (moreOpen) {
      sheetAnim.setValue(0);
      Animated.timing(sheetAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [moreOpen, sheetAnim]);

  const go = useCallback(
    (route: string) => {
      // ignore accidental double taps (this is what made it feel "stuck")
      const now = Date.now();
      if (now - lastTap.current < 350) return;
      lastTap.current = now;
      if (route === pathname) return;
      try {
        if (route === "/menu") {
          // go back to the existing menu page instead of stacking a new one
          (router as any).dismissTo ? (router as any).dismissTo("/menu") : router.replace("/menu");
        } else if (pathname === "/menu") {
          router.push(route as any); // back button returns to the menu
        } else {
          router.replace(route as any); // switching pages never piles up
        }
      } catch {
        router.replace(route as any);
      }
    },
    [pathname, router]
  );

  if (!visible || keyboardUp) return null;

  const isActive = (item: NavItem) => {
    if (item.key === "more") return moreOpen || MORE_ROUTES.includes(pathname);
    return item.route === pathname;
  };

  const floating = pathname !== "/bidnow";
  const layoutCompact = Platform.OS === "ios" ? compact : false;
  const bottomPad = layoutCompact ? Math.max(insets.bottom, 4) : Math.max(insets.bottom, Platform.OS === "ios" ? 10 : 8);

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          // floats OVER the page (pages leave room for it with navPad); the Bid Now
          // page has its own bottom bar, so there the bar stays below the page
          ...(floating ? { position: "absolute" as const, left: 0, right: 0, bottom: 0 } : {}),
          backgroundColor: "transparent",
          paddingHorizontal: 14,
          paddingTop: layoutCompact ? 3 : 6,
          paddingBottom: bottomPad,
        }}
      >
        <Animated.View
          style={{
            transform:
              Platform.OS === "android"
                ? [
                    { translateY: smallAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
                    { scale: smallAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) },
                  ]
                : [],
            flexDirection: "row",
            alignItems: "center",
            alignSelf: layoutCompact ? "center" : "stretch",
            // WEB only: on a wide browser keep the bar a sensible width, centred
            // (iPhone and Android stay exactly as before)
            ...(Platform.OS === "web" && !layoutCompact ? { width: "100%", maxWidth: 560, alignSelf: "center" } : {}),
            // frosted-glass look: slightly see-through white, so cards show faintly
            // behind it but the icons and labels stay easy to read
            backgroundColor: Platform.OS === "android" ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.88)",
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(216,230,223,0.95)",
            paddingVertical: layoutCompact ? 4 : 7,
            paddingHorizontal: layoutCompact ? 8 : 6,
            shadowColor: "#0b3324",
            shadowOpacity: 0.2,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
          }}
        >
          {PRIMARY.map((item) => {
            const active = isActive(item);
            return (
              <TouchableOpacity
                key={item.key}
                activeOpacity={0.75}
                onPress={() => (item.key === "more" ? setMoreOpen(true) : go(item.route!))}
                style={{
                  flex: layoutCompact ? 0 : 1,
                  width: layoutCompact ? 46 : undefined,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: layoutCompact ? 40 : 44,
                    height: layoutCompact ? 28 : 30,
                    borderRadius: 15,
                    alignItems: "center",
                    justifyContent: "center",
                    // iPhone keeps the original single-view look
                    backgroundColor: Platform.OS === "android" ? "transparent" : active ? BRAND : "transparent",
                  }}
                >
                  {/* Android only: draw the green shape as its own fully rounded layer
                      (the plain background rendered with square corners on some phones) */}
                  {Platform.OS === "android" && active && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: BRAND,
                        borderTopLeftRadius: 15,
                        borderTopRightRadius: 15,
                        borderBottomLeftRadius: 15,
                        borderBottomRightRadius: 15,
                        overflow: "hidden",
                      }}
                    />
                  )}
                  <MaterialIcons name={item.icon} size={21} color={active ? "#ffffff" : "#6b7f76"} />
                  {(item.key === "more" ? vacancyCount : item.key === "home" ? notifCount : 0) > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -3,
                        right: 1,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        paddingHorizontal: 3,
                        backgroundColor: "#ef4444",
                        borderWidth: 1.5,
                        borderColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                        {(item.key === "more" ? vacancyCount : notifCount) > 9 ? "9+" : item.key === "more" ? vacancyCount : notifCount}
                      </Text>
                    </View>
                  )}
                </View>
                {!layoutCompact && (
                <Animated.Text
                  numberOfLines={1}
                  style={{
                    fontSize: 10,
                    marginTop: 2,
                    fontWeight: active ? "700" : "500",
                    color: active ? BRAND : "#6b7f76",
                    opacity:
                      Platform.OS === "android"
                        ? smallAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
                        : 1,
                  }}
                >
                  {item.label}
                </Animated.Text>
                )}
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </View>

      {/* MORE -> Quick Links sheet */}
      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={() => setMoreOpen(false)}
        >
          <Animated.View
            style={{
              transform: [
                { translateY: sheetAnim.interpolate({ inputRange: [0, 1], outputRange: [260, 0] }) },
              ],
            }}
          >
            <Pressable
              onPress={() => {}}
              style={{
                backgroundColor: BRAND,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                paddingHorizontal: 18,
                paddingTop: 10,
                paddingBottom: bottomPad + 14,
              }}
            >
              <View
                style={{
                  alignSelf: "center",
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: "rgba(255,255,255,0.35)",
                  marginBottom: 14,
                }}
              />
              <Text style={{ color: "#ffffff", fontSize: 19, fontWeight: "800" }}>Quick Links</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2, marginBottom: 14 }}>
                Jump to any page
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                {QUICK_LINKS.map((q) => (
                  <TouchableOpacity
                    key={q.route}
                    activeOpacity={0.8}
                    onPress={() => {
                      setMoreOpen(false);
                      go(q.route);
                    }}
                    style={{
                      width: "48.5%",
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: "rgba(255,255,255,0.14)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.22)",
                      borderRadius: 18,
                      padding: 12,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        backgroundColor: "#ffffff",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MaterialIcons name={q.icon as any} size={21} color={BRAND} />
                      {q.route === "/vacancy" && vacancyCount > 0 && (
                        <View
                          style={{
                            position: "absolute",
                            top: -5,
                            right: -5,
                            minWidth: 16,
                            height: 16,
                            borderRadius: 8,
                            paddingHorizontal: 3,
                            backgroundColor: "#ef4444",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>
                            {vacancyCount > 9 ? "9+" : vacancyCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      numberOfLines={2}
                      style={{ color: "#ffffff", fontWeight: "700", fontSize: 13, marginLeft: 10, flex: 1 }}
                    >
                      {q.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}
