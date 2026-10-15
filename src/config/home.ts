/** Trang chủ tự làm mới dữ liệu sau bấy nhiêu giây (10 phút). */
export const HOME_REVALIDATE_SECONDS = 600;

/**
 * Khối "Thống kê nền tảng" chỉ hiện con số khi đạt ngưỡng này; dưới ngưỡng thì ẩn số đó
 * (cả 3 số đều dưới ngưỡng thì ẩn cả khối). Đặt 0 để luôn hiện khi thử nghiệm.
 */
export const STATS_MIN_VISIBLE = 0;

/** Số tin ở khối "Tin đăng mới". */
export const HOME_LATEST_LIMIT = 8;

/** Bán kính (km) để ưu tiên tin gần người xem khi đã có quyền vị trí. */
export const HOME_NEARBY_RADIUS_KM = 10;
