import { View, Text } from 'react-native';

export default function PlaceholderScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
      <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20 }}>
        This screen is being restored. Please check back shortly.
      </Text>
    </View>
  );
}