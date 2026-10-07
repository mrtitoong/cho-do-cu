# Bộ prompt Vibe-coding: Website rao vặt theo bản đồ

Oct 5, 2026 · @Saksua

## Cách dùng bộ prompt

Dán từng prompt theo đúng thứ tự vào Cursor (chế độ Agent) hoặc Claude Code; chỉ sang prompt tiếp khi prompt trước đã chạy được và đã commit.

1. **Một lần duy nhất:** lưu Prompt 0 thành file `CLAUDE.md` (Claude Code) hoặc `.cursor/rules/project.mdc` (Cursor) ở gốc dự án. AI sẽ tự đọc bối cảnh này mỗi lần.
2. **Mỗi giai đoạn:** dán prompt, để AI làm xong, chạy `npm run dev` và tự bấm thử theo mục "Kiểm tra" của giai đoạn đó.
3. **Chạy được thì commit:** `git add . && git commit -m "Giai đoạn X xong"` rồi `git push`.
4. **Gặp lỗi:** dùng prompt sửa lỗi ở cuối tài liệu, dán nguyên văn thông báo lỗi. Sửa 3 lần không được thì `git restore .` quay về bản commit gần nhất và chia nhỏ yêu cầu.
5. **Phiên chat quá dài:** mở phiên mới cho mỗi giai đoạn, AI sẽ làm tốt hơn.

Các chỗ trong ngoặc vuông như `[TÊN WEBSITE]` là chỗ bạn tự điền trước khi dán.

## Prompt 0: Bối cảnh dự án

Lưu nguyên khối này thành file rules; đây là "bản mô tả" mà mọi prompt sau dựa vào.

```text
# Dự án: [TÊN WEBSITE] – website rao vặt hiển thị tin đăng trên bản đồ

## Mục tiêu
Nơi người bán đăng tin (đồ cũ, xe, bất động sản, việc làm...) và người mua tìm tin theo vị trí trên bản đồ.
Người mua lọc theo danh mục, giá, bán kính; xem chi tiết; bấm "Liên hệ" để xem số điện thoại hoặc "Chat" để nhắn tin với người bán.

## Các khu vực của website
- Trang chủ (/): thanh tìm kiếm, danh mục, THỐNG KÊ nền tảng (số người dùng, số giao dịch thành công,
  số tin đang bán), TIN TỨC mới nhất, tin đăng mới.
- Tìm kiếm theo bản đồ (/tim-kiem), chi tiết tin (/tin/[id]), đăng tin, tin nhắn, tin của tôi, hồ sơ.
- Tin tức (/tin-tuc, /tin-tuc/[slug]): bài viết do Admin đăng.
- Khu vực Admin (/admin), chỉ tài khoản có role = 'admin' vào được:
  thống kê nền tảng, quản lý danh mục và danh mục con, quản lý người dùng, quản lý tin tức.

## Công nghệ (không tự ý đổi)
- Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui
- Supabase: Auth, Postgres + PostGIS, Storage, Realtime. Dùng @supabase/ssr.
- Bản đồ: Leaflet + react-leaflet + OpenStreetMap, gom ghim bằng react-leaflet-cluster
- Form: react-hook-form + zod
- Biểu đồ (trang Admin): Recharts. Soạn bài tin tức: Tiptap.
- Deploy: Vercel

## Danh mục
Danh mục chính, danh mục con và trường riêng của từng danh mục được LƯU TRONG CƠ SỞ DỮ LIỆU
(bảng categories, cột fields dạng JSONB) để Admin thêm/sửa/ẩn được mà không cần sửa code.
Người bán PHẢI chọn danh mục chính, rồi danh mục con, trước khi điền form.
Dữ liệu ban đầu:
- Bất động sản: Nhà ở, Căn hộ, Đất, Phòng trọ, Mặt bằng
- Việc làm: Toàn thời gian, Bán thời gian, Thời vụ
- Xe cộ: Xe máy, Ô tô, Xe đạp, Phụ tùng
- Đồ điện tử: Điện thoại, Laptop, Tivi, Máy ảnh, Phụ kiện
- Sản phẩm khác: Nội thất, Thời trang, Đồ gia dụng, Sách, Khác
Giá trị các trường riêng của mỗi tin lưu vào cột listings.attributes (JSONB).

## Giao dịch thành công
Một giao dịch thành công = người bán bấm "Đánh dấu đã bán" → tạo 1 dòng trong bảng transactions
(có thể chọn người mua trong số những người đã chat về tin đó).

## Quy tắc
- Toàn bộ giao diện bằng tiếng Việt. Giá hiển thị kiểu "1.500.000 đ", rút gọn "1,5 triệu" / "2,3 tỷ" trên thẻ tin.
- Ưu tiên giao diện điện thoại (mobile-first). Riêng khu vực Admin ưu tiên máy tính.
- Bật RLS cho MỌI bảng. Không bao giờ đưa service_role key ra phía trình duyệt.
- Quyền Admin kiểm tra Ở CẢ HAI NƠI: middleware chặn /admin, và RLS/hàm SQL dùng is_admin().
  Không bao giờ chỉ ẩn nút trên giao diện.
- Người dùng bị khóa (is_banned) không đăng tin, không chat được; tin của họ tự ẩn.
- Số điện thoại người bán không được nằm trong dữ liệu công khai; chỉ lấy qua hàm riêng khi người xem đã đăng nhập.
- Vị trí hiển thị công khai là vị trí đã làm mờ (lệch ~300 m), không lộ địa chỉ chính xác.
- Thay đổi cơ sở dữ liệu viết thành file migration SQL trong supabase/migrations.
- Làm đúng phạm vi được yêu cầu, không tự thêm tính năng. Xong việc thì liệt kê file đã sửa và cách tôi tự kiểm tra.
```

## Giai đoạn 1: Khung dự án và đăng nhập

Trước khi dán: tạo project Supabase (vùng Singapore), lấy Project URL và publishable key trong Settings → API.

```text
Khởi tạo dự án theo bối cảnh trong file rules.

1. Tạo app Next.js mới (App Router, TypeScript, Tailwind, ESLint, thư mục src/), cài shadcn/ui.
2. Cài @supabase/supabase-js và @supabase/ssr. Tạo:
   - src/lib/supabase/client.ts (dùng trong trình duyệt)
   - src/lib/supabase/server.ts (dùng trong Server Component / Server Action)
   - middleware.ts để làm mới phiên đăng nhập
   - .env.local.example với NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
3. Layout chung: thanh trên cùng có logo [TÊN WEBSITE], ô tìm kiếm (chưa cần chạy), nút "Đăng tin", nút "Tin nhắn", và menu tài khoản (Đăng nhập hoặc Ảnh đại diện → Tin của tôi, Hồ sơ, Đăng xuất). Trên điện thoại dùng thanh điều hướng dưới đáy.
4. Trang /dang-nhap: đăng nhập bằng email + mật khẩu, đăng ký, quên mật khẩu, và nút "Tiếp tục với Google". Trang /auth/callback xử lý chuyển hướng.
5. Các trang cần đăng nhập (/dang-tin, /tin-nhan, /tin-cua-toi, /ho-so) tự chuyển về /dang-nhap nếu chưa đăng nhập, đăng nhập xong quay lại trang cũ.
6. Tạo sẵn các trang trống có tiêu đề cho những đường dẫn trên.

Chưa tạo bảng dữ liệu nào ở bước này.
```

**Kiểm tra:** đăng ký tài khoản mới, đăng xuất, đăng nhập lại; vào /dang-tin khi chưa đăng nhập phải bị chuyển về trang đăng nhập. Đăng nhập Google cần bật thêm trong Supabase → Authentication → Providers.

## Giai đoạn 2: Cơ sở dữ liệu

Giai đoạn quan trọng nhất về bảo mật; đọc kỹ file SQL AI viết trước khi chạy.

```text
Viết file migration SQL supabase/migrations/0001_init.sql cho cơ sở dữ liệu:

1. Bật extension postgis.
2. Bảng profiles: id (= auth.users.id), full_name, avatar_url, phone,
   role ('user' | 'admin', mặc định 'user'), is_banned (bool), banned_reason, created_at, last_seen_at.
   Trigger tự tạo profile khi có user mới. Người dùng KHÔNG được tự sửa role và is_banned.
3. Bảng categories: id, parent_id (null = danh mục chính), slug, name, icon, color, sort_order,
   is_active, price_label ('Giá bán' | 'Giá thuê/tháng' | 'Mức lương'), requires_images (bool),
   fields (jsonb: danh sách trường riêng, mỗi trường {key, label, type, unit, options, required, filterable}).
   Danh mục con kế thừa fields của danh mục cha và có thể thêm trường riêng.
   Seed sẵn 5 danh mục chính, các danh mục con, và fields theo bảng dưới đây:
   - Bất động sản: hình thức (Bán/Cho thuê), diện tích m², số phòng ngủ, số WC, giấy tờ pháp lý
   - Việc làm: lương từ – đến, ngành nghề, kinh nghiệm, tên công ty/cửa hàng (requires_images = false)
   - Xe cộ: hãng, dòng xe, năm sản xuất, số km đã đi, tình trạng
   - Đồ điện tử: hãng, tình trạng, bảo hành còn lại
   - Sản phẩm khác: tình trạng
4. Bảng listings: id, seller_id, category_id (phải là danh mục con), title, description,
   price (bigint, VNĐ, cho phép null = "Thỏa thuận"), price_unit ('total' | 'month'),
   attributes (jsonb, mặc định {}), status ('active' | 'sold' | 'hidden' | 'removed'),
   removed_reason (khi Admin gỡ tin),
   location (geography(Point,4326), vị trí thật), public_location (geography, vị trí đã làm mờ),
   address_text, province, district, view_count, created_at, updated_at.
   Trigger tự tính public_location = location lệch ngẫu nhiên 200–400 m khi insert hoặc khi location đổi.
   Index GIST cho public_location, index cho category_id, status, created_at, GIN cho attributes.
5. Bảng listing_images: id, listing_id, path (trong Storage), sort_order.
6. Bảng conversations: id, listing_id, buyer_id, seller_id, last_message_at; unique (listing_id, buyer_id).
7. Bảng messages: id, conversation_id, sender_id, body, created_at, read_at.
8. Bảng transactions: id, listing_id (unique), seller_id, buyer_id (cho phép null), category_id,
   final_price, completed_at.
9. Bảng posts (tin tức): id, slug (unique), title, excerpt, cover_path, content (jsonb của Tiptap),
   status ('draft' | 'published'), is_featured, published_at, author_id, created_at, updated_at.
10. Bảng admin_logs: id, admin_id, action, target_type, target_id, detail (jsonb), created_at.
11. Storage: bucket "listing-images" (chủ tin upload/xóa trong thư mục {user_id}/),
    bucket "post-images" (chỉ Admin upload). Cả hai công khai để đọc.

Hàm is_admin(): trả true nếu profiles.role của auth.uid() = 'admin' (security definer).

RLS (bật cho mọi bảng; Admin dùng is_admin() để có quyền rộng hơn):
- profiles: ai cũng đọc được full_name, avatar_url; cột phone KHÔNG được đọc trực tiếp (thu hồi quyền
  SELECT cột phone cho anon và authenticated). Chủ sở hữu sửa thông tin của mình (trừ role, is_banned).
  Admin đọc tất cả và sửa role, is_banned.
- categories: ai cũng đọc danh mục is_active; chỉ Admin thêm/sửa/xóa.
- listings: ai cũng đọc được tin status = 'active' của người không bị khóa, nhưng KHÔNG đọc được cột location;
  chủ tin đọc/sửa/xóa tin của mình (không được tự đổi từ 'removed' về 'active'); Admin đọc và đổi status mọi tin.
  Người bị khóa không tạo được tin mới.
- conversations, messages: chỉ buyer và seller đọc và gửi được; người bị khóa không gửi được.
  Admin KHÔNG đọc được nội dung tin nhắn riêng.
- transactions: chủ tin tạo được cho tin của mình; seller/buyer đọc giao dịch của mình; Admin đọc tất cả.
- posts: ai cũng đọc bài 'published'; chỉ Admin đọc nháp và thêm/sửa/xóa.
- admin_logs: chỉ Admin đọc và thêm.

Hàm SQL (security definer, set search_path):
- search_listings(lat, lng, radius_km, category_ids[], min_price, max_price, attr_filters jsonb, keyword, limit, offset):
  trả về tin active trong bán kính, kèm toạ độ public_location, khoảng cách, ảnh đầu tiên.
- get_seller_phone(listing_id): chỉ trả số khi auth.uid() khác null; ghi log vào bảng phone_reveals
  và từ chối nếu một người xem quá 30 số trong 24 giờ.
- get_public_stats(): ai cũng gọi được, chỉ trả về số tổng: tổng người dùng, tổng giao dịch thành công,
  số tin đang bán, số tin đang bán theo từng danh mục chính. Không trả dữ liệu cá nhân nào.
- get_admin_stats(from_date, to_date): chỉ Admin gọi được (kiểm tra is_admin() ngay đầu hàm);
  trả về số liệu theo ngày: người dùng mới, tin mới, giao dịch, số tin nhắn; và cơ cấu theo danh mục, theo tỉnh.

Sau đó tạo file src/types/database.ts bằng lệnh supabase gen types.
Giải thích ngắn từng policy RLS bằng tiếng Việt để tôi kiểm tra.
Cuối cùng hướng dẫn tôi câu lệnh SQL để tự cấp quyền admin cho tài khoản của mình.
```

**Kiểm tra:** chạy file SQL trong Supabase → SQL Editor; mở Table Editor thấy đủ bảng và danh mục; mục Advisors không báo bảng nào thiếu RLS.

## Giai đoạn 3a: Cấu hình danh mục và form đăng tin

```text
Làm luồng đăng tin theo danh mục (chưa cần ảnh và bản đồ, sẽ làm ở bước sau).

1. Tạo src/lib/categories.ts:
   - getCategoryTree(): đọc bảng categories (chỉ is_active), trả về cây danh mục chính → danh mục con.
     Cache bằng unstable_cache với tag 'categories' để Admin sửa xong thì xóa cache.
   - getFieldsForCategory(subCategoryId): gộp fields của danh mục cha và danh mục con.
   - Kiểu TypeScript FieldDef cho mỗi trường: key, label, type ('text' | 'number' | 'select' | 'range' | 'year'),
     unit, options, required, filterable.
   - buildZodSchema(fields): sinh schema kiểm tra dữ liệu từ danh sách trường.
   KHÔNG viết cứng danh mục trong code.

2. Trang /dang-tin là form nhiều bước, có thanh tiến trình:
   - Bước 1: lưới danh mục chính có icon to (lấy từ DB), bấm vào hiện danh mục con. BẮT BUỘC chọn xong mới đi tiếp.
   - Bước 2: thông tin chung (tiêu đề 10–70 ký tự, giá với nhãn lấy từ price_label,
     ô "Giá thỏa thuận", mô tả tối thiểu 20 ký tự) + các trường riêng TỰ SINH từ getFieldsForCategory.
     Ô giá tự thêm dấu chấm hàng nghìn khi gõ và hiện dòng nhỏ "= 1,5 triệu".
   - Bước 3 (Ảnh) và Bước 4 (Vị trí): để khung trống, làm ở giai đoạn sau.
   - Bước 5: xem trước tin, nút "Đăng tin".
   Nút Quay lại giữ nguyên dữ liệu đã nhập. Đổi danh mục thì xóa các trường riêng cũ.
   Người dùng bị khóa vào trang này thì thấy thông báo "Tài khoản đã bị khóa" kèm lý do.

3. Server Action createListing: đọc lại fields từ DB, kiểm tra bằng zod trên server, lưu trường riêng vào attributes.
   Tạm thời cho phép location null để test.
```

**Kiểm tra:** đăng thử một tin ở mỗi danh mục chính; mở bảng listings thấy cột attributes chứa đúng trường riêng. Sau này Admin thêm hoặc sửa trường trong trang quản trị, form tự cập nhật theo.

## Giai đoạn 3b: Upload ảnh và chọn vị trí

```text
Hoàn thiện Bước 3 (Ảnh) và Bước 4 (Vị trí) của form /dang-tin.

Ảnh:
- Cho chọn hoặc kéo thả 1–10 ảnh (bắt buộc ít nhất 1, trừ danh mục Việc làm).
  Trên điện thoại cho chụp thẳng từ camera.
- Nén ảnh ngay trên trình duyệt bằng browser-image-compression: cạnh dài tối đa 1600px, định dạng WebP, dưới 500 KB.
- Upload vào bucket listing-images, đường dẫn {user_id}/{listing_id}/{uuid}.webp, hiện tiến trình từng ảnh.
- Xem trước dạng lưới, kéo để sắp xếp, ảnh đầu tiên là ảnh bìa, nút xóa từng ảnh.

Vị trí:
- Bản đồ Leaflet + OpenStreetMap, mặc định ở trung tâm [THÀNH PHỐ CỦA BẠN].
  Lưu ý: Leaflet cần import động (next/dynamic, ssr: false).
- Nút "Dùng vị trí hiện tại" (Geolocation API), xử lý trường hợp bị từ chối quyền.
- Ô tìm địa chỉ dùng Nominatim (giới hạn countrycodes=vn, chờ 500 ms sau khi ngừng gõ, gửi kèm header Referer).
- Người dùng kéo ghim để chỉnh vị trí; tự điền address_text, province, district bằng reverse geocoding.
- Hiện dòng chú thích: "Vị trí chính xác sẽ được ẩn, người xem chỉ thấy khu vực gần đúng."

Cập nhật createListing: location bắt buộc; ghi listing trước, rồi lưu listing_images.
Nếu bước nào lỗi thì xóa tin và ảnh đã upload để không để lại rác.
Sau khi đăng thành công, chuyển đến trang chi tiết tin /tin/[id] (tạm thời có thể là trang đơn giản).
```

**Kiểm tra:** đăng tin có 3 ảnh trên cả máy tính và điện thoại; trong Supabase Storage ảnh có dung lượng dưới 500 KB; cột public\_location khác location một chút.

## Giai đoạn 4: Bản đồ, danh sách và bộ lọc

Trước khi dán, tự đăng khoảng 15–20 tin thử ở nhiều danh mục, hoặc yêu cầu AI viết thêm file seed dữ liệu mẫu.

```text
Làm trang /tim-kiem là trang tìm kiếm theo bản đồ (trang chủ / sẽ làm ở giai đoạn 8).

Bố cục:
- Máy tính: danh sách thẻ tin bên trái (40%), bản đồ bên phải (60%).
- Điện thoại: bản đồ toàn màn hình, danh sách là bảng kéo lên từ dưới; nút chuyển "Bản đồ / Danh sách".
- Thanh danh mục chính dạng chip có icon ngay dưới thanh tìm kiếm.

Bản đồ:
- Mỗi danh mục chính một màu ghim và icon riêng (lấy từ cột color, icon trong bảng categories). Gom ghim khi thu nhỏ.
- Bấm ghim hiện thẻ nhỏ: ảnh bìa, tiêu đề, giá rút gọn, khoảng cách; bấm thẻ mở /tin/[id].
- Rê chuột lên thẻ trong danh sách thì ghim tương ứng nổi bật.
- Khi kéo bản đồ hiện nút "Tìm trong khu vực này" (không tự tải lại liên tục).
- Lần đầu vào trang, xin vị trí người dùng; bị từ chối thì dùng trung tâm [THÀNH PHỐ].

Bộ lọc (panel bên trái trên máy tính, bảng trượt trên điện thoại):
- Luôn có: từ khóa, danh mục chính → danh mục con, khoảng giá, bán kính (1/3/5/10/20 km), sắp xếp (Gần nhất/Mới nhất/Giá thấp/Giá cao).
- Khi đã chọn danh mục: hiện thêm bộ lọc riêng TỰ SINH từ các trường filterable (getFieldsForCategory)
  (ví dụ Bất động sản: Bán/Thuê, diện tích, số phòng ngủ; Xe cộ: hãng, năm sản xuất).
- Hiện số bộ lọc đang bật và nút "Xóa lọc".
- Toàn bộ trạng thái lọc lưu trên URL (search params) để chia sẻ link và bấm Back vẫn đúng.

Dữ liệu: gọi hàm search_listings qua RPC; phân trang 30 tin, cuộn xuống thì tải thêm.
Có trạng thái đang tải (skeleton) và trạng thái "Không tìm thấy tin nào, thử nới rộng bán kính".
```

**Kiểm tra:** lọc Xe cộ → Xe máy, giá dưới 20 triệu, bán kính 5 km; copy link dán sang tab khác phải ra cùng kết quả.

## Giai đoạn 5: Trang chi tiết và nút Liên hệ

```text
Làm trang chi tiết tin /tin/[id] (Server Component).

Nội dung:
- Thư viện ảnh: ảnh lớn + dãy ảnh nhỏ, vuốt trên điện thoại, bấm để xem toàn màn hình.
- Tiêu đề, giá (đúng nhãn theo danh mục, hoặc "Thỏa thuận"), khu vực (quận, tỉnh), thời gian đăng ("3 giờ trước").
- Bảng thông số sinh từ attributes + fields của danh mục (hiện đúng label và đơn vị, bỏ trường trống).
- Mô tả (giữ xuống dòng).
- Bản đồ nhỏ với VÒNG TRÒN bán kính 400 m quanh public_location, không dùng ghim chính xác.
- Thẻ người bán: ảnh đại diện, tên, ngày tham gia, số tin đang bán.
- Tin tương tự: 6 tin cùng danh mục con, gần nhất.
- Nếu tin đã bán: hiện nhãn "Đã bán" và ẩn hai nút liên hệ.

Hai nút hành động (trên điện thoại là thanh cố định dưới đáy):
1. "Liên hệ":
   - Chưa đăng nhập → chuyển đến /dang-nhap rồi quay lại.
   - Đã đăng nhập → gọi RPC get_seller_phone, hiện số đầy đủ, nút "Gọi" (tel:) và "Sao chép".
   - Trước khi bấm chỉ hiện dạng che "0912 xxx xxx".
   - Người bán chưa khai số → hiện "Người bán chỉ nhận chat".
2. "Chat với người bán": tạm thời chỉ tạo (hoặc lấy lại) conversation rồi chuyển đến
   /tin-nhan/[conversationId]. Trang chat làm ở giai đoạn sau.
Chủ tin xem tin của mình thì thay hai nút bằng "Sửa tin" và "Đánh dấu đã bán".

Thêm vào trang /ho-so: ô nhập số điện thoại (kiểm tra định dạng số Việt Nam 10 chữ số).
Thêm metadata (title, description, ảnh Open Graph) để chia sẻ link lên Facebook/Zalo có ảnh xem trước.
```

**Kiểm tra:** mở tin bằng cửa sổ ẩn danh, bấm Liên hệ phải bị yêu cầu đăng nhập; trong tab Network của trình duyệt, dữ liệu trang không được chứa số điện thoại hay toạ độ chính xác.

## Giai đoạn 6: Chat realtime

```text
Làm tính năng chat 1-1 giữa người mua và người bán bằng Supabase Realtime.

1. Trang /tin-nhan (hộp thư):
   - Danh sách cuộc trò chuyện, mới nhất lên đầu: ảnh nhỏ của tin, tên người kia, tiêu đề tin,
     tin nhắn cuối, thời gian, chấm đỏ nếu chưa đọc.
   - Ba tab "Tất cả / Đang mua / Đang bán".
2. Trang /tin-nhan/[id]:
   - Máy tính: hộp thư bên trái, khung chat bên phải. Điện thoại: chỉ khung chat, có nút quay lại.
   - Đầu khung chat: thẻ tin (ảnh, tiêu đề, giá, trạng thái), bấm mở tin.
   - Tin nhắn dạng bong bóng, nhóm theo ngày, hiện "Đã xem" dưới tin cuối của mình.
   - Cuộc trò chuyện mới chưa có tin nhắn: hiện các câu gợi ý bấm nhanh
     ("Sản phẩm còn không ạ?", "Giá có thương lượng không?", "Cho mình xem thêm ảnh được không?").
   - Ô nhập: Enter để gửi, Shift+Enter xuống dòng, giới hạn 1000 ký tự.
   - Hiển thị tin vừa gửi ngay lập tức (optimistic), gửi lỗi thì hiện nút "Gửi lại".
   - Tải 50 tin gần nhất, cuộn lên tải thêm.
3. Realtime:
   - Bật Realtime cho bảng messages (viết trong migration mới).
   - Subscribe tin mới theo conversation_id; nhớ unsubscribe khi rời trang.
   - Mở cuộc trò chuyện thì đánh dấu read_at các tin của người kia.
   - Trigger cập nhật conversations.last_message_at khi có tin mới.
4. Biểu tượng "Tin nhắn" trên thanh điều hướng hiện số cuộc trò chuyện chưa đọc, cập nhật realtime.
5. Nút "Đánh dấu đã bán" (ở trang chi tiết tin và trang Tin của tôi) mở hộp thoại:
   - Chọn người mua trong danh sách những người đã chat về tin này, hoặc "Người mua ngoài nền tảng".
   - Nhập giá chốt (mặc định = giá đăng).
   - Xác nhận → đổi listing.status = 'sold' và tạo 1 dòng transactions trong cùng một hàm SQL
     (mark_listing_sold) để không bị lệch dữ liệu. Mỗi tin chỉ tạo được 1 giao dịch.
6. Kiểm tra lại RLS: người thứ ba không đọc và không nhận realtime được tin của cuộc trò chuyện khác;
   không ai gửi tin được với sender_id của người khác.
```

**Kiểm tra:** mở hai trình duyệt với hai tài khoản (một cửa sổ thường, một cửa sổ ẩn danh), nhắn qua lại; tin phải hiện bên kia trong vòng 1–2 giây mà không cần tải lại trang.

## Giai đoạn 7: Khu vực Admin

Chia làm 4 prompt, làm lần lượt. Trước khi bắt đầu, chạy lệnh SQL ở Giai đoạn 2 để cấp quyền admin cho tài khoản của bạn.

Prompt 7a: khung Admin và quản lý người dùng.

```text
Làm khung khu vực Admin và trang quản lý người dùng.

Khung:
- Route group src/app/admin với layout riêng: thanh menu trái (Tổng quan, Người dùng, Tin đăng, Danh mục,
  Tin tức, Nhật ký), thanh trên cùng có tên admin và nút "Về trang web".
- Bảo vệ 3 lớp: middleware chặn /admin nếu không phải admin; layout kiểm tra lại trên server;
  mọi Server Action của admin gọi requireAdmin() trước khi làm gì.
- Menu tài khoản trên trang web hiện thêm mục "Quản trị" nếu là admin.
- Mọi thao tác thay đổi của admin đều ghi vào admin_logs. Trang /admin/nhat-ky hiển thị bảng này.

Trang /admin/nguoi-dung:
- Bảng người dùng (TanStack Table + shadcn): ảnh, tên, email, số điện thoại, vai trò, trạng thái,
  số tin đang bán, số giao dịch, ngày tham gia, lần hoạt động cuối.
  Tìm theo tên/email/số điện thoại, lọc theo vai trò và trạng thái, phân trang phía server 20 dòng.
  Email lấy từ auth.users qua một hàm SQL security definer chỉ admin gọi được.
- Trang chi tiết /admin/nguoi-dung/[id]: thông tin, danh sách tin đăng, giao dịch, lịch sử bị khóa.
- Thao tác: Khóa tài khoản (bắt buộc nhập lý do; tự ẩn mọi tin đang bán), Mở khóa,
  Cấp/thu quyền admin (hỏi xác nhận 2 lần). Admin không được tự khóa hoặc tự thu quyền của mình.

Trang /admin/tin-dang:
- Bảng mọi tin, lọc theo danh mục, trạng thái, người đăng, khoảng ngày.
- Thao tác: Gỡ tin (status = 'removed', nhập lý do), Khôi phục.
```

Prompt 7b: quản lý danh mục và danh mục con.

```text
Làm trang /admin/danh-muc.

- Hiển thị dạng cây: danh mục chính → danh mục con, kèm số tin đang bán của từng mục.
  Kéo thả để đổi thứ tự (sort_order) trong cùng cấp.
- Thêm/sửa danh mục chính: tên, slug (tự sinh từ tên, bỏ dấu tiếng Việt), icon (chọn từ bộ lucide-react),
  màu ghim, nhãn giá (Giá bán / Giá thuê/tháng / Mức lương), bắt buộc ảnh hay không, bật/tắt.
- Thêm/sửa danh mục con: tên, slug, icon, bật/tắt.
- Trình soạn trường riêng (cho cả danh mục chính và con): danh sách trường có thể thêm, sửa,
  kéo thả thứ tự. Mỗi trường: nhãn, key (tự sinh), kiểu (Văn bản / Số / Lựa chọn / Khoảng số / Năm),
  đơn vị, các lựa chọn (nếu kiểu Lựa chọn), bắt buộc, dùng làm bộ lọc.
  Có khung xem trước form đăng tin ngay bên cạnh.
- An toàn dữ liệu:
  - Không cho XÓA danh mục đang có tin; chỉ cho ẨN (tin cũ vẫn hiển thị, không đăng tin mới được).
  - Không cho đổi key của trường đã có dữ liệu; xóa trường thì chỉ ẩn khỏi form, không xóa dữ liệu cũ.
  - Chuyển danh mục con sang danh mục cha khác phải hỏi xác nhận và báo số tin bị ảnh hưởng.
- Lưu xong gọi revalidateTag('categories') để trang web cập nhật ngay.
```

Prompt 7c: quản lý tin tức.

```text
Làm quản lý tin tức cho Admin và trang tin tức công khai.

Admin (/admin/tin-tuc):
- Danh sách bài: ảnh bìa, tiêu đề, trạng thái (Nháp / Đã đăng), nổi bật, ngày đăng; lọc và tìm kiếm.
- Trang soạn bài: tiêu đề, slug (tự sinh, sửa được), mô tả ngắn, ảnh bìa (upload vào bucket post-images),
  nội dung bằng Tiptap (đậm, nghiêng, tiêu đề, danh sách, link, chèn ảnh, trích dẫn).
  Tự lưu nháp mỗi 30 giây. Nút "Xem trước", "Lưu nháp", "Đăng bài", "Gỡ bài".
  Đánh dấu "Nổi bật" để bài ưu tiên hiện ở trang chủ.

Công khai:
- /tin-tuc: danh sách bài đã đăng, mới nhất trước, phân trang 12 bài.
- /tin-tuc/[slug]: hiển thị nội dung Tiptap dạng HTML (lọc HTML an toàn), metadata Open Graph, bài liên quan.
- Thêm mục "Tin tức" vào thanh điều hướng.
- Đăng hoặc sửa bài xong gọi revalidatePath cho trang chủ và /tin-tuc.
```

Prompt 7d: bảng thống kê nền tảng.

```text
Làm trang /admin (Tổng quan) dùng hàm get_admin_stats và Recharts.

- Bộ chọn khoảng thời gian: 7 ngày / 30 ngày / 90 ngày / tùy chọn. Lưu trên URL.
- Hàng thẻ số liệu (mỗi thẻ có % tăng/giảm so với kỳ trước):
  Tổng người dùng, Người dùng mới, Tin đang bán, Tin mới, Giao dịch thành công, Tỉ lệ tin đã bán.
- Biểu đồ đường theo ngày: người dùng mới, tin mới, giao dịch.
- Biểu đồ cột ngang: số tin đang bán và số giao dịch theo danh mục chính.
- Bảng top 10 tỉnh/thành có nhiều tin nhất.
- Danh sách 10 người dùng mới và 10 tin mới nhất, bấm vào mở trang quản lý tương ứng.
- Nút "Xuất CSV" cho số liệu theo ngày.
```

**Kiểm tra:** đăng nhập bằng tài khoản thường rồi gõ thẳng /admin phải bị chặn. Khóa một tài khoản thử, kiểm tra tin của họ biến mất khỏi bản đồ và họ không đăng tin được. Thêm một danh mục con mới có trường riêng, mở /dang-tin thấy ngay.

## Giai đoạn 8: Trang chủ với thống kê và tin tức

Làm sau khu vực Admin, vì trang chủ cần có sẵn tin tức và số liệu giao dịch.

```text
Làm trang chủ / (Server Component, revalidate mỗi 10 phút). Các khối từ trên xuống:

1. Khối mở đầu: khẩu hiệu ngắn, ô tìm kiếm lớn (từ khóa + chọn danh mục) và nút "Tìm quanh tôi".
   Bấm tìm thì chuyển sang /tim-kiem với bộ lọc tương ứng trên URL.
2. Danh mục: lưới các danh mục chính (icon, tên, số tin đang bán), bấm vào mở /tim-kiem đã lọc sẵn.
3. Thống kê nền tảng (gọi get_public_stats): 3 con số lớn
   "Người dùng", "Giao dịch thành công", "Tin đang bán".
   - Định dạng số kiểu Việt Nam (12.345), số lớn rút gọn (1,2 triệu).
   - Hiệu ứng đếm số tăng dần khi cuộn tới (tắt nếu người dùng bật prefers-reduced-motion).
   - Khi số còn nhỏ (dưới 100), ẩn khối này thay vì hiện số quá thấp. Ngưỡng đặt trong 1 hằng số dễ sửa.
4. Tin đăng mới: 8 tin mới nhất (ưu tiên gần vị trí người xem nếu đã có quyền vị trí), nút "Xem trên bản đồ".
5. Tin tức: 1 bài nổi bật lớn + 3 bài mới nhất (ảnh bìa, tiêu đề, mô tả ngắn, ngày), link "Xem tất cả" → /tin-tuc.
   Chưa có bài nào thì ẩn khối.
6. Chân trang: giới thiệu, liên kết Tin tức, Điều khoản, Chính sách bảo mật, Liên hệ.

Trên điện thoại: danh mục thành dải cuộn ngang, 3 con số thống kê xếp 1 hàng nhỏ gọn.
Cập nhật thanh điều hướng: Trang chủ, Tìm kiếm (bản đồ), Đăng tin, Tin nhắn, Tài khoản.
```

**Kiểm tra:** đánh dấu đã bán một tin thử và đăng một bài tin tức, chờ tối đa 10 phút rồi tải lại trang chủ: số giao dịch tăng và bài mới xuất hiện. Khi thử, tạm hạ ngưỡng ẩn thống kê xuống 0.

## Giai đoạn 9: Tin của tôi, hoàn thiện và đưa lên mạng

Prompt 9a: quản lý tin và hoàn thiện giao diện.

```text
1. Trang /tin-cua-toi: các tab "Đang hiển thị / Đã bán / Đã ẩn", mỗi tin có nút Sửa, Đánh dấu đã bán,
   Ẩn/Hiện, Xóa (hỏi xác nhận bằng hộp thoại của shadcn, không dùng confirm() của trình duyệt).
   Xóa tin thì xóa luôn ảnh trong Storage.
2. Trang /tin/[id]/sua: dùng lại form đăng tin, điền sẵn dữ liệu, KHÔNG cho đổi danh mục chính.
3. Hoàn thiện:
   - Kiểm tra mọi trang ở chiều rộng 375px: không tràn ngang, nút bấm tối thiểu 44px.
   - Trang 404 và trang lỗi bằng tiếng Việt; thông báo (toast) khi đăng tin, sửa, xóa thành công hoặc lỗi.
   - Ảnh dùng next/image (khai báo domain Supabase trong next.config).
   - Favicon, tiêu đề trang, sitemap.xml cho các tin đang bán, robots.txt.
4. Chạy npm run build, sửa hết lỗi TypeScript và ESLint.
```

Prompt 9b: đưa lên Vercel.

```text
Hướng dẫn tôi từng bước đưa dự án lên Vercel:
- Kiểm tra .gitignore đã loại .env.local; không có key bí mật nào trong code.
- Các biến môi trường cần khai báo trên Vercel.
- Cần cập nhật gì trong Supabase (Site URL, Redirect URLs cho đăng nhập Google) sau khi có tên miền.
- Danh sách việc cần test lại trên bản production.
```

**Kiểm tra:** gửi link cho 2–3 người quen dùng thử trên điện thoại: đăng một tin, tìm tin của người khác, chat qua lại.

## Prompt dự phòng

**Khi gặp lỗi:**

```text
Tôi gặp lỗi khi [mô tả thao tác, ví dụ: bấm "Đăng tin" ở bước 5].
Kết quả mong muốn: [...]. Kết quả thực tế: [...].
Thông báo lỗi (terminal / console trình duyệt):
[dán nguyên văn]

Hãy tìm nguyên nhân gốc trước, giải thích ngắn, rồi mới sửa. Chỉ sửa những gì liên quan đến lỗi này.
```

**Kiểm tra bảo mật** (chạy sau giai đoạn 2, 5, 6, 7 và trước khi deploy):

```text
Đóng vai người kiểm tra bảo mật. Rà soát toàn bộ migration SQL, RLS policy, hàm RPC và code gọi Supabase.
Trả lời từng câu, kèm bằng chứng là đoạn code cụ thể:
1. Người chưa đăng nhập dùng publishable key có đọc được số điện thoại hoặc toạ độ chính xác không?
2. Người dùng A có sửa, xóa được tin hoặc ảnh của người dùng B không?
3. Người thứ ba có đọc được tin nhắn của người khác không?
4. Có cách nào lấy hàng loạt số điện thoại không?
5. Người dùng thường có cách nào tự cấp quyền admin, vào được /admin, hoặc gọi được get_admin_stats không?
6. Người bị khóa có cách nào vẫn đăng tin hoặc gửi tin nhắn không?
7. Có key bí mật nào lộ ra phía trình duyệt hoặc bị commit lên GitHub không?
Với mỗi lỗ hổng tìm thấy, đề xuất cách sửa nhưng CHƯA sửa, chờ tôi đồng ý.
```

**Review code sau mỗi giai đoạn:**

```text
Xem lại code của giai đoạn vừa làm. Chỉ ra: code trùng lặp, file quá dài (trên 300 dòng) nên tách,
chỗ thiếu xử lý lỗi hoặc trạng thái đang tải, và chỗ nào làm sai so với file rules.
Liệt kê theo mức độ quan trọng, rồi hỏi tôi trước khi sửa.
```

**Bắt đầu phiên mới giữa chừng:**

```text
Đọc file rules và xem cấu trúc thư mục, git log gần đây. Tóm tắt dự án đã làm đến đâu
so với 9 giai đoạn, rồi chờ tôi giao việc tiếp theo.
```
