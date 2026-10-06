-- =============================================================================
-- 0002_listing_client_id.sql
-- Cho phép trình duyệt tự sinh id (uuid) của tin trước khi đăng.
-- Lý do: ảnh được upload ngay ở bước "Ảnh" vào {user_id}/{listing_id}/..., lúc đó tin
-- chưa được ghi vào DB nên phải biết trước listing_id.
-- An toàn: id là uuid ngẫu nhiên; trùng id chỉ làm insert lỗi (khóa chính), còn policy
-- "listings: đăng tin dưới tên mình" vẫn buộc seller_id = auth.uid().
-- =============================================================================

grant insert (id) on public.listings to authenticated;
