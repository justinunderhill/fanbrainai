// Client-side web-push helpers shared by the opt-in card and the background syncer.

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** VAPID public keys are base64url; PushManager wants the raw bytes. */
export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  // Back with an explicit ArrayBuffer so the type is Uint8Array<ArrayBuffer>,
  // which is what PushManager.subscribe's applicationServerKey expects.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Ensures this browser's push subscription is stored server-side. Reuses an
 * existing subscription when present, otherwise creates one (which only prompts
 * if permission is still 'default' — call after a grant, or when already granted).
 * Idempotent: the subscribe route upserts on endpoint. Returns true on success.
 */
export async function syncPushSubscription(): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) return false;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription.toJSON()),
  });
  return response.ok;
}
