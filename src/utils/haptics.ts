import { vibrate } from "../lib/utils";

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') {
  vibrate();
}
