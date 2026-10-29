import { GestureResponderEvent } from "react-native";

// Tiny helper so the bottom navigation can shrink while the member scrolls
// down (like Instagram) and come back when they scroll up. It only LISTENS to
// touches on the screen, so no page needs any change.

type Listener = (compact: boolean) => void;
const listeners = new Set<Listener>();

export const subscribeNavCompact = (l: Listener) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const setNavCompact = (compact: boolean) => {
  listeners.forEach((l) => l(compact));
};

let startY = 0;
let startX = 0;
let decided = false;

export const navTouchHandlers = {
  onTouchStart: (e: GestureResponderEvent) => {
    startY = e.nativeEvent.pageY;
    startX = e.nativeEvent.pageX;
    decided = false;
  },
  onTouchMove: (e: GestureResponderEvent) => {
    if (decided) return;
    const dy = e.nativeEvent.pageY - startY;
    const dx = e.nativeEvent.pageX - startX;
    if (Math.abs(dy) < 6 || Math.abs(dx) > Math.abs(dy)) return; // ignore taps and sideways swipes
    decided = true;
    // finger moving UP = page scrolls down -> small. Finger moving DOWN -> full again.
    setNavCompact(dy < 0);
  },
};
