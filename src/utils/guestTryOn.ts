const GUEST_TRYON_KEY = "zephora_guest_tryon_count";
const FREE_TRYON_LIMIT = 1;

export function getGuestTryOnCount(): number {
  try {
    return parseInt(localStorage.getItem(GUEST_TRYON_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementGuestTryOnCount(): void {
  try {
    localStorage.setItem(
      GUEST_TRYON_KEY,
      String(getGuestTryOnCount() + 1),
    );
  } catch {
    // Ignore storage errors in private browsing.
  }
}

export function canGuestTryOn(): boolean {
  return getGuestTryOnCount() < FREE_TRYON_LIMIT;
}

export function getRemainingGuestTryOns(): number {
  return Math.max(0, FREE_TRYON_LIMIT - getGuestTryOnCount());
}
