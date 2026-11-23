"use client";

/**
 * The unread notification count, as a subscription rather than a mount effect.
 *
 * app/saved/page.tsx held it in state and wrote it from two places: a mount effect
 * (`setNotificationCount(getUnreadCount())`, which is what react-hooks/set-state-in-
 * effect reported once the saved-list effect above it was removed) and the realtime
 * status handler, which called the same thing again after adding a notification. Both
 * were copies of a value the notifications module already owns.
 *
 * WHY THE SNAPSHOT IS A NUMBER
 *   useSyncExternalStore compares snapshots with Object.is during render. Returning
 *   getNotifications() would hand it a freshly parsed array every call and React would
 *   throw "The result of getSnapshot should be cached to avoid an infinite loop". A
 *   number is a primitive, so equality holds by value and the caching question cannot
 *   be got wrong — the same reasoning as saved-listings/useIsListingSaved.
 */

import { useSyncExternalStore } from "react";
import { getUnreadCount, subscribeNotifications } from "@/lib/notifications";

/** There is no localStorage on the server; render as if there were none. */
const serverSnapshot = () => 0;

export function useUnreadNotificationCount(): number {
  return useSyncExternalStore(
    subscribeNotifications,
    getUnreadCount,
    serverSnapshot,
  );
}
