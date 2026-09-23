export type LatLng = { lat: number; lng: number };

export const SPECIES = {
  dog:   { label: 'Cachorro', noun: 'cachorro', emoji: '🐶' },
  cat:   { label: 'Gato',     noun: 'gato',     emoji: '🐱' },
  other: { label: 'Outro',    noun: 'animal',   emoji: '🐾' },
} as const;
export type Species = keyof typeof SPECIES;

export const SIZES = { small: 'Pequeno', medium: 'Médio', large: 'Grande' } as const;

export const BRAZIL: LatLng = { lat: -14.235, lng: -51.925 };

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(50, Math.round(m / 50) * 50)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0).replace('.', ',')} km`;
}

export function haversine(a: LatLng, b: LatLng) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'agora mesmo';
  const m = s / 60; if (m < 60) return `há ${Math.floor(m)} min`;
  const h = m / 60; if (h < 24) return `há ${Math.floor(h)} h`;
  const d = Math.floor(h / 24); return d === 1 ? 'ontem' : `há ${d} dias`;
}

export function place(r: { city?: string | null; state?: string | null }) {
  return [r.city, r.state].filter(Boolean).join('/') || 'Local no mapa';
}

export function whatsapp(phone: string, text: string) {
  let d = phone.replace(/\D/g, '');
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}
