'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

export function useRequireAuth() {
  const s = useSession();
  const router = useRouter();
  useEffect(() => {
    if (s.ready && !s.session)
      router.replace(`/entrar?next=${encodeURIComponent(location.pathname)}`);
  }, [s.ready, s.session, router]);
  return s;
}

export function TopBar({ title }: { title: string }) {
  return <header className="topbar"><Link href="/" aria-label="Início">←</Link><b>{title}</b></header>;
}

export function PhotoField({ file, onChange, label }: { file: File | null; onChange: (f: File | null) => void; label: string }) {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  return (
    <label className="photo">
      {preview ? <img src={preview} alt="" /> : <span>📷<b>{label}</b></span>}
      <input type="file" accept="image/*" hidden onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
    </label>
  );
}

export function Choice<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T | ''; onChange: (v: T) => void;
}) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o.value} className={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Loading = () => <p className="content meta">Carregando…</p>;
