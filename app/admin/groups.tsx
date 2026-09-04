import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  Modal,
} from "react-native";
import BACKEND_URL from "../../config";

// ============ PREMIUM SKELETON LOADER ============
const SkeletonLoader = ({ isDesktopOrLaptop }: { isDesktopOrLaptop: boolean }) => {
  // Create shimmer effect with animated opacity
  const ShimmerBox = ({ className = "", height = "h-16" }: { className?: string, height?: string }) => (
    <View className={`bg-gray-200 rounded-xl ${height} ${className} overflow-hidden`}>
      <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
    </View>
  );

  if (isDesktopOrLaptop) {
    return (
      <View className="px-8 pb-10">
        {/* Dashboard Header Skeleton */}
        <View className="mb-8">
          <View className="bg-gray-200 rounded-2xl p-6 h-32 overflow-hidden">
            <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
          </View>
        </View>

        {/* Grid Cards Skeleton */}
        <View className="flex-row flex-wrap gap-6 justify-center">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <View 
              key={item} 
              className="bg-white rounded-2xl border border-gray-100 p-6 w-[calc(50%-12px)] shadow-sm"
            >
              <View className="flex-row items-center mb-4">
                <View className="w-12 h-12 bg-gray-200 rounded-full mr-3 overflow-hidden">
                  <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                </View>
                <View className="flex-1">
                  <View className="h-5 bg-gray-200 rounded w-3/4 mb-2 overflow-hidden">
                    <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                  </View>
                  <View className="h-4 bg-gray-200 rounded w-1/2 overflow-hidden">
                    <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                  </View>
                </View>
              </View>
              
              <View className="flex-row justify-between items-center mt-2">
                <View className="h-8 bg-gray-200 rounded-lg w-24 overflow-hidden">
                  <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                </View>
                <View className="h-10 bg-gray-200 rounded-lg w-28 overflow-hidden">
                  <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Mobile Skeleton
  return (
    <View className="px-5 pb-10">
      {[1, 2, 3, 4].map((item) => (
        <View key={item} className="bg-white rounded-2xl mb-4 p-5 border border-gray-100 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <View className="h-6 bg-gray-200 rounded w-3/4 mb-3 overflow-hidden">
                <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
              </View>
              <View className="flex-row items-center">
                <View className="w-6 h-6 bg-gray-200 rounded-full mr-2 overflow-hidden">
                  <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                </View>
                <View className="h-5 bg-gray-200 rounded w-1/3 overflow-hidden">
                  <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
                </View>
              </View>
              <View className="h-4 bg-gray-200 rounded w-1/4 mt-3 overflow-hidden">
                <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
              </View>
            </View>
            <View className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
              <View className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

export default function Groups() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktopOrLaptop = width >= 768;
  const isLargeScreen = width >= 1024;

  const [chits, setChits] = useState<any[]>([]);
  const [groups, setGroups] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChit, setSelectedChit] = useState<string | null>(null);
  const [showCreateFor, setShowCreateFor] = useState<string | null>(null);
  const [groupIdInput, setGroupIdInput] = useState("");
  const [totalCollections, setTotalCollections] = useState("");
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingChitId, setPendingChitId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  /* ================= FETCH CHITS ================= */
  const fetchChits = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/chitscheme`);
      const data = await res.json();
      setChits(data || []);
    } catch (err) {
      console.log("Fetch chits error:", err);
      Alert.alert("Error", "Failed to load chit schemes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChits();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchChits();
  };

  /* ================= FETCH GROUPS ================= */
  const fetchGroups = async (chitId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${chitId}`);
      const data = await res.json();
      setGroups((prev: any) => ({
        ...prev,
        [chitId]: data,
      }));
    } catch (err) {
      console.log("Fetch groups error:", err);
    }
  };

  /* ================= HANDLE CREATE GROUP ================= */
  const handleCreateGroup = (chitId: string) => {
    if (!groupIdInput.trim() || !totalCollections) {
      Alert.alert("Error", "Group ID & Number of Collections required");
      return;
    }

    const existingGroups = groups[chitId] || [];
    const duplicateExists = existingGroups.some(
      (group: any) => group.groupId.toLowerCase() === groupIdInput.trim().toLowerCase()
    );

    if (duplicateExists) {
      Alert.alert(
        "Duplicate Group ID",
        `Group "${groupIdInput}" already exists in this chit scheme!`
      );
      return;
    }

    setPendingChitId(chitId);
    setConfirmModalVisible(true);
  };

  /* ================= CREATE GROUP ================= */
  const createGroup = async () => {
    if (!pendingChitId) return;

    setIsSubmitting(true);
    setConfirmModalVisible(false);

    try {
      const res = await fetch(`${BACKEND_URL}/groups/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: groupIdInput.trim(),
          chitId: pendingChitId,
          totalCollections: parseInt(totalCollections, 10),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        Alert.alert("Error", data.message);
        return;
      }

      setSuccessMessage(`✅ Group "${groupIdInput}" created successfully!`);
      
      setGroupIdInput("");
      setTotalCollections("");
      setShowCreateFor(null);
      setPendingChitId(null);
      
      await fetchGroups(pendingChitId);
      
      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
      
    } catch (err) {
      console.log("Create group error:", err);
      Alert.alert("Error", "Failed to create group. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ================= HELPERS ================= */
  const getChitKey = (item: any) => {
    return item.chitId || item.chit_id || item._id;
  };

  const getGroupCount = (chitId: string) => groups[chitId]?.length || 0;

  const toggleDetails = (chitId: string) => {
    setSelectedChit(selectedChit === chitId ? null : chitId);
    setShowCreateFor(null);
    setGroupIdInput("");
    setTotalCollections("");

    if (selectedChit !== chitId) {
      fetchGroups(chitId);
    }
  };

  const formatAmount = (amount: any) => {
    return `₹${parseInt(amount || 0).toLocaleString("en-IN")}`;
  };

  const cancelCreate = () => {
    setShowCreateFor(null);
    setGroupIdInput("");
    setTotalCollections("");
    setPendingChitId(null);
    setConfirmModalVisible(false);
  };

  /* ================= UI ================= */
  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className={`bg-[#024e32] absolute top-0 left-0 right-0 z-50 ${
        isDesktopOrLaptop ? 'px-8 pt-20 pb-8' : 'px-5 pt-16 pb-6'
      }`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.push("/admin")} 
              className={isDesktopOrLaptop ? 'p-2' : 'mt-1'}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={isDesktopOrLaptop ? 30 : 26} color="white" />
            </TouchableOpacity>
            <Text className={`text-white font-bold ml-4 ${
              isDesktopOrLaptop ? 'text-3xl' : 'text-2xl'
            }`}>
              Chit Groups
            </Text>
          </View>
          
          {isDesktopOrLaptop && !loading && (
            <View className="bg-white/20 px-4 py-2 rounded-full">
              <Text className="text-white font-medium">
                📊 {chits.length} Chits
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* CONFIRMATION MODAL */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          <View className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <View className="items-center mb-4">
              <View className="bg-[#024e32]/10 p-4 rounded-full">
                <MaterialIcons name="group-add" size={50} color="#024e32" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 mt-3">
                Confirm Creation
              </Text>
              <Text className="text-gray-500 text-center mt-1">
                Please verify the details below
              </Text>
            </View>
            
            <View className="bg-gray-50 rounded-xl p-4 mb-4">
              <View className="bg-white rounded-lg p-4 space-y-3">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">Chit ID</Text>
                  <Text className="text-gray-800 font-bold">{pendingChitId}</Text>
                </View>
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-600 font-medium">Group ID</Text>
                  <Text className="text-[#024e32] font-bold text-lg">{groupIdInput}</Text>
                </View>
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-600 font-medium">Collections</Text>
                  <Text className="text-gray-800 font-bold">{totalCollections}</Text>
                </View>
              </View>
            </View>
            
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={cancelCreate}
                className="flex-1 bg-gray-200 py-3.5 rounded-xl"
                activeOpacity={0.7}
              >
                <Text className="text-gray-700 text-center font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={createGroup}
                disabled={isSubmitting}
                className={`flex-1 py-3.5 rounded-xl ${
                  isSubmitting ? 'bg-gray-400' : 'bg-[#024e32]'
                }`}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white text-center font-semibold ml-2">
                      Creating...
                    </Text>
                  </View>
                ) : (
                  <Text className="text-white text-center font-semibold text-lg">
                    Confirm
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={{ 
          paddingTop: isDesktopOrLaptop ? 140 : 110,
          paddingBottom: 20
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <SkeletonLoader isDesktopOrLaptop={isDesktopOrLaptop} />
        ) : (
          <View className={`pb-10 ${isDesktopOrLaptop ? 'px-8' : 'px-5'}`}>
            
            {/* SUCCESS MESSAGE */}
            {successMessage ? (
              <View className="mb-4 bg-green-50 border border-green-400 rounded-xl py-3 px-4 shadow-sm">
                <View className="flex-row items-center">
                  <MaterialIcons name="check-circle" size={24} color="#16a34a" />
                  <Text className="text-green-800 font-medium ml-2 flex-1 text-base">
                    {successMessage}
                  </Text>
                  <TouchableOpacity onPress={() => setSuccessMessage("")} className="p-1">
                    <MaterialIcons name="close" size={20} color="#16a34a" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* DESKTOP HEADER */}
            {isDesktopOrLaptop && (
              <View className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                <View className="flex-row justify-between items-center flex-wrap">
                  <View>
                    <Text className="text-2xl font-bold text-gray-800">
                      🏦 Groups Dashboard
                    </Text>
                    <Text className="text-gray-600 mt-1">
                      Manage and create groups for each chit scheme
                    </Text>
                  </View>
                  <View className="flex-row gap-3 mt-2 md:mt-0">
                    <View className="bg-white px-5 py-2.5 rounded-xl shadow-sm">
                      <Text className="text-gray-800 font-semibold">
                        📊 {chits.length} Chits
                      </Text>
                    </View>
                    <View className="bg-white px-5 py-2.5 rounded-xl shadow-sm">
                      <Text className="text-gray-800 font-semibold">
                        👥 {Object.keys(groups).reduce((sum, key) => sum + getGroupCount(key), 0)} Groups
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* MAIN CONTENT */}
            {isDesktopOrLaptop ? (
              // DESKTOP GRID
              <View className="flex-row flex-wrap gap-6">
                {chits.map((item) => {
                  const chitKey = getChitKey(item);
                  
                  return (
                    <View 
                      key={chitKey} 
                      className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${
                        isLargeScreen ? 'w-[calc(50%-12px)]' : 'w-full'
                      }`}
                    >
                      {/* Card Header */}
                      <View className="p-6 bg-gradient-to-r from-white to-gray-50">
                        <View className="flex-row items-center">
                          <View className="bg-[#024e32]/10 p-2.5 rounded-full mr-3">
                            <MaterialIcons name="account-balance-wallet" size={24} color="#024e32" />
                          </View>
                          <View className="flex-1">
                            <Text className="text-xl font-bold text-gray-800">
                              {chitKey}
                            </Text>
                            <Text className="text-lg font-bold text-[#024e32]">
                              {formatAmount(item.chitAmount)}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center justify-between mt-4">
                          <View className="bg-gray-100 px-4 py-2 rounded-lg">
                            <Text className="text-gray-700 font-semibold">
                              📋 {getGroupCount(chitKey)} Groups
                            </Text>
                          </View>
                          
                          <TouchableOpacity
                            onPress={() => toggleDetails(chitKey)}
                            className="bg-[#024e32] px-5 py-2.5 rounded-lg flex-row items-center shadow-sm"
                            activeOpacity={0.8}
                          >
                            <Text className="text-white font-semibold mr-1">
                              {selectedChit === chitKey ? 'Hide' : 'Manage'}
                            </Text>
                            <MaterialIcons
                              name={selectedChit === chitKey ? "expand-less" : "expand-more"}
                              size={22}
                              color="white"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Expanded Section */}
                      {selectedChit === chitKey && (
                        <View className="bg-gray-50 border-t border-gray-200 p-6">
                          <View className="flex-row gap-4 mb-6">
                            <TouchableOpacity
                              onPress={() => setShowCreateFor(chitKey)}
                              className="bg-[#024e32] flex-1 py-4 rounded-xl shadow-sm"
                              activeOpacity={0.8}
                            >
                              <Text className="text-white text-center font-semibold text-lg">
                                ✚ Create Group
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => router.push(`/admin/viewGroups?chitId=${chitKey}`)}
                              className="bg-gray-200 flex-1 py-4 rounded-xl"
                              activeOpacity={0.8}
                            >
                              <Text className="text-gray-700 text-center font-semibold text-lg">
                                👁 View All
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {showCreateFor === chitKey && (
                            <View className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                              <Text className="text-gray-800 font-bold text-lg mb-4">
                                ✨ Create New Group
                              </Text>
                              
                              <View className="flex-row gap-4 mb-4">
                                <View className="flex-1">
                                  <Text className="text-gray-600 mb-2 font-medium">
                                    Group ID *
                                  </Text>
                                  <TextInput
                                    value={groupIdInput}
                                    onChangeText={setGroupIdInput}
                                    placeholder="e.g., GRP-01"
                                    className="border border-gray-300 rounded-lg px-4 py-3 text-lg bg-gray-50"
                                    placeholderTextColor="#9CA3AF"
                                  />
                                </View>
                                
                                <View className="flex-1">
                                  <Text className="text-gray-600 mb-2 font-medium">
                                    Collections *
                                  </Text>
                                  <TextInput
                                    value={totalCollections}
                                    onChangeText={setTotalCollections}
                                    keyboardType="numeric"
                                    placeholder="e.g., 10"
                                    className="border border-gray-300 rounded-lg px-4 py-3 text-lg bg-gray-50"
                                    placeholderTextColor="#9CA3AF"
                                  />
                                </View>
                              </View>

                              <View className="flex-row gap-4">
                                <TouchableOpacity
                                  onPress={cancelCreate}
                                  className="flex-1 bg-gray-200 py-3.5 rounded-lg"
                                  activeOpacity={0.8}
                                >
                                  <Text className="text-gray-700 text-center font-semibold">
                                    Cancel
                                  </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  onPress={() => handleCreateGroup(chitKey)}
                                  className="flex-1 bg-[#024e32] py-3.5 rounded-lg shadow-sm"
                                  activeOpacity={0.8}
                                >
                                  <Text className="text-white text-center font-semibold">
                                    💾 Save Group
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}

                          <View className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <View className="flex-row items-center mb-2">
                              <MaterialIcons name="info" size={20} color="#3b82f6" />
                              <Text className="text-gray-700 font-semibold ml-2">
                                Existing Groups ({getGroupCount(chitKey)})
                              </Text>
                            </View>
                            <Text className="text-gray-600 text-sm">
                              Click "View All" to see detailed group information and manage members
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              // MOBILE LIST
              <FlatList
                data={chits}
                keyExtractor={(item) => getChitKey(item)}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const chitKey = getChitKey(item);

                  return (
                    <View className="bg-white rounded-2xl mb-4 shadow-lg border border-gray-100 overflow-hidden">
                      <TouchableOpacity
                        onPress={() => toggleDetails(chitKey)}
                        activeOpacity={0.9}
                        className="p-5"
                      >
                        <View className="flex-row justify-between items-center">
                          <View className="flex-1">
                            <Text className="text-xl font-bold text-gray-800">
                              🏷 {chitKey}
                            </Text>
                            <View className="flex-row items-center mt-2">
                              <MaterialIcons name="account-balance-wallet" size={20} color="#024e32" />
                              <Text className="text-lg font-bold text-[#024e32] ml-1">
                                {formatAmount(item.chitAmount)}
                              </Text>
                            </View>
                            <Text className="text-gray-600 text-sm mt-2">
                              📋 {getGroupCount(chitKey)} Groups
                            </Text>
                          </View>
                          <MaterialIcons
                            name={selectedChit === chitKey ? "expand-less" : "expand-more"}
                            size={32}
                            color="#666"
                          />
                        </View>
                      </TouchableOpacity>

                      {selectedChit === chitKey && (
                        <View className="bg-gray-50 border-t border-gray-200 p-5">
                          <View className="flex-row mb-4 gap-2">
                            <TouchableOpacity
                              onPress={() => setShowCreateFor(chitKey)}
                              className="bg-[#024e32] flex-1 py-3 rounded-xl"
                              activeOpacity={0.8}
                            >
                              <Text className="text-white text-center font-semibold">
                                ✚ Create
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => router.push(`/admin/viewGroups?chitId=${chitKey}`)}
                              className="bg-gray-200 flex-1 py-3 rounded-xl"
                              activeOpacity={0.8}
                            >
                              <Text className="text-gray-700 text-center font-semibold">
                                👁 View All
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {showCreateFor === chitKey && (
                            <View className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                              <Text className="text-gray-800 font-bold text-base mb-3">
                                ✨ New Group
                              </Text>
                              
                              <Text className="text-gray-600 mb-2 text-sm">Group ID *</Text>
                              <TextInput
                                value={groupIdInput}
                                onChangeText={setGroupIdInput}
                                placeholder="e.g., GRP-01"
                                className="border border-gray-300 rounded-lg px-4 py-3 mb-3 bg-gray-50"
                                placeholderTextColor="#9CA3AF"
                              />

                              <Text className="text-gray-600 mb-2 text-sm">Collections *</Text>
                              <TextInput
                                value={totalCollections}
                                onChangeText={setTotalCollections}
                                keyboardType="numeric"
                                placeholder="e.g., 10"
                                className="border border-gray-300 rounded-lg px-4 py-3 mb-3 bg-gray-50"
                                placeholderTextColor="#9CA3AF"
                              />

                              <View className="flex-row gap-3">
                                <TouchableOpacity
                                  onPress={cancelCreate}
                                  className="flex-1 bg-gray-200 py-3 rounded-lg"
                                  activeOpacity={0.8}
                                >
                                  <Text className="text-gray-700 text-center font-semibold">
                                    Cancel
                                  </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity
                                  onPress={() => handleCreateGroup(chitKey)}
                                  className="flex-1 bg-[#024e32] py-3 rounded-lg"
                                  activeOpacity={0.8}
                                >
                                  <Text className="text-white text-center font-semibold">
                                    💾 Save
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}

            {/* EMPTY STATE */}
            {chits.length === 0 && !loading && (
              <View className="bg-gray-50 rounded-3xl p-12 items-center mt-8 border border-gray-200">
                <View className="bg-gray-200 p-6 rounded-full mb-4">
                  <MaterialIcons name="account-balance-wallet" size={60} color="#9ca3af" />
                </View>
                <Text className="text-gray-500 text-2xl font-bold">
                  No Chit Schemes
                </Text>
                <Text className="text-gray-400 text-center mt-2 max-w-sm">
                  Create chit schemes first to manage groups
                </Text>
              </View>
            )}

            {/* INFO FOOTER */}
            <View className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
              <View className="flex-row items-center mb-4">
                <MaterialIcons name="lightbulb" size={24} color="#3b82f6" />
                <Text className="text-gray-800 font-bold text-lg ml-2">
                  Quick Guide
                </Text>
              </View>
              <View className="space-y-2">
                <Text className="text-gray-600 text-base">
                  1️⃣ Tap <Text className="font-bold text-[#024e32]">Manage</Text> to expand a chit scheme
                </Text>
                <Text className="text-gray-600 text-base">
                  2️⃣ Click <Text className="font-bold text-[#024e32]">Create Group</Text> to add new groups
                </Text>
                <Text className="text-gray-600 text-base">
                  3️⃣ Click <Text className="font-bold text-[#024e32]">View All</Text> to manage members
                </Text>
              </View>
            </View>

            {/* FOOTER */}
            <View className="mt-10 pt-6 border-t border-gray-200">
              <View className="items-center">
                <Text className="text-[#024e32] font-bold text-lg">
                  MANIKYA CHITS PVT LTD
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Chit Groups Management
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON */}
      {isDesktopOrLaptop && !loading && chits.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push("/admin/chitscheme")}
          className="absolute bottom-8 right-8 bg-[#024e32] w-16 h-16 rounded-full items-center justify-center shadow-2xl"
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}