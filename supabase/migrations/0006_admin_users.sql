-- =============================================================================
-- 0006_admin_users.sql
-- Khu vực Admin (giai đoạn 7a): quản lý người dùng, quản lý tin đăng, nhật ký.
--
-- Mọi hàm admin_*:
--   - security definer (đọc được email trong auth.users, số điện thoại, cột bị ẩn),
--   - kiểm tra public.is_admin() NGAY ĐẦU HÀM,
--   - thao tác thay đổi ghi 1 dòng admin_logs trong CÙNG giao dịch (lỗi thì cả hai cùng hủy).
-- Hàm security definer chạy với quyền postgres nên trigger profiles_guard / listings_guard_status
-- được bỏ qua; vì vậy các hàm tự kiểm tra lại quy tắc (không tự khóa mình, gỡ tin phải có lý do...).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Hàm nội bộ: báo lỗi nếu không phải admin
-- -----------------------------------------------------------------------------
create or replace function public.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Chỉ quản trị viên mới được thực hiện thao tác này' using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.assert_admin from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- admin_list_users: bảng người dùng, phân trang phía server.
--   p_search  : tìm theo tên / email / số điện thoại (không phân biệt hoa thường)
--   p_role    : 'user' | 'admin' | null (tất cả)
--   p_status  : 'active' | 'banned' | null (tất cả)
--   p_user_id : lấy đúng 1 người (trang chi tiết)
-- total_count = tổng số dòng khớp bộ lọc (trước khi phân trang).
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_users(
  p_search  text    default null,
  p_role    text    default null,
  p_status  text    default null,
  p_user_id uuid    default null,
  p_limit   integer default 20,
  p_offset  integer default 0
)
returns table (
  id               uuid,
  email            text,
  full_name        text,
  avatar_url       text,
  phone            text,
  role             text,
  is_banned        boolean,
  banned_reason    text,
  active_listings  integer,
  transactions     integer,
  created_at       timestamptz,
  last_seen_at     timestamptz,
  total_count      integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_search text := nullif(btrim(p_search), '');
begin
  perform public.assert_admin();

  return query
  select
    p.id,
    u.email::text,
    p.full_name,
    p.avatar_url,
    p.phone,
    p.role,
    p.is_banned,
    p.banned_reason,
    (select count(*)::integer from public.listings l where l.seller_id = p.id and l.status = 'active'),
    (select count(*)::integer from public.transactions t where p.id in (t.seller_id, t.buyer_id)),
    p.created_at,
    p.last_seen_at,
    (count(*) over ())::integer
  from public.profiles p
  left join auth.users u on u.id = p.id
  where (p_user_id is null or p.id = p_user_id)
    and (p_role is null or p.role = p_role)
    and (
      p_status is null
      or (p_status = 'banned' and p.is_banned)
      or (p_status = 'active' and not p.is_banned)
    )
    and (
      v_search is null
      or p.full_name ilike '%' || v_search || '%'
      or u.email ilike '%' || v_search || '%'
      or p.phone like '%' || regexp_replace(v_search, '\D', '', 'g') || '%'
         and regexp_replace(v_search, '\D', '', 'g') <> ''
    )
  order by p.created_at desc, p.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_list_users from public, anon, authenticated;
grant execute on function public.admin_list_users to authenticated;


-- -----------------------------------------------------------------------------
-- admin_set_user_ban: khóa (bắt buộc lý do, tự ẩn mọi tin đang bán) / mở khóa tài khoản.
-- Mở khóa KHÔNG tự hiện lại tin, người dùng tự bật lại trong "Tin của tôi".
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_user_ban(
  p_user_id uuid,
  p_banned  boolean,
  p_reason  text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason  text := nullif(btrim(p_reason), '');
  v_current boolean;
  v_hidden  integer := 0;
begin
  perform public.assert_admin();

  if p_user_id = auth.uid() then
    raise exception 'Bạn không thể tự khóa hoặc mở khóa tài khoản của mình' using errcode = '42501';
  end if;

  select p.is_banned into v_current from public.profiles p where p.id = p_user_id for update;
  if not found then
    raise exception 'Không tìm thấy người dùng' using errcode = 'P0002';
  end if;

  if p_banned then
    if v_current then
      raise exception 'Tài khoản này đang bị khóa' using errcode = '23514';
    end if;
    if v_reason is null then
      raise exception 'Vui lòng nhập lý do khóa tài khoản' using errcode = '23514';
    end if;
    if char_length(v_reason) > 500 then
      raise exception 'Lý do tối đa 500 ký tự' using errcode = '23514';
    end if;

    update public.profiles set is_banned = true, banned_reason = v_reason where id = p_user_id;

    update public.listings set status = 'hidden'
    where seller_id = p_user_id and status = 'active';
    get diagnostics v_hidden = row_count;

    insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'user.ban', 'user', p_user_id::text,
            jsonb_build_object('reason', v_reason, 'hidden_listings', v_hidden));
  else
    if not v_current then
      raise exception 'Tài khoản này không bị khóa' using errcode = '23514';
    end if;

    update public.profiles set is_banned = false, banned_reason = null where id = p_user_id;

    insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'user.unban', 'user', p_user_id::text, jsonb_build_object('reason', v_reason));
  end if;
end;
$$;

revoke execute on function public.admin_set_user_ban from public, anon, authenticated;
grant execute on function public.admin_set_user_ban to authenticated;


-- -----------------------------------------------------------------------------
-- admin_set_user_role: cấp / thu quyền admin. Không tự thu quyền của chính mình.
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_current text;
begin
  perform public.assert_admin();

  if p_role not in ('user', 'admin') then
    raise exception 'Vai trò không hợp lệ' using errcode = '22023';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Bạn không thể tự đổi vai trò của mình' using errcode = '42501';
  end if;

  select p.role into v_current from public.profiles p where p.id = p_user_id for update;
  if not found then
    raise exception 'Không tìm thấy người dùng' using errcode = 'P0002';
  end if;
  if v_current = p_role then
    raise exception 'Người dùng đã có vai trò này' using errcode = '23514';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), case when p_role = 'admin' then 'user.grant_admin' else 'user.revoke_admin' end,
          'user', p_user_id::text, jsonb_build_object('from', v_current, 'to', p_role));
end;
$$;

revoke execute on function public.admin_set_user_role from public, anon, authenticated;
grant execute on function public.admin_set_user_role to authenticated;


-- -----------------------------------------------------------------------------
-- admin_list_listings: bảng mọi tin, phân trang phía server.
--   p_search      : tìm theo tiêu đề
--   p_category_id : danh mục chính (lấy cả danh mục con) hoặc danh mục con
--   p_status      : 'active' | 'sold' | 'hidden' | 'removed' | null
--   p_seller      : tìm người đăng theo tên / email
--   p_seller_id   : đúng 1 người đăng (trang chi tiết người dùng)
--   p_from, p_to  : khoảng ngày đăng (giờ Việt Nam, gồm cả 2 đầu)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_listings(
  p_search      text    default null,
  p_category_id integer default null,
  p_status      text    default null,
  p_seller      text    default null,
  p_seller_id   uuid    default null,
  p_from        date    default null,
  p_to          date    default null,
  p_limit       integer default 20,
  p_offset      integer default 0
)
returns table (
  id                 uuid,
  title              text,
  status             text,
  removed_reason     text,
  price              bigint,
  price_unit         text,
  category_id        integer,
  category_name      text,
  main_category_name text,
  seller_id          uuid,
  seller_name        text,
  seller_email       text,
  seller_is_banned   boolean,
  province           text,
  district           text,
  created_at         timestamptz,
  cover_image_path   text,
  total_count        integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_tz     constant text := 'Asia/Ho_Chi_Minh';
  v_search text := nullif(btrim(p_search), '');
  v_seller text := nullif(btrim(p_seller), '');
begin
  perform public.assert_admin();

  return query
  select
    l.id,
    l.title,
    l.status,
    l.removed_reason,
    l.price,
    l.price_unit,
    l.category_id,
    c.name,
    m.name,
    l.seller_id,
    s.full_name,
    u.email::text,
    s.is_banned,
    l.province,
    l.district,
    l.created_at,
    (select i.path from public.listing_images i
      where i.listing_id = l.id order by i.sort_order, i.created_at limit 1),
    (count(*) over ())::integer
  from public.listings l
  join public.categories c on c.id = l.category_id
  left join public.categories m on m.id = c.parent_id
  join public.profiles s on s.id = l.seller_id
  left join auth.users u on u.id = l.seller_id
  where (v_search is null or l.title ilike '%' || v_search || '%')
    and (p_category_id is null or l.category_id = p_category_id or c.parent_id = p_category_id)
    and (p_status is null or l.status = p_status)
    and (p_seller_id is null or l.seller_id = p_seller_id)
    and (v_seller is null or s.full_name ilike '%' || v_seller || '%' or u.email ilike '%' || v_seller || '%')
    and (p_from is null or l.created_at >= p_from::timestamp at time zone v_tz)
    and (p_to is null or l.created_at < (p_to + 1)::timestamp at time zone v_tz)
  order by l.created_at desc, l.id
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_list_listings from public, anon, authenticated;
grant execute on function public.admin_list_listings to authenticated;


-- -----------------------------------------------------------------------------
-- admin_set_listing_status: gỡ tin (bắt buộc lý do) / khôi phục tin đã gỡ.
-- Khôi phục: tin đã có giao dịch → 'sold'; người đăng đang bị khóa → 'hidden'; còn lại → 'active'.
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_listing_status(
  p_listing_id uuid,
  p_action     text,
  p_reason     text default null
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(btrim(p_reason), '');
  v_old    text;
  v_seller uuid;
  v_new    text;
begin
  perform public.assert_admin();

  select l.status, l.seller_id into v_old, v_seller
  from public.listings l where l.id = p_listing_id for update;
  if not found then
    raise exception 'Không tìm thấy tin' using errcode = 'P0002';
  end if;

  if p_action = 'remove' then
    if v_old = 'removed' then
      raise exception 'Tin này đã bị gỡ' using errcode = '23514';
    end if;
    if v_reason is null then
      raise exception 'Vui lòng nhập lý do gỡ tin' using errcode = '23514';
    end if;
    if char_length(v_reason) > 500 then
      raise exception 'Lý do tối đa 500 ký tự' using errcode = '23514';
    end if;
    v_new := 'removed';
    update public.listings set status = v_new, removed_reason = v_reason where id = p_listing_id;

  elsif p_action = 'restore' then
    if v_old <> 'removed' then
      raise exception 'Chỉ khôi phục được tin đã bị gỡ' using errcode = '23514';
    end if;
    v_new := case
      when exists (select 1 from public.transactions t where t.listing_id = p_listing_id) then 'sold'
      when public.is_user_banned(v_seller) then 'hidden'
      else 'active'
    end;
    update public.listings set status = v_new, removed_reason = null where id = p_listing_id;

  else
    raise exception 'Thao tác không hợp lệ' using errcode = '22023';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'listing.' || p_action, 'listing', p_listing_id::text,
          jsonb_build_object('from', v_old, 'to', v_new, 'reason', v_reason));

  return v_new;
end;
$$;

revoke execute on function public.admin_set_listing_status from public, anon, authenticated;
grant execute on function public.admin_set_listing_status to authenticated;


-- -----------------------------------------------------------------------------
-- touch_last_seen: cập nhật "lần hoạt động cuối" của chính mình (tối đa 5 phút / lần).
-- Gọi từ proxy.ts khi người dùng đã đăng nhập.
-- -----------------------------------------------------------------------------
create or replace function public.touch_last_seen()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles
  set last_seen_at = now()
  where id = auth.uid()
    and (last_seen_at is null or last_seen_at < now() - interval '5 minutes');
$$;

revoke execute on function public.touch_last_seen from public, anon, authenticated;
grant execute on function public.touch_last_seen to authenticated;
