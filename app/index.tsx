import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import * as Animatable from 'react-native-animatable';

import BACKEND_URL from "../config";

export default function LoginScreen() {
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [isFocused, setIsFocused] = useState({ userid: false, password: false });
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
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

  /* ================= BACK BUTTON LOCK ================= */
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);

  /* ================= AUTO MESSAGE DISMISS ================= */
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
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
        easing: Easing.out(Easing.back(1.8)),
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

  /* ================= LOGIN HANDLER ================= */
  const handleLogin = async () => {
    setMessage("");

    if (!userid || !password) {
      shakeAnimation();
      setMessage("Please enter UserID and Password");
      return;
    }

    setIsLoading(true);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    try {
      const url = `${BACKEND_URL}/members/login`;

      console.log("LOGIN URL:", url);

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userid, password }),
      });

      const text = await response.text();
      console.log("RAW RESPONSE:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        setIsLoading(false);
        setMessage("Server returned invalid response");
        return;
      }

      if (!response.ok) {
        setIsLoading(false);
        setMessage(data.message || "Login failed");
        return;
      }

      // Save user session
      await AsyncStorage.setItem(
        "loggedUser",
        JSON.stringify({
          userid: data.member.userid,
          username: data.member.username,
        })
      );

      console.log("✅ LOGIN SUCCESS:", data.member.userid);

      setMessage("Login Successful! 🎉");

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

      // Redirect to Menu
      setTimeout(() => {
        router.replace("/menu");
      }, 800);
    } catch (error) {
      console.log("LOGIN ERROR:", error);
      setIsLoading(false);
      setMessage("Unable to connect to server");
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

  /* ================= LOGO SIZE ================= */
  const logoSize = isDesktopOrLaptop
    ? Math.min(width * 0.2, 280)
    : width * 0.5;

  const menuTopPosition =
    Platform.OS === "ios"
      ? (StatusBar.currentHeight || 20) + 10
      : (StatusBar.currentHeight || 0) + 10;

  // Floating background circles
  const float1 = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });
  const float2 = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#f0f4f8" />
        
        {/* Background decorative elements */}
        <Animated.View style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: 'rgba(2, 78, 50, 0.05)',
          transform: [{ translateY: float1 }],
        }} />
        <Animated.View style={{
          position: 'absolute',
          bottom: -100,
          left: -100,
          width: 350,
          height: 350,
          borderRadius: 175,
          backgroundColor: 'rgba(2, 78, 50, 0.03)',
          transform: [{ translateY: float2 }],
        }} />
        <Animated.View style={{
          position: 'absolute',
          top: '40%',
          left: -50,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: 'rgba(3, 105, 161, 0.03)',
          transform: [{ translateY: float1 }],
        }} />

        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
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
            
            {/* ================= HAMBURGER MENU ================= */}
            <Animatable.View
              animation="fadeInDown"
              duration={600}
              delay={200}
              style={{
                position: "absolute",
                top: menuTopPosition,
                left: isDesktopOrLaptop ? 40 : 20,
                zIndex: 20,
              }}
            >
              <TouchableOpacity
                style={{
                  padding: 12,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                  elevation: 5,
                }}
                onPress={() => setMenuVisible(true)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="menu"
                  size={isDesktopOrLaptop ? 32 : 28}
                  color="#024e32"
                />
              </TouchableOpacity>
            </Animatable.View>

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
                  backgroundColor: 'white',
                  borderRadius: 40,
                  padding: 40,
                  shadowColor: '#024e32',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.08,
                  shadowRadius: 40,
                  elevation: 12,
                  transform: [{ scale: pulseAnim }],
                }}>
                  <Image
                    source={require("../assets/images/manikyaChits.png")}
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
                  MANIKYA CHITS
                </Animatable.Text>
                
                <Animatable.Text
                  animation="fadeInUp"
                  duration={800}
                  delay={600}
                  style={{
                    fontSize: 16,
                    color: '#64748b',
                    marginTop: 12,
                    letterSpacing: 1,
                    textAlign: 'center',
                  }}
                >
                  Secure member access with credentials
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
                      backgroundColor: 'rgba(2, 78, 50, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="security" size={24} color="#024e32" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Secure</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: 'rgba(2, 78, 50, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="verified-user" size={24} color="#024e32" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Verified</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: 'rgba(2, 78, 50, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <MaterialIcons name="account-circle" size={24} color="#024e32" />
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Member</Text>
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
                      source={require("../assets/images/manikyaChits.png")}
                      style={{
                        width: logoSize,
                        height: logoSize,
                      }}
                      resizeMode="contain"
                    />
                  </Animated.View>
                </Animatable.View>
              )}

              {/* Login Card */}
              <Animated.View style={{
                backgroundColor: 'white',
                borderRadius: 32,
                padding: isDesktopOrLaptop ? 40 : 32,
                shadowColor: '#024e32',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.06,
                shadowRadius: 40,
                elevation: 15,
                borderWidth: 1,
                borderColor: 'rgba(2, 78, 50, 0.06)',
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
                      Member Login
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
                          color: '#94a3b8',
                          textAlign: 'center',
                          marginTop: 8,
                          letterSpacing: 0.5,
                        }}
                      >
                        Sign in to your member account
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
                        color: '#94a3b8',
                        textAlign: 'center',
                        marginTop: 4,
                      }}
                    >
                      Secure access for registered members
                    </Animatable.Text>
                  )}
                </View>

                {/* Form */}
                <View>
                  {/* User ID */}
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
                      User ID
                    </Text>
                    <Animated.View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isFocused.userid ? '#024e32' : '#e2e8f0',
                      paddingHorizontal: 16,
                      paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                      transform: [
                        {
                          rotate: rotateAnim.interpolate({
                            inputRange: [-0.08, 0.08],
                            outputRange: ['-4deg', '4deg'],
                          })
                        }
                      ],
                    }}>
                      <MaterialIcons
                        name="person"
                        size={22}
                        color={isFocused.userid ? '#024e32' : '#94a3b8'}
                      />
                      <TextInput
                        placeholder="Enter User ID"
                        placeholderTextColor="#94a3b8"
                        style={{
                          flex: 1,
                          marginLeft: 12,
                          fontSize: 16,
                          color: '#1e293b',
                          padding: 0,
                        }}
                        value={userid}
                        onChangeText={setUserid}
                        onFocus={() => setIsFocused({ ...isFocused, userid: true })}
                        onBlur={() => setIsFocused({ ...isFocused, userid: false })}
                        autoCapitalize="none"
                      />
                      {userid.length > 0 && (
                        <TouchableOpacity onPress={() => setUserid('')}>
                          <Ionicons name="close-circle" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  </Animatable.View>

                  {/* Password */}
                  <Animatable.View
                    animation="fadeInUp"
                    duration={600}
                    delay={isDesktopOrLaptop ? 900 : 700}
                    style={{ marginBottom: 16 }}
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
                    <Animated.View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: 16,
                      borderWidth: 2,
                      borderColor: isFocused.password ? '#024e32' : '#e2e8f0',
                      paddingHorizontal: 16,
                      paddingVertical: Platform.OS === 'ios' ? 16 : 12,
                    }}>
                      <MaterialIcons
                        name="lock-outline"
                        size={22}
                        color={isFocused.password ? '#024e32' : '#94a3b8'}
                      />
                      <TextInput
                        placeholder="Enter Password"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry={!showPassword}
                        style={{
                          flex: 1,
                          marginLeft: 12,
                          fontSize: 16,
                          color: '#1e293b',
                          padding: 0,
                        }}
                        value={password}
                        onChangeText={setPassword}
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
                          color="#94a3b8"
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  </Animatable.View>

                  {/* New User Register */}
                  <Animatable.View
                    animation="fadeInUp"
                    duration={600}
                    delay={isDesktopOrLaptop ? 950 : 750}
                    style={{ marginBottom: 24 }}
                  >
                    <TouchableOpacity
                      onPress={() => router.push("/new-user")}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      <Text style={{
                        color: '#024e32',
                        fontWeight: '600',
                        fontSize: 14,
                      }}>
                        New Member? Register →
                      </Text>
                    </TouchableOpacity>
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
                        shadowColor: '#024e32',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.2,
                        shadowRadius: 16,
                        elevation: 6,
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
                              Logging in...
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
                              Login
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

                  {/* Message */}
                  {message ? (
                    <Animatable.View
                      animation={message.includes("Successful") ? "bounceIn" : "shake"}
                      duration={600}
                      style={{
                        marginTop: 20,
                        padding: 14,
                        borderRadius: 14,
                        backgroundColor: message.includes("Successful")
                          ? '#dcfce7'
                          : '#fee2e2',
                        borderWidth: 1,
                        borderColor: message.includes("Successful")
                          ? '#86efac'
                          : '#fca5a5',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <MaterialIcons
                        name={message.includes("Successful") ? "check-circle" : "error-outline"}
                        size={20}
                        color={message.includes("Successful") ? '#16a34a' : '#dc2626'}
                      />
                      <Text style={{
                        flex: 1,
                        marginLeft: 10,
                        color: message.includes("Successful") ? '#16a34a' : '#dc2626',
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
                        color: '#94a3b8',
                        fontSize: 14,
                        fontWeight: '500',
                      }}>
                        Need help?
                      </Text>
                    </TouchableOpacity>
                    <View style={{ width: 1, height: 20, backgroundColor: '#e2e8f0' }} />
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
                        borderTopColor: '#f1f5f9',
                      }}
                    >
                      <Text style={{
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: 12,
                      }}>
                        © 2026 Manikya Chits. All rights reserved.
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
                    color: '#94a3b8',
                    fontSize: 12,
                  }}>
                    © 2026 Manikya Chits. All rights reserved.
                  </Text>
                </Animatable.View>
              )}
            </Animatable.View>
          </Animated.View>
        </ScrollView>

        {/* ================= IMPROVED POPUP MENU WITH SELECTION ================= */}
        <Modal visible={menuVisible} transparent animationType="fade">
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => setMenuVisible(false)}
          >
            <Animatable.View
              animation="bounceIn"
              duration={400}
              style={{
                backgroundColor: 'white',
                borderRadius: 28,
                padding: isDesktopOrLaptop ? 40 : 32,
                width: isDesktopOrLaptop ? 420 : 340,
                maxWidth: '90%',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.15,
                shadowRadius: 40,
                elevation: 20,
              }}
            >
              {/* Header with icon */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(2, 78, 50, 0.1)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}>
                  <MaterialIcons name="login" size={32} color="#024e32" />
                </View>
                <Text style={{
                  fontSize: 22,
                  fontWeight: '800',
                  color: '#024e32',
                  letterSpacing: 0.5,
                }}>
                  Select Login Type
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#94a3b8',
                  marginTop: 4,
                }}>
                  Choose your portal to continue
                </Text>
              </View>

              {/* Menu Items */}
              <View style={{ gap: 12 }}>
               

                {/* Admin Login */}
                <TouchableOpacity
                  onPress={() => {
                    setMenuVisible(false);
                    setTimeout(() => {
                      Animated.sequence([
                        Animated.timing(scaleAnim, {
                          toValue: 0.9,
                          duration: 200,
                          useNativeDriver: true,
                        }),
                        Animated.timing(scaleAnim, {
                          toValue: 1,
                          duration: 200,
                          useNativeDriver: true,
                        }),
                      ]).start();
                      router.replace("/admin/login");
                    }, 300);
                  }}
                  style={{
                    backgroundColor: '#f8fafc',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(2, 78, 50, 0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="admin-panel-settings" size={24} color="#024e32" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={{
                      color: '#1e293b',
                      fontSize: 17,
                      fontWeight: '600',
                    }}>
                      Admin Login
                    </Text>
                    <Text style={{
                      color: '#94a3b8',
                      fontSize: 12,
                    }}>
                      Switch to admin portal
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-forward-ios" size={20} color="#94a3b8" />
                </TouchableOpacity>

                {/* Employee Login */}
                <TouchableOpacity
                  onPress={() => {
                    setMenuVisible(false);
                    setTimeout(() => {
                      Animated.sequence([
                        Animated.timing(scaleAnim, {
                          toValue: 0.9,
                          duration: 200,
                          useNativeDriver: true,
                        }),
                        Animated.timing(scaleAnim, {
                          toValue: 1,
                          duration: 200,
                          useNativeDriver: true,
                        }),
                      ]).start();
                      router.replace("/employee/login");
                    }, 300);
                  }}
                  style={{
                    backgroundColor: '#f8fafc',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(198, 73, 0, 0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="badge" size={24} color="#c64900" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={{
                      color: '#1e293b',
                      fontSize: 17,
                      fontWeight: '600',
                    }}>
                      Employee Login
                    </Text>
                    <Text style={{
                      color: '#94a3b8',
                      fontSize: 12,
                    }}>
                      Switch to employee portal
                    </Text>
                  </View>
                  <MaterialIcons name="arrow-forward-ios" size={20} color="#94a3b8" />
                </TouchableOpacity>

                 {/* Member Login - Active/Current */}
                <TouchableOpacity
                  style={{
                    backgroundColor: '#024e32',
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    borderRadius: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#024e32',
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <MaterialIcons name="person" size={24} color="white" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={{
                      color: 'white',
                      fontSize: 17,
                      fontWeight: '700',
                    }}>
                      Member Login
                    </Text>
                    <Text style={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: 12,
                    }}>
                      Currently selected
                    </Text>
                  </View>
                  <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#4ade80',
                  }} />
                </TouchableOpacity>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                style={{
                  marginTop: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: '#f1f5f9',
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: 15,
                  fontWeight: '600',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </Animatable.View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}