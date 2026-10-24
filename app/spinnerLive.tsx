import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LiveSpinnerView from "../components/spinner/LiveSpinnerView";
import { useSpinnerSession } from "../components/spinner/useSpinnerSession";

/* =========================================================
   MEMBER LIVE SPINNER SCREEN   (route: /spinnerLive)

   Opened automatically from the Bid Room when the admin starts
   the spin, or from the "Watch live spin / View spin result" button.
========================================================= */

export default function SpinnerLive() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const params = useLocalSearchParams<{
    groupId?: string;
    groupCode?: string;
    auctionEndDate?: string;
    auctionEndTime?: string;
    userid?: string;
  }>();

  const [userid, setUserid] = useState(String(params.userid || ""));

  // fall back to the logged-in member if the param is missing
  useEffect(() => {
    if (userid) return;
    AsyncStorage.getItem("loggedUser")
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed?.userid) setUserid(String(parsed.userid));
      })
      .catch(() => {});
  }, [userid]);

  const { state, connected, loading, error, serverNow } = useSpinnerSession({
    groupId: String(params.groupId || ""),
    auctionEndDate: String(params.auctionEndDate || ""),
    auctionEndTime: String(params.auctionEndTime || ""),
    userid,
    enabled: Boolean(userid),
  });

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/menu");
  };

  const wheelSize = Math.min(Math.max(width - 72, 240), 360);

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7F6" }}>
      <StatusBar barStyle="light-content" backgroundColor="#024E32" />

      {/* header - same look as the Bid Room page */}
      <View
        style={{
          backgroundColor: "#024E32",
          paddingHorizontal: 16,
          paddingTop: insets.top + 10,
          paddingBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={goBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: isTablet ? 40 : 36,
              height: isTablet ? 40 : 36,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.1)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>

          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={{
                color: "white",
                fontWeight: "700",
                fontSize: isTablet ? 20 : 17,
              }}
            >
              Live Draw
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={{
                color: "#DCFCE7",
                fontSize: 11,
                marginTop: 2,
              }}
            >
              Group {String(params.groupCode || params.groupId || "-")}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.16)",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: connected ? "#4ADE80" : "#FBBF24",
                marginRight: 6,
              }}
            />
            <Text
              allowFontScaling={false}
              style={{ color: "white", fontSize: 11, fontWeight: "700" }}
            >
              {connected ? "LIVE" : "RECONNECTING"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 40,
          alignItems: "center",
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: "100%", maxWidth: 520 }}>
          {loading && !state ? (
            // the page is already open, so show the wheel straight away
            // instead of a "Connecting to the draw..." screen
            <LiveSpinnerView
              state={null}
              serverNow={serverNow}
              size={wheelSize}
              waitingText="Get ready…"
            />
          ) : error && !state ? (
            <View
              style={{
                backgroundColor: "#FEF2F2",
                borderColor: "#FECACA",
                borderWidth: 1,
                borderRadius: 16,
                padding: 18,
              }}
            >
              <Text style={{ color: "#B91C1C", fontWeight: "700" }}>
                Could not connect
              </Text>
              <Text style={{ color: "#B91C1C", marginTop: 4 }}>{error}</Text>
              <Text style={{ color: "#7F1D1D", marginTop: 8, fontSize: 12 }}>
                This screen reconnects by itself. You do not need to refresh.
              </Text>
            </View>
          ) : (
            <LiveSpinnerView
              state={state}
              serverNow={serverNow}
              size={wheelSize}
            />
          )}

          <TouchableOpacity
            onPress={goBack}
            activeOpacity={0.85}
            style={{
              marginTop: 18,
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#D1D5DB",
              borderRadius: 14,
              paddingVertical: 13,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#024E32", fontWeight: "700" }}>
              Back to Bid Room
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
