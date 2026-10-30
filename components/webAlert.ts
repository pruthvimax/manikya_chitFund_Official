import { Alert as RNAlert, Platform } from "react-native";

/* =========================================================
   Alert that also works in the desktop browser.
   React Native's Alert.alert does nothing on the web (no popup, buttons
   never run). On phones this simply calls the normal Alert, so nothing
   changes there. In the browser it uses the browser's own confirm / alert:
     - 2+ buttons : OK runs the action button, Cancel does nothing
     - 1 / 0 button: plain message
========================================================= */
type Btn = { text?: string; style?: "default" | "cancel" | "destructive"; onPress?: (v?: any) => void };

export const Alert = {
  alert(title: string, message?: string, buttons?: Btn[], options?: any) {
    if (Platform.OS !== "web") {
      RNAlert.alert(title, message, buttons as any, options);
      return;
    }
    const text = message ? `${title}\n\n${message}` : title;
    const list = buttons || [];
    const action = list.find((b) => b.style !== "cancel" && b.onPress);
    if (list.length >= 2 && action) {
      if (typeof window !== "undefined" && window.confirm(text)) action.onPress?.();
      return;
    }
    if (typeof window !== "undefined") window.alert(text);
    list[0]?.onPress?.();
  },
};
