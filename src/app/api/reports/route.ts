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
