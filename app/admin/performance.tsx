import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function Performance() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  // Placeholder data - replace with your actual data later
  const performanceData = {
    monthly: {
      revenue: "₹2,50,000",
      growth: "+15%",
      newCustomers: "45",
      churnRate: "8%",
      topPerformer: "EMPLOYE 01",
    },
    quarterly: {
      revenue: "₹7,50,000",
      growth: "+12%",
      newCustomers: "120",
      churnRate: "6%",
      topPerformer: "Priya Sharma",
    },
    yearly: {
      revenue: "₹28,00,000",
      growth: "+18%",
      newCustomers: "480",
      churnRate: "10%",
      topPerformer: "Amit Patel",
    },
  };

  const currentData = performanceData[selectedPeriod];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* ✅ CONSISTENT FIXED HEADER - SAME SIZE AS OTHER PAGES */}
      <View className="bg-[#024e32] px-5 pt-16 pb-6 absolute top-0 left-0 right-0 z-50">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.push("/admin")} 
            className="mt-1"
          >
            <MaterialIcons name="arrow-back" size={26} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold ml-4 mt-1 flex-1">
            Performance Dashboard
          </Text>
        </View>
      </View>

      {/* CONTENT WITH PADDING FOR FIXED HEADER */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingTop: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* PERIOD SELECTOR */}
        <View className="flex-row justify-center mt-6 px-5">
          {["monthly", "quarterly", "yearly"].map((period) => (
            <TouchableOpacity
              key={period}
              onPress={() => setSelectedPeriod(period)}
              className={`px-5 py-2 mx-2 rounded-full ${
                selectedPeriod === period
                  ? "bg-[#024e32]"
                  : "bg-gray-200"
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`font-medium ${
                  selectedPeriod === period
                    ? "text-white"
                    : "text-gray-700"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 🔄 REFRESH & EXPORT BUTTONS */}
        <View className="flex-row justify-between px-5 mt-6 mb-4">
          <TouchableOpacity
            className="bg-gray-100 py-2.5 px-4 rounded-xl flex-row items-center"
            onPress={() => {
              // Add refresh functionality
              console.log("Refreshing data...");
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={20} color="#024e32" />
            <Text className="text-gray-700 ml-2 font-medium">Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-[#024e32] py-2.5 px-4 rounded-xl flex-row items-center"
            onPress={() => {
              // Add export functionality
              console.log("Exporting report...");
            }}
            activeOpacity={0.7}
          >
            <MaterialIcons name="download" size={20} color="white" />
            <Text className="text-white ml-2 font-medium">Export Report</Text>
          </TouchableOpacity>
        </View>

        {/* 📊 COMING SOON SECTION */}
        <View className="mx-5 mt-4 mb-6">
          <View className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
            <View className="flex-row items-center mb-3">
              <MaterialIcons name="info" size={28} color="#3b82f6" />
              <Text className="text-xl font-bold text-blue-800 ml-3">
                Enhanced Analytics - Coming Soon
              </Text>
            </View>
            
            <Text className="text-blue-700 mb-4 leading-6">
              We're working on advanced performance analytics with detailed division-wise 
              breakdowns, interactive charts, and predictive insights. This feature will 
              provide comprehensive analysis across all departments.
            </Text>
            
            <View className="bg-blue-100 rounded-xl p-4 mb-4">
              <Text className="font-semibold text-blue-800 mb-2">Planned Features:</Text>
              <View className="flex-row flex-wrap">
                <View className="bg-white rounded-lg px-3 py-1.5 mr-2 mb-2 border border-blue-200">
                  <Text className="text-blue-700">📈 Division-wise Metrics</Text>
                </View>
                <View className="bg-white rounded-lg px-3 py-1.5 mr-2 mb-2 border border-blue-200">
                  <Text className="text-blue-700">📊 Interactive Charts</Text>
                </View>
                <View className="bg-white rounded-lg px-3 py-1.5 mr-2 mb-2 border border-blue-200">
                  <Text className="text-blue-700">🎯 Performance Trends</Text>
                </View>
                <View className="bg-white rounded-lg px-3 py-1.5 mr-2 mb-2 border border-blue-200">
                  <Text className="text-blue-700">📱 Real-time Updates</Text>
                </View>
              </View>
            </View>
            
            <Text className="text-sm text-blue-600 italic">
              Expected release: Next major update. Stay tuned for more powerful analytics!
            </Text>
          </View>
        </View>

        {/* MAIN STATS CARDS */}
        <View className="px-5 mt-2">
          {/* REVENUE CARD */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md border border-gray-100">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-600 text-sm">Total Revenue</Text>
                <Text className="text-3xl font-bold text-[#024e32] mt-1">
                  {currentData.revenue}
                </Text>
                <View className="flex-row items-center mt-2">
                  <MaterialIcons name="trending-up" size={20} color="#10b981" />
                  <Text className="text-green-600 ml-1 font-medium">
                    {currentData.growth} from last period
                  </Text>
                </View>
              </View>
              <MaterialIcons name="attach-money" size={40} color="#024e32" />
            </View>
          </View>

          {/* NEW CUSTOMERS CARD */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md border border-gray-100">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-600 text-sm">New Customers</Text>
                <Text className="text-3xl font-bold text-[#024e32] mt-1">
                  {currentData.newCustomers}
                </Text>
                <Text className="text-gray-500 text-sm mt-2">
                  Customers added this period
                </Text>
              </View>
              <MaterialIcons name="person-add" size={40} color="#024e32" />
            </View>
          </View>

          {/* CHURN RATE CARD */}
          <View className="bg-white rounded-2xl p-5 mb-4 shadow-md border border-gray-100">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-600 text-sm">Churn Rate</Text>
                <Text className="text-3xl font-bold text-[#024e32] mt-1">
                  {currentData.churnRate}
                </Text>
                <Text className="text-gray-500 text-sm mt-2">
                  Customer attrition rate
                </Text>
              </View>
              <MaterialIcons name="trending-down" size={40} color="#ef4444" />
            </View>
          </View>

          {/* TOP PERFORMER CARD */}
          <View className="bg-white rounded-2xl p-5 mb-8 shadow-md border border-gray-100">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-gray-600 text-sm">Top Performer</Text>
                <Text className="text-2xl font-bold text-[#024e32] mt-1">
                  {currentData.topPerformer}
                </Text>
                <View className="flex-row items-center mt-2">
                  <MaterialIcons name="star" size={18} color="#f59e0b" />
                  <Text className="text-amber-600 ml-1 font-medium">
                    Best performance this period
                  </Text>
                </View>
              </View>
              <MaterialIcons name="emoji-events" size={40} color="#f59e0b" />
            </View>
          </View>

          {/* CURRENT STATUS MESSAGE */}
          <View className="bg-gray-50 rounded-2xl p-6 mb-10 border border-gray-200">
            <View className="flex-row items-center mb-4">
              <MaterialIcons name="check-circle" size={24} color="#10b981" />
              <Text className="text-lg font-semibold text-gray-800 ml-3">
                Current Performance Summary
              </Text>
            </View>
            <Text className="text-gray-600 leading-6">
              The dashboard currently displays key performance indicators for your review. 
              Our team is actively working on integrating division-specific analytics 
              and advanced reporting tools to provide deeper insights into your 
              organization's performance metrics.
            </Text>
            <View className="flex-row items-center mt-4 pt-4 border-t border-gray-200">
              <MaterialIcons name="update" size={20} color="#6b7280" />
              <Text className="text-gray-500 text-sm ml-2">
                Last updated: {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}