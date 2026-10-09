-- =============================================================================
-- 0008_search_text_range_filters.sql
-- Sửa bộ lọc trường riêng của search_listings (giữ nguyên tham số và kết quả như 0005):
-- trước đây chỉ lọc được Lựa chọn (mảng) và Số / Năm (min-max); trường Văn bản và Khoảng số
-- mà Admin bật "Dùng làm bộ lọc" thì không lọc được.
--
-- p_attr_filters: { "<key>": <bộ lọc> }, mỗi bộ lọc là một trong:
--   ["a", "b"]                 Lựa chọn: giá trị thuộc danh sách
--   {"min": 1, "max": 9}       Số / Năm: giá trị trong khoảng; Khoảng số: khoảng của tin giao với khoảng lọc
--   {"contains": "poodle"}     Văn bản: chứa chuỗi (không phân biệt hoa thường)
--   "abc" / 1 / true           so khớp chính xác
-- =============================================================================

create or replace function public.search_listings(
  p_lat           double precision default null,
  p_lng           double precision default null,
  p_radius_km     double precision default 5,
  p_category_ids  integer[]        default null,
  p_min_price     bigint           default null,
  p_max_price     bigint           default null,
  p_attr_filters  jsonb            default '{}'::jsonb,  -- xem đầu file
  p_keyword       text             default null,
  p_limit         integer          default 30,
  p_offset        integer          default 0,
  p_sort          text             default 'nearest'
)
returns table (
  id                  uuid,
  title               text,
  price               bigint,
  price_unit          text,
  category_id         integer,
  parent_category_id  integer,
  province            text,
  district            text,
  created_at          timestamptz,
  lat                 double precision,
  lng                 double precision,
  distance_m          double precision,
  cover_image_path    text
)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select
      case
        when p_lat is not null and p_lng is not null
          then extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
      end as origin,
      coalesce((
        select jsonb_object_agg(f.key, f.value)
        from jsonb_each(coalesce(p_attr_filters, '{}'::jsonb)) f
        where jsonb_typeof(f.value) not in ('object', 'array', 'null')
      ), '{}'::jsonb) as attr_equals,
      nullif(btrim(p_keyword), '') as keyword
  ),
  found as (
    select
      l.id, l.title, l.price, l.price_unit, l.category_id, c.parent_id as parent_category_id,
      l.province, l.district, l.created_at,
      extensions.st_y(l.public_location::extensions.geometry) as lat,
      extensions.st_x(l.public_location::extensions.geometry) as lng,
      case when p.origin is not null
        then extensions.st_distance(l.public_location, p.origin)
      end as distance_m
    from public.listings l
    join public.categories c on c.id = l.category_id
    join public.profiles s on s.id = l.seller_id
    cross join params p
    where l.status = 'active'
      and not s.is_banned
      and (
        p.origin is null
        or extensions.st_dwithin(l.public_location, p.origin, greatest(p_radius_km, 0) * 1000)
      )
      and (
        p_category_ids is null or cardinality(p_category_ids) = 0
        or l.category_id = any (p_category_ids)
        or c.parent_id = any (p_category_ids)
      )
      and (p_min_price is null or l.price >= p_min_price)
      and (p_max_price is null or l.price <= p_max_price)
      and (
        p.keyword is null
        or l.title ilike '%' || p.keyword || '%'
        or l.description ilike '%' || p.keyword || '%'
      )
      and l.attributes @> p.attr_equals
      and not exists (
        select 1
        from jsonb_each(coalesce(p_attr_filters, '{}'::jsonb)) f
        where jsonb_typeof(f.value) in ('object', 'array')
          and not coalesce(
            case jsonb_typeof(f.value)
              when 'array' then exists (
                select 1 from jsonb_array_elements_text(f.value) v
                where v = l.attributes ->> f.key
              )
              when 'object' then case
                -- Văn bản: {"contains": "poodle"} → chứa chuỗi, không phân biệt hoa thường
                when f.value ? 'contains' then
                  jsonb_typeof(l.attributes -> f.key) = 'string'
                  and l.attributes ->> f.key ilike '%' || replace(replace(replace(
                        f.value ->> 'contains', '\', '\\'), '%', '\%'), '_', '\_') || '%'
                -- Số / năm: giá trị nằm trong [min, max]
                when jsonb_typeof(l.attributes -> f.key) = 'number' then
                  (f.value -> 'min' is null or (l.attributes -> f.key)::numeric >= (f.value ->> 'min')::numeric)
                  and (f.value -> 'max' is null or (l.attributes -> f.key)::numeric <= (f.value ->> 'max')::numeric)
                -- Khoảng số (VD lương {min, max}): khoảng của tin giao với [min, max] của bộ lọc
                when jsonb_typeof(l.attributes -> f.key) = 'object' then
                  (f.value -> 'min' is null
                    or coalesce(l.attributes -> f.key ->> 'max', l.attributes -> f.key ->> 'min')::numeric
                       >= (f.value ->> 'min')::numeric)
                  and (f.value -> 'max' is null
                    or coalesce(l.attributes -> f.key ->> 'min', l.attributes -> f.key ->> 'max')::numeric
                       <= (f.value ->> 'max')::numeric)
                else false
              end
            end,
            false
          )
      )
  )
  select
    f.id, f.title, f.price, f.price_unit, f.category_id, f.parent_category_id,
    f.province, f.district, f.created_at, f.lat, f.lng, f.distance_m,
    (
      select i.path from public.listing_images i
      where i.listing_id = f.id
      order by i.sort_order, i.created_at
      limit 1
    ) as cover_image_path
  from found f
  order by
    case when p_sort = 'price_asc'  then f.price end asc  nulls last,
    case when p_sort = 'price_desc' then f.price end desc nulls last,
    case when p_sort = 'nearest'    then f.distance_m end asc nulls last,
    f.created_at desc,
    f.id
  limit least(greatest(coalesce(p_limit, 30), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke execute on function public.search_listings from public, anon, authenticated;
grant execute on function public.search_listings to anon, authenticated;
