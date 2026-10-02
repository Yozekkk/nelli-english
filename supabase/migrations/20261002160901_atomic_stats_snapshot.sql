-- One statement snapshot keeps dashboard totals, lesson rows and history coherent.
-- Invoker rights and existing RLS remain in force; this function only reads data.
create or replace function public.get_stats_snapshot()
returns jsonb
language sql stable security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'learner', (
      select jsonb_build_object(
        'total_correct_answers', ls.total_correct_answers,
        'streak', ls.streak
      )
      from public.learner_state ls
      where ls.profile_key = 'primary'
    ),
    'lessons', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'lesson_id', lp.lesson_id,
            'watched', lp.watched,
            'attempts', lp.attempts,
            'last_score', lp.last_score,
            'best_score', lp.best_score,
            'last_answers', lp.last_answers,
            'last_total', lp.last_total
          ) order by lp.lesson_id
        ),
        '[]'::jsonb
      )
      from public.lesson_progress lp
      where lp.profile_key = 'primary'
    ),
    'attempts', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', qa.id,
            'operation_id', qa.operation_id,
            'lesson_id', qa.lesson_id,
            'correct', qa.correct,
            'total', qa.total,
            'score', qa.score,
            'completed_at', qa.completed_at
          ) order by qa.completed_at desc
        ),
        '[]'::jsonb
      )
      from (
        select *
        from public.quiz_attempts
        where profile_key = 'primary'
        order by completed_at desc
        limit 100
      ) qa
    )
  );
$$;
revoke all on function public.get_stats_snapshot() from public, anon, authenticated;
grant execute on function public.get_stats_snapshot() to anon;
