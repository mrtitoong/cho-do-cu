-- =============================================================================
-- 0003_listing_detail.sql
-- Phục vụ trang chi tiết tin /tin/[id] (giai đoạn 5).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Tin đã bán vẫn xem được (trang chi tiết hiện nhãn "Đã bán").
--    Tin 'hidden' vẫn chỉ chủ tin xem được. search_listings vẫn chỉ trả tin 'active'.
--    Ảnh của tin (listing_images) đi theo policy này nên cũng xem được.
-- -----------------------------------------------------------------------------
drop policy "listings: xem tin đang hiển thị hoặc tin của mình" on public.listings;

create policy "listings: xem tin đang hiển thị, đã bán hoặc tin của mình"
  on public.listings for select
  to anon, authenticated
  using (status in ('active', 'sold') or seller_id = (select auth.uid()));


-- -----------------------------------------------------------------------------
-- 2. get_seller_phone_hint: số điện thoại dạng che "0912 xxx xxx" để hiện TRƯỚC khi bấm "Liên hệ".
--    Chỉ lộ 4 số đầu (đầu số nhà mạng), không đủ để gọi. Trả null nếu người bán chưa khai số
--    (UI hiện "Người bán chỉ nhận chat"). Không ghi log, không tính vào giới hạn 30 số/24 giờ.
-- -----------------------------------------------------------------------------
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
    and pr.phone is not null;
$$;

revoke execute on function public.get_seller_phone_hint from public, anon, authenticated;
grant execute on function public.get_seller_phone_hint to anon, authenticated;
