import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useMemo, useState, useRef, useEffect } from "react";
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Platform,
    StatusBar,
    Animated,
} from "react-native";
import BACKEND_URL from "../../config";

interface PaymentRecord {
  amount?: number;
  paymentType?: string;
  paymentMode?: string;
  paidAt?: string;
  collectedBy?: string;
}

interface GroupEntry {
  groupId: string;
  groupName?: string;
  chitId?: string;
  memberId?: string;
  groupMemberId?: string;
  ledger?: {
    monthIndex?: number;
    installmentAmount?: number;
    paidAmount?: number;
    payments?: PaymentRecord[];
    dueDate?: string;
    status?: string;
  }[];
}

interface MemberResponse {
  userid?: string;
  username?: string;
  phone?: string;
}

// ============ SKELETON LOADER ============
const SkeletonLoader = () => {
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

  const SkeletonCard = () => (
    <Animated.View
      style={{ opacity: skeletonOpacity }}
      className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 bg-gray-200 rounded-full mr-3" />
        <View className="flex-1">
          <View className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <View className="h-4 bg-gray-200 rounded w-1/2" />
        </View>
      </View>
      <View className="flex-row justify-between">
        <View className="h-4 bg-gray-200 rounded w-1/3" />
        <View className="h-4 bg-gray-200 rounded w-1/4" />
      </View>
    </Animated.View>
  );

  return (
    <View className="px-5 mt-5">
      <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 shadow-sm">
        <View className="h-6 bg-gray-200 rounded w-32 mb-3" />
        <View className="h-4 bg-gray-200 rounded w-40 mb-2" />
        <View className="h-4 bg-gray-200 rounded w-32 mb-2" />
        <View className="h-4 bg-gray-200 rounded w-36 mb-3" />
        <View className="flex-row justify-between">
          <View className="h-4 bg-gray-200 rounded w-20" />
          <View className="h-4 bg-gray-200 rounded w-24" />
        </View>
      </View>
      <View className="flex-row mb-4">
        {[1, 2, 3].map((item) => (
          <View key={item} className="h-10 bg-gray-200 rounded-full w-24 mr-2" />
        ))}
      </View>
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </View>
  );
};

export default function EmployeeMemberHistoryScreen() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [memberName, setMemberName] = useState("");
  const [loading, setLoading] = useState(false);
  const [memberData, setMemberData] = useState<MemberResponse | null>(null);
  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchMemberHistory = async (query?: string) => {
    const searchValue = (query ?? memberId).trim();
    if (!searchValue) {
      Alert.alert("Validation", "Please enter a member ID or member name");
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setMemberData(null);
    setGroups([]);
    setSelectedGroupIndex(null);

    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) {
        Alert.alert("Error", "Employee session not found");
        return;
      }

      let memberInfo = null;
      const directMemberRes = await fetch(`${BACKEND_URL}/members/${encodeURIComponent(searchValue)}`);
      if (directMemberRes.ok) {
        memberInfo = await directMemberRes.json();
      } else {
        const membersRes = await fetch(`${BACKEND_URL}/members`);
        if (membersRes.ok) {
          const members = await membersRes.json();
          const normalizedQuery = searchValue.toLowerCase();
          memberInfo = (Array.isArray(members) ? members : []).find((member: any) => {
            const userId = String(member.userid || "").toLowerCase();
            const userName = String(member.username || "").toLowerCase();
            return userId.includes(normalizedQuery) || userName.includes(normalizedQuery);
          });
        }
      }

      if (!memberInfo) {
        setMemberData(null);
        setGroups([]);
        Alert.alert("Not Found", "Member not found with this ID or name");
        return;
      }

      setMemberData({
        userid: memberInfo.userid,
        username: memberInfo.username,
        phone: memberInfo.phone,
      });
      setMemberName(memberInfo.username || "");

      const groupsRes = await fetch(`${BACKEND_URL}/groups/my-chits/${memberInfo.userid}`);
      const groupsData = await groupsRes.json();

      if (!groupsRes.ok) {
        setGroups([]);
        return;
      }

      const normalizedGroups = Array.isArray(groupsData)
        ? groupsData.map((entry: any) => ({
            groupId: entry.groupId,
            groupName: entry.groupName || entry.chitId || entry.groupId,
            chitId: entry.chitId,
            memberId: entry.memberId,
            groupMemberId: entry.groupMemberId,
          }))
        : [];

      const details: GroupEntry[] = [];
      for (const group of normalizedGroups) {
        try {
          const detailRes = await fetch(`${BACKEND_URL}/groups/account-copy/${memberInfo.userid}/${group.groupId}?groupMemberId=${group.groupMemberId || ""}`);
          const detailData = detailRes.ok ? await detailRes.json() : null;
          if (detailData) {
            details.push({
              ...group,
              groupName: detailData.groupName || group.groupName,
              ledger: detailData.ledger || [],
            });
          }
        } catch (error) {
          console.log("Group detail fetch failed", error);
        }
      }

      setGroups(details);
      if (details.length > 0) {
        setSelectedGroupIndex(0);
      }
    } catch (error) {
      console.error("Error fetching member history", error);
      Alert.alert("Error", "Failed to load member history");
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setMemberId("");
    setMemberName("");
    setMemberData(null);
    setGroups([]);
    setSelectedGroupIndex(null);
    setHasSearched(false);
  };

  const summary = useMemo(() => {
    const totalPayments = groups.reduce((sum, group) => sum + (group.ledger?.reduce((groupSum, month) => groupSum + (month.payments?.length || 0), 0) || 0), 0);
    return {
      totalGroups: groups.length,
      totalPayments,
    };
  }, [groups]);

  const selectedGroup = selectedGroupIndex !== null ? groups[selectedGroupIndex] : null;

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PAID': return 'bg-green-100 text-green-700';
      case 'OVERDUE': return 'bg-red-100 text-red-700';
      case 'DUE': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentModeIcon = (mode: string) => {
    switch(mode?.toLowerCase()) {
      case 'cash': return 'payments';
      case 'online': return 'account-balance-wallet';
      case 'cheque': return 'receipt';
      case 'bank transfer': return 'account-balance';
      default: return 'payment';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f5f6fa]">
      <StatusBar barStyle="light-content" backgroundColor="#024e32" />
      
      <View className="bg-[#024e32] px-5 pt-14 pb-5">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="p-1"
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4">
            Member History
          </Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-5">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <Text className="text-gray-700 font-semibold text-base mb-2">
              🔍 Search Member
            </Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 px-3">
              <MaterialIcons name="search" size={22} color="#6b7280" />
              <TextInput
                value={memberId}
                onChangeText={setMemberId}
                placeholder="Enter Member ID or Name"
                className="flex-1 ml-2 py-3 text-base"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
              />
              {memberId.length > 0 && (
                <TouchableOpacity onPress={() => setMemberId("")} className="p-1">
                  <MaterialIcons name="close" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row mt-3 gap-3">
              <TouchableOpacity
                onPress={() => fetchMemberHistory()}
                disabled={loading}
                className="flex-1 bg-[#024e32] rounded-xl py-3 items-center"
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white font-semibold text-base">Search</Text>
                )}
              </TouchableOpacity>
              {hasSearched && (
                <TouchableOpacity 
                  onPress={clearSearch} 
                  className="px-5 py-3 rounded-xl bg-gray-200"
                  activeOpacity={0.8}
                >
                  <Text className="text-gray-700 font-semibold">Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {loading && <SkeletonLoader />}

        {!loading && hasSearched && !memberData && (
          <View className="px-4 py-12 items-center">
            <View className="bg-gray-100 p-6 rounded-full">
              <MaterialIcons name="person-search" size={56} color="#9ca3af" />
            </View>
            <Text className="text-gray-500 text-lg font-semibold mt-4">No Member Found</Text>
            <Text className="text-gray-400 text-center mt-1">Try searching with a different ID or name</Text>
          </View>
        )}

        {!loading && memberData && (
          <View className="px-4 mt-5">
            <View className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <View className="flex-row items-center mb-3">
                <View className="bg-[#024e32]/10 p-3 rounded-full">
                  <MaterialIcons name="person" size={24} color="#024e32" />
                </View>
                <Text className="text-[#024e32] font-bold text-lg ml-3">Member Profile</Text>
              </View>
              
              <View className="space-y-2">
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-500">Name</Text>
                  <Text className="text-gray-800 font-semibold">{memberData.username || memberName || "—"}</Text>
                </View>
                <View className="flex-row justify-between items-center py-2 border-b border-gray-100">
                  <Text className="text-gray-500">Member ID</Text>
                  <Text className="text-gray-800 font-semibold">{memberData.userid || "—"}</Text>
                </View>
                <View className="flex-row justify-between items-center py-2">
                  <Text className="text-gray-500">Mobile Number</Text>
                  <Text className="text-gray-800 font-semibold">{memberData.phone || "—"}</Text>
                </View>
              </View>

              <View className="flex-row justify-between mt-4 pt-4 border-t border-gray-200">
                <View className="items-center flex-1">
                  <Text className="text-2xl font-bold text-[#024e32]">{summary.totalGroups}</Text>
                  <Text className="text-gray-500 text-sm">Groups</Text>
                </View>
                <View className="items-center flex-1 border-l border-r border-gray-200">
                  <Text className="text-2xl font-bold text-[#024e32]">{summary.totalPayments}</Text>
                  <Text className="text-gray-500 text-sm">Payments</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-2xl font-bold text-[#024e32]">
                    {groups.reduce((sum, g) => sum + (g.ledger?.filter(m => m.status === 'PAID').length || 0), 0)}
                  </Text>
                  <Text className="text-gray-500 text-sm">Completed</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {!loading && memberData && groups.length === 0 && (
          <View className="px-4 py-12 items-center">
            <View className="bg-gray-100 p-6 rounded-full">
              <MaterialIcons name="history" size={56} color="#9ca3af" />
            </View>
            <Text className="text-gray-500 text-lg font-semibold mt-4">No Groups Found</Text>
            <Text className="text-gray-400 text-center mt-1">This member is not part of any chit group</Text>
          </View>
        )}

        {!loading && memberData && groups.length > 0 && (
          <View className="px-4 mt-5">
            <View className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <Text className="text-gray-700 font-semibold text-base mb-3">
                📋 Select Group
              </Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                className="flex-row pb-2"
              >
                {groups.map((group, index) => (
                  <TouchableOpacity
                    key={`${group.groupId}-${index}`}
                    onPress={() => setSelectedGroupIndex(index)}
                    className={`mr-2 px-4 py-2 rounded-full border ${
                      selectedGroupIndex === index
                        ? "bg-[#024e32] border-[#024e32]"
                        : "bg-white border-gray-300"
                    }`}
                    activeOpacity={0.8}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedGroupIndex === index ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {group.groupName || group.groupId}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {!loading && selectedGroup && selectedGroup.ledger && selectedGroup.ledger.length > 0 && (
          <View className="px-4 mt-4">
            <View className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <View className="flex-row items-center mb-4">
                <MaterialIcons name="receipt-long" size={24} color="#024e32" />
                <Text className="text-[#024e32] font-bold text-lg ml-2">
                  {selectedGroup.groupName || selectedGroup.groupId}
                </Text>
              </View>
              
              <Text className="text-gray-500 text-sm mb-4">
                Group ID: {selectedGroup.groupId}
              </Text>

              {selectedGroup.ledger.map((month, monthIndex) => (
                <View 
                  key={`${selectedGroup.groupId}-${monthIndex}`} 
                  className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-200 last:mb-0"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <View className="bg-[#024e32]/10 p-2 rounded-lg">
                        <MaterialIcons name="calendar-today" size={20} color="#024e32" />
                      </View>
                      <Text className="font-bold text-gray-800 text-base ml-3">
                        Month {month.monthIndex || monthIndex + 1}
                      </Text>
                    </View>
                    <View className={`px-3 py-1 rounded-full ${getStatusColor(month.status || 'DUE')}`}>
                      <Text className={`text-xs font-semibold`}>
                        {month.status || "DUE"}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row justify-between items-center bg-white p-3 rounded-lg mb-3">
                    <View>
                      <Text className="text-gray-500 text-sm">Installment</Text>
                      <Text className="font-bold text-gray-800 text-base">
                        {formatCurrency(month.installmentAmount || 0)}
                      </Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-gray-500 text-sm">Paid</Text>
                      <Text className="font-bold text-green-600 text-base">
                        {formatCurrency(month.paidAmount || 0)}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-gray-500 text-sm">Due Date</Text>
                      <Text className="font-semibold text-gray-700 text-sm">
                        {month.dueDate ? formatDate(month.dueDate) : "—"}
                      </Text>
                    </View>
                  </View>

                  <View className="mb-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-500 text-xs">Progress</Text>
                      <Text className="text-gray-500 text-xs">
                        {month.installmentAmount ? Math.round((month.paidAmount || 0) / month.installmentAmount * 100) : 0}%
                      </Text>
                    </View>
                    <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <View 
                        className="h-full bg-[#024e32] rounded-full"
                        style={{ 
                          width: month.installmentAmount ? `${Math.min((month.paidAmount || 0) / month.installmentAmount * 100, 100)}%` : '0%' 
                        }}
                      />
                    </View>
                  </View>

                  {month.payments && month.payments.length > 0 ? (
                    <View className="bg-white rounded-lg p-3 border border-gray-100">
                      <Text className="font-semibold text-gray-700 text-sm mb-2">
                        💰 Payment History ({month.payments.length})
                      </Text>
                      {month.payments.map((payment, paymentIndex) => (
                        <View
                          key={`${selectedGroup.groupId}-${monthIndex}-${paymentIndex}`}
                          className="flex-row justify-between items-center py-2 border-b border-gray-100 last:border-b-0"
                        >
                          <View className="flex-1">
                            <Text className="font-semibold text-blue-600">
                              {formatCurrency(payment.amount || 0)}
                            </Text>
                            <Text className="text-gray-400 text-xs">
                              {payment.paidAt ? formatDateTime(payment.paidAt) : "—"}
                            </Text>
                            {payment.collectedBy && (
                              <Text className="text-gray-400 text-xs mt-0.5">
                                Collected by: {payment.collectedBy}
                              </Text>
                            )}
                          </View>
                          <View className="items-end">
                            <Text className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              payment.paymentType === 'PENALTY' ? 'bg-red-100 text-red-600' :
                              payment.paymentType === 'DIVIDEND' ? 'bg-blue-100 text-blue-600' :
                              'bg-green-100 text-green-600'
                            }`}>
                              {payment.paymentType || "INSTALLMENT"}
                            </Text>
                            {payment.paymentMode && (
                              <View className="flex-row items-center mt-1">
                                <MaterialIcons 
                                  name={getPaymentModeIcon(payment.paymentMode)} 
                                  size={12} 
                                  color="#6b7280" 
                                />
                                <Text className="text-gray-400 text-xs ml-0.5">
                                  {payment.paymentMode}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View className="bg-gray-100 rounded-lg p-4 items-center">
                      <MaterialIcons name="payments" size={24} color="#9ca3af" />
                      <Text className="text-gray-400 text-sm mt-1">No payments recorded</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="mt-8 px-4">
          <View className="border-t border-gray-200 pt-4 items-center">
            <Text className="text-[#024e32] font-bold text-base">
              MANIKYA CHITS PVT LTD
            </Text>
            <Text className="text-gray-500 text-xs mt-1">
              Member History
            </Text>
            <Text className="text-gray-400 text-xs mt-1">
              © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}