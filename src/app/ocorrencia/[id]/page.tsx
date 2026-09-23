'use client';
import ShareActions from '@/components/share/ShareActions';
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

        {r.status === 'open' && <ShareActions report={r} variant="page" />}

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
