import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Animated,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  SafeAreaView,
  Alert,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import BACKEND_URL from "../config.js";

export default function MyProfile() {
  const router = useRouter();
  
  /* ================= SESSION GUARD ================= */
  useEffect(() => {
    const checkSession = async () => {
      const stored = await AsyncStorage.getItem("loggedUser");
      if (!stored) {
        router.replace("/");
      }
    };

    checkSession();
  }, []);

  const [userid, setUserid] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= LOAD USER FROM STORAGE ================= */
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("loggedUser");

        if (!storedUser) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
          return;
        }

        const parsed = JSON.parse(storedUser);

        if (!parsed.userid) {
          if (isMounted) {
            setError(true);
            setLoading(false);
          }
          return;
        }

        if (isMounted) {
          setUserid(parsed.userid);
        }
      } catch (err) {
        console.log("Storage error:", err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    if (!userid) return;

    let isMounted = true;

    const loadProfile = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/members/${userid}`);
        const data = await res.json();

        if (!res.ok) throw new Error("Profile fetch failed");

        if (isMounted) {
          setProfile(data);
          setError(false);
        }
      } catch (err) {
        console.log("Profile error:", err);
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [userid]);

  /* ================= FETCH ACCOUNT SUMMARY ================= */
  const fetchSummary = useCallback(async () => {
    if (!userid) return;

    try {
      const res = await fetch(
        `${BACKEND_URL}/member/account-summary/${userid}`
      );
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.log("Account summary error:", err);
    }
  }, [userid]);

  useEffect(() => {
    fetchSummary();
  }, [userid, fetchSummary]);

  /* ================= HANDLE REFRESH ================= */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (userid) {
      try {
        // Refresh profile
        const profileRes = await fetch(`${BACKEND_URL}/members/${userid}`);
        const profileData = await profileRes.json();
        if (profileRes.ok) {
          setProfile(profileData);
        }

        // Refresh summary
        const summaryRes = await fetch(
          `${BACKEND_URL}/member/account-summary/${userid}`
        );
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
        
        setError(false);
      } catch (err) {
        console.log("Refresh error:", err);
      }
    }
    setRefreshing(false);
  }, [userid]);

  /* ================= LOGOUT ================= */
  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("loggedUser");
          router.replace("/");
        },
      },
    ]);
  };

  /* ================= COMING SOON FEATURES ================= */
  const showComingSoon = (feature: string) => {
    Alert.alert(
      "Coming Soon",
      `${feature} feature will be available in the next update.`,
      [{ text: "OK" }]
    );
  };

  /* ================= FORMAT DATE ================= */
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  /* ================= LOADING ================= */
  if (loading) {
    return <ProfileSkeleton />;
  }

  /* ================= ERROR ================= */
  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.errorIcon}>
            <MaterialIcons name="error-outline" size={48} color="#dc2626" />
          </View>
          <Text style={styles.errorTitle}>Profile Not Available</Text>
          <Text style={styles.errorSubtitle}>Unable to load your profile information</Text>
          <TouchableOpacity
            onPress={() => router.replace("/")}
            style={styles.loginButton}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ================= UI ================= */
  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER - SAME SIZE AS EMPLOYEE HEADER */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => router.replace("menu")}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
      >
        {/* PROFILE CARD */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <MaterialIcons name="person" size={64} color="#024e32" />
                </View>
              </View>
       <Text style={styles.userName}>
  {profile?.name || profile?.username || "User Name"}
</Text>
              <Text style={styles.userId}>ID: {userid}</Text>
            </View>

            <View style={styles.profileDetails}>
              <Text style={styles.sectionTitle}>CONTACT INFORMATION</Text>
              <View style={styles.detailsList}>
                {/* Phone */}
                <View style={styles.detailItem}>
                  <View style={styles.iconContainerPhone}>
                    <MaterialIcons name="phone" size={20} color="#2563eb" />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={styles.detailValue}>{profile?.phone || "Not provided"}</Text>
                    <Text style={styles.detailLabel}>Mobile Number</Text>
                  </View>
                </View>

                {/* Email */}
                <View style={styles.detailItem}>
                  <View style={styles.iconContainerEmail}>
                    <MaterialIcons name="email" size={20} color="#059669" />
                  </View>
                  <View style={styles.detailText}>
                    <Text style={styles.detailValue}>{profile?.email || "Not provided"}</Text>
                    <Text style={styles.detailLabel}>Email Address</Text>
                  </View>
                </View>

                {/* Address - if available in your API */}
                {profile?.address && (
                  <View style={styles.detailItem}>
                    <View style={styles.iconContainerLocation}>
                      <MaterialIcons name="location-on" size={20} color="#d97706" />
                    </View>
                    <View style={styles.detailText}>
                      <Text style={styles.detailValue} numberOfLines={2}>
                        {profile.address}
                      </Text>
                      <Text style={styles.detailLabel}>Address</Text>
                    </View>
                  </View>
                )}

                {/* Member Since - if available in your API */}
                {profile?.createdAt && (
                  <View style={styles.detailItem}>
                    <View style={styles.iconContainerBadge}>
                      <MaterialIcons name="badge" size={20} color="#7e22ce" />
                    </View>
                    <View style={styles.detailText}>
                      <Text style={styles.detailValue}>
                        {formatDate(profile.createdAt)}
                      </Text>
                      <Text style={styles.detailLabel}>Member Since</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* ACCOUNT SUMMARY */}
        {summary && (
          <View style={styles.section}>
            <View style={styles.card}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryIcon}>
                  <MaterialIcons name="account-balance-wallet" size={24} color="#024e32" />
                </View>
                <Text style={styles.summaryTitle}>Account Summary</Text>
              </View>

              <View style={styles.summaryGrid}>
                {/* Total Investment */}
                <View style={styles.summaryItemInvestment}>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Total Investment</Text>
                    <Text style={styles.summaryValue}>
                      ₹{summary.totalInvestment?.toLocaleString() || "0"}
                    </Text>
                  </View>
                  <View style={styles.summaryItemIcon}>
                    <MaterialIcons name="trending-up" size={24} color="#2563eb" />
                  </View>
                </View>

                {/* Active Chits */}
                <View style={styles.summaryItemChits}>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Active Chits</Text>
                    <Text style={styles.summaryValue}>
                      {summary.activeChits || "0"}
                    </Text>
                  </View>
                  <View style={styles.summaryItemIcon}>
                    <MaterialIcons name="groups" size={24} color="#059669" />
                  </View>
                </View>

                {/* Last Login */}
                <View style={styles.summaryItemLogin}>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Last Login</Text>
                    <Text style={styles.summaryDate}>
                      {summary.lastLogin ? formatDate(summary.lastLogin) : "First login"}
                    </Text>
                  </View>
                  <View style={styles.summaryItemIcon}>
                    <MaterialIcons name="login" size={24} color="#7e22ce" />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ACCOUNT ACTIONS */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={[styles.profileDetails, { paddingBottom: 24 }]}>
              <Text style={styles.sectionTitle}>ACCOUNT ACTIONS</Text>
              
              {/* Edit Profile */}
              <TouchableOpacity
                style={styles.actionButtonEdit}
                onPress={() => showComingSoon("Edit Profile")}
              >
                <View style={styles.actionButtonContent}>
                  <View style={styles.actionIconEdit}>
                    <MaterialIcons name="edit" size={20} color="#024e32" />
                  </View>
                  <Text style={styles.actionTextEdit}>Edit Profile</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#024e32" />
              </TouchableOpacity>

              {/* Change Password */}
              <TouchableOpacity
                style={styles.actionButtonPassword}
                onPress={() => showComingSoon("Change Password")}
              >
                <View style={styles.actionButtonContent}>
                  <View style={styles.actionIconPassword}>
                    <MaterialIcons name="lock" size={20} color="#3b82f6" />
                  </View>
                  <Text style={styles.actionTextPassword}>Change Password</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color="#3b82f6" />
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
              >
                <MaterialIcons name="logout" size={20} color="white" />
                <Text style={styles.logoutText}>  Logout</Text>
              </TouchableOpacity>

              {/* Footer Note */}
              <View style={styles.footerNote}>
                <MaterialIcons 
                  name="info-outline" 
                  size={18} 
                  color="#6b7280" 
                  style={styles.footerIcon} 
                />
                <Text style={styles.footerText}>
                  Your profile information is securely stored and only visible to you.
                  Pull down to refresh for latest updates.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================= CONSTANT FOOTER ================= */}
        <View style={styles.companyFooter}>
          <View style={styles.footerLine} />
          <Text style={styles.footerCompany}>MANIKYA CHITS PVT LTD</Text>
          <Text style={styles.footerPortal}>Member Profile</Text>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   PROFILE SKELETON
========================================================= */

function ProfileSkeleton() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.skeletonBack} />
          <View style={styles.skeletonHeaderTitle} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.skeletonProfileHeader}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonName} />
              <View style={styles.skeletonId} />
            </View>

            <View style={styles.profileDetails}>
              <View style={styles.skeletonSectionTitle} />

              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.skeletonDetailRow}>
                  <View style={styles.skeletonIcon} />
                  <View style={styles.skeletonDetailText}>
                    <View style={styles.skeletonValue} />
                    <View style={styles.skeletonLabel} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.skeletonSummaryHeader}>
              <View style={styles.skeletonSmallCircle} />
              <View style={styles.skeletonSummaryTitle} />
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.skeletonSummaryItem} />
              <View style={styles.skeletonSummaryItem} />
              <View style={styles.skeletonSummaryItem} />
            </View>
          </View>
        </View>

        <View style={styles.companyFooter}>
          <View style={styles.footerLine} />
          <Text style={styles.footerCompany}>MANIKYA CHITS PVT LTD</Text>
          <Text style={styles.footerPortal}>Member Portal</Text>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    color: '#1f2937',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#024e32',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#024e32',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 24,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    elevation: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginTop: 4,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 110,
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    backgroundColor: '#024e32',
    padding: 32,
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  avatarContainer: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  userId: {
    color: '#d1fae5',
    fontSize: 14,
    marginTop: 4,
  },
  profileDetails: {
    padding: 24,
  },
  sectionTitle: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  detailsList: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainerPhone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#dbeafe',
  },
  iconContainerEmail: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#d1fae5',
  },
  iconContainerLocation: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fef3c7',
  },
  iconContainerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#f3e8ff',
  },
  detailText: {
    flex: 1,
  },
  detailValue: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '500',
  },
  detailLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(2, 78, 50, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  summaryGrid: {
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  summaryItemInvestment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
  },
  summaryItemChits: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
  },
  summaryItemLogin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f3e8ff',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  summaryValue: {
    color: '#1f2937',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  summaryDate: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  summaryItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonEdit: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#024e32',
  },
  actionButtonPassword: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: '#3b82f6',
    marginTop: 16,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconEdit: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: 'rgba(2, 78, 50, 0.1)',
  },
  actionIconPassword: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#dbeafe',
  },
  actionTextEdit: {
    fontSize: 16,
    fontWeight: '500',
    color: '#024e32',
  },
  actionTextPassword: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3b82f6',
  },
  logoutButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  logoutText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  footerNote: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  footerIcon: {
    marginTop: 1,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },

  companyFooter: {
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },

  footerLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 14,
  },

  footerCompany: {
    color: '#024e32',
    fontSize: 16,
    fontWeight: '700',
  },

  footerPortal: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },

  footerCopyright: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  skeletonBack: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },

  skeletonHeaderTitle: {
    width: 140,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginLeft: 16,
  },

  skeletonProfileHeader: {
    backgroundColor: '#e5e7eb',
    padding: 32,
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },

  skeletonAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#d1d5db',
    marginBottom: 16,
  },

  skeletonName: {
    width: 150,
    height: 24,
    borderRadius: 7,
    backgroundColor: '#d1d5db',
  },

  skeletonId: {
    width: 90,
    height: 14,
    borderRadius: 6,
    backgroundColor: '#d1d5db',
    marginTop: 8,
  },

  skeletonSectionTitle: {
    width: 140,
    height: 13,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
    marginBottom: 20,
  },

  skeletonDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },

  skeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },

  skeletonDetailText: {
    flex: 1,
  },

  skeletonValue: {
    width: '55%',
    height: 16,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
  },

  skeletonLabel: {
    width: '30%',
    height: 11,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    marginTop: 7,
  },

  skeletonSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    marginBottom: 20,
  },

  skeletonSmallCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    marginRight: 12,
  },

  skeletonSummaryTitle: {
    width: 150,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#e5e7eb',
  },

  skeletonSummaryItem: {
    height: 82,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
});