
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import BACKEND_URL from "../../config";

type Employee = {
  _id?: string;
  emp_id: string;
  name: string;
  phone?: string;
  email?: string;
  status?: string;
};

type CollectionItem = {
  paymentId?: string;
  groupId: string;
  chitId?: string;

  memberId?: string;
  groupMemberId?: string;
  memberName?: string;
  memberPhone?: string;

  monthIndex: number;
  amount: number;

  paymentType: "INSTALLMENT" | "PENALTY";
  paymentMode: "Cash" | "UPI" | "Cheque" | "AC";

  employeeId?: string;
  employeeName?: string;
  collectedBy?: string;

  paidAt: string;
};

type CollectionResponse = {
  employee?: {
    emp_id: string;
    name: string;
    phone?: string;
  };

  date?: string;

  totalCollections?: number;
  totalAmount?: number;

  paymentModeTotals?: {
    cash?: number;
    upi?: number;
    cheque?: number;
    ac?: number;
  };

  paymentTypeTotals?: {
    installment?: number;
    penalty?: number;
  };

  collections?: CollectionItem[];

  message?: string;
  error?: string;
};

/* =====================================================
   SAFE API RESPONSE PARSER
   ===================================================== */

const parseApiResponse = async (
  response: Response,
  endpoint: string
): Promise<any> => {
  const contentType =
    response.headers.get("content-type") || "";

  const text = await response.text();

  console.log("API STATUS:", response.status);
  console.log("API CONTENT-TYPE:", contentType);
  console.log("API RESPONSE:", text.substring(0, 500));

  if (!text.trim()) {
    throw new Error(
      `Server returned an empty response (${response.status})`
    );
  }

  const looksLikeJson =
    contentType.toLowerCase().includes("application/json") ||
    text.trim().startsWith("{") ||
    text.trim().startsWith("[");

  if (!looksLikeJson) {
    throw new Error(
      `Server returned non-JSON response (${response.status}) from ${endpoint}`
    );
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("JSON PARSE FAILED:", error);
    console.error("RAW RESPONSE:", text);

    throw new Error(
      `Invalid JSON response from server (${response.status})`
    );
  }
};

/* ================= SKELETON COMPONENTS ================= */

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

function SkeletonCard() {
  return (
    <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-4">
      <SkeletonBlock
        style={{
          width: "100%",
          height: 50,
          borderRadius: 12,
        }}
      />
    </View>
  );
}

function SkeletonCollectionCard() {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-200 shadow-sm">
      <View className="flex-row justify-between items-start">
        <View className="flex-1">
          <SkeletonBlock
            style={{
              width: 150,
              height: 20,
              marginBottom: 6,
            }}
          />
          <SkeletonBlock
            style={{
              width: 100,
              height: 14,
              marginBottom: 6,
            }}
          />
          <SkeletonBlock
            style={{
              width: 120,
              height: 14,
              marginBottom: 6,
            }}
          />
          <SkeletonBlock
            style={{
              width: 80,
              height: 12,
            }}
          />
        </View>

        <View className="items-end">
          <SkeletonBlock
            style={{
              width: 70,
              height: 22,
              marginBottom: 6,
            }}
          />
          <SkeletonBlock
            style={{
              width: 60,
              height: 20,
              borderRadius: 12,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export default function EmployeeCollections() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;

  // ================= EMPLOYEE =================

  const [employees, setEmployees] = useState<Employee[]>([]);

  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);

  const [showEmployeeDropdown, setShowEmployeeDropdown] =
    useState(false);

  // ================= DATE =================

  const [selectedDate, setSelectedDate] =
    useState<Date>(new Date());

  const [showDatePicker, setShowDatePicker] =
    useState(false);

  // ================= COLLECTIONS =================

  const [collections, setCollections] =
    useState<CollectionItem[]>([]);

  const [summary, setSummary] =
    useState<CollectionResponse | null>(null);

  // ================= LOADING =================

  const [loadingEmployees, setLoadingEmployees] =
    useState(true);

  const [loadingCollections, setLoadingCollections] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  // ================= DETAIL MODAL =================

  const [selectedCollection, setSelectedCollection] =
    useState<CollectionItem | null>(null);

  const [detailModalVisible, setDetailModalVisible] =
    useState(false);

  // =====================================================
  // DATE HELPERS
  // =====================================================

  const getApiDate = (date: Date) => {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPaymentDate = (dateString?: string) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (amount?: number) => {
    return `₹${Number(amount || 0).toLocaleString(
      "en-IN"
    )}`;
  };

  // =====================================================
  // DISPLAY PAYMENT MODE
  // =====================================================

  const getDisplayPaymentMode = (mode?: string) => {
    if (!mode) return "-";

    if (mode === "Cheque") return "AC";

    return mode;
  };

  // =====================================================
  // LOAD EMPLOYEES
  // =====================================================

  const fetchEmployees = async () => {
    try {
      setLoadingEmployees(true);

      const endpoint = `${BACKEND_URL}/employee`;

      console.log("Fetching employees:", endpoint);

      const response = await fetch(endpoint);

      const data = await parseApiResponse(
        response,
        endpoint
      );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to load employees (${response.status})`
        );
      }

      let employeeList: Employee[] = [];

      if (Array.isArray(data)) {
        employeeList = data;
      } else if (Array.isArray(data?.employees)) {
        employeeList = data.employees;
      } else if (Array.isArray(data?.data)) {
        employeeList = data.data;
      }

      employeeList = employeeList.filter(
        (employee) =>
          employee?.emp_id &&
          employee?.name
      );

      employeeList.sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setEmployees(employeeList);
    } catch (error: any) {
      console.log(
        "Employee fetch error:",
        error
      );

      Alert.alert(
        "Error",
        error?.message ||
          "Failed to load employees"
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  // =====================================================
  // FETCH COLLECTIONS
  // =====================================================

  const fetchCollections = async (
    employee: Employee,
    date: Date,
    showLoader = true
  ) => {
    try {
      if (!employee?.emp_id) {
        console.log(
          "No employee selected"
        );
        return;
      }

      if (showLoader) {
        setLoadingCollections(true);
      }

      const dateString = getApiDate(date);

      const url =
        `${BACKEND_URL}/employee/` +
        `${encodeURIComponent(employee.emp_id)}` +
        `/collections-by-date?date=` +
        `${encodeURIComponent(dateString)}`;

      console.log(
        "========================================"
      );
      console.log(
        "Fetching employee collections:"
      );
      console.log(url);
      console.log(
        "Employee ID:",
        employee.emp_id
      );
      console.log(
        "Date:",
        dateString
      );
      console.log(
        "========================================"
      );

      const response = await fetch(url);

      const data: CollectionResponse =
        await parseApiResponse(
          response,
          url
        );

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Failed to load collections (${response.status})`
        );
      }

      const receivedCollections =
        Array.isArray(data?.collections)
          ? data.collections
          : [];

      console.log(
        "Collections received:",
        receivedCollections.length
      );

      setCollections(
        receivedCollections
      );

      setSummary(data);
    } catch (error: any) {
      console.log(
        "Collection fetch error:",
        error
      );

      setCollections([]);
      setSummary(null);

      Alert.alert(
        "Unable to Load Collections",
        error?.message ||
          "Failed to load employee collections"
      );
    } finally {
      if (showLoader) {
        setLoadingCollections(false);
      }
    }
  };

  // =====================================================
  // FIRST LOAD
  // =====================================================

  useEffect(() => {
    fetchEmployees();
  }, []);

  // =====================================================
  // EMPLOYEE SELECT
  // =====================================================

  const handleEmployeeSelect = (
    employee: Employee
  ) => {
    setSelectedEmployee(employee);

    setShowEmployeeDropdown(false);

    setCollections([]);
    setSummary(null);

    fetchCollections(
      employee,
      selectedDate
    );
  };

  // =====================================================
  // DATE CHANGE
  // =====================================================

  const handleDateChange = (
    event: any,
    date?: Date
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (event?.type === "dismissed") {
      return;
    }

    if (!date) return;

    setSelectedDate(date);

    if (selectedEmployee) {
      fetchCollections(
        selectedEmployee,
        date
      );
    }
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await fetchEmployees();

      if (selectedEmployee) {
        await fetchCollections(
          selectedEmployee,
          selectedDate,
          false
        );
      }
    } finally {
      setRefreshing(false);
    }
  };

  // =====================================================
  // SUMMARY VALUES
  // =====================================================

  const totalCollections =
    summary?.totalCollections ??
    collections.length;

  const totalAmount =
    summary?.totalAmount ??
    collections.reduce(
      (sum, item) =>
        sum + Number(item.amount || 0),
      0
    );

  const cashAmount =
    summary?.paymentModeTotals?.cash ?? 0;

  const upiAmount =
    summary?.paymentModeTotals?.upi ?? 0;

  const chequeAmount =
    summary?.paymentModeTotals?.cheque ??
    summary?.paymentModeTotals?.ac ??
    0;

  const installmentAmount =
    summary?.paymentTypeTotals?.installment ??
    0;

  const penaltyAmount =
    summary?.paymentTypeTotals?.penalty ??
    0;

  // =====================================================
  // RENDER SKELETON
  // =====================================================

  const renderSkeletonContent = () => (
    <View className="p-5">
      <SkeletonCard />
      <SkeletonCard />

      <View className="flex-row mb-4">
        <View className="flex-1 mr-2">
          <SkeletonBlock
            style={{
              width: "100%",
              height: 80,
              borderRadius: 16,
            }}
          />
        </View>

        <View className="flex-1 ml-2">
          <SkeletonBlock
            style={{
              width: "100%",
              height: 80,
              borderRadius: 16,
            }}
          />
        </View>
      </View>

      <SkeletonCollectionCard />
      <SkeletonCollectionCard />
      <SkeletonCollectionCard />
    </View>
  );

  // =====================================================
  // LOADING EMPLOYEES
  // =====================================================

  if (loadingEmployees) {
    return (
      <SafeAreaView className="flex-1 bg-[#f7f9f8]">
        <View
          className={`bg-[#024e32] absolute top-0 left-0 right-0 z-50 ${
            isDesktopOrLaptop
              ? "px-8 pt-20 pb-8"
              : "px-5 pt-16 pb-6"
          }`}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <TouchableOpacity
                onPress={() => router.back()}
                className={
                  isDesktopOrLaptop
                    ? "p-2"
                    : "mr-3"
                }
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={
                    isDesktopOrLaptop
                      ? 30
                      : 26
                  }
                  color="white"
                />
              </TouchableOpacity>

              <Text
                className={`text-white font-bold ml-3 ${
                  isDesktopOrLaptop
                    ? "text-3xl"
                    : "text-2xl"
                }`}
              >
                Employee Collections
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop:
              isDesktopOrLaptop
                ? 140
                : 110,
            paddingBottom: 20,
          }}
        >
          {renderSkeletonContent()}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <SafeAreaView className="flex-1 bg-[#f7f9f8]">
      {/* HEADER */}
      <View
        className={`bg-[#024e32] absolute top-0 left-0 right-0 z-50 ${
          isDesktopOrLaptop
            ? "px-8 pt-20 pb-8"
            : "px-5 pt-16 pb-6"
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className={
                isDesktopOrLaptop
                  ? "p-2"
                  : "mr-3"
              }
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="arrow-back"
                size={
                  isDesktopOrLaptop
                    ? 30
                    : 26
                }
                color="white"
              />
            </TouchableOpacity>

            <Text
              className={`text-white font-bold ml-3 ${
                isDesktopOrLaptop
                  ? "text-3xl"
                  : "text-2xl"
              }`}
            >
              Employee Collections
            </Text>
          </View>

          {!loadingEmployees &&
            selectedEmployee && (
              <View className="bg-white/20 px-4 py-2 rounded-full">
                <Text className="text-white font-medium text-sm">
                  {selectedEmployee.name}
                </Text>
              </View>
            )}
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
        contentContainerStyle={{
          paddingTop:
            isDesktopOrLaptop
              ? 140
              : 110,
          paddingBottom: 20,
        }}
      >
        <View
          className={`${
            isDesktopOrLaptop
              ? "px-8"
              : "px-5"
          } pt-4`}
        >
          {/* EMPLOYEE */}
          <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
            <Text className="text-gray-700 font-semibold mb-3">
              👤 Select Employee
            </Text>

            <TouchableOpacity
              onPress={() =>
                setShowEmployeeDropdown(true)
              }
              activeOpacity={0.7}
              className="border border-gray-300 bg-gray-50 p-4 rounded-xl flex-row justify-between items-center"
            >
              <View className="flex-1">
                <Text
                  className={
                    selectedEmployee
                      ? "text-base text-gray-900 font-semibold"
                      : "text-base text-gray-500"
                  }
                >
                  {selectedEmployee
                    ? selectedEmployee.name
                    : "Select Employee"}
                </Text>

                {selectedEmployee && (
                  <Text className="text-gray-500 text-xs mt-1">
                    Employee ID:{" "}
                    {selectedEmployee.emp_id}
                  </Text>
                )}
              </View>

              <MaterialIcons
                name="keyboard-arrow-down"
                size={28}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* DATE */}
          <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-200">
            <Text className="text-gray-700 font-semibold mb-3">
              📅 Select Date
            </Text>

            {Platform.OS === "web" ? (
              <input
                type="date"
                value={getApiDate(
                  selectedDate
                )}
                max={getApiDate(
                  new Date()
                )}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  if (!value) return;

                  const parts =
                    value.split("-");

                  if (
                    parts.length !== 3
                  ) {
                    return;
                  }

                  const year =
                    Number(parts[0]);

                  const month =
                    Number(parts[1]);

                  const day =
                    Number(parts[2]);

                  const date =
                    new Date(
                      year,
                      month - 1,
                      day
                    );

                  if (
                    !isNaN(
                      date.getTime()
                    )
                  ) {
                    setSelectedDate(
                      date
                    );

                    if (
                      selectedEmployee
                    ) {
                      fetchCollections(
                        selectedEmployee,
                        date
                      );
                    }
                  }
                }}
                style={{
                  width: "100%",
                  padding: "16px",
                  borderRadius: "12px",
                  border:
                    "1px solid #d1d5db",
                  fontSize: "16px",
                  backgroundColor:
                    "#f9fafb",
                  color: "#1f2937",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                }}
              />
            ) : (
              <>
                <TouchableOpacity
                  onPress={() =>
                    setShowDatePicker(
                      true
                    )
                  }
                  activeOpacity={0.7}
                  className="bg-gray-50 border border-gray-300 px-4 py-4 rounded-xl flex-row justify-between items-center"
                >
                  <Text className="text-base text-gray-900">
                    {formatDate(
                      selectedDate
                    )}
                  </Text>

                  <MaterialIcons
                    name="calendar-today"
                    size={22}
                    color="#024e32"
                  />
                </TouchableOpacity>

                {showDatePicker &&
                  Platform.OS ===
                    "android" && (
                    <DateTimePicker
                      value={
                        selectedDate
                      }
                      mode="date"
                      display="default"
                      maximumDate={
                        new Date()
                      }
                      onChange={
                        handleDateChange
                      }
                    />
                  )}

                {showDatePicker &&
                  Platform.OS ===
                    "ios" && (
                    <View className="mt-4">
                      <DateTimePicker
                        value={
                          selectedDate
                        }
                        mode="date"
                        display="spinner"
                        maximumDate={
                          new Date()
                        }
                        onChange={
                          handleDateChange
                        }
                      />

                      <TouchableOpacity
                        onPress={() =>
                          setShowDatePicker(
                            false
                          )
                        }
                        className="bg-[#024e32] py-3 rounded-xl mt-2"
                      >
                        <Text className="text-white text-center font-semibold">
                          Done
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
              </>
            )}
          </View>

          {/* SELECT EMPLOYEE */}
          {!selectedEmployee ? (
            <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
              <MaterialIcons
                name="person-search"
                size={55}
                color="#d1d5db"
              />

              <Text className="text-gray-600 text-lg font-semibold mt-4">
                Select an Employee
              </Text>

              <Text className="text-gray-400 text-sm text-center mt-2">
                Select an employee and date
                to view their daily
                collections.
              </Text>
            </View>
          ) : loadingCollections ? (
            <View>
              <View className="bg-[#024e32] rounded-2xl p-5 mb-4">
                <View className="flex-row items-center">
                  <SkeletonBlock
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                    }}
                  />

                  <View className="ml-3 flex-1">
                    <SkeletonBlock
                      style={{
                        width: 120,
                        height: 20,
                        marginBottom: 4,
                      }}
                    />

                    <SkeletonBlock
                      style={{
                        width: 80,
                        height: 14,
                      }}
                    />
                  </View>

                  <View className="items-end">
                    <SkeletonBlock
                      style={{
                        width: 60,
                        height: 12,
                        marginBottom: 4,
                      }}
                    />

                    <SkeletonBlock
                      style={{
                        width: 80,
                        height: 16,
                      }}
                    />
                  </View>
                </View>
              </View>

              <View className="flex-row mb-4">
                <View className="flex-1 mr-2">
                  <SkeletonBlock
                    style={{
                      width: "100%",
                      height: 80,
                      borderRadius: 16,
                    }}
                  />
                </View>

                <View className="flex-1 ml-2">
                  <SkeletonBlock
                    style={{
                      width: "100%",
                      height: 80,
                      borderRadius: 16,
                    }}
                  />
                </View>
              </View>

              <SkeletonCollectionCard />
              <SkeletonCollectionCard />
              <SkeletonCollectionCard />
            </View>
          ) : (
            <>
              {/* EMPLOYEE INFO */}
              <View className="bg-[#024e32] rounded-2xl p-5 mb-4">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                    <MaterialIcons
                      name="person"
                      size={28}
                      color="white"
                    />
                  </View>

                  <View className="ml-3 flex-1">
                    <Text className="text-white text-lg font-bold">
                      {selectedEmployee.name}
                    </Text>

                    <Text className="text-white/80 text-sm">
                      {selectedEmployee.emp_id}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-white/70 text-xs">
                      Date
                    </Text>

                    <Text className="text-white font-semibold">
                      {formatDate(
                        selectedDate
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* MAIN SUMMARY */}
              <View className="flex-row mb-4">
                <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-200 mr-2">
                  <Text className="text-gray-500 text-xs">
                    Collections
                  </Text>

                  <Text className="text-[#024e32] text-2xl font-bold mt-1">
                    {totalCollections}
                  </Text>
                </View>

                <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-200 ml-2">
                  <Text className="text-gray-500 text-xs">
                    Total Amount
                  </Text>

                  <Text className="text-green-600 text-xl font-bold mt-1">
                    {formatAmount(
                      totalAmount
                    )}
                  </Text>
                </View>
              </View>

              {/* PAYMENT MODES */}
              {collections.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <Text className="font-semibold text-gray-700 mb-3">
                    Payment Mode Summary
                  </Text>

                  <View className="flex-row">
                    <View className="flex-1 items-center">
                      <MaterialIcons
                        name="payments"
                        size={22}
                        color="#024e32"
                      />

                      <Text className="text-gray-500 text-xs mt-1">
                        Cash
                      </Text>

                      <Text className="font-bold text-gray-800">
                        {formatAmount(
                          cashAmount
                        )}
                      </Text>
                    </View>

                    <View className="flex-1 items-center border-l border-r border-gray-200">
                      <MaterialIcons
                        name="phone-android"
                        size={22}
                        color="#024e32"
                      />

                      <Text className="text-gray-500 text-xs mt-1">
                        UPI
                      </Text>

                      <Text className="font-bold text-gray-800">
                        {formatAmount(
                          upiAmount
                        )}
                      </Text>
                    </View>

                    <View className="flex-1 items-center">
                      <MaterialIcons
                        name="description"
                        size={22}
                        color="#024e32"
                      />

                      <Text className="text-gray-500 text-xs mt-1">
                        AC
                      </Text>

                      <Text className="font-bold text-gray-800">
                        {formatAmount(
                          chequeAmount
                        )}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* TYPE SUMMARY */}
              {collections.length > 0 && (
                <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-600">
                      Installment Collections
                    </Text>

                    <Text className="font-bold text-green-600">
                      {formatAmount(
                        installmentAmount
                      )}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">
                      Penalty Collections
                    </Text>

                    <Text className="font-bold text-red-600">
                      {formatAmount(
                        penaltyAmount
                      )}
                    </Text>
                  </View>
                </View>
              )}

              {/* EMPTY */}
              {collections.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
                  <MaterialIcons
                    name="receipt-long"
                    size={55}
                    color="#d1d5db"
                  />

                  <Text className="text-gray-600 text-lg font-semibold mt-4">
                    No Collections Found
                  </Text>

                  <Text className="text-gray-400 text-sm text-center mt-2">
                    {selectedEmployee.name} has
                    no collections on{" "}
                    {formatDate(
                      selectedDate
                    )}.
                  </Text>
                </View>
              ) : (
                /* COLLECTION LIST */
                <View>
                  <Text className="text-gray-700 font-semibold mb-3 ml-1">
                    Collection Details
                  </Text>

                  {collections.map(
                    (item, index) => (
                      <TouchableOpacity
                        key={
                          item.paymentId ||
                          `${item.groupId}-${item.groupMemberId}-${item.monthIndex}-${item.paidAt}-${index}`
                        }
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedCollection(
                            item
                          );
                          setDetailModalVisible(
                            true
                          );
                        }}
                        className="bg-white rounded-2xl p-4 mb-3 border border-gray-200"
                      >
                        <View className="flex-row justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="text-[#024e32] font-bold text-base">
                              {item.memberName ||
                                "Unknown Member"}
                            </Text>

                            <Text className="text-gray-500 text-xs mt-1">
                              Member ID:{" "}
                              {item.groupMemberId ||
                                item.memberId ||
                                "-"}
                            </Text>

                            <Text className="text-gray-600 text-sm mt-2">
                              Group:{" "}
                              {item.groupId}
                            </Text>

                            {item.chitId && (
                              <Text className="text-gray-600 text-sm">
                                Chit:{" "}
                                {item.chitId}
                              </Text>
                            )}

                            <Text className="text-gray-600 text-sm">
                              Month:{" "}
                              {item.monthIndex}
                            </Text>

                            <View className="flex-row items-center mt-2">
                              <MaterialIcons
                                name="access-time"
                                size={15}
                                color="#9CA3AF"
                              />

                              <Text className="text-gray-400 text-xs ml-1">
                                {formatTime(
                                  item.paidAt
                                )}
                              </Text>
                            </View>
                          </View>

                          <View className="items-end">
                            <Text className="text-[#024e32] font-bold text-lg">
                              {formatAmount(
                                item.amount
                              )}
                            </Text>

                            <View
                              className={
                                item.paymentType ===
                                "PENALTY"
                                  ? "bg-red-100 px-3 py-1 rounded-full mt-2"
                                  : "bg-green-100 px-3 py-1 rounded-full mt-2"
                              }
                            >
                              <Text
                                className={
                                  item.paymentType ===
                                  "PENALTY"
                                    ? "text-red-700 text-xs font-semibold"
                                    : "text-green-700 text-xs font-semibold"
                                }
                              >
                                {item.paymentType ===
                                "PENALTY"
                                  ? "Penalty"
                                  : "Installment"}
                              </Text>
                            </View>

                            <Text className="text-gray-500 text-xs mt-2">
                              {getDisplayPaymentMode(
                                item.paymentMode
                              )}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}

              {/* FOOTER */}
              <View className="mt-10 pt-6 border-t border-gray-200">
                <View className="items-center">
                  <Text className="text-[#024e32] font-bold text-lg">
                    MANIKYA CHITS PVT LTD
                  </Text>

                  <Text className="text-gray-500 text-xs mt-1">
                    Employee Collections Management
                  </Text>

                  <Text className="text-gray-400 text-xs mt-1">
                    ©{" "}
                    {new Date().getFullYear()}{" "}
                    Manikya Chits Pvt Ltd.
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* EMPLOYEE DROPDOWN */}
      <Modal
        visible={showEmployeeDropdown}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setShowEmployeeDropdown(false)
        }
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View
            className="bg-white rounded-t-3xl"
            style={{
              maxHeight: "75%",
            }}
          >
            <View className="p-5 border-b border-gray-200">
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-xl font-bold text-[#024e32]">
                    Select Employee
                  </Text>

                  <Text className="text-gray-500 text-xs mt-1">
                    {employees.length}{" "}
                    employees available
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setShowEmployeeDropdown(
                      false
                    )
                  }
                  className="p-2"
                >
                  <MaterialIcons
                    name="close"
                    size={25}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {employees.length === 0 ? (
              <View className="py-12 items-center">
                <MaterialIcons
                  name="people-outline"
                  size={50}
                  color="#d1d5db"
                />

                <Text className="text-gray-500 mt-3">
                  No employees found
                </Text>
              </View>
            ) : (
              <FlatList
                data={employees}
                keyExtractor={(item) =>
                  item._id ||
                  item.emp_id
                }
                showsVerticalScrollIndicator={
                  false
                }
                renderItem={({
                  item,
                }) => {
                  const selected =
                    selectedEmployee?.emp_id ===
                    item.emp_id;

                  return (
                    <TouchableOpacity
                      onPress={() =>
                        handleEmployeeSelect(
                          item
                        )
                      }
                      className={
                        selected
                          ? "px-5 py-4 border-b border-gray-100 bg-green-50"
                          : "px-5 py-4 border-b border-gray-100 bg-white"
                      }
                    >
                      <View className="flex-row items-center">
                        <View className="w-11 h-11 bg-gray-100 rounded-full items-center justify-center">
                          <MaterialIcons
                            name="person"
                            size={24}
                            color="#024e32"
                          />
                        </View>

                        <View className="flex-1 ml-3">
                          <Text className="font-semibold text-gray-900 text-base">
                            {item.name}
                          </Text>

                          <Text className="text-gray-500 text-sm">
                            {item.emp_id}
                          </Text>

                          {item.phone && (
                            <Text className="text-gray-400 text-xs mt-1">
                              {item.phone}
                            </Text>
                          )}
                        </View>

                        {selected && (
                          <MaterialIcons
                            name="check-circle"
                            size={25}
                            color="#024e32"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* COLLECTION DETAIL MODAL */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDetailModalVisible(
            false
          )
        }
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-5">
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-xl font-bold text-[#024e32]">
                Collection Details
              </Text>

              <TouchableOpacity
                onPress={() =>
                  setDetailModalVisible(
                    false
                  )
                }
              >
                <MaterialIcons
                  name="close"
                  size={25}
                  color="#666"
                />
              </TouchableOpacity>
            </View>

            {selectedCollection && (
              <>
                <View className="bg-gray-50 rounded-2xl p-4">
                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Employee
                    </Text>

                    <Text className="font-semibold">
                      {selectedCollection.employeeName ||
                        selectedEmployee?.name}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Employee ID
                    </Text>

                    <Text className="font-semibold">
                      {selectedCollection.employeeId ||
                        selectedEmployee?.emp_id ||
                        "-"}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Member
                    </Text>

                    <Text className="font-semibold">
                      {selectedCollection.memberName ||
                        "-"}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Group
                    </Text>

                    <Text className="font-semibold">
                      {selectedCollection.groupId}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Member ID
                    </Text>

                    <Text className="font-semibold">
                      {selectedCollection.groupMemberId ||
                        selectedCollection.memberId ||
                        "-"}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Month
                    </Text>

                    <Text className="font-semibold">
                      {selectedCollection.monthIndex}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Amount
                    </Text>

                    <Text className="font-bold text-green-600">
                      {formatAmount(
                        selectedCollection.amount
                      )}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Type
                    </Text>

                    <Text className="font-semibold">
                      {selectedCollection.paymentType}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Payment Mode
                    </Text>

                    <Text className="font-semibold">
                      {getDisplayPaymentMode(
                        selectedCollection.paymentMode
                      )}
                    </Text>
                  </View>

                  <View className="flex-row justify-between mb-3">
                    <Text className="text-gray-500">
                      Date
                    </Text>

                    <Text className="font-semibold">
                      {formatPaymentDate(
                        selectedCollection.paidAt
                      )}
                    </Text>
                  </View>

                  <View className="flex-row justify-between">
                    <Text className="text-gray-500">
                      Time
                    </Text>

                    <Text className="font-semibold">
                      {formatTime(
                        selectedCollection.paidAt
                      )}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    setDetailModalVisible(
                      false
                    )
                  }
                  className="bg-[#024e32] py-4 rounded-xl mt-5"
                >
                  <Text className="text-white text-center font-semibold">
                    Close
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}