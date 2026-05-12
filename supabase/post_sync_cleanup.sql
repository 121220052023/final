-- Post-sync cleanup applied after sync_live_schema.sql.
-- Purpose:
-- - remove duplicate unique constraints created by older schemas
-- - add missing indexes for foreign keys
-- - make review like counts trigger-driven
-- - remove public RPC access to internal helper functions
-- - move family RLS helpers to a non-exposed schema
-- - rewrite RLS policies with Supabase's recommended (select auth.uid()) form

begin;

alter table public.watchlist
  drop constraint if exists watchlist_user_id_movie_id_movie_type_key;
alter table public.liked_movies
  drop constraint if exists liked_movies_user_id_movie_id_movie_type_key;
alter table public.watch_history
  drop constraint if exists watch_history_user_id_movie_id_movie_type_key;

create index if not exists family_groups_created_by_idx
  on public.family_groups(created_by);
create index if not exists family_members_user_id_idx
  on public.family_members(user_id);
create index if not exists review_likes_user_id_idx
  on public.review_likes(user_id);

update public.reviews r
set likes = counts.like_count
from (
  select r2.id, count(rl.id)::integer as like_count
  from public.reviews r2
  left join public.review_likes rl on rl.review_id = r2.id
  group by r2.id
) counts
where counts.id = r.id;

create or replace function public.sync_review_likes_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.reviews
    set likes = coalesce(likes, 0) + 1
    where id = NEW.review_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.reviews
    set likes = greatest(coalesce(likes, 0) - 1, 0)
    where id = OLD.review_id;
    return OLD;
  end if;

  return null;
end;
$$;

drop trigger if exists review_likes_count_insert on public.review_likes;
drop trigger if exists review_likes_count_delete on public.review_likes;

create trigger review_likes_count_insert
after insert on public.review_likes
for each row execute function public.sync_review_likes_count();

create trigger review_likes_count_delete
after delete on public.review_likes
for each row execute function public.sync_review_likes_count();

revoke execute on function public.sync_review_likes_count() from public, anon, authenticated;

create or replace function public.increment_review_likes(review_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reviews
  set likes = coalesce(likes, 0) + 1
  where id = review_id;
$$;

create or replace function public.decrement_review_likes(review_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.reviews
  set likes = greatest(coalesce(likes, 0) - 1, 0)
  where id = review_id;
$$;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$;

revoke execute on function public.increment_review_likes(uuid) from public, anon, authenticated;
revoke execute on function public.decrement_review_likes(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_family_member(group_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_group_id = group_uuid
      and fm.user_id = user_uuid
  );
$$;

create or replace function private.is_family_parent(group_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_group_id = group_uuid
      and fm.user_id = user_uuid
      and fm.role = 'parent'
  );
$$;

grant execute on function private.is_family_member(uuid, uuid) to anon, authenticated;
grant execute on function private.is_family_parent(uuid, uuid) to anon, authenticated;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'user_settings',
        'watchlist',
        'liked_movies',
        'watch_history',
        'reviews',
        'review_likes',
        'family_groups',
        'family_members'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_record.policyname,
      policy_record.schemaname,
      policy_record.tablename
    );
  end loop;
end $$;

create policy profiles_select on public.profiles for select using (true);
create policy profiles_insert_own on public.profiles for insert with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy user_settings_select_own on public.user_settings for select using ((select auth.uid()) = user_id);
create policy user_settings_insert_own on public.user_settings for insert with check ((select auth.uid()) = user_id);
create policy user_settings_update_own on public.user_settings for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy watchlist_select_own on public.watchlist for select using ((select auth.uid()) = user_id);
create policy watchlist_insert_own on public.watchlist for insert with check ((select auth.uid()) = user_id);
create policy watchlist_update_own on public.watchlist for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy watchlist_delete_own on public.watchlist for delete using ((select auth.uid()) = user_id);

create policy liked_movies_select_own on public.liked_movies for select using ((select auth.uid()) = user_id);
create policy liked_movies_insert_own on public.liked_movies for insert with check ((select auth.uid()) = user_id);
create policy liked_movies_update_own on public.liked_movies for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy liked_movies_delete_own on public.liked_movies for delete using ((select auth.uid()) = user_id);

create policy watch_history_select_own on public.watch_history for select using ((select auth.uid()) = user_id);
create policy watch_history_insert_own on public.watch_history for insert with check ((select auth.uid()) = user_id);
create policy watch_history_update_own on public.watch_history for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy watch_history_delete_own on public.watch_history for delete using ((select auth.uid()) = user_id);

create policy reviews_select_public on public.reviews for select using (true);
create policy reviews_insert_own on public.reviews for insert with check ((select auth.uid()) = user_id);
create policy reviews_update_own on public.reviews for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reviews_delete_own on public.reviews for delete using ((select auth.uid()) = user_id);

create policy review_likes_select_public on public.review_likes for select using (true);
create policy review_likes_insert_own on public.review_likes for insert with check ((select auth.uid()) = user_id);
create policy review_likes_delete_own on public.review_likes for delete using ((select auth.uid()) = user_id);

create policy family_groups_select_member on public.family_groups
  for select using (
    created_by = (select auth.uid())
    or private.is_family_member(id, (select auth.uid()))
  );
create policy family_groups_insert_creator on public.family_groups
  for insert with check (created_by = (select auth.uid()));
create policy family_groups_update_parent on public.family_groups
  for update using (
    created_by = (select auth.uid())
    or private.is_family_parent(id, (select auth.uid()))
  ) with check (
    created_by = (select auth.uid())
    or private.is_family_parent(id, (select auth.uid()))
  );
create policy family_groups_delete_parent on public.family_groups
  for delete using (
    created_by = (select auth.uid())
    or private.is_family_parent(id, (select auth.uid()))
  );

create policy family_members_select_member on public.family_members
  for select using (
    user_id = (select auth.uid())
    or private.is_family_member(family_group_id, (select auth.uid()))
  );
create policy family_members_insert_parent on public.family_members
  for insert with check (
    private.is_family_parent(family_group_id, (select auth.uid()))
    or (
      user_id = (select auth.uid())
      and role = 'parent'
      and exists (
        select 1
        from public.family_groups fg
        where fg.id = family_members.family_group_id
          and fg.created_by = (select auth.uid())
      )
    )
  );
create policy family_members_update_parent on public.family_members
  for update using (private.is_family_parent(family_group_id, (select auth.uid())))
  with check (private.is_family_parent(family_group_id, (select auth.uid())));
create policy family_members_delete_self_or_parent on public.family_members
  for delete using (
    user_id = (select auth.uid())
    or private.is_family_parent(family_group_id, (select auth.uid()))
  );

drop function if exists public.is_family_member(uuid, uuid);
drop function if exists public.is_family_parent(uuid, uuid);

commit;
