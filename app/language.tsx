import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, ScrollView, StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LANGUAGES, LANGUAGE_SWITCH_ENABLED, setLanguage, t, useLang } from "../components/i18n";
import { navPad } from "../components/memberDesign";

/* LANGUAGE: the member picks Kannada, English or Hindi. Only the words on a few member pages change;
   amounts, names and dates are never touched. */

const BRAND = "#024e32";

export default function LanguagePage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lang = useLang();

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F7F5" }}>
      <StatusBar barStyle="light-content" />
      <View style={{ backgroundColor: BRAND, paddingTop: (Platform.OS === "web" ? 14 : insets.top) + 10, paddingBottom: 18, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace("/menu"))} style={{ padding: 4, marginRight: 8 }}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#FFFFFF", fontSize: 19, fontWeight: "900" }}>{t("Language")} / ಭಾಷೆ / भाषा</Text>
            <Text style={{ color: "#BFE3D1", fontSize: 12, marginTop: 1 }}>{t("Choose your language")}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: navPad(30) }}>
        {!LANGUAGE_SWITCH_ENABLED ? null : (
          <>
            {LANGUAGES.map((l) => {
              const on = lang === l.key;
              return (
                <TouchableOpacity
                  key={l.key}
                  activeOpacity={0.85}
                  onPress={() => setLanguage(l.key)}
                  style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: "row", alignItems: "center", borderWidth: 2, borderColor: on ? BRAND : "transparent", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: "#0F172A" }}>{l.native}</Text>
                    <Text style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{l.english}</Text>
                  </View>
                  {on ? (
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ color: BRAND, fontWeight: "800", marginRight: 6 }}>{t("Selected")}</Text>
                      <MaterialIcons name="check-circle" size={24} color={BRAND} />
                    </View>
                  ) : (
                    <MaterialIcons name="radio-button-unchecked" size={24} color="#CBD5E1" />
                  )}
                </TouchableOpacity>
              );
            })}

          </>
        )}
      </ScrollView>
    </View>
  );
}
