import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SHARE_COLS, type ShareReport } from './share';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cliente público (chave anon): respeita o RLS, só enxerga ocorrências abertas. */
export function publicDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        fetch: (input: any, init?: any) =>
          fetch(input, {
            ...init,
            next: { revalidate: 30 },
          }),
      },
    },
  );
}

export const getPublicReport = cache(
  async (id: string): Promise<ShareReport | null> => {
    if (!UUID.test(id)) return null;

    try {
      const { data } = await publicDb()
        .from('reports')
        .select(SHARE_COLS)
        .eq('id', id)
        .maybeSingle();

      return (data as unknown as ShareReport) ?? null;
    } catch {
      return null;
    }
  },
);
