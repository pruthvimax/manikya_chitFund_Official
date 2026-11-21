import { MaterialIcons } from "@expo/vector-icons";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BACKEND_URL from "../config";
import { setBidNowCover } from "./bidNowCover";
import { useLiveBadges } from "./useLiveBadges";
import PageFooter from "./PageFooter";

/* =========================================================
   BID NOW SWITCH (member side)

   The admin can switch the Bid Now page OFF for one auction notification (Auction
   Notification page, toggle). When it is OFF, this cover opens on top of the Bid Now page
   and shows the live video link (Google Meet / Zoom ...) from the notification message.
   When it is ON, nothing is shown and the Bid Now page works exactly as before.

   The Bid Now page itself (and every bid rule) is NOT changed. This only looks at the
   notification of the auction that is open and covers the page while the switch is OFF.
========================================================= */

const POLL_MS = 8000;
const BRAND = "#024e32";

/** first web link in the message (https://..., meet.google.com/..., zoom.us/..., www....) */
const findLink = (text: string): string => {
  const m = String(text || "").match(/(https?:\/\/[^\s]+|(?:www\.|meet\.google\.com\/|zoom\.us\/|[a-z0-9-]+\.zoom\.us\/|teams\.microsoft\.com\/)[^\s]*)/i);
  if (!m) return "";
  const raw = m[0].replace(/[),.;]+$/, "");
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
};

/* last answer of the server (shared, so the cover can open in the SAME frame as the Bid Now page:
   no flash of the bid page, no jump). It is refreshed on every page change, instantly when the admin
   flips a switch, and every few seconds while the Bid Now page is open. */
let cache: { userid: string; list: any[] } | null = null;
let lastFetch = 0;

export default function BidNowGate() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{
    groupId?: string;
    groupCode?: string;
    auctionEndDate?: string;
    auctionEndTime?: string;
    userid?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const onBidNow = pathname === "/bidnow";
  const groupId = String(params.groupId || "");
  const groupCode = String(params.groupCode || "");
  const endDate = String(params.auctionEndDate || "");
  const endTime = String(params.auctionEndTime || "");

  const [, setTick] = useState(0);
  const [storedUser, setStoredUser] = useState("");

  // the logged-in member (read again on every page change, so login / logout is noticed)
  useEffect(() => {
    AsyncStorage.getItem("loggedUser")
      .then((s) => {
        try {
          const id = s ? JSON.parse(s)?.userid : "";
          setStoredUser(id ? String(id) : "");
        } catch {
          setStoredUser("");
        }
      })
      .catch(() => {});
  }, [pathname]);

  const userid = String(params.userid || "") || storedUser;

  const refresh = useCallback(
    async (force: boolean) => {
      if (!userid) return;
      const now = Date.now();
      if (!force && now - lastFetch < 2500) return;
      lastFetch = now;
      try {
        const res = await fetch(`${BACKEND_URL}/notifications/user/${encodeURIComponent(userid)}`);
        if (!res.ok) return;
        const list = await res.json();
        if (Array.isArray(list)) {
          cache = { userid, list };
          setTick((x) => x + 1);
        }
      } catch {
        // no answer: keep what we have
      }
    },
    [userid]
  );

  // every page change (so the answer is ready BEFORE the member opens Bid Now)
  useEffect(() => {
    refresh(onBidNow);
  }, [pathname, userid, onBidNow, refresh]);

  // the moment admin flips the switch
  useLiveBadges(!!userid, () => {
    refresh(true);
  });

  // while the Bid Now page is open
  useEffect(() => {
    if (!onBidNow) return;
    const id = setInterval(() => refresh(true), POLL_MS);
    return () => clearInterval(id);
  }, [onBidNow, refresh]);

  // decided while rendering, so the cover and the page appear together
  const list: any[] = cache && cache.userid === userid ? cache.list : [];
  let closed: { message: string } | null = null;
  if (onBidNow) {
    const ofGroup = list.filter(
      (n: any) =>
        (groupId && String(n?.groupId?._id || "") === groupId) ||
        (groupCode && String(n?.groupId?.groupId || "") === groupCode)
    );
    // the exact auction that is open; if the date / time are missing, the latest one of the group
    const match =
      ofGroup.find((n: any) => String(n.auctionEndDate) === endDate && String(n.auctionEndTime) === endTime) ||
      (!endDate || !endTime ? ofGroup[0] : null);
    if (match && match.bidNowEnabled === false) closed = { message: String(match.message || "") };
  }
  const showing = !!closed;

  // tells the member bottom navigation to show on this cover
  useEffect(() => {
    setBidNowCover(showing);
    return () => setBidNowCover(false);
  }, [showing]);

  if (!closed) return null;

  const link = findLink(closed.message);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/bidroom" as any);
  };

  const openLink = () => {
    if (!link) return;
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(link, "_blank");
      return;
    }
    Linking.openURL(link).catch(() => {});
  };

  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9990,
        elevation: 40,
        backgroundColor: "#F2F6F4",
      }}
    >
      <View style={{ backgroundColor: "#013D27", paddingTop: (Platform.OS === "web" ? 14 : insets.top) + 10, paddingBottom: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity onPress={goBack} style={{ padding: 4, marginRight: 10 }}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "900" }}>Live Auction</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120, alignItems: "center" }}>
        <View style={{ width: "100%", maxWidth: 520, backgroundColor: "#FFFFFF", borderRadius: 20, padding: 22, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#E7F5EE", alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="videocam" size={36} color={BRAND} />
          </View>
          <Text style={{ fontSize: 21, fontWeight: "900", color: "#0F172A", marginTop: 14, textAlign: "center" }}>Live video auction</Text>
          <Text style={{ fontSize: 13.5, color: "#475569", marginTop: 8, textAlign: "center", lineHeight: 20 }}>
            Bidding in the app is switched off for this auction. The auction is run live on video. Join the video call to take part.
          </Text>

          {link ? (
            <TouchableOpacity onPress={openLink} activeOpacity={0.88} style={{ marginTop: 20, backgroundColor: BRAND, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 26, flexDirection: "row", alignItems: "center" }}>
              <MaterialIcons name="video-call" size={22} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontWeight: "900", fontSize: 15, marginLeft: 8 }}>Join video auction</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ marginTop: 18, backgroundColor: "#FFF8E1", borderRadius: 12, padding: 12, width: "100%" }}>
              <Text style={{ color: "#92400E", fontSize: 12.5, textAlign: "center" }}>
                The video link is not added yet. Please check the message below or contact the office.
              </Text>
            </View>
          )}

          {!!closed.message.trim() && (
            <View style={{ marginTop: 18, width: "100%", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#64748B", marginBottom: 4 }}>MESSAGE FROM ADMIN</Text>
              <Text selectable style={{ fontSize: 13, color: "#1F2937", lineHeight: 19 }}>{closed.message}</Text>
            </View>
          )}

          <TouchableOpacity onPress={goBack} style={{ marginTop: 18, paddingVertical: 8 }}>
            <Text style={{ color: BRAND, fontWeight: "800", fontSize: 13.5 }}>Back</Text>
          </TouchableOpacity>
        </View>
        <PageFooter note="Live Auction" />
      </ScrollView>
    </View>
  );
}
