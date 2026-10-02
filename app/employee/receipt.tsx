import React, { useRef, useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import ViewShot from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import * as Print from 'expo-print';

// Try to import Bluetooth printer
let BluetoothEscposPrinter: any = null;
try {
  BluetoothEscposPrinter = require('react-native-bluetooth-escpos-printer');
} catch (error) {
  console.log("Bluetooth printer module not available");
}

/* ================= PRINTER SERVICE (INTEGRATED) ================= */
let currentPrintMethod = 'none';

/* =========================================================
   Which optional lines actually apply to this receipt.

   Applied the same way everywhere a receipt gets rendered --
   the HTML for System Print, the plain-text for Bluetooth, and
   the on-screen preview that Share/RAWBT captures as an image --
   so a member who never touched a penalty, or didn't pay any
   installment today, doesn't get a receipt padded out with
   "₹ 0" lines on any device, Android or iOS.

   NOTE: the receipt now only prints Member ID, Month,
   Installment, Dividend, Paid Today, Total Installment Paid,
   Pending Installment, Total Due, and who collected it (name +
   phone) — Group ID, Due Date and the whole Penalty section were
   removed from all three renderers below, per request. Penalty
   collection itself is unaffected; it just no longer appears on
   the printed receipt. hasPenaltyActivity is kept here (unused
   by the renderers now) only in case something else reads
   getReceiptFlags later.
========================================================= */
const getReceiptFlags = (receipt: any) => ({
  hasDividend: Number(receipt?.dividendAmount) > 0,
  hasTodayInstallment: Number(receipt?.todayInstallmentPaid) > 0,
  hasPendingInstallment: Number(receipt?.pendingInstallment) > 0,
  hasTodayPenalty: Number(receipt?.todayPenaltyPaid) > 0,
  hasPendingPenalty: Number(receipt?.pendingPenalty) > 0,
  // hasPenaltyActivity controls whether the whole Penalty section
  // (divider + its rows) shows at all. Since "Paid Today (Penalty)"
  // and "Pending Penalty" are now each individually hidden when
  // they're 0 (to keep the receipt short), this only needs to check
  // those same two things -- a section with nothing left to show
  // inside it shouldn't render an empty divider either.
  hasPenaltyActivity:
    Number(receipt?.todayPenaltyPaid) > 0 ||
    Number(receipt?.pendingPenalty) > 0,
});

const generateReceiptHTML = (receipt: any) => {
  const { hasDividend, hasTodayInstallment, hasPenaltyActivity, hasTodayPenalty, hasPendingInstallment, hasPendingPenalty } = getReceiptFlags(receipt);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        /* Let the printed page use each device's normal paper size
           (Letter/A4) instead of a hard-coded tiny custom page --
           some print services (seen on Poco/Android in particular)
           clip content that doesn't fit a non-standard page rather
           than paginating it, which is why only part of the receipt
           was coming out. The receipt itself still looks like a
           narrow 58mm slip: that's this centered .receipt box.

           IMPORTANT: .receipt is centered with plain margin:auto on
           a normal block element, NOT flexbox on <body>. A flex
           container doesn't reliably paginate in print engines --
           it was clipping everything to one screen-height "page",
           which is why the header sat in blank space at the top and
           the footer never made it onto the page at all. */
        * { box-sizing: border-box; }
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          padding: 10px 0;
        }
        .receipt {
          width: 58mm;
          min-width: 58mm;
          margin: 0 auto;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .highlight { font-weight: bold; color: #000; }
        .divider {
          border-top: 1px dashed #000;
          margin: 4px 0;
          padding-top: 4px;
        }
        .header {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 2px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          margin: 1px 0;
        }
        .total {
          font-size: 14px;
          font-weight: bold;
          margin-top: 6px;
        }
        .footer {
          margin-top: 8px;
          font-size: 10px;
          text-align: center;
          color: #666;
        }
        .date-time {
          font-weight: bold;
          text-align: center;
          margin-bottom: 6px;
        }
        .address {
          font-size: 7px;
          text-align: center;
          color: #444;
          margin-top: 1px;
          line-height: 1.3;
        }
      </style>
    </head>
    <body>
    <div class="receipt">
      <div class="center header">MANIKYA CHITS PVT LTD</div>
      <div class="address">#102 Shri Siddivinayaka Complex, In Front of Government Hospital, JC Road, Sagara, Shivamogga, Karnataka - 577401</div>
      <div class="center">Payment Receipt</div>

      <div class="date-time">
        Date: ${receipt.date || 'N/A'} | Time: ${receipt.time || 'N/A'}
      </div>

      <div class="divider"></div>

      <div class="row">
        <span>Member ID:</span>
        <span>${receipt.groupMemberId || 'N/A'}</span>
      </div>
      <div class="row">
        <span>Month:</span>
        <span>M${receipt.monthIndex || 'N/A'}</span>
      </div>
      <div class="row">
        <span>Due Date:</span>
        <span>${receipt.dueDate || 'N/A'}</span>
      </div>

      <div class="divider"></div>

      <div class="row">
        <span>Installment:</span>
        <span>₹ ${receipt.installmentAmount || 0}</span>
      </div>
      ${hasDividend ? `
      <div class="row">
        <span>Dividend:</span>
        <span>₹ ${receipt.dividendAmount}</span>
      </div>
      ` : ''}

      <div class="divider"></div>

      ${hasTodayInstallment ? `
      <div class="row">
        <span>Paid Today (Inst):</span>
        <span>₹ ${receipt.todayInstallmentPaid}</span>
      </div>
      ` : ''}
      ${hasPendingInstallment ? `
      <div class="row highlight">
        <span>Pending Installment:</span>
        <span>₹ ${receipt.pendingInstallment || 0}</span>
      </div>
      ` : ''}

      ${hasPenaltyActivity ? `
      <div class="divider"></div>

      ${hasTodayPenalty ? `
      <div class="row">
        <span>Paid Today (Penalty):</span>
        <span>₹ ${receipt.todayPenaltyPaid || 0}</span>
      </div>
      ` : ''}
      ${hasPendingPenalty ? `
      <div class="row highlight">
        <span>Pending Penalty:</span>
        <span>₹ ${receipt.pendingPenalty || 0}</span>
      </div>
      ` : ''}
      ` : ''}

      <div class="divider"></div>

      <div class="row highlight">
        <span>TOTAL DUE:</span>
        <span>₹ ${receipt.totalDue || 0}</span>
      </div>

      <div class="divider"></div>

      <div class="row">
        <span>Payment Mode:</span>
        <span>${receipt.paymentMode || '-'}</span>
      </div>
      <div class="row">
        <span>Collected By:</span>
        <span>${receipt.collectedBy || '-'}</span>
      </div>
      <div class="row">
        <span>Employee Phone:</span>
        <span>${receipt.employeePhone || '-'}</span>
      </div>

      <div class="divider"></div>

      <div class="center">Thank you 🙏</div>
      <div class="center">Payment received</div>

      <div class="footer">
        <div>Computer generated receipt</div>
        <div>No signature required</div>
      </div>
    </div>
    </body>
    </html>
  `;
};

const formatReceiptText = (receipt: any) => {
  const { hasDividend, hasTodayInstallment, hasPenaltyActivity, hasTodayPenalty, hasPendingInstallment, hasPendingPenalty } = getReceiptFlags(receipt);

  return `
================================
     MANIKYA CHITS PVT LTD
 JC Road, Sagara, Shivamogga-577401
     Payment Receipt
================================
Date: ${receipt.date || 'N/A'} | Time: ${receipt.time || 'N/A'}
================================

Member ID:     ${receipt.groupMemberId || 'N/A'}
Month:         M${receipt.monthIndex || 'N/A'}
Due Date:      ${receipt.dueDate || 'N/A'}

--------------------------------
Installment:   ₹ ${receipt.installmentAmount || '0'}
${hasDividend ? `Dividend:      ₹ ${receipt.dividendAmount}\n` : ''}
--------------------------------
${hasTodayInstallment ? `Paid Today:    ₹ ${receipt.todayInstallmentPaid}\n` : ''}${hasPendingInstallment ? `PENDING INSTALLMENT: ₹ ${receipt.pendingInstallment || '0'}\n` : ''}${hasPenaltyActivity ? `--------------------------------
${hasTodayPenalty ? `Penalty Today: ₹ ${receipt.todayPenaltyPaid || '0'}\n` : ''}${hasPendingPenalty ? `PENDING PENALTY:     ₹ ${receipt.pendingPenalty || '0'}\n` : ''}` : ''}================================
TOTAL DUE:     ₹ ${receipt.totalDue || '0'}
================================
Payment Mode:  ${receipt.paymentMode || '-'}
Collected By:  ${receipt.collectedBy || '-'}
Emp Phone:     ${receipt.employeePhone || '-'}

      Thank you 🙏
================================
`;
};

// METHOD 1: SYSTEM PRINT
const printViaSystem = async (receipt: any) => {
  currentPrintMethod = 'system';

  try {
    console.log('🖨️ Trying System Print...');
    const html = generateReceiptHTML(receipt);

    // No custom width/height here on purpose: those were being read
    // as a tiny fixed page size by some Android print services (seen
    // on Poco), which clipped the receipt instead of showing it in
    // full. Letting each device use its normal page size -- with the
    // receipt's own 58mm look coming from the HTML/CSS above -- keeps
    // the header and every line printing completely, the same way on
    // iOS and on every Android device.
    await Print.printAsync({
      html: html,
      orientation: Print.Orientation.portrait,
    });

    return true;
  } catch (error) {
    console.log('❌ System Print failed:', error);
    return false;
  }
};

// METHOD 2: BLUETOOTH PRINT
const printViaBluetooth = async (receipt: any, device: any) => {
  currentPrintMethod = 'bluetooth';

  if (!BluetoothEscposPrinter || !device) return false;

  try {
    console.log('🖨️ Trying Bluetooth Print...');

    const { hasDividend, hasTodayInstallment, hasPenaltyActivity, hasTodayPenalty, hasPendingInstallment, hasPendingPenalty } = getReceiptFlags(receipt);

    const receiptText = `
================================
     MANIKYA CHITS PVT LTD
 JC Road, Sagara, Shivamogga-577401
     Payment Receipt
================================
Date: ${receipt.date || 'N/A'} | Time: ${receipt.time || 'N/A'}
================================

Member ID:     ${receipt.groupMemberId || 'N/A'}
Month:         M${receipt.monthIndex || 'N/A'}
Due Date:      ${receipt.dueDate || 'N/A'}

--------------------------------
Installment:   ₹ ${receipt.installmentAmount || '0'}
${hasDividend ? `Dividend:      ₹ ${receipt.dividendAmount}\n` : ''}
--------------------------------
${hasTodayInstallment ? `Paid Today:    ₹ ${receipt.todayInstallmentPaid}\n` : ''}${hasPendingInstallment ? `PENDING INSTALLMENT: ₹ ${receipt.pendingInstallment || '0'}\n` : ''}${hasPenaltyActivity ? `--------------------------------
${hasTodayPenalty ? `Penalty Today: ₹ ${receipt.todayPenaltyPaid || '0'}\n` : ''}${hasPendingPenalty ? `PENDING PENALTY:     ₹ ${receipt.pendingPenalty || '0'}\n` : ''}` : ''}================================
TOTAL DUE:     ₹ ${receipt.totalDue || '0'}
================================
Payment Mode:  ${receipt.paymentMode || '-'}
Collected By:  ${receipt.collectedBy || '-'}
Emp Phone:     ${receipt.employeePhone || '-'}

      Thank you 🙏
================================



`;

    await BluetoothEscposPrinter.setPrinter(0, 0, 0, 0);
    await BluetoothEscposPrinter.printText(receiptText, {});
    await BluetoothEscposPrinter.lineFeed(4);
    await BluetoothEscposPrinter.cutPaper();

    return true;
  } catch (error) {
    console.log('❌ Bluetooth Print failed:', error);
    return false;
  }
};

// METHOD 3: SHARE TO RAWBT (FALLBACK)
const printViaShare = async (receipt: any, viewShotRef: any) => {
  currentPrintMethod = 'share';

  try {
    console.log('🔄 Using Share/RAWBT fallback...');

    if (!viewShotRef.current) {
      throw new Error('Receipt not ready');
    }

    const uri = await viewShotRef.current.capture?.();

    if (!uri) {
      throw new Error('Failed to capture receipt image');
    }

    await Sharing.shareAsync(uri, {
      mimeType: "image/png",
      dialogTitle: "Send to Printer (Use RAWBT app)",
      UTI: "image/png"
    });

    return true;
  } catch (error) {
    console.log('❌ Share print failed:', error);
    return false;
  }
};

// SMART PRINT WITH FALLBACK
const smartPrint = async (receipt: any, viewShotRef: any, bluetoothDevice: any = null) => {
  console.log('🚀 Starting smart print with fallback...');

  Alert.alert("Printing", "Preparing receipt...");

  // METHOD 1: Try System Print
  try {
    const systemSuccess = await printViaSystem(receipt);
    if (systemSuccess) {
      Alert.alert("✅ Success", "Receipt sent to system printer!");
      return 'system';
    }
  } catch (error) {
    console.log('System print error:', error);
  }

  // METHOD 2: Try Bluetooth (if available)
  if (Platform.OS === 'android' && bluetoothDevice && BluetoothEscposPrinter) {
    try {
      Alert.alert("Trying", "Connecting to Bluetooth printer...");
      const bluetoothSuccess = await printViaBluetooth(receipt, bluetoothDevice);
      if (bluetoothSuccess) {
        Alert.alert("✅ Success", "Printed via Bluetooth!");
        return 'bluetooth';
      }
    } catch (error) {
      console.log('Bluetooth print error:', error);
    }
  }

  // METHOD 3: Fallback to Share/RAWBT
  try {
    Alert.alert("Fallback", "Using Share option...");
    const shareSuccess = await printViaShare(receipt, viewShotRef);
    if (shareSuccess) {
      Alert.alert("📤 Sent", "Share to RAWBT or other printer app");
      return 'share';
    }
  } catch (error) {
    console.log('Share print error:', error);
  }

  // All methods failed
  Alert.alert("❌ All Methods Failed",
    "Please try:\n1. Check printer connection\n2. Install RAWBT app\n3. Try again");
  return 'failed';
};

/* ================= MAIN COMPONENT ================= */
export default function ReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // FIX (header): this screen used to wrap everything in react-native's
  // own <SafeAreaView>, which already adds the correct top inset by
  // itself on iOS -- plus a fixed paddingTop: 50 on the header on top
  // of that, double-padding the header on notched iPhones. On Android,
  // core SafeAreaView does nothing at all, so the header relied only on
  // that fixed 50px, which doesn't match the real status bar height on
  // every device. Using useSafeAreaInsets() + a plain View (same
  // pattern already used on the other admin/employee screens) gives one
  // correct top padding on both platforms instead.
  const insets = useSafeAreaInsets();
  const headerPaddingTop = Platform.OS === "ios" ? insets.top + 12 : 48;

  // FIX (back button): same "GO_BACK action not handled" crash fixed
  // elsewhere in the app -- a bare router.back() throws when this
  // screen has no navigation history behind it (opened via a refresh
  // or a direct link). Falls back to the employee home instead.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/employee");
    }
  };

  const receiptRef = useRef<ViewShot>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(false);
  const [printMethod, setPrintMethod] = useState('none');

  let receipt: any = null;
  try {
    receipt = params.receipt ? JSON.parse(params.receipt as string) : null;
  } catch {
    receipt = null;
  }

  useEffect(() => {
    if (BluetoothEscposPrinter && Platform.OS === 'android') {
      setBluetoothAvailable(true);
      checkBluetoothStatus();
    }

    return () => {
      if (connectedDevice && BluetoothEscposPrinter) {
        try {
          BluetoothEscposPrinter.disconnect();
        } catch (error) {
          console.error("Disconnect error:", error);
        }
      }
    };
  }, []);

  const checkBluetoothStatus = async () => {
    if (!BluetoothEscposPrinter) return;

    try {
      const enabled = await BluetoothEscposPrinter.isBluetoothEnabled();
      if (!enabled) {
        console.log("Bluetooth is disabled");
      }
    } catch (error) {
      console.error("Bluetooth check error:", error);
    }
  };

  const enableBluetooth = async () => {
    if (!BluetoothEscposPrinter) {
      Alert.alert("Not Supported", "Bluetooth printing not available on this device");
      return false;
    }

    try {
      await BluetoothEscposPrinter.enableBluetooth();
      return true;
    } catch (error) {
      console.error("Enable Bluetooth error:", error);
      Alert.alert("Error", "Failed to enable Bluetooth");
      return false;
    }
  };

  /* ================= SCAN BLUETOOTH DEVICES ================= */
  const scanDevices = async () => {
    if (Platform.OS !== "android") {
      Alert.alert("Not Supported", "Bluetooth printing only available on Android");
      return;
    }

    if (!BluetoothEscposPrinter) {
      Alert.alert("Module Missing", "Bluetooth printing module not installed");
      return;
    }

    try {
      setIsScanning(true);
      const enabled = await BluetoothEscposPrinter.isBluetoothEnabled();
      if (!enabled) {
        const userConfirmed = await new Promise((resolve) => {
          Alert.alert(
            "Bluetooth Required",
            "This app needs Bluetooth to find printers. Enable Bluetooth?",
            [
              { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
              { text: "Enable", onPress: () => resolve(true) }
            ]
          );
        });

        if (!userConfirmed) {
          setIsScanning(false);
          return;
        }

        const bluetoothEnabled = await enableBluetooth();
        if (!bluetoothEnabled) {
          setIsScanning(false);
          return;
        }
      }

      // Request location permission for Android 10+
      if (Platform.OS === 'android' && Platform.Version >= 29) {
        try {
          const { PermissionsAndroid } = require('react-native');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission",
              message: "This app needs location permission to scan for Bluetooth devices",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert("Permission Denied", "Location permission is required to scan for Bluetooth devices");
            setIsScanning(false);
            return;
          }
        } catch (error) {
          console.error("Permission error:", error);
        }
      }

      // Scan for devices
      Alert.alert("Scanning", "Looking for Bluetooth printers...");
      const devicesList = await BluetoothEscposPrinter.scanDevices();

      if (devicesList && devicesList.length > 0) {
        setDevices(devicesList);
        setShowDeviceList(true);
      } else {
        Alert.alert(
          "No Printers Found",
          "No Bluetooth printers found. Make sure:\n\n1. Printer is turned ON\n2. Printer is in pairing mode\n3. Printer is within range",
          [{ text: "OK", style: "cancel" }]
        );
      }
    } catch (error) {
      console.error("Scan error:", error);
      Alert.alert("Scan Failed", "Failed to scan for Bluetooth devices. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  /* ================= CONNECT TO DEVICE ================= */
  const connectToDevice = async (device: any) => {
    if (!BluetoothEscposPrinter) return;

    try {
      setIsConnecting(true);

      if (connectedDevice) {
        await BluetoothEscposPrinter.disconnect();
      }

      Alert.alert("Connecting", `Connecting to ${device.name || 'Unknown Device'}...`);

      const connected = await BluetoothEscposPrinter.connectDevice(device.address);

      if (connected) {
        setConnectedDevice(device);
        setShowDeviceList(false);
        Alert.alert("Success", `Connected to ${device.name || 'Bluetooth Printer'}`, [
          { text: "OK" }
        ]);
      } else {
        Alert.alert("Failed", "Could not connect to the printer. Please try again.");
      }
    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert("Connection Failed", "Failed to connect to printer. Make sure the printer is ready and try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  /* ================= DISCONNECT DEVICE ================= */
  const disconnectDevice = async () => {
    if (!BluetoothEscposPrinter || !connectedDevice) return;

    try {
      await BluetoothEscposPrinter.disconnect();
      setConnectedDevice(null);
      Alert.alert("Disconnected", "Printer disconnected successfully");
    } catch (error) {
      console.error("Disconnect error:", error);
    }
  };

  /* ================= SMART PRINT FUNCTION ================= */
  const handleSmartPrint = async () => {
    if (!receipt) {
      Alert.alert("Error", "Receipt data not found");
      return;
    }

    setIsPrinting(true);

    try {
      const method = await smartPrint(
        receipt,
        receiptRef,
        connectedDevice
      );

      setPrintMethod(method);

    } catch (error) {
      console.error('Smart print error:', error);
      Alert.alert("Print Failed", "All print methods failed");
    } finally {
      setIsPrinting(false);
    }
  };

  /* ================= RENDER RECEIPT CONTENT ================= */
  const renderReceiptContent = () => {
    const { hasDividend, hasTodayInstallment, hasPenaltyActivity, hasTodayPenalty, hasPendingInstallment, hasPendingPenalty } = getReceiptFlags(receipt);

    return (
    <ViewShot
      ref={receiptRef}
      options={{
        format: "png",
        quality: 1,
        result: "tmpfile",
      }}
    >
      <View style={styles.paper}>
        <Text style={styles.title}>MANIKYA CHITS PVT LTD</Text>
        <Text style={styles.address}>
          #102 Shri Siddivinayaka Complex, In Front of Government Hospital, JC Road, Sagara, Shivamogga, Karnataka - 577401
        </Text>
        <Text style={styles.center}>Payment Receipt</Text>

        {/* DATE & TIME IN FIRST ROW */}
        <View style={styles.dateTimeRow}>
          <MaterialIcons name="calendar-today" size={16} color="#666" />
          <Text style={styles.dateTimeText}>
            Date: {receipt.date} | Time: {receipt.time}
          </Text>
        </View>

        <Divider />

        <Row label="Member ID" value={receipt.groupMemberId} />
        <Row label="Month" value={`M${receipt.monthIndex}`} />
        <Row label="Due Date" value={receipt.dueDate || "N/A"} />

        <Divider />

        <Row
          label="Installment Amount"
          value={`₹ ${receipt.installmentAmount}`}
        />

        {hasDividend && (
          <Row label="Dividend" value={`₹ ${receipt.dividendAmount}`} />
        )}

        <Divider />

        {/* INSTALLMENT SECTION -- "Paid Today" only when something was
            actually paid today; the running total and what's still
            pending always show since they're the state of the month. */}
        {hasTodayInstallment && (
          <Row
            label="Paid Today (Installment)"
            value={`₹ ${receipt.todayInstallmentPaid}`}
          />
        )}
        {/* PENDING INSTALLMENT - BOLD */}
        {hasPendingInstallment && (
          <Row
            label="Pending Installment"
            value={`₹ ${receipt.pendingInstallment || 0}`}
            bold
          />
        )}

        {/* PENALTY SECTION -- skipped entirely when this month never
            had any penalty involved, so a clean-paying member's
            receipt doesn't carry three "₹ 0" penalty lines. */}
        {hasPenaltyActivity && (
          <>
            <Divider />

            {hasTodayPenalty && (
              <Row
                label="Paid Today (Penalty)"
                value={`₹ ${receipt.todayPenaltyPaid || 0}`}
              />
            )}

            {/* PENDING PENALTY - BOLD */}
            {hasPendingPenalty && (
              <Row
                label="Pending Penalty"
                value={`₹ ${receipt.pendingPenalty || 0}`}
                bold
              />
            )}
          </>
        )}

        <Divider />

        {/* TOTAL DUE - BOLD */}
        <Row
          label="TOTAL DUE"
          value={`₹ ${receipt.totalDue}`}
          bold
        />

        <Divider />

        <Row label="Payment Mode" value={receipt.paymentMode || "-"} />
        <Row label="Collected By" value={receipt.collectedBy || "-"} />
        <Row label="Employee Phone" value={receipt.employeePhone || "-"} />

        <Divider />

        <Text style={styles.center}>Thank you 🙏</Text>
        <Text style={styles.center}>Payment received</Text>

        {/* Print method indicator */}
        {printMethod !== 'none' && (
          <View style={styles.methodIndicator}>
            <Text style={styles.methodText}>
              Last printed via: {printMethod.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </ViewShot>
    );
  };

  if (!receipt) {
    return (
      <View style={[styles.safe, { paddingTop: headerPaddingTop }]}>
        <StatusBar barStyle="light-content" backgroundColor="#024e32" />
        <Text style={{ textAlign: "center", marginTop: 40, fontSize: 16 }}>
          Receipt data not found
        </Text>
        <TouchableOpacity
          style={[styles.actionButton, styles.backButtonFull, { marginTop: 20, marginHorizontal: 20 }]}
          onPress={goBack}
        >
          <MaterialIcons name="arrow-back" size={20} color="white" />
          <Text style={styles.actionButtonText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ================= UI ================= */
  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#024e32" />
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={26} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Receipt</Text>
      </View>

      <ScrollView contentContainerStyle={styles.wrapper}>
        {/* Receipt Preview */}
        {renderReceiptContent()}

        {/* Connection Status */}
        {bluetoothAvailable && (
          <View style={styles.connectionStatus}>
            <MaterialIcons
              name={connectedDevice ? "bluetooth-connected" : "bluetooth-disabled"}
              size={24}
              color={connectedDevice ? "#4CAF50" : "#757575"}
            />
            <View style={styles.connectionInfo}>
              <Text style={styles.connectionText}>
                {connectedDevice
                  ? `Connected to: ${connectedDevice.name || 'Bluetooth Printer'}`
                  : "Bluetooth printer not connected"}
              </Text>
              {connectedDevice && (
                <TouchableOpacity onPress={disconnectDevice}>
                  <Text style={styles.disconnectText}>Disconnect</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* SMART PRINT BUTTON */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.smartPrintButton]}
            onPress={handleSmartPrint}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <MaterialIcons name="print" size={24} color="white" />
            )}
            <Text style={styles.actionButtonText}>
              {isPrinting ? "PRINTING..." : "PRINT RECEIPT"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* BACK BUTTON */}
        <TouchableOpacity
          style={[styles.actionButton, styles.backButtonFull]}
          onPress={goBack}
        >
          <MaterialIcons name="arrow-back" size={20} color="white" />
          <Text style={styles.actionButtonText}>BACK TO HOME</Text>
        </TouchableOpacity>

        {/* INSTRUCTIONS */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            <MaterialIcons name="info" size={16} color="#666" /> Smart Print tries:
          </Text>
          <Text style={styles.instructionStep}>1. System Print (Android/iOS)</Text>
          <Text style={styles.instructionStep}>2. Bluetooth Printer</Text>
          <Text style={styles.instructionStep}>3. Share to RAWBT (Fallback)</Text>
        </View>
      </ScrollView>

      {/* Device List Modal */}
      <Modal
        visible={showDeviceList}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeviceList(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Printers ({devices.length})</Text>
              <TouchableOpacity
                onPress={() => setShowDeviceList(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {isScanning ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#024e32" />
                <Text style={styles.loadingText}>Scanning for printers...</Text>
              </View>
            ) : devices.length === 0 ? (
              <View style={styles.emptyList}>
                <MaterialIcons name="devices-off" size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  No Bluetooth printers found
                </Text>
                <Text style={styles.emptySubText}>
                  Make sure your printer is:
                  {"\n"}• Turned ON
                  {"\n"}• In pairing mode
                  {"\n"}• Within range
                </Text>
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={(item) => item.address}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.deviceItem}
                    onPress={() => connectToDevice(item)}
                    disabled={isConnecting}
                  >
                    <MaterialIcons
                      name="print"
                      size={24}
                      color={isConnecting ? "#ccc" : "#024e32"}
                    />
                    <View style={styles.deviceInfo}>
                      <Text style={[
                        styles.deviceName,
                        isConnecting && styles.disabledText
                      ]}>
                        {item.name || "Unknown Printer"}
                      </Text>
                      <Text style={styles.deviceAddress}>{item.address}</Text>
                    </View>
                    {isConnecting ? (
                      <ActivityIndicator size="small" color="#024e32" />
                    ) : (
                      <MaterialIcons name="chevron-right" size={24} color="#666" />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.scanAgainButton]}
                onPress={scanDevices}
                disabled={isScanning}
              >
                <Text style={styles.scanAgainText}>
                  {isScanning ? "Scanning..." : "Scan Again"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeviceList(false)}
              >
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ================= HELPERS ================= */
function Row({ label, value, bold }: any) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#024e32",
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: { marginRight: 12 },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "600" },
  wrapper: { alignItems: "center", paddingVertical: 20, paddingBottom: 40 },
  paper: {
    width: 320,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
    marginBottom: 2,
    color: "#024e32"
  },
  address: {
    textAlign: "center",
    fontSize: 8,
    color: "#666",
    marginBottom: 4,
    lineHeight: 11,
    paddingHorizontal: 14,
  },
  center: {
    textAlign: "center",
    color: "#666",
    marginBottom: 12
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  dateTimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    marginVertical: 10
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 4
  },
  label: { fontSize: 13, color: "#555" },
  value: { fontSize: 13, fontWeight: "500" },
  bold: { fontWeight: "bold", color: "#000" },
  footer: {
    textAlign: "center",
    fontSize: 10,
    color: "#999",
    marginTop: 8,
    fontStyle: "italic"
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  connectionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  connectionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  disconnectText: {
    fontSize: 12,
    color: '#ff4444',
    marginTop: 4,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    width: '100%',
    maxWidth: 320,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 8,
    elevation: 2,
  },
  smartPrintButton: {
    backgroundColor: "#024e32",
    paddingVertical: 16,
  },
  backButtonFull: {
    backgroundColor: "#666",
    marginTop: 15,
    width: '100%',
    maxWidth: 320,
  },
  actionButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 8,
    fontSize: 16,
  },
  methodIndicator: {
    marginTop: 15,
    padding: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 4,
    alignItems: 'center',
  },
  methodText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '600',
  },
  instructions: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    width: '100%',
    maxWidth: 320,
  },
  instructionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  instructionStep: {
    fontSize: 11,
    color: '#777',
    marginLeft: 10,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  listContainer: {
    paddingBottom: 20,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 15,
  },
  deviceName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier New',
  },
  loadingContainer: {
    padding: 40,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#024e32',
    textAlign: 'center',
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanAgainButton: {
    backgroundColor: '#024e32',
  },
  scanAgainText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledText: {
    color: '#ccc',
  },
});
