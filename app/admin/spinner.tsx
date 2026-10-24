import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import LiveSpinnerView from "../../components/spinner/LiveSpinnerView";
import {
  CandidatesResponse,
  SpinnerHttpError,
  SpinState,
  fetchCandidates,
  startSpinRequest,
} from "../../components/spinner/spinnerApi";
import { useSpinnerSession } from "../../components/spinner/useSpinnerSession";

/* =========================================================
   ADMIN SPINNER   (route: /admin/spinner)

   Opened from the admin Bid Room. The wheel is filled
   automatically from the auction's bids. It is locked until the
   auction end date/time has passed.
========================================================= */

const KEY_STORAGE = "spinnerAdminKey";
const DURATIONS = [6, 9, 12, 15];
const ROTATIONS = [5, 6, 8];

const GREEN = "#024E32";
const GOLD = "#C9A227";

const card = {
  backgroundColor: "#FFFFFF",
  borderRadius: 22,
  borderWidth: 1,
  borderColor: "#EEF1EF",
  padding: 18,
  marginTop: 16,
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.05,
  shadowRadius: 3,
  elevation: 2,
} as const;

const formatRemaining = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const confirmDialog = (title: string, message: string, ok: () => void) => {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) ok();
    return;
  }
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    { text: "Start spin", style: "default", onPress: ok },
  ]);
};

export default function AdminSpinner() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    notificationId?: string;
    groupId?: string;
    groupCode?: string;
    auctionEndDate?: string;
    auctionEndTime?: string;
  }>();

  const notificationId = String(params.notificationId || "");
  const groupCode = String(params.groupCode || "");
  const groupMongoId = String(params.groupId || "");
  const auctionEndDate = String(params.auctionEndDate || "");
  const auctionEndTime = String(params.auctionEndTime || "");

  // Prefer the notification id; otherwise group + end date/time.
  const identity = useMemo(
    () =>
      notificationId
        ? { notificationId }
        : {
            groupId: groupCode || groupMongoId,
            auctionEndDate,
            auctionEndTime,
          },
    [notificationId, groupCode, groupMongoId, auctionEndDate, auctionEndTime]
  );

  /* ---------------- admin key ---------------- */
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [keyMessage, setKeyMessage] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(KEY_STORAGE)
      .then((v) => v && setAdminKey(v))
      .catch(() => {})
      .finally(() => setKeyLoaded(true));
  }, []);

  const saveKey = async () => {
    const k = keyInput.trim();
    if (!k) return;
    try {
      await AsyncStorage.setItem(KEY_STORAGE, k);
    } catch {}
    setKeyMessage("");
    setAdminKey(k);
    setKeyInput("");
  };

  const forgetKey = async (message: string) => {
    try {
      await AsyncStorage.removeItem(KEY_STORAGE);
    } catch {}
    setAdminKey("");
    setKeyMessage(message);
  };

  /* ---------------- data ---------------- */
  const [data, setData] = useState<CandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [clockOffset, setClockOffset] = useState(0);
  const [tick, setTick] = useState(Date.now());

  const [target, setTarget] = useState<string | null>(null); // null = random draw
  const [durationSec, setDurationSec] = useState(9);
  const [rotations, setRotations] = useState(6);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const [startedSession, setStartedSession] = useState<SpinState | null>(null);

  const load = useCallback(async () => {
    if (!adminKey) return;
    try {
      setLoadError("");
      const result = await fetchCandidates(identity, adminKey);
      setClockOffset(result.serverTime - Date.now());
      setData(result);
      // keep the selection only while that member is still a candidate
      setTarget((cur) =>
        cur && result.candidates.some((c) => c.groupMemberId === cur) ? cur : null
      );
    } catch (e: any) {
      if (e instanceof SpinnerHttpError && e.status === 401) {
        forgetKey("That key was not accepted. Enter the spinner admin key again.");
      } else if (e instanceof SpinnerHttpError && e.status === 503) {
        setLoadError(
          "The spinner key is not set on the server yet (SPINNER_ADMIN_KEY)."
        );
      } else {
        setLoadError(e?.message || "Could not load the spinner data");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminKey, identity]);

  useEffect(() => {
    if (adminKey) {
      setLoading(true);
      load();
    }
  }, [adminKey, load]);

  // one-second clock for the "unlocks in" timer
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // live sync (also covers a spin started from another admin device)
  const live = useSpinnerSession({
    ...identity,
    adminKey,
    enabled: Boolean(adminKey),
  });

  const session: SpinState | null =
    live.state || startedSession || data?.session || null;

  const serverNowMs = tick + clockOffset;
  const remainingMs = data?.auctionEndsAt
    ? data.auctionEndsAt - serverNowMs
    : 0;
  const auctionEnded = Boolean(data?.auctionEnded) || (Boolean(data?.auctionEndsAt) && remainingMs <= 0);

  const candidates = data?.candidates || [];
  const alreadySpun = Boolean(session);

  let lockReason = "";
  if (!data) lockReason = "Loading…";
  else if (alreadySpun) lockReason = "This auction has already been spun.";
  else if (data.winnerAlreadyRecorded)
    lockReason = "A winner is already recorded for this auction.";
  else if (!auctionEnded)
    lockReason = `Unlocks when bidding ends in ${formatRemaining(remainingMs)}`;
  else if (candidates.length === 0) lockReason = "No eligible members to spin.";

  const canStart = !lockReason && !starting;

  const doStart = async () => {
    setStarting(true);
    setStartError("");
    try {
      const res = await startSpinRequest(
        {
          ...identity,
          targetGroupMemberId: target || undefined,
          durationSec,
          rotations,
        },
        adminKey
      );
      setStartedSession(res.session);
      live.refetch();
      load();
    } catch (e: any) {
      if (e instanceof SpinnerHttpError && e.status === 409 && e.body?.session) {
        setStartedSession(e.body.session);
      }
      if (e instanceof SpinnerHttpError && e.status === 401) {
        forgetKey("That key was not accepted. Enter the spinner admin key again.");
      }
      setStartError(e?.message || "Could not start the spin");
    } finally {
      setStarting(false);
    }
  };

  const onStartPress = () => {
    if (!canStart) return;
    const modeLine = target
      ? `You selected ${target}. Members will see "Admin-selected winner".`
      : `The server will pick one of ${candidates.length} members at random. Members will see "Random draw".`;
    confirmDialog(
      "Start the spin?",
      `${modeLine}\n\nThe spin starts on every connected phone and cannot be repeated.`,
      doStart
    );
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/admin");
  };

  const wheelSize = Math.min(Math.max(width - 72, 240), 360);
  const isWide = width >= 900;
  // same breakpoint the other admin pages (Groups, Enrollments ...) use for
  // their header, so this header looks identical on phone / tablet / desktop
  const isDesktopOrLaptop = width >= 768;

  /* ============================================================ */
  return (
    <View style={{ flex: 1, backgroundColor: "#F5F7F6" }}>
      <StatusBar barStyle="light-content" backgroundColor={GREEN} />

      {/* header */}
      <View
        style={{
          backgroundColor: GREEN,
          // same spacing as the Groups / Enrollments headers (pt-16 / pt-20 ...).
          // The root is a plain View (not SafeAreaView) so iPhone does not add
          // its own top gap on top of this padding.
          paddingHorizontal: isDesktopOrLaptop ? 32 : 20,
          paddingTop: isDesktopOrLaptop ? 80 : 64,
          paddingBottom: isDesktopOrLaptop ? 32 : 24,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={isDesktopOrLaptop ? { padding: 8 } : { marginTop: 4 }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={isDesktopOrLaptop ? 30 : 26} color="white" />
        </TouchableOpacity>
        <View style={{ marginLeft: 16, marginTop: 4, flex: 1 }}>
          <Text
            allowFontScaling={false}
            style={{ color: "white", fontSize: isDesktopOrLaptop ? 30 : 24, fontWeight: "700" }}
          >
            Auction Spinner
          </Text>
          <Text
            allowFontScaling={false}
            style={{ color: "#D1FAE5", fontSize: 12, marginTop: 1 }}
          >
            Group {groupCode || groupMongoId || "-"}
          </Text>
        </View>
        {adminKey ? (
          <TouchableOpacity
            onPress={() => forgetKey("")}
            accessibilityLabel="Change admin key"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="vpn-key" size={22} color="white" />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 48,
          alignItems: "center",
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
              live.refetch();
            }}
            colors={[GREEN]}
            tintColor={GREEN}
          />
        }
      >
        <View style={{ width: "100%", maxWidth: isWide ? 760 : 560 }}>
          {/* ---------- admin key ---------- */}
          {!keyLoaded ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={GREEN} />
          ) : !adminKey ? (
            <View style={card}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
                Spinner admin key
              </Text>
              <Text style={{ color: "#6B7280", marginTop: 6, lineHeight: 20 }}>
                Enter the key that is set on the server. It is saved on this
                device only and sent with every spinner request.
              </Text>
              {keyMessage ? (
                <Text style={{ color: "#B91C1C", marginTop: 10, fontWeight: "600" }}>
                  {keyMessage}
                </Text>
              ) : null}
              <TextInput
                value={keyInput}
                onChangeText={setKeyInput}
                placeholder="Admin key"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  marginTop: 14,
                  borderWidth: 1,
                  borderColor: "#D1D5DB",
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  backgroundColor: "#F9FAFB",
                  fontSize: 16,
                }}
              />
              <TouchableOpacity
                onPress={saveKey}
                activeOpacity={0.85}
                style={{
                  marginTop: 12,
                  backgroundColor: GREEN,
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: "center",
                  opacity: keyInput.trim() ? 1 : 0.5,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Save key</Text>
              </TouchableOpacity>
            </View>
          ) : loading && !data ? (
            <View style={{ paddingVertical: 80, alignItems: "center" }}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={{ color: "#6B7280", marginTop: 12 }}>
                Loading eligible members…
              </Text>
            </View>
          ) : loadError && !data ? (
            <View style={[card, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Text style={{ color: "#B91C1C", fontWeight: "800" }}>
                Could not load
              </Text>
              <Text style={{ color: "#B91C1C", marginTop: 6 }}>{loadError}</Text>
              <TouchableOpacity
                onPress={() => {
                  setLoading(true);
                  load();
                }}
                style={{
                  marginTop: 12,
                  alignSelf: "flex-start",
                  backgroundColor: GREEN,
                  borderRadius: 10,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: "white", fontWeight: "700" }}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : data ? (
            <>
              {/* ---------- auction summary ---------- */}
              <View style={card}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 16,
                      backgroundColor: "#EAF5EF",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <MaterialIcons name="casino" size={26} color={GREEN} />
                  </View>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={{ color: "#9CA3AF", fontSize: 11, fontWeight: "700", letterSpacing: 1 }}>
                      AUCTION ENDS
                    </Text>
                    <Text style={{ color: "#111827", fontSize: 17, fontWeight: "800", marginTop: 2 }}>
                      {data.auctionEndDate} · {data.auctionEndTime}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: auctionEnded ? "#DCFCE7" : "#FEF3C7",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: auctionEnded ? "#15803D" : "#B45309",
                      }}
                    >
                      {auctionEnded ? "BIDDING CLOSED" : "BIDDING OPEN"}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: "#F1F5F3", marginVertical: 16 }} />

                <View style={{ flexDirection: "row" }}>
                  {[
                    { label: "MAX BID", value: `₹${Number(data.maxBidAmount).toLocaleString("en-IN")}` },
                    { label: "TOTAL BIDS", value: String(data.totalBids) },
                    { label: "ELIGIBLE", value: String(candidates.length) },
                  ].map((s) => (
                    <View key={s.label} style={{ flex: 1 }}>
                      <Text style={{ color: "#9CA3AF", fontSize: 10, fontWeight: "700", letterSpacing: 1 }}>
                        {s.label}
                      </Text>
                      <Text style={{ color: "#111827", fontSize: 18, fontWeight: "800", marginTop: 3 }}>
                        {s.value}
                      </Text>
                    </View>
                  ))}
                </View>

                {data.usedFallback && candidates.length > 0 ? (
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: "#FFFBEB",
                      borderColor: "#FDE68A",
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <Text style={{ color: "#92400E", fontSize: 12, lineHeight: 17 }}>
                      Nobody bid the maximum. The members tied at the highest bid
                      (₹{Number(data.topBidAmount).toLocaleString("en-IN")}) are on the wheel.
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* ---------- live wheel (after the spin starts) ---------- */}
              {session ? (
                <View style={{ marginTop: 16 }}>
                  <LiveSpinnerView
                    state={session}
                    serverNow={live.serverNow}
                    size={wheelSize}
                  />
                </View>
              ) : null}

              {/* ---------- result record ---------- */}
              {session ? (
                <View style={card}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
                    Result record
                  </Text>
                  <Text style={{ color: "#374151", marginTop: 10 }}>
                    Winner:{" "}
                    <Text style={{ fontWeight: "800", color: GREEN }}>
                      {session.winner.groupMemberId}
                    </Text>
                    {session.winner.memberName ? ` · ${session.winner.memberName}` : ""}
                  </Text>
                  <Text style={{ color: "#374151", marginTop: 4 }}>
                    Bid: ₹{Number(session.winner.bidAmount).toLocaleString("en-IN")}
                  </Text>
                  <Text style={{ color: "#374151", marginTop: 4 }}>
                    Selection:{" "}
                    <Text style={{ fontWeight: "800" }}>
                      {session.mode === "ADMIN_SELECTED"
                        ? "Admin-selected winner"
                        : "Random draw"}
                    </Text>
                  </Text>
                  {session.audit?.length ? (
                    <View style={{ marginTop: 10 }}>
                      {session.audit.map((a, i) => (
                        <Text key={i} style={{ color: "#6B7280", fontSize: 12, marginTop: 2 }}>
                          {new Date(a.at).toLocaleString("en-IN")} · {a.event} · {a.detail}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <View
                    style={{
                      marginTop: 14,
                      backgroundColor: "#EFF6FF",
                      borderColor: "#BFDBFE",
                      borderWidth: 1,
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <Text style={{ color: "#1E40AF", fontSize: 12, lineHeight: 17 }}>
                      This does not change the auction winner. Enter the winner in
                      the notification as usual.
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* ---------- candidates + controls ---------- */}
              {!session ? (
                <>
                  <View style={card}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
                      Members on the wheel
                    </Text>
                    <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 4, lineHeight: 17 }}>
                      Leave “Random draw” selected for a fair random spin, or pick
                      one member to make them the winner. Members always see which
                      of the two was used.
                    </Text>

                    {/* random option */}
                    <TouchableOpacity
                      onPress={() => setTarget(null)}
                      activeOpacity={0.85}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: target === null }}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 14,
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: target === null ? GREEN : "#E5E7EB",
                        backgroundColor: target === null ? "#EAF5EF" : "#FFFFFF",
                      }}
                    >
                      <MaterialIcons
                        name={target === null ? "radio-button-checked" : "radio-button-unchecked"}
                        size={22}
                        color={target === null ? GREEN : "#9CA3AF"}
                      />
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={{ fontWeight: "800", color: "#111827" }}>Random draw</Text>
                        <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 1 }}>
                          The server picks one of {candidates.length} members
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {candidates.length === 0 ? (
                      <View style={{ alignItems: "center", paddingVertical: 28 }}>
                        <MaterialIcons name="people-outline" size={40} color="#CBD5E1" />
                        <Text style={{ color: "#6B7280", marginTop: 8 }}>
                          No eligible members yet
                        </Text>
                      </View>
                    ) : (
                      candidates.map((c) => {
                        const selected = target === c.groupMemberId;
                        return (
                          <TouchableOpacity
                            key={c.groupMemberId}
                            onPress={() => setTarget(c.groupMemberId)}
                            activeOpacity={0.85}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginTop: 8,
                              padding: 12,
                              borderRadius: 14,
                              borderWidth: 1.5,
                              borderColor: selected ? GOLD : "#E5E7EB",
                              backgroundColor: selected ? "#FFFBEB" : "#FFFFFF",
                            }}
                          >
                            <MaterialIcons
                              name={selected ? "radio-button-checked" : "radio-button-unchecked"}
                              size={22}
                              color={selected ? GOLD : "#9CA3AF"}
                            />
                            <View style={{ marginLeft: 10, flex: 1 }}>
                              <Text style={{ fontWeight: "800", color: "#111827", fontSize: 15 }}>
                                {c.groupMemberId}
                              </Text>
                              <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                                {c.memberName || "—"}
                              </Text>
                            </View>
                            <Text style={{ fontWeight: "700", color: GREEN }}>
                              ₹{Number(c.bidAmount).toLocaleString("en-IN")}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>

                  <View style={card}>
                    <Text style={{ fontSize: 16, fontWeight: "800", color: "#111827" }}>
                      Spin settings
                    </Text>

                    <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 12 }}>
                      Duration (seconds)
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 8, flexWrap: "wrap" }}>
                      {DURATIONS.map((d) => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => setDurationSec(d)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 999,
                            marginRight: 8,
                            marginBottom: 8,
                            backgroundColor: durationSec === d ? GREEN : "#F3F4F6",
                          }}
                        >
                          <Text style={{ color: durationSec === d ? "white" : "#374151", fontWeight: "700" }}>
                            {d}s
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={{ color: "#6B7280", fontSize: 12, marginTop: 6 }}>
                      Full wheel turns
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 8, flexWrap: "wrap" }}>
                      {ROTATIONS.map((r) => (
                        <TouchableOpacity
                          key={r}
                          onPress={() => setRotations(r)}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 8,
                            borderRadius: 999,
                            marginRight: 8,
                            marginBottom: 8,
                            backgroundColor: rotations === r ? GREEN : "#F3F4F6",
                          }}
                        >
                          <Text style={{ color: rotations === r ? "white" : "#374151", fontWeight: "700" }}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {startError ? (
                      <Text style={{ color: "#B91C1C", marginTop: 8, fontWeight: "600" }}>
                        {startError}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      onPress={onStartPress}
                      disabled={!canStart}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !canStart }}
                      style={{
                        marginTop: 14,
                        borderRadius: 16,
                        paddingVertical: 16,
                        alignItems: "center",
                        flexDirection: "row",
                        justifyContent: "center",
                        backgroundColor: canStart ? GREEN : "#9CA3AF",
                      }}
                    >
                      {starting ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <MaterialIcons name={canStart ? "play-arrow" : "lock"} size={22} color="white" />
                      )}
                      <Text style={{ color: "white", fontSize: 16, fontWeight: "800", marginLeft: 8 }}>
                        {starting ? "Starting…" : "Start Spin"}
                      </Text>
                    </TouchableOpacity>

                    {lockReason ? (
                      <Text style={{ color: "#6B7280", textAlign: "center", marginTop: 10, fontSize: 13 }}>
                        {lockReason}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
