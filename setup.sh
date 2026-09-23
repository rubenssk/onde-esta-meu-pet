#!/usr/bin/env bash
set -e
echo "🐾 Criando o app Onde Está Meu Pet?..."
mkdir -p public src/lib src/components src/app/entrar src/app/perdi src/app/encontrei src/app/components src/app/perto \
  "src/app/pet/[id]" "src/app/ocorrencia/[id]" "src/app/api/reports/[id]/sightings" "src/app/api/reports/[id]/resolve" src/app/api/me

cat > package.json <<'__FIM__'
{
  "name": "onde-esta-meu-pet",
  "private": true,
  "scripts": { "dev": "next dev", "build": "next build", "start": "next start" },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "leaflet": "^1.9.4",
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-leaflet": "^4.2.1",
    "web-push": "^3.6.7"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/web-push": "^3.6.3",
    "typescript": "^5.5.0"
  }
}
__FIM__

cat > tsconfig.json <<'__FIM__'
{
  "compilerOptions": {
    "target": "ES2020", "lib": ["dom", "dom.iterable", "esnext"], "allowJs": false,
    "skipLibCheck": true, "strict": true, "noEmit": true, "esModuleInterop": true,
    "module": "esnext", "moduleResolution": "bundler", "resolveJsonModule": true,
    "isolatedModules": true, "jsx": "preserve", "incremental": true,
    "plugins": [{ "name": "next" }], "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
__FIM__

cat > next.config.js <<'__FIM__'
/** @type {import('next').NextConfig} */
module.exports = { reactStrictMode: true };
__FIM__

cat > next-env.d.ts <<'__FIM__'
/// <reference types="next" />
/// <reference types="next/image-types/global" />
__FIM__

cat > .gitignore <<'__FIM__'
node_modules
.next
.env*.local
*.tsbuildinfo
__FIM__

cat > public/manifest.json <<'__FIM__'
{
  "name": "Onde Está Meu Pet?",
  "short_name": "Meu Pet",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fff8f3",
  "theme_color": "#ff6b35",
  "icons": [{ "src": "/icon.svg", "sizes": "any", "type": "image/svg+xml", "purpose": "any" }]
}
__FIM__

cat > public/icon.svg <<'__FIM__'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#ff6b35"/><text x="50%" y="56%" font-size="300" text-anchor="middle" dominant-baseline="middle">🐾</text></svg>
__FIM__

cat > public/sw.js <<'__FIM__'
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(d.title || 'Onde Está Meu Pet?', {
    body: d.body,
    icon: '/icon.svg',
    image: d.image || undefined,
    tag: d.tag,
    renotify: !!d.tag,
    vibrate: [200, 100, 200],
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) if ('focus' in c) { c.navigate(url); return c.focus(); }
      return self.clients.openWindow(url);
    }),
  );
});
__FIM__

cat > src/lib/format.ts <<'__FIM__'
export type LatLng = { lat: number; lng: number };

export const SPECIES = {
  dog:   { label: 'Cachorro', noun: 'cachorro', emoji: '🐶' },
  cat:   { label: 'Gato',     noun: 'gato',     emoji: '🐱' },
  other: { label: 'Outro',    noun: 'animal',   emoji: '🐾' },
} as const;
export type Species = keyof typeof SPECIES;

export const SIZES = { small: 'Pequeno', medium: 'Médio', large: 'Grande' } as const;

export const BRAZIL: LatLng = { lat: -14.235, lng: -51.925 };

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(50, Math.round(m / 50) * 50)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
}

export function haversine(a: LatLng, b: LatLng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora mesmo';
  const m = s / 60; if (m < 60) return `há ${Math.floor(m)} min`;
  const h = m / 60; if (h < 24) return `há ${Math.floor(h)} h`;
  const d = Math.floor(h / 24); return d === 1 ? 'ontem' : `há ${d} dias`;
}

export function place(r: { city?: string | null; state?: string | null }) {
  return [r.city, r.state].filter(Boolean).join('/') || 'Local no mapa';
}

export function whatsapp(phone: string, text: string) {
  let d = phone.replace(/\D/g, '');
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
__FIM__

cat > src/lib/supabase.ts <<'__FIM__'
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
__FIM__

cat > src/lib/client.ts <<'__FIM__'
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
__FIM__

cat > src/lib/server.ts <<'__FIM__'
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';

let _db: SupabaseClient | null = null;
export function db() {
  if (!_db) _db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
  return _db;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function handle(fn: (req: Request, ctx: any) => Promise<Response>) {
  return async (req: Request, ctx: any) => {
    try { return await fn(req, ctx); }
    catch (e: any) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error(e);
      return Response.json({ error: status === 500 ? 'Erro interno' : e.message }, { status });
    }
  };
}

export async function requireUser(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new HttpError(401, 'Faça login para continuar');
  const { data, error } = await db().auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sessão expirada. Entre novamente.');
  return data.user;
}

export const clean = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

export function coords(b: any) {
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    throw new HttpError(400, 'Localização inválida');
  return { lat, lng };
}

export const isOwnPhoto = (u: unknown) =>
  typeof u === 'string' &&
  u.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/`);

export async function reverseGeocode(lat: number, lng: number) {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=pt-BR`,
      { headers: { 'User-Agent': `OndeEstaMeuPet/1.0 (${process.env.VAPID_SUBJECT})` }, signal: AbortSignal.timeout(4000) },
    );
    const a = (await r.json()).address ?? {};
    const iso: string | undefined = a['ISO3166-2-lvl4'];
    return {
      city: a.city ?? a.town ?? a.village ?? a.municipality ?? null,
      state: iso?.startsWith('BR-') ? iso.slice(3) : a.state ?? null,
    };
  } catch {
    return { city: null, state: null };
  }
}

export type PushPayload = { title: string; body: string; url: string; image?: string | null; tag?: string };
type Sub = { endpoint: string; p256dh: string; auth: string };

let vapidReady = false;
function initVapid() {
  if (vapidReady) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  vapidReady = true;
}

export async function sendPush(items: { sub: Sub; payload: PushPayload }[]) {
  if (!items.length) return;
  initVapid();
  const dead: string[] = [];
  for (let i = 0; i < items.length; i += 50) {
    await Promise.allSettled(items.slice(i, i + 50).map(({ sub, payload }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 6 * 3600, urgency: 'high' },
      ).catch((e: any) => {
        if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(sub.endpoint);
      })));
  }
  if (dead.length) await db().from('push_subscriptions').delete().in('endpoint', dead);
}

export async function pushToUser(userId: string, payload: PushPayload) {
  const { data } = await db().from('push_subscriptions').select('endpoint,p256dh,auth').eq('user_id', userId);
  await sendPush((data ?? []).map((sub) => ({ sub, payload })));
}
__FIM__

cat > src/app/api/reports/route.ts <<'__FIM__'
import { db, handle, HttpError, requireUser, reverseGeocode, sendPush, pushToUser, clean, coords, isOwnPhoto } from '@/lib/server';
import { SPECIES, Species, formatDistance } from '@/lib/format';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SEARCH_RADIUS: Record<Species, number> = { dog: 3000, cat: 1500, other: 2000 };
const MATCH_MIN = 0.4;

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const b = await req.json();

  const kind = b.kind;
  if (kind !== 'lost' && kind !== 'found') throw new HttpError(400, 'Tipo inválido');
  const species = b.species as Species;
  if (!(species in SPECIES)) throw new HttpError(400, 'Espécie inválida');
  if (!isOwnPhoto(b.photo_url)) throw new HttpError(400, 'A foto é obrigatória');
  const petName = clean(b.pet_name, 40);
  if (kind === 'lost' && !petName) throw new HttpError(400, 'Informe o nome do pet');
  const { lat, lng } = coords(b);

  let happened = b.happened_at ? new Date(b.happened_at) : new Date();
  if (isNaN(happened.getTime()) || happened.getTime() > Date.now()) happened = new Date();

  const geo = await reverseGeocode(lat, lng);

  const { data: report, error } = await db().from('reports').insert({
    kind, species, user_id: user.id,
    pet_name: kind === 'lost' ? petName : null,
    color: clean(b.color, 60),
    size: ['small', 'medium', 'large'].includes(b.size) ? b.size : null,
    description: clean(b.description, 500),
    contact_phone: clean(b.contact_phone, 20),
    photo_url: b.photo_url,
    lat, lng, city: geo.city, state: geo.state,
    happened_at: happened.toISOString(),
    search_radius_m: kind === 'lost' ? SEARCH_RADIUS[species] : 2000,
  }).select().single();
  if (error) throw error;

  await Promise.allSettled([alertNearby(report), processMatches(report)]);
  return Response.json({ id: report.id });
});

async function alertNearby(r: any) {
  const { data, error } = await db().rpc('alert_targets', { p_report: r.id });
  if (error) return console.error(error);
  const sp = SPECIES[r.species as Species];
  await sendPush((data ?? []).map((t: any) => ({
    sub: t,
    payload: r.kind === 'lost'
      ? { title: `${sp.emoji} Tem um animal perdido perto de você`,
          body: `Ajude a encontrar ${r.pet_name} — ${formatDistance(t.distance_m)} de você`,
          url: `/pet/${r.id}`, image: r.photo_url, tag: `r-${r.id}` }
      : { title: `${sp.emoji} Um animal foi encontrado perto de você`,
          body: `Você conhece este ${sp.noun}? — ${formatDistance(t.distance_m)} de você`,
          url: `/pet/${r.id}`, image: r.photo_url, tag: `r-${r.id}` },
  })));
}

async function processMatches(r: any) {
  const { data, error } = await db().rpc('find_matches', { p_report: r.id });
  if (error) return console.error(error);
  const top = (data ?? [])
    .filter((m: any) => m.score >= MATCH_MIN)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);
  if (!top.length) return;

  const { data: inserted } = await db().from('matches')
    .upsert(top, { onConflict: 'lost_id,found_id', ignoreDuplicates: true })
    .select();

  const ids = top.flatMap((m: any) => [m.lost_id, m.found_id]);
  const { data: reps } = await db().from('reports').select('id,user_id,pet_name,species,photo_url').in('id', ids);
  const byId = new Map((reps ?? []).map((x: any) => [x.id, x]));

  await Promise.allSettled((inserted ?? []).map(async (m: any) => {
    const lost: any = byId.get(m.lost_id), found: any = byId.get(m.found_id);
    if (!lost || !found) return;
    const d = formatDistance(m.distance_m);
    const noun = SPECIES[lost.species as Species].noun;
    await pushToUser(lost.user_id, {
      title: `🔎 Possível correspondência para ${lost.pet_name}`,
      body: `Um ${noun} foi encontrado a ${d} de onde ${lost.pet_name} sumiu. Confira!`,
      url: `/ocorrencia/${lost.id}`, image: found.photo_url, tag: `m-${m.id}`,
    });
    if (found.user_id !== lost.user_id) {
      await pushToUser(found.user_id, {
        title: '🔎 Este animal pode ser um pet perdido',
        body: `${lost.pet_name} está desaparecido a ${d} daqui. Confira!`,
        url: `/ocorrencia/${found.id}`, image: lost.photo_url, tag: `m-${m.id}`,
      });
    }
  }));
}
__FIM__

cat > "src/app/api/reports/[id]/sightings/route.ts" <<'__FIM__'
import { db, handle, HttpError, requireUser, pushToUser, clean, coords, isOwnPhoto } from '@/lib/server';
import { formatDistance, haversine } from '@/lib/format';

export const runtime = 'nodejs';

export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const b = await req.json();
  const kind = b.kind === 'found' ? 'found' : 'seen';
  const pos = coords(b);

  const { data: r } = await db().from('reports').select('*').eq('id', ctx.params.id).maybeSingle();
  if (!r || r.status !== 'open' || r.kind !== 'lost') throw new HttpError(404, 'Ocorrência não está mais ativa');

  const { error } = await db().from('sightings').insert({
    report_id: r.id, user_id: user.id, kind, ...pos,
    note: clean(b.note, 300),
    contact_phone: clean(b.contact_phone, 20),
    photo_url: isOwnPhoto(b.photo_url) ? b.photo_url : null,
  });
  if (error) throw error;

  if (r.user_id !== user.id) {
    const d = formatDistance(haversine(r, pos));
    await pushToUser(r.user_id, kind === 'found'
      ? { title: `🎉 Alguém encontrou ${r.pet_name}!`,
          body: 'Veja onde e fale com quem encontrou.',
          url: `/ocorrencia/${r.id}`, tag: `s-${r.id}` }
      : { title: `👀 Alguém viu ${r.pet_name}!`,
          body: `Novo avistamento a ${d} de onde sumiu. Toque para ver no mapa.`,
          url: `/ocorrencia/${r.id}`, tag: `s-${r.id}` });
  }
  return Response.json({ ok: true });
});
__FIM__

cat > "src/app/api/reports/[id]/resolve/route.ts" <<'__FIM__'
import { db, handle, HttpError, requireUser } from '@/lib/server';

export const POST = handle(async (req, ctx) => {
  const user = await requireUser(req);
  const { data } = await db().from('reports')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', ctx.params.id).eq('user_id', user.id).eq('status', 'open')
    .select('id');
  if (!data?.length) throw new HttpError(404, 'Ocorrência não encontrada');
  return Response.json({ ok: true });
});
__FIM__

cat > src/app/api/me/route.ts <<'__FIM__'
import { db, handle, requireUser } from '@/lib/server';

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const b = await req.json();
  const lat = Number(b.lat), lng = Number(b.lng);
  const hasPos = b.lat != null && isFinite(lat) && isFinite(lng);

  await db().from('profiles').upsert(
    hasPos ? { id: user.id, lat, lng, location_updated_at: new Date().toISOString() } : { id: user.id },
    { onConflict: 'id', ignoreDuplicates: !hasPos },
  );

  const s = b.subscription;
  if (s?.endpoint && s?.keys?.p256dh && s?.keys?.auth) {
    await db().from('push_subscriptions').upsert(
      { endpoint: s.endpoint, user_id: user.id, p256dh: s.keys.p256dh, auth: s.keys.auth },
      { onConflict: 'endpoint' },
    );
  }
  return Response.json({ ok: true });
});
__FIM__

cat > src/components/ui.tsx <<'__FIM__'
'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export function useRequireAuth() {
  const s = useSession();
  const router = useRouter();
  useEffect(() => {
    if (s.ready && !s.session)
      router.replace(`/entrar?next=${encodeURIComponent(location.pathname)}`);
  }, [s.ready, s.session, router]);
  return s;
}

export function TopBar({ title }: { title: string }) {
  return <header className="topbar"><Link href="/" aria-label="Início">←</Link><b>{title}</b></header>;
}

export function PhotoField({ file, onChange, label }: { file: File | null; onChange: (f: File | null) => void; label: string }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  return (
    <label className="photo">
      {preview ? <img src={preview} alt="" /> : <span>📷<b>{label}</b></span>}
      <input type="file" accept="image/*" hidden onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}

export function Choice<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T | ''; onChange: (v: T) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o.value} className={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Loading = () => <p className="content meta">Carregando…</p>;
__FIM__

cat > src/components/PetMap.tsx <<'__FIM__'
'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from '@/lib/format';

export type PinType = 'lost' | 'found' | 'seen' | 'me' | 'pick';
export type Pin = LatLng & { id: string; type: PinType; photo?: string | null; label?: string; highlight?: boolean; onClick?: () => void };
export type Area = LatLng & { radius: number; color?: string };

const EMOJI: Record<PinType, string> = { lost: '🐾', found: '🤲', seen: '👀', me: '', pick: '📍' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function makeIcon(p: Pin) {
  const size = p.type === 'me' ? 18 : p.type === 'seen' ? 34 : 46;
  const inner = p.photo ? `<img src="${esc(p.photo)}" alt=""/>` : EMOJI[p.type];
  return L.divIcon({
    className: '',
    html: `<div class="pin pin-${p.type}${p.highlight ? ' pin-hl' : ''}" style="width:${size}px;height:${size}px">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, p.type === 'pick' ? size : size / 2],
  });
}

function Controller({ center, zoom, fit, onPick }: { center: LatLng; zoom?: number; fit?: LatLng[]; onPick?: (p: LatLng) => void }) {
  const map = useMap();
  const fitted = useRef(false);
  useMapEvents({ click(e) { onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  useEffect(() => {
    if (!fit) map.setView([center.lat, center.lng], zoom ?? map.getZoom());
  }, [center.lat, center.lng, zoom]); // eslint-disable-line
  useEffect(() => {
    if (!fit?.length || fitted.current) return;
    fitted.current = true;
    if (fit.length === 1) map.setView([fit[0].lat, fit[0].lng], 15);
    else map.fitBounds(L.latLngBounds(fit.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
  }, [fit, map]);
  return null;
}

export default function PetMap({ center, zoom = 14, pins = [], areas = [], onPick, fit, height = 300 }: {
  center: LatLng; zoom?: number; pins?: Pin[]; areas?: Area[]; onPick?: (p: LatLng) => void; fit?: LatLng[]; height?: number;
}) {
  return (
    <div className="map" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {areas.map((a, i) => (
          <Circle key={i} center={[a.lat, a.lng]} radius={a.radius}
            pathOptions={{ color: a.color ?? '#ff6b35', fillOpacity: 0.08, weight: 2, dashArray: '6 6' }} />
        ))}
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(p)}
            eventHandlers={p.onClick ? { click: p.onClick } : undefined}>
            {p.label && <Tooltip direction="top" offset={[0, -20]}>{p.label}</Tooltip>}
          </Marker>
        ))}
        <Controller center={center} zoom={zoom} fit={fit} onPick={onPick} />
      </MapContainer>
    </div>
  );
}
__FIM__

cat > src/components/LocationField.tsx <<'__FIM__'
'use client';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { BRAZIL, LatLng } from '@/lib/format';
import { getPosition } from '@/lib/client';

const PetMap = dynamic(() => import('./PetMap'), { ssr: false, loading: () => <div className="map skeleton" style={{ height: 240 }} /> });

export default function LocationField({ value, onChange, label }: { value: LatLng | null; onChange: (p: LatLng) => void; label: string }) {
  const [center, setCenter] = useState<LatLng>(value ?? BRAZIL);
  const [zoom, setZoom] = useState(value ? 16 : 4);
  const [status, setStatus] = useState('');

  const locate = () => {
    setStatus('Buscando sua localização…');
    getPosition()
      .then((p) => { setCenter(p); setZoom(16); onChange(p); setStatus(''); })
      .catch(() => setStatus('Sem GPS. Toque no mapa para marcar o local.'));
  };
  useEffect(() => { if (!value) locate(); }, []); // eslint-disable-line

  return (
    <div className="field">
      <label>{label}</label>
      <PetMap center={center} zoom={zoom} height={240} onPick={onChange}
        pins={value ? [{ id: 'pick', type: 'pick', ...value }] : []} />
      <div className="row">
        <button type="button" className="chip" onClick={locate}>📍 Minha localização</button>
        <small>{status || 'Toque no mapa para ajustar'}</small>
      </div>
    </div>
  );
}
__FIM__

cat > src/components/LocationSync.tsx <<'__FIM__'
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
__FIM__

cat > src/app/layout.tsx <<'__FIM__'
import './globals.css';
import type { Metadata, Viewport } from 'next';
import LocationSync from '@/components/LocationSync';

export const metadata: Metadata = {
  title: 'Onde Está Meu Pet?',
  description: 'Vizinhos ajudando pets perdidos a voltarem para casa.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Meu Pet', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};
export const viewport: Viewport = { themeColor: '#ff6b35', width: 'device-width', initialScale: 1, maximumScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body><main className="app">{children}</main><LocationSync /></body>
    </html>
  );
}
__FIM__

cat > src/app/page.tsx <<'__FIM__'
'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { enablePush, pushEnabled } from '@/lib/client';
import { SPECIES, Species, timeAgo } from '@/lib/format';
import { useSession } from '@/components/ui';

export default function Home() {
  const { session } = useSession();
  const router = useRouter();
  const [mine, setMine] = useState<any[]>([]);
  const [push, setPush] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { pushEnabled().then(setPush); }, []);
  useEffect(() => {
    if (!session) return;
    supabase.from('reports').select('id,kind,pet_name,species,photo_url,created_at')
      .eq('user_id', session.user.id).eq('status', 'open').order('created_at', { ascending: false })
      .then(({ data }) => setMine(data ?? []));
  }, [session]);

  async function activate() {
    if (!session) return router.push('/entrar?next=/');
    try { await enablePush(); setPush(true); setMsg('🔔 Pronto! Você será avisado sobre pets perdidos perto de você.'); }
    catch (e: any) { setMsg(e.message); }
  }

  return (
    <>
      <header className="hero">
        <div className="logo">🐾</div>
        <h1>Onde Está Meu Pet?</h1>
        <p>Vizinhos ajudando pets a voltarem para casa.</p>
      </header>

      <nav className="big-actions">
        <Link href="/perdi" className="big lost">😢<span>Perdi meu pet</span></Link>
        <Link href="/encontrei" className="big found">🤲<span>Encontrei um animal</span></Link>
        <Link href="/perto" className="big near">📍<span>Ver pets perto de mim</span></Link>
      </nav>

      <div className="content">
        {push === false && <button className="btn primary" onClick={activate}>🔔 Avise-me de pets perdidos perto de mim</button>}
        {msg && <div className="success">{msg}</div>}

        {mine.length > 0 && (
          <>
            <h2>Minhas ocorrências</h2>
            {mine.map((r) => (
              <Link key={r.id} href={`/ocorrencia/${r.id}`} className="card">
                <img src={r.photo_url} alt="" />
                <div>
                  <div className="t">{SPECIES[r.species as Species].emoji} {r.kind === 'lost' ? r.pet_name : 'Animal encontrado'}</div>
                  <div className="s">📡 Acompanhar · {timeAgo(r.created_at)}</div>
                </div>
              </Link>
            ))}
          </>
        )}
      </div>

      <footer>
        {session
          ? <button onClick={() => supabase.auth.signOut()}>Sair ({session.user.email})</button>
          : <Link href="/entrar">Entrar</Link>}
      </footer>
    </>
  );
}
__FIM__

cat > src/app/entrar/page.tsx <<'__FIM__'
'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TopBar, useSession } from '@/components/ui';

function nextPath() {
  const n = new URLSearchParams(location.search).get('next') || '/';
  return n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

export default function Entrar() {
  const router = useRouter();
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (session) router.replace(nextPath()); }, [session, router]);

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/entrar?next=${encodeURIComponent(nextPath())}` },
    });
    setBusy(false);
    error ? setErr(error.message) : setSent(true);
  }

  return (
    <>
      <TopBar title="Entrar" />
      <div className="content">
        {sent ? (
          <div className="success">
            📬 Enviamos um link para <b>{email}</b>. Abra o e-mail e toque em “Log In” para entrar.
          </div>
        ) : (
          <form onSubmit={send}>
            <p className="meta">Sem senha: enviamos um link de acesso para seu e-mail.</p>
            <div className="field"><label>Seu e-mail</label>
              <input type="email" inputMode="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn primary" disabled={busy}>{busy ? 'Enviando…' : 'Receber link'}</button>
          </form>
        )}
        {err && <p className="err">{err}</p>}
      </div>
    </>
  );
}
__FIM__

cat > src/app/perdi/page.tsx <<'__FIM__'
import ReportForm from '../components/ReportForm';
export default function Page() { return <ReportForm kind="lost" />; }
__FIM__

cat > src/app/encontrei/page.tsx <<'__FIM__'
import ReportForm from '../components/ReportForm';
export default function Page() { return <ReportForm kind="found" />; }
__FIM__

cat > src/app/components/ReportForm.tsx <<'__FIM__'
'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, enablePush, uploadPhoto } from '@/lib/client';
import { LatLng, Species } from '@/lib/format';
import { Choice, PhotoField, TopBar, useRequireAuth } from '@/components/ui';
import LocationField from '@/components/LocationField';

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function ReportForm({ kind }: { kind: 'lost' | 'found' }) {
  const { session } = useRequireAuth();
  const router = useRouter();
  const lost = kind === 'lost';

  const [file, setFile] = useState<File | null>(null);
  const [species, setSpecies] = useState<Species>('dog');
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [size, setSize] = useState<'small' | 'medium' | 'large' | ''>('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [when, setWhen] = useState(() => toLocalInput(new Date()));
  const [pos, setPos] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!session) return;
    if (!file) return setErr('Adicione uma foto');
    if (lost && !name.trim()) return setErr('Informe o nome do pet');
    if (!pos) return setErr('Marque o local no mapa');

    const pushReady = enablePush(pos).catch(() => {});
    setBusy(true);
    try {
      const photo_url = await uploadPhoto(file, session.user.id);
      const { id } = await api<{ id: string }>('/api/reports', {
        kind, species, pet_name: name, color, size: size || null, description,
        contact_phone: phone, photo_url, lat: pos.lat, lng: pos.lng,
        happened_at: new Date(when).toISOString(),
      });
      await pushReady;
      router.replace(`/ocorrencia/${id}`);
    } catch (e: any) {
      setErr(e.message); setBusy(false);
    }
  }

  return (
    <>
      <TopBar title={lost ? 'Perdi meu pet' : 'Encontrei um animal'} />
      <form className="content" onSubmit={submit}>
        <PhotoField file={file} onChange={setFile} label={lost ? 'Foto do seu pet' : 'Foto do animal'} />

        <div className="field"><label>Qual animal?</label>
          <Choice value={species} onChange={setSpecies} options={[
            { value: 'dog', label: '🐶 Cachorro' }, { value: 'cat', label: '🐱 Gato' }, { value: 'other', label: '🐾 Outro' }]} />
        </div>

        {lost && (
          <div className="field"><label>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Thor" maxLength={40} />
          </div>
        )}

        <div className="field"><label>Cor</label>
          <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Ex.: caramelo com branco" maxLength={60} />
        </div>

        <div className="field"><label>Porte</label>
          <Choice value={size} onChange={setSize} options={[
            { value: 'small', label: 'Pequeno' }, { value: 'medium', label: 'Médio' }, { value: 'large', label: 'Grande' }]} />
        </div>

        <LocationField value={pos} onChange={setPos} label={lost ? 'Onde foi visto pela última vez?' : 'Onde você encontrou?'} />

        <div className="field"><label>{lost ? 'Quando sumiu?' : 'Quando encontrou?'}</label>
          <input type="datetime-local" value={when} max={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} />
        </div>

        <div className="field"><label>Detalhes (opcional)</label>
          <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder={lost ? 'Coleira azul, atende pelo nome…' : 'Está comigo / ficou na praça…'} maxLength={500} />
        </div>

        <div className="field"><label>WhatsApp para contato (opcional)</label>
          <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 91234-5678" />
        </div>

        {err && <p className="err">{err}</p>}
        <button className={`btn ${lost ? 'primary' : 'ok'}`} disabled={busy}>
          {busy ? 'Enviando…' : lost ? '📣 Avisar vizinhos agora' : '🔎 Procurar o tutor'}
        </button>
      </form>
    </>
  );
}
__FIM__

cat > src/app/perto/page.tsx <<'__FIM__'
'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getPosition } from '@/lib/client';
import { BRAZIL, LatLng, SPECIES, Species, formatDistance, place, timeAgo } from '@/lib/format';
import { Choice, TopBar } from '@/components/ui';
import type { Pin } from '@/components/PetMap';

const PetMap = dynamic(() => import('@/components/PetMap'), { ssr: false, loading: () => <div className="map skeleton" style={{ height: 320 }} /> });
const ZOOM: Record<string, number> = { '1000': 15, '5000': 13, '20000': 11, '100000': 9 };

export default function Perto() {
  const router = useRouter();
  const [center, setCenter] = useState<LatLng | null>(null);
  const [noGps, setNoGps] = useState(false);
  const [radius, setRadius] = useState('5000');
  const [items, setItems] = useState<any[] | null>(null);

  useEffect(() => {
    getPosition().then(setCenter).catch(() => { setCenter(BRAZIL); setNoGps(true); setRadius('100000'); });
  }, []);

  useEffect(() => {
    if (!center) return;
    if (noGps && center === BRAZIL) { setItems([]); return; }
    supabase.rpc('nearby_reports', { p_lat: center.lat, p_lng: center.lng, p_radius_m: Number(radius) })
      .then(({ data }) => setItems(data ?? []));
  }, [center, radius, noGps]);

  const pins: Pin[] = [
    ...(center && center !== BRAZIL ? [{ id: 'me', type: 'me' as const, ...center }] : []),
    ...(items ?? []).map((r) => ({
      id: r.id, type: r.kind, lat: r.lat, lng: r.lng, photo: r.photo_url,
      label: r.kind === 'lost' ? r.pet_name : 'Encontrado',
      onClick: () => router.push(`/pet/${r.id}`),
    })),
  ];

  return (
    <>
      <TopBar title="Pets perto de mim" />
      <div className="content">
        {center && (
          <PetMap center={center} zoom={noGps && center === BRAZIL ? 4 : ZOOM[radius]} height={320} pins={pins}
            areas={center !== BRAZIL ? [{ ...center, radius: Number(radius), color: '#3b5bdb' }] : []}
            onPick={noGps ? setCenter : undefined} />
        )}
        {noGps && <p className="meta">Sem GPS: toque no mapa para escolher a região.</p>}
        <div className="row">
          <Choice value={radius} onChange={setRadius} options={[
            { value: '1000', label: '1 km' }, { value: '5000', label: '5 km' },
            { value: '20000', label: '20 km' }, { value: '100000', label: '100 km' }]} />
        </div>

        <h2>{items === null ? 'Buscando…' : items.length ? `${items.length} por perto` : 'Nenhum pet por perto 🎉'}</h2>
        {(items ?? []).map((r) => {
          const sp = SPECIES[r.species as Species];
          return (
            <Link key={r.id} href={`/pet/${r.id}`} className="card">
              <img src={r.photo_url} alt="" />
              <div>
                <span className={`badge ${r.kind}`}>{r.kind === 'lost' ? 'PERDIDO' : 'ENCONTRADO'}</span>
                <div className="t">{sp.emoji} {r.kind === 'lost' ? r.pet_name : `${sp.label} encontrado`}</div>
                <div className="s">📍 {formatDistance(r.distance_m)} · {timeAgo(r.happened_at)} · {place(r)}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
__FIM__

cat > "src/app/pet/[id]/page.tsx" <<'__FIM__'
'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api, getPosition, uploadPhoto } from '@/lib/client';
import { LatLng, SIZES, SPECIES, Species, formatDistance, haversine, place, timeAgo, whatsapp } from '@/lib/format';
import { Loading, PhotoField, TopBar, useSession } from '@/components/ui';
import LocationField from '@/components/LocationField';
import type { Pin } from '@/components/PetMap';

const PetMap = dynamic(() => import('@/components/PetMap'), { ssr: false, loading: () => <div className="map skeleton" style={{ height: 220 }} /> });

export default function PetPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const [r, setR] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [me, setMe] = useState<LatLng | null>(null);
  const [sheet, setSheet] = useState<null | 'seen' | 'found'>(null);
  const [done, setDone] = useState('');

  useEffect(() => {
    supabase.from('reports').select('*').eq('id', id).maybeSingle()
      .then(({ data }) => (data ? setR(data) : setMissing(true)));
    getPosition().then(setMe).catch(() => {});
  }, [id]);

  if (missing) return (<><TopBar title="Pet" /><p className="content meta">Esta ocorrência foi encerrada. 💛</p></>);
  if (!r) return <Loading />;

  const sp = SPECIES[r.species as Species];
  const lost = r.kind === 'lost';
  const isOwner = session?.user.id === r.user_id;
  const open = (k: 'seen' | 'found') => (session ? setSheet(k) : router.push(`/entrar?next=/pet/${id}`));

  const pins: Pin[] = [
    { id: 'r', type: r.kind, lat: r.lat, lng: r.lng, photo: r.photo_url },
    ...(me ? [{ id: 'me', type: 'me' as const, ...me }] : []),
  ];

  return (
    <>
      <TopBar title={lost ? 'Pet perdido' : 'Animal encontrado'} />
      <img className="hero-photo" src={r.photo_url} alt="" />
      <div className="content">
        <span className={`badge ${r.kind}`}>{lost ? 'PERDIDO' : 'ENCONTRADO'}</span>
        {r.status === 'resolved' && <span className="badge ok">RESOLVIDO</span>}
        <h1>{sp.emoji} {lost ? r.pet_name : `${sp.label} encontrado`}</h1>
        <p className="meta">{[r.color, r.size && SIZES[r.size as keyof typeof SIZES]].filter(Boolean).join(' · ')}</p>
        <p className="meta">
          🕒 {lost ? 'Sumiu' : 'Encontrado'} {timeAgo(r.happened_at)} · 📍 {place(r)}
          {me && ` · ${formatDistance(haversine(me, r))} de você`}
        </p>
        {r.description && <p>{r.description}</p>}

        <PetMap center={r} zoom={15} height={220} pins={pins}
          areas={lost ? [{ lat: r.lat, lng: r.lng, radius: r.search_radius_m }] : []} />

        {done && <div className="success">{done}</div>}

        {r.status === 'open' && (
          isOwner ? (
            <Link className="btn primary" href={`/ocorrencia/${r.id}`}>📡 Acompanhar ocorrência</Link>
          ) : lost ? (
            <>
              <button className="btn warn" onClick={() => open('seen')}>👀 Vi este animal</button>
              <button className="btn ok" onClick={() => open('found')}>🤲 Encontrei este animal</button>
              {r.contact_phone && <a className="btn" href={whatsapp(r.contact_phone, `Oi! É sobre ${r.pet_name} (Onde Está Meu Pet?)`)}>💬 Falar com o tutor</a>}
            </>
          ) : (
            <>
              {r.contact_phone && <a className="btn ok" href={whatsapp(r.contact_phone, 'Oi! Acho que o animal que você encontrou é meu (Onde Está Meu Pet?)')}>💬 É meu! Falar com quem encontrou</a>}
              <Link className="btn" href="/perdi">Cadastrar meu pet perdido</Link>
            </>
          )
        )}
      </div>

      {sheet && <SightingSheet report={r} kind={sheet} onClose={() => setSheet(null)}
        onDone={(m) => { setSheet(null); setDone(m); }} />}
    </>
  );
}

function SightingSheet({ report, kind, onClose, onDone }: {
  report: any; kind: 'seen' | 'found'; onClose: () => void; onDone: (msg: string) => void;
}) {
  const { session } = useSession();
  const [pos, setPos] = useState<LatLng | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const found = kind === 'found';

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    if (!pos) return setErr('Marque no mapa onde você viu');
    setBusy(true);
    try {
      const photo_url = file && session ? await uploadPhoto(file, session.user.id) : null;
      await api(`/api/reports/${report.id}/sightings`, { kind, lat: pos.lat, lng: pos.lng, note, contact_phone: phone, photo_url });
      onDone(found ? '🎉 Obrigado! O tutor foi avisado agora.' : '🙌 Obrigado! O tutor recebeu seu avistamento.');
    } catch (e: any) { setErr(e.message); setBusy(false); }
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{found ? `🤲 Encontrei ${report.pet_name}` : `👀 Vi ${report.pet_name}`}</h2>
        <LocationField value={pos} onChange={setPos} label={found ? 'Onde ele está?' : 'Onde você viu?'} />
        <PhotoField file={file} onChange={setFile} label="Foto (opcional)" />
        <div className="field"><label>Observação (opcional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ia em direção à avenida…" maxLength={300} />
        </div>
        <div className="field"><label>{found ? 'Seu WhatsApp (para o tutor te chamar)' : 'Seu WhatsApp (opcional)'}</label>
          <input type="tel" inputMode="tel" required={found} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        {err && <p className="err">{err}</p>}
        <button className={`btn ${found ? 'ok' : 'warn'}`} disabled={busy}>{busy ? 'Enviando…' : 'Enviar para o tutor'}</button>
        <button type="button" className="btn" onClick={onClose}>Cancelar</button>
      </form>
    </div>
  );
}
__FIM__

cat > "src/app/ocorrencia/[id]/page.tsx" <<'__FIM__'
'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/client';
import { SPECIES, Species, formatDistance, haversine, place, timeAgo, whatsapp } from '@/lib/format';
import { Loading, TopBar, useRequireAuth } from '@/components/ui';
import type { Pin } from '@/components/PetMap';

const PetMap = dynamic(() => import('@/components/PetMap'), { ssr: false, loading: () => <div className="map skeleton" style={{ height: 340 }} /> });

export default function Ocorrencia() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useRequireAuth();
  const [r, setR] = useState<any>(null);
  const [sightings, setSightings] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from('reports').select('*').eq('id', id).maybeSingle(),
      supabase.from('sightings').select('*').eq('report_id', id).order('created_at', { ascending: false }),
      supabase.from('matches')
        .select('*, lost:reports!matches_lost_id_fkey(*), found:reports!matches_found_id_fkey(*)')
        .or(`lost_id.eq.${id},found_id.eq.${id}`).order('score', { ascending: false }),
    ]);
    setR(a.data); setSightings(b.data ?? []); setMatches(c.data ?? []);
  }, [id]);

  useEffect(() => {
    if (!session) return;
    load();
    const t = setInterval(load, 30000);
    const onVis = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [session, load]);

  useEffect(() => {
    if (r && session && r.user_id !== session.user.id) router.replace(`/pet/${id}`);
  }, [r, session, id, router]);

  if (!r) return <Loading />;

  const lost = r.kind === 'lost';
  const sp = SPECIES[r.species as Species];
  const others = matches.map((m) => (lost ? m.found : m.lost)).filter(Boolean);
  const last = sightings[0];

  const pins: Pin[] = [
    { id: 'origin', type: r.kind, lat: r.lat, lng: r.lng, photo: r.photo_url, label: lost ? 'Onde sumiu' : 'Onde foi encontrado' },
    ...sightings.map((s, i) => ({
      id: s.id, type: (s.kind === 'found' ? 'found' : 'seen') as Pin['type'], lat: s.lat, lng: s.lng,
      label: `${s.kind === 'found' ? 'Encontrado' : 'Visto'} ${timeAgo(s.created_at)}`, highlight: i === 0,
    })),
    ...others.map((o: any) => ({
      id: o.id, type: o.kind, lat: o.lat, lng: o.lng, photo: o.photo_url,
      label: 'Possível correspondência', onClick: () => router.push(`/pet/${o.id}`),
    })),
  ];

  const events = [
    ...sightings.map((s) => ({ t: s.created_at, s, m: null as any })),
    ...matches.map((m) => ({ t: m.created_at, s: null as any, m })),
  ].sort((a, b) => +new Date(b.t) - +new Date(a.t));

  async function resolve() {
    if (!confirm(lost ? `Confirmar que ${r.pet_name} foi encontrado?` : 'Encerrar esta ocorrência?')) return;
    setBusy(true);
    try { await api(`/api/reports/${id}/resolve`, {}); await load(); }
    catch (e: any) { alert(e.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <TopBar title={lost ? `📡 Buscando ${r.pet_name}` : `📡 Procurando o tutor (${sp.label})`} />
      <div className="content">
        {r.status === 'resolved' ? (
          <div className="success">🎉 {lost ? `Que bom que ${r.pet_name} voltou para casa!` : 'Ocorrência encerrada. Obrigado por ajudar!'}</div>
        ) : (
          <p className="meta">
            {last
              ? <>📍 Último local conhecido: <b>{timeAgo(last.created_at)}</b>, a {formatDistance(haversine(r, last))} do ponto inicial</>
              : <>📍 {lost ? 'Sumiu' : 'Encontrado'} {timeAgo(r.happened_at)} · {place(r)}</>}
          </p>
        )}

        <PetMap center={r} height={340} pins={pins} fit={pins}
          areas={lost ? [{ lat: r.lat, lng: r.lng, radius: r.search_radius_m }] : []} />

        <div className="stats">
          <div><b>{sightings.length}</b>avistamentos</div>
          <div><b>{others.length}</b>correspondências</div>
          {lost && <div><b>{formatDistance(r.search_radius_m)}</b>área de alerta</div>}
        </div>

        {r.status === 'open' && (
          <button className="btn ok" disabled={busy} onClick={resolve}>
            {lost ? `🎉 ${r.pet_name} foi encontrado` : '✅ Tutor encontrado — encerrar'}
          </button>
        )}

        <h2>Linha do tempo</h2>
        {events.length === 0 && <p className="meta">Os vizinhos já foram avisados. Você receberá uma notificação a cada novidade. 🔔</p>}

        {events.map((e) =>
          e.s ? (
            <div key={e.s.id} className="card">
              {e.s.photo_url ? <img src={e.s.photo_url} alt="" /> : <div className="emoji">{e.s.kind === 'found' ? '🤲' : '👀'}</div>}
              <div>
                <div className="t">{e.s.kind === 'found' ? 'Alguém encontrou!' : 'Avistamento'}</div>
                <div className="s">{timeAgo(e.s.created_at)} · {formatDistance(haversine(r, e.s))} do ponto inicial</div>
                {e.s.note && <div className="s">“{e.s.note}”</div>}
                {e.s.contact_phone && <a className="link" href={whatsapp(e.s.contact_phone, `Oi! Vi seu aviso sobre ${r.pet_name} no Onde Está Meu Pet?`)}>💬 Falar no WhatsApp</a>}
              </div>
            </div>
          ) : (() => {
            const o = lost ? e.m.found : e.m.lost;
            if (!o) return null;
            return (
              <Link key={e.m.id} href={`/pet/${o.id}`} className="card">
                <img src={o.photo_url} alt="" />
                <div>
                  <div className="t">🔎 Possível correspondência</div>
                  <div className="s">{lost ? 'Animal encontrado' : `${o.pet_name} (perdido)`} a {formatDistance(e.m.distance_m)} · {timeAgo(e.m.created_at)}</div>
                  <div className="s">Toque para ver e entrar em contato</div>
                </div>
              </Link>
            );
          })()
        )}
      </div>
    </>
  );
}
__FIM__

cat > src/app/globals.css <<'__FIM__'
:root{--bg:#fff8f3;--ink:#1f1b16;--muted:#6b625a;--brand:#ff6b35;--lost:#e5484d;--found:#2f9e44;--seen:#f59f00;--line:#e6dcd3;--r:18px}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
.app{max-width:520px;margin:0 auto;min-height:100dvh;padding-bottom:calc(24px + env(safe-area-inset-bottom))}
a{color:inherit;text-decoration:none}
h1{font-size:1.6rem;margin:.3rem 0}h2{font-size:1.1rem;margin:1.2rem 0 .6rem}
.hero{text-align:center;padding:40px 20px 8px}.logo{font-size:56px}.hero p{color:var(--muted);margin:0}
.big-actions{display:grid;gap:14px;padding:16px}
.big{display:flex;align-items:center;gap:16px;padding:22px;border-radius:var(--r);font-size:34px;color:#fff;box-shadow:0 6px 18px #0002}
.big span{font-size:1.25rem;font-weight:700}
.big.lost{background:var(--lost)}.big.found{background:var(--found)}.big.near{background:#3b5bdb}
.topbar{position:sticky;top:0;z-index:1000;display:flex;align-items:center;gap:6px;padding:12px;background:var(--bg)}
.topbar a{font-size:1.4rem;padding:2px 10px}.topbar b{font-size:1.05rem}
.content{padding:0 16px 16px}
.field{margin:14px 0}.field>label{display:block;font-weight:700;margin-bottom:6px}
input,textarea{width:100%;font:inherit;font-size:16px;padding:14px;border:1.5px solid var(--line);border-radius:14px;background:#fff}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:10px 14px;font:inherit;font-weight:600;color:var(--ink)}
.chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.photo{display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;border:2px dashed #e0cfc1;border-radius:var(--r);background:#fff;overflow:hidden;cursor:pointer;margin-top:8px}
.photo img{width:100%;height:100%;object-fit:cover}
.photo span{display:flex;flex-direction:column;align-items:center;font-size:44px;gap:6px}.photo b{font-size:1rem}
.btn{display:block;width:100%;text-align:center;padding:17px;border-radius:16px;border:0;font:inherit;font-size:1.1rem;font-weight:700;background:#fff;color:var(--ink);box-shadow:0 2px 8px #0001;margin-top:10px;cursor:pointer}
.btn.primary{background:var(--brand);color:#fff}.btn.ok{background:var(--found);color:#fff}.btn.warn{background:var(--seen);color:#fff}
.btn:disabled{opacity:.6}
.err{color:var(--lost);font-weight:600}
.success{background:#e6f7ea;color:#1b5e20;padding:14px;border-radius:14px;margin:12px 0;font-weight:600}
.map{border-radius:var(--r);overflow:hidden;box-shadow:0 2px 10px #0002;position:relative;z-index:0;margin-top:8px}
.skeleton{background:#eee}
.pin{border-radius:50%;background:#fff;border:3px solid #fff;box-shadow:0 2px 8px #0005;display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden}
.pin img{width:100%;height:100%;object-fit:cover}
.pin-lost{border-color:var(--lost)}.pin-found{border-color:var(--found)}.pin-seen{border-color:var(--seen)}
.pin-me{background:#228be6}
.pin-pick{background:transparent;border:0;box-shadow:none;font-size:34px;overflow:visible}
.pin-hl{animation:pulse 1.6s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 #f59f00aa}100%{box-shadow:0 0 0 18px #f59f0000}}
.hero-photo{width:100%;aspect-ratio:1/1;object-fit:cover;display:block}
.badge{display:inline-block;padding:3px 9px;border-radius:999px;font-size:.7rem;font-weight:800;color:#fff;margin:8px 6px 4px 0}
.badge.lost{background:var(--lost)}.badge.found{background:var(--found)}.badge.ok{background:#555}
.meta{color:var(--muted);margin:.3rem 0}
.card{display:flex;gap:12px;align-items:center;background:#fff;padding:10px;border-radius:14px;margin-bottom:10px;box-shadow:0 2px 8px #0001}
.card img,.card .emoji{width:64px;height:64px;border-radius:12px;object-fit:cover;flex-shrink:0}
.card .emoji{display:flex;align-items:center;justify-content:center;font-size:30px;background:#fff3e6}
.card .t{font-weight:700}.card .s{color:var(--muted);font-size:.85rem}
.link{color:var(--found);font-weight:700;font-size:.9rem}
.stats{display:flex;gap:10px;margin:12px 0}
.stats div{flex:1;background:#fff;border-radius:14px;padding:10px 4px;text-align:center;font-size:.8rem;color:var(--muted)}
.stats b{display:block;font-size:1.3rem;color:var(--ink)}
.row{display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap}.row small{color:var(--muted)}
.sheet-bg{position:fixed;inset:0;background:#0006;z-index:2000;display:flex;align-items:flex-end}
.sheet{background:var(--bg);width:100%;max-width:520px;margin:0 auto;border-radius:22px 22px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));max-height:92dvh;overflow:auto}
footer{text-align:center;padding:24px;color:var(--muted)}
footer button{background:none;border:0;color:inherit;text-decoration:underline;font:inherit}
__FIM__

echo "📦 Instalando dependências (1-2 min)..."
npm install --no-audit --no-fund

if [ ! -f .env.local ]; then
  echo "🔑 Gerando chaves de push..."
  KEYS=$(npx --yes web-push generate-vapid-keys --json)
  PUB=$(node -e 'console.log(JSON.parse(process.argv[1]).publicKey)' "$KEYS")
  PRIV=$(node -e 'console.log(JSON.parse(process.argv[1]).privateKey)' "$KEYS")
  echo ""
  echo "Agora cole os dados do Supabase (Project Settings → API Keys / Data API):"
  read -r -p "1) Project URL (https://xxxx.supabase.co): " SB_URL
  read -r -p "2) Chave publishable (ou anon): " SB_ANON
  read -r -p "3) Chave secret (ou service_role): " SB_SECRET
  read -r -p "4) Seu e-mail: " MAIL
  SB_URL="${SB_URL%/}"
  cat > .env.local <<__ENV__
NEXT_PUBLIC_SUPABASE_URL=$SB_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SB_ANON
SUPABASE_SERVICE_ROLE_KEY=$SB_SECRET
NEXT_PUBLIC_VAPID_PUBLIC_KEY=$PUB
VAPID_PRIVATE_KEY=$PRIV
VAPID_SUBJECT=mailto:$MAIL
__ENV__
  echo "✅ Arquivo .env.local criado."
fi

echo "🚀 Iniciando o app..."
npm run dev