import { Stack } from "expo-router";
import React from "react";

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="employeesAdd" />
      <Stack.Screen name="employeesDetail" />
      <Stack.Screen name="members" />
      <Stack.Screen name="membersView" />
      <Stack.Screen name="membersAdd" />
      <Stack.Screen name="groups" />
      <Stack.Screen name="chitSchemes" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="assignGroup" />
    </Stack>
  );
}
