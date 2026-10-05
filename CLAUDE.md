# Bộ prompt Vibe-coding: Website rao vặt theo bản đồ

Oct 5, 2026 · @Saksua

## Cách dùng bộ prompt

Dán từng prompt theo đúng thứ tự vào Cursor (chế độ Agent) hoặc Claude Code; chỉ sang prompt tiếp khi prompt trước đã chạy được và đã commit.

1. **Một lần duy nhất:** lưu Prompt 0 thành file `CLAUDE.md` (Claude Code) hoặc `.cursor/rules/project.mdc` (Cursor) ở gốc dự án. AI sẽ tự đọc bối cảnh này mỗi lần.
2. **Mỗi giai đoạn:** dán prompt, để AI làm xong, chạy `npm run dev` và tự bấm thử theo mục "Kiểm tra" của giai đoạn đó.
3. **Chạy được thì commit:** `git add . && git commit -m "Giai đoạn X xong"` rồi `git push`.
4. **Gặp lỗi:** dùng prompt sửa lỗi ở cuối tài liệu, dán nguyên văn thông báo lỗi. Sửa 3 lần không được thì `git restore .` quay về bản commit gần nhất và chia nhỏ yêu cầu.
5. **Phiên chat quá dài:** mở phiên mới cho mỗi giai đoạn, AI sẽ làm tốt hơn.

Các chỗ trong ngoặc vuông như `Chợ Đồ Cũ` là chỗ bạn tự điền trước khi dán.

## Prompt 0: Bối cảnh dự án

Lưu nguyên khối này thành file rules; đây là "bản mô tả" mà mọi prompt sau dựa vào.

```text
# Dự án: Chợ Đồ Cũ – website rao vặt hiển thị tin đăng trên bản đồ

## Mục tiêu
Nơi người bán đăng tin (đồ cũ, xe, bất động sản, việc làm...) và người mua tìm tin theo vị trí trên bản đồ.
Người mua lọc theo danh mục, giá, bán kính; xem chi tiết; bấm "Liên hệ" để xem số điện thoại hoặc "Chat" để nhắn tin với người bán.

## Công nghệ (không tự ý đổi)
- Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui
- Supabase: Auth, Postgres + PostGIS, Storage, Realtime. Dùng @supabase/ssr.
- Bản đồ: Leaflet + react-leaflet + OpenStreetMap, gom ghim bằng react-leaflet-cluster
- Form: react-hook-form + zod
- Deploy: Vercel

## Danh mục
Người bán PHẢI chọn danh mục chính, rồi danh mục con, trước khi điền form.
- Bất động sản: Nhà ở, Căn hộ, Đất, Phòng trọ, Mặt bằng
- Việc làm: Toàn thời gian, Bán thời gian, Thời vụ
- Xe cộ: Xe máy, Ô tô, Xe đạp, Phụ tùng
- Đồ điện tử: Điện thoại, Laptop, Tivi, Máy ảnh, Phụ kiện
- Sản phẩm khác: Nội thất, Thời trang, Đồ gia dụng, Sách, Khác
Mỗi danh mục có trường riêng, định nghĩa trong src/config/categories.ts và lưu vào cột listings.attributes (JSONB).

## Quy tắc
- Toàn bộ giao diện bằng tiếng Việt. Giá hiển thị kiểu "1.500.000 đ", rút gọn "1,5 triệu" / "2,3 tỷ" trên thẻ tin.
- Ưu tiên giao diện điện thoại (mobile-first).
- Bật RLS cho MỌI bảng. Không bao giờ đưa service_role key ra phía trình duyệt.
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
3. Layout chung: thanh trên cùng có logo Chợ Đồ Cũ, ô tìm kiếm (chưa cần chạy), nút "Đăng tin", nút "Tin nhắn", và menu tài khoản (Đăng nhập hoặc Ảnh đại diện → Tin của tôi, Hồ sơ, Đăng xuất). Trên điện thoại dùng thanh điều hướng dưới đáy.
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
2. Bảng profiles: id (= auth.users.id), full_name, avatar_url, phone, created_at.
   Trigger tự tạo profile khi có user mới.
3. Bảng categories: id, parent_id (null = danh mục chính), slug, name, icon, sort_order.
   Seed sẵn 5 danh mục chính và các danh mục con theo file rules.
4. Bảng listings: id, seller_id, category_id (phải là danh mục con), title, description,
   price (bigint, VNĐ, cho phép null = "Thỏa thuận"), price_unit ('total' | 'month'),
   attributes (jsonb, mặc định {}), status ('active' | 'sold' | 'hidden'),
   location (geography(Point,4326), vị trí thật), public_location (geography, vị trí đã làm mờ),
   address_text, province, district, created_at, updated_at.
   Trigger tự tính public_location = location lệch ngẫu nhiên 200–400 m khi insert hoặc khi location đổi.
   Index GIST cho public_location, index cho category_id, status, created_at, GIN cho attributes.
5. Bảng listing_images: id, listing_id, path (trong Storage), sort_order.
6. Bảng conversations: id, listing_id, buyer_id, seller_id, last_message_at; unique (listing_id, buyer_id).
7. Bảng messages: id, conversation_id, sender_id, body, created_at, read_at.
8. Storage bucket "listing-images" công khai để đọc; chỉ chủ tin mới upload/xóa được trong thư mục {user_id}/.

RLS (bật cho mọi bảng):
- profiles: ai cũng đọc được full_name, avatar_url; cột phone KHÔNG được đọc trực tiếp (thu hồi quyền SELECT cột phone cho anon và authenticated). Chỉ chủ sở hữu được sửa.
- listings: ai cũng đọc được tin status = 'active' nhưng KHÔNG đọc được cột location; chủ tin đọc/sửa/xóa tin của mình.
- conversations, messages: chỉ buyer và seller của cuộc trò chuyện đọc và gửi được.

Hàm SQL (security definer, set search_path):
- search_listings(lat, lng, radius_km, category_ids[], min_price, max_price, attr_filters jsonb, keyword, limit, offset):
  trả về tin active trong bán kính, kèm toạ độ public_location, khoảng cách, ảnh đầu tiên.
- get_seller_phone(listing_id): chỉ trả số khi auth.uid() khác null; ghi log vào bảng phone_reveals
  và từ chối nếu một người xem quá 30 số trong 24 giờ.

Sau đó tạo file src/types/database.ts bằng lệnh supabase gen types.
Giải thích ngắn từng policy RLS bằng tiếng Việt để tôi kiểm tra.
```

**Kiểm tra:** chạy file SQL trong Supabase → SQL Editor; mở Table Editor thấy đủ bảng và danh mục; mục Advisors không báo bảng nào thiếu RLS.

## Giai đoạn 3a: Cấu hình danh mục và form đăng tin

```text
Làm luồng đăng tin theo danh mục (chưa cần ảnh và bản đồ, sẽ làm ở bước sau).

1. Tạo src/config/categories.ts. Mỗi danh mục con khai báo:
   - slug, tên, danh mục cha
   - priceLabel ("Giá bán" | "Giá thuê/tháng" | "Mức lương") và price_unit tương ứng
   - fields: danh sách trường riêng, mỗi trường có key, label, type
     ('text' | 'number' | 'select' | 'range' | 'year'), đơn vị (m², km...), options (nếu select),
     required, filterable (có xuất hiện trong bộ lọc không).
   Trường theo danh mục chính:
   - Bất động sản: hình thức (Bán/Cho thuê), diện tích m², số phòng ngủ, số WC, giấy tờ pháp lý (Sổ hồng/Sổ đỏ/Giấy tay/Đang chờ sổ)
   - Việc làm: lương từ – đến (thay cho giá), ngành nghề, kinh nghiệm (Không yêu cầu/Dưới 1 năm/1–3 năm/Trên 3 năm), tên công ty/cửa hàng
   - Xe cộ: hãng, dòng xe, năm sản xuất, số km đã đi, tình trạng (Mới/Đã sử dụng)
   - Đồ điện tử: hãng, tình trạng (Mới/Như mới/Đã sử dụng/Hư hỏng), bảo hành còn lại
   - Sản phẩm khác: tình trạng
   Viết hàm buildZodSchema(categorySlug) sinh schema kiểm tra dữ liệu từ cấu hình này.

2. Trang /dang-tin là form nhiều bước, có thanh tiến trình:
   - Bước 1: lưới 5 ô danh mục chính có icon to, bấm vào hiện danh mục con. BẮT BUỘC chọn xong mới đi tiếp.
   - Bước 2: thông tin chung (tiêu đề 10–70 ký tự, giá với nhãn đổi theo danh mục,
     ô "Giá thỏa thuận", mô tả tối thiểu 20 ký tự) + các trường riêng TỰ SINH từ config.
     Ô giá tự thêm dấu chấm hàng nghìn khi gõ và hiện dòng nhỏ "= 1,5 triệu".
   - Bước 3 (Ảnh) và Bước 4 (Vị trí): để khung trống, làm ở giai đoạn sau.
   - Bước 5: xem trước tin, nút "Đăng tin".
   Nút Quay lại giữ nguyên dữ liệu đã nhập. Đổi danh mục thì xóa các trường riêng cũ.

3. Server Action createListing: kiểm tra lại bằng zod trên server, lưu trường riêng vào attributes.
   Tạm thời cho phép location null để test.
```

**Kiểm tra:** đăng thử một tin ở mỗi danh mục chính; mở bảng listings thấy cột attributes chứa đúng trường riêng. Thêm hoặc sửa trường sau này chỉ cần sửa file categories.ts.

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
Làm trang chủ / là trang tìm kiếm theo bản đồ.

Bố cục:
- Máy tính: danh sách thẻ tin bên trái (40%), bản đồ bên phải (60%).
- Điện thoại: bản đồ toàn màn hình, danh sách là bảng kéo lên từ dưới; nút chuyển "Bản đồ / Danh sách".
- Thanh danh mục chính dạng chip có icon ngay dưới thanh tìm kiếm.

Bản đồ:
- Mỗi danh mục chính một màu ghim và icon riêng (lấy từ config). Gom ghim khi thu nhỏ.
- Bấm ghim hiện thẻ nhỏ: ảnh bìa, tiêu đề, giá rút gọn, khoảng cách; bấm thẻ mở /tin/[id].
- Rê chuột lên thẻ trong danh sách thì ghim tương ứng nổi bật.
- Khi kéo bản đồ hiện nút "Tìm trong khu vực này" (không tự tải lại liên tục).
- Lần đầu vào trang, xin vị trí người dùng; bị từ chối thì dùng trung tâm [THÀNH PHỐ].

Bộ lọc (panel bên trái trên máy tính, bảng trượt trên điện thoại):
- Luôn có: từ khóa, danh mục chính → danh mục con, khoảng giá, bán kính (1/3/5/10/20 km), sắp xếp (Gần nhất/Mới nhất/Giá thấp/Giá cao).
- Khi đã chọn danh mục: hiện thêm bộ lọc riêng TỰ SINH từ các trường filterable trong config
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
- Bảng thông số sinh từ attributes + config danh mục (hiện đúng label và đơn vị, bỏ trường trống).
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
5. Kiểm tra lại RLS: người thứ ba không đọc và không nhận realtime được tin của cuộc trò chuyện khác;
   không ai gửi tin được với sender_id của người khác.
```

**Kiểm tra:** mở hai trình duyệt với hai tài khoản (một cửa sổ thường, một cửa sổ ẩn danh), nhắn qua lại; tin phải hiện bên kia trong vòng 1–2 giây mà không cần tải lại trang.

## Giai đoạn 7: Tin của tôi, hoàn thiện và đưa lên mạng

Prompt 7a: quản lý tin và hoàn thiện giao diện.

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

Prompt 7b: đưa lên Vercel.

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

**Kiểm tra bảo mật** (chạy sau giai đoạn 2, 5, 6 và trước khi deploy):

```text
Đóng vai người kiểm tra bảo mật. Rà soát toàn bộ migration SQL, RLS policy, hàm RPC và code gọi Supabase.
Trả lời từng câu, kèm bằng chứng là đoạn code cụ thể:
1. Người chưa đăng nhập dùng publishable key có đọc được số điện thoại hoặc toạ độ chính xác không?
2. Người dùng A có sửa, xóa được tin hoặc ảnh của người dùng B không?
3. Người thứ ba có đọc được tin nhắn của người khác không?
4. Có cách nào lấy hàng loạt số điện thoại không?
5. Có key bí mật nào lộ ra phía trình duyệt hoặc bị commit lên GitHub không?
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
so với 7 giai đoạn, rồi chờ tôi giao việc tiếp theo.
```

@AGENTS.md
