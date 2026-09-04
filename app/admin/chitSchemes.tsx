  import { MaterialIcons } from "@expo/vector-icons";
  import { useRouter } from "expo-router";
  import { useEffect, useState } from "react";
  import {
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
  } from "react-native";
  import BACKEND_URL from "../../config";

  export default function ChitSchemes() {
    const router = useRouter();

    const [schemes, setSchemes] = useState<any[]>([]);
    const [chitId, setChitId] = useState("");
    const [chitAmount, setChitAmount] = useState("");
    const [durationMonths, setDurationMonths] = useState("");
    const [dailyAmount, setDailyAmount] = useState("");
    const [weeklyAmount, setWeeklyAmount] = useState("");
    const [monthlyAmount, setMonthlyAmount] = useState("");
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [schemeToDelete, setSchemeToDelete] = useState<any>(null);
    const [deleteMessage, setDeleteMessage] = useState("");
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);

    const loadSchemes = async () => {
      const res = await fetch(`${BACKEND_URL}/chitscheme`);
      const data = await res.json();
      setSchemes(data || []);
    };

    useEffect(() => {
      loadSchemes();
    }, []);

    const handleSubmit = () => {
      // Validate fields
      if (
        !chitId ||
        !chitAmount ||
        !durationMonths ||
        !dailyAmount ||
        !weeklyAmount ||
        !monthlyAmount
      ) {
        setMessage("Please fill all fields");
        setMessageType("error");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      // Check for duplicate Chit ID
      const duplicateExists = schemes.some(scheme => 
        scheme.chitId.toLowerCase() === chitId.toLowerCase()
      );
      
      if (duplicateExists) {
        setMessage(`Chit Scheme with ID "${chitId}" already exists!`);
        setMessageType("error");
        setTimeout(() => setMessage(""), 3000);
        return;
      }

      // Show confirmation modal
      setConfirmModalVisible(true);
    };

    const addScheme = async () => {
      setConfirmModalVisible(false);

      const res = await fetch(`${BACKEND_URL}/chitscheme/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chitId,
          chitAmount,
          durationMonths,
          dailyAmount,
          weeklyAmount,
          monthlyAmount,
        }),
      });

      if (res.ok) {
        setMessage("Chit Scheme Added Successfully!");
        setMessageType("success");
        setChitId("");
        setChitAmount("");
        setDurationMonths("");
        setDailyAmount("");
        setWeeklyAmount("");
        setMonthlyAmount("");
        loadSchemes();
        
        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        setMessage("Failed to add Chit Scheme");
        setMessageType("error");
        setTimeout(() => setMessage(""), 3000);
      }
    };

    const confirmDelete = (scheme: any) => {
      setSchemeToDelete(scheme);
      setDeleteModalVisible(true);
    };

    const deleteScheme = async () => {
      if (!schemeToDelete) return;

      await fetch(`${BACKEND_URL}/chitscheme/${schemeToDelete._id}`, { 
        method: "DELETE" 
      });
      
      setDeleteMessage(`"${schemeToDelete.chitId}" deleted successfully!`);
      loadSchemes();
      setDeleteModalVisible(false);
      setSchemeToDelete(null);
      
      setTimeout(() => {
        setDeleteMessage("");
      }, 3000);
    };

    const cancelDelete = () => {
      setDeleteModalVisible(false);
      setSchemeToDelete(null);
    };

    return (
      <SafeAreaView className="flex-1 bg-white">
        {/* HEADER */}
        <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.replace("/admin")}
              className="mt-1"
            >
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
              Chit Schemes
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView 
          className="flex-1"
          contentContainerStyle={{ paddingTop: 110 }}
          showsVerticalScrollIndicator={false}
        >
          {/* FORM */}
          <View className="p-6">
            <TextInput
              placeholder="Chit ID *"
              value={chitId}
              onChangeText={setChitId}
              className="border border-gray-300 px-4 py-4 rounded-xl mb-3 bg-gray-50"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder="Chit Amount *"
              keyboardType="number-pad"
              value={chitAmount}
              onChangeText={setChitAmount}
              className="border border-gray-300 px-4 py-4 rounded-xl mb-3 bg-gray-50"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder="Duration (Months) *"
              keyboardType="number-pad"
              value={durationMonths}
              onChangeText={setDurationMonths}
              className="border border-gray-300 px-4 py-4 rounded-xl mb-3 bg-gray-50"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder="Daily Amount *"
              keyboardType="number-pad"
              value={dailyAmount}
              onChangeText={setDailyAmount}
              className="border border-gray-300 px-4 py-4 rounded-xl mb-3 bg-gray-50"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder="Weekly Amount *"
              keyboardType="number-pad"
              value={weeklyAmount}
              onChangeText={setWeeklyAmount}
              className="border border-gray-300 px-4 py-4 rounded-xl mb-3 bg-gray-50"
              placeholderTextColor="#9CA3AF"
            />

            <TextInput
              placeholder="Monthly Amount *"
              keyboardType="number-pad"
              value={monthlyAmount}
              onChangeText={setMonthlyAmount}
              className="border border-gray-300 px-4 py-4 rounded-xl mb-4 bg-gray-50"
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-[#024e32] py-4 rounded-2xl shadow-lg shadow-green-900/30"
            >
              <Text className="text-white text-center font-semibold text-lg">
                Add Chit Scheme
              </Text>
            </TouchableOpacity>

            {/* ADD/DELETE MESSAGES */}
            {message ? (
              <View className={`mt-4 border rounded-xl py-3 ${
                messageType === "success" 
                  ? "bg-green-100 border-green-400" 
                  : "bg-red-100 border-red-400"
              }`}>
                <Text className={`text-center font-medium ${
                  messageType === "success" ? "text-green-800" : "text-red-800"
                }`}>
                  {message}
                </Text>
              </View>
            ) : null}

            {deleteMessage ? (
              <View className="mt-3 bg-blue-100 border border-blue-400 rounded-xl py-3">
                <Text className="text-blue-800 text-center font-medium">
                  {deleteMessage}
                </Text>
              </View>
            ) : null}
          </View>

          {/* CONFIRMATION MODAL */}
          <Modal
            visible={confirmModalVisible}
            transparent={true}
            animationType="fade"
          >
            <View className="flex-1 bg-black/50 justify-center items-center">
              <View className="bg-white w-80 rounded-2xl p-6 shadow-2xl">
                <View className="items-center mb-4">
                  <View className="bg-[#024e32]/10 p-3 rounded-full">
                    <MaterialIcons name="check-circle" size={50} color="#024e32" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800 mt-3">
                    Confirm Addition
                  </Text>
                </View>
                
                <View className="bg-gray-50 rounded-xl p-4 mb-4">
                  <Text className="text-gray-600 text-center">
                    Are you sure you want to add this chit scheme?
                  </Text>
                  <View className="mt-3 bg-white rounded-lg p-3">
                    <Text className="text-gray-800">
                      <Text className="font-bold">ID:</Text> {chitId}
                    </Text>
                    <Text className="text-gray-800 mt-1">
                      <Text className="font-bold">Amount:</Text> ₹{parseInt(chitAmount || '0').toLocaleString('en-IN')}
                    </Text>
                    <Text className="text-gray-800 mt-1">
                      <Text className="font-bold">Duration:</Text> {durationMonths} months
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    onPress={() => setConfirmModalVisible(false)}
                    className="bg-gray-200 py-3 px-6 rounded-xl flex-1 mr-2"
                  >
                    <Text className="text-gray-700 text-center font-semibold">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={addScheme}
                    className="bg-[#024e32] py-3 px-6 rounded-xl flex-1 ml-2 shadow-lg shadow-green-900/30"
                  >
                    <Text className="text-white text-center font-semibold">
                      Confirm
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* DELETE CONFIRMATION MODAL */}
          <Modal
            visible={deleteModalVisible}
            transparent={true}
            animationType="fade"
          >
            <View className="flex-1 bg-black/50 justify-center items-center">
              <View className="bg-white w-80 rounded-2xl p-6 shadow-2xl">
                <View className="items-center mb-4">
                  <View className="bg-red-100 p-3 rounded-full">
                    <MaterialIcons name="warning" size={50} color="#dc2626" />
                  </View>
                  <Text className="text-xl font-bold text-gray-800 mt-3">
                    Confirm Delete
                  </Text>
                </View>
                
                <Text className="text-gray-600 text-center mb-6">
                  Are you sure you want to delete chit scheme{" "}
                  <Text className="font-bold text-[#024e32]">
                    "{schemeToDelete?.chitId}"
                  </Text>
                  ? This action cannot be undone.
                </Text>
                
                <View className="flex-row justify-between">
                  <TouchableOpacity
                    onPress={cancelDelete}
                    className="bg-gray-200 py-3 px-6 rounded-xl flex-1 mr-2"
                  >
                    <Text className="text-gray-700 text-center font-semibold">
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={deleteScheme}
                    className="bg-red-600 py-3 px-6 rounded-xl flex-1 ml-2 shadow-lg shadow-red-600/30"
                  >
                    <Text className="text-white text-center font-semibold">
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* TABLE */}
          <View className="px-3 pb-10">
            <Text className="text-lg font-semibold text-gray-800 mb-3 px-2">
              All Chit Schemes ({schemes.length})
            </Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View className="min-w-full">
                {/* TABLE HEADER */}
                <View className="flex-row bg-[#024e32] py-3 rounded-t-xl min-w-[600px]">
                  <Text className="w-24 text-white text-center font-semibold px-1">
                    Chit ID
                  </Text>
                  <Text className="w-28 text-white text-center font-semibold px-1">
                    Amount
                  </Text>
                  <Text className="w-24 text-white text-center font-semibold px-1">
                    Months
                  </Text>
                  <Text className="w-24 text-white text-center font-semibold px-1">
                    Daily
                  </Text>
                  <Text className="w-24 text-white text-center font-semibold px-1">
                    Weekly
                  </Text>
                  <Text className="w-28 text-white text-center font-semibold px-1">
                    Monthly
                  </Text>
                  <Text className="w-20 text-white text-center font-semibold px-1">
                    Action
                  </Text>
                </View>

                {/* TABLE ROWS */}
                {schemes.map((s) => (
                  <View
                    key={s._id}
                    className="flex-row border border-t-0 border-gray-300 py-4 items-center min-w-[600px] bg-white"
                  >
                    <Text className="w-24 text-center text-gray-800 font-medium px-1">
                      {s.chitId}
                    </Text>
                    <Text className="w-28 text-center text-gray-800 px-1">
                      ₹{parseInt(s.chitAmount).toLocaleString('en-IN')}
                    </Text>
                    <Text className="w-24 text-center text-gray-800 px-1">
                      {s.durationMonths}
                    </Text>
                    <Text className="w-24 text-center text-gray-800 px-1">
                      ₹{parseInt(s.dailyAmount).toLocaleString('en-IN')}
                    </Text>
                    <Text className="w-24 text-center text-gray-800 px-1">
                      ₹{parseInt(s.weeklyAmount).toLocaleString('en-IN')}
                    </Text>
                    <Text className="w-28 text-center text-gray-800 font-medium px-1">
                      ₹{parseInt(s.monthlyAmount).toLocaleString('en-IN')}
                    </Text>
                    <View className="w-20 items-center justify-center px-1">
                      <TouchableOpacity
                        onPress={() => confirmDelete(s)}
                        className="bg-red-600 px-3 py-2 rounded-lg shadow-lg shadow-red-600/30"
                      >
                        <Text className="text-white text-sm font-medium">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>

            {schemes.length === 0 && (
              <View className="py-8 items-center">
                <MaterialIcons name="account-balance-wallet" size={50} color="#ccc" />
                <Text className="text-gray-500 mt-3">No chit schemes added yet</Text>
              </View>
            )}

            {/* COMPANY FOOTER */}
            <View className="mt-8 mb-6 px-5">
              <View className="border-t border-gray-200 pt-4 items-center">
                <Text className="text-[#024e32] font-bold text-base">
                  MANIKYA CHITS PVT LTD
                </Text>
                <Text className="text-gray-500 text-xs mt-1 text-center">
                  Chit Schemes
                </Text>
                <Text className="text-gray-400 text-xs mt-1 text-center">
                  © {new Date().getFullYear()} Manikya Chits Pvt Ltd. All rights reserved.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }