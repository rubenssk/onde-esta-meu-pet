'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  copyText,
  nativeShare,
  petUrl,
  shareMessage,
  shareTitle,
  whatsappShareUrl,
  type ShareReport,
} from '@/lib/share';

import { useAlerts } from './useAlerts';
import PosterButton from './PosterButton';

export default function ShareActions({
  report,
  variant = 'page',
}: {
  report: ShareReport;
  variant?: 'page' | 'published';
}) {
  const [canNative, setCanNative] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const [shared, setShared] =
    useState(false);

  const alerts =
    useAlerts(`/pet/${report.id}`);

  useEffect(() => {
    setCanNative(
      typeof navigator.share === 'function',
    );
  }, []);

  const message = () =>
    shareMessage(
      report,
      petUrl(report.id),
    );

  function onWhatsApp() {
    window.open(
      whatsappShareUrl(message()),
      '_blank',
      'noopener',
    );

    setShared(true);
  }

  async function onNative() {
    const res = await nativeShare({
      title: shareTitle(report),
      text: message(),
    });

    if (res === 'shared') {
      setShared(true);
    } else if (res === 'unsupported') {
      onWhatsApp();
    }
  }

  async function onCopy() {
    if (
      await copyText(
        petUrl(report.id),
      )
    ) {
      setCopied(true);
      setShared(true);

      setTimeout(
        () => setCopied(false),
        2500,
      );
    }
  }

  return (
    <div className="share-box">
      {variant === 'published' ? (
        <>
          <button
            type="button"
            className="btn wa"
            onClick={onWhatsApp}
          >
            📲 Compartilhar no WhatsApp
          </button>

          <div className="share-row">
            <button
              type="button"
              className="btn"
              onClick={onCopy}
            >
              {copied
                ? '✅ Link copiado'
                : '🔗 Copiar link'}
            </button>

            <PosterButton
              report={report}
              onShared={() =>
                setShared(true)
              }
            />
          </div>
        </>
      ) : (
        <>
          <div className="share-title">
            📣 Divulgue e ajude
          </div>

          <div className="share-row">
            {canNative && (
              <button
                type="button"
                className="share-btn main"
                onClick={onNative}
              >
                📲 Compartilhar
              </button>
            )}

            <button
              type="button"
              className="share-btn wa"
              onClick={onWhatsApp}
            >
              WhatsApp
            </button>

            <button
              type="button"
              className="share-btn"
              onClick={onCopy}
            >
              {copied
                ? '✅ Copiado'
                : '🔗 Copiar link'}
            </button>
          </div>

          <PosterButton
            report={report}
            onShared={() =>
              setShared(true)
            }
          />
        </>
      )}

      {shared && (
        <div className="share-invite">
          <p>
            Quanto mais gente souber, maiores
            as chances de encontrar.
          </p>

          {alerts.active ? (
            <small>
              ✅ Você já recebe alertas de
              pets perdidos perto de você.
            </small>
          ) : (
            <button
              type="button"
              className="link-btn"
              disabled={alerts.busy}
              onClick={alerts.activate}
            >
              🔔 Receba alertas de pets perdidos
              perto de você
            </button>
          )}

          {alerts.error && (
            <small className="err">
              {' '}
              {alerts.error}
            </small>
          )}
        </div>
      )}
    </div>
  );
}
