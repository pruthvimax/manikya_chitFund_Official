import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect } from "react";

import {
  BackHandler,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function Reference() {
  const router = useRouter();

  /* ================= EMPLOYEE SESSION GUARD ================= */

  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("employee");

      if (!stored) {
        console.log("No employee session → redirecting to login");
        router.replace("/employee/login");
        return;
      }
    };

    checkSession();

    // 🔒 BACK BUTTON CONTROL FOR CHILD PAGE
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/employee");
        return true;
      }
    );

    return () => {
      backHandler.remove();
    };
  }, []);

  /* ================= UPCOMING FEATURES ================= */

  const upcomingFeatures = [
    {
      title: "Referral Program",
      description:
        "Earn rewards by referring friends and family to join our chit fund.",
      icon: "group-add",
      status: "Coming Soon",
    },
    {
      title: "Digital Receipts",
      description:
        "Get instant digital receipts for all your payments.",
      icon: "receipt",
      status: "In Development",
    },
    {
      title: "Auto Payment Reminders",
      description:
        "Smart reminders for upcoming installment dates.",
      icon: "notifications-active",
      status: "Planned",
    },
    {
      title: "Investment Analytics",
      description:
        "Detailed analytics of your chit investments and returns.",
      icon: "analytics",
      status: "Coming Soon",
    },
    {
      title: "Mobile Wallet Integration",
      description:
        "Pay using UPI, Google Pay, PhonePe and other wallets.",
      icon: "account-balance-wallet",
      status: "In Development",
    },
    {
      title: "Chat Support",
      description:
        "24/7 chat support with customer service representatives.",
      icon: "chat",
      status: "Planned",
    },
    {
      title: "Document Vault",
      description:
        "Secure digital storage for your chit documents.",
      icon: "folder",
      status: "Coming Soon",
    },
    {
      title: "Family Accounts",
      description:
        "Manage multiple family member accounts in one place.",
      icon: "family-restroom",
      status: "Planned",
    },
  ];

  /* ================= REFERRAL BENEFITS ================= */

  const referralBenefits = [
    {
      benefit: "Referral Bonus",
      details: "Get ₹200 for each successful referral",
      icon: "monetization-on",
    },
    {
      benefit: "Extra Discount",
      details:
        "5% discount on first installment for referrals",
      icon: "discount",
    },
    {
      benefit: "Priority Support",
      details:
        "Priority customer support for active referrers",
      icon: "priority-high",
    },
    {
      benefit: "Loyalty Points",
      details:
        "Earn loyalty points for every successful referral",
      icon: "loyalty",
    },
  ];

  /* ================= HOW TO REFER ================= */

  const howToRefer = [
    "Share your unique referral code with friends",
    "They must use your code during registration",
    "Once they complete their first payment",
    "You'll receive your referral bonus instantly",
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#f9fafb]">

      {/* =====================================================
          HEADER
          EXACT SAME STRUCTURE AS EMPLOYEE DASHBOARD
      ===================================================== */}

      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">

        <View className="flex-row items-center">

          <TouchableOpacity
            onPress={() => router.replace("/employee")}
            className="mt-1"
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="white"
            />
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Features & Reference
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
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* =====================================================
            INTRODUCTION CARD
        ===================================================== */}

        <View style={styles.section}>

          <View style={styles.introCard}>

            <View style={styles.introHeader}>

              <MaterialIcons
                name="rocket-launch"
                size={40}
                color="#024e32"
              />

              <Text style={styles.introTitle}>
                Exciting Features Coming Soon!
              </Text>

            </View>

            <Text style={styles.introText}>
              We're constantly working to improve your
              experience. Here's a preview of features we're
              developing for future updates.
            </Text>

          </View>

        </View>

        {/* =====================================================
            REFERRAL PROGRAM
        ===================================================== */}

        <View style={styles.section}>

          <Text style={styles.sectionHeader}>
            Referral Program
          </Text>

          <View style={styles.card}>

            <View style={styles.cardHeader}>

              <MaterialIcons
                name="share"
                size={24}
                color="#024e32"
              />

              <Text style={styles.cardTitle}>
                Invite & Earn
              </Text>

            </View>

            <View style={styles.benefitsList}>

              {referralBenefits.map((item, index) => (

                <View
                  key={index}
                  style={styles.benefitItem}
                >

                  <View style={styles.benefitIcon}>

                    <MaterialIcons
                      name={item.icon}
                      size={22}
                      color="#024e32"
                    />

                  </View>

                  <View style={styles.benefitText}>

                    <Text style={styles.benefitTitle}>
                      {item.benefit}
                    </Text>

                    <Text style={styles.benefitDesc}>
                      {item.details}
                    </Text>

                  </View>

                </View>

              ))}

            </View>

            {/* HOW IT WORKS */}

            <View style={styles.howToSection}>

              <Text style={styles.howToTitle}>
                How it works:
              </Text>

              {howToRefer.map((step, index) => (

                <View
                  key={index}
                  style={styles.stepItem}
                >

                  <View style={styles.stepNumber}>

                    <Text style={styles.stepNumberText}>
                      {index + 1}
                    </Text>

                  </View>

                  <Text style={styles.stepText}>
                    {step}
                  </Text>

                </View>

              ))}

            </View>

            {/* AVAILABILITY */}

            <View style={styles.availabilityBadge}>

              <MaterialIcons
                name="schedule"
                size={18}
                color="#f59e0b"
              />

              <Text style={styles.availabilityText}>
                Launching in Next Update
              </Text>

            </View>

          </View>

        </View>

        {/* =====================================================
            UPCOMING FEATURES
        ===================================================== */}

        <View style={styles.section}>

          <Text style={styles.sectionHeader}>
            Upcoming Features
          </Text>

          {upcomingFeatures.map((feature, index) => (

            <View
              key={index}
              style={styles.featureCard}
            >

              <View style={styles.featureHeader}>

                <View style={styles.featureIconContainer}>

                  <MaterialIcons
                    name={feature.icon}
                    size={24}
                    color="#024e32"
                  />

                </View>

                <View style={styles.featureTitleContainer}>

                  <Text style={styles.featureTitle}>
                    {feature.title}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,

                      feature.status === "Coming Soon"
                        ? styles.comingSoon
                        : feature.status ===
                          "In Development"
                        ? styles.inDevelopment
                        : styles.planned,
                    ]}
                  >

                    <Text style={styles.statusText}>
                      {feature.status}
                    </Text>

                  </View>

                </View>

              </View>

              <Text style={styles.featureDescription}>
                {feature.description}
              </Text>

            </View>

          ))}

        </View>

        {/* =====================================================
            CURRENT VERSION
        ===================================================== */}

        <View style={styles.section}>

          <View style={styles.versionCard}>

            <Text style={styles.versionTitle}>
              Current Version
            </Text>

            <Text style={styles.versionNumber}>
              V1.0.5
            </Text>

            <Text style={styles.versionInfo}>
              Stable Release - December 2024
            </Text>

            <View style={styles.updateInfo}>

              <MaterialIcons
                name="info"
                size={18}
                color="#6b7280"
              />

              <Text style={styles.updateText}>
                Next major update planned for Q1 2025
              </Text>

            </View>

          </View>

        </View>

        {/* =====================================================
            FEEDBACK
        ===================================================== */}

        <View style={styles.section}>

          <View style={styles.feedbackCard}>

            <MaterialIcons
              name="feedback"
              size={32}
              color="#024e32"
            />

            <Text style={styles.feedbackTitle}>
              Have Suggestions?
            </Text>

            <Text style={styles.feedbackText}>
              We'd love to hear your feedback and feature
              requests for future updates.
            </Text>

            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() =>
                router.push("/employee/contact")
              }
            >

              <Text style={styles.feedbackButtonText}>
                Share Your Ideas
              </Text>

            </TouchableOpacity>

          </View>

        </View>

        {/* =====================================================
            FOOTER
        ===================================================== */}

        <View className="px-5 mt-8 mb-6">

          <View
            className="border-t border-gray-200 pt-4 items-center"
          >

            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>

            <Text className="text-gray-500 text-xs mt-1 text-center">
              Employee Reference
            </Text>

            <Text className="text-gray-400 text-xs mt-1 text-center">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
              All rights reserved.
            </Text>

          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({

  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },

  introCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  introHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  introTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginLeft: 12,
    flex: 1,
  },

  introText: {
    color: "#6b7280",
    fontSize: 15,
    lineHeight: 22,
  },

  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 15,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginLeft: 12,
  },

  benefitsList: {
    marginBottom: 25,
  },

  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(2, 78, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  benefitText: {
    flex: 1,
  },

  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },

  benefitDesc: {
    fontSize: 14,
    color: "#6b7280",
  },

  howToSection: {
    marginBottom: 20,
  },

  howToTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },

  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },

  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#024e32",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },

  stepNumberText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },

  stepText: {
    flex: 1,
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },

  availabilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef3c7",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "flex-start",
  },

  availabilityText: {
    color: "#92400e",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },

  featureCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },

  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(2, 78, 50, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  featureTitleContainer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  comingSoon: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },

  inDevelopment: {
    backgroundColor: "rgba(59, 130, 246, 0.1)",
  },

  planned: {
    backgroundColor: "rgba(168, 85, 247, 0.1)",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  featureDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },

  versionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  versionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },

  versionNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#024e32",
    marginBottom: 4,
  },

  versionInfo: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },

  updateInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 12,
  },

  updateText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 10,
    flex: 1,
  },

  feedbackCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  feedbackTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },

  feedbackText: {
    fontSize: 15,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },

  feedbackButton: {
    backgroundColor: "#024e32",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },

  feedbackButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});