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
