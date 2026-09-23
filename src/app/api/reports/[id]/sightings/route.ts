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
