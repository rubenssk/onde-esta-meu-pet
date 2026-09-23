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
