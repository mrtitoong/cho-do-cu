-- =============================================================================
-- 0004_chat.sql
-- Chat 1-1 realtime giữa người mua và người bán (giai đoạn 6).
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Siết quyền cột
--    messages: client chỉ được ghi id (để hiển thị optimistic rồi khớp với realtime),
--    conversation_id và body. sender_id lấy mặc định auth.uid() và policy INSERT
--    vẫn kiểm tra sender_id = auth.uid() → không ai gửi được dưới tên người khác.
--    created_at, read_at không ghi trực tiếp được; read_at chỉ đổi qua mark_conversation_read.
--    Không ai sửa/xóa tin nhắn.
--    conversations: không cho tự ghi last_message_at (trigger lo), không sửa/xóa.
-- -----------------------------------------------------------------------------
revoke insert, update, delete on public.messages from authenticated;
grant insert (id, conversation_id, body) on public.messages to authenticated;

revoke insert, update, delete on public.conversations from authenticated;
grant insert (listing_id, buyer_id, seller_id) on public.conversations to authenticated;

-- Đếm tin chưa đọc nhanh.
create index messages_unread_idx on public.messages (conversation_id, sender_id) where read_at is null;


-- -----------------------------------------------------------------------------
-- 2. Trigger: cập nhật conversations.last_message_at khi có tin nhắn mới
--    (security definer vì conversations không có policy UPDATE).
-- -----------------------------------------------------------------------------
create or replace function public.messages_touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id
    and (last_message_at is null or last_message_at < new.created_at);
  return new;
end;
$$;

revoke execute on function public.messages_touch_conversation from public, anon, authenticated;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.messages_touch_conversation();


-- -----------------------------------------------------------------------------
-- 3. mark_conversation_read: đánh dấu đã đọc mọi tin của NGƯỜI KIA trong cuộc trò chuyện.
--    Chỉ người trong cuộc trò chuyện gọi được; chỉ đổi cột read_at; trả về số tin vừa đánh dấu.
-- -----------------------------------------------------------------------------
create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Bạn cần đăng nhập.' using errcode = '42501';
  end if;

  update public.messages m
  set read_at = now()
  where m.conversation_id = p_conversation_id
    and m.sender_id <> v_uid
    and m.read_at is null
    and exists (
      select 1 from public.conversations c
      where c.id = p_conversation_id
        and v_uid in (c.buyer_id, c.seller_id)
    );

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.mark_conversation_read from public, anon, authenticated;
grant execute on function public.mark_conversation_read to authenticated;


-- -----------------------------------------------------------------------------
-- 4. get_inbox: hộp thư của người đang đăng nhập, mới nhất lên đầu.
--    security invoker → RLS vẫn áp dụng: chỉ thấy cuộc trò chuyện của mình,
--    tin bị ẩn thì người mua không thấy tiêu đề/ảnh (left join trả null).
-- -----------------------------------------------------------------------------
create or replace function public.get_inbox(p_limit integer default 100)
returns table (
  id                 uuid,
  listing_id         uuid,
  listing_title      text,
  listing_status     text,
  listing_cover_path text,
  role               text,        -- 'buying' | 'selling'
  other_id           uuid,
  other_name         text,
  other_avatar_url   text,
  last_body          text,
  last_sender_id     uuid,
  last_at            timestamptz,
  unread_count       integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.listing_id,
    l.title,
    l.status,
    (select i.path from public.listing_images i
      where i.listing_id = c.listing_id
      order by i.sort_order limit 1),
    case when c.buyer_id = auth.uid() then 'buying' else 'selling' end,
    o.id,
    o.full_name,
    o.avatar_url,
    lm.body,
    lm.sender_id,
    coalesce(c.last_message_at, c.created_at),
    (select count(*)::integer from public.messages m
      where m.conversation_id = c.id
        and m.sender_id <> auth.uid()
        and m.read_at is null)
  from public.conversations c
  left join public.listings l on l.id = c.listing_id
  left join public.profiles o
    on o.id = case when c.buyer_id = auth.uid() then c.seller_id else c.buyer_id end
  left join lateral (
    select m.body, m.sender_id from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) lm on true
  where auth.uid() in (c.buyer_id, c.seller_id)
  order by coalesce(c.last_message_at, c.created_at) desc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$$;

revoke execute on function public.get_inbox from public, anon, authenticated;
grant execute on function public.get_inbox to authenticated;


-- -----------------------------------------------------------------------------
-- 5. get_unread_conversation_count: số cuộc trò chuyện có tin chưa đọc (badge "Tin nhắn").
-- -----------------------------------------------------------------------------
create or replace function public.get_unread_conversation_count()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(distinct m.conversation_id)::integer
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where auth.uid() in (c.buyer_id, c.seller_id)
    and m.sender_id <> auth.uid()
    and m.read_at is null;
$$;

revoke execute on function public.get_unread_conversation_count from public, anon, authenticated;
grant execute on function public.get_unread_conversation_count to authenticated;


-- -----------------------------------------------------------------------------
-- 6. Bật Realtime cho bảng messages.
--    Realtime (postgres_changes) kiểm tra RLS SELECT cho từng người nhận, nên người thứ ba
--    không nhận được sự kiện của cuộc trò chuyện khác. Client chỉ nghe INSERT/UPDATE
--    (sự kiện DELETE không qua RLS, nhưng tin nhắn không xóa được).
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;
