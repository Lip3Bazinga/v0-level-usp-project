-- Curso novo e independente: "Python Completo: do Básico ao Intermediário"
-- (decisão do projeto: curso separado; Python Básico permanece intacto).
-- Inclui a prova final teórica vinculada e o banco de 30 questões.
-- Aplicadas no banco ao vivo em 2026-07-14 como:
--   create_python_completo_course, python_completo_exam_questions

insert into public.courses (
  id, title, description, long_description, level, tags, estimated_hours,
  published, created_by,
  final_project_title, final_project_description
) values (
  'c0113a00-2026-4714-9000-000000000001',
  'Python Completo: do Básico ao Intermediário',
  'Do zero ao nível intermediário com certificado: fundamentos, POO, exceções, decorators, generators e testes.',
  'Curso completo de Python com certificação. Você começa pelos fundamentos (variáveis, controle de fluxo, funções e estruturas de dados), avança por Programação Orientada a Objetos, tratamento de exceções, arquivos e context managers, programação funcional (comprehensions, lambda, decorators e generators) e termina escrevendo seus próprios testes com unittest — a mesma ferramenta que a plataforma usa para corrigir seus exercícios. A certificação exige: concluir todas as lições, ser aprovado na prova teórica final e passar no projeto prático avaliado automaticamente.',
  'intermediario',
  array['python','certificação','poo','decorators','generators','unittest'],
  40,
  true,
  'd5d85d87-0ee0-4d67-bd7c-8f1a6682f1e5',
  'Projeto Final: Gerenciador de Tarefas',
  'Sistema completo de gestão de tarefas com classes, exceções customizadas e persistência — avaliado por testes unittest ocultos.'
);

insert into public.exams (id, course_id, title, description, passing_score, time_limit_minutes, cooldown_minutes, active)
values (
  'c0113a00-2026-4714-9000-00000000e8a1',
  'c0113a00-2026-4714-9000-000000000001',
  'Prova Final — Python Completo',
  'Prova teórica de múltipla escolha cobrindo todo o curso, do básico ao intermediário. Aprovação com 70% ou mais. Libera o projeto final e, junto dele, o certificado.',
  70, 45, 60, true
);

-- Banco de questões (30). O conteúdo completo (prompt/options/correct_index/
-- explanation) está aplicado no banco ao vivo (migração python_completo_exam_questions)
-- e é inacessível a clientes por RLS deny-all. Para recriar num ambiente limpo,
-- exporte de produção com:
--   select * from exam_questions where exam_id = 'c0113a00-2026-4714-9000-00000000e8a1';
-- (gabarito não deve ser versionado em repositório com acesso amplo)
