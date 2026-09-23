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
