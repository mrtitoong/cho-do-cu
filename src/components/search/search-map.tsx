"use client";

// Leaflet dùng window → file này chỉ được import qua next/dynamic với ssr: false.
import "leaflet/dist/leaflet.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LatLng } from "@/lib/search-params";
import { clusterIcon, getPinIcon } from "./pin-icons";
import { ListingPopupCard } from "./listing-card";
import type { SearchResultItem } from "./use-search-listings";

type Props = {
  center: LatLng;
  radiusKm: number;
  items: SearchResultItem[];
  mainSlugById: Record<number, string>;
  hoveredId: string | null;
  onSearchArea: (center: LatLng) => void;
};

const searchBounds = (center: LatLng, radiusKm: number) => L.latLng(center.lat, center.lng).toBounds(radiusKm * 2000);

/** Đổi tâm hoặc bán kính tìm kiếm thì đưa bản đồ về vừa khung vòng tìm kiếm (trừ khi chính người dùng vừa kéo tới đó). */
function FitToSearch({ center, radiusKm, skipFitRef }: { center: LatLng; radiusKm: number; skipFitRef: React.RefObject<boolean> }) {
  const map = useMap();
  useEffect(() => {
    if (skipFitRef.current) {
      skipFitRef.current = false;
      return;
    }
    map.fitBounds(searchBounds(center, radiusKm), { padding: [16, 16] });
  }, [map, center.lat, center.lng, radiusKm, skipFitRef]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Hiện nút "Tìm trong khu vực này" khi người dùng KÉO bản đồ ra xa tâm tìm kiếm.
 * Bỏ qua các lần bản đồ tự dịch (vừa khung tìm kiếm, mở thẻ ghim tự cuộn cho lọt khung).
 */
function MovedWatcher({ center, radiusKm, onMoved }: { center: LatLng; radiusKm: number; onMoved: (moved: boolean) => void }) {
  const draggedRef = useRef(false);
  const map = useMapEvents({
    dragstart() {
      draggedRef.current = true;
    },
    moveend() {
      if (!draggedRef.current) return;
      const distance = map.getCenter().distanceTo([center.lat, center.lng]);
      const moved = distance > Math.max(300, radiusKm * 1000 * 0.2);
      if (!moved) draggedRef.current = false; // kéo về gần tâm cũ thì ẩn nút
      onMoved(moved);
    },
  });
  // Tâm tìm kiếm mới → bắt đầu lại
  useEffect(() => {
    draggedRef.current = false;
  }, [center.lat, center.lng]);
  return null;
}

export default function SearchMap({ center, radiusKm, items, mainSlugById, hoveredId, onSearchArea }: Props) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [moved, setMoved] = useState(false);
  const skipFitRef = useRef(false);

  function searchHere() {
    if (!map) return;
    const c = map.getCenter();
    skipFitRef.current = true;
    setMoved(false);
    onSearchArea({ lat: c.lat, lng: c.lng });
  }

  return (
    <div className="relative isolate size-full">
      <MapContainer
        ref={setMap}
        bounds={searchBounds(center, radiusKm)}
        boundsOptions={{ padding: [16, 16] }}
        scrollWheelZoom
        className="size-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToSearch center={center} radiusKm={radiusKm} skipFitRef={skipFitRef} />
        <MovedWatcher center={center} radiusKm={radiusKm} onMoved={setMoved} />
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#64748b", weight: 1.5, dashArray: "6 6", fillOpacity: 0.04 }}
          interactive={false}
        />
        <MarkerClusterGroup chunkedLoading iconCreateFunction={clusterIcon} showCoverageOnHover={false} maxClusterRadius={50}>
          {items.map((item) => {
            const highlighted = item.id === hoveredId;
            return (
              <Marker
                key={item.id}
                position={[item.lat, item.lng]}
                icon={getPinIcon(mainSlugById[item.parent_category_id], highlighted)}
                zIndexOffset={highlighted ? 1000 : 0}
                title={item.title}
              >
                <Popup minWidth={220} maxWidth={240} closeButton={false} className="listing-popup">
                  <ListingPopupCard item={item} mainSlug={mainSlugById[item.parent_category_id]} />
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>

      {moved && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center">
          <Button onClick={searchHere} className="pointer-events-auto h-10 rounded-full px-4 shadow-lg">
            <Search /> Tìm trong khu vực này
          </Button>
        </div>
      )}
    </div>
  );
}
