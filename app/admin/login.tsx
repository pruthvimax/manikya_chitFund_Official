import { MaterialIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect, useRef } from "react";
import {
  Animated,
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

import BACKEND_URL from "../../config";

export default function AdminLogin() {
  const router = useRouter();

  // ✅ Fixed admin number
  const ADMIN_PHONE = "7259201729";

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState({ mobile: false, otp: false });
  const [isLoading, setIsLoading] = useState(false);

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
    ADDED:
    Drives the top navbar's shrink-on-scroll. Tracks how far the
    ScrollView has scrolled, then navbarScale/navbarTranslateY below
    interpolate that into a transform (not padding/fontSize, which
    can't run on the native thread) so the whole pill smoothly
    shrinks as you scroll down and springs back to full size once
    you're back at the top - native-driven, so it stays smooth on
    both iOS and Android instead of stepping/jumping.
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
    ADDED:
    Holds the currently-running spinner loop so it can be
    stopped/reset cleanly. Fixes: progressAnim was driven with a
    single one-shot Animated.timing to 1 in BOTH sendOtp and
    verifyOtp (they share the same value) - so it only ever
    rotated once, then sat frozen at 1 for every attempt after
    that, including the very next step's spinner (Step 1's
    success doesn't navigate away, so this carried straight into
    Step 2). Now it's a continuous loop, reset to 0 and restarted
    on every attempt in both functions.
  */
  const spinLoopRef = useRef<any>(null);

  const stopSpinner = () => {
    if (spinLoopRef.current) {
      spinLoopRef.current.stop();
      spinLoopRef.current = null;
    }
    progressAnim.setValue(0);
  };

  const startSpinner = () => {
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
  };

  /*
    FIX: same class of bug already fixed on the Member and Employee
    login screens.

    1. Network timeout + retry: a plain fetch() with no timeout means
       any brief connection hiccup (weak signal, momentary drop) either
       hangs until the OS gives up or throws once straight into the
       generic catch block below - showing "Server connection error" /
       "Server error" even though the mobile number / OTP and backend
       were fine. This wraps ONLY the network call with a timeout + a
       couple of automatic retries, and retries ONLY on network-level
       failures - never once a real response comes back from the
       server, so an actual "invalid OTP" rejection still shows
       immediately and is never resubmitted.
    2. Double-submit guard (added at the top of sendOtp/verifyOtp
       below): disabled={isLoading} on each button only takes effect
       after a React re-render, so a fast double-tap could slip a
       SECOND request through before that re-render lands. Two
       concurrent /admin/send-otp or /admin/verify-otp calls can race
       each other or trigger duplicate OTPs - stopped at the source.
  */
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
          `Admin login: network issue on attempt ${attempt} (${err?.message || err?.name}), retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
        return fetchWithRetry(url, options, attempt + 1);
      }

      throw err;
    }
  };

  // Auto-hide message after 3-4 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage("");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [message]);

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
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Floating animation for background elements
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

    // Pulse animation for logo
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

  const sendOtp = async () => {
    // Hard guard against double-submit (see FIX comment above
    // fetchWithRetry): a fast double-tap can slip a second request
    // through before disabled={isLoading} takes effect.
    if (isLoading) return;

    if (!mobile) {
      shakeAnimation();
      setMessage("Enter mobile number");
      return;
    }

    if (mobile !== ADMIN_PHONE) {
      shakeAnimation();
      setMessage("Invalid admin mobile number");
      return;
    }

    setIsLoading(true);
    startSpinner();

    try {
      const response = await fetchWithRetry(`${BACKEND_URL}/admin/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile: `+91${mobile}` }),
      });

      const data = await response.json();

      if (!response.ok) {
        stopSpinner();
        setIsLoading(false);
        setMessage(data.message || "Failed to send OTP");
        return;
      }

      stopSpinner();
      setIsLoading(false);
      setMessage("OTP sent to WhatsApp ✅");

      setStep(2);

    } catch (error) {
      console.log(error);
      stopSpinner();
      setIsLoading(false);
      setMessage("Server connection error");
    }
  };

  const verifyOtp = async () => {
    // Same double-submit guard as sendOtp above.
    if (isLoading) return;

    if (!otp) {
      shakeAnimation();
      setMessage("Enter OTP");
      return;
    }

    setIsLoading(true);
    startSpinner();

    try {
      const response = await fetchWithRetry(`${BACKEND_URL}/admin/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mobile, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        stopSpinner();
        setIsLoading(false);
        setMessage(data.message || "OTP verification failed");
        return;
      }

      stopSpinner();
      setIsLoading(false);
      setMessage("Login Successful! 🎉");
      // Mark this device as an admin session. Screens that block
      // screen capture check this flag and stay unblocked while it
      // is set, so only an admin can take screenshots of the app.
      await AsyncStorage.setItem("adminSession", "true");

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

      setTimeout(() => {
        router.replace("/admin");
      }, 800);
    } catch (error) {
      console.log(error);
      stopSpinner();
      setIsLoading(false);
      setMessage("Server error");
    }
  };

  const dialSupport = () => {
    Linking.openURL("tel:+917259201729");
  };

  const shakeAnimation = () => {
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
  };

  const logoSize = isDesktopOrLaptop
    ? Math.min(width * 0.2, 280)
    : width * 0.5;

  // Floating background circles
  const float1 = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });
  const float2 = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  // Helper to strip non‑digit characters
  const filterDigits = (text: string) => text.replace(/[^0-9]/g, '');

  /* ================= TRANSPARENT / GLASS SURFACES ================= */
  // Shared "glass" surfaces so iOS and Android render identically.
  const glassInput = (focused: boolean) => ({
    backgroundColor: focused
      ? 'rgba(255,255,255,0.45)'
      : 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: focused
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

          {/* ================= TOP NAV BAR — Admin / Employee / Member =================
              Pinned above the scroll area so it stays put as a real navbar.
              Replaces the old hamburger + popup: the other two portals are
              one tap away, the current one just reads as selected.
              Transparent glass style to match the rest of the screen. */}
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
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 16, backgroundColor: '#024e32' }}>
                <MaterialIcons name="admin-panel-settings" size={16} color="#fff" />
                <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#fff' }}>Admin</Text>
              </View>
              <TouchableOpacity
                onPress={() => router.replace("/employee/login")}
                activeOpacity={0.7}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 16 }}
              >
                <MaterialIcons name="badge" size={16} color="#475569" />
                <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#475569' }}>Employee</Text>
              </TouchableOpacity>
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
                  Admin Portal
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
                  Secure admin access with OTP verification
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
                      <MaterialIcons name="shield" size={24} color="#024e32" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>Admin</Text>
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
                      Admin Login
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
                        Admin Access
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
                        Sign in with your registered mobile number
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
                      Secure OTP verification for admin access
                    </Animatable.Text>
                  )}
                </View>

                {/* Form */}
                <View>
                  {/* Step indicator */}
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
                    <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: step === 1 ? '#024e32' : 'rgba(255,255,255,0.35)',
                        borderWidth: 1,
                        borderColor: step === 1 ? '#024e32' : 'rgba(255,255,255,0.6)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ color: step === 1 ? 'white' : '#475569', fontWeight: '700' }}>1</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Mobile</Text>
                    </View>
                    <View style={{ flex: 1, height: 2, backgroundColor: step === 2 ? '#024e32' : 'rgba(255,255,255,0.5)', alignSelf: 'center', maxWidth: 40 }} />
                    <View style={{ alignItems: 'center', marginHorizontal: 16 }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: step === 2 ? '#024e32' : 'rgba(255,255,255,0.35)',
                        borderWidth: 1,
                        borderColor: step === 2 ? '#024e32' : 'rgba(255,255,255,0.6)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ color: step === 2 ? 'white' : '#475569', fontWeight: '700' }}>2</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>OTP</Text>
                    </View>
                  </View>

                  {/* STEP 1 - MOBILE */}
                  {step === 1 && (
                    <Animatable.View animation="fadeIn" duration={300}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: 8,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}>
                        Mobile Number
                      </Text>
                      <Animated.View style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                          marginBottom: 20,
                        },
                        glassInput(isFocused.mobile),
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
                          name="phone"
                          size={22}
                          color={isFocused.mobile ? '#024e32' : '#64748b'}
                        />
                        <TextInput
                          placeholder="Enter mobile number"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          maxLength={10}
                          style={{
                            flex: 1,
                            marginLeft: 12,
                            fontSize: 16,
                            color: '#1e293b',
                            padding: 0,
                            backgroundColor: 'transparent',
                          }}
                          value={mobile}
                          onChangeText={(text) => setMobile(filterDigits(text))}
                          onFocus={() => setIsFocused({ ...isFocused, mobile: true })}
                          onBlur={() => setIsFocused({ ...isFocused, mobile: false })}
                        />
                        {mobile.length > 0 && (
                          <TouchableOpacity onPress={() => setMobile('')}>
                            <Ionicons name="close-circle" size={20} color="#64748b" />
                          </TouchableOpacity>
                        )}
                      </Animated.View>

                      <TouchableOpacity
                        onPress={sendOtp}
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
                                Sending OTP...
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
                                Send OTP
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
                  )}

                  {/* STEP 2 - OTP */}
                  {step === 2 && (
                    <Animatable.View animation="fadeIn" duration={300}>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: 8,
                        letterSpacing: 0.5,
                        textTransform: 'uppercase',
                      }}>
                        Enter OTP
                      </Text>
                      <Text style={{
                        fontSize: 14,
                        color: '#64748b',
                        marginBottom: 16,
                      }}>
                        OTP sent to {mobile}
                      </Text>
                      <Animated.View style={[
                        {
                          flexDirection: 'row',
                          alignItems: 'center',
                          borderRadius: 16,
                          paddingHorizontal: 16,
                          paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                          marginBottom: 20,
                        },
                        glassInput(isFocused.otp),
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
                          name="lock-outline"
                          size={22}
                          color={isFocused.otp ? '#024e32' : '#64748b'}
                        />
                        <TextInput
                          placeholder="Enter OTP"
                          placeholderTextColor="#64748b"
                          keyboardType="numeric"
                          maxLength={6}
                          style={{
                            flex: 1,
                            marginLeft: 12,
                            fontSize: 16,
                            color: '#1e293b',
                            padding: 0,
                            letterSpacing: 4,
                            backgroundColor: 'transparent',
                          }}
                          value={otp}
                          onChangeText={(text) => setOtp(filterDigits(text))}
                          onFocus={() => setIsFocused({ ...isFocused, otp: true })}
                          onBlur={() => setIsFocused({ ...isFocused, otp: false })}
                        />
                        {otp.length > 0 && (
                          <TouchableOpacity onPress={() => setOtp('')}>
                            <Ionicons name="close-circle" size={20} color="#64748b" />
                          </TouchableOpacity>
                        )}
                      </Animated.View>

                      <TouchableOpacity
                        onPress={verifyOtp}
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
                                Verifying...
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
                                Verify OTP
                              </Text>
                              <Animatable.View
                                animation="pulse"
                                easing="ease-out"
                                iterationCount="infinite"
                                style={{ marginLeft: 12 }}
                              >
                                <MaterialIcons name="check-circle" size={24} color="white" />
                              </Animatable.View>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setStep(1);
                          setOtp('');
                        }}
                        style={{ marginTop: 16 }}
                      >
                        <Text style={{
                          color: '#024e32',
                          textAlign: 'center',
                          fontWeight: '600',
                        }}>
                          ← Back to mobile number
                        </Text>
                      </TouchableOpacity>
                    </Animatable.View>
                  )}

                  {/* Message */}
                  {message ? (
                    <Animatable.View
                      animation={message.includes("Successful") || message.includes("sent") ? "bounceIn" : "shake"}
                      duration={600}
                      style={{
                        marginTop: 20,
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: message.includes("Successful") || message.includes("sent")
                          ? 'rgba(220, 252, 231, 0.55)'
                          : 'rgba(254, 226, 226, 0.55)',
                        borderWidth: 1,
                        borderColor: message.includes("Successful") || message.includes("sent")
                          ? 'rgba(134, 239, 172, 0.9)'
                          : 'rgba(252, 165, 165, 0.9)',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcons
                        name={message.includes("Successful") || message.includes("sent") ? "check-circle" : "error-outline"}
                        size={20}
                        color={message.includes("Successful") || message.includes("sent") ? '#16a34a' : '#dc2626'}
                      />
                      <Text style={{
                        flex: 1,
                        marginLeft: 10,
                        color: message.includes("Successful") || message.includes("sent") ? '#15803d' : '#b91c1c',
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                        {message}
                      </Text>
                    </Animatable.View>
                  ) : null}

                  {/* Footer */}
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
                        Need help?
                      </Text>
                    </TouchableOpacity>
                    <View style={{ width: 1, height: 20, backgroundColor: 'rgba(2,78,50,0.15)' }} />
                    <TouchableOpacity onPress={dialSupport}>
                      <Text style={{
                        color: '#024e32',
                        fontSize: 14,
                        fontWeight: '600',
                      }}>
                        Contact Support
                      </Text>
                    </TouchableOpacity>
                  </Animatable.View>

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
                        © 2026 Admin Portal. All rights reserved.
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
                    © 2026 Admin Portal. All rights reserved.
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