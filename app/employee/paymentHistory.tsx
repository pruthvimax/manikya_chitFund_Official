import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Alert,
} from "react-native";
import BACKEND_URL from "../../config";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* =========================================================
   CONSTANT FOOTER
========================================================= */

function Footer({ text = "Employee Payment History" }: { text?: string }) {
  return (
    <View className="px-5 mt-6 pb-3">
      <View className="border-t border-gray-200 pt-4 items-center">

        <Text className="text-[#024e32] font-bold text-base text-center">
          MANIKYA CHITS PVT LTD
        </Text>

        <Text className="text-gray-500 text-xs mt-1 text-center">
          {text}
        </Text>

        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
          {"\n"}All rights reserved.
        </Text>

      </View>
    </View>
  );
}

/* =========================================================
   SKELETON COMPONENTS
========================================================= */

function SkeletonBox({
  width = "w-full",
  height = "h-5",
  className = "",
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <View
      className={`${width} ${height} bg-gray-200 rounded-md ${className}`}
    />
  );
}

function PaymentHistorySkeleton() {
  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 20,
      }}
    >
      {/* INFO SKELETON */}

      <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-200">

        <View className="flex-row items-center justify-between">

          <View className="flex-row items-center">

            <SkeletonBox
              width="w-9"
              height="h-9"
            />

            <SkeletonBox
              width="w-32"
              height="h-4"
              className="ml-3"
            />

          </View>

          <SkeletonBox
            width="w-20"
            height="h-7"
          />

        </View>

        <View className="flex-row mt-5">

          <View className="flex-1">
            <SkeletonBox
              width="w-12"
              height="h-3"
              className="mb-2"
            />
            <SkeletonBox
              width="w-24"
              height="h-4"
            />
          </View>

          <View className="flex-1">
            <SkeletonBox
              width="w-12"
              height="h-3"
              className="mb-2"
            />
            <SkeletonBox
              width="w-28"
              height="h-4"
            />
          </View>

        </View>

      </View>

      {/* TOTAL CARD SKELETON */}

      <View className="bg-white rounded-2xl p-6 mb-6">

        <View className="flex-row items-center justify-between">

          <View className="flex-row items-center">

            <SkeletonBox
              width="w-12"
              height="h-12"
            />

            <SkeletonBox
              width="w-28"
              height="h-5"
              className="ml-3"
            />

          </View>

          <SkeletonBox
            width="w-28"
            height="h-8"
          />

        </View>

        <View className="flex-row justify-end mt-3">

          <SkeletonBox
            width="w-28"
            height="h-3"
          />

        </View>

      </View>

      {/* TIMELINE SKELETON */}

      <View className="bg-white rounded-2xl p-5 border border-gray-200">

        <View className="flex-row items-center mb-5">

          <SkeletonBox
            width="w-10"
            height="h-10"
          />

          <SkeletonBox
            width="w-36"
            height="h-5"
            className="ml-3"
          />

        </View>

        {[1, 2, 3].map((item) => (

          <View
            key={item}
            className="bg-white rounded-2xl border border-gray-200 mb-4 overflow-hidden"
          >

            <View className="flex-row">

              <View className="w-2 bg-gray-200" />

              <View className="flex-1 p-5">

                <View className="flex-row justify-between items-center mb-4">

                  <View className="flex-row items-center">

                    <SkeletonBox
                      width="w-12"
                      height="h-12"
                    />

                    <View className="ml-3">

                      <SkeletonBox
                        width="w-20"
                        height="h-6"
                        className="mb-2"
                      />

                      <SkeletonBox
                        width="w-24"
                        height="h-3"
                      />

                    </View>

                  </View>

                </View>

                <SkeletonBox
                  width="w-44"
                  height="h-4"
                  className="mb-3"
                />

                <SkeletonBox
                  width="w-36"
                  height="h-4"
                  className="mb-3"
                />

                <SkeletonBox
                  width="w-28"
                  height="h-4"
                  className="mb-4"
                />

                <SkeletonBox
                  width="w-full"
                  height="h-10"
                />

              </View>

            </View>

          </View>

        ))}

      </View>

      <Footer text="Employee Payment History" />

    </ScrollView>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function PaymentHistory() {

  const router = useRouter();

  const { width, height } = useWindowDimensions();

  const [refreshing, setRefreshing] = useState(false);

  /* Responsive breakpoints */

  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLandscape = width > height;

  const {
    groupId,
    memberId,
    monthIndex,
  } = useLocalSearchParams<{
    groupId?: string;
    memberId?: string;
    monthIndex?: string;
  }>();

  const [groups, setGroups] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [months, setMonths] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState<string>("");
  const [memberName, setMemberName] = useState<string>("");

  /* =========================================================
     FEATURE ACCESS GUARD
  ========================================================= */

  useEffect(() => {

    let interval: ReturnType<typeof setInterval>;

    const checkFeature = async () => {

      try {

        const stored =
          await AsyncStorage.getItem("employee");

        if (!stored) {

          router.replace("/employee/login");

          return;
        }

        const employee = JSON.parse(stored);

        /*
          FIXED:
          was `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/employee/...`
          which resolved to "undefined/api/..." and always failed.
          BACKEND_URL already ends with /api, so no /api here.
        */
        const res = await fetch(
          `${BACKEND_URL}/employee/check-status/${employee.emp_id}`
        );

        const data = await res.json();

        if (!data.featureAccess) {

          clearInterval(interval);

          Alert.alert(
            "Access Denied",
            "Payment History is disabled by admin"
          );

          router.replace("/employee");

          return;
        }

      } catch (err) {

        console.log(
          "Feature check failed",
          err
        );

      }

    };

    checkFeature();

    interval = setInterval(() => {

      checkFeature();

    }, 3000);

    return () => {

      clearInterval(interval);

    };

  }, []);

  /* =========================================================
     LOAD DATA
  ========================================================= */

  const loadData = async () => {

    try {

      setLoading(true);

      /* MODE 1 → LOAD GROUPS */

      if (!groupId) {

        const res =
          await fetch(`${BACKEND_URL}/groups`);

        const data = await res.json();

        setGroups(data || []);

      }

      /* MODE 2 → LOAD MEMBERS */

      else if (groupId && !memberId) {

        const res =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}/members`
          );

        const data = await res.json();

        setMembers(
          data.groupMembers || []
        );

        const groupRes =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}`
          );

        const groupData =
          await groupRes.json();

        setGroupName(
          groupData.groupId || groupId
        );

      }

      /* MODE 3 → LOAD MONTHS */

      else if (
        groupId &&
        memberId &&
        !monthIndex
      ) {

        const res =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}/members`
          );

        const data = await res.json();

        const member =
          data.groupMembers?.find(
            (m: any) =>
              m.groupMemberId === memberId
          );

        setMonths(
          member?.collections || []
        );

        setMemberName(
          member?.memberName || "Unknown"
        );

        const groupRes =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}`
          );

        const groupData =
          await groupRes.json();

        setGroupName(
          groupData.groupId || groupId
        );

      }

      /* MODE 4 → PAYMENT HISTORY */

      else {

        const res =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}/members`
          );

        const data = await res.json();

        const member =
          data.groupMembers?.find(
            (m: any) =>
              m.groupMemberId === memberId
          );

        const month =
          member?.collections?.find(
            (c: any) =>
              String(c.index) ===
              String(monthIndex)
          );

        const paymentList =
          month?.payments || [];

        setMemberName(
          member?.memberName || "Unknown"
        );

        const groupRes =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}`
          );

        const groupData =
          await groupRes.json();

        setGroupName(
          groupData.groupId || groupId
        );

        const plan =
          groupData.collectionPlans?.find(
            (p: any) =>
              String(p.monthIndex) ===
              String(monthIndex)
          );

        const dividend =
          Number(plan?.dividend || 0);

        const dividendPayment =
          dividend > 0
            ? [
                {
                  id: `dividend_${groupId}_${memberId}_${monthIndex}`,
                  amount: dividend,
                  paidAt:
                    plan?.startDate ||
                    new Date(),
                  paymentType: "DIVIDEND",
                  collectedBy: "System",
                },
              ]
            : [];

        const allPayments = [
          ...dividendPayment,
          ...(paymentList || []),
        ];

        setPayments(allPayments);

      }

    } catch (err) {

      console.log(
        "History Load Error:",
        err
      );

    } finally {

      setLoading(false);

      setRefreshing(false);

    }

  };

  useEffect(() => {

    loadData();

  }, [
    groupId,
    memberId,
    monthIndex,
  ]);

  const onRefresh =
    React.useCallback(() => {

      setRefreshing(true);

      loadData();

    }, []);

  /* =========================================================
     REPRINT RECEIPT
  ========================================================= */

  const handleReprint =
    async (payment: any) => {

      try {

        const res =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}/members`
          );

        const data =
          await res.json();

        const member =
          data.groupMembers?.find(
            (m: any) =>
              m.groupMemberId === memberId
          );

        const collection =
          member?.collections?.find(
            (c: any) =>
              String(c.index) ===
              String(monthIndex)
          );

        const paymentList =
          collection?.payments || [];

        const installmentPaid =
          paymentList
            .filter(
              (p: any) =>
                p.paymentType !== "PENALTY"
            )
            .reduce(
              (
                s: number,
                p: any
              ) =>
                s + (p.amount || 0),
              0
            );

        const penaltyPaid =
          paymentList
            .filter(
              (p: any) =>
                p.paymentType === "PENALTY"
            )
            .reduce(
              (
                s: number,
                p: any
              ) =>
                s + (p.amount || 0),
              0
            );

        const planRes =
          await fetch(
            `${BACKEND_URL}/groups/${groupId}/collection-plan/${monthIndex}`
          );

        const plan =
          await planRes.json();

        const installment =
          plan?.installmentAmount || 0;

        const dividend =
          plan?.dividend || 0;

        const effectivePaid =
          installmentPaid + dividend;

        const pendingInstallment =
          Math.max(
            installment -
              effectivePaid,
            0
          );

        const pendingPenalty =
          Math.max(
            (plan?.penalty || 0) -
              penaltyPaid,
            0
          );

        const totalDue =
          pendingInstallment +
          pendingPenalty;

        const dateObj =
          new Date(
            payment.paidAt ||
              payment.date
          );

        const receiptData = {

          groupId,

          groupMemberId:
            memberId,

          monthIndex,

          installmentAmount:
            installment,

          dividendAmount:
            dividend,

          todayInstallmentPaid:
            payment.paymentType ===
            "INSTALLMENT"
              ? payment.amount
              : 0,

          todayPenaltyPaid:
            payment.paymentType ===
            "PENALTY"
              ? payment.amount
              : 0,

          totalInstallmentPaid:
            installmentPaid,

          totalPenaltyPaid:
            penaltyPaid,

          pendingInstallment,

          pendingPenalty,

          totalDue,

          dueDate:
            plan?.endDate
              ? new Date(
                  plan.endDate
                ).toLocaleDateString(
                  "en-IN"
                )
              : "Not set",

          date:
            dateObj.toLocaleDateString(
              "en-IN"
            ),

          time:
            dateObj.toLocaleTimeString(
              "en-IN"
            ),

        };

        router.push({

          pathname:
            "/employee/receipt",

          params: {
            receipt:
              JSON.stringify(
                receiptData
              ),
          },

        });

      } catch (err) {

        Alert.alert(
          "Error",
          "Failed to generate receipt"
        );

      }

    };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {

    return (

      <SafeAreaView className="flex-1 bg-gray-50">

        {/* FIXED HEADER */}

        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

          <View className="flex-row items-center">

            <TouchableOpacity
              onPress={() =>
                router.back()
              }
              className="mt-1"
              activeOpacity={0.7}
            >

              <MaterialIcons
                name="arrow-back"
                size={26}
                color="white"
              />

            </TouchableOpacity>

            <View className="flex-1 ml-4">

              <Text className="text-white text-2xl font-bold mt-1">
                Payment History
              </Text>

              <Text className="text-green-100 text-sm mt-1">
                Loading payment history...
              </Text>

            </View>

          </View>

        </View>

        <View
          className="flex-1"
          style={{
            paddingTop: 110,
          }}
        >

          <PaymentHistorySkeleton />

        </View>

      </SafeAreaView>

    );

  }

  /* =========================================================
     MODE 1 → GROUP LIST
  ========================================================= */

  if (!groupId) {

    return (

      <Wrapper
        title="Select Group"
        subtitle="Choose a group to view payment history"
        router={router}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      >

        {isDesktop ? (

          <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
          >

            <View className="p-8">

              <View className="flex-row flex-wrap gap-6 justify-center">

                {groups.map((item) => (

                  <TouchableOpacity
                    key={item.groupId}
                    onPress={() =>
                      router.push({
                        pathname:
                          "/employee/paymentHistory",
                        params: {
                          groupId:
                            item.groupId,
                        },
                      })
                    }
                    className="bg-white rounded-2xl shadow-lg overflow-hidden"
                    style={{
                      width: 320,
                    }}
                  >

                    <View className="h-2 bg-[#024e32]" />

                    <View className="p-6">

                      <View className="flex-row justify-between items-start mb-4">

                        <View className="bg-[#024e32]/10 p-3 rounded-full">

                          <MaterialIcons
                            name="group"
                            size={24}
                            color="#024e32"
                          />

                        </View>

                        <View className="bg-green-100 px-3 py-1 rounded-full">

                          <Text className="text-green-700 text-xs font-semibold">
                            Active
                          </Text>

                        </View>

                      </View>

                      <Text className="text-xl font-bold text-gray-800 mb-2">
                        {item.groupId}
                      </Text>

                      <View className="flex-row items-center mb-4">

                        <MaterialIcons
                          name="people"
                          size={18}
                          color="#6b7280"
                        />

                        <Text className="text-gray-600 ml-2">

                          {item.memberCount}{" "}

                          {item.memberCount === 1
                            ? "member"
                            : "members"}

                        </Text>

                      </View>

                      <View className="flex-row justify-end">

                        <Text className="text-[#024e32] font-semibold mr-2">
                          View Details
                        </Text>

                        <MaterialIcons
                          name="arrow-forward"
                          size={20}
                          color="#024e32"
                        />

                      </View>

                    </View>

                  </TouchableOpacity>

                ))}

              </View>

            </View>

            <Footer text="Employee Payment History" />

          </ScrollView>

        ) : (

          <FlatList
            data={groups}
            keyExtractor={(item) =>
              item.groupId
            }
            contentContainerStyle={{
              padding:
                isMobile ? 16 : 24,
              paddingBottom: 10,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <Footer text="Employee Payment History" />
            }
            renderItem={({ item }) => (

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname:
                      "/employee/paymentHistory",
                    params: {
                      groupId:
                        item.groupId,
                    },
                  })
                }
                className="bg-white rounded-2xl shadow-md mb-4 overflow-hidden border border-gray-100"
              >

                <View className="flex-row">

                  <View className="w-2 bg-[#024e32]" />

                  <View className="flex-1 p-5">

                    <View className="flex-row justify-between items-center">

                      <View className="flex-1">

                        <Text
                          className={`font-bold ${
                            isTablet
                              ? "text-xl"
                              : "text-lg"
                          } text-gray-800`}
                        >
                          {item.groupId}
                        </Text>

                        <View className="flex-row items-center mt-2">

                          <MaterialIcons
                            name="people"
                            size={16}
                            color="#6b7280"
                          />

                          <Text
                            className={`text-gray-600 ${
                              isTablet
                                ? "text-base"
                                : "text-sm"
                            } ml-1`}
                          >
                            {item.memberCount} members
                          </Text>

                        </View>

                      </View>

                      <View className="flex-row items-center">

                        <Text className="text-[#024e32] font-semibold mr-2">
                          View
                        </Text>

                        <MaterialIcons
                          name="chevron-right"
                          size={24}
                          color="#024e32"
                        />

                      </View>

                    </View>

                  </View>

                </View>

              </TouchableOpacity>

            )}
          />

        )}

      </Wrapper>

    );

  }

  /* =========================================================
     MODE 2 → MEMBER LIST
  ========================================================= */

  if (groupId && !memberId) {

    return (

      <Wrapper
        title="Select Member"
        subtitle={`Group: ${groupName || groupId}`}
        router={router}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      >

        {isDesktop ? (

          <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
          >

            <View className="p-8">

              <View className="flex-row flex-wrap gap-6 justify-center">

                {members.map((item) => (

                  <TouchableOpacity
                    key={item.groupMemberId}
                    onPress={() =>
                      router.push({
                        pathname:
                          "/employee/paymentHistory",
                        params: {
                          groupId,
                          memberId:
                            item.groupMemberId,
                        },
                      })
                    }
                    className="bg-white rounded-2xl shadow-lg overflow-hidden"
                    style={{
                      width: 320,
                    }}
                  >

                    <View className="h-2 bg-blue-500" />

                    <View className="p-6">

                      <View className="flex-row justify-between items-start mb-4">

                        <View className="bg-blue-50 p-3 rounded-full">

                          <MaterialIcons
                            name="person"
                            size={24}
                            color="#3b82f6"
                          />

                        </View>

                        <View className="bg-blue-100 px-3 py-1 rounded-full">

                          <Text className="text-blue-700 text-xs font-semibold">
                            Member
                          </Text>

                        </View>

                      </View>

                      <Text className="text-xl font-bold text-gray-800 mb-2">
                        {item.memberName ||
                          "Unknown"}
                      </Text>

                      <Text className="text-gray-500 text-sm mb-4">
                        ID: {item.groupMemberId}
                      </Text>

                      <View className="flex-row justify-end">

                        <Text className="text-blue-600 font-semibold mr-2">
                          View History
                        </Text>

                        <MaterialIcons
                          name="arrow-forward"
                          size={20}
                          color="#3b82f6"
                        />

                      </View>

                    </View>

                  </TouchableOpacity>

                ))}

              </View>

            </View>

            <Footer text="Employee Payment History" />

          </ScrollView>

        ) : (

          <FlatList
            data={members}
            keyExtractor={(item) =>
              item.groupMemberId
            }
            contentContainerStyle={{
              padding:
                isMobile ? 16 : 24,
              paddingBottom: 10,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <Footer text="Employee Payment History" />
            }
            renderItem={({ item }) => (

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname:
                      "/employee/paymentHistory",
                    params: {
                      groupId,
                      memberId:
                        item.groupMemberId,
                    },
                  })
                }
                className="bg-white rounded-2xl shadow-md mb-4 overflow-hidden border border-gray-100"
              >

                <View className="flex-row">

                  <View className="w-2 bg-blue-500" />

                  <View className="flex-1 p-5">

                    <View className="flex-row justify-between items-center">

                      <View className="flex-1">

                        <Text
                          className={`font-bold ${
                            isTablet
                              ? "text-xl"
                              : "text-lg"
                          } text-gray-800`}
                        >
                          {item.memberName ||
                            "Unknown"}
                        </Text>

                        <View className="flex-row items-center mt-2">

                          <MaterialIcons
                            name="badge"
                            size={16}
                            color="#6b7280"
                          />

                          <Text
                            className={`text-gray-600 ${
                              isTablet
                                ? "text-sm"
                                : "text-xs"
                            } ml-1`}
                          >
                            ID:{" "}
                            {item.groupMemberId.substring(
                              0,
                              8
                            )}
                            ...
                          </Text>

                        </View>

                      </View>

                      <View className="flex-row items-center">

                        <MaterialIcons
                          name="chevron-right"
                          size={24}
                          color="#3b82f6"
                        />

                      </View>

                    </View>

                  </View>

                </View>

              </TouchableOpacity>

            )}
          />

        )}

      </Wrapper>

    );

  }

  /* =========================================================
     MODE 3 → MONTH LIST
  ========================================================= */

  if (
    groupId &&
    memberId &&
    !monthIndex
  ) {

    return (

      <Wrapper
        title="Select Month"
        subtitle={`Member: ${
          memberName ||
          memberId.substring(0, 8)
        }`}
        router={router}
        isMobile={isMobile}
        isTablet={isTablet}
        isDesktop={isDesktop}
      >

        {isDesktop ? (

          <ScrollView
            className="flex-1 bg-gray-50"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            showsVerticalScrollIndicator={false}
          >

            <View className="p-8">

              <View className="flex-row flex-wrap gap-6 justify-center">

                {months.map((item) => (

                  <TouchableOpacity
                    key={item.index.toString()}
                    onPress={() =>
                      router.push({
                        pathname:
                          "/employee/paymentHistory",
                        params: {
                          groupId,
                          memberId,
                          monthIndex:
                            item.index,
                        },
                      })
                    }
                    className="bg-white rounded-2xl shadow-lg overflow-hidden"
                    style={{
                      width: 240,
                    }}
                  >

                    <View className="h-2 bg-purple-500" />

                    <View className="p-6 items-center">

                      <View className="bg-purple-50 w-16 h-16 rounded-2xl items-center justify-center mb-4">

                        <Text className="text-purple-600 font-bold text-2xl">
                          {item.index}
                        </Text>

                      </View>

                      <Text className="text-xl font-bold text-gray-800 mb-2">
                        Month {item.index}
                      </Text>

                      <Text className="text-gray-500 text-sm text-center mb-4">
                        {item.payments?.length || 0} payments
                      </Text>

                      <View className="flex-row items-center">

                        <Text className="text-purple-600 font-semibold mr-2">
                          View Details
                        </Text>

                        <MaterialIcons
                          name="arrow-forward"
                          size={18}
                          color="#8b5cf6"
                        />

                      </View>

                    </View>

                  </TouchableOpacity>

                ))}

              </View>

            </View>

            <Footer text="Employee Payment History" />

          </ScrollView>

        ) : (

          <FlatList
            data={months}
            keyExtractor={(item) =>
              item.index.toString()
            }
            contentContainerStyle={{
              padding:
                isMobile ? 16 : 24,
              paddingBottom: 10,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            }
            numColumns={
              isTablet ? 2 : 1
            }
            columnWrapperStyle={
              isTablet
                ? {
                    justifyContent:
                      "space-between",
                    marginBottom: 16,
                  }
                : undefined
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              <Footer text="Employee Payment History" />
            }
            renderItem={({ item }) => (

              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname:
                      "/employee/paymentHistory",
                    params: {
                      groupId,
                      memberId,
                      monthIndex:
                        item.index,
                    },
                  })
                }
                className={`bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden ${
                  isTablet
                    ? "w-[48%]"
                    : "w-full mb-4"
                }`}
                style={
                  isTablet
                    ? { minHeight: 140 }
                    : {}
                }
              >

                <View className="p-5">

                  <View className="flex-row items-center mb-3">

                    <View className="bg-purple-100 w-10 h-10 rounded-xl items-center justify-center mr-3">

                      <Text className="text-purple-600 font-bold text-lg">
                        {item.index}
                      </Text>

                    </View>

                    <View className="flex-1">

                      <Text
                        className={`font-bold text-gray-800 ${
                          isTablet
                            ? "text-lg"
                            : "text-base"
                        }`}
                      >
                        Month {item.index}
                      </Text>

                      <Text className="text-gray-500 text-xs mt-1">
                        {item.payments?.length || 0} transactions
                      </Text>

                    </View>

                    <MaterialIcons
                      name="chevron-right"
                      size={24}
                      color="#8b5cf6"
                    />

                  </View>

                </View>

              </TouchableOpacity>

            )}
          />

        )}

      </Wrapper>

    );

  }

  /* =========================================================
     MODE 4 → PAYMENT HISTORY
  ========================================================= */

  const totalAmount =
    payments.reduce(
      (sum, p) =>
        sum + (p.amount || 0),
      0
    );

  return (

    <Wrapper
      title="Payment History"
      subtitle={`Month ${monthIndex} - ${
        memberName || "Member"
      }`}
      router={router}
      isMobile={isMobile}
      isTablet={isTablet}
      isDesktop={isDesktop}
    >

      {payments.length === 0 ? (

        <View className="flex-1 justify-center items-center p-8">

          <View className="bg-gray-100 w-24 h-24 rounded-full items-center justify-center mb-4">

            <MaterialIcons
              name="receipt"
              size={
                isDesktop ? 48 : 40
              }
              color="#9ca3af"
            />

          </View>

          <Text
            className={`${
              isDesktop
                ? "text-xl"
                : "text-lg"
            } text-gray-700 font-semibold`}
          >
            No payments recorded
          </Text>

          <Text className="text-gray-500 text-center mt-2">
            There are no payment transactions
            for this month
          </Text>

          <Footer text="Employee Payment History" />

        </View>

      ) : (

        <ScrollView
          className="flex-1 bg-gray-50"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 10,
          }}
        >

          <View
            className={
              isDesktop
                ? "p-8"
                : "p-4"
            }
          >

            {/* INFO CARD */}

            <View className="bg-white rounded-2xl p-5 mb-6 border border-gray-200 shadow-sm">

              <View className="flex-row items-center justify-between">

                <View className="flex-row items-center">

                  <MaterialIcons
                    name="info"
                    size={20}
                    color="#024e32"
                  />

                  <Text className="text-gray-700 ml-2">
                    Payment Details for
                  </Text>

                </View>

                <View className="bg-[#024e32]/10 px-3 py-1 rounded-full">

                  <Text className="text-[#024e32] font-semibold">
                    Month {monthIndex}
                  </Text>

                </View>

              </View>

              <View className="mt-3 flex-row">

                <View className="flex-1">

                  <Text className="text-gray-500 text-xs">
                    Group
                  </Text>

                  <Text className="text-gray-800 font-semibold">
                    {groupName}
                  </Text>

                </View>

                <View className="flex-1">

                  <Text className="text-gray-500 text-xs">
                    Member
                  </Text>

                  <Text className="text-gray-800 font-semibold">
                    {memberName}
                  </Text>

                </View>

              </View>

            </View>

            {/* TOTAL AMOUNT CARD */}

            <View className="bg-[#024e32] rounded-2xl p-6 mb-6 shadow-lg">

              <View className="flex-row items-center justify-between">

                <View className="flex-row items-center">

                  <View className="bg-white/20 p-3 rounded-full">

                    <MaterialIcons
                      name="account-balance-wallet"
                      size={24}
                      color="white"
                    />

                  </View>

                  <Text className="text-white text-lg font-medium ml-3">
                    Total Amount
                  </Text>

                </View>

                <Text className="text-white text-3xl font-bold">
                  ₹{" "}
                  {totalAmount.toLocaleString(
                    "en-IN"
                  )}
                </Text>

              </View>

              <View className="flex-row justify-end mt-2">

                <Text className="text-white/80 text-sm">
                  from {payments.length}{" "}
                  {payments.length === 1
                    ? "transaction"
                    : "transactions"}
                </Text>

              </View>

            </View>

            {/* PAYMENT TIMELINE */}

            <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">

              <View className="flex-row items-center mb-4">

                <View className="bg-[#024e32]/10 p-2 rounded-full">

                  <MaterialIcons
                    name="timeline"
                    size={20}
                    color="#024e32"
                  />

                </View>

                <Text className="text-lg font-bold text-gray-800 ml-2">
                  Payment Timeline
                </Text>

                <View className="ml-auto bg-gray-100 px-3 py-1 rounded-full">

                  <Text className="text-gray-600 text-xs">
                    {payments.length} transactions
                  </Text>

                </View>

              </View>

              <View
                className={
                  isDesktop
                    ? "flex-row flex-wrap gap-4"
                    : ""
                }
              >

                {payments.map(
                  (
                    p: any,
                    i: number
                  ) => {

                    const paymentId =
                      `${groupId}_${memberId}_${monthIndex}_${i}`;

                    return (

                      <View
                        key={paymentId}
                        className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${
                          isDesktop
                            ? "w-[calc(50%-8px)]"
                            : "mb-4"
                        }`}
                      >

                        <View className="flex-row">

                          {!isDesktop && (
                            <View className="w-2 bg-[#024e32]" />
                          )}

                          <View className="flex-1 p-5">

                            <View className="flex-row items-center justify-between mb-3">

                              <View className="flex-row items-center">

                                <View
                                  className={`w-12 h-12 rounded-full items-center justify-center mr-3 ${
                                    p.paymentType ===
                                    "PENALTY"
                                      ? "bg-red-100"
                                      : p.paymentType ===
                                        "DIVIDEND"
                                      ? "bg-blue-100"
                                      : "bg-green-100"
                                  }`}
                                >

                                  <MaterialIcons
                                    name={
                                      p.paymentType ===
                                      "PENALTY"
                                        ? "warning"
                                        : p.paymentType ===
                                          "DIVIDEND"
                                        ? "trending-up"
                                        : "check-circle"
                                    }
                                    size={24}
                                    color={
                                      p.paymentType ===
                                      "PENALTY"
                                        ? "#dc2626"
                                        : p.paymentType ===
                                          "DIVIDEND"
                                        ? "#2563eb"
                                        : "#16a34a"
                                    }
                                  />

                                </View>

                                <View>

                                  <View className="flex-row items-center flex-wrap">

                                    <Text className="text-gray-800 font-bold text-2xl">
                                      ₹{p.amount}
                                    </Text>

                                    <View
                                      className={`ml-2 px-2 py-1 rounded-full ${
                                        p.paymentType ===
                                        "PENALTY"
                                          ? "bg-red-100"
                                          : p.paymentType ===
                                            "DIVIDEND"
                                          ? "bg-blue-100"
                                          : "bg-green-100"
                                      }`}
                                    >

                                      <Text
                                        className={`text-xs font-semibold ${
                                          p.paymentType ===
                                          "PENALTY"
                                            ? "text-red-600"
                                            : p.paymentType ===
                                              "DIVIDEND"
                                            ? "text-blue-700"
                                            : "text-green-700"
                                        }`}
                                      >
                                        {p.paymentType ||
                                          "INSTALLMENT"}
                                      </Text>

                                    </View>

                                  </View>

                                  <Text className="text-gray-500 text-sm mt-1">
                                    Transaction #{i + 1}
                                  </Text>

                                </View>

                              </View>

                            </View>

                            <View className="space-y-3 mt-2">

                              <View className="flex-row items-center">

                                <View className="w-6 items-center">

                                  <MaterialIcons
                                    name="event"
                                    size={16}
                                    color="#6b7280"
                                  />

                                </View>

                                <Text className="text-gray-600 text-sm ml-2">

                                  {new Date(
                                    p.paidAt ||
                                      p.date ||
                                      Date.now()
                                  ).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                    }
                                  )}

                                </Text>

                              </View>

                              <View className="flex-row items-center">

                                <View className="w-6 items-center">

                                  <MaterialIcons
                                    name="access-time"
                                    size={16}
                                    color="#6b7280"
                                  />

                                </View>

                                <Text className="text-gray-600 text-sm ml-2">

                                  {new Date(
                                    p.paidAt ||
                                      p.date
                                  ).toLocaleTimeString(
                                    "en-IN",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: true,
                                    }
                                  )}

                                </Text>

                              </View>

                              <View className="flex-row items-center">

                                <View className="w-6 items-center">

                                  <MaterialIcons
                                    name="person"
                                    size={16}
                                    color="#6b7280"
                                  />

                                </View>

                                <Text className="text-gray-600 text-sm ml-2">
                                  {p.collectedBy ||
                                    "System"}
                                </Text>

                              </View>

                            </View>

                            <TouchableOpacity
                              onPress={() =>
                                handleReprint(
                                  p
                                )
                              }
                              className="mt-4 bg-[#024e32] rounded-xl py-2 flex-row justify-center items-center"
                            >

                              <MaterialIcons
                                name="print"
                                size={18}
                                color="white"
                              />

                              <Text className="text-white font-semibold ml-2">
                                Print Receipt
                              </Text>

                            </TouchableOpacity>

                            {isDesktop && (

                              <View className="mt-4 pt-3 border-t border-gray-100">

                                <Text className="text-gray-400 text-xs">
                                  Transaction ID:{" "}
                                  {paymentId.substring(
                                    0,
                                    12
                                  )}
                                  ...
                                </Text>

                              </View>

                            )}

                          </View>

                        </View>

                      </View>

                    );

                  }
                )}

              </View>

            </View>

          </View>

          <Footer text="Employee Payment History" />

        </ScrollView>

      )}

    </Wrapper>

  );

}

/* =========================================================
   FIXED HEADER WRAPPER
   SAME HEADER STYLE AS OTHER EMPLOYEE PAGES
========================================================= */

function Wrapper({
  title,
  subtitle,
  router,
  children,
  isMobile,
  isTablet,
  isDesktop,
}: any) {

  return (

    <SafeAreaView className="flex-1 bg-gray-50">

      {/* =================================================
          FIXED HEADER
      ================================================= */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() =>
              router.back()
            }
            className="mt-1"
            activeOpacity={0.7}
          >

            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />

          </TouchableOpacity>

          <View className="flex-1 ml-4">

            <Text className="text-white text-2xl font-bold mt-1">
              {title}
            </Text>

            {subtitle && (

              <Text className="text-green-100 text-sm mt-1">
                {subtitle}
              </Text>

            )}

          </View>

        </View>

      </View>

      {/* =================================================
          CONTENT BELOW FIXED HEADER
      ================================================= */}

      <View
        className="flex-1"
        style={{
          paddingTop: 110,
        }}
      >
        {children}
      </View>

    </SafeAreaView>

  );

}