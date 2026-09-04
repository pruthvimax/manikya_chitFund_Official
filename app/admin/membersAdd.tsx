import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config.js";

export default function MembersAdd() {
  const router = useRouter();

  // Form state
  const [userid, setUserid] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  /* ================= ADD MEMBER ================= */
  const handleAddMember = async () => {
    if (!userid || !username || !phone || !password || !address || !aadhaar) {
      setMessage("Please fill all required fields");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/members/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userid,
          username,
          phone,
          password,
          address,
          aadhaar,
          email,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage(result.message || "Something went wrong");
        return;
      }

      setMessage("Member Added Successfully!");
      
      // Clear form after success
      setUserid("");
      setUsername("");
      setPhone("");
      setPassword("");
      setAddress("");
      setAadhaar("");
      setEmail("");
      
      // Go back after success
      setTimeout(() => router.push("/admin"), 800);

    } catch (err) {
      console.log("❌ Add Member Error:", err);
      setMessage("Server not responding");
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* HEADER WITH BACK BUTTON - MATCHING EMPLOYEES PAGE STYLE */}
      <View className="flex-row items-center bg-[#024e32] px-5 pt-12 pb-4">
        <TouchableOpacity 
          onPress={() => router.push("/admin/membersView")} 
          className="mt-1"
        >
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold ml-4 mt-1">
          Add Member
        </Text>
      </View>

      {/* CONTENT - SCROLLABLE FORM */}
      <ScrollView className="px-6 pt-8">
        <TextInput
          placeholder="Member ID *"
          value={userid}
          onChangeText={setUserid}
          className="border border-gray-300 p-4 mb-4 rounded-xl text-base"
        />

        <TextInput
          placeholder="Full Name *"
          value={username}
          onChangeText={setUsername}
          className="border border-gray-300 p-4 mb-4 rounded-xl text-base"
        />

        <TextInput
          placeholder="Phone Number *"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          className="border border-gray-300 p-4 mb-4 rounded-xl text-base"
        />

        <TextInput
          placeholder="Email (optional)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          className="border border-gray-300 p-4 mb-4 rounded-xl text-base"
        />

        {/* PASSWORD WITH EYE ICON */}
        <View className="border border-gray-300 rounded-xl mb-4 flex-row items-center px-4">
          <TextInput
            placeholder="Password *"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            className="flex-1 py-4 text-base"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialIcons
              name={showPassword ? "visibility-off" : "visibility"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TextInput
          placeholder="Address *"
          value={address}
          onChangeText={setAddress}
          className="border border-gray-300 p-4 mb-4 rounded-xl text-base"
          multiline
          numberOfLines={2}
        />

        <TextInput
          placeholder="Aadhaar Number *"
          value={aadhaar}
          onChangeText={setAadhaar}
          keyboardType="numeric"
          maxLength={12}
          className="border border-gray-300 p-4 mb-4 rounded-xl text-base"
        />

        {/* SAVE BUTTON */}
        <TouchableOpacity
          onPress={handleAddMember}
          className="bg-[#024e32] py-4 rounded-xl mt-2"
        >
          <Text className="text-center text-white font-semibold text-lg">
            Save Member
          </Text>
        </TouchableOpacity>

        {/* MESSAGE */}
        {message ? (
          <Text 
            className={`text-center mt-4 ${
              message.includes("Success") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </Text>
        ) : null}

        {/* Extra bottom padding */}
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}