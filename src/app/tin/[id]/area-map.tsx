"use client";

// Leaflet dùng window → file này chỉ được import qua next/dynamic với ssr: false (xem area-map-loader.tsx).
import "leaflet/dist/leaflet.css";
import { Circle, MapContainer, TileLayer } from "react-leaflet";

export const AREA_RADIUS_M = 400;

/** Bản đồ nhỏ: chỉ vẽ VÒNG TRÒN 400 m quanh vị trí đã làm mờ, không có ghim chính xác. */
export default function AreaMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      dragging={false}
      touchZoom
      className="size-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[lat, lng]}
        radius={AREA_RADIUS_M}
        pathOptions={{ color: "#2563eb", weight: 2, fillColor: "#2563eb", fillOpacity: 0.15 }}
        interactive={false}
      />
    </MapContainer>
  );
}
