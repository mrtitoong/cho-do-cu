"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const AreaMap = dynamic(() => import("./area-map"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

export function AreaMapLoader({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="relative isolate h-56 overflow-hidden rounded-xl border">
      <AreaMap lat={lat} lng={lng} />
    </div>
  );
}
