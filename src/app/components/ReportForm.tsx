'use client';
import PublishedCard from '@/components/share/PublishedCard';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, enablePush, uploadPhoto } from '@/lib/client';
import { LatLng, Species } from '@/lib/format';
import { Choice, PhotoField, TopBar, useRequireAuth } from '@/components/ui';
import LocationField from '@/components/LocationField';

const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default function ReportForm({ kind }: { kind: 'lost' | 'found' }) {
  const [createdId, setCreatedId] = useState<string | null>(null);
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
      setCreatedId(id);
    } catch (e: any) {
      setErr(e.message); setBusy(false);
    }
  }

  if (createdId) return <PublishedCard id={createdId} />;

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
