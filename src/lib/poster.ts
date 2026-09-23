import {
  cityLabel,
  speciesOf,
  type ShareReport,
} from './share';

const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const W = 1080;
const H = 1350;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);

  ctx.arcTo(
    x + w,
    y,
    x + w,
    y + h,
    r,
  );

  ctx.arcTo(
    x + w,
    y + h,
    x,
    y + h,
    r,
  );

  ctx.arcTo(
    x,
    y + h,
    x,
    y,
    r,
  );

  ctx.arcTo(
    x,
    y,
    x + w,
    y,
    r,
  );

  ctx.closePath();
}

function text(
  ctx: CanvasRenderingContext2D,
  t: string,
  y: number,
  size: number,
  weight: number,
  color: string,
  max = W - 180,
) {
  let s = size;

  do {
    ctx.font = `${weight} ${s}px ${FONT}`;

    if (ctx.measureText(t).width <= max) break;

    s -= 4;
  } while (s > 26);

  while (
    ctx.measureText(t).width > max &&
    t.length > 1
  ) {
    t = t.slice(0, -2) + '…';
  }

  ctx.fillStyle = color;
  ctx.fillText(t, W / 2, y);
}

function draw(
  r: ShareReport,
  short: string,
  img: HTMLImageElement | null,
) {
  const c = document.createElement('canvas');

  c.width = W;
  c.height = H;

  const ctx = c.getContext('2d')!;

  const lost = r.kind === 'lost';
  const sp = speciesOf(r);
  const color = lost ? '#e5484d' : '#2f9e44';

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);

  text(
    ctx,
    lost ? 'PERDIDO' : 'ENCONTRADO',
    100,
    120,
    900,
    '#fff',
  );

  const bx = 60;
  const by = 190;
  const bw = 960;
  const bh = 740;

  ctx.save();

  roundRect(
    ctx,
    bx,
    by,
    bw,
    bh,
    40,
  );

  ctx.clip();

  if (img) {
    const s = Math.max(
      bw / img.width,
      bh / img.height,
    );

    const w = img.width * s;
    const h = img.height * s;

    ctx.drawImage(
      img,
      bx + (bw - w) / 2,
      by + (bh - h) / 2,
      w,
      h,
    );
  } else {
    ctx.fillStyle = '#fff3e6';
    ctx.fillRect(
      bx,
      by,
      bw,
      bh,
    );

    ctx.font = `320px ${FONT}`;
    ctx.fillStyle = '#000';

    ctx.fillText(
      sp.emoji,
      W / 2,
      by + bh / 2,
    );
  }

  ctx.restore();

  ctx.fillStyle = '#fff';

  roundRect(
    ctx,
    60,
    960,
    960,
    320,
    36,
  );

  ctx.fill();

  const title = lost
    ? `${sp.emoji} ${r.pet_name ?? sp.label}`
    : `${sp.emoji} ${sp.label} encontrado`;

  text(
    ctx,
    title,
    1030,
    84,
    800,
    '#1f1b16',
  );

  text(
    ctx,
    [sp.label, r.color, cityLabel(r)]
      .filter(Boolean)
      .join(' · '),
    1103,
    40,
    500,
    '#6b625a',
  );

  text(
    ctx,
    lost
      ? 'Ajude a encontrar!'
      : 'Ajude a encontrar o tutor!',
    1175,
    56,
    800,
    color,
  );

  text(
    ctx,
    `🔗 ${short}`,
    1243,
    38,
    700,
    '#1f1b16',
  );

  text(
    ctx,
    '🐾 Onde Está Meu Pet?',
    1315,
    32,
    700,
    '#fff',
  );

  return c;
}

function toBlob(
  c: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      c.toBlob(
        (b) =>
          b
            ? resolve(b)
            : reject(
                new Error(
                  'Falha ao gerar imagem',
                ),
              ),
        'image/jpeg',
        0.9,
      );
    } catch (e) {
      reject(e);
    }
  });
}

/** Gera o cartaz. Se a foto não puder ser usada no canvas (CORS), gera sem foto. */
export async function makePoster(
  r: ShareReport,
  short: string,
): Promise<Blob> {
  const srcs = r.photo_url
    ? [
        r.photo_url,
        `${r.photo_url}${
          r.photo_url.includes('?') ? '&' : '?'
        }cartaz=${Date.now()}`,
      ]
    : [];

  for (const src of srcs) {
    try {
      return await toBlob(
        draw(
          r,
          short,
          await loadImage(src),
        ),
      );
    } catch {}
  }

  return toBlob(
    draw(
      r,
      short,
      null,
    ),
  );
}
