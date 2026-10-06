"use client"; // Error boundary phải là Client Component

import { useEffect } from "react";

/**
 * Lỗi ở chính layout gốc: thay cả trang nên phải tự có <html>, <body>
 * và không dùng được CSS chung → viết style trực tiếp.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="vi">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          color: "#1c1917",
        }}
      >
        <title>Đã xảy ra lỗi | Chợ Đồ Cũ</title>
        <div style={{ maxWidth: 400 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Đã xảy ra lỗi</h1>
          <p style={{ color: "#57534e", margin: "0 0 24px" }}>
            Chợ Đồ Cũ đang gặp sự cố. Vui lòng thử lại sau ít phút.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 44,
              padding: "0 20px",
              border: 0,
              borderRadius: 8,
              background: "#ea580c",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
      </body>
    </html>
  );
}
