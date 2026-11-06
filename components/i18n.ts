import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";

/* =========================================================
   LANGUAGE SWITCH (member side): English / Kannada / Hindi

   - t("My Chits") gives the text in the chosen language. A text that has no
     translation yet is shown in English, so nothing ever disappears.
   - The choice is kept on the phone (AsyncStorage "appLanguage").
   - To REMOVE the whole feature later, set LANGUAGE_SWITCH_ENABLED to false:
     everything shows English again and the Language entry disappears.
     Nothing else in the app has to be touched.
========================================================= */

export const LANGUAGE_SWITCH_ENABLED = true;

export type Lang = "en" | "kn" | "hi";
export const LANGUAGES: { key: Lang; native: string; english: string }[] = [
  { key: "kn", native: "ಕನ್ನಡ", english: "Kannada" },
  { key: "en", native: "English", english: "English" },
  { key: "hi", native: "हिन्दी", english: "Hindi" },
];

const KEY = "appLanguage";
let current: Lang = "en";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (LANGUAGE_SWITCH_ENABLED) {
  AsyncStorage.getItem(KEY)
    .then((v) => {
      if (v === "kn" || v === "hi" || v === "en") {
        current = v;
        emit();
      }
    })
    .catch(() => {});
}

export const getLanguage = (): Lang => (LANGUAGE_SWITCH_ENABLED ? current : "en");

export const setLanguage = async (lang: Lang) => {
  current = lang;
  emit();
  try {
    await AsyncStorage.setItem(KEY, lang);
  } catch {
    // the choice still works until the app is closed
  }
};

/** call once at the top of a screen/component so it redraws when the language changes */
export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    getLanguage,
    getLanguage
  );
}

type Pair = [string, string]; // [Kannada, Hindi]

const TR: Record<string, Pair> = {
  // navigation / menu
  Language: ["ಭಾಷೆ", "भाषा"],
  "Choose your language": ["ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆರಿಸಿ", "अपनी भाषा चुनें"],
  "Menus, My Chits, Next Due, Receipts and Notifications change language": ["ಮೆನು, ನನ್ನ ಚಿಟ್ಸ್, ಮುಂದಿನ ಕಂತು, ರಸೀದಿಗಳು ಮತ್ತು ಸೂಚನೆಗಳು ಆಯ್ದ ಭಾಷೆಯಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ", "मेन्यू, मेरे चिट्स, अगली किस्त, रसीदें और सूचनाएं चुनी हुई भाषा में दिखेंगी"],
  "Amounts, names and dates stay the same": ["ಮೊತ್ತ, ಹೆಸರು ಮತ್ತು ದಿನಾಂಕಗಳು ಬದಲಾಗುವುದಿಲ್ಲ", "राशि, नाम और तारीखें वैसी ही रहेंगी"],
  Selected: ["ಆಯ್ಕೆಯಾಗಿದೆ", "चुनी गई"],
  Home: ["ಮುಖಪುಟ", "होम"],
  "My Chits": ["ನನ್ನ ಚಿಟ್ಸ್", "मेरे चिट्स"],
  "New Chits": ["ಹೊಸ ಚಿಟ್ಸ್", "नए चिट्स"],
  Auction: ["ಹರಾಜು", "नीलामी"],
  More: ["ಇನ್ನಷ್ಟು", "और"],
  "My Account Copy": ["ನನ್ನ ಖಾತೆ ಪ್ರತಿ", "मेरी खाता प्रति"],
  "My Live Payments": ["ನನ್ನ ಲೈವ್ ಪಾವತಿಗಳು", "मेरे लाइव भुगतान"],
  "My Live payments": ["ನನ್ನ ಲೈವ್ ಪಾವತಿಗಳು", "मेरे लाइव भुगतान"],
  "My Outstanding": ["ನನ್ನ ಬಾಕಿ", "मेरा बकाया"],
  "My Next Due": ["ನನ್ನ ಮುಂದಿನ ಕಂತು", "मेरी अगली किस्त"],
  "My Receipts": ["ನನ್ನ ರಸೀದಿಗಳು", "मेरी रसीदें"],
  Vacancies: ["ಖಾಲಿ ಸ್ಥಾನಗಳು", "रिक्तियां"],
  "Bid Now": ["ಈಗ ಬಿಡ್ ಮಾಡಿ", "अभी बोली लगाएं"],
  "Contact Us": ["ಸಂಪರ್ಕಿಸಿ", "संपर्क करें"],
  "Newly Commenced Groups": ["ಹೊಸದಾಗಿ ಪ್ರಾರಂಭವಾದ ಗುಂಪುಗಳು", "नए शुरू हुए ग्रुप"],
  "Auction Room": ["ಹರಾಜು ಕೊಠಡಿ", "नीलामी कक्ष"],
  "Quick Links": ["ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು", "त्वरित लिंक"],
  "Jump to any page": ["ಯಾವುದೇ ಪುಟಕ್ಕೆ ಹೋಗಿ", "किसी भी पेज पर जाएं"],
  "Member Portal": ["ಸದಸ್ಯ ಪೋರ್ಟಲ್", "सदस्य पोर्टल"],
  Profile: ["ಪ್ರೊಫೈಲ್", "प्रोफाइल"],
  Logout: ["ಲಾಗ್‌ಔಟ್", "लॉगआउट"],
  Explore: ["ಅನ್ವೇಷಿಸಿ", "देखें"],
  "Trusted Chit Fund Company Since 2020": ["2020 ರಿಂದ ನಂಬಿಕಸ್ತ ಚಿಟ್ ಫಂಡ್ ಕಂಪನಿ", "2020 से भरोसेमंद चिट फंड कंपनी"],
  "Support:": ["ಬೆಂಬಲ:", "सहायता:"],
  "Email:": ["ಇಮೇಲ್:", "ईमेल:"],
  "Working Hours:": ["ಕೆಲಸದ ಸಮಯ:", "कार्य समय:"],
  "Confirm Logout": ["ಲಾಗ್‌ಔಟ್ ದೃಢೀಕರಿಸಿ", "लॉगआउट की पुष्टि करें"],
  "Your session will be terminated": ["ನಿಮ್ಮ ಸೆಷನ್ ಕೊನೆಗೊಳ್ಳುತ್ತದೆ", "आपका सेशन समाप्त हो जाएगा"],
  "Active Groups": ["ಸಕ್ರಿಯ ಗುಂಪುಗಳು", "सक्रिय ग्रुप"],
  "Happy Customers": ["ಸಂತೃಪ್ತ ಗ್ರಾಹಕರು", "खुश ग्राहक"],
  Transactions: ["ವಹಿವಾಟುಗಳು", "लेन-देन"],
  Years: ["ವರ್ಷಗಳು", "वर्ष"],
  "Language / ಭಾಷೆ": ["ಭಾಷೆ / Language", "भाषा / Language"],

  // quick actions / vacancies
  "Live Vacancies": ["ಲೈವ್ ಖಾಲಿ ಸ್ಥಾನಗಳು", "लाइव रिक्तियां"],
  "No vacancies right now": ["ಈಗ ಖಾಲಿ ಸ್ಥಾನಗಳಿಲ್ಲ", "अभी कोई रिक्ति नहीं"],
  "New seats will show up here": ["ಹೊಸ ಸೀಟುಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ", "नई सीटें यहां दिखेंगी"],
  NEW: ["ಹೊಸ", "नया"],
  "CHIT VALUE": ["ಚಿಟ್ ಮೌಲ್ಯ", "चिट मूल्य"],
  "View vacancy": ["ಖಾಲಿ ಸ್ಥಾನ ನೋಡಿ", "रिक्ति देखें"],

  // my next due
  "What to pay next and how your chits are going": ["ಮುಂದೆ ಏನು ಪಾವತಿಸಬೇಕು ಮತ್ತು ನಿಮ್ಮ ಚಿಟ್ಸ್ ಹೇಗಿವೆ", "आगे क्या भुगतान करना है और आपके चिट्स कैसे चल रहे हैं"],
  "Could not load. Tap to try again.": ["ಲೋಡ್ ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಒತ್ತಿ.", "लोड नहीं हुआ। दोबारा कोशिश करने के लिए टैप करें।"],
  "You are not in any chit group yet.": ["ನೀವು ಇನ್ನೂ ಯಾವುದೇ ಚಿಟ್ ಗುಂಪಿನಲ್ಲಿ ಇಲ್ಲ.", "आप अभी किसी चिट ग्रुप में नहीं हैं।"],
  "NEXT PAYMENT": ["ಮುಂದಿನ ಪಾವತಿ", "अगला भुगतान"],
  "Open My Live Payments": ["ನನ್ನ ಲೈವ್ ಪಾವತಿಗಳನ್ನು ತೆರೆಯಿರಿ", "मेरे लाइव भुगतान खोलें"],
  "You are all paid up": ["ನಿಮ್ಮ ಎಲ್ಲಾ ಪಾವತಿಗಳು ಪೂರ್ಣಗೊಂಡಿವೆ", "आपका सारा भुगतान हो चुका है"],
  "Nothing is pending in any of your groups.": ["ನಿಮ್ಮ ಯಾವುದೇ ಗುಂಪಿನಲ್ಲಿ ಬಾಕಿ ಇಲ್ಲ.", "आपके किसी भी ग्रुप में कुछ बकाया नहीं है।"],
  "TOTAL DUE (ALL GROUPS)": ["ಒಟ್ಟು ಬಾಕಿ (ಎಲ್ಲಾ ಗುಂಪುಗಳು)", "कुल बकाया (सभी ग्रुप)"],
  "MY GROUPS": ["ನನ್ನ ಗುಂಪುಗಳು", "मेरे ग्रुप"],
  PAID: ["ಪಾವತಿಸಿದೆ", "चुकाया"],
  DIVIDEND: ["ಲಾಭಾಂಶ", "लाभांश"],
  "TOTAL DUE": ["ಒಟ್ಟು ಬಾಕಿ", "कुल बकाया"],
  "Everything is paid in this group.": ["ಈ ಗುಂಪಿನಲ್ಲಿ ಎಲ್ಲವೂ ಪಾವತಿಯಾಗಿದೆ.", "इस ग्रुप में सब कुछ चुका दिया गया है।"],
  "Live payments": ["ಲೈವ್ ಪಾವತಿಗಳು", "लाइव भुगतान"],
  "Account copy": ["ಖಾತೆ ಪ್ರತಿ", "खाता प्रति"],
  Receipts: ["ರಸೀದಿಗಳು", "रसीदें"],

  // my receipts
  "PAYMENT RECEIPT": ["ಪಾವತಿ ರಸೀದಿ", "भुगतान रसीद"],
  "Payment received": ["ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ", "भुगतान प्राप्त हुआ"],
  "Thank you": ["ಧನ್ಯವಾದಗಳು", "धन्यवाद"],
  Date: ["ದಿನಾಂಕ", "तारीख"],
  Group: ["ಗುಂಪು", "ग्रुप"],
  Month: ["ತಿಂಗಳು", "महीना"],
  Type: ["ಪ್ರಕಾರ", "प्रकार"],
  Mode: ["ವಿಧಾನ", "माध्यम"],
  "Collected by": ["ಸಂಗ್ರಹಿಸಿದವರು", "वसूलने वाला"],
  "Collected By": ["ಸಂಗ್ರಹಿಸಿದವರು", "वसूलने वाला"],
  Amount: ["ಮೊತ್ತ", "राशि"],
  "Total paid": ["ಒಟ್ಟು ಪಾವತಿ", "कुल भुगतान"],
  "No payments are recorded yet.": ["ಇನ್ನೂ ಯಾವುದೇ ಪಾವತಿ ದಾಖಲಾಗಿಲ್ಲ.", "अभी तक कोई भुगतान दर्ज नहीं है।"],
  "View receipt": ["ರಸೀದಿ ನೋಡಿ", "रसीद देखें"],
  Close: ["ಮುಚ್ಚಿ", "बंद करें"],
  "Paid Today (Inst)": ["ಇಂದು ಪಾವತಿ (ಕಂತು)", "आज चुकाया (किस्त)"],
  "Paid Today (Penalty)": ["ಇಂದು ಪಾವತಿ (ದಂಡ)", "आज चुकाया (जुर्माना)"],
  "Pending Installment": ["ಬಾಕಿ ಕಂತು", "बकाया किस्त"],
  "Member ID": ["ಸದಸ್ಯ ಐಡಿ", "सदस्य आईडी"],
  "Due Date": ["ಕೊನೆಯ ದಿನಾಂಕ", "देय तिथि"],
  Installment: ["ಕಂತು", "किस्त"],
  "Payment Mode": ["ಪಾವತಿ ವಿಧಾನ", "भुगतान माध्यम"],

  // my chits
  "My Chits Details": ["ನನ್ನ ಚಿಟ್ಸ್ ವಿವರ", "मेरे चिट्स का विवरण"],
  "You are not enrolled in any chits": ["ನೀವು ಯಾವುದೇ ಚಿಟ್‌ನಲ್ಲಿ ಸೇರಿಲ್ಲ", "आप किसी चिट में नामांकित नहीं हैं"],
  "Contact your group admin to join a chit": ["ಚಿಟ್‌ಗೆ ಸೇರಲು ನಿಮ್ಮ ಗುಂಪಿನ ಅಡ್ಮಿನ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ", "चिट में शामिल होने के लिए अपने ग्रुप एडमिन से संपर्क करें"],
  "Due date": ["ಕೊನೆಯ ದಿನಾಂಕ", "देय तिथि"],
  "Auction details": ["ಹರಾಜು ವಿವರಗಳು", "नीलामी विवरण"],
  "End date & time": ["ಮುಕ್ತಾಯ ದಿನಾಂಕ ಮತ್ತು ಸಮಯ", "समाप्ति तिथि और समय"],
  History: ["ಇತಿಹಾಸ", "इतिहास"],
  "View breakdown of each instalment": ["ಪ್ರತಿ ಕಂತಿನ ವಿವರ ನೋಡಿ", "हर किस्त का ब्योरा देखें"],
  "My due": ["ನನ್ನ ಬಾಕಿ", "मेरा बकाया"],
  "Pay at branch": ["ಶಾಖೆಯಲ್ಲಿ ಪಾವತಿಸಿ", "शाखा में भुगतान करें"],
  "Need help? Contact your group administrator": ["ಸಹಾಯ ಬೇಕೇ? ನಿಮ್ಮ ಗುಂಪಿನ ಅಡ್ಮಿನ್ ಅವರನ್ನು ಸಂಪರ್ಕಿಸಿ", "मदद चाहिए? अपने ग्रुप एडमिन से संपर्क करें"],
  "Auction Results": ["ಹರಾಜು ಫಲಿತಾಂಶಗಳು", "नीलामी परिणाम"],
  "Loading results...": ["ಫಲಿತಾಂಶ ಲೋಡ್ ಆಗುತ್ತಿದೆ...", "परिणाम लोड हो रहे हैं..."],
  "No results yet": ["ಇನ್ನೂ ಫಲಿತಾಂಶಗಳಿಲ್ಲ", "अभी कोई परिणाम नहीं"],
  "Winners appear here once an auction is closed": ["ಹರಾಜು ಮುಗಿದ ನಂತರ ವಿಜೇತರು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತಾರೆ", "नीलामी बंद होने के बाद विजेता यहां दिखेंगे"],
  "Group Member ID": ["ಗುಂಪು ಸದಸ್ಯ ಐಡಿ", "ग्रुप सदस्य आईडी"],
  "Winning bid": ["ಗೆದ್ದ ಬಿಡ್", "विजयी बोली"],
  "Prize amount": ["ಬಹುಮಾನದ ಮೊತ್ತ", "पुरस्कार राशि"],
  "No bids were placed in this auction": ["ಈ ಹರಾಜಿನಲ್ಲಿ ಯಾರೂ ಬಿಡ್ ಮಾಡಿಲ್ಲ", "इस नीलामी में कोई बोली नहीं लगी"],
  HIGHEST: ["ಅತ್ಯಧಿಕ", "सर्वाधिक"],
  "Chit value": ["ಚಿಟ್ ಮೌಲ್ಯ", "चिट मूल्य"],
  Instalments: ["ಕಂತುಗಳು", "किस्तें"],
  "Dividend earned": ["ಗಳಿಸಿದ ಲಾಭಾಂಶ", "अर्जित लाभांश"],
  "Payable amount": ["ಪಾವತಿಸಬೇಕಾದ ಮೊತ್ತ", "देय राशि"],
  "Paid amount": ["ಪಾವತಿಸಿದ ಮೊತ್ತ", "चुकाई गई राशि"],
  "Due amount": ["ಬಾಕಿ ಮೊತ್ತ", "बकाया राशि"],
  Status: ["ಸ್ಥಿತಿ", "स्थिति"],
  "Auction type": ["ಹರಾಜು ಪ್ರಕಾರ", "नीलामी प्रकार"],
  "Payment cycle": ["ಪಾವತಿ ಚಕ್ರ", "भुगतान चक्र"],
  "Bidding mode": ["ಬಿಡ್ಡಿಂಗ್ ವಿಧಾನ", "बोली का तरीका"],
  "Current bid": ["ಪ್ರಸ್ತುತ ಬಿಡ್", "वर्तमान बोली"],
  Instalment: ["ಕಂತು", "किस्त"],
  "Min bid": ["ಕನಿಷ್ಠ ಬಿಡ್", "न्यूनतम बोली"],
  "Max bid": ["ಗರಿಷ್ಠ ಬಿಡ್", "अधिकतम बोली"],
  "Avg rate of int": ["ಸರಾಸರಿ ಬಡ್ಡಿ ದರ", "औसत ब्याज दर"],

  // notifications
  "Live spin starts in": ["ಲೈವ್ ಸ್ಪಿನ್ ಪ್ರಾರಂಭ", "लाइव स्पिन शुरू होगा"],
  "Member Notifications": ["ಸದಸ್ಯರ ಸೂಚನೆಗಳು", "सदस्य सूचनाएं"],
  Notifications: ["ಸೂಚನೆಗಳು", "सूचनाएं"],
  Clear: ["ತೆರವುಗೊಳಿಸಿ", "साफ करें"],
  "No notifications": ["ಯಾವುದೇ ಸೂಚನೆಗಳಿಲ್ಲ", "कोई सूचना नहीं"],
  "Show all": ["ಎಲ್ಲವನ್ನೂ ತೋರಿಸಿ", "सभी दिखाएं"],
  "Pull down to refresh": ["ರಿಫ್ರೆಶ್ ಮಾಡಲು ಕೆಳಗೆ ಎಳೆಯಿರಿ", "रिफ्रेश करने के लिए नीचे खींचें"],
  Cancel: ["ರದ್ದುಮಾಡಿ", "रद्द करें"],
  All: ["ಎಲ್ಲಾ", "सभी"],
  Auctions: ["ಹರಾಜುಗಳು", "नीलामियां"],
  "Live spin": ["ಲೈವ್ ಸ್ಪಿನ್", "लाइव स्पिन"],
  Payments: ["ಪಾವತಿಗಳು", "भुगतान"],
  Notices: ["ಸೂಚನೆಗಳು", "नोटिस"],
  "Loading notifications...": ["ಸೂಚನೆಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ...", "सूचनाएं लोड हो रही हैं..."],
};

/** text in the chosen language; English (the text itself) when there is no translation */
export function t(text: string): string {
  if (!LANGUAGE_SWITCH_ENABLED || current === "en") return text;
  const row = TR[text];
  if (!row) return text;
  return (current === "kn" ? row[0] : row[1]) || text;
}
