'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import {
  SHARE_COLS,
  type ShareReport,
} from '@/lib/share';

import ShareActions from './ShareActions';

export default function PublishedCard({
  id,
}: {
  id: string;
}) {
  const router = useRouter();

  const [r, setR] =
    useState<ShareReport | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);

    supabase
      .from('reports')
      .select(SHARE_COLS)
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) =>
        setR(
          (data as unknown as ShareReport) ??
            null,
        ),
      );
  }, [id]);

  return (
    <div className="content">
      <div className="published">
        <div className="published-icon">
          ✅
        </div>

        <h1>Alerta criado</h1>

        <p className="meta">
          Pessoas próximas já foram avisadas.
        </p>
      </div>

      {r ? (
        <ShareActions
          report={r}
          variant="published"
        />
      ) : (
        <p className="meta">
          Preparando o link…
        </p>
      )}

      <button
        type="button"
        className="btn"
        onClick={() =>
          router.replace(
            `/ocorrencia/${id}`,
          )
        }
      >
        Continuar
      </button>
    </div>
  );
}
