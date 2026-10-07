-- =============================================================================
-- 0005_admin_news_stats.sql
-- Cập nhật cơ sở dữ liệu theo thiết kế mới (khu vực Admin, tin tức, thống kê,
-- giao dịch thành công, khóa tài khoản, danh mục lưu trong DB).
--
-- Chạy được trên dữ liệu đang có, KHÔNG xóa dữ liệu cũ:
--   - Mọi cột mới đều có giá trị mặc định hoặc cho phép null.
--   - Trường riêng của danh mục được chuyển từ src/config/categories.ts vào categories.fields.
--   - Tin đã bán (status = 'sold') có sẵn được tạo bù 1 dòng transactions.
--
-- Quy ước giữ như 0001: mọi hàm đặt `set search_path = ''`, ghi đầy đủ tên schema,
-- sau mỗi hàm revoke rồi grant lại đúng đối tượng.
-- =============================================================================


-- =============================================================================
-- 1. profiles: vai trò, khóa tài khoản, lần hoạt động cuối
-- =============================================================================
alter table public.profiles
  add column role          text not null default 'user' check (role in ('user', 'admin')),
  add column is_banned     boolean not null default false,
  add column banned_reason text,
  add column last_seen_at  timestamptz,
  -- khóa tài khoản bắt buộc có lý do
  add constraint profiles_banned_reason_check
    check (not is_banned or nullif(btrim(banned_reason), '') is not null);

create index profiles_admin_idx on public.profiles (id) where role = 'admin';


-- -----------------------------------------------------------------------------
-- Hàm kiểm tra quyền (security definer vì cột role / is_banned KHÔNG cấp quyền SELECT
-- cho anon/authenticated, policy RLS không đọc trực tiếp được).
-- -----------------------------------------------------------------------------

-- is_admin(): người đang đăng nhập có phải admin không.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

revoke execute on function public.is_admin from public, anon, authenticated;
grant execute on function public.is_admin to anon, authenticated;

-- is_user_banned(user_id): tài khoản có đang bị khóa không (dùng trong policy).
create or replace function public.is_user_banned(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_banned from public.profiles p where p.id = p_user_id),
    false
  );
$$;

revoke execute on function public.is_user_banned from public, anon, authenticated;
grant execute on function public.is_user_banned to anon, authenticated;

-- get_my_account(): vai trò và trạng thái khóa của CHÍNH MÌNH
-- (thông báo "Tài khoản đã bị khóa" ở trang đăng tin, menu "Quản trị" sau này).
create or replace function public.get_my_account()
returns table (role text, is_banned boolean, banned_reason text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.role, p.is_banned, p.banned_reason
  from public.profiles p
  where p.id = auth.uid();
$$;

revoke execute on function public.get_my_account from public, anon, authenticated;
grant execute on function public.get_my_account to authenticated;


-- -----------------------------------------------------------------------------
-- Quyền cột profiles
-- role, is_banned, banned_reason, last_seen_at KHÔNG được đọc trực tiếp (giống phone).
-- Cấp quyền UPDATE role / is_banned / banned_reason cho authenticated để Admin sửa qua API,
-- trigger profiles_guard bên dưới chặn mọi người không phải Admin.
-- -----------------------------------------------------------------------------
grant update (role, is_banned, banned_reason) on public.profiles to authenticated;

create policy "profiles: admin sửa mọi hồ sơ"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Trigger bảo vệ (security invoker để current_user là người gọi thật):
--  - Chỉ Admin đổi được role / is_banned / banned_reason / last_seen_at.
--  - Admin không tự khóa / tự thu quyền của mình.
--  - Admin sửa hồ sơ người khác thì CHỈ được đổi các cột trên (không sửa tên, số điện thoại...).
--  - SQL Editor / service_role (current_user khác anon, authenticated) được bỏ qua.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if (new.role, new.is_banned, new.banned_reason, new.last_seen_at)
     is distinct from (old.role, old.is_banned, old.banned_reason, old.last_seen_at) then
    if not public.is_admin() then
      raise exception 'Bạn không có quyền đổi vai trò hoặc trạng thái khóa tài khoản'
        using errcode = '42501';
    end if;
    if new.id = auth.uid() then
      raise exception 'Admin không được tự khóa hoặc tự thu quyền của chính mình'
        using errcode = '42501';
    end if;
  end if;

  if new.id is distinct from auth.uid()
     and (new.full_name, new.avatar_url, new.phone)
         is distinct from (old.full_name, old.avatar_url, old.phone) then
    raise exception 'Admin chỉ được đổi vai trò và trạng thái khóa của người dùng khác'
      using errcode = '42501';
  end if;

  if not new.is_banned then
    new.banned_reason := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.profiles_guard from public, anon, authenticated;

create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();


-- =============================================================================
-- 2. categories: màu, bật/tắt, nhãn giá, bắt buộc ảnh, trường riêng (fields)
--
-- fields là mảng JSON, mỗi phần tử là một trường:
--   { key, label, type: 'text'|'number'|'select'|'range'|'year', unit?, options?: [{value,label}],
--     required, filterable,
--     placeholder?, decimal? (cho phép số thập phân), min?, max?   -- năm: max mặc định = năm hiện tại + 1
--     rentValue?  (select) chọn giá trị này thì nhãn giá thành "Giá thuê/tháng", giá tính theo tháng
--     asPrice?    (range)  mức dưới của khoảng dùng làm giá tin (VD mức lương Việc làm)
--     hidden?     ẩn trường khỏi form (dữ liệu cũ vẫn giữ trong listings.attributes) }
--
-- Danh mục con KẾ THỪA fields của danh mục cha: lấy danh sách của cha; trường con trùng key
-- THAY THẾ trường của cha tại chỗ (VD "Hãng" của Xe máy có danh sách hãng riêng, hoặc
-- {"key": "so_wc", "hidden": true} để bỏ trường của cha); trường con có key mới thêm vào cuối.
--
-- color, price_label, requires_images: bắt buộc ở danh mục chính.
-- Danh mục con để null = dùng của danh mục cha (price_label của con có thể ghi đè, VD Phòng trọ).
-- =============================================================================
alter table public.categories
  add column color           text check (color ~ '^#[0-9a-fA-F]{6}$'),
  add column is_active       boolean not null default true,
  add column price_label     text check (price_label in ('Giá bán', 'Giá thuê/tháng', 'Mức lương')),
  add column requires_images boolean,
  add column fields          jsonb not null default '[]'::jsonb check (jsonb_typeof(fields) = 'array');

-- Chuyển cấu hình từ src/config/categories.ts vào DB.
-- (Sinh tự động từ file config; đã kiểm tra gộp cha + con cho ra đúng danh sách trường cũ.)
update public.categories c
set color = v.color, price_label = v.price_label, requires_images = v.requires_images, fields = v.fields::jsonb
from (values
  ('bat-dong-san', '#16a34a', 'Giá bán', true,
   '[{"key":"hinh_thuc","label":"Hình thức","type":"select","options":[{"value":"ban","label":"Bán"},{"value":"cho_thue","label":"Cho thuê"}],"required":true,"filterable":true,"rentValue":"cho_thue"},{"key":"dien_tich","label":"Diện tích","type":"number","unit":"m²","required":true,"filterable":true,"decimal":true,"min":1,"max":1000000},{"key":"so_phong_ngu","label":"Số phòng ngủ","type":"number","unit":"phòng","required":false,"filterable":true,"min":0,"max":50},{"key":"so_wc","label":"Số WC","type":"number","unit":"phòng","required":false,"filterable":false,"min":0,"max":50},{"key":"giay_to","label":"Giấy tờ pháp lý","type":"select","options":[{"value":"so_hong","label":"Sổ hồng"},{"value":"so_do","label":"Sổ đỏ"},{"value":"giay_tay","label":"Giấy tay"},{"value":"dang_cho_so","label":"Đang chờ sổ"}],"required":false,"filterable":true}]'),
  ('viec-lam', '#7c3aed', 'Mức lương', false,
   '[{"key":"luong","label":"Mức lương","type":"range","unit":"đ/tháng","required":false,"filterable":false,"min":0,"max":10000000000,"asPrice":true},{"key":"nganh_nghe","label":"Ngành nghề","type":"select","options":[{"value":"ban_hang","label":"Bán hàng"},{"value":"phuc_vu","label":"Phục vụ / Nhà hàng"},{"value":"giao_hang","label":"Giao hàng / Tài xế"},{"value":"kho_van","label":"Kho vận"},{"value":"lao_dong_pho_thong","label":"Lao động phổ thông"},{"value":"van_phong","label":"Văn phòng"},{"value":"ky_thuat","label":"Kỹ thuật"},{"value":"cntt","label":"Công nghệ thông tin"},{"value":"giao_duc","label":"Giáo dục"},{"value":"y_te","label":"Y tế"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true},{"key":"kinh_nghiem","label":"Kinh nghiệm","type":"select","options":[{"value":"khong_yeu_cau","label":"Không yêu cầu"},{"value":"duoi_1_nam","label":"Dưới 1 năm"},{"value":"1_3_nam","label":"1–3 năm"},{"value":"tren_3_nam","label":"Trên 3 năm"}],"required":true,"filterable":true},{"key":"ten_cong_ty","label":"Tên công ty / cửa hàng","type":"text","required":false,"filterable":false,"placeholder":"VD: Cửa hàng Minh Anh"}]'),
  ('xe-co', '#2563eb', 'Giá bán', true,
   '[{"key":"hang","label":"Hãng","type":"text","required":false,"filterable":false},{"key":"dong_xe","label":"Dòng xe","type":"text","required":false,"filterable":false,"placeholder":"VD: Vision, Vios..."},{"key":"nam_san_xuat","label":"Năm sản xuất","type":"year","required":false,"filterable":true,"min":1950},{"key":"so_km","label":"Số km đã đi","type":"number","unit":"km","required":false,"filterable":true,"min":0,"max":10000000},{"key":"tinh_trang","label":"Tình trạng","type":"select","options":[{"value":"moi","label":"Mới"},{"value":"da_su_dung","label":"Đã sử dụng"}],"required":true,"filterable":true}]'),
  ('do-dien-tu', '#0891b2', 'Giá bán', true,
   '[{"key":"hang","label":"Hãng","type":"text","required":false,"filterable":false,"placeholder":"VD: Anker, Baseus..."},{"key":"tinh_trang","label":"Tình trạng","type":"select","options":[{"value":"moi","label":"Mới"},{"value":"nhu_moi","label":"Như mới"},{"value":"da_su_dung","label":"Đã sử dụng"},{"value":"hu_hong","label":"Hư hỏng"}],"required":true,"filterable":true},{"key":"bao_hanh","label":"Bảo hành còn lại","type":"number","unit":"tháng","required":false,"filterable":false,"min":0,"max":120}]'),
  ('san-pham-khac', '#d97706', 'Giá bán', true,
   '[{"key":"tinh_trang","label":"Tình trạng","type":"select","options":[{"value":"moi","label":"Mới"},{"value":"nhu_moi","label":"Như mới"},{"value":"da_su_dung","label":"Đã sử dụng"}],"required":true,"filterable":true}]')
) as v (slug, color, price_label, requires_images, fields)
where c.slug = v.slug and c.parent_id is null;

update public.categories c
set fields = v.fields::jsonb
from (values
  ('dat',
   '[{"key":"so_phong_ngu","hidden":true},{"key":"so_wc","hidden":true}]'),
  ('phong-tro',
   '[{"key":"hinh_thuc","hidden":true},{"key":"so_phong_ngu","hidden":true},{"key":"giay_to","hidden":true}]'),
  ('mat-bang',
   '[{"key":"so_phong_ngu","hidden":true},{"key":"so_wc","hidden":true}]'),
  ('xe-may',
   '[{"key":"hang","label":"Hãng","type":"select","options":[{"value":"honda","label":"Honda"},{"value":"yamaha","label":"Yamaha"},{"value":"suzuki","label":"Suzuki"},{"value":"piaggio","label":"Piaggio"},{"value":"sym","label":"SYM"},{"value":"vinfast","label":"VinFast"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true}]'),
  ('o-to',
   '[{"key":"hang","label":"Hãng","type":"select","options":[{"value":"toyota","label":"Toyota"},{"value":"hyundai","label":"Hyundai"},{"value":"kia","label":"Kia"},{"value":"mazda","label":"Mazda"},{"value":"ford","label":"Ford"},{"value":"honda","label":"Honda"},{"value":"mitsubishi","label":"Mitsubishi"},{"value":"vinfast","label":"VinFast"},{"value":"mercedes-benz","label":"Mercedes-Benz"},{"value":"bmw","label":"BMW"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true}]'),
  ('xe-dap',
   '[{"key":"hang","label":"Hãng","type":"select","options":[{"value":"giant","label":"Giant"},{"value":"trinx","label":"Trinx"},{"value":"asama","label":"Asama"},{"value":"thong-nhat","label":"Thống Nhất"},{"value":"galaxy","label":"Galaxy"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true},{"key":"so_km","hidden":true}]'),
  ('phu-tung',
   '[{"key":"hang","label":"Dùng cho hãng xe","type":"text","required":false,"filterable":false,"placeholder":"VD: Honda"},{"key":"dong_xe","hidden":true},{"key":"nam_san_xuat","hidden":true},{"key":"so_km","hidden":true}]'),
  ('dien-thoai',
   '[{"key":"hang","label":"Hãng","type":"select","options":[{"value":"apple","label":"Apple"},{"value":"samsung","label":"Samsung"},{"value":"xiaomi","label":"Xiaomi"},{"value":"oppo","label":"OPPO"},{"value":"vivo","label":"vivo"},{"value":"realme","label":"realme"},{"value":"nokia","label":"Nokia"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true}]'),
  ('laptop',
   '[{"key":"hang","label":"Hãng","type":"select","options":[{"value":"apple","label":"Apple"},{"value":"dell","label":"Dell"},{"value":"hp","label":"HP"},{"value":"lenovo","label":"Lenovo"},{"value":"asus","label":"Asus"},{"value":"acer","label":"Acer"},{"value":"msi","label":"MSI"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true}]'),
  ('tivi',
   '[{"key":"hang","label":"Hãng","type":"select","options":[{"value":"samsung","label":"Samsung"},{"value":"lg","label":"LG"},{"value":"sony","label":"Sony"},{"value":"tcl","label":"TCL"},{"value":"xiaomi","label":"Xiaomi"},{"value":"casper","label":"Casper"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true}]'),
  ('may-anh',
   '[{"key":"hang","label":"Hãng","type":"select","options":[{"value":"canon","label":"Canon"},{"value":"nikon","label":"Nikon"},{"value":"sony","label":"Sony"},{"value":"fujifilm","label":"Fujifilm"},{"value":"panasonic","label":"Panasonic"},{"value":"khac","label":"Khác"}],"required":true,"filterable":true}]')
) as v (slug, fields)
where c.slug = v.slug and c.parent_id is not null;

update public.categories
set price_label = 'Giá thuê/tháng'
where slug = 'phong-tro';

-- Danh mục chính phải có đủ màu, nhãn giá, cờ bắt buộc ảnh.
alter table public.categories
  add constraint categories_main_settings_check
    check (parent_id is not null or (color is not null and price_label is not null and requires_images is not null));

-- Cây danh mục chỉ có 2 cấp: parent_id phải trỏ tới danh mục chính,
-- và danh mục chính đang có danh mục con thì không chuyển thành danh mục con được.
create or replace function public.categories_check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_id is not null then
    if new.parent_id = new.id or not exists (
      select 1 from public.categories p where p.id = new.parent_id and p.parent_id is null
    ) then
      raise exception 'Danh mục cha phải là danh mục chính' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from public.categories c where c.parent_id = new.id) then
      raise exception 'Danh mục đang có danh mục con, không chuyển thành danh mục con được'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.categories_check_parent from public, anon, authenticated;

create trigger categories_check_parent
  before insert or update of parent_id on public.categories
  for each row execute function public.categories_check_parent();

-- RLS categories: ai cũng đọc danh mục đang bật; Admin đọc tất cả và thêm/sửa/xóa.
-- (Xóa danh mục đang có tin đã bị khóa ngoại listings.category_id ON DELETE RESTRICT chặn.)
drop policy "categories: ai cũng xem được" on public.categories;

create policy "categories: xem danh mục đang bật (admin xem tất cả)"
  on public.categories for select
  to anon, authenticated
  using (is_active or public.is_admin());

create policy "categories: admin thêm"
  on public.categories for insert
  to authenticated
  with check (public.is_admin());

create policy "categories: admin sửa"
  on public.categories for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories: admin xóa"
  on public.categories for delete
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- 3. listings: trạng thái 'removed' (Admin gỡ), lý do gỡ, lượt xem
-- =============================================================================
alter table public.listings drop constraint listings_status_check;
alter table public.listings
  add constraint listings_status_check check (status in ('active', 'sold', 'hidden', 'removed')),
  add column removed_reason text,
  add column view_count     integer not null default 0 check (view_count >= 0);

grant select (removed_reason, view_count) on public.listings to anon, authenticated;
grant update (removed_reason)             on public.listings to authenticated;

-- Tin mới (hoặc đổi danh mục) chỉ được vào danh mục con ĐANG BẬT của danh mục chính đang bật.
-- Tin cũ trong danh mục đã ẩn vẫn sửa được nếu không đổi danh mục.
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

  if (tg_op = 'INSERT' or new.category_id is distinct from old.category_id) and not exists (
    select 1
    from public.categories c
    join public.categories p on p.id = c.parent_id
    where c.id = new.category_id and c.is_active and p.is_active
  ) then
    raise exception 'Danh mục này đã ngừng nhận tin mới' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Trigger bảo vệ trạng thái tin (security invoker để current_user là người gọi thật;
-- SQL Editor / service_role / hàm security definer như mark_listing_sold được bỏ qua).
--  Admin: đổi được mọi trạng thái; gỡ tin ('removed') phải có lý do;
--         với tin của người khác thì CHỈ được đổi status và removed_reason.
--  Chủ tin:
--    - không tự đặt 'removed', không đổi trạng thái tin đã bị gỡ, không sửa lý do gỡ;
--    - 'sold' phải đi qua mark_listing_sold (để luôn có 1 dòng transactions);
--    - tin đã có giao dịch (đã bán) không hiển thị lại được;
--    - tài khoản bị khóa không bật tin lên 'active'.
--  Tin mới chỉ được ở trạng thái 'active' hoặc 'hidden'.
create or replace function public.listings_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_admin boolean;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('active', 'hidden') then
      raise exception 'Tin mới chỉ được ở trạng thái đang hiển thị hoặc đã ẩn' using errcode = '42501';
    end if;
    new.removed_reason := null;
    return new;
  end if;

  v_admin := public.is_admin();

  if v_admin then
    if new.seller_id is distinct from v_uid
       and (new.seller_id, new.category_id, new.title, new.description, new.price, new.price_unit,
            new.attributes, new.location, new.address_text, new.province, new.district)
           is distinct from
           (old.seller_id, old.category_id, old.title, old.description, old.price, old.price_unit,
            old.attributes, old.location, old.address_text, old.province, old.district) then
      raise exception 'Admin chỉ được đổi trạng thái tin của người khác' using errcode = '42501';
    end if;
    if new.status = 'removed' and nullif(btrim(new.removed_reason), '') is null then
      raise exception 'Vui lòng nhập lý do gỡ tin' using errcode = '23514';
    end if;
    if new.status <> 'removed' then
      new.removed_reason := null;
    end if;
    return new;
  end if;

  -- Chủ tin (RLS đã đảm bảo chỉ chủ tin tới được đây)
  if new.removed_reason is distinct from old.removed_reason then
    raise exception 'Không được sửa lý do gỡ tin' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if old.status = 'removed' or new.status = 'removed' then
      raise exception 'Tin đã bị quản trị viên gỡ, bạn không đổi được trạng thái' using errcode = '42501';
    end if;
    if new.status = 'sold' and not exists (
      select 1 from public.transactions t where t.listing_id = new.id
    ) then
      raise exception 'Hãy dùng chức năng "Đánh dấu đã bán"' using errcode = '42501';
    end if;
    if new.status = 'active' then
      if public.is_user_banned(v_uid) then
        raise exception 'Tài khoản đã bị khóa' using errcode = '42501';
      end if;
      if exists (select 1 from public.transactions t where t.listing_id = new.id) then
        raise exception 'Tin đã bán không hiển thị lại được' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.listings_guard_status from public, anon, authenticated;

-- RLS listings
drop policy "listings: xem tin đang hiển thị, đã bán hoặc tin của mình" on public.listings;

create policy "listings: xem tin công khai, tin của mình (admin xem tất cả)"
  on public.listings for select
  to anon, authenticated
  using (
    (status in ('active', 'sold') and not public.is_user_banned(seller_id))
    or seller_id = (select auth.uid())
    or public.is_admin()
  );

drop policy "listings: đăng tin dưới tên mình" on public.listings;

create policy "listings: đăng tin dưới tên mình (trừ tài khoản bị khóa)"
  on public.listings for insert
  to authenticated
  with check (
    seller_id = (select auth.uid())
    and not public.is_user_banned((select auth.uid()))
  );

create policy "listings: admin đổi trạng thái mọi tin"
  on public.listings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- =============================================================================
-- 4. Người bị khóa không chat được
-- =============================================================================
drop policy "conversations: người mua mở cuộc trò chuyện với đúng người bán của tin" on public.conversations;

create policy "conversations: người mua mở cuộc trò chuyện với đúng người bán của tin"
  on public.conversations for insert
  to authenticated
  with check (
    buyer_id = (select auth.uid())
    and not public.is_user_banned((select auth.uid()))
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = conversations.seller_id
        and l.status = 'active'
    )
  );

drop policy "messages: người trong cuộc trò chuyện gửi tin dưới tên mình" on public.messages;

create policy "messages: người trong cuộc trò chuyện gửi tin dưới tên mình"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and not public.is_user_banned((select auth.uid()))
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (select auth.uid()) in (c.buyer_id, c.seller_id)
    )
  );


-- =============================================================================
-- 5. transactions: giao dịch thành công
--    Chỉ tạo qua hàm mark_listing_sold (không cấp quyền INSERT trực tiếp) để luôn
--    đi cùng việc đổi listings.status = 'sold', và người mua phải là người đã chat về tin.
--    listing_id ON DELETE SET NULL: chủ tin xóa tin đã bán thì giao dịch vẫn được tính.
-- =============================================================================
create table public.transactions (
  id            uuid primary key default gen_random_uuid(),
  listing_id    uuid unique references public.listings (id) on delete set null,
  seller_id     uuid not null references public.profiles (id) on delete cascade,
  buyer_id      uuid references public.profiles (id) on delete set null,
  category_id   integer not null references public.categories (id) on delete restrict,
  final_price   bigint check (final_price >= 0),
  completed_at  timestamptz not null default now(),
  check (buyer_id is null or buyer_id <> seller_id)
);

create index transactions_seller_id_idx    on public.transactions (seller_id);
create index transactions_buyer_id_idx     on public.transactions (buyer_id);
create index transactions_completed_at_idx on public.transactions (completed_at desc);
create index transactions_category_id_idx  on public.transactions (category_id);

alter table public.transactions enable row level security;

revoke all on public.transactions from anon, authenticated;
grant select on public.transactions to authenticated;

create policy "transactions: người bán/mua xem giao dịch của mình (admin xem tất cả)"
  on public.transactions for select
  to authenticated
  using ((select auth.uid()) in (seller_id, buyer_id) or public.is_admin());

-- Tạo bù giao dịch cho các tin đã bán trước đây (không biết người mua).
insert into public.transactions (listing_id, seller_id, buyer_id, category_id, final_price, completed_at)
select l.id, l.seller_id, null, l.category_id, l.price, l.updated_at
from public.listings l
where l.status = 'sold'
on conflict (listing_id) do nothing;

-- Tạo trigger sau khi đã có bảng transactions (hàm guard đọc bảng này).
create trigger listings_guard_status
  before insert or update on public.listings
  for each row execute function public.listings_guard_status();


-- mark_listing_sold ----------------------------------------------------------
-- Chủ tin đánh dấu đã bán: tạo 1 dòng transactions + đổi status = 'sold' trong CÙNG một hàm.
--   p_buyer_id    : null = "Người mua ngoài nền tảng"; nếu có phải là người đã chat về tin này.
--   p_final_price : null = lấy giá đăng.
-- Trả về id giao dịch. Mỗi tin chỉ có 1 giao dịch (unique listing_id).
create or replace function public.mark_listing_sold(
  p_listing_id  uuid,
  p_buyer_id    uuid   default null,
  p_final_price bigint default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_listing record;
  v_id      uuid;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập' using errcode = '42501';
  end if;
  if public.is_user_banned(v_uid) then
    raise exception 'Tài khoản đã bị khóa' using errcode = '42501';
  end if;

  select l.id, l.seller_id, l.category_id, l.price, l.status
    into v_listing
  from public.listings l
  where l.id = p_listing_id and l.seller_id = v_uid
  for update;

  if not found then
    raise exception 'Không tìm thấy tin hoặc bạn không phải chủ tin' using errcode = '42501';
  end if;
  if v_listing.status = 'sold'
     or exists (select 1 from public.transactions t where t.listing_id = p_listing_id) then
    raise exception 'Tin này đã được đánh dấu đã bán' using errcode = '23505';
  end if;
  if v_listing.status = 'removed' then
    raise exception 'Tin đã bị quản trị viên gỡ' using errcode = '42501';
  end if;

  if p_buyer_id is not null and not exists (
    select 1 from public.conversations c
    where c.listing_id = p_listing_id and c.buyer_id = p_buyer_id
  ) then
    raise exception 'Người mua phải là người đã chat về tin này' using errcode = '23514';
  end if;

  if p_final_price is not null and p_final_price < 0 then
    raise exception 'Giá chốt không hợp lệ' using errcode = '23514';
  end if;

  insert into public.transactions (listing_id, seller_id, buyer_id, category_id, final_price)
  values (p_listing_id, v_uid, p_buyer_id, v_listing.category_id, coalesce(p_final_price, v_listing.price))
  returning id into v_id;

  update public.listings set status = 'sold' where id = p_listing_id;

  return v_id;
end;
$$;

revoke execute on function public.mark_listing_sold from public, anon, authenticated;
grant execute on function public.mark_listing_sold to authenticated;


-- =============================================================================
-- 6. posts: tin tức do Admin đăng
-- =============================================================================
create table public.posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  excerpt       text check (char_length(excerpt) <= 500),
  cover_path    text,                                   -- đường dẫn trong bucket post-images
  content       jsonb not null default '{}'::jsonb,     -- JSON của Tiptap
  status        text not null default 'draft' check (status in ('draft', 'published')),
  is_featured   boolean not null default false,
  published_at  timestamptz,
  author_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index posts_published_idx on public.posts (published_at desc) where status = 'published';
create index posts_featured_idx  on public.posts (published_at desc) where status = 'published' and is_featured;

alter table public.posts enable row level security;

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

-- Đăng bài lần đầu thì tự đặt published_at.
create or replace function public.posts_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function public.posts_set_published_at from public, anon, authenticated;

create trigger posts_set_published_at
  before insert or update on public.posts
  for each row execute function public.posts_set_published_at();

revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

create policy "posts: ai cũng đọc bài đã đăng (admin đọc cả nháp)"
  on public.posts for select
  to anon, authenticated
  using (status = 'published' or public.is_admin());

create policy "posts: admin thêm"
  on public.posts for insert
  to authenticated
  with check (public.is_admin());

create policy "posts: admin sửa"
  on public.posts for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "posts: admin xóa"
  on public.posts for delete
  to authenticated
  using (public.is_admin());


-- =============================================================================
-- 7. admin_logs: nhật ký thao tác của Admin
-- =============================================================================
create table public.admin_logs (
  id           bigint generated always as identity primary key,
  admin_id     uuid default auth.uid() references public.profiles (id) on delete set null,
  action       text not null,         -- VD 'user.ban', 'listing.remove', 'category.update'
  target_type  text,                  -- VD 'user', 'listing', 'category', 'post'
  target_id    text,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index admin_logs_created_at_idx on public.admin_logs (created_at desc);
create index admin_logs_target_idx     on public.admin_logs (target_type, target_id);

alter table public.admin_logs enable row level security;

revoke all on public.admin_logs from anon, authenticated;
grant select on public.admin_logs to authenticated;
grant insert (action, target_type, target_id, detail) on public.admin_logs to authenticated;

create policy "admin_logs: admin đọc"
  on public.admin_logs for select
  to authenticated
  using (public.is_admin());

create policy "admin_logs: admin ghi dưới tên mình"
  on public.admin_logs for insert
  to authenticated
  with check (public.is_admin() and admin_id = (select auth.uid()));


-- =============================================================================
-- 8. STORAGE: bucket post-images (ảnh tin tức), công khai để đọc, chỉ Admin upload/sửa/xóa
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5242880,  -- 5 MB
  array['image/webp', 'image/jpeg', 'image/png', 'image/gif']
)
on conflict (id) do nothing;

create policy "post-images: admin xem danh sách file"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'post-images' and public.is_admin());

create policy "post-images: admin upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-images' and public.is_admin());

create policy "post-images: admin sửa file"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-images' and public.is_admin())
  with check (bucket_id = 'post-images' and public.is_admin());

create policy "post-images: admin xóa file"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-images' and public.is_admin());


-- =============================================================================
-- 9. Cập nhật hàm cũ: ẩn tin và số điện thoại của người bị khóa
-- =============================================================================

-- search_listings: giữ nguyên tham số và kết quả như 0001, thêm điều kiện người bán không bị khóa.
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


-- get_seller_phone: như 0001, thêm điều kiện người bán không bị khóa.
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
    and ((l.status = 'active' and not pr.is_banned) or l.seller_id = v_viewer);

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


-- get_seller_phone_hint: như 0003, thêm điều kiện người bán không bị khóa.
create or replace function public.get_seller_phone_hint(p_listing_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(pr.phone, 4) || ' xxx xxx'
  from public.listings l
  join public.profiles pr on pr.id = l.seller_id
  where l.id = p_listing_id
    and l.status = 'active'
    and not pr.is_banned
    and pr.phone is not null;
$$;

revoke execute on function public.get_seller_phone_hint from public, anon, authenticated;
grant execute on function public.get_seller_phone_hint to anon, authenticated;


-- =============================================================================
-- 10. Thống kê
-- =============================================================================

-- get_public_stats: ai cũng gọi được, CHỈ trả số tổng, không có dữ liệu cá nhân.
-- {
--   "total_users": 123, "total_transactions": 45, "active_listings": 678,
--   "active_by_category": [{ "category_id": 1, "slug": "bat-dong-san", "name": "Bất động sản", "count": 90 }, ...]
-- }
create or replace function public.get_public_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with active as (
    select c.parent_id as main_id
    from public.listings l
    join public.categories c on c.id = l.category_id
    join public.profiles s on s.id = l.seller_id
    where l.status = 'active' and not s.is_banned
  )
  select jsonb_build_object(
    'total_users',        (select count(*) from public.profiles),
    'total_transactions', (select count(*) from public.transactions),
    'active_listings',    (select count(*) from active),
    'active_by_category', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'category_id', m.id,
          'slug',        m.slug,
          'name',        m.name,
          'count',       (select count(*) from active a where a.main_id = m.id)
        )
        order by m.sort_order, m.id
      )
      from public.categories m
      where m.parent_id is null and m.is_active
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.get_public_stats from public, anon, authenticated;
grant execute on function public.get_public_stats to anon, authenticated;


-- get_admin_stats: CHỈ Admin (kiểm tra is_admin() ngay đầu hàm). Ngày tính theo giờ Việt Nam.
-- p_from_date, p_to_date: khoảng ngày (gồm cả 2 đầu), tối đa 366 ngày.
-- {
--   "from": "2026-09-01", "to": "2026-09-30",
--   "totals": { total_users, active_listings, total_listings, sold_listings, total_transactions },
--   "daily": [{ date, new_users, new_listings, transactions, messages }, ...],          -- đủ mọi ngày
--   "by_category": [{ category_id, slug, name, color, active_listings, new_listings, transactions }, ...],
--   "by_province": [{ province, active_listings, new_listings }, ...]                   -- nhiều tin nhất trước
-- }
-- Chỉ ĐẾM số tin nhắn, không đọc nội dung.
create or replace function public.get_admin_stats(p_from_date date, p_to_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_tz     constant text := 'Asia/Ho_Chi_Minh';
  v_start  timestamptz;
  v_end    timestamptz;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới xem được thống kê' using errcode = '42501';
  end if;
  if p_from_date is null or p_to_date is null or p_from_date > p_to_date then
    raise exception 'Khoảng thời gian không hợp lệ' using errcode = '22023';
  end if;
  if p_to_date - p_from_date > 366 then
    raise exception 'Khoảng thời gian tối đa 366 ngày' using errcode = '22023';
  end if;

  v_start := p_from_date::timestamp at time zone v_tz;
  v_end   := (p_to_date + 1)::timestamp at time zone v_tz;

  with
  new_users as (
    select (p.created_at at time zone v_tz)::date as day, count(*) as n
    from public.profiles p
    where p.created_at >= v_start and p.created_at < v_end
    group by 1
  ),
  new_listings as (
    select (l.created_at at time zone v_tz)::date as day, count(*) as n
    from public.listings l
    where l.created_at >= v_start and l.created_at < v_end
    group by 1
  ),
  tx as (
    select (t.completed_at at time zone v_tz)::date as day, count(*) as n
    from public.transactions t
    where t.completed_at >= v_start and t.completed_at < v_end
    group by 1
  ),
  msgs as (
    select (m.created_at at time zone v_tz)::date as day, count(*) as n
    from public.messages m
    where m.created_at >= v_start and m.created_at < v_end
    group by 1
  ),
  days as (
    select g::date as day
    from generate_series(p_from_date::timestamp, p_to_date::timestamp, interval '1 day') g
  ),
  listing_main as (
    select l.id, l.status, l.province, l.created_at, l.seller_id, c.parent_id as main_id
    from public.listings l
    join public.categories c on c.id = l.category_id
  ),
  active as (
    select lm.id, lm.main_id
    from listing_main lm
    join public.profiles s on s.id = lm.seller_id
    where lm.status = 'active' and not s.is_banned
  )
  select jsonb_build_object(
    'from', p_from_date,
    'to',   p_to_date,
    'totals', jsonb_build_object(
      'total_users',        (select count(*) from public.profiles),
      'active_listings',    (select count(*) from active),
      'total_listings',     (select count(*) from public.listings where status <> 'removed'),
      'sold_listings',      (select count(*) from public.listings where status = 'sold'),
      'total_transactions', (select count(*) from public.transactions)
    ),
    'daily', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'date',         d.day,
          'new_users',    coalesce(u.n, 0),
          'new_listings', coalesce(nl.n, 0),
          'transactions', coalesce(t.n, 0),
          'messages',     coalesce(m.n, 0)
        )
        order by d.day
      ), '[]'::jsonb)
      from days d
      left join new_users u     on u.day = d.day
      left join new_listings nl on nl.day = d.day
      left join tx t            on t.day = d.day
      left join msgs m          on m.day = d.day
    ),
    'by_category', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'category_id',     c.id,
          'slug',            c.slug,
          'name',            c.name,
          'color',           c.color,
          'active_listings', (select count(*) from active a where a.main_id = c.id),
          'new_listings',    (select count(*) from listing_main lm
                               where lm.main_id = c.id and lm.created_at >= v_start and lm.created_at < v_end),
          'transactions',    (select count(*) from public.transactions t
                               join public.categories tc on tc.id = t.category_id
                               where coalesce(tc.parent_id, tc.id) = c.id
                                 and t.completed_at >= v_start and t.completed_at < v_end)
        )
        order by c.sort_order, c.id
      ), '[]'::jsonb)
      from public.categories c
      where c.parent_id is null
    ),
    'by_province', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'province',        x.province,
          'active_listings', x.active_listings,
          'new_listings',    x.new_listings
        )
        order by x.active_listings desc, x.new_listings desc, x.province
      ), '[]'::jsonb)
      from (
        select
          coalesce(lm.province, 'Không rõ') as province,
          count(a.id) as active_listings,
          count(*) filter (where lm.created_at >= v_start and lm.created_at < v_end) as new_listings
        from listing_main lm
        left join active a on a.id = lm.id
        group by 1
      ) x
      where x.active_listings > 0 or x.new_listings > 0
    )
  )
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_admin_stats from public, anon, authenticated;
grant execute on function public.get_admin_stats to authenticated;
