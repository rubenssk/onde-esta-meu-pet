'use client';
import { supabase } from './supabase';
import type { LatLng } from './format';

export async function api<T = any>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Algo deu errado. Tente de novo.');
  return json;
}

export function getPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('GPS indisponível'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
}

async function resize(file: File, max = 1280): Promise<Blob> {
  const img = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s);
  c.height = Math.round(img.height * s);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) =>
    c.toBlob((b) => (b ? res(b) : rej(new Error('Falha na foto'))), 'image/jpeg', 0.8));
}

export async function uploadPhoto(file: File, userId: string) {
  const blob = await resize(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('photos').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
}

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function pushEnabled() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  if (Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

export async function enablePush(pos?: LatLng) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window))
    throw new Error('Seu navegador não suporta alertas. No iPhone, adicione o app à Tela de Início.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permissão de notificação negada.');
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: b64ToBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    });
  }
  const p = pos ?? (await getPosition().catch(() => undefined));
  await api('/api/me', { subscription: sub.toJSON(), ...p });
}
