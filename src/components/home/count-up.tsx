"use client";

import { useEffect, useRef } from "react";
import { formatNumber } from "@/lib/format";

const DURATION_MS = 1500;
const shortFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** 12345 → "12.345"; từ 1 triệu trở lên rút gọn: 1234567 → "1,2 triệu". */
export function formatStat(n: number) {
  if (n >= 1_000_000_000) return `${shortFormat.format(n / 1_000_000_000)} tỷ`;
  if (n >= 1_000_000) return `${shortFormat.format(n / 1_000_000)} triệu`;
  return formatNumber(Math.round(n));
}

/**
 * Số đếm tăng dần từ 0 khi cuộn tới. Server đã render sẵn số cuối (đúng cả khi chưa chạy JS);
 * người dùng bật prefers-reduced-motion thì giữ nguyên, không chạy hiệu ứng.
 */
export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    el.textContent = formatStat(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          const eased = 1 - Math.pow(1 - t, 3); // chậm dần ở cuối
          el.textContent = formatStat(value * eased);
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      el.textContent = formatStat(value);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {formatStat(value)}
    </span>
  );
}
