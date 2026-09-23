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
