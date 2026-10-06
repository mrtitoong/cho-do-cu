import { z } from "zod";

/**
 * Số điện thoại Việt Nam 10 chữ số, bắt đầu bằng 0 (khớp check trong bảng profiles).
 * Chấp nhận dấu cách/chấm/gạch và đầu +84; chuỗi rỗng → null (xóa số).
 */
export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, "").replace(/^\+?84/, "0"))
  .pipe(
    z.union([
      z.literal("").transform(() => null),
      z.string().regex(/^0[35789][0-9]{8}$/, "Số điện thoại phải gồm 10 chữ số, ví dụ 0912 345 678"),
    ]),
  );
