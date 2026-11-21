import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";

/* =========================================================
   MEMBER PAGES: smooth "slide + fade" when a page opens.

   - The page content fades in (and on Android also glides in ~28px from the right) in about a
     quarter of a second. It uses the native animation driver, so it runs on the phone's UI thread
     and stays smooth even while the page is loading its data.
   - Nothing waits for the animation: the page and its data load exactly as before.
   - iPhone keeps its normal native slide (and swipe back); only a gentle fade is added.
   - Only the member pages listed below. Admin, employee, login and Bid Now are not touched.
   To switch it off: set PAGE_TRANSITION = false.
========================================================= */
export const PAGE_TRANSITION = true;

export const MEMBER_PAGES = [
  "menu",
  "mychits",
  "newgroups",
  "auctionroom",
  "bidroom",
  "myaccountcopy",
  "myoutstanding",
  "mynextdue",
  "myreceipts",
  "vacancy",
  "contact",
  "notifications",
  "myprofile",
  "language",
];

function Enter({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  const android = Platform.OS === "android";

  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: android ? 260 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: v,
        transform: android ? [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }] : undefined,
      }}
    >
      {children}
    </Animated.View>
  );
}

/** used as <Stack screenLayout={memberScreenLayout}> in app/_layout.tsx */
export const memberScreenLayout = ({ children, route }: { children: React.ReactElement; route: { name: string } }) =>
  PAGE_TRANSITION && MEMBER_PAGES.includes(route.name) ? <Enter>{children}</Enter> : children;
