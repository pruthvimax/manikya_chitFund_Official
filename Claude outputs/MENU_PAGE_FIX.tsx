// Add this wrapper to your menu.tsx file
// This fixes the white page issue on menu and dashboard pages

import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, View, StatusBar, Platform } from 'react-native';

// Wrap your existing menu page return statement with this structure:

export default function MenuPage() {
  return (
    <LinearGradient
      colors={['#e8f5ee', '#e3eef7', '#f2f7fb']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar
        barStyle={Platform.OS === "ios" ? "dark-content" : "light-content"}
        backgroundColor="transparent"
        translucent={true}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Your existing menu content here */}
      </SafeAreaView>
    </LinearGradient>
  );
}
