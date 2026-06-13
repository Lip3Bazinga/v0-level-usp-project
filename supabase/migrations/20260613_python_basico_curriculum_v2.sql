-- Migration: Python Básico — currículo completo v2
-- Date: 2026-06-13
-- Description: Redesign completo com 13 lições (2 teóricas, 11 práticas)
--   - Reordena lições existentes
--   - Atualiza conteúdo pedagógico de todas as 9 lições existentes
--   - Insere 4 novas lições (O que é Programação?, Conversão de Tipos, Operadores, for e range())
--   - Atualiza metadados do curso

-- Step 1: Shift all existing lessons to orders 100+ (free up slots 1-13)
UPDATE lessons SET "order" = "order" + 100
WHERE course_id = '19b1d782-2714-4a38-af91-75ac142ec5b9';

-- Step 2: Update all existing lessons (applied via apply_migration in 3 batches)
-- Batch 1: Olá Mundo (→2), Variáveis (→3), Condicionais (→6)
-- Batch 2: while (→7), Listas (→9), Funções (→10)
-- Batch 3: Strings (→11), Dicionários (→12), Projeto Final (→13)
-- [content updates applied directly via MCP — see migration history]

-- Step 3: Insert 4 new lessons
-- L1 (order 1): O que é Programação? [theory, 20 XP]
-- L4 (order 4): Conversão de Tipos e f-strings [coding, 40 XP]
-- L5 (order 5): Operadores e Expressões [theory, 20 XP]
-- L8 (order 8): Laços com for e range() [coding, 50 XP]
-- [inserts applied directly via MCP — see migration history]

-- Step 4: Update course metadata
UPDATE courses SET
  title = 'Python Básico',
  description = 'Aprenda Python do zero! Curso completo para iniciantes absolutos com 13 aulas, projetos práticos e certificado.',
  long_description = 'Um curso estruturado para quem nunca programou. Você vai aprender desde o primeiro print() até criar um sistema real de notas escolares. Mix de aulas teóricas (para conceitos) e práticas (com verificação automática de código). Ao final, ganhe seu certificado de conclusão de Python Básico.',
  estimated_hours = 8,
  total_xp = 1100,
  level = 'iniciante',
  tags = ARRAY['python', 'programacao', 'iniciante', 'logica', 'algoritmos'],
  updated_at = now()
WHERE id = '19b1d782-2714-4a38-af91-75ac142ec5b9';
