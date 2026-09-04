import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import BACKEND_URL from "../../config.js";

export default function EmployeesAdd() {
  const router = useRouter();

  const [emp_id, setEmpId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const saveEmployee = async () => {
    if (!emp_id || !name || !phone || !address || !password) {
      setMessage("Fill all required fields");
      setIsSuccess(false);
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/employee/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_id,
          name,
          email,
          phone,
          address,
          password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Employee Added Successfully");
        setIsSuccess(true);

        setTimeout(() => {
          setMessage("");
          router.push("/admin");
        }, 4000);
      } else {
        setMessage(data.message || "Failed to add employee");
        setIsSuccess(false);
        setTimeout(() => setMessage(""), 4000);
      }
    } catch (err) {
      setMessage("Server error");
      setIsSuccess(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  return (
    <View className="flex-1 bg-white">

      {/* HEADER */}
      <View className="flex-row items-center bg-[#024e32] px-5 pt-12 pb-4">
        <TouchableOpacity 
          onPress={() => router.push("/admin/employeesView")} 
        >
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-semibold ml-4">
          Add Employee
        </Text>
      </View>

      {/* FORM */}
      <View className="px-6 pt-8">

        <TextInput
          placeholder="Employee ID"
          value={emp_id}
          onChangeText={setEmpId}
          className="border border-gray-300 p-4 mb-4 rounded-xl"
        />

        <TextInput
          placeholder="Name"
          value={name}
          onChangeText={setName}
          className="border border-gray-300 p-4 mb-4 rounded-xl"
        />

        <TextInput
          placeholder="Email (optional)"
          value={email}
          onChangeText={setEmail}
          className="border border-gray-300 p-4 mb-4 rounded-xl"
        />

        <TextInput
          placeholder="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="number-pad"
          className="border border-gray-300 p-4 mb-4 rounded-xl"
        />

        <TextInput
          placeholder="Address"
          value={address}
          onChangeText={setAddress}
          className="border border-gray-300 p-4 mb-4 rounded-xl"
        />

        {/* PASSWORD */}
        <View className="border border-gray-300 rounded-xl mb-6 flex-row items-center px-4">
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            className="flex-1 py-4"
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons
              name={showPassword ? "visibility-off" : "visibility"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {/* SAVE BUTTON */}
        <TouchableOpacity
          onPress={saveEmployee}
          className="bg-[#024e32] py-4 rounded-xl"
        >
          <Text className="text-center text-white font-semibold text-lg">
            Save Employee
          </Text>
        </TouchableOpacity>

        {/* MESSAGE */}
        {message ? (
          <View
            className={`mt-4 p-3 rounded-xl ${
              isSuccess
                ? "bg-green-100 border border-green-300"
                : "bg-red-100 border border-red-300"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                isSuccess ? "text-green-700" : "text-red-700"
              }`}
            >
              {message}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}