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

  useEffect(() => {
    pushEnabled().then(setPush);
  }, []);

  useEffect(() => {
    if (!session) return;

    supabase
      .from('reports')
      .select('id,kind,pet_name,species,photo_url,created_at')
      .eq('user_id', session.user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .then(({ data }) => setMine(data ?? []));
  }, [session]);

  async function activate() {
    if (!session) return router.push('/entrar?next=/');

    try {
      await enablePush();
      setPush(true);
      setMsg('🔔 Pronto! Você será avisado sobre pets perdidos perto de você.');
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  return (
    <main className="home">

      {/* HERO */}
      <section className="homeHero">
        <div className="heroGlow" />

        <div className="heroLogo">🐾</div>

        <div className="heroBadge">
          🐾 REDE DE AJUDA
        </div>

        <h1>
          Ajude um pet<br />
          <strong>a voltar para casa.</strong>
        </h1>

        <p>
          Pessoas próximas se unem para encontrar animais perdidos.
        </p>
      </section>

      {/* AÇÕES PRINCIPAIS */}
      <section className="homeActions">

        <Link href="/perdi" className="actionCard actionLost">
          <div className="actionIcon">😢</div>
          <div className="actionText">
            <strong>Perdi meu pet</strong>
            <span>Crie um alerta e peça ajuda</span>
          </div>
          <div className="actionArrow">→</div>
        </Link>

        <Link href="/encontrei" className="actionCard actionFound">
          <div className="actionIcon">🤲</div>
          <div className="actionText">
            <strong>Encontrei um animal</strong>
            <span>Ajude a encontrar o dono</span>
          </div>
          <div className="actionArrow">→</div>
        </Link>

        <Link href="/perto" className="actionCard actionNear">
          <div className="actionIcon">📍</div>
          <div className="actionText">
            <strong>Pets perto de mim</strong>
            <span>Veja quem precisa de ajuda na sua região</span>
          </div>
          <div className="actionArrow">→</div>
        </Link>

      </section>

      {/* NOTIFICAÇÕES */}
      {push === false && (
        <section className="notificationCard">
          <div className="notificationIcon">🔔</div>

          <div className="notificationContent">
            <strong>Ajude quem está perto de você</strong>
            <p>
              Receba avisos quando um pet perdido for registrado na sua região.
            </p>

            <button className="notificationButton" onClick={activate}>
              Ativar alertas
            </button>
          </div>
        </section>
      )}

      {msg && (
        <div className="success">
          {msg}
        </div>
      )}

      {/* MINHAS OCORRÊNCIAS */}
      {mine.length > 0 && (
        <section className="myReports">

          <div className="sectionHeader">
            <div>
              <span>ACOMPANHAMENTO</span>
              <h2>Minhas ocorrências</h2>
            </div>
          </div>

          <div className="reportList">
            {mine.map((r) => (
              <Link
                key={r.id}
                href={`/ocorrencia/${r.id}`}
                className="reportCard"
              >
                <img src={r.photo_url} alt="" />

                <div className="reportInfo">
                  <div className="reportTitle">
                    {SPECIES[r.species as Species].emoji}{' '}
                    {r.kind === 'lost'
                      ? r.pet_name
                      : 'Animal encontrado'}
                  </div>

                  <div className="reportStatus">
                    📡 Acompanhar · {timeAgo(r.created_at)}
                  </div>
                </div>

                <div className="reportArrow">›</div>
              </Link>
            ))}
          </div>

        </section>
      )}

      {/* RODAPÉ */}
      <footer className="homeFooter">
        {session ? (
          <>
            <span>Conectado como {session.user.email}</span>
            <button onClick={() => supabase.auth.signOut()}>
              Sair
            </button>
          </>
        ) : (
          <Link href="/entrar">
            Entrar na minha conta →
          </Link>
        )}
      </footer>

    </main>
  );
}