import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import BACKEND_URL from "../config";
import { todayStr } from "./followUp";
import { useLiveBadges } from "./useLiveBadges";

/**
 * Today's collection of the logged-in employee: total amount and number of
 * payments. Reads the SAME route the Collection page uses
 * (GET /employee/:emp_id/collections-by-date?date=YYYY-MM-DD), so the number
 * always matches what that page shows. Read only.
 */
export function useTodayCollection() {
  const [data, setData] = useState({ amount: 0, count: 0, loaded: false });

  const refresh = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      const emp = stored ? JSON.parse(stored) : null;
      if (!emp?.emp_id) return;
      const res = await fetch(
        `${BACKEND_URL}/employee/${encodeURIComponent(emp.emp_id)}/collections-by-date?date=${todayStr()}`
      );
      if (!res.ok) return;
      const json = await res.json();
      setData({
        amount: Number(json?.totalAmount) || 0,
        count: Number(json?.totalCollections) || 0,
        loaded: true,
      });
    } catch {
      // a nice-to-have tile, never break the screen
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );
  // also when the app comes back to the front / reconnects
  useLiveBadges(true, refresh);

  return { ...data, refresh };
}
