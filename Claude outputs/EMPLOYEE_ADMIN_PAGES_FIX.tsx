// Fix for Employee and Admin pages - app/employee/index.tsx and app/admin/index.tsx

// STEP 1: Add these imports at the top of the file
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, StatusBar, Platform } from 'react-native';

// STEP 2: Wrap your entire return statement with this structure:

export default function EmployeePage() {
  // Your existing state and logic here...

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
        {/* ALL your existing page content goes here */}
        {/* Just wrap what you currently have in this LinearGradient and SafeAreaView */}
      </SafeAreaView>
    </LinearGradient>
  );
}

// ================================================================
// SAME FOR ADMIN PAGES - Use identical wrapper in:
// - app/admin/index.tsx
// - app/admin/login.tsx
// - app/admin/employees.tsx
// - app/admin/membersView.tsx
// - And all other admin pages
// ================================================================
