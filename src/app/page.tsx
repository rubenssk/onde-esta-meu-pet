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
