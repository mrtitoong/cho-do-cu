import { createElement } from "react";
import {
  BedDouble,
  Bike,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Car,
  Clock,
  CookingPot,
  Ellipsis,
  Headphones,
  House,
  LandPlot,
  Laptop,
  Motorbike,
  Package,
  Shirt,
  Smartphone,
  Sofa,
  Store,
  Tv,
  Wrench,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/*
 * Cột categories.icon lưu tên icon lucide-react dạng kebab-case ("briefcase-business").
 * Chỉ import các icon trong bảng dưới (không import cả bộ lucide để bundle nhỏ);
 * tên lạ hiển thị icon mặc định Package.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "bed-double": BedDouble,
  bike: Bike,
  "book-open": BookOpen,
  "briefcase-business": BriefcaseBusiness,
  "building-2": Building2,
  "calendar-days": CalendarDays,
  camera: Camera,
  car: Car,
  clock: Clock,
  "cooking-pot": CookingPot,
  ellipsis: Ellipsis,
  headphones: Headphones,
  house: House,
  "land-plot": LandPlot,
  laptop: Laptop,
  motorbike: Motorbike,
  package: Package,
  shirt: Shirt,
  smartphone: Smartphone,
  sofa: Sofa,
  store: Store,
  tv: Tv,
  wrench: Wrench,
};

export function getCategoryIcon(name: string | null | undefined): LucideIcon {
  return (name && CATEGORY_ICONS[name]) || Package;
}

/** Icon của danh mục theo tên lưu trong DB. */
export function CategoryIcon({ name, ...props }: LucideProps & { name: string | null | undefined }) {
  return createElement(getCategoryIcon(name), props);
}
