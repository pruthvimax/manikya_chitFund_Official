import { Stack } from "expo-router";

export default function EmployeeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="collections" />
      <Stack.Screen name="groupMembers" />
      <Stack.Screen name="collectPayment" />
      <Stack.Screen name="paymentHistory" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="receipts" />
    </Stack>
  );
}
