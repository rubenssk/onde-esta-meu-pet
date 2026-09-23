'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  enablePush,
  pushEnabled,
} from '@/lib/client';

/** Reaproveita o fluxo existente: enablePush reutiliza a inscrição do aparelho e faz upsert por endpoint (sem duplicar). */
export function useAlerts(nextPath: string) {
  const router = useRouter();

  const [loggedIn, setLoggedIn] =
    useState<boolean | null>(null);

  const [on, setOn] =
    useState<boolean | null>(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) =>
        setLoggedIn(!!data.session),
      );

    const { data } =
      supabase.auth.onAuthStateChange(
        (_e, s) =>
          setLoggedIn(!!s),
      );

    pushEnabled()
      .then(setOn)
      .catch(() => setOn(false));

    return () =>
      data.subscription.unsubscribe();
  }, []);

  async function activate() {
    setError('');

    if (!loggedIn) {
      router.push(
        `/entrar?next=${encodeURIComponent(
          nextPath,
        )}`,
      );
      return;
    }

    setBusy(true);

    try {
      await enablePush();
      setOn(true);
    } catch (e: any) {
      setError(
        e?.message ||
          'Não foi possível ativar os alertas.',
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    ready:
      loggedIn !== null &&
      on !== null,
    loggedIn: !!loggedIn,
    active: !!on,
    busy,
    error,
    activate,
  };
}
