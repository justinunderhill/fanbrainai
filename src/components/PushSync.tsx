'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { pushSupported, syncPushSubscription } from '@/lib/push';

/**
 * Self-heals push state. When a signed-in user has already granted notification
 * permission, this makes sure their current browser subscription is stored
 * server-side. It covers the case the opt-in card can't — the card only shows
 * while permission is 'default', so once granted it never reappears, leaving no
 * way to recover if the subscription was never saved (an earlier save failed,
 * site data was cleared, or they granted on another device). Idempotent: the
 * subscribe route upserts on endpoint. Runs once per load; renders nothing.
 */
export function PushSync() {
  const { user } = useAuth();
  const done = useRef(false);

  useEffect(() => {
    if (!user || done.current) return;
    if (!pushSupported() || Notification.permission !== 'granted') return;
    done.current = true;
    // Re-arm on failure so a transient error can retry on the next render.
    void syncPushSubscription().catch(() => {
      done.current = false;
    });
  }, [user]);

  return null;
}
