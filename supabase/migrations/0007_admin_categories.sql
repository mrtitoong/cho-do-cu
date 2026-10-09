-- =============================================================================
-- 0007_admin_categories.sql
-- Khu vực Admin (giai đoạn 7b): quản lý danh mục, danh mục con và trường riêng.
--
-- Quy ước giữ như 0006: mọi hàm admin_* là security definer, gọi assert_admin() NGAY ĐẦU HÀM,
-- thao tác thay đổi ghi 1 dòng admin_logs trong CÙNG giao dịch.
--
-- An toàn dữ liệu (kiểm tra trong hàm SQL, không chỉ trên giao diện):
--   - Không xóa danh mục đang có tin (mọi trạng thái) hoặc đang có danh mục con; chỉ cho ẨN.
--   - Trường đã có dữ liệu trong listings.attributes không được bỏ khỏi fields (nên không đổi
--     được key); muốn bỏ thì đặt "hidden": true, dữ liệu cũ vẫn giữ nguyên.
--   - Danh mục chính không đổi thành danh mục con và ngược lại.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Hàm nội bộ: các key trường riêng ĐÃ CÓ DỮ LIỆU trong tin của một danh mục
-- (danh mục chính: gộp tin của mọi danh mục con). Giá trị null / "" không tính.
-- -----------------------------------------------------------------------------
create or replace function public.category_used_keys(p_category_id integer)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct e.key order by e.key), '{}')
  from public.listings l
  join public.categories c on c.id = l.category_id
  cross join lateral jsonb_each(l.attributes) as e (key, value)
  where (c.id = p_category_id or c.parent_id = p_category_id)
    and jsonb_typeof(l.attributes) = 'object'
    and e.value not in ('null'::jsonb, '""'::jsonb, '{}'::jsonb);
$$;

revoke execute on function public.category_used_keys from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- Hàm nội bộ: kiểm tra cột fields. Mỗi phần tử:
--   - key: chữ thường không dấu, số, gạch dưới, bắt đầu bằng chữ; không trùng.
--   - Phần tử chỉ có {key, hidden: true} (bỏ trường kế thừa ở danh mục con) được phép.
--   - Còn lại phải có label, type hợp lệ; type 'select' phải có ít nhất 1 lựa chọn.
-- -----------------------------------------------------------------------------
create or replace function public.categories_validate_fields(p_fields jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_field  jsonb;
  v_key    text;
  v_keys   text[] := '{}';
  v_option jsonb;
  v_values text[];
begin
  if p_fields is null or jsonb_typeof(p_fields) <> 'array' then
    raise exception 'Danh sách trường không hợp lệ' using errcode = '22023';
  end if;
  if jsonb_array_length(p_fields) > 40 then
    raise exception 'Mỗi danh mục tối đa 40 trường' using errcode = '23514';
  end if;

  for v_field in select * from jsonb_array_elements(p_fields) loop
    if jsonb_typeof(v_field) <> 'object' then
      raise exception 'Trường không hợp lệ' using errcode = '22023';
    end if;

    v_key := v_field ->> 'key';
    if v_key is null or v_key !~ '^[a-z][a-z0-9_]{0,39}$' then
      raise exception 'Key trường "%" không hợp lệ (chỉ chữ thường không dấu, số, gạch dưới)', v_key
        using errcode = '23514';
    end if;
    if v_key = any (v_keys) then
      raise exception 'Key trường "%" bị trùng', v_key using errcode = '23514';
    end if;
    v_keys := v_keys || v_key;

    -- {key, hidden: true}: chỉ ẩn trường kế thừa
    continue when v_field -> 'hidden' = 'true'::jsonb and not v_field ? 'label';

    if coalesce(btrim(v_field ->> 'label'), '') = '' or length(v_field ->> 'label') > 60 then
      raise exception 'Trường "%" phải có nhãn (tối đa 60 ký tự)', v_key using errcode = '23514';
    end if;
    if coalesce(v_field ->> 'type', '') not in ('text', 'number', 'select', 'range', 'year') then
      raise exception 'Kiểu của trường "%" không hợp lệ', v_field ->> 'label' using errcode = '23514';
    end if;

    if v_field ->> 'type' = 'select' then
      if jsonb_typeof(v_field -> 'options') <> 'array' or jsonb_array_length(v_field -> 'options') = 0 then
        raise exception 'Trường "%" phải có ít nhất 1 lựa chọn', v_field ->> 'label' using errcode = '23514';
      end if;
      v_values := '{}';
      for v_option in select * from jsonb_array_elements(v_field -> 'options') loop
        if coalesce(btrim(v_option ->> 'value'), '') = '' or coalesce(btrim(v_option ->> 'label'), '') = '' then
          raise exception 'Lựa chọn của trường "%" không được để trống', v_field ->> 'label'
            using errcode = '23514';
        end if;
        if v_option ->> 'value' = any (v_values) then
          raise exception 'Trường "%" có lựa chọn bị trùng', v_field ->> 'label' using errcode = '23514';
        end if;
        v_values := v_values || (v_option ->> 'value');
      end loop;
    end if;
  end loop;
end;
$$;

revoke execute on function public.categories_validate_fields from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- admin_list_categories: mọi danh mục (kể cả đã ẩn) kèm số tin và các key đã có dữ liệu.
--   active_listings : số tin đang bán (danh mục chính = tổng các danh mục con)
--   total_listings  : số tin mọi trạng thái (> 0 thì không xóa được)
--   used_keys       : key trường riêng đã có dữ liệu (không được đổi key / xóa hẳn)
-- -----------------------------------------------------------------------------
create or replace function public.admin_list_categories()
returns table (
  id               integer,
  parent_id        integer,
  slug             text,
  name             text,
  icon             text,
  color            text,
  sort_order       integer,
  is_active        boolean,
  price_label      text,
  requires_images  boolean,
  fields           jsonb,
  active_listings  integer,
  total_listings   integer,
  used_keys        text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.assert_admin();

  return query
  with counts as (
    select l.category_id,
           count(*) filter (where l.status = 'active') as active,
           count(*) as total
    from public.listings l
    group by l.category_id
  ),
  keys as (
    select l.category_id, e.key
    from public.listings l
    cross join lateral jsonb_each(l.attributes) as e (key, value)
    where jsonb_typeof(l.attributes) = 'object'
      and e.value not in ('null'::jsonb, '""'::jsonb, '{}'::jsonb)
    group by l.category_id, e.key
  )
  select
    c.id, c.parent_id, c.slug, c.name, c.icon, c.color, c.sort_order, c.is_active,
    c.price_label, c.requires_images, c.fields,
    coalesce((
      select sum(n.active) from counts n join public.categories s on s.id = n.category_id
      where s.id = c.id or s.parent_id = c.id
    ), 0)::integer,
    coalesce((
      select sum(n.total) from counts n join public.categories s on s.id = n.category_id
      where s.id = c.id or s.parent_id = c.id
    ), 0)::integer,
    coalesce((
      select array_agg(distinct k.key order by k.key) from keys k join public.categories s on s.id = k.category_id
      where s.id = c.id or s.parent_id = c.id
    ), '{}')
  from public.categories c
  order by c.parent_id nulls first, c.sort_order, c.id;
end;
$$;

revoke execute on function public.admin_list_categories from public, anon, authenticated;
grant execute on function public.admin_list_categories to authenticated;


-- -----------------------------------------------------------------------------
-- admin_save_category: thêm (không truyền p_id) hoặc sửa danh mục. Trả về id.
-- p_data: { parent_id, name, slug, icon, is_active, fields,
--           color, price_label, requires_images  -- chỉ dùng cho danh mục chính }
-- Danh mục con: color / price_label / requires_images giữ nguyên giá trị đang có
-- (null = dùng của danh mục cha).
-- -----------------------------------------------------------------------------
create or replace function public.admin_save_category(p_data jsonb, p_id integer default null)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_old        public.categories;
  v_parent_id  integer := nullif(p_data ->> 'parent_id', '')::integer;
  v_name       text := btrim(p_data ->> 'name');
  v_slug       text := btrim(p_data ->> 'slug');
  v_icon       text := btrim(p_data ->> 'icon');
  v_active     boolean := coalesce((p_data ->> 'is_active')::boolean, true);
  v_fields     jsonb := coalesce(p_data -> 'fields', '[]'::jsonb);
  v_color      text := nullif(btrim(p_data ->> 'color'), '');
  v_label      text := nullif(btrim(p_data ->> 'price_label'), '');
  v_images     boolean := (p_data ->> 'requires_images')::boolean;
  v_parent_fields jsonb := '[]'::jsonb;
  v_missing    text[];
  v_id         integer;
  v_moved      integer;
begin
  perform public.assert_admin();

  if coalesce(v_name, '') = '' or length(v_name) > 60 then
    raise exception 'Tên danh mục phải từ 1 đến 60 ký tự' using errcode = '23514';
  end if;
  if v_slug is null or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(v_slug) > 60 then
    raise exception 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang' using errcode = '23514';
  end if;
  if v_icon is null or v_icon !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'Icon không hợp lệ' using errcode = '23514';
  end if;
  perform public.categories_validate_fields(v_fields);

  if v_parent_id is not null then
    select p.fields into v_parent_fields
    from public.categories p where p.id = v_parent_id and p.parent_id is null;
    if not found then
      raise exception 'Danh mục cha phải là danh mục chính' using errcode = '23514';
    end if;
  else
    if v_color is null or v_color !~ '^#[0-9a-fA-F]{6}$' then
      raise exception 'Màu ghim không hợp lệ' using errcode = '23514';
    end if;
    if v_label is null or v_label not in ('Giá bán', 'Giá thuê/tháng', 'Mức lương') then
      raise exception 'Nhãn giá không hợp lệ' using errcode = '23514';
    end if;
    if v_images is null then
      raise exception 'Chưa chọn có bắt buộc ảnh hay không' using errcode = '23514';
    end if;
  end if;

  -- ---------------------------------------------------------------- Thêm mới
  if p_id is null then
    insert into public.categories (parent_id, slug, name, icon, is_active, fields, color, price_label,
                                   requires_images, sort_order)
    values (
      v_parent_id, v_slug, v_name, v_icon, v_active, v_fields,
      case when v_parent_id is null then v_color end,
      case when v_parent_id is null then v_label end,
      case when v_parent_id is null then v_images end,
      coalesce((select max(c.sort_order) from public.categories c
                where c.parent_id is not distinct from v_parent_id), 0) + 1
    )
    returning id into v_id;

    insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'category.create', 'category', v_id::text,
            jsonb_build_object('name', v_name, 'parent_id', v_parent_id));
    return v_id;
  end if;

  -- ---------------------------------------------------------------- Sửa
  select * into v_old from public.categories c where c.id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy danh mục' using errcode = 'P0002';
  end if;
  if (v_old.parent_id is null) <> (v_parent_id is null) then
    raise exception 'Không đổi được danh mục chính thành danh mục con và ngược lại' using errcode = '23514';
  end if;

  -- Trường đã có dữ liệu phải còn trong fields (đổi key = bỏ key cũ → bị chặn).
  -- Ở danh mục con, key vẫn có trong fields của danh mục cha thì dữ liệu vẫn có trường hiển thị.
  select array_agg(k order by k) into v_missing
  from unnest(public.category_used_keys(p_id)) as k
  where exists (select 1 from jsonb_array_elements(v_old.fields) f where f ->> 'key' = k)
    and not exists (select 1 from jsonb_array_elements(v_fields) f where f ->> 'key' = k)
    and not exists (select 1 from jsonb_array_elements(v_parent_fields) f where f ->> 'key' = k);
  if v_missing is not null then
    raise exception 'Trường % đã có dữ liệu, không đổi key hoặc xóa được (chỉ được ẩn)',
      array_to_string(v_missing, ', ') using errcode = '23514';
  end if;

  update public.categories c
  set parent_id       = v_parent_id,
      slug            = v_slug,
      name            = v_name,
      icon            = v_icon,
      is_active       = v_active,
      fields          = v_fields,
      color           = case when v_parent_id is null then v_color else c.color end,
      price_label     = case when v_parent_id is null then v_label else c.price_label end,
      requires_images = case when v_parent_id is null then v_images else c.requires_images end,
      -- chuyển sang danh mục cha khác thì xếp cuối danh sách con của cha mới
      sort_order      = case when v_parent_id is distinct from v_old.parent_id then
                          coalesce((select max(s.sort_order) from public.categories s
                                    where s.parent_id = v_parent_id), 0) + 1
                        else c.sort_order end
  where c.id = p_id;

  if v_parent_id is distinct from v_old.parent_id then
    select count(*) into v_moved from public.listings l where l.category_id = p_id;
    insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), 'category.move', 'category', p_id::text,
            jsonb_build_object('name', v_name, 'parent_from', v_old.parent_id, 'parent_to', v_parent_id,
                               'listings', v_moved));
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'category.update', 'category', p_id::text,
          jsonb_build_object('name', v_name)
          || case when v_old.is_active <> v_active
               then jsonb_build_object('is_active', v_active) else '{}'::jsonb end);
  return p_id;
end;
$$;

revoke execute on function public.admin_save_category from public, anon, authenticated;
grant execute on function public.admin_save_category to authenticated;


-- -----------------------------------------------------------------------------
-- admin_set_category_active: bật / ẩn nhanh từ cây danh mục.
-- Ẩn: tin cũ vẫn hiển thị, không đăng tin mới vào được (trigger listings_check_category).
-- -----------------------------------------------------------------------------
create or replace function public.admin_set_category_active(p_id integer, p_active boolean)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  perform public.assert_admin();

  update public.categories c set is_active = p_active
  where c.id = p_id and c.is_active <> p_active
  returning c.name into v_name;
  if not found then
    if not exists (select 1 from public.categories c where c.id = p_id) then
      raise exception 'Không tìm thấy danh mục' using errcode = 'P0002';
    end if;
    return;
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), case when p_active then 'category.show' else 'category.hide' end,
          'category', p_id::text, jsonb_build_object('name', v_name));
end;
$$;

revoke execute on function public.admin_set_category_active from public, anon, authenticated;
grant execute on function public.admin_set_category_active to authenticated;


-- -----------------------------------------------------------------------------
-- admin_delete_category: chỉ xóa được danh mục CHƯA từng có tin và không có danh mục con.
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_category(p_id integer)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  perform public.assert_admin();

  select c.name into v_name from public.categories c where c.id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy danh mục' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.categories c where c.parent_id = p_id) then
    raise exception 'Danh mục đang có danh mục con, hãy xóa hoặc chuyển danh mục con trước'
      using errcode = '23514';
  end if;
  if exists (select 1 from public.listings l where l.category_id = p_id)
     or exists (select 1 from public.transactions t where t.category_id = p_id) then
    raise exception 'Danh mục đang có tin đăng, chỉ ẩn được, không xóa được' using errcode = '23514';
  end if;

  delete from public.categories c where c.id = p_id;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'category.delete', 'category', p_id::text, jsonb_build_object('name', v_name));
end;
$$;

revoke execute on function public.admin_delete_category from public, anon, authenticated;
grant execute on function public.admin_delete_category to authenticated;


-- -----------------------------------------------------------------------------
-- admin_reorder_categories: đổi thứ tự trong CÙNG MỘT CẤP.
--   p_ids: đủ mọi id của cấp đó, theo thứ tự mới; p_parent_id: null (bỏ trống) = các danh mục chính.
-- -----------------------------------------------------------------------------
create or replace function public.admin_reorder_categories(p_ids integer[], p_parent_id integer default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.assert_admin();

  if p_ids is null
     or cardinality(p_ids) <> (select count(distinct x) from unnest(p_ids) as x)
     or (select array_agg(c.id order by c.id) from public.categories c
         where c.parent_id is not distinct from p_parent_id)
        is distinct from (select array_agg(x order by x) from unnest(p_ids) as x) then
    raise exception 'Danh sách sắp xếp không khớp với danh mục hiện có, hãy tải lại trang'
      using errcode = '22023';
  end if;

  update public.categories c
  set sort_order = o.ord
  from unnest(p_ids) with ordinality as o (id, ord)
  where c.id = o.id;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'category.reorder', 'category', p_parent_id::text,
          jsonb_build_object('ids', to_jsonb(p_ids)));
end;
$$;

revoke execute on function public.admin_reorder_categories from public, anon, authenticated;
grant execute on function public.admin_reorder_categories to authenticated;
