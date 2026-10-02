-- Support the composite foreign key to lesson_progress without a table scan.
create index quiz_attempts_lesson_fk_idx
  on public.quiz_attempts (profile_key, lesson_id);
