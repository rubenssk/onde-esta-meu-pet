```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TopBar, useSession } from '@/components/ui';

function nextPath() {
  const n = new URLSearchParams(location.search).get('next') || '/';
  return n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

export default function Entrar() {
  const router = useRouter();
  const { session } = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (session) router.replace(nextPath());
  }, [session, router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${location.origin}/entrar?next=${encodeURIComponent(nextPath())}`,
      },
    });

    setBusy(false);
    error ? setErr(error.message) : setSent(true);
  }

  async function signInWithGoogle() {
    setGoogleBusy(true);
    setErr('');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/entrar?next=${encodeURIComponent(nextPath())}`,
      },
    });

    if (error) {
      setGoogleBusy(false);
      setErr(error.message);
    }
  }

  return (
    <>
      <TopBar title="Entrar" />

      <div className="content">
        {sent ? (
          <div className="success">
            📬 Enviamos um link para <b>{email}</b>. Abra o e-mail e toque em “Log In” para entrar.
          </div>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              onClick={signInWithGoogle}
              disabled={googleBusy}
            >
              {googleBusy ? 'Abrindo Google…' : 'Continuar com Google'}
            </button>

            <div className="meta" style={{ textAlign: 'center', margin: '16px 0' }}>
              ou
            </div>

            <form onSubmit={send}>
              <p className="meta">
                Sem senha: enviamos um link de acesso para seu e-mail.
              </p>

              <div className="field">
                <label>Seu e-mail</label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button className="btn primary" disabled={busy}>
                {busy ? 'Enviando…' : 'Receber link'}
              </button>
            </form>
          </>
        )}

        {err && <p className="err">{err}</p>}
      </div>
    </>
  );
}
```
