'use client';

import { useEffect, useState } from 'react';
import { makePoster } from '@/lib/poster';
import {
  nativeShare,
  petUrl,
  shareMessage,
  shareTitle,
  shortUrl,
  whatsappShareUrl,
  type ShareReport,
} from '@/lib/share';

export default function PosterButton({
  report,
  className = 'btn',
  onShared,
}: {
  report: ShareReport;
  className?: string;
  onShared?: () => void;
}) {
  const [open, setOpen] =
    useState(false);

  const [file, setFile] =
    useState<File | null>(null);

  const [preview, setPreview] =
    useState('');

  const [canFiles, setCanFiles] =
    useState(false);

  const [err, setErr] =
    useState('');

  useEffect(
    () => () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    },
    [preview],
  );

  async function create() {
    setOpen(true);

    if (file) return;

    setErr('');

    try {
      const blob = await makePoster(
        report,
        shortUrl(report.id),
      );

      const base = (
        report.pet_name || 'animal'
      )
        .normalize('NFD')
        .replace(/[^\w-]+/g, '-')
        .toLowerCase();

      const f = new File(
        [blob],
        `cartaz-${base}.jpg`,
        {
          type: 'image/jpeg',
        },
      );

      setFile(f);

      setPreview(
        URL.createObjectURL(blob),
      );

      setCanFiles(
        !!navigator.canShare?.({
          files: [f],
        }),
      );
    } catch {
      setErr(
        'Não foi possível criar o cartaz.',
      );
    }
  }

  async function shareLink() {
    const text = shareMessage(
      report,
      petUrl(report.id),
    );

    const res = await nativeShare({
      title: shareTitle(report),
      text,
    });

    if (res === 'unsupported') {
      window.open(
        whatsappShareUrl(text),
        '_blank',
        'noopener',
      );
    }

    if (res !== 'cancelled') {
      onShared?.();
    }
  }

  async function shareImage() {
    if (!file) return;

    const res = await nativeShare({
      files: [file],
      title: shareTitle(report),
      text: shareMessage(
        report,
        petUrl(report.id),
      ),
    });

    if (res === 'unsupported') {
      return shareLink();
    }

    if (res === 'shared') {
      onShared?.();
    }
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={create}
      >
        🖼️ Criar cartaz
      </button>

      {open && (
        <div
          className="sheet-bg"
          onClick={() => setOpen(false)}
        >
          <div
            className="sheet"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h2>
              🖼️ Cartaz para divulgar
            </h2>

            {preview ? (
              <img
                className="poster-preview"
                src={preview}
                alt="Cartaz"
              />
            ) : (
              <div className="poster-preview">
                {err || 'Criando cartaz…'}
              </div>
            )}

            {file && (
              <>
                {canFiles && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={shareImage}
                  >
                    📲 Compartilhar cartaz
                  </button>
                )}

                <a
                  className="btn"
                  href={preview}
                  download={file.name}
                >
                  ⬇️ Baixar imagem
                </a>

                {!canFiles && (
                  <button
                    type="button"
                    className="btn"
                    onClick={shareLink}
                  >
                    🔗 Compartilhar link
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              className="btn"
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
