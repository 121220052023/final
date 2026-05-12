-- Sync Ocean of Movies web + Flutter apps with the live Supabase schema.
-- Review before running in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- Remove duplicate rows before adding unique sync constraints.
with ranked as (
  select id, row_number() over (
    partition by user_id, movie_id, coalesce(movie_type, 'movie')
    order by added_at desc nulls last, id
  ) as rn
  from public.watchlist
)
delete from public.watchlist w using ranked r
where w.id = r.id and r.rn > 1;

with ranked as (
  select id, row_number() over (
    partition by user_id, movie_id, coalesce(movie_type, 'movie')
    order by liked_at desc nulls last, id
  ) as rn
  from public.liked_movies
)
delete from public.liked_movies l using ranked r
where l.id = r.id and r.rn > 1;

with ranked as (
  select id, row_number() over (
    partition by user_id, movie_id, coalesce(movie_type, 'movie')
    order by watched_at desc nulls last, id
  ) as rn
  from public.watch_history
)
delete from public.watch_history h using ranked r
where h.id = r.id and r.rn > 1;

with ranked as (
  select id, row_number() over (
    partition by review_id, user_id
    order by created_at desc nulls last, id
  ) as rn
  from public.review_likes
)
delete from public.review_likes rl using ranked r
where rl.id = r.id and r.rn > 1;

with ranked as (
  select id, row_number() over (
    partition by family_group_id, user_id
    order by created_at asc nulls last, id
  ) as rn
  from public.family_members
)
delete from public.family_members fm using ranked r
where fm.id = r.id and r.rn > 1;

update public.watchlist set movie_type = 'movie' where movie_type is null;
update public.liked_movies set movie_type = 'movie' where movie_type is null;
update public.watch_history set movie_type = 'movie' where movie_type is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'watchlist_user_id_fkey') then
    alter table public.watchlist
      add constraint watchlist_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'liked_movies_user_id_fkey') then
    alter table public.liked_movies
      add constraint liked_movies_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_user_id_fkey') then
    alter table public.watch_history
      add constraint watch_history_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watchlist_user_movie_unique') then
    alter table public.watchlist
      add constraint watchlist_user_movie_unique unique (user_id, movie_id, movie_type);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'liked_movies_user_movie_unique') then
    alter table public.liked_movies
      add constraint liked_movies_user_movie_unique unique (user_id, movie_id, movie_type);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_user_movie_unique') then
    alter table public.watch_history
      add constraint watch_history_user_movie_unique unique (user_id, movie_id, movie_type);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'review_likes_unique') then
    alter table public.review_likes
      add constraint review_likes_unique unique (review_id, user_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'family_members_unique') then
    alter table public.family_members
      add constraint family_members_unique unique (family_group_id, user_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watchlist_movie_type_check') then
    alter table public.watchlist
      add constraint watchlist_movie_type_check check (movie_type in ('movie', 'tv'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'liked_movies_movie_type_check') then
    alter table public.liked_movies
      add constraint liked_movies_movie_type_check check (movie_type in ('movie', 'tv'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_movie_type_check') then
    alter table public.watch_history
      add constraint watch_history_movie_type_check check (movie_type in ('movie', 'tv'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'watch_history_progress_check') then
    alter table public.watch_history
      add constraint watch_history_progress_check check (progress >= 0 and progress <= 100);
  end if;
end $$;

create or replace function public.is_family_member(group_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_group_id = group_uuid
      and fm.user_id = user_uuid
  );
$$;

create or replace function public.is_family_parent(group_uuid uuid, user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members fm
    where fm.family_group_id = group_uuid
      and fm.user_id = user_uuid
      and fm.role = 'parent'
  );
$$;

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.watchlist enable row level security;
alter table public.liked_movies enable row level security;
alter table public.watch_history enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.family_groups enable row level security;
alter table public.family_members enable row level security;

-- Replace broad or broken policies with app-safe policies.
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
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy user_settings_select_own on public.user_settings for select using (auth.uid() = user_id);
create policy user_settings_insert_own on public.user_settings for insert with check (auth.uid() = user_id);
create policy user_settings_update_own on public.user_settings for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy watchlist_select_own on public.watchlist for select using (auth.uid() = user_id);
create policy watchlist_insert_own on public.watchlist for insert with check (auth.uid() = user_id);
create policy watchlist_update_own on public.watchlist for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy watchlist_delete_own on public.watchlist for delete using (auth.uid() = user_id);

create policy liked_movies_select_own on public.liked_movies for select using (auth.uid() = user_id);
create policy liked_movies_insert_own on public.liked_movies for insert with check (auth.uid() = user_id);
create policy liked_movies_update_own on public.liked_movies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy liked_movies_delete_own on public.liked_movies for delete using (auth.uid() = user_id);

create policy watch_history_select_own on public.watch_history for select using (auth.uid() = user_id);
create policy watch_history_insert_own on public.watch_history for insert with check (auth.uid() = user_id);
create policy watch_history_update_own on public.watch_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy watch_history_delete_own on public.watch_history for delete using (auth.uid() = user_id);

create policy reviews_select_public on public.reviews for select using (true);
create policy reviews_insert_own on public.reviews for insert with check (auth.uid() = user_id);
create policy reviews_update_own on public.reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reviews_delete_own on public.reviews for delete using (auth.uid() = user_id);

create policy review_likes_select_public on public.review_likes for select using (true);
create policy review_likes_insert_own on public.review_likes for insert with check (auth.uid() = user_id);
create policy review_likes_delete_own on public.review_likes for delete using (auth.uid() = user_id);

create policy family_groups_select_member on public.family_groups
  for select using (created_by = auth.uid() or public.is_family_member(id, auth.uid()));
create policy family_groups_insert_creator on public.family_groups
  for insert with check (created_by = auth.uid());
create policy family_groups_update_parent on public.family_groups
  for update using (created_by = auth.uid() or public.is_family_parent(id, auth.uid()))
  with check (created_by = auth.uid() or public.is_family_parent(id, auth.uid()));
create policy family_groups_delete_parent on public.family_groups
  for delete using (created_by = auth.uid() or public.is_family_parent(id, auth.uid()));

create policy family_members_select_member on public.family_members
  for select using (user_id = auth.uid() or public.is_family_member(family_group_id, auth.uid()));
create policy family_members_insert_parent on public.family_members
  for insert with check (
    public.is_family_parent(family_group_id, auth.uid())
    or (
      user_id = auth.uid()
      and role = 'parent'
      and exists (
        select 1 from public.family_groups fg
        where fg.id = family_group_id
          and fg.created_by = auth.uid()
      )
    )
  );
create policy family_members_update_parent on public.family_members
  for update using (public.is_family_parent(family_group_id, auth.uid()))
  with check (public.is_family_parent(family_group_id, auth.uid()));
create policy family_members_delete_self_or_parent on public.family_members
  for delete using (user_id = auth.uid() or public.is_family_parent(family_group_id, auth.uid()));
