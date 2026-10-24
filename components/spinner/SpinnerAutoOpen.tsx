import { MaterialIcons } from "@expo/vector-icons";
import { useIsFocused, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Text, TouchableOpacity } from "react-native";
import { useSpinnerSession } from "./useSpinnerSession";

/* =========================================================
   SpinnerAutoOpen  (placed once inside the member Bid Room)

   - Does nothing while bidding is still open.
   - After the auction has ended it listens for the live spin of
     THIS auction. The moment the admin starts it, the member's
     screen opens the live spinner automatically (no refresh).
   - If the member opens the Bid Room while a spin is already
     running, it opens straight away.
   - Once a spin exists it shows a small button to watch it again
     or to see the result.
========================================================= */

type Props = {
  enabled: boolean; // pass the Bid Room's `auctionEnded`
  groupId: string;
  groupCode?: string;
  auctionEndDate: string;
  auctionEndTime: string;
  userid: string;
};

export default function SpinnerAutoOpen({
  enabled,
  groupId,
  groupCode,
  auctionEndDate,
  auctionEndTime,
  userid,
}: Props) {
  const router = useRouter();
  const focused = useIsFocused();
  const openedFor = useRef<string>("");

  const { state, error } = useSpinnerSession({
    groupId: groupId || groupCode,
    auctionEndDate,
    auctionEndTime,
    userid,
    enabled: enabled && focused && Boolean(userid),
  });

  const open = () => {
    router.push({
      pathname: "/spinnerLive",
      params: {
        groupId: groupId || groupCode,
        groupCode: groupCode || "",
        auctionEndDate,
        auctionEndTime,
        userid,
      },
    });
  };

  // auto-open once per spin while it is still running
  useEffect(() => {
    if (!state || !focused) return;
    if (state.status === "completed") return;
    const key = `${state.notificationId}:${state.startsAt}`;
    if (openedFor.current === key) return;
    openedFor.current = key;
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.notificationId, state?.startsAt, state?.status, focused]);

  // Tell the member when the live draw cannot be reached
  // (for example "Not allowed" or no connection).
  if (enabled && !state && error) {
    return (
      <Text
        allowFontScaling={false}
        style={{ marginTop: 10, color: "#9CA3AF", fontSize: 11, textAlign: "center" }}
      >
        Live draw: {error}
      </Text>
    );
  }

  if (!enabled || !state) return null;

  return (
    <TouchableOpacity
      onPress={open}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={
        state.status === "completed" ? "View spin result" : "Watch live spin"
      }
      style={{
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#024E32",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 14,
      }}
    >
      <MaterialIcons name="casino" size={20} color="#F6E7A8" />
      <Text
        allowFontScaling={false}
        style={{
          color: "#FFFFFF",
          fontWeight: "700",
          fontSize: 14,
          marginLeft: 8,
        }}
      >
        {state.status === "completed" ? "View spin result" : "Watch live spin"}
      </Text>
    </TouchableOpacity>
  );
}
