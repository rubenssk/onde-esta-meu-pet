import { SPECIES, Species } from './format';

export type ShareReport = {
  id: string;
  kind: string;
  status?: string | null;
  pet_name?: string | null;
  species: string;
  color?: string | null;
  size?: string | null;
  city?: string | null;
  state?: string | null;
  photo_url?: string | null;
};

export const SHARE_COLS =
  'id,kind,status,pet_name,species,color,size,city,state,photo_url';

export function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
  ).replace(/\/$/, '');
}

export const petUrl = (id: string) =>
  `${siteOrigin()}/pet/${id}`;

export const shortUrl = (id: string) =>
  `${siteOrigin().replace(/^https?:\/\//, '')}/p/${id.slice(0, 8)}`;

export const speciesOf = (r: ShareReport) =>
  SPECIES[r.species as Species] ?? SPECIES.other;

export const cityLabel = (r: ShareReport) =>
  [r.city, r.state].filter(Boolean).join('/') || null;

export function shareTitle(r: ShareReport) {
  const sp = speciesOf(r);

  return r.kind === 'lost'
    ? `PET PERDIDO: ${r.pet_name ?? sp.label}`
    : `ANIMAL ENCONTRADO: ${sp.label}`;
}

export function shareMessage(r: ShareReport, url: string) {
  const sp = speciesOf(r);
  const city = cityLabel(r);

  const lines =
    r.kind === 'lost'
      ? [
          '🚨 PET PERDIDO',
          `${sp.emoji} ${r.pet_name ?? sp.label}`,
          city && `📍 ${city}`,
          'Ajude a encontrar!',
          'Veja os detalhes e compartilhe:',
          url,
        ]
      : [
          '🐾 ANIMAL ENCONTRADO',
          sp.label,
          city && `📍 ${city}`,
          'Ajude a encontrar o tutor!',
          'Veja os detalhes:',
          url,
        ];

  return lines.filter(Boolean).join('\n');
}

export const whatsappShareUrl = (text: string) =>
  `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';

    document.body.appendChild(ta);
    ta.select();

    let ok = false;

    try {
      ok = document.execCommand('copy');
    } catch {}

    ta.remove();

    return ok;
  }
}

export async function nativeShare(
  data: ShareData,
): Promise<'shared' | 'cancelled' | 'unsupported'> {
  if (
    typeof navigator === 'undefined' ||
    typeof navigator.share !== 'function'
  ) {
    return 'unsupported';
  }

  if (
    data.files &&
    (!navigator.canShare || !navigator.canShare(data))
  ) {
    return 'unsupported';
  }

  try {
    await navigator.share(data);
    return 'shared';
  } catch (e: any) {
    return e?.name === 'AbortError'
      ? 'cancelled'
      : 'unsupported';
  }
}
