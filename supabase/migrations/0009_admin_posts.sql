-- =============================================================================
-- 0009_admin_posts.sql
-- Khu vực Admin (giai đoạn 7c): quản lý tin tức.
--
-- Bảng posts, RLS và bucket post-images đã có từ 0005. File này thêm các hàm admin_* để
-- thay đổi bài viết; quy ước giữ như 0006/0007: security definer, gọi assert_admin() NGAY ĐẦU HÀM,
-- ghi admin_logs trong CÙNG giao dịch.
--
-- Tự lưu nháp (mỗi 30 giây) không ghi nhật ký mỗi lần: nếu chính admin đó vừa có dòng
-- 'post.update' cho bài này trong 10 phút gần nhất thì bỏ qua, tránh nhật ký bị ngập.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- admin_save_post: thêm (p_id null) hoặc sửa bài. Trả về id bài.
-- p_data: { title, slug, excerpt, cover_path, content, status, is_featured }
-- published_at tự đặt lần đầu đăng (trigger posts_set_published_at); gỡ bài giữ nguyên ngày đăng cũ.
-- -----------------------------------------------------------------------------
create or replace function public.admin_save_post(p_id uuid, p_data jsonb, p_autosave boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title    text    := btrim(coalesce(p_data ->> 'title', ''));
  v_slug     text    := btrim(coalesce(p_data ->> 'slug', ''));
  v_excerpt  text    := nullif(btrim(coalesce(p_data ->> 'excerpt', '')), '');
  v_cover    text    := nullif(btrim(coalesce(p_data ->> 'cover_path', '')), '');
  v_content  jsonb   := coalesce(p_data -> 'content', '{}'::jsonb);
  v_status   text    := coalesce(p_data ->> 'status', 'draft');
  v_featured boolean := coalesce((p_data ->> 'is_featured')::boolean, false);
  v_old      public.posts;
  v_id       uuid;
  v_action   text;
begin
  perform public.assert_admin();

  if v_title = '' then
    raise exception 'Vui lòng nhập tiêu đề' using errcode = '23514';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 120 then
    raise exception 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang' using errcode = '23514';
  end if;
  if v_status not in ('draft', 'published') then
    raise exception 'Trạng thái bài không hợp lệ' using errcode = '23514';
  end if;
  if jsonb_typeof(v_content) <> 'object' or pg_column_size(v_content) > 1048576 then
    raise exception 'Nội dung bài không hợp lệ hoặc quá dài' using errcode = '23514';
  end if;
  if v_cover is not null and v_cover !~ '^covers/[0-9a-f-]{36}\.(webp|jpg)$' then
    raise exception 'Ảnh bìa không hợp lệ' using errcode = '23514';
  end if;
  if v_status = 'published' and v_excerpt is null then
    raise exception 'Vui lòng nhập mô tả ngắn trước khi đăng bài' using errcode = '23514';
  end if;

  -- ---------------------------------------------------------------- Thêm mới
  if p_id is null then
    insert into public.posts (slug, title, excerpt, cover_path, content, status, is_featured, author_id)
    values (v_slug, v_title, v_excerpt, v_cover, v_content, v_status, v_featured, auth.uid())
    returning id into v_id;

    insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
    values (auth.uid(), case when v_status = 'published' then 'post.publish' else 'post.create' end,
            'post', v_id::text, jsonb_build_object('name', v_title));
    return v_id;
  end if;

  -- ---------------------------------------------------------------- Sửa
  select * into v_old from public.posts p where p.id = p_id for update;
  if not found then
    raise exception 'Không tìm thấy bài viết' using errcode = 'P0002';
  end if;

  update public.posts p
  set slug        = v_slug,
      title       = v_title,
      excerpt     = v_excerpt,
      cover_path  = v_cover,
      content     = v_content,
      status      = v_status,
      is_featured = v_featured
  where p.id = p_id;

  v_action := case
    when v_old.status <> 'published' and v_status = 'published' then 'post.publish'
    when v_old.status = 'published' and v_status <> 'published' then 'post.unpublish'
    else 'post.update'
  end;

  if v_action = 'post.update' and p_autosave and exists (
    select 1 from public.admin_logs l
    where l.target_type = 'post' and l.target_id = p_id::text and l.action = 'post.update'
      and l.admin_id = auth.uid() and l.created_at > now() - interval '10 minutes'
  ) then
    return p_id;
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), v_action, 'post', p_id::text,
          jsonb_build_object('name', v_title)
          || case when v_old.is_featured <> v_featured
               then jsonb_build_object('is_featured', v_featured) else '{}'::jsonb end);
  return p_id;
end;
$$;

revoke execute on function public.admin_save_post from public, anon, authenticated;
grant execute on function public.admin_save_post to authenticated;


-- -----------------------------------------------------------------------------
-- admin_delete_post: xóa hẳn bài viết (Server Action dọn ảnh trong Storage sau đó).
-- -----------------------------------------------------------------------------
create or replace function public.admin_delete_post(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
begin
  perform public.assert_admin();

  delete from public.posts p where p.id = p_id returning p.title into v_title;
  if not found then
    raise exception 'Không tìm thấy bài viết' using errcode = 'P0002';
  end if;

  insert into public.admin_logs (admin_id, action, target_type, target_id, detail)
  values (auth.uid(), 'post.delete', 'post', p_id::text, jsonb_build_object('name', v_title));
end;
$$;

revoke execute on function public.admin_delete_post from public, anon, authenticated;
grant execute on function public.admin_delete_post to authenticated;
