'use client';

import {
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

import {
  SHARE_COLS,
  type ShareReport,
} from '@/lib/share';

import ShareActions from './ShareActions';
import JoinCta from './JoinCta';

/** Bloco extra da página pública /pet/[id]: compartilhar + entrar na rede. Não exige login. */
export default function PetExtras({
  id,
  initial,
}: {
  id: string;
  initial: ShareReport | null;
}) {
  const [r, setR] =
    useState<ShareReport | null>(
      initial,
    );

  useEffect(() => {
    if (initial) return;

    supabase
      .from('reports')
      .select(SHARE_COLS)
      .eq('id', id)
      .maybeSingle()
      .then(
        ({ data }) =>
          data &&
          setR(
            data as unknown as ShareReport,
          ),
      );
  }, [id, initial]);

  if (!r || r.status !== 'open') {
    return null;
  }

  return (
    <div className="content">
      <ShareActions
        report={r}
        variant="page"
      />

      <JoinCta
        nextPath={`/pet/${id}`}
      />
    </div>
  );
}
