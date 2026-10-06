"use client";

// Leaflet dùng window → file này chỉ được import qua next/dynamic với ssr: false.
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

// Không dùng ảnh ghim mặc định của Leaflet: import ảnh PNG từ node_modules không ra URL
// khi đóng gói bằng Turbopack (lỗi "iconUrl not set") → vẽ ghim bằng SVG inline.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44" style="filter:drop-shadow(0 2px 2px rgb(0 0 0 / .35))">
    <path d="M16 1C7.7 1 1 7.6 1 15.8 1 27 16 43 16 43s15-16 15-27.2C31 7.6 24.3 1 16 1z" fill="#2563eb" stroke="#fff" stroke-width="2"/>
    <circle cx="16" cy="16" r="5.5" fill="#fff"/>
  </svg>`,
  iconSize: [32, 44],
  iconAnchor: [16, 43],
});

type LatLng = { lat: number; lng: number };

type Props = {
  /** Tâm ban đầu */
  center: LatLng;
  zoom: number;
  /** Truyền object mới để bản đồ bay tới điểm đó */
  focus: (LatLng & { zoom: number }) | null;
  marker: LatLng | null;
  onPick: (point: LatLng) => void;
};

function FlyTo({ focus }: Pick<Props, "focus">) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.8 });
  }, [map, focus]);
  return null;
}

function ClickToPick({ onPick }: Pick<Props, "onPick">) {
  useMapEvents({ click: (e) => onPick(e.latlng) });
  return null;
}

export default function LocationMap({ center, zoom, focus, marker, onPick }: Props) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} scrollWheelZoom className="size-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyTo focus={focus} />
      <ClickToPick onPick={onPick} />
      {marker && (
        <Marker
          position={[marker.lat, marker.lng]}
          icon={pinIcon}
          draggable
          autoPan
          eventHandlers={{ dragend: (e) => onPick((e.target as L.Marker).getLatLng()) }}
        />
      )}
    </MapContainer>
  );
}
