import type { Metadata } from 'next';
import { headers } from 'next/headers';
import PetClient from './PetClient';
import PetExtras from '@/components/share/PetExtras';
import { getPublicReport } from '@/lib/public-report';
import { cityLabel, speciesOf } from '@/lib/share';

type Props = { params: { id: string } };

function origin() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/$/, '');
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const base = origin();
  const url = `${base}/pet/${params.id}`;
  const r = await getPublicReport(params.id);

  if (!r || r.status !== 'open') {
    const title = 'Onde Está Meu Pet?';
    const description = 'Vizinhos ajudando pets perdidos a voltarem para casa.';
    return {
      title,
      description,
      metadataBase: new URL(base),
      openGraph: {
        title,
        description,
        url,
        siteName: title,
        locale: 'pt_BR',
      },
    };
  }

  const sp = speciesOf(r);
  const city = cityLabel(r);
  const lost = r.kind === 'lost';

  const title = lost
    ? `🚨 PERDIDO: ${sp.emoji} ${r.pet_name ?? sp.label}${city ? ` — ${city}` : ''}`
    : `🐾 ENCONTRADO: ${sp.label}${city ? ` — ${city}` : ''}`;

  const description = lost
    ? `Ajude a encontrar ${r.pet_name ?? 'este pet'}${r.color ? ` (${sp.noun} ${r.color})` : ''}. Veja a foto, o mapa e avise se vir.`
    : `${sp.label}${r.color ? ` ${r.color}` : ''} encontrado${city ? ` em ${city}` : ''}. Você conhece o tutor? Veja a foto e o mapa.`;

  const images = r.photo_url
    ? [{ url: r.photo_url, alt: title }]
    : undefined;

  return {
    title,
    description,
    metadataBase: new URL(base),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: 'Onde Está Meu Pet?',
      locale: 'pt_BR',
      type: 'website',
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: r.photo_url ? [r.photo_url] : undefined,
    },
  };
}

export default async function Page({ params }: Props) {
  const r = await getPublicReport(params.id);

  return (
    <>
      <PetClient />
      <PetExtras id={params.id} initial={r} />
    </>
  );
}
