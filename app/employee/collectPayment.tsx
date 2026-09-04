import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import BACKEND_URL from "../../config";

const PENALTY_PERCENT = 6;

/* =====================================================
   PERFORMANCE CACHE
===================================================== */

const memberDataCache: Record<
  string,
  {
    memberName: string;
    collections: any[];
    installmentMap: Record<
      number,
      { installment: number; dividend: number }
    >;
    dateMap: Record<
      number,
      { endDate: Date | null; display: string }
    >;
  }
> = {};

/* =====================================================
   SKELETON BLOCK
===================================================== */

function SkeletonBlock({ style }: { style?: any }) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    anim.start();

    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: "#e5e7eb",
          borderRadius: 8,
          opacity,
        },
        style,
      ]}
    />
  );
}

/* =====================================================
   SKELETON CARD
===================================================== */

function SkeletonCard() {
  return (
    <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-4">

      <View className="flex-row justify-between items-start mb-4">

        <View className="flex-1">
          <SkeletonBlock
            style={{
              width: 120,
              height: 20,
              marginBottom: 8,
            }}
          />

          <SkeletonBlock
            style={{
              width: 90,
              height: 14,
            }}
          />
        </View>

        <SkeletonBlock
          style={{
            width: 70,
            height: 34,
            borderRadius: 8,
          }}
        />

      </View>

      <SkeletonBlock
        style={{
          width: "100%",
          height: 18,
          marginBottom: 10,
        }}
      />

      <SkeletonBlock
        style={{
          width: "100%",
          height: 18,
          marginBottom: 10,
        }}
      />

      <SkeletonBlock
        style={{
          width: "100%",
          height: 18,
          marginBottom: 14,
        }}
      />

      <SkeletonBlock
        style={{
          width: "100%",
          height: 46,
          borderRadius: 12,
        }}
      />

    </View>
  );
}

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function CollectPayment() {
  const router = useRouter();

  const { width } = useWindowDimensions();

  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;

  const params = useLocalSearchParams<{
    groupId?: string;
    memberId?: string;
    groupMemberId?: string;
  }>();

  const groupId = params.groupId;

  const groupMemberId =
    params.groupMemberId || params.memberId;

  const [memberName, setMemberName] = useState("");

  const [collections, setCollections] =
    useState<any[]>([]);

  const [installmentInput, setInstallmentInput] =
    useState<Record<number, string>>({});

  const [penaltyInput, setPenaltyInput] =
    useState<Record<number, string>>({});

  const [installmentMap, setInstallmentMap] =
    useState<
      Record<
        number,
        {
          installment: number;
          dividend: number;
        }
      >
    >({});

  const [dateMap, setDateMap] =
    useState<
      Record<
        number,
        {
          endDate: Date | null;
          display: string;
        }
      >
    >({});

  const [loading, setLoading] = useState(true);

  const [paymentMode, setPaymentMode] =
    useState<
      Record<number, "Cash" | "UPI" | "AC">
    >({});

  const [submitting, setSubmitting] =
    useState<Record<string, boolean>>({});

  /* =====================================================
     LOAD MEMBER & COLLECTION PLANS
  ===================================================== */

  useEffect(() => {
    if (!groupId || !groupMemberId) {
      Alert.alert(
        "Error",
        "Invalid navigation parameters"
      );

      setLoading(false);
      return;
    }

    const cacheKey =
      `${groupId}_${groupMemberId}`;

    const cached =
      memberDataCache[cacheKey];

    /* INSTANT CACHE LOAD */

    if (cached) {
      setMemberName(cached.memberName);
      setCollections(cached.collections);
      setInstallmentMap(cached.installmentMap);
      setDateMap(cached.dateMap);
      setLoading(false);
    }

    /* FRESH API LOAD */

    const load = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/groups/${groupId}/members`
        );

        const data = await res.json();

        const member =
          data.groupMembers?.find(
            (m: any) =>
              m.groupMemberId ===
              groupMemberId
          );

        const resolvedName =
          member?.memberName ||
          member?.name ||
          member?.fullName ||
          "-";

        const resolvedCollections =
          member?.collections || [];

        const plans =
          data.collectionPlans || [];

        const amountMap: any = {};
        const dateInfo: any = {};

        plans.forEach((plan: any) => {
          amountMap[plan.monthIndex] = {
            installment:
              plan.installmentAmount || 0,

            dividend:
              plan.dividend || 0,
          };

          if (plan.endDate) {
            const endDate =
              new Date(plan.endDate);

            dateInfo[plan.monthIndex] = {
              endDate,
              display:
                endDate.toLocaleDateString(
                  "en-IN"
                ),
            };
          }
        });

        /* FRESH DATA */

        setMemberName(resolvedName);
        setCollections(resolvedCollections);
        setInstallmentMap(amountMap);
        setDateMap(dateInfo);

        /* CACHE */

        memberDataCache[cacheKey] = {
          memberName: resolvedName,
          collections:
            resolvedCollections,
          installmentMap: amountMap,
          dateMap: dateInfo,
        };
      } catch {
        if (!cached) {
          Alert.alert(
            "Error",
            "Failed to load collections"
          );
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [groupId, groupMemberId]);

  /* =====================================================
     HELPERS
  ===================================================== */

  const getInstallmentPaid = (
    payments: any[]
  ) => {
    if (!Array.isArray(payments)) return 0;

    return payments
      .filter(
        (p) =>
          p.paymentType !== "PENALTY"
      )
      .reduce(
        (s, p) =>
          s + (p.amount || 0),
        0
      );
  };

  const getPenaltyPaid = (
    payments: any[]
  ) => {
    if (!Array.isArray(payments)) return 0;

    return payments
      .filter(
        (p) =>
          p.paymentType === "PENALTY"
      )
      .reduce(
        (sum, p) =>
          sum + (p.amount || 0),
        0
      );
  };

  const getPenaltyBaseAmount = (
    installmentAmount: number,
    installmentPaidBeforeDue: number,
    dividend: number,
    endDate?: Date | null
  ) => {
    if (!endDate) return 0;

    const now =
      new Date().getTime();

    const due =
      new Date(endDate);

    due.setHours(
      23,
      59,
      59,
      999
    );

    const dueTime =
      due.getTime();

    if (now <= dueTime) return 0;

    return Math.max(
      installmentAmount -
        (installmentPaidBeforeDue +
          dividend),
      0
    );
  };

  const calculatePenalty = (
    penaltyBaseAmount: number,
    endDate?: Date | null
  ) => {
    if (
      !penaltyBaseAmount ||
      !endDate
    ) {
      return 0;
    }

    const now =
      new Date().getTime();

    const due =
      new Date(endDate);

    due.setHours(
      23,
      59,
      59,
      999
    );

    const dueTime =
      due.getTime();

    if (now > dueTime) {
      return Math.round(
        (penaltyBaseAmount *
          PENALTY_PERCENT) /
          100
      );
    }

    return 0;
  };

  /* =====================================================
     CONFIRM BEFORE COLLECTING
  ===================================================== */

  const confirmPayment = (
    monthIndex: number,
    amount: number,
    paymentType:
      | "INSTALLMENT"
      | "PENALTY"
  ) => {
    const key =
      `${monthIndex}_${paymentType}`;

    if (submitting[key]) return;

    if (!amount || amount <= 0) {
      Alert.alert(
        "Error",
        "Enter valid amount"
      );
      return;
    }

    if (
      paymentType ===
      "INSTALLMENT"
    ) {
      const c =
        collections.find(
          (col) =>
            col.index === monthIndex
        );

      const installment =
        installmentMap[c.index]
          ?.installment || 0;

      const dividend =
        installmentMap[c.index]
          ?.dividend || 0;

      const installmentPaid =
        getInstallmentPaid(
          c.payments || []
        );

      const effectivePaid =
        installmentPaid +
        dividend;

      const pendingInstallment =
        Math.max(
          installment -
            effectivePaid,
          0
        );

      if (
        amount >
        pendingInstallment
      ) {
        Alert.alert(
          "Error",
          `You can pay maximum ₹${pendingInstallment} only`
        );

        return;
      }
    }

    setSubmitting((prev) => ({
      ...prev,
      [key]: true,
    }));

    Alert.alert(
      "Confirm Payment",
      `Collect ₹${amount} as ${
        paymentType ===
        "INSTALLMENT"
          ? "installment"
          : "penalty"
      } for Month ${monthIndex}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () =>
            setSubmitting(
              (prev) => ({
                ...prev,
                [key]: false,
              })
            ),
        },
        {
          text: "Confirm",
          onPress: () =>
            addPayment(
              monthIndex,
              amount,
              paymentType,
              key
            ),
        },
      ],
      {
        cancelable: true,
        onDismiss: () =>
          setSubmitting(
            (prev) => ({
              ...prev,
              [key]: false,
            })
          ),
      }
    );
  };

  /* =====================================================
     ADD PAYMENT
  ===================================================== */

  const addPayment = async (
    monthIndex: number,
    amount: number,
    paymentType:
      | "INSTALLMENT"
      | "PENALTY",
    key: string
  ) => {
    try {
      const employeeInfo =
        JSON.parse(
          (await AsyncStorage.getItem(
            "employeeInfo"
          )) || "{}"
        );

      const selectedMode =
        paymentMode[monthIndex] ||
        "Cash";

      const backendPaymentMode =
        selectedMode === "AC"
          ? "Cheque"
          : selectedMode;

      await fetch(
        `${BACKEND_URL}/groups/${groupId}/members/${groupMemberId}/payments`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            monthIndex,
            amount,
            paymentType,
            paymentMode:
              backendPaymentMode,
            employeeId:
              employeeInfo.emp_id,
            employeeName:
              employeeInfo.name,
          }),
        }
      );

      /* REFRESH */

      const res = await fetch(
        `${BACKEND_URL}/groups/${groupId}/members`
      );

      const data =
        await res.json();

      const member =
        data.groupMembers?.find(
          (m: any) =>
            m.groupMemberId ===
            groupMemberId
        );

      const resolvedName =
        member?.memberName ||
        member?.name ||
        member?.fullName ||
        "-";

      const resolvedCollections =
        member?.collections || [];

      setMemberName(
        resolvedName
      );

      setCollections(
        resolvedCollections
      );

      /* REBUILD MAPS */

      const plans =
        data.collectionPlans || [];

      const amountMap: any = {};
      const dateInfo: any = {};

      plans.forEach(
        (plan: any) => {
          amountMap[
            plan.monthIndex
          ] = {
            installment:
              plan.installmentAmount ||
              0,

            dividend:
              plan.dividend || 0,
          };

          if (plan.endDate) {
            const endDate =
              new Date(
                plan.endDate
              );

            dateInfo[
              plan.monthIndex
            ] = {
              endDate,
              display:
                endDate.toLocaleDateString(
                  "en-IN"
                ),
            };
          }
        }
      );

      setInstallmentMap(
        amountMap
      );

      setDateMap(
        dateInfo
      );

      /* UPDATE CACHE */

      if (
        groupId &&
        groupMemberId
      ) {
        memberDataCache[
          `${groupId}_${groupMemberId}`
        ] = {
          memberName:
            resolvedName,

          collections:
            resolvedCollections,

          installmentMap:
            amountMap,

          dateMap:
            dateInfo,
        };
      }

      setInstallmentInput(
        (p) => ({
          ...p,
          [monthIndex]: "",
        })
      );

      setPenaltyInput(
        (p) => ({
          ...p,
          [monthIndex]: "",
        })
      );

      Alert.alert(
        "Success",
        `${paymentType} payment added`
      );
    } catch {
      Alert.alert(
        "Error",
        "Payment failed"
      );
    } finally {
      setSubmitting(
        (prev) => ({
          ...prev,
          [key]: false,
        })
      );
    }
  };

  /* =====================================================
     PRINT FUNCTION
  ===================================================== */

  const handlePrintReceipt = (
    monthIndex: number
  ) => {
    const c =
      collections.find(
        (col) =>
          col.index === monthIndex
      );

    if (!c) {
      Alert.alert(
        "Error",
        "Collection not found"
      );

      return;
    }

    const installment =
      installmentMap[
        monthIndex
      ]?.installment || 0;

    const dividend =
      installmentMap[
        monthIndex
      ]?.dividend || 0;

    const installmentPayments =
      (c.payments || []).filter(
        (p) =>
          p.paymentType !==
          "PENALTY"
      );

    const totalInstallmentPaid =
      installmentPayments.reduce(
        (s, p) =>
          s + (p.amount || 0),
        0
      );

    const todayInstallmentPaid =
      installmentPayments.length >
      0
        ? installmentPayments[
            installmentPayments.length -
              1
          ].amount || 0
        : 0;

    const effectivePaid =
      totalInstallmentPaid +
      dividend;

    const pendingInstallment =
      Math.max(
        installment -
          effectivePaid,
        0
      );

    const penaltyPayments =
      (c.payments || []).filter(
        (p) =>
          p.paymentType ===
          "PENALTY"
      );

    const totalPenaltyPaid =
      penaltyPayments.reduce(
        (s, p) =>
          s + (p.amount || 0),
        0
      );

    const todayPenaltyPaid =
      penaltyPayments.length >
      0
        ? penaltyPayments[
            penaltyPayments.length -
              1
          ].amount || 0
        : 0;

    const isAfterDueDate =
      (() => {
        if (
          !dateMap[
            monthIndex
          ]?.endDate
        ) {
          return false;
        }

        const due =
          new Date(
            dateMap[
              monthIndex
            ].endDate
          );

        due.setHours(
          23,
          59,
          59,
          999
        );

        return (
          new Date().getTime() >
          due.getTime()
        );
      })();

    const installmentPaidBeforeDue =
      installmentPayments
        .filter((p) => {
          if (
            !dateMap[
              monthIndex
            ]?.endDate
          ) {
            return true;
          }

          const paidTime =
            new Date(
              p.paidAt ||
                p.date
            ).getTime();

          const due =
            new Date(
              dateMap[
                monthIndex
              ].endDate
            );

          due.setHours(
            23,
            59,
            59,
            999
          );

          return (
            paidTime <=
            due.getTime()
          );
        })
        .reduce(
          (s, p) =>
            s + (p.amount || 0),
          0
        );

    const penaltyBaseAmount =
      isAfterDueDate
        ? getPenaltyBaseAmount(
            installment,
            installmentPaidBeforeDue,
            dividend,
            dateMap[
              monthIndex
            ]?.endDate
          )
        : 0;

    const penaltyDue =
      isAfterDueDate
        ? calculatePenalty(
            penaltyBaseAmount,
            dateMap[
              monthIndex
            ]?.endDate
          )
        : 0;

    const pendingPenalty =
      Math.max(
        penaltyDue -
          totalPenaltyPaid,
        0
      );

    const totalDue =
      pendingInstallment +
      pendingPenalty;

    const lastPayment =
      c.payments &&
      c.payments.length > 0
        ? c.payments[
            c.payments.length -
              1
          ]
        : null;

    const overallPendingInstallment =
      collections.reduce(
        (sum, col) => {
          const inst =
            installmentMap[
              col.index
            ]?.installment ||
            0;

          const div =
            installmentMap[
              col.index
            ]?.dividend ||
            0;

          const paid =
            getInstallmentPaid(
              col.payments || []
            );

          return (
            sum +
            Math.max(
              inst -
                (paid + div),
              0
            )
          );
        },
        0
      );

    const receiptData = {
      groupId,
      groupMemberId,
      memberName,
      monthIndex,

      installmentAmount:
        installment,

      dividendAmount:
        dividend,

      todayInstallmentPaid:
        todayInstallmentPaid,

      totalInstallmentPaid:
        totalInstallmentPaid,

      todayPenaltyPaid:
        todayPenaltyPaid,

      totalPenaltyPaid:
        totalPenaltyPaid,

      pendingInstallment:
        pendingInstallment,

      pendingPenalty:
        pendingPenalty,

      totalDue:
        totalDue,

      overallPendingInstallment:
        overallPendingInstallment,

      dueDate:
        dateMap[
          monthIndex
        ]?.display ||
        "Not set",

      collectedBy:
        lastPayment?.employeeName ||
        lastPayment?.collectedBy ||
        "-",

      paymentMode:
        lastPayment?.paymentMode ===
        "Cheque"
          ? "AC"
          : lastPayment?.paymentMode ||
            "-",

      date:
        new Date().toLocaleDateString(
          "en-IN"
        ),

      time:
        new Date().toLocaleTimeString(
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
  };

  /* =====================================================
     FOOTER
  ===================================================== */

  const Footer = () => (
    <View className="mt-6 mb-2">

      <View className="border-t border-gray-200 pt-4 items-center">

        <Text className="text-[#024e32] font-bold text-base">
          MANIKYA CHITS PVT LTD
        </Text>

        <Text className="text-gray-500 text-xs mt-1 text-center">
          Employee Collection Payment
        </Text>

        <Text className="text-gray-400 text-xs mt-1 text-center">
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
          All rights reserved.
        </Text>

      </View>

    </View>
  );

  /* =====================================================
     UI
  ===================================================== */

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      className="flex-1 bg-gray-50"
    >

      <SafeAreaView className="flex-1">

        {/* =================================================
            FIXED HEADER
            SAME SIZE AS OTHER EMPLOYEE PAGES
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

            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
              Collect Payment
            </Text>

          </View>

        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <ScrollView
          className="flex-1"

          contentContainerStyle={{
            paddingTop: 110,

            paddingHorizontal:
              isDesktopOrLaptop
                ? 24
                : 16,

            paddingBottom: 20,

            maxWidth:
              isDesktopOrLaptop
                ? (
                    isLargeScreen
                      ? 1200
                      : 900
                  )
                : "100%",

            alignSelf: "center",

            width: "100%",
          }}

          showsVerticalScrollIndicator={false}
        >

          {/* =================================================
              SKELETON
              UNCHANGED
          ================================================= */}

          {loading ? (

            <View>

              <SkeletonCard />

              <SkeletonCard />

              <SkeletonCard />

            </View>

          ) : (

            <View
              className={
                isDesktopOrLaptop
                  ? "flex-row flex-wrap -mx-3"
                  : ""
              }
            >

              {collections.map(
                (c) => {

                  const installment =
                    installmentMap[
                      c.index
                    ]?.installment ||
                    0;

                  const dividend =
                    installmentMap[
                      c.index
                    ]?.dividend ||
                    0;

                  const installmentPaid =
                    getInstallmentPaid(
                      c.payments ||
                        []
                    );

                  const effectivePaid =
                    installmentPaid +
                    dividend;

                  const pendingInstallment =
                    Math.max(
                      installment -
                        effectivePaid,
                      0
                    );

                  const penaltyPaid =
                    getPenaltyPaid(
                      c.payments ||
                        []
                    );

                  const isAfterDueDate =
                    (() => {
                      if (
                        !dateMap[
                          c.index
                        ]?.endDate
                      ) {
                        return false;
                      }

                      const due =
                        new Date(
                          dateMap[
                            c.index
                          ].endDate
                        );

                      due.setHours(
                        23,
                        59,
                        59,
                        999
                      );

                      return (
                        new Date().getTime() >
                        due.getTime()
                      );
                    })();

                  const installmentPaidBeforeDue =
                    (
                      c.payments ||
                      []
                    )
                      .filter(
                        (p) => {
                          if (
                            p.paymentType ===
                            "PENALTY"
                          ) {
                            return false;
                          }

                          if (
                            !dateMap[
                              c.index
                            ]?.endDate
                          ) {
                            return true;
                          }

                          const paidTime =
                            new Date(
                              p.paidAt ||
                                p.date
                            ).getTime();

                          const due =
                            new Date(
                              dateMap[
                                c.index
                              ].endDate
                            );

                          due.setHours(
                            23,
                            59,
                            59,
                            999
                          );

                          return (
                            paidTime <=
                            due.getTime()
                          );
                        }
                      )
                      .reduce(
                        (s, p) =>
                          s +
                          (p.amount ||
                            0),
                        0
                      );

                  const penaltyBaseAmount =
                    isAfterDueDate
                      ? getPenaltyBaseAmount(
                          installment,
                          installmentPaidBeforeDue,
                          dividend,
                          dateMap[
                            c.index
                          ]?.endDate
                        )
                      : 0;

                  const penaltyDue =
                    isAfterDueDate
                      ? calculatePenalty(
                          penaltyBaseAmount,
                          dateMap[
                            c.index
                          ]?.endDate
                        )
                      : 0;

                  const pendingPenalty =
                    Math.max(
                      penaltyDue -
                        penaltyPaid,
                      0
                    );

                  const totalDue =
                    pendingInstallment +
                    pendingPenalty;

                  const installmentKey =
                    `${c.index}_INSTALLMENT`;

                  const penaltyKey =
                    `${c.index}_PENALTY`;

                  const isInstallmentSubmitting =
                    !!submitting[
                      installmentKey
                    ];

                  const isPenaltySubmitting =
                    !!submitting[
                      penaltyKey
                    ];

                  return (
                    <View
                      key={c.index}
                      className={`
                        ${
                          isDesktopOrLaptop
                            ? "w-1/2 lg:w-1/3 px-3 mb-4"
                            : "mb-4"
                        }
                      `}
                    >

                      <View className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">

                        {/* ================= CARD HEADER ================= */}

                        <View className="flex-row justify-between items-start mb-4">

                          <View className="flex-1">

                            <View className="flex-row items-center mb-1">

                              <MaterialIcons
                                name="calendar-month"
                                size={20}
                                color="#024e32"
                              />

                              <Text className="text-lg font-bold ml-1">
                                Month {c.index}
                              </Text>

                            </View>

                            {dateMap[
                              c.index
                            ]?.display && (
                              <View className="flex-row items-center">

                                <MaterialIcons
                                  name="event"
                                  size={16}
                                  color="#666"
                                />

                                <Text className="text-gray-600 text-sm ml-1">
                                  Due:{" "}
                                  {
                                    dateMap[
                                      c.index
                                    ].display
                                  }
                                </Text>

                              </View>
                            )}

                          </View>

                          <TouchableOpacity
                            onPress={() =>
                              handlePrintReceipt(
                                c.index
                              )
                            }
                            className="bg-[#024e32] p-2 rounded-lg flex-row items-center"
                            activeOpacity={0.7}
                          >

                            <MaterialIcons
                              name="print"
                              size={18}
                              color="white"
                            />

                            <Text className="text-white text-sm font-semibold ml-1">
                              Print
                            </Text>

                          </TouchableOpacity>

                        </View>

                        {/* ================= PAYMENT SUMMARY ================= */}

                        <View className="mt-2 space-y-2">

                          <View className="flex-row justify-between items-center py-1 border-b border-gray-100">

                            <Text className="text-gray-700">
                              Installment:
                            </Text>

                            <Text className="font-bold text-lg">
                              ₹{installment}
                            </Text>

                          </View>

                          <View className="flex-row justify-between items-center py-1">

                            <Text className="text-gray-700">
                              Paid:
                            </Text>

                            <Text className="font-semibold text-green-600">
                              ₹{installmentPaid}
                            </Text>

                          </View>

                          {dividend > 0 && (
                            <View className="flex-row justify-between items-center py-1 bg-blue-50 rounded-lg px-2">

                              <Text className="text-gray-700">
                                Dividend:
                              </Text>

                              <Text className="font-semibold text-blue-600">
                                ₹{dividend}
                              </Text>

                            </View>
                          )}

                          {pendingInstallment > 0 && (
                            <View className="flex-row justify-between items-center py-1 bg-red-50 rounded-lg px-2">

                              <Text className="text-red-600">
                                Pending Installment:
                              </Text>

                              <Text className="font-semibold text-red-600">
                                ₹{pendingInstallment}
                              </Text>

                            </View>
                          )}

                          {isAfterDueDate &&
                            pendingPenalty >
                              0 && (
                              <View className="flex-row justify-between items-center py-1 bg-orange-50 rounded-lg px-2">

                                <Text className="text-orange-700">
                                  Penalty Due:
                                </Text>

                                <Text className="font-semibold text-orange-700">
                                  ₹{pendingPenalty}
                                </Text>

                              </View>
                            )}

                          <View className="border-t border-gray-300 mt-3 pt-3">

                            <View className="flex-row justify-between items-center">

                              <Text className="font-bold text-lg">
                                Total Due:
                              </Text>

                              <Text className="font-bold text-xl text-[#c64900]">
                                ₹{totalDue}
                              </Text>

                            </View>

                          </View>

                        </View>

                        {/* ================= INSTALLMENT ================= */}

                        {pendingInstallment >
                          0 && (
                          <View className="mt-5">

                            <Text className="text-gray-700 mb-2 font-medium">
                              Collect Installment
                            </Text>

                            <View className="mb-3">

                              <Text className="text-gray-700 mb-2 font-medium">
                                Payment Mode
                              </Text>

                              <View className="flex-row justify-between">

                                {[
                                  "Cash",
                                  "UPI",
                                  "AC",
                                ].map(
                                  (
                                    mode
                                  ) => (
                                    <TouchableOpacity
                                      key={
                                        mode
                                      }
                                      onPress={() =>
                                        setPaymentMode(
                                          (
                                            prev
                                          ) => ({
                                            ...prev,
                                            [c.index]:
                                              mode as
                                                | "Cash"
                                                | "UPI"
                                                | "AC",
                                          })
                                        )
                                      }
                                      className={`flex-1 py-2 mx-1 rounded-lg border ${
                                        paymentMode[
                                          c.index
                                        ] ===
                                        mode
                                          ? "bg-[#024e32] border-[#024e32]"
                                          : "bg-white border-gray-300"
                                      }`}
                                    >

                                      <Text
                                        className={`text-center font-semibold ${
                                          paymentMode[
                                            c.index
                                          ] ===
                                          mode
                                            ? "text-white"
                                            : "text-gray-700"
                                        }`}
                                      >
                                        {mode}
                                      </Text>

                                    </TouchableOpacity>
                                  )
                                )}

                              </View>

                            </View>

                            <TextInput
                              placeholder="Enter amount"
                              keyboardType="numeric"
                              value={
                                installmentInput[
                                  c.index
                                ] || ""
                              }
                              editable={
                                !isInstallmentSubmitting
                              }
                              onChangeText={(
                                t
                              ) =>
                                setInstallmentInput(
                                  (p) => ({
                                    ...p,
                                    [c.index]:
                                      t,
                                  })
                                )
                              }
                              className="border border-gray-300 rounded-xl px-4 py-3 mb-3 bg-white"
                              placeholderTextColor="#9CA3AF"
                            />

                            <TouchableOpacity
                              onPress={() =>
                                confirmPayment(
                                  c.index,
                                  Number(
                                    installmentInput[
                                      c.index
                                    ]
                                  ),
                                  "INSTALLMENT"
                                )
                              }
                              disabled={
                                isInstallmentSubmitting
                              }
                              className={`py-4 rounded-xl ${
                                isInstallmentSubmitting
                                  ? "bg-gray-400"
                                  : "bg-[#c64900]"
                              }`}
                              activeOpacity={0.8}
                            >

                              {isInstallmentSubmitting ? (
                                <ActivityIndicator color="white" />
                              ) : (
                                <Text className="text-white text-center font-semibold text-base">
                                  Collect Installment
                                </Text>
                              )}

                            </TouchableOpacity>

                          </View>
                        )}

                        {/* ================= PENALTY ================= */}

                        {isAfterDueDate &&
                          pendingPenalty >
                            0 && (
                            <View className="mt-5">

                              <Text className="text-gray-700 mb-2 font-medium">
                                Collect Penalty
                              </Text>

                              <View className="mb-3">

                                <Text className="text-gray-700 mb-2 font-medium">
                                  Payment Mode
                                </Text>

                                <View className="flex-row justify-between">

                                  {[
                                    "Cash",
                                    "UPI",
                                    "AC",
                                  ].map(
                                    (
                                      mode
                                    ) => (
                                      <TouchableOpacity
                                        key={
                                          mode
                                        }
                                        onPress={() =>
                                          setPaymentMode(
                                            (
                                              prev
                                            ) => ({
                                              ...prev,
                                              [c.index]:
                                                mode as
                                                  | "Cash"
                                                  | "UPI"
                                                  | "AC",
                                            })
                                          )
                                        }
                                        className={`flex-1 py-2 mx-1 rounded-lg border ${
                                          paymentMode[
                                            c.index
                                          ] ===
                                          mode
                                            ? "bg-red-600 border-red-600"
                                            : "bg-white border-gray-300"
                                        }`}
                                      >

                                        <Text
                                          className={`text-center font-semibold ${
                                            paymentMode[
                                              c.index
                                            ] ===
                                            mode
                                              ? "text-white"
                                              : "text-gray-700"
                                          }`}
                                        >
                                          {mode}
                                        </Text>

                                      </TouchableOpacity>
                                    )
                                  )}

                                </View>

                              </View>

                              <TextInput
                                placeholder="Enter amount"
                                keyboardType="numeric"
                                value={
                                  penaltyInput[
                                    c.index
                                  ] !==
                                  undefined
                                    ? penaltyInput[
                                        c.index
                                      ]
                                    : pendingPenalty.toString()
                                }
                                editable={
                                  !isPenaltySubmitting
                                }
                                onChangeText={(
                                  t
                                ) =>
                                  setPenaltyInput(
                                    (p) => ({
                                      ...p,
                                      [c.index]:
                                        t,
                                    })
                                  )
                                }
                                className="border border-red-300 rounded-xl px-4 py-3 mb-3 bg-white"
                                placeholderTextColor="#9CA3AF"
                              />

                              <TouchableOpacity
                                onPress={() =>
                                  confirmPayment(
                                    c.index,
                                    Number(
                                      penaltyInput[
                                        c.index
                                      ] !==
                                        ""
                                        ? penaltyInput[
                                            c.index
                                          ]
                                        : pendingPenalty
                                    ),
                                    "PENALTY"
                                  )
                                }
                                disabled={
                                  isPenaltySubmitting
                                }
                                className={`py-4 rounded-xl ${
                                  isPenaltySubmitting
                                    ? "bg-gray-400"
                                    : "bg-red-600"
                                }`}
                                activeOpacity={0.8}
                              >

                                {isPenaltySubmitting ? (
                                  <ActivityIndicator color="white" />
                                ) : (
                                  <Text className="text-white text-center font-semibold text-base">
                                    Collect Penalty
                                  </Text>
                                )}

                              </TouchableOpacity>

                            </View>
                          )}

                        {/* ================= FULLY CLEARED ================= */}

                        {pendingInstallment ===
                          0 &&
                          pendingPenalty ===
                            0 && (
                            <View className="mt-5 p-4 bg-green-50 rounded-xl border-2 border-green-200">

                              <View className="flex-row items-center justify-center">

                                <MaterialIcons
                                  name="check-circle"
                                  size={24}
                                  color="#059669"
                                />

                                <Text className="text-green-700 font-bold text-center ml-2 text-lg">
                                  Fully Cleared
                                </Text>

                              </View>

                            </View>
                          )}

                      </View>

                    </View>
                  );
                }
              )}

            </View>
          )}

          {/* =================================================
              NO COLLECTIONS
          ================================================= */}

          {!loading &&
            collections.length === 0 && (
              <View className="bg-white rounded-2xl p-8 items-center justify-center border border-gray-200">

                <MaterialIcons
                  name="payment"
                  size={60}
                  color="#9CA3AF"
                />

                <Text className="text-gray-500 text-lg mt-4">
                  No collections found
                </Text>

                <Text className="text-gray-400 text-center mt-2">
                  This member does not have any collection records yet
                </Text>

              </View>
            )}

          {/* =================================================
              FOOTER
          ================================================= */}

          <Footer />

        </ScrollView>

      </SafeAreaView>

    </KeyboardAvoidingView>
  );
}