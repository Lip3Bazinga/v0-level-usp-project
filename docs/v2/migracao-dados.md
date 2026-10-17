# Migração dos dados do Supabase

1. No painel do Supabase: *Settings → Database → Connection string* (modo
   *Session*). Guarde a URL com a senha do banco.
2. Com o ambiente de destino no ar (`levelusp.ps1 up -Env prod`):
   ```powershell
   $env:SOURCE_DATABASE_URL = "postgresql://postgres.<projeto>:<senha>@<host>:5432/postgres"
   .\infra\scripts\levelusp.ps1 import -Env prod
   ```
   Para ensaiar sem gravar: `node .../import-supabase.js --dry-run`.
3. O que acontece:
   - usuários mantêm o mesmo `id`, e-mail e senha (hash bcrypt; a API troca por
     argon2id no próximo login);
   - todas as tabelas de domínio são copiadas (perfis, cursos, lições, progresso,
     notas, badges, provas, tentativas, certificados, notificações, auditoria…);
   - `hidden_tests` vira um caso `legacy`; certificados antigos (`LU-…`) continuam
     verificáveis;
   - imagens continuam apontando para o Storage do Supabase até serem copiadas.
4. Converter gabaritos: `python3 packages/db/tools/convert_legacy_tests.py`
   mostra o caminho (o seed do curso Python Completo foi gerado assim) — os
   casos convertidos devem passar no `verify:seed` antes de substituir os legados.
5. Depois de validar: rotacionar as chaves do Supabase e pausar o projeto.
