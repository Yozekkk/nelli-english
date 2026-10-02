-- History starts with future completions. Existing cumulative totals do not
-- identify earlier individual attempts, so this migration intentionally seeds none.
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null unique references public.progress_operations(operation_id),
  profile_key text not null default 'primary' references public.learner_state(profile_key)
    check (profile_key = 'primary'),
  lesson_id integer not null check (lesson_id between 1 and 20),
  correct integer not null check (correct >= 0),
  total integer not null check (total > 0 and total <= 100),
  score integer not null check (score between 0 and 100),
  completed_at timestamptz not null default now(),
  constraint quiz_attempt_answers_valid check (
    correct <= total and score = round(correct * 100.0 / total)
  ),
  foreign key (profile_key, lesson_id)
    references public.lesson_progress(profile_key, lesson_id)
);

create index quiz_attempts_recent_idx
  on public.quiz_attempts (profile_key, completed_at desc);

alter table public.quiz_attempts enable row level security;
create policy "read primary quiz attempts" on public.quiz_attempts
  for select to anon using (profile_key = 'primary');
revoke all on public.quiz_attempts from public, anon, authenticated;
grant select on public.quiz_attempts to anon;

-- Retain the validated private writer and its empty search path. Its existing
-- learner-row lock serializes history, counters, lesson rows and reset.
create or replace function private.apply_progress_operation(
  p_operation_id uuid, p_expected_epoch uuid, p_kind text,
  p_lesson_id integer default null, p_watched boolean default null,
  p_correct integer default null, p_total integer default null,
  p_sequential_mode boolean default null, p_today date default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_epoch uuid;
  v_inserted uuid;
  v_score integer;
begin
  select epoch into v_epoch from public.learner_state
    where profile_key = 'primary' for update;
  if v_epoch is null then raise exception 'Learner state missing'; end if;

  if exists (select 1 from public.progress_operations where operation_id = p_operation_id)
    then return;
  end if;
  if p_expected_epoch is distinct from v_epoch then
    raise exception 'Progress was reset on another device';
  end if;

  if p_kind = 'watched' then
    if p_lesson_id not between 1 and 20 or p_watched is null then
      raise exception 'Invalid watched operation';
    end if;
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
    insert into public.lesson_progress(
      profile_key, lesson_id, attempts, last_score, best_score, last_answers, last_total
    )
    values ('primary', p_lesson_id, 1, v_score, v_score, p_correct, p_total)
    on conflict (profile_key, lesson_id) do update set
      attempts = public.lesson_progress.attempts + 1,
      last_score = excluded.last_score,
      best_score = greatest(public.lesson_progress.best_score, excluded.best_score),
      last_answers = excluded.last_answers,
      last_total = excluded.last_total,
      updated_at = now();
    update public.learner_state set
      total_correct_answers = total_correct_answers + p_correct,
      updated_at = now()
      where profile_key = 'primary';
    insert into public.quiz_attempts(operation_id, profile_key, lesson_id, correct, total, score)
      values (p_operation_id, 'primary', p_lesson_id, p_correct, p_total, v_score);
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
    delete from public.quiz_attempts where profile_key = 'primary';
  end if;
end;
$$;
