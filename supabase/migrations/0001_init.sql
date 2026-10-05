-- =============================================================================
-- Chợ Đồ Cũ – 0001_init.sql
-- Cơ sở dữ liệu ban đầu: profiles, categories, listings, listing_images,
-- conversations, messages, phone_reveals, Storage bucket, RLS và hàm RPC.
--
-- Quy ước: mọi hàm đều đặt `set search_path = ''` và ghi đầy đủ tên schema
-- (public., extensions., auth., storage.) để tránh tấn công qua search_path.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Extension
-- -----------------------------------------------------------------------------
create extension if not exists postgis with schema extensions;


-- -----------------------------------------------------------------------------
-- Hàm dùng chung: tự cập nhật updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 2. profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  avatar_url  text,
  phone       text check (phone ~ '^0[0-9]{9}$'),  -- số Việt Nam 10 chữ số
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Tự tạo profile khi có user mới (lấy tên/ảnh từ metadata, ví dụ đăng nhập Google).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Tạo profile cho các tài khoản đã đăng ký từ giai đoạn 1.
insert into public.profiles (id, full_name, avatar_url, created_at)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
  u.created_at
from auth.users u
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 3. categories (+ seed)
-- -----------------------------------------------------------------------------
create table public.categories (
  id          integer generated always as identity primary key,
  parent_id   integer references public.categories (id) on delete restrict,
  slug        text not null unique,
  name        text not null,
  icon        text not null,          -- tên icon lucide-react (kebab-case)
  sort_order  integer not null default 0
);

create index categories_parent_id_idx on public.categories (parent_id);

alter table public.categories enable row level security;

insert into public.categories (parent_id, slug, name, icon, sort_order) values
  (null, 'bat-dong-san',  'Bất động sản',  'house',              1),
  (null, 'viec-lam',      'Việc làm',      'briefcase-business', 2),
  (null, 'xe-co',         'Xe cộ',         'car',                3),
  (null, 'do-dien-tu',    'Đồ điện tử',    'smartphone',         4),
  (null, 'san-pham-khac', 'Sản phẩm khác', 'package',            5);

insert into public.categories (parent_id, slug, name, icon, sort_order)
select p.id, c.slug, c.name, c.icon, c.sort_order
from (values
  ('bat-dong-san',  'nha-o',          'Nhà ở',          'house',         1),
  ('bat-dong-san',  'can-ho',         'Căn hộ',         'building-2',    2),
  ('bat-dong-san',  'dat',            'Đất',            'land-plot',     3),
  ('bat-dong-san',  'phong-tro',      'Phòng trọ',      'bed-double',    4),
  ('bat-dong-san',  'mat-bang',       'Mặt bằng',       'store',         5),
  ('viec-lam',      'toan-thoi-gian', 'Toàn thời gian', 'briefcase-business', 1),
  ('viec-lam',      'ban-thoi-gian',  'Bán thời gian',  'clock',         2),
  ('viec-lam',      'thoi-vu',        'Thời vụ',        'calendar-days', 3),
  ('xe-co',         'xe-may',         'Xe máy',         'motorbike',     1),
  ('xe-co',         'o-to',           'Ô tô',           'car',           2),
  ('xe-co',         'xe-dap',         'Xe đạp',         'bike',          3),
  ('xe-co',         'phu-tung',       'Phụ tùng',       'wrench',        4),
  ('do-dien-tu',    'dien-thoai',     'Điện thoại',     'smartphone',    1),
  ('do-dien-tu',    'laptop',         'Laptop',         'laptop',        2),
  ('do-dien-tu',    'tivi',           'Tivi',           'tv',            3),
  ('do-dien-tu',    'may-anh',        'Máy ảnh',        'camera',        4),
  ('do-dien-tu',    'phu-kien',       'Phụ kiện',       'headphones',    5),
  ('san-pham-khac', 'noi-that',       'Nội thất',       'sofa',          1),
  ('san-pham-khac', 'thoi-trang',     'Thời trang',     'shirt',         2),
  ('san-pham-khac', 'do-gia-dung',    'Đồ gia dụng',    'cooking-pot',   3),
  ('san-pham-khac', 'sach',           'Sách',           'book-open',     4),
  ('san-pham-khac', 'khac',           'Khác',           'ellipsis',      5)
) as c (parent_slug, slug, name, icon, sort_order)
join public.categories p on p.slug = c.parent_slug;


-- -----------------------------------------------------------------------------
-- 4. listings
-- -----------------------------------------------------------------------------
create table public.listings (
  id               uuid primary key default gen_random_uuid(),
  seller_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category_id      integer not null references public.categories (id) on delete restrict,
  title            text not null check (char_length(title) between 10 and 70),
  description      text not null check (char_length(description) >= 20),
  price            bigint check (price >= 0),          -- null = "Thỏa thuận"
  price_unit       text not null default 'total' check (price_unit in ('total', 'month')),
  attributes       jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  status           text not null default 'active' check (status in ('active', 'sold', 'hidden')),
  location         extensions.geography(Point, 4326),  -- vị trí thật, KHÔNG công khai
  public_location  extensions.geography(Point, 4326),  -- vị trí đã làm mờ, do trigger tính
  address_text     text,
  province         text,
  district         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index listings_public_location_idx on public.listings using gist (public_location);
create index listings_category_id_idx     on public.listings (category_id);
create index listings_status_idx          on public.listings (status);
create index listings_created_at_idx      on public.listings (created_at desc);
create index listings_attributes_idx      on public.listings using gin (attributes);
create index listings_seller_id_idx       on public.listings (seller_id);

alter table public.listings enable row level security;

-- Tin chỉ được gắn vào danh mục con (parent_id khác null).
create or replace function public.listings_check_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.parent_id is not null
  ) then
    raise exception 'category_id % phải là danh mục con', new.category_id
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger listings_check_category
  before insert or update of category_id on public.listings
  for each row execute function public.listings_check_category();

-- Tính public_location = location lệch ngẫu nhiên 200–400 m theo hướng ngẫu nhiên.
-- Chạy ở MỌI insert/update để client không tự ghi đè public_location
-- (ví dụ gán bằng toạ độ thật).
create or replace function public.listings_set_public_location()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.location is not distinct from old.location then
    new.public_location := old.public_location;
  elsif new.location is null then
    new.public_location := null;
  else
    new.public_location := extensions.st_project(
      new.location,
      200 + random() * 200,          -- khoảng cách (m)
      radians(random() * 360)        -- hướng
    );
  end if;
  return new;
end;
$$;

create trigger listings_set_public_location
  before insert or update on public.listings
  for each row execute function public.listings_set_public_location();

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 5. listing_images
-- -----------------------------------------------------------------------------
create table public.listing_images (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references public.listings (id) on delete cascade,
  path        text not null,      -- đường dẫn trong bucket listing-images
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index listing_images_listing_id_idx on public.listing_images (listing_id, sort_order);

alter table public.listing_images enable row level security;


-- -----------------------------------------------------------------------------
-- 6. conversations
-- -----------------------------------------------------------------------------
create table public.conversations (
  id               uuid primary key default gen_random_uuid(),
  listing_id       uuid not null references public.listings (id) on delete cascade,
  buyer_id         uuid not null references public.profiles (id) on delete cascade,
  seller_id        uuid not null references public.profiles (id) on delete cascade,
  last_message_at  timestamptz,
  created_at       timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create index conversations_buyer_id_idx  on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_id_idx on public.conversations (seller_id, last_message_at desc);

alter table public.conversations enable row level security;


-- -----------------------------------------------------------------------------
-- 7. messages
-- -----------------------------------------------------------------------------
create table public.messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.conversations (id) on delete cascade,
  sender_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body             text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at       timestamptz not null default now(),
  read_at          timestamptz
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_id_idx       on public.messages (sender_id);

alter table public.messages enable row level security;


-- -----------------------------------------------------------------------------
-- phone_reveals: nhật ký xem số điện thoại (chỉ hàm get_seller_phone ghi)
-- -----------------------------------------------------------------------------
create table public.phone_reveals (
  id          bigint generated always as identity primary key,
  viewer_id   uuid not null references auth.users (id) on delete cascade,
  listing_id  uuid references public.listings (id) on delete set null,
  seller_id   uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index phone_reveals_viewer_idx on public.phone_reveals (viewer_id, created_at desc);

alter table public.phone_reveals enable row level security;
-- Không có policy nào: anon/authenticated không đọc/ghi trực tiếp được.


-- =============================================================================
-- QUYỀN CỘT (column privileges)
-- RLS lọc theo HÀNG; muốn giấu một CỘT phải dùng GRANT/REVOKE.
-- Thu hồi quyền cả bảng rồi cấp lại từng cột được phép.
-- Lưu ý: vì vậy client KHÔNG được dùng select('*') trên profiles và listings,
-- phải liệt kê cột cụ thể.
-- =============================================================================

-- profiles: ẩn cột phone; chỉ cho sửa full_name, avatar_url, phone.
revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, created_at) on public.profiles to anon, authenticated;
grant update (full_name, avatar_url, phone)          on public.profiles to authenticated;

-- listings: ẩn cột location với mọi người (kể cả chủ tin, chủ tin đọc qua get_my_listing_location).
revoke all on public.listings from anon, authenticated;
grant select (
  id, seller_id, category_id, title, description, price, price_unit, attributes,
  status, public_location, address_text, province, district, created_at, updated_at
) on public.listings to anon, authenticated;
grant insert (
  category_id, title, description, price, price_unit, attributes, status,
  location, address_text, province, district
) on public.listings to authenticated;
grant update (
  category_id, title, description, price, price_unit, attributes, status,
  location, address_text, province, district
) on public.listings to authenticated;
grant delete on public.listings to authenticated;

-- Các bảng còn lại: khách (anon) chỉ được đọc những gì RLS cho phép.
revoke insert, update, delete, truncate, references, trigger
  on public.categories, public.listing_images, public.conversations, public.messages
  from anon;
revoke truncate, references, trigger
  on public.categories, public.listing_images, public.conversations, public.messages
  from authenticated;
revoke all on public.phone_reveals from anon, authenticated;


-- =============================================================================
-- RLS POLICIES
-- (select auth.uid()) được bọc trong select để Postgres chỉ tính 1 lần/truy vấn.
-- =============================================================================

-- profiles -------------------------------------------------------------------
create policy "profiles: ai cũng xem được"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles: chủ sở hữu sửa hồ sơ của mình"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- categories -----------------------------------------------------------------
create policy "categories: ai cũng xem được"
  on public.categories for select
  to anon, authenticated
  using (true);

-- listings -------------------------------------------------------------------
create policy "listings: xem tin đang hiển thị hoặc tin của mình"
  on public.listings for select
  to anon, authenticated
  using (status = 'active' or seller_id = (select auth.uid()));

create policy "listings: đăng tin dưới tên mình"
  on public.listings for insert
  to authenticated
  with check (seller_id = (select auth.uid()));

create policy "listings: sửa tin của mình"
  on public.listings for update
  to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

create policy "listings: xóa tin của mình"
  on public.listings for delete
  to authenticated
  using (seller_id = (select auth.uid()));

-- listing_images -------------------------------------------------------------
create policy "listing_images: xem ảnh của tin mình được phép xem"
  on public.listing_images for select
  to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id));  -- RLS của listings áp dụng

create policy "listing_images: chủ tin thêm ảnh"
  on public.listing_images for insert
  to authenticated
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
    -- ảnh phải nằm trong thư mục {user_id}/{listing_id}/ của chính mình
    and path like (select auth.uid())::text || '/' || listing_id::text || '/%'
  );

create policy "listing_images: chủ tin sửa thứ tự ảnh"
  on public.listing_images for update
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
    and path like (select auth.uid())::text || '/' || listing_id::text || '/%'
  );

create policy "listing_images: chủ tin xóa ảnh"
  on public.listing_images for delete
  to authenticated
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );

-- conversations --------------------------------------------------------------
create policy "conversations: người mua/bán xem cuộc trò chuyện của mình"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));

create policy "conversations: người mua mở cuộc trò chuyện với đúng người bán của tin"
  on public.conversations for insert
  to authenticated
  with check (
    buyer_id = (select auth.uid())
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = conversations.seller_id
        and l.status = 'active'
    )
  );

-- messages -------------------------------------------------------------------
create policy "messages: người trong cuộc trò chuyện xem tin nhắn"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );

create policy "messages: người trong cuộc trò chuyện gửi tin dưới tên mình"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );


-- =============================================================================
-- 8. STORAGE: bucket listing-images
-- Bucket public → ai cũng tải ảnh được qua public URL (không cần policy SELECT).
-- Chỉ chủ thư mục {user_id}/ được upload/sửa/xóa.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  1048576,  -- 1 MB (ảnh đã nén trên trình duyệt thường < 500 KB)
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do nothing;

-- SELECT cần cho thao tác remove/upsert qua API; chỉ thấy file trong thư mục của mình.
create policy "listing-images: chủ thư mục xem danh sách file"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "listing-images: upload vào thư mục của mình"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "listing-images: sửa file trong thư mục của mình"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "listing-images: xóa file trong thư mục của mình"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- =============================================================================
-- HÀM RPC
-- Supabase mặc định cho anon/authenticated quyền EXECUTE mọi hàm mới trong
-- public, nên sau mỗi hàm đều revoke rồi grant lại đúng đối tượng.
-- =============================================================================

-- search_listings ------------------------------------------------------------
-- Tìm tin active. Chỉ trả toạ độ public_location (đã làm mờ), không bao giờ trả location.
--
-- p_lat, p_lng, p_radius_km : null = không lọc theo vị trí
-- p_category_ids            : id danh mục chính hoặc con; chọn danh mục chính = lấy mọi danh mục con
-- p_attr_filters            : lọc theo attributes, mỗi key một điều kiện:
--     {"hinh_thuc": "ban"}                → bằng đúng giá trị (đúng kiểu: số là số, chuỗi là chuỗi)
--     {"hang": ["honda", "yamaha"]}        → thuộc danh sách
--     {"dien_tich": {"min": 30, "max": 80}} → khoảng số (min/max đều tùy chọn)
-- p_sort                    : 'nearest' | 'newest' | 'price_asc' | 'price_desc'
create or replace function public.search_listings(
  p_lat           double precision default null,
  p_lng           double precision default null,
  p_radius_km     double precision default 5,
  p_category_ids  integer[]        default null,
  p_min_price     bigint           default null,
  p_max_price     bigint           default null,
  p_attr_filters  jsonb            default '{}'::jsonb,
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
      -- các điều kiện "bằng đúng giá trị" gom lại để dùng index GIN (@>)
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
    cross join params p
    where l.status = 'active'
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
      -- điều kiện dạng danh sách / khoảng số: tin phải thỏa TẤT CẢ
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
              when 'object' then
                jsonb_typeof(l.attributes -> f.key) = 'number'
                and (f.value -> 'min' is null or (l.attributes -> f.key)::numeric >= (f.value ->> 'min')::numeric)
                and (f.value -> 'max' is null or (l.attributes -> f.key)::numeric <= (f.value ->> 'max')::numeric)
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


-- get_seller_phone -----------------------------------------------------------
-- Trả số điện thoại người bán của một tin đang hiển thị.
-- - Chưa đăng nhập: báo lỗi.
-- - Người bán chưa khai số: trả null (UI hiện "Người bán chỉ nhận chat").
-- - Mỗi người xem tối đa 30 số (người bán khác nhau) trong 24 giờ;
--   xem lại số đã xem trong 24 giờ không bị tính thêm.
create or replace function public.get_seller_phone(p_listing_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_viewer  uuid := auth.uid();
  v_seller  uuid;
  v_phone   text;
begin
  if v_viewer is null then
    raise exception 'Bạn cần đăng nhập để xem số điện thoại'
      using errcode = '42501';
  end if;

  select l.seller_id, pr.phone
    into v_seller, v_phone
  from public.listings l
  join public.profiles pr on pr.id = l.seller_id
  where l.id = p_listing_id
    and (l.status = 'active' or l.seller_id = v_viewer);

  if not found or v_phone is null then
    return null;
  end if;

  if v_seller = v_viewer then
    return v_phone;
  end if;

  -- Khoá theo người xem để các request song song không vượt giới hạn.
  perform pg_advisory_xact_lock(hashtextextended(v_viewer::text, 0));

  if not exists (
    select 1 from public.phone_reveals r
    where r.viewer_id = v_viewer
      and r.seller_id = v_seller
      and r.created_at > now() - interval '24 hours'
  ) and (
    select count(distinct r.seller_id) from public.phone_reveals r
    where r.viewer_id = v_viewer
      and r.created_at > now() - interval '24 hours'
  ) >= 30 then
    raise exception 'Bạn đã xem quá 30 số điện thoại trong 24 giờ, vui lòng thử lại sau'
      using errcode = 'P0001', hint = 'phone_reveal_limit';
  end if;

  insert into public.phone_reveals (viewer_id, listing_id, seller_id)
  values (v_viewer, p_listing_id, v_seller);

  return v_phone;
end;
$$;

revoke execute on function public.get_seller_phone from public, anon, authenticated;
grant execute on function public.get_seller_phone to authenticated;


-- get_my_phone ---------------------------------------------------------------
-- Cột phone bị ẩn với mọi người, nên chủ tài khoản đọc số của chính mình qua hàm này
-- (dùng cho trang /ho-so).
create or replace function public.get_my_phone()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.phone from public.profiles p where p.id = auth.uid();
$$;

revoke execute on function public.get_my_phone from public, anon, authenticated;
grant execute on function public.get_my_phone to authenticated;


-- get_my_listing_location ----------------------------------------------------
-- Cột location bị ẩn với mọi người, nên chủ tin đọc vị trí thật của tin mình qua hàm này
-- (dùng cho trang sửa tin).
create or replace function public.get_my_listing_location(p_listing_id uuid)
returns table (lat double precision, lng double precision)
language sql
stable
security definer
set search_path = ''
as $$
  select
    extensions.st_y(l.location::extensions.geometry),
    extensions.st_x(l.location::extensions.geometry)
  from public.listings l
  where l.id = p_listing_id
    and l.seller_id = auth.uid()
    and l.location is not null;
$$;

revoke execute on function public.get_my_listing_location from public, anon, authenticated;
grant execute on function public.get_my_listing_location to authenticated;


-- Hàm trigger không cần gọi qua API.
revoke execute on function
  public.set_updated_at(),
  public.handle_new_user(),
  public.listings_check_category(),
  public.listings_set_public_location()
from public, anon, authenticated;
