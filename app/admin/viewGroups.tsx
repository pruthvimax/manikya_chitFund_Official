import { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Platform,
  RefreshControl,
  Modal,
  Animated,
  StatusBar,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config";

// ============ PREMIUM SKELETON LOADER ============
const SkeletonLoader = ({ isDesktop, isTablet, isMobile }: any) => {
  const skeletonOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(skeletonOpacity, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  const SkeletonCard = ({ width = "100%" }: { width?: string }) => (
    <Animated.View
      style={{ opacity: skeletonOpacity }}
      className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
    >
      <View style={{ padding: isMobile ? 16 : 20 }}>
        {/* Header with icon and title */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <View className="w-10 h-10 bg-gray-200 rounded-full" />
            <View className="ml-3">
              <View className="h-5 bg-gray-200 rounded w-32" />
              <View className="h-3 bg-gray-200 rounded w-20 mt-1" />
            </View>
          </View>
          <View className="w-8 h-8 bg-gray-200 rounded-full" />
        </View>

        {/* Details */}
        <View className="ml-12 space-y-2 mb-4">
          <View className="h-3 bg-gray-200 rounded w-24" />
          <View className="h-3 bg-gray-200 rounded w-32" />
          <View className="h-3 bg-gray-200 rounded w-28" />
        </View>

        {/* Button */}
        <View className="h-12 bg-gray-200 rounded-lg" />
      </View>
    </Animated.View>
  );

  if (isDesktop) {
    return (
      <View className="flex-row flex-wrap" style={{ gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <View key={item} style={{ width: 'calc(33.333% - 12px)' }}>
            <SkeletonCard />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View>
      {[1, 2, 3, 4].map((item) => (
        <SkeletonCard key={item} />
      ))}
    </View>
  );
};

export default function ViewGroups() {
  const router = useRouter();
  const { chitId } = useLocalSearchParams();
  const { width, height } = useWindowDimensions();

  // Responsive breakpoints
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const isLargeDesktop = width >= 1440;

  // Responsive values
  const responsive = useMemo(() => ({
    titleSize: isMobile ? 24 : isTablet ? 28 : isLargeDesktop ? 32 : 30,
    headingSize: isMobile ? 18 : isTablet ? 20 : isLargeDesktop ? 24 : 22,
    bodySize: isMobile ? 14 : isTablet ? 15 : isLargeDesktop ? 17 : 16,
    containerPadding: isMobile ? 16 : isTablet ? 20 : isLargeDesktop ? 32 : 24,
    cardPadding: isMobile ? 12 : isTablet ? 16 : isLargeDesktop ? 20 : 18,
    gridGap: isMobile ? 12 : isTablet ? 16 : isLargeDesktop ? 24 : 20,
    iconSize: isMobile ? 24 : isTablet ? 26 : isLargeDesktop ? 30 : 28,
    buttonHeight: isMobile ? 44 : isTablet ? 48 : isLargeDesktop ? 56 : 52,
  }), [width, isMobile, isTablet, isDesktop, isLargeDesktop]);

  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chitInfo, setChitInfo] = useState<any>(null);
  
  // Delete modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchChitInfo = async () => {
    if (!chitId) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/chitscheme/${chitId}`);
      if (res.ok) {
        const data = await res.json();
        setChitInfo(data);
      }
    } catch (err) {
      console.log("Fetch chit info error:", err);
    }
  };

  const fetchGroups = async () => {
    if (!chitId) return;
    
    try {
      const res = await fetch(`${BACKEND_URL}/groups/${chitId}`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Fetch groups error:", err);
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (chitId) {
      fetchGroups();
      fetchChitInfo();
    }
  }, [chitId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  // ✅ Open delete confirmation modal
  const confirmDelete = (group: any) => {
    setGroupToDelete(group);
    setDeleteModalVisible(true);
  };

  // ✅ Cancel delete
  const cancelDelete = () => {
    setDeleteModalVisible(false);
    setGroupToDelete(null);
    setDeleting(false);
  };

  // ✅ Perform delete
  const performDelete = async () => {
    if (!groupToDelete) return;
    
    setDeleting(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/groups/${groupToDelete.groupId}`,
        { method: "DELETE" }
      );

      if (!res.ok) throw new Error("Delete failed");

      // Remove group from UI
      setGroups(prev => prev.filter(g => g.groupId !== groupToDelete.groupId));
      
      // Show success message
      setSuccessMessage(`✅ Group "${groupToDelete.groupId}" deleted successfully!`);
      
      // Close modal and reset
      setDeleteModalVisible(false);
      setGroupToDelete(null);
      
      setTimeout(() => {
        setSuccessMessage("");
      }, 4000);
      
    } catch (err) {
      console.log("Delete group error:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ✅ Custom Delete Confirmation Modal - Enhanced UI
  const renderDeleteModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={deleteModalVisible}
      onRequestClose={cancelDelete}
    >
      <View className="flex-1 justify-center items-center bg-black/50 px-4">
        <View className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          {/* Header */}
          <View className="bg-red-50 p-6 border-b border-red-100">
            <View className="flex-row items-center">
              <View className="bg-red-100 p-3 rounded-full">
                <MaterialIcons name="warning" size={28} color="#dc2626" />
              </View>
              <View className="ml-4">
                <Text className="text-red-800 font-bold text-xl">
                  Delete Group
                </Text>
                <Text className="text-red-600 text-sm mt-1">
                  This action cannot be undone
                </Text>
              </View>
            </View>
          </View>

          {/* Body */}
          <View className="p-6">
            <Text className="text-gray-800 text-base mb-2">
              Are you sure you want to delete this group?
            </Text>
            {groupToDelete && (
              <>
                <View className="bg-gray-50 p-4 rounded-lg mt-3 border border-gray-200">
                  <Text className="font-bold text-gray-800 text-lg">
                    {groupToDelete.groupId}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <MaterialIcons name="account-balance-wallet" size={16} color="#6B7280" />
                    <Text className="text-gray-600 ml-1 text-sm">
                      Chit: {groupToDelete.chitId}
                    </Text>
                  </View>
                  {groupToDelete.status && (
                    <View className="flex-row items-center mt-1">
                      <MaterialIcons name="info" size={16} color="#6B7280" />
                      <Text className="text-gray-600 ml-1 text-sm">
                        Status: {groupToDelete.status}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="mt-4 bg-red-50 p-3 rounded-lg border border-red-200">
                  <Text className="text-red-600 text-sm flex-row items-center">
                    <MaterialIcons name="warning" size={16} color="#dc2626" /> 
                    {' '}All member data will be permanently deleted
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Footer Buttons */}
          <View className="flex-row border-t border-gray-200 p-4 gap-3">
            <TouchableOpacity
              onPress={cancelDelete}
              disabled={deleting}
              className="flex-1 bg-gray-100 py-3 rounded-lg items-center"
              activeOpacity={0.7}
            >
              <Text className="text-gray-700 font-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={performDelete}
              disabled={deleting}
              className="flex-1 bg-red-600 py-3 rounded-lg items-center flex-row justify-center"
              activeOpacity={0.7}
              style={{ opacity: deleting ? 0.7 : 1 }}
            >
              {deleting ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Deleting...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialIcons name="delete" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    Delete Group
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHeader = () => (
    <View className={`bg-[#024e32] absolute top-0 left-0 right-0 z-50 ${
      isDesktop ? 'px-8 pt-20 pb-8' : 'px-5 pt-16 pb-6'
    }`}>
      <StatusBar barStyle="light-content" backgroundColor="#024e32" />
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <TouchableOpacity 
            onPress={() => router.back()}
            className={isDesktop ? 'p-2' : 'mr-3'}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name="arrow-back" 
              size={isDesktop ? 30 : 26} 
              color="white" 
            />
          </TouchableOpacity>
          <View className="flex-1 ml-3">
            <Text 
              className={`text-white font-bold ${
                isDesktop ? 'text-3xl' : 'text-2xl'
              }`}
              numberOfLines={1}
            >
              Groups - {chitId}
            </Text>
            {chitInfo && (
              <Text 
                className="text-white/80 text-sm mt-1"
                numberOfLines={1}
              >
                Amount: ₹{parseInt(chitInfo.chitAmount || 0).toLocaleString("en-IN")}
              </Text>
            )}
          </View>
        </View>
        
        {/* Group Count Badge */}
        {!loading && (
          <View className="bg-white/20 px-4 py-2 rounded-full">
            <Text className="text-white font-medium text-sm">
              {groups.length} Groups
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderChitInfo = () => {
    if (!chitInfo) return null;

    return (
      <View className="bg-white rounded-2xl border border-gray-200 shadow-sm mb-6 p-4">
        <View className="flex-row items-center mb-4">
          <MaterialIcons name="account-balance-wallet" size={24} color="#024e32" />
          <Text className="ml-2 text-gray-800 font-semibold text-lg">
            Chit Scheme Details
          </Text>
        </View>
        
        <View className="flex-row flex-wrap gap-4">
          <View className="flex-1 min-w-[120px]">
            <Text className="text-gray-500 text-sm">Chit ID</Text>
            <Text className="font-semibold text-gray-800 text-base mt-1">
              {chitInfo.chitId}
            </Text>
          </View>
          
          <View className="flex-1 min-w-[120px]">
            <Text className="text-gray-500 text-sm">Amount</Text>
            <Text className="font-bold text-[#024e32] text-base mt-1">
              ₹{parseInt(chitInfo.chitAmount || 0).toLocaleString("en-IN")}
            </Text>
          </View>
          
          <View className="flex-1 min-w-[120px]">
            <Text className="text-gray-500 text-sm">Total Groups</Text>
            <Text className="font-semibold text-gray-800 text-base mt-1">
              {groups.length}
            </Text>
          </View>
          
          {chitInfo.status && (
            <View className="flex-1 min-w-[120px]">
              <Text className="text-gray-500 text-sm">Status</Text>
              <View className={`px-3 py-1 rounded-full mt-1 self-start ${
                chitInfo.status === 'ACTIVE' ? 'bg-green-100' : 
                chitInfo.status === 'COMPLETED' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                <Text className={`font-semibold text-sm ${
                  chitInfo.status === 'ACTIVE' ? 'text-green-700' : 
                  chitInfo.status === 'COMPLETED' ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {chitInfo.status}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderGroupCard = (item: any) => {
    return (
      <View
        key={item._id}
        className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4 shadow-sm"
      >
        <View className="p-4">
          <View className="flex-row items-start justify-between">
            <View className="flex-row items-center flex-1">
              <View className="bg-[#024e32]/10 p-2 rounded-full">
                <MaterialIcons name="group" size={22} color="#024e32" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="font-bold text-gray-800 text-lg">
                  {item.groupId}
                </Text>
                <View className="flex-row items-center mt-1">
                  <View className={`px-2 py-0.5 rounded-full ${
                    item.status === 'ACTIVE' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      item.status === 'ACTIVE' ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {item.status || 'ACTIVE'}
                    </Text>
                  </View>
                  <Text className="text-gray-500 text-sm ml-3">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              activeOpacity={0.7}
              className="p-2"
            >
              <MaterialIcons name="delete-outline" size={22} color="#dc2626" />
            </TouchableOpacity>
          </View>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push(`/admin/groupMembers?groupId=${item.groupId}&chitId=${item.chitId}`)}
              className="flex-1 bg-[#024e32] py-3 rounded-lg flex-row items-center justify-center"
              activeOpacity={0.8}
            >
              <MaterialIcons name="person-add" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">
                Add Member
              </Text>
            </TouchableOpacity>
            
            
          </View>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View className="bg-white rounded-2xl p-12 items-center border border-gray-200">
      <View className="bg-gray-100 p-6 rounded-full">
        <MaterialIcons name="group" size={60} color="#9ca3af" />
      </View>
      <Text className="text-gray-500 mt-4 font-bold text-xl text-center">
        No Groups Found
      </Text>
      <Text className="text-gray-400 text-center mt-2 max-w-sm">
        No groups have been created for this chit scheme yet
      </Text>
      <TouchableOpacity
        onPress={() => router.push(`/admin/groups?createFor=${chitId}`)}
        className="mt-6 bg-[#024e32] px-6 py-3 rounded-lg flex-row items-center"
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={20} color="white" />
        <Text className="text-white font-semibold ml-2">
          Create First Group
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {renderHeader()}

      {/* Delete Confirmation Modal */}
      {renderDeleteModal()}

      {/* Success Message */}
      {successMessage ? (
        <View className="mx-4 mt-4 bg-green-50 border border-green-400 rounded-xl py-3 px-4">
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

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ 
          paddingTop: isDesktop ? 140 : 110,
          paddingBottom: 20
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#024e32"]}
            tintColor="#024e32"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className={`${isDesktop ? 'px-8' : 'px-4'} pt-4 pb-10`}>
          {loading ? (
            // Show Skeleton
            <View>
              {/* Chit Info Skeleton */}
              <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-6">
                <View className="flex-row items-center mb-4">
                  <View className="w-6 h-6 bg-gray-200 rounded" />
                  <View className="h-5 bg-gray-200 rounded w-40 ml-2" />
                </View>
                <View className="flex-row flex-wrap gap-4">
                  {[1, 2, 3, 4].map((item) => (
                    <View key={item} className="flex-1 min-w-[120px]">
                      <View className="h-3 bg-gray-200 rounded w-16" />
                      <View className="h-5 bg-gray-200 rounded w-24 mt-1" />
                    </View>
                  ))}
                </View>
              </View>
              
              <SkeletonLoader isDesktop={isDesktop} isTablet={isTablet} isMobile={isMobile} />
            </View>
          ) : (
            <>
              {/* Chit Information */}
              {renderChitInfo()}

              {/* Groups Header */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-800 font-bold text-lg">
                  All Groups ({groups.length})
                </Text>
                {groups.length > 0 && (
                  <TouchableOpacity
                    onPress={() => router.push(`/admin/groups?createFor=${chitId}`)}
                    className="bg-[#024e32] px-4 py-2 rounded-lg flex-row items-center"
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="add" size={18} color="white" />
                    <Text className="text-white font-semibold ml-1 text-sm">
                      New
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Groups List */}
              {groups.length === 0 ? (
                renderEmptyState()
              ) : (
                <View>
                  {groups.map((item) => renderGroupCard(item))}
                </View>
              )}

              {/* Help Section */}
              <View className="mt-8 bg-blue-50 rounded-2xl border border-blue-100 p-4">
                <View className="flex-row items-center mb-3">
                  <MaterialIcons name="lightbulb" size={22} color="#3b82f6" />
                  <Text className="text-gray-800 font-semibold ml-2 text-base">
                    Quick Guide
                  </Text>
                </View>
                <View className="space-y-2">
                  <View className="flex-row items-center">
                    <MaterialIcons name="check-circle" size={16} color="#3b82f6" />
                    <Text className="text-gray-600 ml-2 text-sm">
                      Click "Add Member" to add members to a group
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <MaterialIcons name="check-circle" size={16} color="#3b82f6" />
                    <Text className="text-gray-600 ml-2 text-sm">
                      Each group can have multiple members
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    <MaterialIcons name="check-circle" size={16} color="#3b82f6" />
                    <Text className="text-gray-600 ml-2 text-sm">
                      Members make monthly payments in the group
                    </Text>
                  </View>
                </View>
              </View>

              {/* Company Footer */}
              <View className="mt-8 pt-6 border-t border-gray-200 items-center">
                <Text className="text-[#024e32] font-bold text-lg">
                  MANIKYA CHITS PVT LTD
                </Text>
                <Text className="text-gray-500 text-xs mt-1">
                  Groups Management
                </Text>
                <Text className="text-gray-400 text-xs mt-1">
                  © {new Date().getFullYear()} Manikya Chits Pvt Ltd.
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      {!loading && groups.length > 0 && (
        <TouchableOpacity
          onPress={() => router.push(`/admin/groups?createFor=${chitId}`)}
          className="absolute bottom-6 right-6 bg-[#024e32] w-14 h-14 rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={28} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}