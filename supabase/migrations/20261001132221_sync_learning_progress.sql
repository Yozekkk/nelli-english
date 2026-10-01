-- One shared learner. The publishable key is intentionally sufficient for this private,
-- account-free site; RLS limits the API to the canonical profile.
create table public.learner_state (
  profile_key text primary key default 'primary' check (profile_key = 'primary'),
  epoch uuid not null default gen_random_uuid(),
  sequential_mode boolean not null default false,
  streak integer not null default 0 check (streak >= 0),
  last_daily_date date,
  daily_done boolean not null default false,
  total_correct_answers integer not null default 0 check (total_correct_answers >= 0),
  updated_at timestamptz not null default now()
);

create table public.lesson_progress (
  profile_key text not null default 'primary' references public.learner_state(profile_key),
  lesson_id integer not null check (lesson_id between 1 and 20),
  watched boolean not null default false,
  attempts integer not null default 0 check (attempts >= 0),
  last_score integer check (last_score between 0 and 100),
  best_score integer check (best_score between 0 and 100),
  last_answers integer check (last_answers >= 0),
  last_total integer check (last_total > 0),
  updated_at timestamptz not null default now(),
  primary key (profile_key, lesson_id),
  constraint lesson_primary_only check (profile_key = 'primary'),
  constraint answers_valid check (
    (last_answers is null and last_total is null and last_score is null and best_score is null and attempts = 0)
    or (last_answers is not null and last_total is not null and last_score is not null and best_score is not null
      and attempts > 0 and last_answers <= last_total and best_score >= last_score)
  )
);

-- Receipts make retries safe after a network response is lost.
create table public.progress_operations (
  operation_id uuid primary key,
  profile_key text not null default 'primary' check (profile_key = 'primary'),
  created_at timestamptz not null default now()
);

alter table public.learner_state enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.progress_operations enable row level security;

create policy "read primary learner" on public.learner_state for select to anon using (profile_key = 'primary');
create policy "update primary learner" on public.learner_state for update to anon
  using (profile_key = 'primary') with check (profile_key = 'primary');
create policy "read primary lessons" on public.lesson_progress for select to anon using (profile_key = 'primary');
create policy "insert primary lessons" on public.lesson_progress for insert to anon with check (profile_key = 'primary');
create policy "update primary lessons" on public.lesson_progress for update to anon
  using (profile_key = 'primary') with check (profile_key = 'primary');
create policy "read primary receipts" on public.progress_operations for select to anon using (profile_key = 'primary');
create policy "insert primary receipts" on public.progress_operations for insert to anon with check (profile_key = 'primary');

revoke all on public.learner_state, public.lesson_progress, public.progress_operations from public, anon, authenticated;
grant usage on schema public to anon;
grant select, update on public.learner_state to anon;
grant select, insert, update on public.lesson_progress to anon;
grant select, insert on public.progress_operations to anon;

create function public.get_progress_snapshot() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'learner', to_jsonb(s),
    'lessons', coalesce((select jsonb_agg(to_jsonb(l) order by l.lesson_id)
      from public.lesson_progress l where l.profile_key = s.profile_key), '[]'::jsonb)
  )
  from public.learner_state s where s.profile_key = 'primary';
$$;
revoke all on function public.get_progress_snapshot() from public, authenticated;
grant execute on function public.get_progress_snapshot() to anon;

-- All writers lock the learner row. This serializes reset, lesson updates and
-- counter increments across devices. A reset changes epoch, rejecting old tabs.
create function public.apply_progress_operation(
  p_operation_id uuid, p_expected_epoch uuid, p_kind text,
  p_lesson_id integer default null, p_watched boolean default null,
  p_correct integer default null, p_total integer default null,
  p_sequential_mode boolean default null, p_today date default null
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_epoch uuid;
  v_inserted uuid;
  v_score integer;
begin
  select epoch into v_epoch from public.learner_state where profile_key = 'primary' for update;
  if v_epoch is null then raise exception 'Learner state missing'; end if;

  -- A receipt is checked before the epoch, so a successful reset can be retried.
  if exists (select 1 from public.progress_operations where operation_id = p_operation_id) then return; end if;
  if p_expected_epoch is distinct from v_epoch then raise exception 'Progress was reset on another device'; end if;

  if p_kind = 'watched' then
    if p_lesson_id not between 1 and 20 or p_watched is null then raise exception 'Invalid watched operation'; end if;
  elsif p_kind = 'quiz' then
    if p_lesson_id not between 1 and 20 or p_total is null or p_total < 1
       or p_correct is null or p_correct < 0 or p_correct > p_total or p_total > 100 then
      raise exception 'Invalid quiz operation';
    end if;
  elsif p_kind = 'sequential' then
    if p_sequential_mode is null then raise exception 'Invalid sequential operation'; end if;
  elsif p_kind = 'daily' then
    if p_today is null then raise exception 'Invalid daily operation'; end if;
  elsif p_kind <> 'reset' then
    raise exception 'Unknown progress operation';
  end if;

  insert into public.progress_operations(operation_id) values (p_operation_id)
    on conflict do nothing returning operation_id into v_inserted;
  if v_inserted is null then return; end if;

  if p_kind = 'watched' then
    insert into public.lesson_progress(profile_key, lesson_id, watched)
    values ('primary', p_lesson_id, p_watched)
    on conflict (profile_key, lesson_id) do update
      set watched = excluded.watched, updated_at = now();
  elsif p_kind = 'quiz' then
    v_score := round(p_correct * 100.0 / p_total);
    insert into public.lesson_progress(profile_key, lesson_id, attempts, last_score, best_score, last_answers, last_total)
    values ('primary', p_lesson_id, 1, v_score, v_score, p_correct, p_total)
    on conflict (profile_key, lesson_id) do update set
      attempts = public.lesson_progress.attempts + 1,
      last_score = excluded.last_score,
      best_score = greatest(public.lesson_progress.best_score, excluded.best_score),
      last_answers = excluded.last_answers,
      last_total = excluded.last_total,
      updated_at = now();
    update public.learner_state set total_correct_answers = total_correct_answers + p_correct,
      updated_at = now() where profile_key = 'primary';
  elsif p_kind = 'sequential' then
    update public.learner_state set sequential_mode = p_sequential_mode,
      updated_at = now() where profile_key = 'primary';
  elsif p_kind = 'daily' then
    update public.learner_state set
      streak = case when last_daily_date = p_today then streak
        when last_daily_date = p_today - 1 then streak + 1 else 1 end,
      last_daily_date = p_today, daily_done = true, updated_at = now()
    where profile_key = 'primary';
  elsif p_kind = 'reset' then
    update public.learner_state set epoch = gen_random_uuid(), sequential_mode = false,
      streak = 0, last_daily_date = null, daily_done = false,
      total_correct_answers = 0, updated_at = now() where profile_key = 'primary';
    update public.lesson_progress set watched = false, attempts = 0,
      last_score = null, best_score = null, last_answers = null, last_total = null,
      updated_at = now() where profile_key = 'primary';
  end if;
end;
$$;

revoke all on function public.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date) from public, authenticated;
grant execute on function public.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date) to anon;

-- This seed runs exactly once. Reapplying the migration cannot overwrite newer progress.
with created as (
  insert into public.learner_state(profile_key, sequential_mode, streak, total_correct_answers)
  values ('primary', false, 1, 59)
  on conflict (profile_key) do nothing returning profile_key
)
insert into public.lesson_progress(profile_key, lesson_id, watched, attempts, last_score, best_score, last_answers, last_total)
select created.profile_key, seed.lesson_id, seed.watched, seed.attempts,
  seed.score, seed.score, seed.answers, seed.total
from created cross join (values
  (1, true, 1, 78, 7, 9), (2, true, 1, 78, 7, 9),
  (3, true, 1, 89, 8, 9), (4, true, 1, 89, 8, 9),
  (5, true, 1, 100, 9, 9), (6, true, 1, 56, 5, 9),
  (7, false, 0, null, null, null), (8, false, 0, null, null, null),
  (9, false, 0, null, null, null), (10, false, 0, null, null, null),
  (11, false, 0, null, null, null), (12, false, 0, null, null, null),
  (13, false, 0, null, null, null), (14, false, 0, null, null, null),
  (15, false, 0, null, null, null), (16, false, 0, null, null, null),
  (17, false, 0, null, null, null), (18, false, 0, null, null, null),
  (19, false, 0, null, null, null), (20, false, 0, null, null, null)
) as seed(lesson_id, watched, attempts, score, answers, total);
