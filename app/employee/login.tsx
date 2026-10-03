import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { BlurView } from 'expo-blur';

import BACKEND_URL from "../../config.js";
const EMPLOYEE_LOGIN_URL = `${BACKEND_URL}/employee/login`;

export default function EmployeeLogin() {
  const router = useRouter();

  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState({ empId: false, password: false });
  const [isLoading, setIsLoading] = useState(false);

  /*
    ADDED (red-field-on-empty):
    Tracks which field(s) were left empty when Sign In was tapped, so
    their border can turn red. Cleared per-field the moment the user
    types into that field, so the red only ever stays while the field
    is still empty. Nothing about the login flow changes.
  */
  const [fieldErrors, setFieldErrors] = useState({
    empId: false,
    password: false,
  });

  const { width, height } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(80)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  /*
    ADDED (success panel): drives the checkmark scale + fade when the
    login succeeds, plus a soft pulsing ring behind it.
  */
  const checkScaleAnim = useRef(new Animated.Value(0)).current;
  const checkFadeAnim = useRef(new Animated.Value(0)).current;
  const ringPulseAnim = useRef(new Animated.Value(0)).current;

  /*
    Holds the currently-running auto-navigate timer so it can be
    cleared cleanly if the component unmounts mid-success.
  */
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
    Drives the top navbar's shrink-on-scroll.
  */
  const scrollY = useRef(new Animated.Value(0)).current;
  const navbarScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });
  const navbarTranslateY = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, -6],
    extrapolate: 'clamp',
  });

  /*
    Dedicated fade value for the error/success message banner only.
  */
  const messageFadeAnim = useRef(new Animated.Value(1)).current;

  /*
    Holds the currently-running spinner loop so it can be
    stopped/reset cleanly.
  */
  const spinLoopRef = useRef<any>(null);

  const stopSpinner = () => {
    if (spinLoopRef.current) {
      spinLoopRef.current.stop();
      spinLoopRef.current = null;
    }
    progressAnim.setValue(0);
  };

  const REQUEST_TIMEOUT_MS = 15000;
  const MAX_ATTEMPTS = 3;

  const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    attempt: number = 1,
  ): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isNetworkFailure =
        err?.name === "AbortError" ||
        err?.message === "Network request failed" ||
        err?.name === "TypeError";

      if (isNetworkFailure && attempt < MAX_ATTEMPTS) {
        console.warn(
          `Employee login: network issue on attempt ${attempt} (${err?.message || err?.name}), retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        return fetchWithRetry(url, options, attempt + 1);
      }

      throw err;
    }
  };

  useEffect(() => {
    if (message) {
      // Make sure it starts fully visible even if a previous
      // message left this at 0.
      messageFadeAnim.setValue(1);

      const timer = setTimeout(() => {
        Animated.timing(messageFadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => setMessage(""));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Clean up any pending auto-navigate timer on unmount.
  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    };
  }, []);

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.8)),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin),
        }),
      ])
    ).start();
  }, []);

  /*
    ADDED (success panel): true the moment handleLogin's own
    setMessage("Welcome back! 🎉") lands.
  */
  const loginSuccess = !!message && message.includes("Welcome");

  // Play the checkmark pop + start the pulsing ring when login succeeds.
  useEffect(() => {
    if (loginSuccess) {
      checkScaleAnim.setValue(0);
      checkFadeAnim.setValue(0);
      ringPulseAnim.setValue(0);
      Animated.parallel([
        Animated.spring(checkScaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(checkFadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(ringPulseAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(ringPulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      checkScaleAnim.setValue(0);
      checkFadeAnim.setValue(0);
      ringPulseAnim.setValue(0);
    }
  }, [loginSuccess]);

  const handleLogin = async () => {
    // Hard guard against a fast double-tap slipping a second request
    // through before the disabled={isLoading} re-render lands.
    if (isLoading) return;

    if (!empId || !password) {
      // ADDED (red-field-on-empty): flag whichever field(s) are
      // missing so their border turns red.
      setFieldErrors({
        empId: !empId,
        password: !password,
      });

      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 0.08,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -0.08,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -0.05,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setMessage("Please enter Employee ID and password");
      return;
    }

    // Clear any lingering red as we move into a real attempt.
    setFieldErrors({ empId: false, password: false });

    setIsLoading(true);

    progressAnim.setValue(0);
    spinLoopRef.current = Animated.loop(
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );
    spinLoopRef.current.start();

    try {
      const res = await fetchWithRetry(EMPLOYEE_LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emp_id: empId, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        stopSpinner();
        setIsLoading(false);
        if (res.status === 403) {
          setMessage("Your account is deactivated. Please contact admin.");
        } else {
          setMessage(data.message || "Invalid Employee ID or password");
        }
        return;
      }

      const employeeData = {
        emp_id: data.employee.emp_id,
        name: data.employee.name,
        status: data.employee.status,
      };

      await AsyncStorage.setItem("employee", JSON.stringify(employeeData));
      await AsyncStorage.setItem("employeeInfo", JSON.stringify(employeeData));

      stopSpinner();
      setIsLoading(false);

      // Triggers the new success panel (see loginSuccess below).
      setMessage("Welcome back! 🎉");

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // FAST AUTO-LOGIN: 1 second after the checkmark appears, land
      // on the dashboard. No Continue button, no manual tap needed.
      navigateTimeoutRef.current = setTimeout(() => {
        router.replace("/employee");
      }, 1000);
    } catch (err) {
      console.log("Employee login error:", err);
      stopSpinner();
      setIsLoading(false);
      setMessage("Server unreachable");
    }
  };

  const dialSupport = () => {
    Linking.openURL("tel:+917259201729");
  };

  const logoSize = isDesktopOrLaptop
    ? Math.min(width * 0.2, 280)
    : width * 0.5;

  const float1 = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });
  const float2 = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  /* ================= TRANSPARENT / GLASS SURFACES ================= */
  /*
    CHANGED (red-field-on-empty): glassInput now also takes an
    `hasError` flag. When true, the border is red regardless of
    focus, so an empty field that was submitted reads as an error.
    Priority: error > focused > idle.
  */
  const glassInput = (focused: boolean, hasError: boolean = false) => ({
    backgroundColor: focused
      ? 'rgba(255,255,255,0.45)'
      : 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: hasError
      ? '#dc2626'
      : focused
      ? '#024e32'
      : 'rgba(255,255,255,0.6)',
  });

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      {/* ===== FULL TRANSPARENT BACKGROUND LAYER ===== */}
      <LinearGradient
        colors={['#e8f5ee', '#e3eef7', '#f2f7fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar
            barStyle="dark-content"
            backgroundColor="transparent"
            translucent
          />

          {/* Background decorative elements */}
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: 'rgba(2, 78, 50, 0.10)',
              transform: [{ translateY: float1 }],
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              bottom: -100,
              left: -100,
              width: 350,
              height: 350,
              borderRadius: 175,
              backgroundColor: 'rgba(2, 78, 50, 0.07)',
              transform: [{ translateY: float2 }],
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: '40%',
              left: -50,
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: 'rgba(3, 105, 161, 0.07)',
              transform: [{ translateY: float1 }],
            }}
          />

          {/* ================= TOP NAV BAR ================= */}
          <Animatable.View
            animation="fadeInDown"
            duration={600}
            delay={200}
            style={{
              paddingHorizontal: isDesktopOrLaptop ? 40 : 16,
              paddingTop: (StatusBar.currentHeight || 0) + 10,
              zIndex: 20,
            }}
          >
            <Animated.View style={{ transform: [{ scale: navbarScale }, { translateY: navbarTranslateY }] }}>
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.28)',
              borderRadius: 20,
              padding: 4,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.55)',
            }}>
              <TouchableOpacity
                onPress={() => router.replace("/admin/login")}
                activeOpacity={0.7}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 16 }}
              >
                <MaterialIcons name="admin-panel-settings" size={16} color="#475569" />
                <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#475569' }}>Admin</Text>
              </TouchableOpacity>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 16, backgroundColor: '#024e32' }}>
                <MaterialIcons name="badge" size={16} color="#fff" />
                <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#fff' }}>Employee</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.replace("/")}
                activeOpacity={0.7}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 16 }}
              >
                <MaterialIcons name="person" size={16} color="#475569" />
                <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#475569' }}>Member</Text>
              </TouchableOpacity>
            </View>
            </Animated.View>
          </Animatable.View>

        <Animated.ScrollView
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: 'transparent' }}
        >
          <Animated.View style={{
            flex: 1,
            flexDirection: isDesktopOrLaptop ? 'row' : 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: isDesktopOrLaptop ? 60 : 24,
            paddingVertical: isDesktopOrLaptop ? 40 : 20,
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }}>


            {/* ================= LEFT SIDE - BRANDING ================= */}
            {isDesktopOrLaptop && (
              <Animatable.View
                animation="fadeInLeft"
                duration={800}
                delay={300}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingRight: 60,
                }}
              >
                <Animated.View style={{
                  backgroundColor: 'rgba(255,255,255,0.25)',
                  borderRadius: 40,
                  padding: 40,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.55)',
                  transform: [{ scale: pulseAnim }],
                }}>
                  <Image
                    source={require("../../assets/images/manikyaChits.png")}
                    style={{
                      width: logoSize,
                      height: logoSize,
                      maxWidth: 300,
                      maxHeight: 300,
                    }}
                    resizeMode="contain"
                  />
                </Animated.View>

                <Animatable.Text
                  animation="fadeInUp"
                  duration={800}
                  delay={500}
                  style={{
                    fontSize: 40,
                    fontWeight: '800',
                    color: '#024e32',
                    marginTop: 32,
                    letterSpacing: 2,
                  }}
                >
                  Employee Portal
                </Animatable.Text>

                <Animatable.Text
                  animation="fadeInUp"
                  duration={800}
                  delay={600}
                  style={{
                    fontSize: 16,
                    color: '#475569',
                    marginTop: 12,
                    letterSpacing: 1,
                    textAlign: 'center',
                  }}
                >
                  Secure access for authorized personnel only
                </Animatable.Text>

                <Animatable.View
                  animation="fadeInUp"
                  duration={800}
                  delay={700}
                  style={{
                    flexDirection: 'row',
                    marginTop: 30,
                    gap: 20,
                  }}
                >
                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: 'rgba(255,255,255,0.35)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.6)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="security" size={24} color="#024e32" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Secure</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: 'rgba(255,255,255,0.35)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.6)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="verified" size={24} color="#024e32" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Verified</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: 'rgba(255,255,255,0.35)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.6)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="support-agent" size={24} color="#024e32" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Support</Text>
                  </View>
                </Animatable.View>
              </Animatable.View>
            )}

            {/* ================= RIGHT SIDE - LOGIN FORM ================= */}
            <Animatable.View
              animation={isDesktopOrLaptop ? "fadeInRight" : "fadeInUp"}
              duration={800}
              delay={isDesktopOrLaptop ? 400 : 200}
              style={{
                width: isDesktopOrLaptop ? '42%' : '100%',
                maxWidth: isDesktopOrLaptop ? 480 : 400,
              }}
            >
              {/* Mobile Logo */}
              {!isDesktopOrLaptop && (
                <Animatable.View
                  animation="fadeInDown"
                  duration={600}
                  delay={100}
                  style={{ alignItems: 'center', marginBottom: 30 }}
                >
                  <Animated.View style={{
                    transform: [{ scale: pulseAnim }],
                  }}>
                    <Image
                      source={require("../../assets/images/manikyaChits.png")}
                      style={{
                        width: logoSize,
                        height: logoSize,
                      }}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </Animatable.View>
              )}

              {/* Login Card — TRANSPARENT GLASS */}
              <Animated.View style={{
                backgroundColor: 'transparent',
                borderRadius: 32,
                padding: isDesktopOrLaptop ? 40 : 32,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.55)',
                overflow: 'hidden',
              }}>
                {/* Gradient top bar */}
                <LinearGradient
                  colors={['#024e32', '#0369a1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 4,
                    opacity: 0.9,
                  }}
                />

                {/* Header */}
                <View style={{ marginBottom: 32, marginTop: 4 }}>
                  {!isDesktopOrLaptop && (
                    <Animatable.Text
                      animation="fadeInUp"
                      duration={600}
                      delay={400}
                      style={{
                        fontSize: 28,
                        fontWeight: '800',
                        color: '#024e32',
                        textAlign: 'center',
                        letterSpacing: 1,
                      }}
                    >
                      Welcome Back
                    </Animatable.Text>
                  )}
                  {isDesktopOrLaptop && (
                    <>
                      <Animatable.Text
                        animation="fadeInUp"
                        duration={600}
                        delay={600}
                        style={{
                          fontSize: 34,
                          fontWeight: '800',
                          color: '#024e32',
                          textAlign: 'center',
                          letterSpacing: 1,
                        }}
                      >
                        Welcome Back
                      </Animatable.Text>
                      <Animatable.Text
                        animation="fadeInUp"
                        duration={600}
                        delay={700}
                        style={{
                          fontSize: 16,
                          color: '#64748b',
                          textAlign: 'center',
                          marginTop: 8,
                          letterSpacing: 0.5,
                        }}
                      >
                        Sign in to access your employee dashboard
                      </Animatable.Text>
                    </>
                  )}
                  {!isDesktopOrLaptop && (
                    <Animatable.Text
                      animation="fadeInUp"
                      duration={600}
                      delay={500}
                      style={{
                        fontSize: 14,
                        color: '#64748b',
                        textAlign: 'center',
                        marginTop: 4,
                      }}
                    >
                      Secure access for authorized personnel
                    </Animatable.Text>
                  )}
                </View>

                {/* Form */}
                <View>
                  {loginSuccess ? (
                    /* ---------- SUCCESS STATE ---------- */
                    <View
                      style={{
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingVertical: 28,
                      }}
                    >
                      <View
                        style={{
                          width: 110,
                          height: 110,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Expanding ring */}
                        <Animated.View
                          pointerEvents="none"
                          style={{
                            position: 'absolute',
                            width: 92,
                            height: 92,
                            borderRadius: 46,
                            borderWidth: 2,
                            borderColor: 'rgba(34,197,94,0.55)',
                            opacity: ringPulseAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.9, 0],
                            }),
                            transform: [
                              {
                                scale: ringPulseAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.85, 1.35],
                                }),
                              },
                            ],
                          }}
                        />

                        {/* Static glow disc */}
                        <Animated.View
                          style={{
                            width: 84,
                            height: 84,
                            borderRadius: 42,
                            backgroundColor: 'rgba(34,197,94,0.16)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1.5,
                            borderColor: '#16a34a',
                            shadowColor: '#16a34a',
                            shadowOpacity: 0.55,
                            shadowRadius: 24,
                            shadowOffset: { width: 0, height: 0 },
                            elevation: 8,
                            transform: [{ scale: checkScaleAnim }],
                          }}
                        >
                          <MaterialIcons name="check" size={46} color="#16a34a" />
                        </Animated.View>
                      </View>

                      <Animated.Text
                        style={{
                          color: '#024e32',
                          fontSize: 22,
                          fontWeight: '800',
                          marginTop: 22,
                          letterSpacing: 0.3,
                          opacity: checkFadeAnim,
                        }}
                      >
                        Verified successfully
                      </Animated.Text>
                      <Animated.Text
                        style={{
                          color: '#64748b',
                          fontSize: 14,
                          marginTop: 8,
                          textAlign: 'center',
                          lineHeight: 20,
                          paddingHorizontal: 16,
                          opacity: checkFadeAnim,
                        }}
                      >
                        Welcome back! Logging you in…
                      </Animated.Text>
                    </View>
                  ) : (
                    /* ---------- NORMAL LOGIN FORM ---------- */
                    <>
                      {/* Employee ID */}
                      <Animatable.View
                        animation="fadeInUp"
                        duration={600}
                        delay={isDesktopOrLaptop ? 800 : 600}
                        style={{ marginBottom: 20 }}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: 8,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                        }}>
                          Employee ID
                        </Text>
                        <Animated.View style={[
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                          },
                          // CHANGED: pass fieldErrors.empId so this
                          // box goes red when submitted empty.
                          glassInput(isFocused.empId, fieldErrors.empId),
                          {
                            transform: [
                              {
                                rotate: rotateAnim.interpolate({
                                  inputRange: [-0.08, 0.08],
                                  outputRange: ['-4deg', '4deg'],
                                })
                              }
                            ],
                          }
                        ]}>
                          <MaterialIcons
                            name="badge"
                            size={22}
                            color={
                              fieldErrors.empId
                                ? '#dc2626'
                                : isFocused.empId
                                ? '#024e32'
                                : '#64748b'
                            }
                          />
                          <TextInput
                            placeholder="Enter Employee ID"
                            placeholderTextColor="#64748b"
                            style={{
                              flex: 1,
                              marginLeft: 12,
                              fontSize: 16,
                              color: '#1e293b',
                              padding: 0,
                              backgroundColor: 'transparent',
                            }}
                            value={empId}
                            onChangeText={(t) => {
                              setEmpId(t);
                              // Clear this field's red as soon as the
                              // user starts typing into it.
                              if (fieldErrors.empId) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  empId: false,
                                }));
                              }
                            }}
                            onFocus={() => setIsFocused({ ...isFocused, empId: true })}
                            onBlur={() => setIsFocused({ ...isFocused, empId: false })}
                            autoCapitalize="none"
                          />
                          {empId.length > 0 && (
                            <TouchableOpacity onPress={() => setEmpId('')}>
                              <Ionicons name="close-circle" size={20} color="#64748b" />
                            </TouchableOpacity>
                          )}
                        </Animated.View>
                      </Animatable.View>

                      {/* Password */}
                      <Animatable.View
                        animation="fadeInUp"
                        duration={600}
                        delay={isDesktopOrLaptop ? 900 : 700}
                        style={{ marginBottom: 28 }}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: 8,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                        }}>
                          Password
                        </Text>
                        <View style={[
                          {
                            flexDirection: 'row',
                            alignItems: 'center',
                            borderRadius: 16,
                            paddingHorizontal: 16,
                            paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                          },
                          // CHANGED: pass fieldErrors.password so this
                          // box goes red when submitted empty.
                          glassInput(isFocused.password, fieldErrors.password),
                        ]}>
                          <MaterialIcons
                            name="lock-outline"
                            size={22}
                            color={
                              fieldErrors.password
                                ? '#dc2626'
                                : isFocused.password
                                ? '#024e32'
                                : '#64748b'
                            }
                          />
                          <TextInput
                            placeholder="Enter Password"
                            placeholderTextColor="#64748b"
                            secureTextEntry={!showPassword}
                            style={{
                              flex: 1,
                              marginLeft: 12,
                              fontSize: 16,
                              color: '#1e293b',
                              padding: 0,
                              backgroundColor: 'transparent',
                            }}
                            value={password}
                            onChangeText={(t) => {
                              setPassword(t);
                              // Clear this field's red as soon as the
                              // user starts typing into it.
                              if (fieldErrors.password) {
                                setFieldErrors((prev) => ({
                                  ...prev,
                                  password: false,
                                }));
                              }
                            }}
                            onFocus={() => setIsFocused({ ...isFocused, password: true })}
                            onBlur={() => setIsFocused({ ...isFocused, password: false })}
                          />
                          <TouchableOpacity
                            onPress={() => setShowPassword(!showPassword)}
                            style={{ padding: 4 }}
                          >
                            <MaterialIcons
                              name={showPassword ? "visibility" : "visibility-off"}
                              size={24}
                              color="#64748b"
                            />
                          </TouchableOpacity>
                        </View>
                      </Animatable.View>

                      {/* Login Button */}
                      <Animatable.View
                        animation="fadeInUp"
                        duration={600}
                        delay={isDesktopOrLaptop ? 1000 : 800}
                      >
                        <TouchableOpacity
                          onPress={handleLogin}
                          activeOpacity={0.85}
                          disabled={isLoading}
                          style={{
                            borderRadius: 16,
                            overflow: 'hidden',
                          }}
                        >
                          <LinearGradient
                            colors={['#024e32', '#0369a1']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              paddingVertical: 18,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                            }}
                          >
                            {isLoading ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Animated.View style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: 10,
                                  borderWidth: 3,
                                  borderColor: 'white',
                                  borderTopColor: 'transparent',
                                  transform: [{
                                    rotate: progressAnim.interpolate({
                                      inputRange: [0, 1],
                                      outputRange: ['0deg', '360deg'],
                                    })
                                  }],
                                }} />
                                <Text style={{
                                  color: 'white',
                                  fontSize: 18,
                                  fontWeight: '700',
                                  letterSpacing: 0.5,
                                  marginLeft: 12,
                                }}>
                                  Signing In...
                                </Text>
                              </View>
                            ) : (
                              <>
                                <Text style={{
                                  color: 'white',
                                  fontSize: 18,
                                  fontWeight: '700',
                                  letterSpacing: 0.5,
                                }}>
                                  Sign In
                                </Text>
                                <Animatable.View
                                  animation="pulse"
                                  easing="ease-out"
                                  iterationCount="infinite"
                                  style={{ marginLeft: 12 }}
                                >
                                  <MaterialIcons name="arrow-forward" size={24} color="white" />
                                </Animatable.View>
                              </>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      </Animatable.View>
                    </>
                  )}

                  {/* Message */}
                  {message && !loginSuccess ? (
                    <Animated.View style={{ opacity: messageFadeAnim }}>
                      <Animatable.View
                        animation="shake"
                        duration={600}
                        style={{
                          marginTop: 20,
                          padding: 14,
                          borderRadius: 14,
                          backgroundColor: 'rgba(254, 226, 226, 0.55)',
                          borderWidth: 1,
                          borderColor: 'rgba(252, 165, 165, 0.9)',
                          flexDirection: 'row',
                          alignItems: 'center',
                        }}
                      >
                        <MaterialIcons
                          name="error-outline"
                          size={20}
                          color="#dc2626"
                        />
                        <Text style={{
                          flex: 1,
                          marginLeft: 10,
                          color: '#b91c1c',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                          {message}
                        </Text>
                      </Animatable.View>
                    </Animated.View>
                  ) : null}

                  {/* Help links -- suppressed during success panel */}
                  {!loginSuccess && (
                    <Animatable.View
                      animation="fadeInUp"
                      duration={600}
                      delay={isDesktopOrLaptop ? 1100 : 900}
                      style={{
                        marginTop: 24,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <TouchableOpacity>
                        <Text style={{
                          color: '#64748b',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                          Forgot ID?
                        </Text>
                      </TouchableOpacity>
                      <View style={{ width: 1, height: 20, backgroundColor: 'rgba(2,78,50,0.15)' }} />
                      <TouchableOpacity>
                        <Text style={{
                          color: '#64748b',
                          fontSize: 14,
                          fontWeight: '500',
                        }}>
                          Forgot Password?
                        </Text>
                      </TouchableOpacity>
                      <View style={{ width: 1, height: 20, backgroundColor: 'rgba(2,78,50,0.15)' }} />
                      <TouchableOpacity onPress={dialSupport}>
                        <Text style={{
                          color: '#024e32',
                          fontSize: 14,
                          fontWeight: '600',
                        }}>
                          Help
                        </Text>
                      </TouchableOpacity>
                    </Animatable.View>
                  )}

                  {/* Footer */}
                  {!isDesktopOrLaptop && (
                    <Animatable.View
                      animation="fadeInUp"
                      duration={600}
                      delay={1000}
                      style={{
                        marginTop: 24,
                        paddingTop: 20,
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(2,78,50,0.10)',
                      }}
                    >
                      <Text style={{
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: 12,
                      }}>
                        © 2026 Employee Portal. All rights reserved.
                      </Text>
                    </Animatable.View>
                  )}
                </View>
              </Animated.View>

              {/* Desktop Footer */}
              {isDesktopOrLaptop && (
                <Animatable.View
                  animation="fadeInUp"
                  duration={600}
                  delay={1200}
                  style={{
                    marginTop: 20,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 12,
                  }}>
                    © 2026 Employee Portal. All rights reserved.
                  </Text>
                </Animatable.View>
              )}
            </Animatable.View>
          </Animated.View>
        </Animated.ScrollView>

        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}