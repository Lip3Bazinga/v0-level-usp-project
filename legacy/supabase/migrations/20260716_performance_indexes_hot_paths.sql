-- Índices para os caminhos quentes com múltiplos usuários (aplicada 2026-07-16):
-- 1. Painel do professor/admin agrega progresso por lição (lesson_id sem user_id)
-- 2. Listagem de lições de curso filtra (course_id, published) e ordena por "order"

create index if not exists lesson_progress_lesson_idx
  on public.lesson_progress (lesson_id, status);

create index if not exists lessons_course_published_order_idx
  on public.lessons (course_id, published, "order");
