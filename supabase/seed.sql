-- =============================================================================
-- Chợ Đồ Cũ – seed.sql
-- Dữ liệu mẫu: 3 tài khoản người bán + 10 tin Đồ điện tử để test bản đồ, bộ lọc,
-- trang chi tiết, nút Liên hệ và trang Tin của tôi.
--
-- Chạy trong Supabase → SQL Editor (quyền postgres). Chạy lại nhiều lần vẫn an toàn:
-- tài khoản đã có thì bỏ qua, 10 tin mẫu bị xóa rồi tạo lại (vị trí làm mờ sẽ đổi).
--
-- Tài khoản (mật khẩu chung: Matkhau123!):
--   seed.minhanh@chodocu.test  – Nguyễn Minh Anh – có SĐT 0912345678
--   seed.thuha@chodocu.test    – Trần Thu Hà     – có SĐT 0987654321
--   seed.hoangphuc@chodocu.test – Lê Hoàng Phúc  – KHÔNG có SĐT ("Người bán chỉ nhận chat")
--
-- Các trường hợp được phủ:
--   Danh mục con : đủ 5 (Điện thoại ×3, Laptop ×3, Tivi ×2, Máy ảnh ×1, Phụ kiện ×1)
--   Tình trạng   : Mới / Như mới / Đã sử dụng / Hư hỏng
--   Hãng         : hãng trong danh sách, hãng "Khác", Phụ kiện nhập tự do, Phụ kiện bỏ trống
--   Bảo hành     : có / không khai (trường trống phải bị ẩn ở bảng thông số)
--   Giá          : 150 nghìn, vài triệu, chục triệu, 1,25 tỷ, Thỏa thuận (null)
--   Trạng thái   : active ×8, sold ×1, hidden ×1
--   Khoảng cách  : từ trung tâm TP.HCM (10.7769, 106.7009) ≈ 0,6 / 1,7 / 3 / 5–6 / 8 / 11 / 23 km,
--                  và 1 tin ở Hà Nội (ngoài mọi bán kính khi đứng ở TP.HCM)
--   Thời gian    : 15 phút, 2 giờ, 1 ngày, 3 ngày, 2 tuần, 2 tháng trước
--   Tiêu đề      : dài đúng 10 ký tự và đúng 70 ký tự; mô tả nhiều dòng
--
-- Lưu ý: seed không có ảnh (file ảnh phải upload vào Storage). Giao diện cần hiển thị
-- được tin không ảnh; muốn có ảnh thì đăng nhập tài khoản mẫu và sửa tin sau giai đoạn 7.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Tài khoản người bán (auth.users + auth.identities); trigger tự tạo profiles.
-- -----------------------------------------------------------------------------
with seed_users (id, email, full_name) as (
  values
    ('5eed0000-0000-4000-8000-000000000001'::uuid, 'seed.minhanh@chodocu.test',   'Nguyễn Minh Anh'),
    ('5eed0000-0000-4000-8000-000000000002'::uuid, 'seed.thuha@chodocu.test',     'Trần Thu Hà'),
    ('5eed0000-0000-4000-8000-000000000003'::uuid, 'seed.hoangphuc@chodocu.test', 'Lê Hoàng Phúc')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
  extensions.crypt('Matkhau123!', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', full_name), now(), now(),
  '', '', '', ''
from seed_users
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  u.id, u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.id in (
  '5eed0000-0000-4000-8000-000000000001',
  '5eed0000-0000-4000-8000-000000000002',
  '5eed0000-0000-4000-8000-000000000003'
)
on conflict do nothing;

-- Ngày tham gia khác nhau + số điện thoại (người thứ 3 cố ý để trống).
update public.profiles p
set phone = v.phone, created_at = v.joined
from (
  values
    ('5eed0000-0000-4000-8000-000000000001'::uuid, '0912345678', now() - interval '18 months'),
    ('5eed0000-0000-4000-8000-000000000002'::uuid, '0987654321', now() - interval '4 months'),
    ('5eed0000-0000-4000-8000-000000000003'::uuid, null,         now() - interval '5 days')
) as v (id, phone, joined)
where p.id = v.id;


-- -----------------------------------------------------------------------------
-- 2. Tin đăng
-- -----------------------------------------------------------------------------
-- Giao dịch của tin mẫu (listing_id ON DELETE SET NULL nên phải xóa trước, tránh dòng mồ côi)
delete from public.transactions where listing_id::text like '5eed1000-%';
delete from public.listings where id::text like '5eed1000-%';

insert into public.listings (
  id, seller_id, category_id, title, description, price, price_unit, attributes, status,
  location, address_text, province, district, created_at, updated_at
)
select
  v.id::uuid,
  v.seller_id::uuid,
  (select c.id from public.categories c where c.slug = v.category_slug),
  v.title,
  v.description,
  v.price,
  'total',
  v.attributes::jsonb,
  v.status,
  extensions.st_setsrid(extensions.st_makepoint(v.lng, v.lat), 4326)::extensions.geography,
  v.address_text,
  v.province,
  v.district,
  now() - v.age,
  now() - v.age
from (
  values
  -- 1. Điện thoại · Apple · Như mới · còn BH · gần trung tâm (~0,6 km) · 2 giờ trước
  (
    '5eed1000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001', 'dien-thoai',
    'iPhone 15 Pro Max 256GB Titan tự nhiên, pin 96%',
    E'Máy chính hãng VN/A, mua tại TGDĐ tháng 3/2025.\nPin 96%, Face ID, True Tone đầy đủ, chưa sửa chữa.\nFullbox: hộp, cáp, sách hướng dẫn. Tặng kèm ốp lưng và cường lực.\nƯu tiên giao dịch trực tiếp tại quận 1.',
    21500000::bigint, '{"hang":"apple","tinh_trang":"nhu_moi","bao_hanh":6}', 'active',
    10.7725, 106.6980, 'Phường Bến Thành, Quận 1, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Quận 1',
    interval '2 hours'
  ),
  -- 2. Điện thoại · Samsung · Đã sử dụng · KHÔNG khai bảo hành · ~3 km · 1 ngày trước
  (
    '5eed1000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000002', 'dien-thoai',
    'Samsung Galaxy S23 Ultra 12/256GB màu đen',
    E'Máy dùng 1 năm rưỡi, có vài vết xước nhẹ ở viền, màn hình không ám, không điểm chết.\nBút S-Pen hoạt động tốt. Bán kèm sạc 25W.',
    12900000::bigint, '{"hang":"samsung","tinh_trang":"da_su_dung"}', 'active',
    10.8015, 106.7110, 'Phường 25, Quận Bình Thạnh, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Quận Bình Thạnh',
    interval '1 day'
  ),
  -- 3. Điện thoại · Nokia · Hư hỏng · giá rất thấp · tiêu đề đúng 10 ký tự · ~5,7 km · 2 tháng trước
  (
    '5eed1000-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000003', 'dien-thoai',
    'Nokia 1280',
    'Máy không lên nguồn, bán xác cho ai sưu tầm hoặc lấy linh kiện. Vỏ còn đẹp.',
    150000::bigint, '{"hang":"nokia","tinh_trang":"hu_hong"}', 'active',
    10.7400, 106.6650, 'Phường 4, Quận 8, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Quận 8',
    interval '2 months'
  ),
  -- 4. Laptop · Apple · Mới (nguyên seal) · BH 12 tháng · ~11 km · 15 phút trước
  (
    '5eed1000-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000001', 'laptop',
    'MacBook Air M2 13 inch 8GB/256GB nguyên seal',
    E'Hàng trúng thưởng, nguyên seal chưa kích hoạt, bảo hành Apple 12 tháng.\nMàu Midnight. Có hóa đơn đỏ nếu cần.',
    23990000::bigint, '{"hang":"apple","tinh_trang":"moi","bao_hanh":12}', 'active',
    10.8500, 106.7720, 'Phường Linh Trung, Thành phố Thủ Đức, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Thành phố Thủ Đức',
    interval '15 minutes'
  ),
  -- 5. Laptop · Asus · Đã sử dụng · giá Thỏa thuận (null) · người bán KHÔNG có SĐT · ~6 km · 3 ngày trước
  (
    '5eed1000-0000-4000-8000-000000000005', '5eed0000-0000-4000-8000-000000000003', 'laptop',
    'Laptop gaming Asus ROG Strix G15 RTX 3060',
    E'Ryzen 7 6800H, RAM 16GB, SSD 512GB, màn 165Hz.\nMáy chơi game mượt, đã vệ sinh, thay keo tản nhiệt tháng trước.\nGiá thương lượng, có thể đổi ngang MacBook. Chỉ nhận chat, không nghe máy.',
    null::bigint, '{"hang":"asus","tinh_trang":"da_su_dung"}', 'active',
    10.8010, 106.6520, 'Phường 13, Quận Tân Bình, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Quận Tân Bình',
    interval '3 days'
  ),
  -- 6. Laptop · Dell · ĐÃ BÁN (không hiện trên bản đồ, trang chi tiết có nhãn "Đã bán") · ~8 km
  (
    '5eed1000-0000-4000-8000-000000000006', '5eed0000-0000-4000-8000-000000000002', 'laptop',
    'Dell Latitude 7420 i5 thế hệ 11, RAM 16GB',
    'Máy văn phòng bền bỉ, bàn phím có đèn, pin còn khoảng 4 tiếng. Đã có người mua.',
    8500000::bigint, '{"hang":"dell","tinh_trang":"da_su_dung","bao_hanh":0}', 'sold',
    10.8380, 106.6650, 'Phường 10, Quận Gò Vấp, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Quận Gò Vấp',
    interval '2 weeks'
  ),
  -- 7. Tivi · Sony · Như mới · BH 18 tháng · mô tả nhiều đoạn · ~5,6 km · 1 ngày trước
  (
    '5eed1000-0000-4000-8000-000000000007', '5eed0000-0000-4000-8000-000000000002', 'tivi',
    'Smart Tivi Sony Bravia 4K 65 inch KD-65X85L',
    E'Chuyển nhà nên cần bán gấp.\n\nThông tin:\n- Mua tháng 4/2025, còn bảo hành hãng 18 tháng.\n- Màn đẹp, không sọc, không ố.\n- Kèm remote giọng nói và chân đế zin.\n\nKhách tự chở, hỗ trợ khiêng xuống xe.',
    18000000::bigint, '{"hang":"sony","tinh_trang":"nhu_moi","bao_hanh":18}', 'active',
    10.7290, 106.7190, 'Phường Tân Phong, Quận 7, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Quận 7',
    interval '1 day 5 hours'
  ),
  -- 8. Tivi · hãng "Khác" (Panasonic) · ĐÃ ẨN (chỉ chủ tin thấy ở tab "Đã ẩn") · ~1,7 km
  (
    '5eed1000-0000-4000-8000-000000000008', '5eed0000-0000-4000-8000-000000000001', 'tivi',
    'Tivi Panasonic 43 inch Full HD đời 2019',
    'Tivi còn xem tốt, không phải smart tivi, cần cắm thêm Android box. Tạm ẩn tin.',
    2500000::bigint, '{"hang":"khac","tinh_trang":"da_su_dung"}', 'hidden',
    10.7830, 106.6870, 'Phường Võ Thị Sáu, Quận 3, Thành phố Hồ Chí Minh', 'Thành phố Hồ Chí Minh', 'Quận 3',
    interval '3 days 2 hours'
  ),
  -- 9. Máy ảnh · hãng "Khác" (Leica) · giá > 1 tỷ ("1,25 tỷ") · ở HÀ NỘI (ngoài bán kính TP.HCM)
  (
    '5eed1000-0000-4000-8000-000000000009', '5eed0000-0000-4000-8000-000000000001', 'may-anh',
    'Bộ sưu tập Leica M11 kèm 3 ống kính Summilux',
    E'Thanh lý bộ sưu tập cá nhân: Leica M11 body đen + Summilux 28mm, 35mm, 50mm f/1.4.\nTất cả như mới, có hộp và giấy tờ. Xem hàng trực tiếp tại Hoàn Kiếm, Hà Nội.',
    1250000000::bigint, '{"hang":"khac","tinh_trang":"nhu_moi","bao_hanh":3}', 'active',
    21.0285, 105.8542, 'Phường Hàng Trống, Quận Hoàn Kiếm, Thành phố Hà Nội', 'Thành phố Hà Nội', 'Quận Hoàn Kiếm',
    interval '2 weeks 2 days'
  ),
  -- 10. Phụ kiện · KHÔNG khai hãng (trường text tùy chọn) · Mới · tiêu đề đúng 70 ký tự · ~23 km (Bình Dương)
  (
    '5eed1000-0000-4000-8000-000000000010', '5eed0000-0000-4000-8000-000000000002', 'phu-kien',
    'Sạc dự phòng 20000mAh sạc nhanh 65W kèm cáp USB-C, mới 100% nguyên hộp',
    'Hàng mới về, nguyên hộp. Sạc được laptop USB-C. Giao hàng nội thành Thủ Dầu Một.',
    350000::bigint, '{"tinh_trang":"moi","bao_hanh":12}', 'active',
    10.9800, 106.6520, 'Phường Phú Cường, Thành phố Thủ Dầu Một, Tỉnh Bình Dương', 'Tỉnh Bình Dương', 'Thành phố Thủ Dầu Một',
    interval '6 hours'
  )
) as v (
  id, seller_id, category_slug, title, description, price, attributes, status,
  lat, lng, address_text, province, district, age
);

-- Tin đã bán phải có 1 dòng transactions (giao dịch thành công, người mua ngoài nền tảng).
insert into public.transactions (listing_id, seller_id, buyer_id, category_id, final_price, completed_at)
select l.id, l.seller_id, null, l.category_id, l.price, l.updated_at
from public.listings l
where l.id::text like '5eed1000-%' and l.status = 'sold';

commit;

-- Kiểm tra nhanh: 10 tin, public_location lệch 200–400 m so với location.
-- select l.title, c.slug, l.status, l.price, l.attributes,
--        round(extensions.st_distance(l.location, l.public_location)) as lech_m
-- from public.listings l join public.categories c on c.id = l.category_id
-- where l.id::text like '5eed1000-%' order by l.created_at desc;
