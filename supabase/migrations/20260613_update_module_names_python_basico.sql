-- Atualiza campo module das lições do curso Python Básico
-- para refletir estrutura pedagógica em 4 módulos.
UPDATE lessons
SET module = CASE
  WHEN "order" BETWEEN 1 AND 5  THEN 'Módulo 1 · Fundamentos'
  WHEN "order" BETWEEN 6 AND 8  THEN 'Módulo 2 · Controle de Fluxo'
  WHEN "order" BETWEEN 9 AND 12 THEN 'Módulo 3 · Estruturas de Dados'
  WHEN "order" = 13             THEN 'Módulo 4 · Projeto Final'
  ELSE module
END
WHERE course_id = (SELECT id FROM courses WHERE title = 'Python Básico' LIMIT 1)
  AND published = true;
