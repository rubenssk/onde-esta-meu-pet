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
