import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import BACKEND_URL from "../../config.js";

interface PaymentRecord {
  amount?: number;
  paymentType?: string;
  paymentMode?: string;
  paidAt?: string;
  collectedBy?: string;
}

interface GroupEntry {
  groupId: string;
  groupName?: string;
  chitId?: string;
  memberId?: string;
  groupMemberId?: string;

  ledger?: {
    monthIndex?: number;
    installmentAmount?: number;
    paidAmount?: number;
    payments?: PaymentRecord[];
    dueDate?: string;
    status?: string;
  }[];
}

interface MemberResponse {
  userid?: string;
  username?: string;
  phone?: string;
  status?: string;
  createdAt?: string;
}

export default function MemberHistory() {
  const router = useRouter();

  const [searchUserId, setSearchUserId] = useState("");

  const [memberData, setMemberData] =
    useState<MemberResponse | null>(null);

  const [groups, setGroups] =
    useState<GroupEntry[]>([]);

  const [selectedGroupIndex, setSelectedGroupIndex] =
    useState<number | null>(null);

  const [loading, setLoading] = useState(false);

  const [searchPerformed, setSearchPerformed] =
    useState(false);

  /* =========================================================
     SKELETON ANIMATION
  ========================================================= */

  const skeletonOpacity = useRef(
    new Animated.Value(0.5)
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),

        Animated.timing(skeletonOpacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [skeletonOpacity]);

  /* =========================================================
     SEARCH MEMBER & FETCH GROUPS/LEDGER
  ========================================================= */

  const searchMemberHistory = async (query?: string) => {
    const searchValue =
      (query ?? searchUserId).trim();

    if (!searchValue) {
      Alert.alert(
        "Validation",
        "Please enter a member ID or member name"
      );
      return;
    }

    setLoading(true);
    setSearchPerformed(true);
    setMemberData(null);
    setGroups([]);
    setSelectedGroupIndex(null);

    try {
      /* ================= FETCH MEMBER DETAILS ================= */

      let memberInfo: any = null;

      // First try direct member lookup.
      const directMemberRes = await fetch(
        `${BACKEND_URL}/members/${encodeURIComponent(
          searchValue
        )}`
      );

      if (directMemberRes.ok) {
        memberInfo = await directMemberRes.json();
      } else {
        /*
         * If direct UserID lookup fails, fetch all members
         * and search by UserID OR username.
         */

        const membersRes = await fetch(
          `${BACKEND_URL}/members`
        );

        if (membersRes.ok) {
          const members =
            await membersRes.json();

          const normalizedQuery =
            searchValue.toLowerCase();

          memberInfo = (
            Array.isArray(members)
              ? members
              : []
          ).find((member: any) => {
            const userId = String(
              member.userid || ""
            ).toLowerCase();

            const userName = String(
              member.username || ""
            ).toLowerCase();

            return (
              userId.includes(normalizedQuery) ||
              userName.includes(normalizedQuery)
            );
          });
        }
      }

      /* ================= MEMBER NOT FOUND ================= */

      if (!memberInfo) {
        setMemberData(null);
        setGroups([]);

        Alert.alert(
          "Not Found",
          "Member not found with this ID or name"
        );

        return;
      }

      /* ================= SET MEMBER DATA ================= */

      setMemberData({
        userid: memberInfo.userid,
        username: memberInfo.username,
        phone: memberInfo.phone,
        status: memberInfo.status,
        createdAt: memberInfo.createdAt,
      });

      /* ================= FETCH MEMBER GROUPS ================= */

      const groupsRes = await fetch(
        `${BACKEND_URL}/groups/my-chits/${memberInfo.userid}`
      );

      const groupsData =
        await groupsRes.json();

      if (
        !groupsRes.ok ||
        !Array.isArray(groupsData)
      ) {
        setGroups([]);
        return;
      }

      /* ================= NORMALIZE GROUPS ================= */

      const normalizedGroups =
        groupsData.map((entry: any) => ({
          groupId: entry.groupId,

          groupName:
            entry.groupName ||
            entry.chitId ||
            entry.groupId,

          chitId: entry.chitId,
          memberId: entry.memberId,
          groupMemberId: entry.groupMemberId,
        }));

      /* ================= FETCH LEDGER FOR EACH GROUP ================= */

      const details: GroupEntry[] = [];

      for (const group of normalizedGroups) {
        try {
          const detailRes = await fetch(
            `${BACKEND_URL}/groups/account-copy/${memberInfo.userid}/${group.groupId}?groupMemberId=${
              group.groupMemberId || ""
            }`
          );

          const detailData =
            detailRes.ok
              ? await detailRes.json()
              : null;

          if (detailData) {
            details.push({
              ...group,

              groupName:
                detailData.groupName ||
                group.groupName,

              ledger:
                detailData.ledger || [],
            });
          }
        } catch (error) {
          console.log(
            "Group detail fetch failed",
            error
          );
        }
      }

      /* ================= SET GROUPS ================= */

      setGroups(details);

      // Automatically select the first group.
      if (details.length > 0) {
        setSelectedGroupIndex(0);
      }
    } catch (error) {
      console.error(
        "Error fetching member history",
        error
      );

      Alert.alert(
        "Error",
        "Failed to load member history"
      );
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     CLEAR SEARCH
  ========================================================= */

  const clearSearch = () => {
    setSearchUserId("");
    setMemberData(null);
    setGroups([]);
    setSelectedGroupIndex(null);
    setSearchPerformed(false);
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";

    return new Date(dateString).toLocaleDateString(
      "en-IN"
    );
  };

  /* =========================================================
     SUMMARY
  ========================================================= */

  const summary = useMemo(() => {
    const totalPayments = groups.reduce(
      (sum, group) =>
        sum +
        (group.ledger?.reduce(
          (groupSum, month) =>
            groupSum +
            (month.payments?.length || 0),
          0
        ) || 0),
      0
    );

    return {
      totalGroups: groups.length,
      totalPayments,
    };
  }, [groups]);

  /* =========================================================
     SELECTED GROUP
  ========================================================= */

  const selectedGroup =
    selectedGroupIndex !== null
      ? groups[selectedGroupIndex]
      : null;

  /* =========================================================
     SKELETON LOADING
  ========================================================= */

  const MemberHistorySkeleton = () => {
    return (
      <Animated.View
        style={{
          opacity: skeletonOpacity,
        }}
        className="px-5 mt-5"
      >
        {/* MEMBER DETAILS SKELETON */}

        <View className="bg-white rounded-2xl border border-gray-200 p-4">

          <View className="h-5 w-36 bg-gray-200 rounded-md" />

          <View className="h-4 w-56 bg-gray-200 rounded-md mt-5" />

          <View className="h-4 w-48 bg-gray-200 rounded-md mt-3" />

          <View className="h-4 w-52 bg-gray-200 rounded-md mt-3" />

          <View className="h-4 w-40 bg-gray-200 rounded-md mt-3" />

          <View className="border-t border-gray-200 mt-4 pt-4 flex-row justify-between">

            <View className="h-4 w-24 bg-gray-200 rounded-md" />

            <View className="h-4 w-24 bg-gray-200 rounded-md" />

          </View>

        </View>

        {/* GROUP SELECTOR SKELETON */}

        <View className="mt-6">

          <View className="h-4 w-28 bg-gray-200 rounded-md mb-3" />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View className="h-10 w-28 bg-gray-200 rounded-full mr-2" />

            <View className="h-10 w-32 bg-gray-200 rounded-full mr-2" />

            <View className="h-10 w-24 bg-gray-200 rounded-full" />
          </ScrollView>

        </View>

        {/* LEDGER SKELETON */}

        <View className="mt-5 bg-white rounded-2xl border border-gray-200 p-4">

          <View className="h-5 w-40 bg-gray-200 rounded-md" />

          <View className="h-4 w-32 bg-gray-200 rounded-md mt-3" />

          {/* MONTH 1 */}

          <View className="border-t border-gray-100 mt-5 pt-4">

            <View className="flex-row justify-between">

              <View className="h-4 w-20 bg-gray-200 rounded-md" />

              <View className="h-6 w-16 bg-gray-200 rounded-full" />

            </View>

            <View className="h-4 w-full bg-gray-200 rounded-md mt-4" />

            <View className="h-4 w-full bg-gray-200 rounded-md mt-3" />

            <View className="h-4 w-4/5 bg-gray-200 rounded-md mt-3" />

            <View className="bg-gray-100 rounded-xl p-3 mt-4">

              <View className="h-4 w-20 bg-gray-200 rounded-md mb-3" />

              <View className="h-4 w-full bg-gray-200 rounded-md" />

              <View className="h-4 w-full bg-gray-200 rounded-md mt-3" />

              <View className="h-4 w-3/4 bg-gray-200 rounded-md mt-3" />

            </View>

          </View>

          {/* MONTH 2 */}

          <View className="border-t border-gray-100 mt-5 pt-4">

            <View className="flex-row justify-between">

              <View className="h-4 w-20 bg-gray-200 rounded-md" />

              <View className="h-6 w-16 bg-gray-200 rounded-full" />

            </View>

            <View className="h-4 w-full bg-gray-200 rounded-md mt-4" />

            <View className="h-4 w-full bg-gray-200 rounded-md mt-3" />

          </View>

        </View>

      </Animated.View>
    );
  };

  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      <StatusBar barStyle="light-content" backgroundColor="#024E32" />

      {/* =====================================================
          HEADER - SAME AS CHIT SCHEMES PAGE
      ===================================================== */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.push("/admin")}
            className="mt-1"
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Member History
          </Text>
        </View>
      </View>

      {/* =====================================================
          CONTENT
      ===================================================== */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 110,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* ===================================================
            SEARCH
        =================================================== */}

        <View className="px-5 pt-5">

          <Text className="text-gray-700 mb-2 font-semibold">
            Search member by ID or name
          </Text>

          <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3 py-2">

            <MaterialIcons
              name="search"
              size={20}
              color="#666"
            />

            <TextInput
              value={searchUserId}
              onChangeText={setSearchUserId}
              placeholder="Enter member ID or name"
              className="flex-1 ml-2 text-base"
              autoCapitalize="none"
            />

            {searchUserId.length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  setSearchUserId("")
                }
              >
                <MaterialIcons
                  name="close"
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            )}

          </View>

          {/* SEARCH BUTTON */}

          <View className="flex-row mt-3">

            <TouchableOpacity
              onPress={() =>
                searchMemberHistory()
              }
              disabled={loading}
              className="flex-1 bg-[#024e32] rounded-xl py-3 items-center"
            >

              {loading ? (
                <ActivityIndicator
                  color="white"
                />
              ) : (
                <Text className="text-white font-semibold">
                  Search Member
                </Text>
              )}

            </TouchableOpacity>

            {searchPerformed && (
              <TouchableOpacity
                onPress={clearSearch}
                className="ml-3 px-4 py-3 rounded-xl bg-gray-200"
              >
                <Text className="text-gray-700 font-semibold">
                  Clear
                </Text>
              </TouchableOpacity>
            )}

          </View>

        </View>

        {/* ===================================================
            SKELETON LOADING
        =================================================== */}

        {loading && (
          <MemberHistorySkeleton />
        )}

        {/* ===================================================
            MEMBER DETAILS
        =================================================== */}

        {!loading && memberData && (
          <View className="px-5 mt-5">

            <View className="bg-white rounded-2xl border border-gray-200 p-4">

              <Text className="text-[#024e32] font-bold text-lg">
                Member Details
              </Text>

              <Text className="text-gray-800 mt-2">
                <Text className="font-semibold">
                  Name:
                </Text>{" "}
                {memberData.username || "—"}
              </Text>

              <Text className="text-gray-800 mt-1">
                <Text className="font-semibold">
                  Member ID:
                </Text>{" "}
                {memberData.userid || "—"}
              </Text>

              <Text className="text-gray-800 mt-1">
                <Text className="font-semibold">
                  Mobile Number:
                </Text>{" "}
                {memberData.phone || "—"}
              </Text>

              {memberData.status && (
                <Text className="text-gray-800 mt-1">
                  <Text className="font-semibold">
                    Status:
                  </Text>{" "}
                  {memberData.status}
                </Text>
              )}

              {memberData.createdAt && (
                <Text className="text-gray-800 mt-1">
                  <Text className="font-semibold">
                    Joined:
                  </Text>{" "}
                  {formatDate(
                    memberData.createdAt
                  )}
                </Text>
              )}

              <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-200">

                <Text className="text-gray-600">
                  Groups: {summary.totalGroups}
                </Text>

                <Text className="text-gray-600">
                  Payments: {summary.totalPayments}
                </Text>

              </View>

            </View>

          </View>
        )}

        {/* ===================================================
            MEMBER NOT FOUND
        =================================================== */}

        {!loading &&
          searchPerformed &&
          !memberData && (
            <View className="px-5 py-10 items-center">

              <MaterialIcons
                name="person-search"
                size={48}
                color="#cbd5e1"
              />

              <Text className="text-gray-500 mt-3 text-center">
                No member found for the provided search.
              </Text>

            </View>
          )}

        {/* ===================================================
            NO GROUPS
        =================================================== */}

        {!loading &&
          memberData &&
          groups.length === 0 && (
            <View className="px-5 py-10 items-center">

              <MaterialIcons
                name="history"
                size={48}
                color="#cbd5e1"
              />

              <Text className="text-gray-500 mt-3 text-center">
                No chit groups found for this member.
              </Text>

            </View>
          )}

        {/* ===================================================
            GROUPS
        =================================================== */}

        {!loading &&
          memberData &&
          groups.length > 0 && (
            <View className="px-5 mt-5">

              <Text className="text-gray-700 font-semibold mb-2">
                Select a Group:
              </Text>

              {/* GROUP SELECTOR */}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row pb-2"
              >

                {groups.map(
                  (group, index) => (
                    <TouchableOpacity
                      key={`${group.groupId}-${index}`}
                      onPress={() =>
                        setSelectedGroupIndex(
                          index
                        )
                      }
                      className={`mr-2 px-4 py-2 rounded-full border ${
                        selectedGroupIndex ===
                        index
                          ? "bg-[#024e32] border-[#024e32]"
                          : "bg-white border-gray-300"
                      }`}
                    >

                      <Text
                        className={`font-semibold ${
                          selectedGroupIndex ===
                          index
                            ? "text-white"
                            : "text-gray-700"
                        }`}
                      >
                        {group.groupName ||
                          group.groupId}
                      </Text>

                    </TouchableOpacity>
                  )
                )}

              </ScrollView>

              {/* SELECTED GROUP LEDGER */}

              {selectedGroup &&
              selectedGroup.ledger &&
              selectedGroup.ledger.length > 0 ? (

                <View className="mt-4 bg-white rounded-2xl border border-gray-200 p-4">

                  <Text className="text-[#024e32] font-bold text-lg mb-2">
                    {selectedGroup.groupName ||
                      selectedGroup.groupId}
                  </Text>

                  <Text className="text-gray-600 mb-4">
                    Group ID:{" "}
                    {selectedGroup.groupId}
                  </Text>

                  {/* MONTHS */}

                  {selectedGroup.ledger.map(
                    (month, monthIndex) => (

                      <View
                        key={`${selectedGroup.groupId}-${monthIndex}`}
                        className="border-t border-gray-100 pt-4 mt-3"
                      >

                        {/* MONTH HEADER */}

                        <View className="flex-row justify-between items-center">

                          <Text className="font-bold text-gray-800 text-base">
                            Month{" "}
                            {month.monthIndex ||
                              monthIndex + 1}
                          </Text>

                          <View
                            className={`px-3 py-1 rounded-full ${
                              month.status ===
                              "PAID"
                                ? "bg-green-100"
                                : month.status ===
                                  "OVERDUE"
                                ? "bg-red-100"
                                : "bg-yellow-100"
                            }`}
                          >

                            <Text
                              className={`text-xs font-semibold ${
                                month.status ===
                                "PAID"
                                  ? "text-green-700"
                                  : month.status ===
                                    "OVERDUE"
                                  ? "text-red-700"
                                  : "text-yellow-700"
                              }`}
                            >
                              {month.status ||
                                "DUE"}
                            </Text>

                          </View>

                        </View>

                        {/* INSTALLMENT */}

                        <View className="flex-row mt-1">

                          <Text className="text-gray-600 flex-1">
                            Installment:
                          </Text>

                          <Text className="font-semibold">
                            ₹
                            {month.installmentAmount ??
                              0}
                          </Text>

                        </View>

                        {/* PAID */}

                        <View className="flex-row">

                          <Text className="text-gray-600 flex-1">
                            Paid:
                          </Text>

                          <Text className="font-semibold text-green-600">
                            ₹
                            {month.paidAmount ??
                              0}
                          </Text>

                        </View>

                        {/* DUE DATE */}

                        {month.dueDate && (
                          <View className="flex-row">

                            <Text className="text-gray-600 flex-1">
                              Due Date:
                            </Text>

                            <Text className="text-gray-800">
                              {formatDate(
                                month.dueDate
                              )}
                            </Text>

                          </View>
                        )}

                        {/* PAYMENTS */}

                        {month.payments &&
                        month.payments.length > 0 ? (

                          <View className="mt-3 bg-gray-50 rounded-xl p-3">

                            <Text className="font-semibold text-gray-700 mb-2">
                              Payments
                            </Text>

                            {month.payments.map(
                              (
                                payment,
                                paymentIndex
                              ) => (

                                <View
                                  key={`${selectedGroup.groupId}-${monthIndex}-${paymentIndex}`}
                                  className="border-b border-gray-200 pb-2 mb-2"
                                >

                                  {/* PAYMENT AMOUNT */}

                                  <View className="flex-row justify-between">

                                    <Text className="text-gray-600">
                                      #
                                      {paymentIndex +
                                        1}
                                    </Text>

                                    <Text className="font-semibold text-blue-600">
                                      ₹
                                      {payment.amount ??
                                        0}
                                    </Text>

                                  </View>

                                  {/* DATE + PAYMENT MODE */}

                                  <View className="flex-row justify-between mt-1">

                                    <Text className="text-gray-500 text-sm">
                                      {payment.paidAt
                                        ? formatDate(
                                            payment.paidAt
                                          )
                                        : "—"}
                                    </Text>

<Text className="text-gray-500 text-sm">
  {payment.paymentMode?.toLowerCase() === "cheque"
    ? "AC"
    : payment.paymentMode || "—"}
</Text>

                                  </View>

                                  {/* TYPE + COLLECTED BY */}

                                  <View className="flex-row justify-between mt-1">

                                    <Text className="text-gray-500 text-sm">
                                      Type:{" "}
                                      {payment.paymentType ||
                                        "INSTALLMENT"}
                                    </Text>

                                    <Text className="text-gray-500 text-sm">
                                      By:{" "}
                                      {payment.collectedBy ||
                                        "—"}
                                    </Text>

                                  </View>

                                </View>
                              )
                            )}

                          </View>

                        ) : (

                          <Text className="text-gray-500 mt-2">
                            No payments for this month.
                          </Text>

                        )}

                      </View>
                    )
                  )}

                </View>

              ) : (

                selectedGroup && (
                  <View className="mt-4 bg-white rounded-2xl border border-gray-200 p-4">

                    <Text className="text-gray-500 text-center">
                      No ledger data for this group.
                    </Text>

                  </View>
                )

              )}

            </View>
          )}

        {/* ===================================================
            COMPANY FOOTER - SAME AS CHIT SCHEMES PAGE
        =================================================== */}

        <View className="mt-10 mb-6 px-5">
          <View className="border-t border-gray-200 pt-4 items-center">
            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>
            <Text className="text-gray-500 text-xs mt-1 text-center">
              Member History
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>
          </View>
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}