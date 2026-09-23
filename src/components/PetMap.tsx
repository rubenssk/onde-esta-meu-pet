'use client';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from '@/lib/format';

export type PinType = 'lost' | 'found' | 'seen' | 'me' | 'pick';
export type Pin = LatLng & { id: string; type: PinType; photo?: string | null; label?: string; highlight?: boolean; onClick?: () => void };
export type Area = LatLng & { radius: number; color?: string };

const EMOJI: Record<PinType, string> = { lost: '🐾', found: '🤲', seen: '👀', me: '', pick: '📍' };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function makeIcon(p: Pin) {
  const size = p.type === 'me' ? 18 : p.type === 'seen' ? 34 : 46;
  const inner = p.photo ? `<img src="${esc(p.photo)}" alt=""/>` : EMOJI[p.type];
  return L.divIcon({
    className: '',
    html: `<div class="pin pin-${p.type}${p.highlight ? ' pin-hl' : ''}" style="width:${size}px;height:${size}px">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, p.type === 'pick' ? size : size / 2],
  });
}

function Controller({ center, zoom, fit, onPick }: { center: LatLng; zoom?: number; fit?: LatLng[]; onPick?: (p: LatLng) => void }) {
  const map = useMap();
  const fitted = useRef(false);
  useMapEvents({ click(e) { onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  useEffect(() => {
    if (!fit) map.setView([center.lat, center.lng], zoom ?? map.getZoom());
  }, [center.lat, center.lng, zoom]); // eslint-disable-line
  useEffect(() => {
    if (!fit?.length || fitted.current) return;
    fitted.current = true;
    if (fit.length === 1) map.setView([fit[0].lat, fit[0].lng], 15);
    else map.fitBounds(L.latLngBounds(fit.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 16 });
  }, [fit, map]);
  return null;
}

export default function PetMap({ center, zoom = 14, pins = [], areas = [], onPick, fit, height = 300 }: {
  center: LatLng; zoom?: number; pins?: Pin[]; areas?: Area[]; onPick?: (p: LatLng) => void; fit?: LatLng[]; height?: number;
}) {
  return (
    <div className="map" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {areas.map((a, i) => (
          <Circle key={i} center={[a.lat, a.lng]} radius={a.radius}
            pathOptions={{ color: a.color ?? '#ff6b35', fillOpacity: 0.08, weight: 2, dashArray: '6 6' }} />
        ))}
        {pins.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={makeIcon(p)}
            eventHandlers={p.onClick ? { click: p.onClick } : undefined}>
            {p.label && <Tooltip direction="top" offset={[0, -20]}>{p.label}</Tooltip>}
          </Marker>
        ))}
        <Controller center={center} zoom={zoom} fit={fit} onPick={onPick} />
      </MapContainer>
    </div>
  );
}
