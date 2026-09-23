'use client';

import { useAlerts } from './useAlerts';

export default function JoinCta({
  nextPath,
}: {
  nextPath: string;
}) {
  const a = useAlerts(nextPath);

  return (
    <div className="join-card">
      <div className="join-title">
        🐾 Ajude pets da sua região
      </div>

      <p>
        Receba alertas quando um animal
        perdido aparecer perto de você.
      </p>

      {a.active ? (
        <div className="join-ok">
          ✅ Seus alertas estão ativos neste
          aparelho.
        </div>
      ) : (
        <button
          type="button"
          className="btn primary"
          disabled={!a.ready || a.busy}
          onClick={a.activate}
        >
          {a.busy
            ? 'Ativando…'
            : '🔔 Ativar alertas'}
        </button>
      )}

      {a.error && (
        <p className="err">{a.error}</p>
      )}
    </div>
  );
}
