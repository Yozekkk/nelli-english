-- Public Data API reads stay behind single-profile RLS. Every write is routed
-- through the validated, atomic operation function in a non-exposed schema.
create schema if not exists private;
revoke all on schema private from public, authenticated;
grant usage on schema private to anon;

revoke update on public.learner_state from anon;
revoke insert, update on public.lesson_progress from anon;
revoke select, insert on public.progress_operations from anon;

alter function public.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date)
  set schema private;
alter function private.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date)
  security definer;
revoke all on function private.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date)
  from public, authenticated;
grant execute on function private.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date)
  to anon;

create function public.apply_progress_operation(
  p_operation_id uuid, p_expected_epoch uuid, p_kind text,
  p_lesson_id integer default null, p_watched boolean default null,
  p_correct integer default null, p_total integer default null,
  p_sequential_mode boolean default null, p_today date default null
) returns void language sql security invoker set search_path = '' as $$
  select private.apply_progress_operation(
    p_operation_id, p_expected_epoch, p_kind, p_lesson_id, p_watched,
    p_correct, p_total, p_sequential_mode, p_today
  );
$$;
revoke all on function public.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date)
  from public, authenticated;
grant execute on function public.apply_progress_operation(uuid, uuid, text, integer, boolean, integer, integer, boolean, date)
  to anon;
