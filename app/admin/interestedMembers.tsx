import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import BACKEND_URL from "../../config";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

interface InterestedMember {
  _id: string;
  fullName?: string;
  phoneNumber?: string;
  aadhaarNumber?: string;
  status?: "pending" | "contacted" | string;
  createdAt?: string;
}

export default function InterestedMembersAdmin() {
  const router = useRouter();

  const [data, setData] = useState<InterestedMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Skeleton animation
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  /* =========================================================
     SKELETON ANIMATION
  ========================================================= */

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnimation, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnimation, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [shimmerAnimation]);

  const skeletonOpacity = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  /* =========================================================
     FETCH REQUESTS
  ========================================================= */

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/member-interest/all-interests`
      );

      if (!res.ok) {
        throw new Error("Failed to fetch requests");
      }

      const json = await res.json();

      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.log("Fetch Error:", err);

      Alert.alert(
        "Unable to Load",
        "Could not load interested member requests. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  /* =========================================================
     PULL TO REFRESH
  ========================================================= */

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  /* =========================================================
     MARK CONTACTED
  ========================================================= */

  const markContacted = async (id: string) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/member-interest/update-status/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "contacted",
          }),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        Alert.alert(
          "Error",
          json.message || "Unable to update request"
        );
        return;
      }

      Alert.alert(
        "Updated",
        "Member has been marked as contacted."
      );

      fetchRequests();
    } catch (err) {
      console.log("Update Error:", err);

      Alert.alert(
        "Network Error",
        "Unable to update the request. Please try again."
      );
    }
  };

  /* =========================================================
     DELETE REQUEST
  ========================================================= */

  const deleteRequest = async (id: string) => {
    Alert.alert(
      "Delete Request",
      "Are you sure you want to permanently delete this contacted member?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(
                `${BACKEND_URL}/member-interest/delete/${id}`,
                {
                  method: "DELETE",
                }
              );

              const json = await res.json();

              if (!res.ok) {
                Alert.alert(
                  "Error",
                  json.message || "Delete failed"
                );
                return;
              }

              Alert.alert(
                "Deleted",
                "Member request removed successfully."
              );

              fetchRequests();
            } catch (err) {
              console.log("Delete Error:", err);

              Alert.alert(
                "Network Error",
                "Unable to delete the request."
              );
            }
          },
        },
      ]
    );
  };

  /* =========================================================
     SINGLE BUTTON ACTION
  ========================================================= */

  const handleButtonPress = (item: InterestedMember) => {
    if (item.status === "pending") {
      markContacted(item._id);
    } else if (item.status === "contacted") {
      deleteRequest(item._id);
    }
  };

  /* =========================================================
     CALL MEMBER
  ========================================================= */

  const callMember = async (phone?: string) => {
    if (!phone) {
      Alert.alert(
        "Phone Number",
        "Phone number is not available."
      );
      return;
    }

    try {
      const phoneUrl =
        Platform.OS === "ios"
          ? `telprompt:${phone}`
          : `tel:${phone}`;

      const supported = await Linking.canOpenURL(phoneUrl);

      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert(
          "Unable to Call",
          "Calling is not available on this device."
        );
      }
    } catch (error) {
      console.log("Call Error:", error);

      Alert.alert(
        "Unable to Call",
        "Could not open the phone application."
      );
    }
  };

  /* =========================================================
     SKELETON CARD
  ========================================================= */

  const SkeletonCard = () => {
    return (
      <Animated.View
        style={[
          styles.card,
          styles.skeletonCard,
          {
            opacity: skeletonOpacity,
          },
        ]}
      >
        <View style={styles.skeletonHeader}>
          <View style={styles.skeletonName} />
          <View style={styles.skeletonBadge} />
        </View>

        <View style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonText} />
        </View>

        <View style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonTextLong} />
        </View>

        <View style={styles.skeletonButton} />
      </Animated.View>
    );
  };

  /* =========================================================
     LOADING SCREEN
  ========================================================= */

  const LoadingScreen = () => {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingTitleRow}>
          <View style={styles.loadingTitle} />
          <View style={styles.loadingCount} />
        </View>

        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />

        <View style={styles.loadingBottom}>
          <ActivityIndicator
            size="small"
            color="#024e32"
          />

          <Text style={styles.loadingText}>
            Loading interested members...
          </Text>
        </View>
      </View>
    );
  };

  /* =========================================================
     EMPTY STATE
  ========================================================= */

  const EmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <MaterialIcons
            name="people-outline"
            size={42}
            color="#024e32"
          />
        </View>

        <Text style={styles.emptyTitle}>
          No Interested Members
        </Text>

        <Text style={styles.emptyDescription}>
          There are currently no new member interest requests.
        </Text>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchRequests}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name="refresh"
            size={20}
            color="#ffffff"
          />

          <Text style={styles.refreshButtonText}>
            Refresh
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /* =========================================================
     MEMBER CARD
  ========================================================= */

  const renderMember = ({
    item,
  }: {
    item: InterestedMember;
  }) => {
    const isPending = item.status === "pending";

    return (
      <View style={styles.card}>

        {/* CARD HEADER */}
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.fullName || "?")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.nameTextContainer}>
              <Text
                style={styles.name}
                numberOfLines={1}
              >
                {item.fullName || "Unknown Member"}
              </Text>

              <Text style={styles.requestLabel}>
                New member request
              </Text>
            </View>
          </View>

          {/* STATUS */}
          <View
            style={[
              styles.statusBadge,
              isPending
                ? styles.statusPending
                : styles.statusContacted,
            ]}
          >
            <View
              style={[
                styles.statusDot,
                isPending
                  ? styles.statusDotPending
                  : styles.statusDotContacted,
              ]}
            />

            <Text style={styles.statusText}>
              {isPending ? "Pending" : "Contacted"}
            </Text>
          </View>
        </View>

        {/* DIVIDER */}
        <View style={styles.divider} />

        {/* PHONE */}
        <TouchableOpacity
          style={styles.infoRow}
          activeOpacity={0.7}
          onPress={() => callMember(item.phoneNumber)}
        >
          <View style={styles.infoIcon}>
            <Ionicons
              name="call-outline"
              size={17}
              color="#024e32"
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>
              Phone Number
            </Text>

            <Text style={styles.phoneText}>
              {item.phoneNumber || "Not available"}
            </Text>
          </View>

          <View style={styles.callIcon}>
            <Ionicons
              name="call"
              size={17}
              color="#024e32"
            />
          </View>
        </TouchableOpacity>

        {/* AADHAAR */}
        <View style={styles.infoRow}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="card-outline"
              size={17}
              color="#666666"
            />
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>
              Aadhaar Number
            </Text>

            <Text style={styles.infoText}>
              {item.aadhaarNumber || "Not available"}
            </Text>
          </View>
        </View>

        {/* ACTION BUTTON */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            !isPending && styles.deleteButton,
          ]}
          onPress={() => handleButtonPress(item)}
          activeOpacity={0.8}
        >
          <MaterialIcons
            name={
              isPending
                ? "check-circle-outline"
                : "delete-outline"
            }
            size={20}
            color="#ffffff"
          />

          <Text style={styles.actionButtonText}>
            {isPending
              ? "Mark as Contacted"
              : "Delete Contacted"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /* =========================================================
     FOOTER
  ========================================================= */

  const Footer = () => {
    return (
      <View style={styles.footer}>
        <View style={styles.footerLine} />

        <Text style={styles.footerCompany}>
          MANIKYA CHITS PVT LTD
        </Text>

        <Text style={styles.footerPage}>
          New Members
        </Text>

        <Text style={styles.footerCopyright}>
          © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
          All rights reserved.
        </Text>
      </View>
    );
  };

  /* =========================================================
     HEADER
  ========================================================= */

  const Header = () => {
    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>

          <TouchableOpacity
            onPress={() => router.replace("/admin")}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={26}
              color="#ffffff"
            />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
            >
              New Members
            </Text>

            <Text style={styles.headerSubtitle}>
              Interested member requests
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <MaterialIcons
              name="person-add-alt-1"
              size={24}
              color="#ffffff"
            />
          </View>

        </View>
      </View>
    );
  };

  /* =========================================================
     MAIN UI
  ========================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#024e32"
      />

      <Header />

      {loading ? (
        <LoadingScreen />
      ) : (
        <View style={styles.container}>

          {/* CONTENT HEADER */}
          <View style={styles.contentHeader}>
            <View>
              <Text style={styles.title}>
                Interested Requests
              </Text>

              <Text style={styles.subtitle}>
                Members who are interested in joining
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>
                {data.length}
              </Text>

              <Text style={styles.countLabel}>
                Members
              </Text>
            </View>
          </View>

          {/* MEMBER LIST */}
          <FlatList
            data={data}
            keyExtractor={(item) => item._id}
            renderItem={renderMember}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"

            contentContainerStyle={[
              styles.listContent,
              data.length === 0 &&
                styles.emptyListContent,
            ]}

            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#024e32"]}
                tintColor="#024e32"
                progressBackgroundColor="#ffffff"
              />
            }

            ListEmptyComponent={<EmptyState />}

            ListFooterComponent={
              data.length > 0 ? <Footer /> : null
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     ROOT
  ======================================================= */

  safeArea: {
    flex: 2,
    backgroundColor: "#024e32",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    backgroundColor: "#024e32",
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingBottom: 18,
  },

  headerContent: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginRight: 12,
  },

  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },

  headerTitle: {
    color: "#ffffff",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: 0.2,
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginTop: 3,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  /* =======================================================
     CONTAINER
  ======================================================= */

  container: {
    flex: 1,
    backgroundColor: "#f7f9f8",
    paddingHorizontal: 16,
  },

  /* =======================================================
     CONTENT HEADER
  ======================================================= */

  contentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 14,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#202624",
  },

  subtitle: {
    fontSize: 12,
    color: "#737b77",
    marginTop: 4,
  },

  countBadge: {
    minWidth: 68,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: "#e9f2ed",
    alignItems: "center",
    justifyContent: "center",
  },

  countNumber: {
    color: "#024e32",
    fontSize: 16,
    fontWeight: "800",
  },

  countLabel: {
    color: "#668074",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 1,
  },

  /* =======================================================
     LIST
  ======================================================= */

  listContent: {
    paddingTop: 2,
    paddingBottom: 10,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  /* =======================================================
     MEMBER CARD
  ======================================================= */

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginBottom: 14,
    padding: 16,

    borderWidth: 1,
    borderColor: "#e5ebe7",

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 5,

    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  nameContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e6f2ec",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  avatarText: {
    color: "#024e32",
    fontSize: 17,
    fontWeight: "800",
  },

  nameTextContainer: {
    flex: 1,
  },

  name: {
    color: "#202624",
    fontSize: 16,
    fontWeight: "800",
  },

  requestLabel: {
    color: "#8a938e",
    fontSize: 11,
    marginTop: 3,
  },

  /* =======================================================
     STATUS
  ======================================================= */

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusPending: {
    backgroundColor: "#fff4d6",
  },

  statusContacted: {
    backgroundColor: "#dff3e6",
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusDotPending: {
    backgroundColor: "#d69e00",
  },

  statusDotContacted: {
    backgroundColor: "#218838",
  },

  statusText: {
    color: "#39413d",
    fontSize: 10,
    fontWeight: "800",
  },

  /* =======================================================
     DIVIDER
  ======================================================= */

  divider: {
    height: 1,
    backgroundColor: "#edf0ee",
    marginVertical: 14,
  },

  /* =======================================================
     INFO ROW
  ======================================================= */

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#f0f5f2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  infoContent: {
    flex: 1,
  },

  infoLabel: {
    color: "#8a938e",
    fontSize: 10,
    marginBottom: 2,
  },

  infoText: {
    color: "#404844",
    fontSize: 14,
    fontWeight: "500",
  },

  phoneText: {
    color: "#024e32",
    fontSize: 14,
    fontWeight: "700",
  },

  phoneLink: {
    textDecorationLine: "underline",
  },

  callIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#e7f4ec",
    alignItems: "center",
    justifyContent: "center",
  },

  /* =======================================================
     ACTION BUTTON
  ======================================================= */

  actionButton: {
    height: 46,
    marginTop: 5,
    borderRadius: 12,
    backgroundColor: "#024e32",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteButton: {
    backgroundColor: "#c1121f",
  },

  actionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 7,
  },

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingTop: 80,
  },

  emptyIconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#e7f2ec",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    color: "#29312d",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyDescription: {
    color: "#7a837e",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 290,
  },

  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#024e32",
    paddingHorizontal: 22,
    height: 44,
    borderRadius: 12,
    marginTop: 20,
  },

  refreshButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 7,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    alignItems: "center",
    paddingHorizontal: 10,
    paddingTop: 20,
    paddingBottom: 20,
  },

  footerLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#e1e7e3",
    marginBottom: 14,
  },

  footerCompany: {
    color: "#024e32",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },

  footerPage: {
    color: "#737b77",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },

  footerCopyright: {
    color: "#9aa39e",
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },

  /* =======================================================
     LOADING
  ======================================================= */

  loadingContainer: {
    flex: 1,
    backgroundColor: "#f7f9f8",
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  loadingTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  loadingTitle: {
    width: 170,
    height: 22,
    borderRadius: 7,
    backgroundColor: "#dfe7e2",
  },

  loadingCount: {
    width: 62,
    height: 34,
    borderRadius: 14,
    backgroundColor: "#dfe7e2",
  },

  skeletonCard: {
    minHeight: 200,
  },

  skeletonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  skeletonName: {
    width: "45%",
    height: 20,
    borderRadius: 6,
    backgroundColor: "#dfe7e2",
  },

  skeletonBadge: {
    width: 72,
    height: 25,
    borderRadius: 15,
    backgroundColor: "#dfe7e2",
  },

  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  skeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#dfe7e2",
    marginRight: 10,
  },

  skeletonText: {
    width: "55%",
    height: 14,
    borderRadius: 5,
    backgroundColor: "#dfe7e2",
  },

  skeletonTextLong: {
    width: "65%",
    height: 14,
    borderRadius: 5,
    backgroundColor: "#dfe7e2",
  },

  skeletonButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#dfe7e2",
    marginTop: 18,
  },

  loadingBottom: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  loadingText: {
    color: "#737b77",
    fontSize: 12,
    marginLeft: 8,
  },
});