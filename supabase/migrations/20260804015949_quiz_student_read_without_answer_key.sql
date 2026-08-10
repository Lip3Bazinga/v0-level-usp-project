-- Camada de aluno para o quiz por licao.
-- get_lesson_quiz_questions (existente) devolve correct_index e e restrita a
-- admin/dono da licao — continua sendo a leitura do PROFESSOR.
-- Esta nova funcao e a leitura do ALUNO: mesmo conteudo, SEM o gabarito.
-- Mesmo principio ja usado em exam_questions e hidden_tests.

CREATE OR REPLACE FUNCTION public.get_lesson_quiz_for_student(p_lesson_id uuid)
RETURNS TABLE(id uuid, prompt text, options jsonb, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT q.id, q.prompt, q.options, q.sort_order
  FROM public.lesson_quiz_questions q
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE q.lesson_id = p_lesson_id
    AND l.published = true
  ORDER BY q.sort_order;
$function$;

REVOKE ALL ON FUNCTION public.get_lesson_quiz_for_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_lesson_quiz_for_student(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_quiz_for_student(uuid) TO authenticated, service_role;

-- Contagem de questoes, para a UI decidir se mostra o bloco de quiz sem
-- precisar baixar os enunciados.
CREATE OR REPLACE FUNCTION public.count_lesson_quiz_questions(p_lesson_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT count(*)::integer
  FROM public.lesson_quiz_questions q
  JOIN public.lessons l ON l.id = q.lesson_id
  WHERE q.lesson_id = p_lesson_id AND l.published = true;
$function$;

REVOKE ALL ON FUNCTION public.count_lesson_quiz_questions(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.count_lesson_quiz_questions(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.count_lesson_quiz_questions(uuid) TO authenticated, service_role;
