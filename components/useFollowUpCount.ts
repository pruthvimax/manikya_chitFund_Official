import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import BACKEND_URL from "../config";
import { todayStr } from "./followUp";
import { useLiveBadges } from "./useLiveBadges";

/**
 * Number of Daily Leads follow-ups that are due (today or overdue and not
 * marked done) for the logged-in employee. Used for the red badge on the
 * "Daily Leads" card of the employee home screen.
 *
 * Refreshes when the screen comes into focus, instantly when the server
 * says leads changed, and when the app returns to the foreground (which
 * also catches the date rolling over to a new day).
 */
export function useFollowUpCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem("employee");
      if (!stored) return;
      const emp = JSON.parse(stored);
      if (!emp?.emp_id) return;

      const res = await fetch(
        `${BACKEND_URL}/daily-database/follow-ups/count/${encodeURIComponent(
          emp.emp_id
        )}?today=${todayStr()}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setCount(Number(data?.dueCount) || 0);
    } catch {
      // badge is a nice-to-have, never break the screen
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useLiveBadges(true, refresh);

  return { count, refresh };
}
