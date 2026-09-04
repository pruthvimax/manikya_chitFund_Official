import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import BACKEND_URL from "../../config";

import {
    Alert,
    BackHandler,
    Image,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    Modal,
} from "react-native";

// =========================================================
// SCREENSHOT PREVENTION FOR ALL PLATFORMS
// =========================================================

let ScreenCapture: any = null;

try {
    const module = require("expo-screen-capture");
    ScreenCapture = module.default || module;
} catch (error) {
    console.log("expo-screen-capture not available");
}

const preventScreenshot = async () => {
    try {
      // Admin exemption. While an admin session is active on this
      // device the app leaves screen capture ENABLED, so only an
      // admin can screenshot. Every other user stays blocked.
      if ((await AsyncStorage.getItem("adminSession")) === "true") {
        await allowScreenshot();
        return;
      }

        if (ScreenCapture && typeof ScreenCapture.preventScreenCaptureAsync === 'function') {
            await ScreenCapture.preventScreenCaptureAsync();
            console.log("✅ Screenshots prevented (expo-screen-capture)");
            return;
        }

        if (Platform.OS === "android") {
            try {
                const { NativeModules } = require("react-native");
                const { SecureViewManager } = NativeModules;
                if (SecureViewManager?.setSecure) {
                    await SecureViewManager.setSecure(true);
                    console.log("✅ Screenshots prevented (native)");
                }
            } catch (error) {
                console.log("Native SecureViewManager not available");
            }
        }
    } catch (error) {
        console.log("Screenshot prevention error:", error);
    }
};

const allowScreenshot = async () => {
    try {
        if (ScreenCapture && typeof ScreenCapture.allowScreenCaptureAsync === 'function') {
            await ScreenCapture.allowScreenCaptureAsync();
            console.log("✅ Screenshots allowed (expo-screen-capture)");
            return;
        }

        if (Platform.OS === "android") {
            try {
                const { NativeModules } = require("react-native");
                const { SecureViewManager } = NativeModules;
                if (SecureViewManager?.setSecure) {
                    await SecureViewManager.setSecure(false);
                    console.log("✅ Screenshots allowed (native)");
                }
            } catch (error) {
                console.log("Native SecureViewManager not available");
            }
        }
    } catch (error) {
        console.log("Screenshot allow error:", error);
    }
};

export default function EmployeeDashboard() {
    const router = useRouter();

    // =========================================================
    // SCREENSHOT PREVENTION
    // =========================================================

    useEffect(() => {
        preventScreenshot();
        return () => {
            allowScreenshot();
        };
    }, []);

    // =========================================================
    // WEB SCREENSHOT DETECTION
    // =========================================================

    useEffect(() => {
        if (Platform.OS === "web") {
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === "PrintScreen") {
                    e.preventDefault();
                    Alert.alert(
                        "Screenshot Blocked",
                        "Screenshots are not allowed for security reasons."
                    );
                }
            };

            const handleContextMenu = (e: MouseEvent) => {
                e.preventDefault();
                Alert.alert(
                    "Action Blocked",
                    "Right-click is disabled for security reasons."
                );
            };

            const handleDevTools = (e: KeyboardEvent) => {
                if (
                    (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) ||
                    (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) ||
                    (e.ctrlKey && e.key === "U") ||
                    (e.ctrlKey && e.key === "u") ||
                    (e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c"))
                ) {
                    e.preventDefault();
                    Alert.alert(
                        "Action Blocked",
                        "Developer tools are disabled for security reasons."
                    );
                }
            };

            const handleSave = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
                    e.preventDefault();
                    Alert.alert(
                        "Action Blocked",
                        "Save is disabled for security reasons."
                    );
                }
            };

            const handlePrint = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
                    e.preventDefault();
                    Alert.alert(
                        "Action Blocked",
                        "Print is disabled for security reasons."
                    );
                }
            };

            const handleCopy = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
                    e.preventDefault();
                    Alert.alert(
                        "Action Blocked",
                        "Copy is disabled for security reasons."
                    );
                }
            };

            const handleCut = (e: KeyboardEvent) => {
                if ((e.ctrlKey || e.metaKey) && (e.key === "x" || e.key === "X")) {
                    e.preventDefault();
                    Alert.alert(
                        "Action Blocked",
                        "Cut is disabled for security reasons."
                    );
                }
            };

            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("contextmenu", handleContextMenu);
            document.addEventListener("keydown", handleDevTools);
            document.addEventListener("keydown", handleSave);
            document.addEventListener("keydown", handlePrint);
            document.addEventListener("keydown", handleCopy);
            document.addEventListener("keydown", handleCut);

            document.addEventListener("dragstart", (e) => {
                e.preventDefault();
            });

            const style = document.createElement("style");
            style.textContent = `
                body {
                    user-select: none !important;
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                }
                img {
                    -webkit-user-drag: none !important;
                    user-drag: none !important;
                    pointer-events: none !important;
                }
                @media print {
                    body { display: none !important; }
                    * { display: none !important; }
                }
                * {
                    -webkit-touch-callout: none !important;
                    -webkit-user-select: none !important;
                    -moz-user-select: none !important;
                    -ms-user-select: none !important;
                    user-select: none !important;
                }
            `;
            document.head.appendChild(style);

            return () => {
                document.removeEventListener("keydown", handleKeyDown);
                document.removeEventListener("contextmenu", handleContextMenu);
                document.removeEventListener("keydown", handleDevTools);
                document.removeEventListener("keydown", handleSave);
                document.removeEventListener("keydown", handlePrint);
                document.removeEventListener("keydown", handleCopy);
                document.removeEventListener("keydown", handleCut);
                document.removeEventListener("dragstart", (e) => {
                    e.preventDefault();
                });
                document.head.removeChild(style);
            };
        }
    }, []);

    /* ===== DASHBOARD SUMMARY STATES ===== */
    const [refreshing, setRefreshing] = useState(false);
    const [featureAccess, setFeatureAccess] = useState(true);
    const [loadingAccess, setLoadingAccess] = useState(true);
    const [employeeName, setEmployeeName] = useState("Employee");

    // ✅ Use ref to prevent multiple API calls
    const isFirstRender = useRef(true);

    // ✅ State for modals
    const [accessModalVisible, setAccessModalVisible] = useState(false);
    const [logoutModalVisible, setLogoutModalVisible] = useState(false);
    const [modalMessage, setModalMessage] = useState("");

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            const stored = await AsyncStorage.getItem("employee");

            if (!stored) {
                router.replace("/employee/login");
                return;
            }

            const employee = JSON.parse(stored);
            setEmployeeName(employee.name || "Employee");

            const statusRes = await fetch(
                `${BACKEND_URL}/employee/check-status/${employee.emp_id}`
            );

            const statusData = await statusRes.json();

            setFeatureAccess(
                statusData.featureAccess !== undefined
                    ? statusData.featureAccess
                    : true
            );

        } catch (err) {
            console.log("Refresh error:", err);
            Alert.alert("Refresh Failed", "Unable to refresh data. Please try again.");
        } finally {
            setRefreshing(false);
        }
    }, [router]);

    useEffect(() => {
        const checkSessionAndStatus = async () => {
            console.log("Backend URL:", BACKEND_URL);
            const stored = await AsyncStorage.getItem("employee");

            if (!stored) {
                router.replace("/employee/login");
                return;
            }

            const employee = JSON.parse(stored);
            setEmployeeName(employee.name || "Employee");

            try {
                const url = `${BACKEND_URL}/employee/check-status/${employee.emp_id}`;

                const res = await fetch(url);
                const data = await res.json();

                console.log("FeatureAccess from API:", data.featureAccess);

                setFeatureAccess(
                    data.featureAccess !== undefined ? data.featureAccess : true
                );
                setLoadingAccess(false);
            } catch (err) {
                console.log("Status check failed", err);
                setLoadingAccess(false);
            }
        };

        // ✅ Only run on first render
        if (isFirstRender.current) {
            isFirstRender.current = false;
            checkSessionAndStatus();
        }

        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            () => true
        );

        return () => {
            backHandler.remove();
        };
    }, []);

    /* ================= LOGOUT FUNCTION ================= */
    const handleLogout = async () => {
        setLogoutModalVisible(false);

        try {
            await AsyncStorage.removeItem("employee");
            router.replace("/employee/login");
        } catch (error) {
            console.log("Logout error:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
        }
    };

    const showAccessDeniedModal = () => {
        setModalMessage("This feature has been temporarily disabled by your administrator. Please contact your admin for assistance.");
        setAccessModalVisible(true);
    };

    const showLogoutModal = () => {
        setLogoutModalVisible(true);
    };

    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <SafeAreaView className="flex-1 bg-[#f7f9f8]">

            {/* ✅ PROFESSIONAL HEADER */}
            <View className="bg-[#024e32] px-5 pt-12 pb-5 absolute top-0 left-0 right-0 z-50">
                {/* Top Row */}
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-lg bg-white/10 items-center justify-center">
                            <MaterialIcons name="business-center" size={22} color="white" />
                        </View>
                        <View className="ml-3">
                            <Text className="text-white text-xs opacity-60">EMPLOYEE</Text>
                            <Text className="text-white text-lg font-bold -mt-0.5">Dashboard</Text>
                        </View>
                    </View>

                    <View className="flex-row items-center">

                        {/* Logout Button */}
                        <TouchableOpacity
                            onPress={showLogoutModal}
                            className="bg-white/20 px-3 py-2 rounded-lg flex-row items-center"
                        >
                            <MaterialIcons name="logout" size={18} color="white" />
                            <Text className="text-white text-sm font-medium ml-1">Exit</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Welcome Message with Employee Name */}
                <View className="mt-2 flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <Text className="text-white/80 text-sm">
                            Welcome back, <Text className="text-white font-bold">{employeeName}</Text>
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <MaterialIcons name="calendar-today" size={14} color="white/60" />
                        <Text className="text-white/60 text-xs ml-1">
                            {currentDate}
                        </Text>
                    </View>
                </View>
            </View>

            {/* CONTENT WITH PULL TO REFRESH */}
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingTop: 130 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#024e32"]}
                        tintColor="#024e32"
                        title="Refreshing..."
                        titleColor="#024e32"
                    />
                }
            >

                {/* LOGO */}
                <View className="items-center mt-6">
                    <Image
                        source={require("../../assets/images/manikyaChits.png")}
                        style={{ width: 140, height: 140 }}
                        resizeMode="contain"
                    />
                </View>

                {/* DASHBOARD MENU */}
                <View className="flex-row flex-wrap justify-between px-5 mt-6">
                    <MenuCard
                        title="Profile"
                        icon="person"
                        route="/employee/profile"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                    <MenuCard
                        title="Reference"
                        icon="handshake"
                        route="/employee/reference"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                    <MenuCard
                        title="Collection"
                        icon="attach-money"
                        route="/employee/collections"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                    <MenuCard
                        title="Chit Schemes"
                        icon="account-balance-wallet"
                        route="/employee/chitscheme"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                   
                    <MenuCard
                        title="Member History"
                        icon="people"
                        route="/employee/member-history"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                    <MenuCard
                        title="Contact"
                        icon="contact-phone"
                        route="/employee/contact"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                    <MenuCard
                        title="Payment History"
                        icon="history"
                        route="/employee/paymentHistory"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                    <MenuCard
                        title="Work Tracker"
                        icon="assignment"
                        route="/employee/workTracker"
                        featureAccess={featureAccess}
                        loadingAccess={loadingAccess}
                        showModal={showAccessDeniedModal}
                    />
                </View>

                {/* FOOTER */}
                <View className="px-5 mt-6 mb-5">
                    <View className="border-t border-gray-200 pt-4 items-center">
                        <Text className="text-[#024e32] font-bold text-base">
                            MANIKYA CHITS PVT LTD
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1 text-center">
                            Employee Portal v2.0
                        </Text>
                        <Text className="text-gray-400 text-xs mt-1 text-center">
                            © {new Date().getFullYear()} All rights reserved.
                        </Text>
                    </View>
                </View>

            </ScrollView>

            {/* ✅ CUSTOM ACCESS DENIED MODAL */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={accessModalVisible}
                onRequestClose={() => setAccessModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white rounded-3xl p-6 mx-6 w-11/12 max-w-sm shadow-2xl">
                        <View className="items-center mb-4">
                            <View className="w-20 h-20 rounded-full bg-red-100 items-center justify-center">
                                <MaterialIcons name="lock" size={40} color="#dc2626" />
                            </View>
                        </View>

                        <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
                            Access Denied
                        </Text>

                        <Text className="text-gray-600 text-center text-base leading-6 mb-6">
                            {modalMessage}
                        </Text>

                        <View className="flex-row justify-center">
                            <TouchableOpacity
                                onPress={() => setAccessModalVisible(false)}
                                className="bg-[#024e32] px-8 py-3 rounded-full"
                                activeOpacity={0.8}
                            >
                                <Text className="text-white font-semibold text-base">
                                    Got it
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => {
                                setAccessModalVisible(false);
                                router.push("/employee/contact");
                            }}
                            className="mt-3 items-center"
                        >
                            <Text className="text-[#024e32] text-sm underline">
                                Contact Administrator
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ✅ CUSTOM LOGOUT CONFIRMATION MODAL */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={logoutModalVisible}
                onRequestClose={() => setLogoutModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-black/50">
                    <View className="bg-white rounded-3xl p-6 mx-6 w-11/12 max-w-sm shadow-2xl">
                        {/* Icon Circle */}
                        <View className="items-center mb-4">
                            <View className="w-20 h-20 rounded-full bg-orange-100 items-center justify-center">
                                <MaterialIcons name="logout" size={40} color="#ea580c" />
                            </View>
                        </View>

                        {/* Title */}
                        <Text className="text-2xl font-bold text-center text-gray-800 mb-2">
                            Confirm Logout
                        </Text>

                        {/* Message */}
                        <Text className="text-gray-600 text-center text-base leading-6 mb-6">
                            Are you sure you want to logout? You will need to login again to access your account.
                        </Text>

                        {/* Buttons */}
                        <View className="flex-row justify-between gap-3">
                            <TouchableOpacity
                                onPress={() => setLogoutModalVisible(false)}
                                className="flex-1 bg-gray-200 py-3 rounded-full"
                                activeOpacity={0.8}
                            >
                                <Text className="text-gray-700 font-semibold text-base text-center">
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={handleLogout}
                                className="flex-1 bg-red-600 py-3 rounded-full"
                                activeOpacity={0.8}
                            >
                                <View className="flex-row items-center justify-center">
                                    <MaterialIcons name="logout" size={20} color="white" />
                                    <Text className="text-white font-semibold text-base ml-2">
                                        Logout
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Security Note */}
                        <View className="mt-4 items-center flex-row justify-center">
                            <MaterialIcons name="security" size={14} color="#9ca3af" />
                            <Text className="text-gray-400 text-xs ml-1">
                                Your session will be terminated
                            </Text>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function MenuCard({
    title,
    icon,
    route,
    featureAccess,
    loadingAccess,
    showModal,
}: {
    title: string;
    icon: any;
    route: string;
    featureAccess: boolean;
    loadingAccess: boolean;
    showModal: () => void;
}) {
    const router = useRouter();

    const isBlocked =
        (!featureAccess || loadingAccess) &&
        (route.includes("collections") ||
            route.includes("paymentHistory") ||
            route.includes("member-history"));

    const handlePress = () => {
        if (loadingAccess) return;

        if (isBlocked) {
            showModal();
            return;
        }

        router.push(route);
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            className="bg-white w-[47%] py-8 mb-6 rounded-3xl items-center shadow-md border border-[#e8f0eb]"
            activeOpacity={0.9}
        >
            <View className="w-16 h-16 rounded-2xl items-center justify-center mb-3">
                <MaterialIcons
                    name={icon}
                    size={36}
                    color={isBlocked ? "#9ca3af" : "#024e32"}
                />
            </View>

            <Text
                className={`text-base font-semibold text-center ${isBlocked ? "text-gray-400" : "text-[#024e32]"
                    }`}
            >
                {title}
            </Text>

            {isBlocked && (
                <View className="mt-2 bg-red-100 px-2 py-0.5 rounded-full">
                    <Text className="text-red-500 text-xs font-semibold">Disabled</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}