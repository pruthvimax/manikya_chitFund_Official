import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config";

export default function NewUserScreen() {
  const router = useRouter();
  const [showRegistration, setShowRegistration] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Registration form state
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [address, setAddress] = useState("");

  /* ================= SESSION GUARD ================= */
  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("loggedUser");
      if (stored) {
        router.replace("/menu");
      }
    };
    checkSession();
  }, []);

  const openWhatsApp = () =>
    Linking.openURL("https://wa.me/917259201729?text=Hello%20Manikya%20Chits!%20I%20want%20to%20become%20a%20member.");
  const dialNumber = () => Linking.openURL("tel:+917259201729");
  const sendEmail = () =>
    Linking.openURL("mailto:manikyachitsprivatelimited@gmail.com");

  /* ================= REGISTRATION HANDLER ================= */
const handleRegistration = async () => {
  if (!fullName || !phoneNumber || !aadhaarNumber) {
    Alert.alert(
      "Required Fields",
      "Please fill in all required fields (Name, Phone, Aadhaar)"
    );
    return;
  }

  if (phoneNumber.length !== 10) {
    Alert.alert("Invalid Phone", "Please enter a valid 10-digit phone number");
    return;
  }

  if (aadhaarNumber.length !== 12) {
    Alert.alert(
      "Invalid Aadhaar",
      "Please enter a valid 12-digit Aadhaar number"
    );
    return;
  }

  setIsLoading(true);

  try {
    const response = await fetch(
      `${BACKEND_URL}/member-interest/register-interest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          phoneNumber,
          email,
          aadhaarNumber,
          address,
        }),
      }
    );

    // ✅ Read response as TEXT first (prevents JSON crash)
    const rawText = await response.text();
    console.log("🔥 RAW RESPONSE:", rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (err) {
      Alert.alert(
        "Server Error",
        "Backend is not returning JSON.\nCheck API route or server restart."
      );
      return;
    }

    // ✅ If backend sends error
    if (!response.ok) {
      Alert.alert("Registration Failed", data.message || "Something went wrong");
      return;
    }

    Alert.alert(
      "Registration Successful!",
      "Thank you for your interest in Manikya Chits.\nOur team will contact you soon.",
      [
        {
          text: "OK",
          onPress: () => {
            setShowRegistration(false);
            resetForm();
          },
        },
      ]
    );
  } catch (error) {
    console.log("Registration error:", error);
    Alert.alert("Network Error", "Unable to connect to server.");
  } finally {
    setIsLoading(false);
  }
};


  const resetForm = () => {
    setFullName("");
    setPhoneNumber("");
    setEmail("");
    setAadhaarNumber("");
    setAddress("");
  };

  const features = [
    "High Returns on Investment",
    "Flexible Payment Options",
    "Monthly Dividend Payouts",
    "Secure & Transparent Operations",
    "Regular Auctions",
    "Professional Management",
    "24/7 Customer Support",
    "Online Payment Facilities"
  ];

  const membershipSteps = [
    {
      step: 1,
      title: "Express Interest",
      description: "Fill our membership interest form or contact us directly",
      icon: "assignment"
    },
    {
      step: 2,
      title: "Document Verification",
      description: "Submit KYC documents (Aadhaar, PAN, Address Proof)",
      icon: "verified"
    },
    {
      step: 3,
      title: "Nominee & Income Details",
      description: "Provide nominee details and monthly income information",
      icon: "person-add"
    },
    {
      step: 4,
      title: "Group Selection",
      description: "Choose a chit group based on your investment capacity",
      icon: "groups"
    },
    {
      step: 5,
      title: "Agreement Signing",
      description: "Sign the chit fund agreement with terms & conditions",
      icon: "description"
    },
    {
      step: 6,
      title: "First Installment",
      description: "Pay first installment and start your chit journey",
      icon: "payments"
    },
    {
      step: 7,
      title: "Active Membership",
      description: "Participate in auctions and receive dividends",
      icon: "emoji-events"
    }
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* PERMANENT HEADER - ALWAYS VISIBLE */}
      <View style={styles.mainHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            JOIN MANIKYA CHITS
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          {/* HERO SECTION - SIMPLE STYLE */}
          <View style={styles.heroSection}>
            <Text style={styles.heroTitle}>Welcome to Manikya Chits</Text>
            <Text style={styles.heroSubtitle}>Your Trusted Partner in Financial Growth Since 2022</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>2+</Text>
                <Text style={styles.statLabel}>Years Experience</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>₹10Cr+</Text>
                <Text style={styles.statLabel}>Total Transactions</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>100+</Text>
                <Text style={styles.statLabel}>Active Groups</Text>
              </View>
            </View>
            
            <Text style={styles.heroFooter}>Registered & Licensed Chit Fund Company</Text>
          </View>

          {/* ABOUT COMPANY */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="business" size={24} color="#024e32" />
              <Text style={styles.cardTitle}>About Manikya Chits Pvt Ltd</Text>
            </View>
            
            <Text style={styles.cardText}>
              Established in 2022, Manikya Chits is a registered chit fund company operating with 
              transparency and integrity. We are licensed under the Chit Funds Act and regulated 
              by the Government of Karnataka.
            </Text>
            
            <Text style={styles.cardText}>
              In just 2 years, we have successfully managed chits worth over 
              <Text style={styles.highlight}> ₹10+ crores</Text> across 
              <Text style={styles.highlight}> 100+ active groups</Text>, 
              benefiting hundreds of members across Karnataka with secure and profitable savings.
            </Text>
            
            <Text style={styles.cardText}>
              Our mission is to provide a secure and profitable savings platform for individuals 
              while fostering financial discipline and community support through transparent operations.
            </Text>
          </View>

          {/* WHY CHOOSE US */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="star" size={24} color="#024e32" />
              <Text style={styles.cardTitle}>Why Choose Manikya Chits?</Text>
            </View>
            
            <View style={styles.featuresGrid}>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialIcons name="check-circle" size={18} color="#024e32" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* HOW TO BECOME A MEMBER */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="how-to-reg" size={24} color="#024e32" />
              <Text style={styles.cardTitle}>How to Become a Member</Text>
            </View>
            
            <View style={styles.stepsContainer}>
              {membershipSteps.map((step) => (
                <View key={step.step} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.step}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
              
              {/* IMPORTANT NOTE */}
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>📝 Important Requirement:</Text>
                <Text style={styles.noteText}>
                  Every member must provide a nominee and declare their monthly income 
                  for eligibility assessment. This ensures proper financial planning 
                  and security for all parties involved.
                </Text>
              </View>
            </View>
          </View>

          {/* DOCUMENTS REQUIRED */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="folder" size={24} color="#024e32" />
              <Text style={styles.cardTitle}>Documents Required</Text>
            </View>
            
            <View style={styles.documentsList}>
              <View style={styles.documentItem}>
                <MaterialIcons name="check-box" size={20} color="#024e32" />
                <Text style={styles.documentText}>
                  <Text style={styles.bold}>Aadhaar Card</Text> (Mandatory for KYC)
                </Text>
              </View>
              <View style={styles.documentItem}>
                <MaterialIcons name="check-box" size={20} color="#024e32" />
                <Text style={styles.documentText}>
                  <Text style={styles.bold}>PAN Card</Text> (For tax compliance)
                </Text>
              </View>
              <View style={styles.documentItem}>
                <MaterialIcons name="check-box" size={20} color="#024e32" />
                <Text style={styles.documentText}>
                  <Text style={styles.bold}>Address Proof</Text> (Latest Utility Bill/Ration Card)
                </Text>
              </View>
              <View style={styles.documentItem}>
                <MaterialIcons name="check-box" size={20} color="#024e32" />
                <Text style={styles.documentText}>
                  <Text style={styles.bold}>2 Passport Size Photos</Text> (Recent)
                </Text>
              </View>
              <View style={styles.documentItem}>
                <MaterialIcons name="check-box" size={20} color="#024e32" />
                <Text style={styles.documentText}>
                  <Text style={styles.bold}>Bank Account Details</Text> (Cancelled cheque/Passbook)
                </Text>
              </View>
              <View style={styles.documentItem}>
                <MaterialIcons name="check-box" size={20} color="#024e32" />
                <Text style={styles.documentText}>
                  <Text style={styles.bold}>Income Proof</Text> (Salary slips/Income certificate)
                </Text>
              </View>
              <View style={styles.documentItem}>
                <MaterialIcons name="check-box" size={20} color="#024e32" />
                <Text style={styles.documentText}>
                  <Text style={styles.bold}>Nominee Details</Text> (Aadhaar & Relationship proof)
                </Text>
              </View>
            </View>
          </View>

          {/* CTA BUTTONS */}
          <View style={styles.ctaContainer}>
            <TouchableOpacity
              onPress={() => setShowRegistration(true)}
              style={styles.primaryButton}
              activeOpacity={0.8}
            >
              <View style={styles.buttonContent}>
                <MaterialIcons name="assignment-add" size={24} color="white" />
                <Text style={styles.buttonText}>REGISTER INTEREST NOW</Text>
              </View>
              <Text style={styles.buttonSubtext}>Quick form • 24-hour response • No commitment</Text>
            </TouchableOpacity>

            <View style={styles.secondaryButtons}>
              <TouchableOpacity
                onPress={openWhatsApp}
                style={styles.whatsappButton}
                activeOpacity={0.8}
              >
                <FontAwesome name="whatsapp" size={22} color="white" />
                <Text style={styles.secondaryButtonText}>WHATSAPP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={dialNumber}
                style={styles.callButton}
                activeOpacity={0.8}
              >
                <MaterialIcons name="phone-in-talk" size={22} color="white" />
                <Text style={styles.secondaryButtonText}>CALL NOW</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* CONTACT INFORMATION - MATCHING CONTACT PAGE STYLE */}
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <MaterialIcons name="contact-phone" size={24} color="#024e32" />
              <Text style={styles.contactTitle}>Get in Touch</Text>
            </View>

            {/* BUSINESS HOURS */}
            <View style={styles.contactSection}>
              <View style={styles.contactRow}>
                <MaterialIcons name="access-time" size={24} color="#024e32" />
                <Text style={styles.sectionTitle}>Business Hours</Text>
              </View>
              <Text style={styles.contactText}>
                Monday to Saturday: <Text style={styles.boldText}>9:30 AM – 6:30 PM</Text>
              </Text>
              <Text style={[styles.contactText, styles.boldText]}>
                Closed on Sundays
              </Text>
            </View>

            {/* GET IN TOUCH */}
            <View style={styles.contactSection}>
              <View style={styles.contactRow}>
                <MaterialIcons name="call" size={24} color="#024e32" />
                <Text style={styles.sectionTitle}>Get in Touch</Text>
              </View>

              <TouchableOpacity onPress={dialNumber} activeOpacity={0.7}>
                <Text style={styles.contactText}>
                  Call: <Text style={styles.linkText}>+91 7259201729</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={sendEmail} activeOpacity={0.7}>
                <Text style={styles.contactText}>
                  Email: <Text style={styles.linkText}>manikyachitsprivatelimited@gmail.com</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* OFFICE ADDRESS */}
            <View style={styles.contactSection}>
              <View style={styles.contactRow}>
                <MaterialIcons name="location-on" size={24} color="#024e32" />
                <Text style={styles.sectionTitle}>Office Address</Text>
              </View>
              <Text style={styles.contactText}>
                #102 Shri Siddivinayaka complex, infront of Government Hospital ,JC road{"\n"}
                Sagara, Shivamogga, Karnataka – 577401
              </Text>
            </View>

            {/* CONNECT WITH US */}
            <View style={styles.contactSection}>
              <View style={styles.contactRow}>
                <MaterialIcons name="share" size={24} color="#024e32" />
                <Text style={styles.sectionTitle}>Connect with Us</Text>
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity 
                  onPress={openWhatsApp} 
                  style={styles.whatsappSocialButton}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="whatsapp" size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => Linking.openURL("https://instagram.com/manikya_chits_pvt_limited")} 
                  style={styles.instagramButton}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="instagram" size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => Linking.openURL("https://www.facebook.com/")} 
                  style={styles.facebookButton}
                  activeOpacity={0.8}
                >
                  <FontAwesome name="facebook" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <Text style={styles.footerTitle}>MANIKYA CHITS PRIVATE LIMITED</Text>
            
            <View style={styles.footerVerified}>
              <MaterialIcons name="verified" size={18} color="#4ade80" />
              <Text style={styles.footerVerifiedText}>Licensed & Registered Chit Fund Company</Text>
            </View>
            
            <View style={styles.footerLinks}>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Terms & Conditions</Text>
              </TouchableOpacity>
              <Text style={styles.footerDivider}>•</Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Privacy Policy</Text>
              </TouchableOpacity>
              <Text style={styles.footerDivider}>•</Text>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Grievance Redressal</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.footerBottom}>
              <Text style={styles.copyright}>
                © 2024 Manikya Chits Private Limited. All rights reserved.
              </Text>
              <Text style={styles.license}>
                Registered under the Chit Funds Act, Government of Karnataka
              </Text>
              <Text style={styles.version}>
                Version 1.0 • Last Updated: December 2024
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* REGISTRATION MODAL */}
      <Modal
        visible={showRegistration}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRegistration(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Membership Interest Form</Text>
              <TouchableOpacity onPress={() => setShowRegistration(false)}>
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Fill this form and our team will contact you within 24 hours
            </Text>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formContainer}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Full Name *</Text>
                  <TextInput
                    placeholder="Enter your full name"
                    style={styles.formInput}
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Phone Number *</Text>
                  <TextInput
                    placeholder="Enter 10-digit mobile number"
                    style={styles.formInput}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Aadhaar Number *</Text>
                  <TextInput
                    placeholder="Enter 12-digit Aadhaar number"
                    style={styles.formInput}
                    value={aadhaarNumber}
                    onChangeText={setAadhaarNumber}
                    keyboardType="number-pad"
                    maxLength={12}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Email Address</Text>
                  <TextInput
                    placeholder="Enter your email (optional)"
                    style={styles.formInput}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Complete Address</Text>
                  <TextInput
                    placeholder="Enter your complete address (optional)"
                    style={[styles.formInput, styles.textArea]}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <Text style={styles.formNote}>
                  * Required fields. We respect your privacy and will not share your information.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={handleRegistration}
                disabled={isLoading}
                style={styles.submitButton}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={22} color="white" />
                    <Text style={styles.submitButtonText}>SUBMIT INTEREST FORM</Text>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setShowRegistration(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f6fbf8",
  },
  mainHeader: {
    backgroundColor: "#024e32",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    position: 'relative',
    zIndex: 50,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 16,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  
  // Hero Section
  heroSection: {
    backgroundColor: "#024e32",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  heroTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 8,
  },
  heroFooter: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    textAlign: "center",
    fontStyle: "italic",
  },
  
  // Cards
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#d7e5dd",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#024e32",
    marginLeft: 12,
  },
  cardText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 12,
  },
  highlight: {
    fontWeight: "bold",
    color: "#024e32",
  },
  
  // Features
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9f4",
    borderWidth: 1,
    borderColor: "#d1e7dd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    minWidth: "48%",
  },
  featureText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
    marginLeft: 8,
  },
  
  // Steps
  stepsContainer: {
    gap: 20,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    backgroundColor: "#024e32",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  stepNumberText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  noteBox: {
    backgroundColor: "#fff8e6",
    borderWidth: 1,
    borderColor: "#ffd54f",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  noteTitle: {
    color: "#d35400",
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 8,
  },
  noteText: {
    color: "#666",
    fontSize: 13,
    lineHeight: 18,
  },
  
  // Documents
  documentsList: {
    gap: 12,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  documentText: {
    fontSize: 15,
    color: "#333",
    marginLeft: 12,
    flex: 1,
  },
  bold: {
    fontWeight: "bold",
  },
  
  // CTA Buttons
  ctaContainer: {
    marginBottom: 24,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: "#024e32",
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: "#024e32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 12,
  },
  buttonSubtext: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    textAlign: "center",
  },
  secondaryButtons: {
    flexDirection: "row",
    gap: 12,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: "#25D366",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#25D366",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  callButton: {
    flex: 1,
    backgroundColor: "#c64900",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#c64900",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  secondaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  
  // Contact Section (Matches Contact Page)
  contactCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#d7e5dd",
  },
  contactHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#024e32",
    marginLeft: 12,
  },
  contactSection: {
    marginBottom: 24,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#024e32",
    marginLeft: 12,
  },
  contactText: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: "600",
  },
  linkText: {
    color: "#c64900",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  socialButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  whatsappSocialButton: {
    backgroundColor: "#25D366",
    borderRadius: 50,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  instagramButton: {
    backgroundColor: "#E4405F",
    borderRadius: 50,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  facebookButton: {
    backgroundColor: "#1877F2",
    borderRadius: 50,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Footer
  footer: {
    backgroundColor: "#024e32",
    borderRadius: 16,
    padding: 24,
  },
  footerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  footerVerified: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  footerVerifiedText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    marginLeft: 8,
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  footerLink: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  footerDivider: {
    color: "rgba(255,255,255,0.6)",
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 16,
  },
  copyright: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  license: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    textAlign: "center",
  },
  version: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#024e32",
  },
  modalSubtitle: {
    color: "#666",
    fontSize: 14,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  modalBody: {
    paddingHorizontal: 24,
  },
  formContainer: {
    gap: 20,
    paddingBottom: 20,
  },
  formGroup: {},
  formLabel: {
    color: "#333",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  formNote: {
    color: "#666",
    fontSize: 12,
    marginTop: 8,
  },
  modalFooter: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitButton: {
    backgroundColor: "#024e32",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 12,
  },
  cancelButton: {
    marginTop: 16,
  },
  cancelText: {
    color: "#666",
    textAlign: "center",
    fontWeight: "600",
  },
});