'use client';
import { useEffect } from 'react';
import { useSession } from './ui';
import { api, getPosition } from '@/lib/client';

export default function LocationSync() {
  const { session } = useSession();
  useEffect(() => {
    navigator.serviceWorker?.register('/sw.js').catch(() => {});
    if (!session) return;
    const last = Number(localStorage.getItem('loc-sync') || 0);
    if (Date.now() - last < 10 * 60 * 1000) return;
    (async () => {
      try {
        const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
        if (perm && perm.state !== 'granted') return;
        await api('/api/me', await getPosition());
        localStorage.setItem('loc-sync', String(Date.now()));
      } catch {}
    })();
  }, [session]);
  return null;
}
