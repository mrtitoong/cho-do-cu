-- 0010: get_admin_stats bổ sung số liệu "đầu kỳ / cuối kỳ" cho trang Tổng quan Admin (giai đoạn 7d).
--
-- Thêm khóa "period" vào kết quả (các khóa cũ giữ nguyên):
--   "period": {
--     users_at_start, users_at_end,     -- số tài khoản tạo trước đầu kỳ / trước hết ngày cuối kỳ
--     active_at_start, active_at_end,   -- số tin đang bán ƯỚC TÍNH tại đầu kỳ / cuối kỳ
--     new_listings_sold                 -- số tin đăng TRONG kỳ hiện đã bán
--   }
--
-- "Tin đang bán tại thời điểm t" là ước tính, vì DB không lưu lịch sử đổi trạng thái:
--   tin tạo trước t, người bán không bị khóa, và (đang 'active' HOẶC đã bán với giao dịch hoàn tất sau t).
--   Tin đã ẩn/gỡ không tính (không biết thời điểm ẩn/gỡ). Với kỳ kết thúc hôm nay,
--   active_at_end đúng bằng số tin đang bán hiện tại.

-- get_admin_stats: CHỈ Admin (kiểm tra is_admin() ngay đầu hàm). Ngày tính theo giờ Việt Nam.
-- p_from_date, p_to_date: khoảng ngày (gồm cả 2 đầu), tối đa 366 ngày.
-- {
--   "from": "2026-09-01", "to": "2026-09-30",
--   "totals": { total_users, active_listings, total_listings, sold_listings, total_transactions },
--   "daily": [{ date, new_users, new_listings, transactions, messages }, ...],          -- đủ mọi ngày
--   "by_category": [{ category_id, slug, name, color, active_listings, new_listings, transactions }, ...],
--   "by_province": [{ province, active_listings, new_listings }, ...],                  -- nhiều tin nhất trước
--   "period": { users_at_start, users_at_end, active_at_start, active_at_end, new_listings_sold }  -- (0010)
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
  ),
  -- Tin còn bán hoặc đã bán của người không bị khóa, kèm thời điểm bán (để ước tính số tin đang bán tại 1 thời điểm).
  sellable as (
    select l.created_at, l.status, t.completed_at as sold_at
    from public.listings l
    join public.profiles s on s.id = l.seller_id
    left join public.transactions t on t.listing_id = l.id
    where l.status in ('active', 'sold') and not s.is_banned
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
    'period', jsonb_build_object(
      'users_at_start',    (select count(*) from public.profiles where created_at < v_start),
      'users_at_end',      (select count(*) from public.profiles where created_at < v_end),
      'active_at_start',   (select count(*) from sellable
                            where created_at < v_start and (status = 'active' or sold_at >= v_start)),
      'active_at_end',     (select count(*) from sellable
                            where created_at < v_end and (status = 'active' or sold_at >= v_end)),
      'new_listings_sold', (select count(*) from public.listings
                            where status = 'sold' and created_at >= v_start and created_at < v_end)
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
