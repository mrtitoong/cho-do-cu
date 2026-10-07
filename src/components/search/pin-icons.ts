// Chỉ import từ file dùng Leaflet (client, ssr: false).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import { getCategoryIcon } from "@/components/category-icon";
import type { MainCategory } from "@/lib/category-tree";

const cache = new Map<string, L.DivIcon>();

function pinHtml(main: Pick<MainCategory, "color" | "icon"> | undefined, highlighted: boolean) {
  const color = main?.color ?? "#64748b";
  const scale = highlighted ? 1.3 : 1;
  const icon = main
    ? renderToStaticMarkup(createElement(getCategoryIcon(main.icon), { size: 15, color, strokeWidth: 2.5 }))
    : "";
  return `<div style="transform:scale(${scale});transform-origin:50% 100%;transition:transform .15s;width:32px;height:42px;position:relative;filter:drop-shadow(0 2px 2px rgb(0 0 0 / .35))">
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path d="M16 1C7.7 1 1 7.6 1 15.6 1 26.5 16 41 16 41s15-14.5 15-25.4C31 7.6 24.3 1 16 1z" fill="${color}" stroke="#fff" stroke-width="${highlighted ? 3 : 2}"/>
      <circle cx="16" cy="15.5" r="10" fill="#fff"/>
    </svg>
    <span style="position:absolute;left:0;top:0;width:32px;height:31px;display:flex;align-items:center;justify-content:center">${icon}</span>
  </div>`;
}

/** Ghim theo danh mục chính (màu + icon), có bản nổi bật khi rê chuột trên thẻ tin. */
export function getPinIcon(main: Pick<MainCategory, "color" | "icon"> | undefined, highlighted = false) {
  const key = `${main?.color}:${main?.icon}:${highlighted}`;
  let icon = cache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: "",
      html: pinHtml(main, highlighted),
      iconSize: [32, 42],
      iconAnchor: [16, 41],
      popupAnchor: [0, -38],
    });
    cache.set(key, icon);
  }
  return icon;
}

/** Biểu tượng cụm ghim: vòng tròn màu chính với số tin. */
export function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 100 ? 42 : 48;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:var(--primary);color:var(--primary-foreground);display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;border:3px solid #fff;box-shadow:0 1px 4px rgb(0 0 0 / .35)">${count}</div>`,
    iconSize: [size, size],
  });
}
