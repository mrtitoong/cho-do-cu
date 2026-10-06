/** Tâm bản đồ mặc định khi chưa có vị trí: TP. Hồ Chí Minh (đổi tại đây nếu cần). */
export const DEFAULT_MAP_CENTER = { lat: 10.7769, lng: 106.7009 };
export const DEFAULT_MAP_ZOOM = 12;
/** Mức zoom khi đã chọn được một địa điểm cụ thể. */
export const PICKED_MAP_ZOOM = 16;

/** Khung toạ độ bao lãnh thổ Việt Nam (kể cả các đảo), dùng để kiểm tra vị trí tin đăng. */
export const VIETNAM_BOUNDS = { minLat: 8, maxLat: 23.5, minLng: 102, maxLng: 117.5 };
/** Tên khu vực của tâm mặc định, dùng trong thông báo. */
export const DEFAULT_CITY_NAME = "TP. Hồ Chí Minh";
