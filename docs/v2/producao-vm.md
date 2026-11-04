# Produção numa VM Linux — guia de operação

Este guia leva a produção do notebook (Docker Desktop + Quick Tunnel) para uma VM Linux
(ex.: VM institucional da USP/DCM com Ubuntu LTS). Tudo o que depende de código já está
pronto no repositório; faltam só os itens que o responsável precisa providenciar (seção 2).
Quando eles existirem, o lançamento é a lista da seção 5.

O fluxo do notebook (`infra/scripts/levelusp.ps1` / `levelusp.sh`) continua igual e serve
para homologação. A VM usa arquivos próprios:

| Arquivo | Papel |
|---|---|
| `infra/compose/compose.vm.yml` | Sobreposição do `compose.yml`: limites de CPU/memória, healthchecks, logs, entrada pública (túnel nomeado ou Caddy) |
| `infra/env/vm.env.example` | Modelo com **todas** as variáveis, comentadas. O real (`infra/env/vm.env`) nunca é versionado |
| `infra/caddy/Caddyfile` | Proxy reverso com HTTPS automático (opção b) |
| `infra/scripts/levelusp-vm.sh` | `setup`, `check`, `deploy`, `rollback`, `status`, `logs`, `backup`, `restore`, `restore-test`, `health-check`, `mail-test`, `install-cron`… |
| `infra/scripts/backup.sh` | Backup (pg_dump + uploads), criptografia, rotação, cópia externa, restauração e teste de restauração |

## 1. Arquitetura

```mermaid
flowchart LR
  aluno[Navegador] -- HTTPS --> borda
  subgraph borda[Entrada pública: uma das duas]
    CF[Cloudflare<br/>túnel nomeado] -.saída 7844.-> CFD[cloudflared]
    CADDY[caddy :80/:443<br/>Let's Encrypt]
  end
  subgraph VM["VM Linux (Docker Compose, projeto levelusp-prod)"]
    CFD --> WEB
    CADDY --> WEB
    WEB[web<br/>Next.js] -- /api/* --> API[api<br/>NestJS]
    API --> RUN[runner<br/>WASI, sem rede]
    API --> DB[(postgres 17)]
    MIG[migrate<br/>roda e sai] --> DB
    CRON[cron do host<br/>health-check · backup · teste de restauração] -.docker compose exec.-> DB
  end
  CRON -. cifrado, opcional .-> FORA[(cópia externa<br/>rclone/scp)]
  MON[Monitor externo] -- GET /api/health/ready --> borda
```

- **Redes**: `data` (postgres, api, migrate) e `runner` (api, runner) são `internal: true`, sem
  rota para a internet; só `web`, `api` (SMTP) e a entrada pública ficam na rede `app`.
- **Portas na VM**: com o túnel, **nenhuma** porta aberta (o `cloudflared` só faz conexões de
  saída). Com o Caddy, 80 e 443. O front escuta também em `127.0.0.1:3000` (health-check local e
  depuração por túnel SSH), nunca em `0.0.0.0`.
- **Endurecimento** (herdado e mantido): imagens não-root, `read_only`, `cap_drop: ALL`,
  `no-new-privileges`, `pids_limit`; o postgres recebe só as capacidades que o entrypoint
  oficial usa (CHOWN, DAC_OVERRIDE, FOWNER, SETUID, SETGID).
- **Origem pública única** (`PUBLIC_BASE_URL`): a API usa nos links de e-mail (redefinição de
  senha, convite) e no PDF do certificado (texto e link clicável de verificação); o front usa
  nos metadados Open Graph. O SSR do front chama a API por `API_INTERNAL_URL=http://api:4000`
  em tempo de execução (correção do UX-02). As duas aplicações validam isso na partida e
  **recusam subir** em produção com URL ausente, `http://` ou `localhost`.
- **Imagens**: vêm do GHCR, publicadas pelo CD com as tags `prod` (última aprovada em `main`) e
  `sha-<7 caracteres do commit>`. A VM fixa a tag em `IMAGE_TAG`; `deploy`/`rollback` a trocam.

## 2. O que o responsável precisa providenciar

| Item | Detalhe | Onde entra |
|---|---|---|
| **VM** | Ubuntu Server 24.04 LTS (ou 22.04), x86_64, **2 vCPU / 4 GB** (mínimo) ou 4 vCPU / 8 GB (turmas de 40+ verificando ao mesmo tempo), 40 GB de disco + espaço para backups (estimativa: 15 × tamanho do dump). Acesso SSH por chave e `sudo`. | Seção 3 |
| **Entrada pública** (uma) | (a) **Túnel nomeado da Cloudflare**: conta gratuita + domínio na Cloudflare (ou subdomínio delegado) e o **token do túnel**. A VM precisa de saída para a Cloudflare na porta 7844 (TCP e UDP). (b) **Domínio próprio com Caddy**: registro DNS `A`/`AAAA` apontando para o IP público da VM e portas 80/443 liberadas até ela (pedir à STI). | `INGRESS`, `CLOUDFLARE_TUNNEL_TOKEN` ou `PUBLIC_DOMAIN` + `ACME_EMAIL` |
| **Domínio/URL** | O endereço final, ex.: `https://levelusp.exemplo.usp.br`. | `PUBLIC_BASE_URL` |
| **SMTP** | Host, porta (587 STARTTLS ou 465 TLS), usuário, senha e o remetente autorizado (com SPF/DKIM no domínio do remetente). Ver seção 9. | `SMTP_URL`, `MAIL_FROM` |
| **Acesso ao GHCR** | Pacotes `levelusp/api`, `levelusp/runner` e `levelusp/web` **públicos**, ou um token GitHub (classic) só com `read:packages` para `docker login ghcr.io` na VM. Confirme que o CD está publicando: `docker manifest inspect ghcr.io/lip3bazinga/levelusp/api:prod`. | Seção 3.6 |
| **Guarda da chave de backup** | Quem guarda a chave privada `age` (ou a senha `gpg`) **fora da VM** (cofre de senhas da equipe + cópia impressa com o orientador). Sem ela, backups cifrados são irrecuperáveis. | Seção 7.2 |
| Cópia externa (opcional) | Um destino para `rclone` (Google Drive institucional, S3, outro servidor SFTP) ou `scp`. | `BACKUP_RCLONE_REMOTE` / `BACKUP_OFFSITE_HOOK` |
| Monitor externo (opcional) | Conta gratuita num serviço de uptime (UptimeRobot, Better Stack, Healthchecks.io…) e, se quiser alertas no celular, um tópico ntfy. | Seção 8 |
| E-mail do admin | Conta de administrador inicial da plataforma. | `SEED_ADMIN_EMAIL` |

## 3. Preparar a VM (uma vez)

Faça logado por SSH com um usuário com `sudo` (exemplo: `deploy`). Mantenha **uma segunda sessão
SSH aberta** enquanto mexe no SSH e no firewall, para não se trancar fora.

### 3.1 Sistema e fuso

```bash
sudo apt update && sudo apt full-upgrade -y
sudo timedatectl set-timezone America/Sao_Paulo      # horários do cron em hora local
sudo apt install -y git curl ca-certificates age ufw fail2ban unattended-upgrades
```

### 3.2 SSH só com chave

```bash
# Na SUA máquina: ssh-copy-id deploy@<ip-da-vm>   (teste o login por chave antes de seguir)
sudo tee /etc/ssh/sshd_config.d/99-levelusp.conf > /dev/null << 'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers deploy
EOF
sudo sshd -t && sudo systemctl reload ssh
```

Teste numa **nova** janela: `ssh deploy@<ip>` deve entrar; `ssh -o PubkeyAuthentication=no deploy@<ip>`
deve ser recusado.

### 3.3 Firewall (ufw) e fail2ban

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw limit OpenSSH                  # 22/tcp com limite de tentativas
# Só se INGRESS=caddy:
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
sudo ufw enable && sudo ufw status verbose

sudo tee /etc/fail2ban/jail.d/sshd.local > /dev/null << 'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
bantime = 1h
EOF
sudo systemctl enable --now fail2ban && sudo fail2ban-client status sshd
```

> Atenção: portas **publicadas pelo Docker** passam por fora do ufw (regras próprias no iptables).
> Por isso o compose só publica `127.0.0.1:3000` (local) e, com Caddy, 80/443 — nunca adicione
> `ports:` em `0.0.0.0` para banco, API ou executor.

Em VM institucional, peça também à STI: firewall de borda equivalente (só 22 de redes confiáveis;
80/443 se Caddy) e liberação de **saída** para a Cloudflare na porta 7844 (se túnel).

### 3.4 Atualizações automáticas de segurança

```bash
sudo dpkg-reconfigure -plow unattended-upgrades      # responda "Sim"
sudo tee /etc/apt/apt.conf.d/52levelusp-reboot > /dev/null << 'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF
```

Reinícios são seguros: o Docker sobe com o sistema e os serviços têm `restart: unless-stopped`.
Evite o horário de aula; ajuste `04:30` se houver atividade de madrugada.

### 3.5 Docker Engine

Instale pelo repositório oficial (docs.docker.com → *Install Docker Engine on Ubuntu*), com os
pacotes `docker-ce docker-ce-cli containerd.io docker-compose-plugin`. Depois:

```bash
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true
}
EOF
sudo systemctl enable --now docker && sudo systemctl restart docker
docker compose version          # precisa ser v2.24+ (usa a tag YAML !override)
```

Não coloque o usuário no grupo `docker` (equivale a root); rode os scripts com `sudo`.

### 3.6 Código e acesso às imagens

```bash
sudo git clone https://github.com/<dono>/<repositorio>.git /opt/levelusp
cd /opt/levelusp && sudo git checkout main
# Só se os pacotes do GHCR forem privados (token com read:packages):
echo '<TOKEN>' | sudo docker login ghcr.io -u <usuario-github> --password-stdin
```

A VM só precisa do repositório para os arquivos de `infra/`; o código roda das imagens. Para
atualizar os scripts: `sudo git -C /opt/levelusp pull`.

## 4. Configurar (`infra/env/vm.env`)

```bash
cd /opt/levelusp
sudo infra/scripts/levelusp-vm.sh setup     # copia o modelo, gera senhas, chmod 600
sudo nano infra/env/vm.env                  # preencha os campos __preencher__
sudo infra/scripts/levelusp-vm.sh check     # valida variáveis, compose e entrada
```

Campos obrigatórios: `PUBLIC_BASE_URL`, `MAIL_FROM`, `SEED_ADMIN_EMAIL`, `INGRESS` e, conforme a
entrada, `CLOUDFLARE_TUNNEL_TOKEN` **ou** `PUBLIC_DOMAIN` + `ACME_EMAIL`. Todas as demais têm
padrão comentado no arquivo. O `vm.env` tem senhas: mantenha `chmod 600` e dono root.

### 4.1 Opção (a) — túnel nomeado da Cloudflare (recomendado em rede institucional)

1. Cloudflare → *Zero Trust* → *Networks* → *Tunnels* → *Create a tunnel* → tipo **Cloudflared**,
   nome `levelusp-prod`.
2. Em *Install connector*, copie só o **token** (a sequência longa depois de `--token`) para
   `CLOUDFLARE_TUNNEL_TOKEN`. Não rode o comando de instalação sugerido: o conector roda no compose.
3. *Public Hostname*: subdomínio/domínio = o host de `PUBLIC_BASE_URL`; *Service* = `HTTP` →
   `web:3000`.
4. `INGRESS=cloudflare`. Em *SSL/TLS* do domínio, modo **Full** e *Always Use HTTPS* ligado.

O endereço não muda ao reiniciar (diferente do Quick Tunnel). Se a VM não tiver saída na 7844/UDP,
o `cloudflared` cai para HTTP/2 em TCP sozinho; se nem TCP 7844 sair, use a opção (b).

### 4.2 Opção (b) — Caddy com HTTPS automático

1. DNS: registro `A` (e `AAAA`, se houver IPv6) de `PUBLIC_DOMAIN` para o IP público da VM.
2. Portas 80 e 443 abertas até a VM (ufw da seção 3.3 + firewall da instituição).
3. `INGRESS=caddy`, `PUBLIC_DOMAIN=levelusp.exemplo.usp.br`,
   `PUBLIC_BASE_URL=https://levelusp.exemplo.usp.br`, `ACME_EMAIL=<e-mail da equipe>`.

O Caddy emite e renova o certificado sozinho (volume `caddy_data`) e envia HSTS de 1 ano.
`levelusp-vm.sh check` confere se `PUBLIC_BASE_URL` bate com `PUBLIC_DOMAIN`.

### 4.3 Dimensionamento

Os padrões do `vm.env` são para **2 vCPU / 4 GB**. Os limites são tetos (a soma passa da VM de
propósito; nem todos atingem o pico juntos). Para **4 vCPU / 8 GB**:

| Variável | 2 vCPU / 4 GB | 4 vCPU / 8 GB |
|---|---|---|
| `POSTGRES_CPUS` / `POSTGRES_MEMORY` | 1.0 / 1g | 2.0 / 2g |
| `PG_SHARED_BUFFERS` / `PG_EFFECTIVE_CACHE_SIZE` | 256MB / 768MB | 512MB / 1536MB |
| `API_CPUS` / `API_MEMORY` / `API_HEAP_MB` | 1.0 / 768m / 512 | 2.0 / 1g / 768 |
| `WEB_CPUS` / `WEB_MEMORY` / `WEB_HEAP_MB` | 1.0 / 512m / 384 | 1.5 / 768m / 512 |
| `RUNNER_CPUS` / `RUNNER_MEMORY` / `RUNNER_CONCURRENCY` | 1.5 / 1g / 2 | 3.0 / 2g / 4 |
| `RUNNER_MAX_QUEUE_WAIT_MS` / `WEB_KEEP_ALIVE_TIMEOUT_MS` | 20000 / 125000 | 20000 / 125000 |
| `DATABASE_POOL_MAX` | 10 | 20 |

`cpus` não pode passar do número de núcleos da VM (o Docker recusa o contêiner). Cada execução
do executor usa até 128 MB: mantenha `RUNNER_CONCURRENCY × 128 MB` abaixo de `RUNNER_MEMORY`.
`RUNNER_CONCURRENCY` = número de vCPUs da VM.

Capacidade medida com os tetos da coluna de 2 vCPU ([desempenho-e-carga.md](./desempenho-e-carga.md)):
uma turma de **40 alunos clicando em Verificar em 10 s** é corrigida com p95 de 0,7 s; 80, com
p95 de 3 s; nenhum 503. A fila do executor só responde "ocupado, tente em N s" quando a espera
estimada passa de `RUNNER_MAX_QUEUE_WAIT_MS` (lições com `unittest` em rajada de 40+). Para
turmas maiores verificando juntas, ou `unittest` em turma, use 4 vCPU. Com o túnel, crie na
Cloudflare uma regra de cache para `/pyodide/*` (os arquivos são versionados e imutáveis): sem
ela, a web gasta ~0,45 s de CPU comprimindo o Pyodide para cada aluno novo.

## 5. Primeiro deploy (checklist)

```bash
cd /opt/levelusp
sudo infra/scripts/levelusp-vm.sh check
sudo infra/scripts/levelusp-vm.sh deploy            # baixa imagens, migra, sobe e espera ficar saudável
sudo infra/scripts/levelusp-vm.sh seed              # admin inicial (SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD do vm.env)
sudo infra/scripts/levelusp-vm.sh import            # dados do Supabase (ver migracao-dados.md)
sudo infra/scripts/levelusp-vm.sh mail-test voce@exemplo.com
sudo infra/scripts/levelusp-vm.sh backup manual pos-importacao
sudo infra/scripts/levelusp-vm.sh restore-test      # prova que o backup restaura
sudo infra/scripts/levelusp-vm.sh install-cron      # health-check, backup diário, teste semanal
sudo infra/scripts/levelusp-vm.sh status
```

Depois, valide no ar (roteiros R1–R3 de `docs/qa/relatorio-ux.md`, seção 6):

- [ ] `https://<domínio>/api/health/ready` responde `"status":"ok"` com `db` e `runner` `true`.
- [ ] Cadeado e HSTS no navegador; cookie `lvl_session` com `Secure`, `HttpOnly`, `SameSite=Lax`
      (DevTools → Application → Cookies); Console sem erros de CSP.
- [ ] Emitir um certificado com uma conta de teste e abrir `https://<domínio>/certificado/<código>`
      numa janela anônima: "Certificado autêntico". No PDF, o link "Verifique a autenticidade em …"
      aponta para o domínio público e abre ao clicar.
- [ ] "Esqueci minha senha" para Gmail, Outlook e e-mail USP: chega em minutos, fora do spam, link
      com o domínio público em HTTPS, uso único. Cabeçalhos com `spf=pass`, `dkim=pass`.
- [ ] Trocar a senha do admin inicial pela tela de configurações e apagar `SEED_ADMIN_PASSWORD`
      do `vm.env`.
- [ ] Monitor externo configurado (seção 8) e alerta testado (pare o `web` por 10 min).

## 6. Atualizar e voltar versão

O CD publica `:prod` e `:sha-<commit>` depois do CI verde e da aprovação no environment
`production`. Na VM a atualização é **deliberada** (sem atualização automática em produção):

```bash
sudo git -C /opt/levelusp pull                       # scripts/compose atualizados
sudo infra/scripts/levelusp-vm.sh deploy             # tag atual do vm.env (normalmente "prod")
sudo infra/scripts/levelusp-vm.sh deploy sha-3666998 # fixa uma versão exata
sudo infra/scripts/levelusp-vm.sh rollback 3666998   # volta para sha-3666998
```

O `deploy`:
1. valida a configuração (`check`);
2. faz um **backup pré-deploy** (`manual/<data>-pre-<tag>`) se o banco já tiver dados;
3. grava a tag em `IMAGE_TAG`, baixa as imagens (se a tag não existir, volta a anterior e para);
4. sobe tudo; o serviço `migrate` aplica as migrações antes da API;
5. espera `/api/health/ready` ficar `ok` (até 5 min) e registra em `infra/env/.state/deploy-history.log`.

**Migrações e rollback.** Migrações só avançam. Se a versão nova trouxe migração e o código
antigo não entende o banco novo, o rollback precisa também do banco anterior:

```bash
sudo infra/scripts/levelusp-vm.sh rollback <sha-antigo>
sudo infra/scripts/levelusp-vm.sh restore /var/backups/levelusp/manual/<data>-pre-sha-<novo>
```

(perde o que foi gravado entre o deploy e o rollback — por isso o deploy deve ser feito fora do
horário de aula). Para saber se houve migração: `git diff <sha-antigo> <sha-novo> -- packages/db/migrations`.

Logs e diagnóstico: `levelusp-vm.sh logs api` (ou `web`, `runner`, `postgres`, `migrate`,
`cloudflared`, `caddy`), `levelusp-vm.sh status` (versão em execução por serviço, saúde local e
pública, último backup, último teste de restauração).

## 7. Backups (LGPD)

### 7.1 O que é salvo

| Item | Como | Onde |
|---|---|---|
| Banco | `pg_dump --format=custom` dentro do contêiner `postgres`, verificado com `pg_restore --list` | `$BACKUP_DIR/<tipo>/<data>/db.dump[.age\|.gpg]` |
| Imagens enviadas | `tar.gz` do volume `uploads` (contêiner temporário da imagem da API) | `…/uploads.tar.gz[.age\|.gpg]` |
| Manifesto | data, tag da imagem, criptografia, nº de tabelas e migrações, contagem de linhas das tabelas principais e de arquivos | `…/manifest.txt` (sem dados pessoais) |
| Integridade | SHA-256 de cada arquivo | `…/SHA256SUMS` |

Rotação (`vm.env`): **7 diários**, **4 semanais** (cópia do diário de domingo) e **10 manuais**
(inclui os pré-deploy). A pasta é `chmod 700` e os arquivos `600`.

Agenda instalada por `install-cron` (`/etc/cron.d/levelusp`, hora local da VM):

| Quando | O quê | Log |
|---|---|---|
| a cada 5 min | `levelusp-vm.sh health-check` | `/var/log/levelusp/health.log` |
| 03:17 diário | `backup.sh run daily` | `/var/log/levelusp/backup.log` |
| 04:41 domingo | `backup.sh verify` (teste de restauração) | `/var/log/levelusp/verify.log` e `$BACKUP_DIR/restore-test.log` |

`/etc/logrotate.d/levelusp` mantém 8 semanas desses logs.

### 7.2 Criptografia em repouso

Recomendado: **age** com chave pública na VM.

```bash
# Numa máquina de confiança (não na VM):
age-keygen -o levelusp-backup.agekey        # imprime a chave pública "age1…"
# Guarde levelusp-backup.agekey no cofre da equipe + cópia impressa com o orientador.
```

No `vm.env`: `BACKUP_ENCRYPTION=age` e `BACKUP_AGE_RECIPIENT=age1…`. Para o **teste automático
de restauração** a VM também precisa decifrar: copie a chave privada para
`/etc/levelusp/backup.agekey` (`sudo install -m 600 -o root …`) e defina
`BACKUP_AGE_IDENTITY_FILE=/etc/levelusp/backup.agekey`. Isso reduz a proteção do disco local (quem
tem root na VM já lê o banco de qualquer jeito), mas mantém as **cópias externas** ilegíveis para o
provedor de armazenamento — que é o risco principal. Alternativa: `BACKUP_ENCRYPTION=gpg` com
`BACKUP_GPG_PASSPHRASE_FILE=/etc/levelusp/backup.pass` (senha forte, cópia fora da VM).

Sem a chave/senha, nenhum backup cifrado pode ser restaurado. Teste a cópia guardada fora da VM
uma vez por semestre (restaurar numa máquina qualquer com `BACKUP_AGE_IDENTITY_FILE` apontando
para ela).

### 7.3 Cópia fora da VM (desligada por padrão)

Só é aceita com criptografia ligada (`BACKUP_OFFSITE_ALLOW_PLAINTEXT=false` por padrão).

- **rclone**: `sudo apt install rclone && sudo rclone config` (crie o remoto, ex. `usp-drive`),
  depois `BACKUP_RCLONE_REMOTE=usp-drive:levelusp-backups` e `BACKUP_RCLONE_MAX_AGE=35d` (apaga do
  remoto o que tiver mais de 35 dias).
- **gancho próprio** (`scp`/`rsync` para outro servidor): `BACKUP_OFFSITE_HOOK=/etc/levelusp/offsite.sh`,
  executável, recebe `<pasta-do-backup> <tipo>/<nome>`. Exemplo:

  ```bash
  #!/usr/bin/env bash
  set -euo pipefail
  rsync -a -e "ssh -i /etc/levelusp/offsite_ed25519" "$1/" "backup@outro-servidor:/srv/levelusp/$2/"
  ```

Prefira armazenamento institucional (dados de pesquisa com alunos não devem ir para conta pessoal).

### 7.4 Restauração

```bash
sudo infra/scripts/levelusp-vm.sh backup manual antes-de-restaurar   # sempre, se o banco atual ainda importa
sudo infra/scripts/backup.sh list
sudo infra/scripts/levelusp-vm.sh restore /var/backups/levelusp/daily/20261103T061700Z
```

A restauração confere os SHA-256, para `api` e `web`, restaura num banco temporário, compara com o
manifesto, **troca os nomes** (o banco atual vira `levelusp_antes_<data>`, nada é apagado),
restaura os uploads (sobre os existentes; `--no-uploads` para pular) e sobe tudo. Confira o
sistema e então apague o banco antigo, que também tem dados pessoais:

```bash
sudo infra/scripts/levelusp-vm.sh psql -c 'DROP DATABASE "levelusp_antes_20261103101500"'
```

Restaurar para inspeção sem tocar em produção: `restore <dir> --target-db levelusp_inspecao`
(apague depois).

### 7.5 Exercícios de restauração

| Frequência | Exercício | Resultado esperado |
|---|---|---|
| Semanal (automático) | `backup.sh verify`: restaura o backup mais recente em `levelusp_restore_test`, compara tabelas, migrações e contagens com o manifesto, lista os uploads e apaga o banco de teste | `OK` em `$BACKUP_DIR/restore-test.log`; falha gera alerta |
| Mensal (manual, 15 min) | `restore <dir> --target-db levelusp_drill`, entrar no `psql` e conferir dados recentes (`select max(created_at) from submissions`); apagar o banco | Dados do dia anterior presentes |
| Semestral | Recuperação de desastre numa VM nova (ou local): seções 3–4, `deploy`, `restore <dir>` a partir da cópia externa, com a chave guardada fora da VM | Sistema no ar com os dados; tempo anotado |

Registre a data e o resultado de cada exercício (o comitê de ética pode pedir evidência).

## 8. Monitoramento

- **Monitor externo** (de fora da VM; pega queda da VM, do túnel e do DNS): crie um monitor HTTP
  em um serviço de uptime (UptimeRobot, Better Stack, Freshping…) para
  `https://<domínio>/api/health/ready`, a cada 5 min, do tipo *keyword* procurando `"status":"ok"`.
  Com o túnel, ative também o alerta de saúde do túnel nas *Notifications* da Cloudflare.
- **Health-check local** (cron a cada 5 min): grava `local=ok publico=ok` em
  `/var/log/levelusp/health.log`; depois de `HEALTHCHECK_FAILURES_BEFORE_ALERT` falhas seguidas,
  manda alerta para `ALERT_WEBHOOK_URL` (texto puro; ex. `https://ntfy.sh/<tópico-secreto>`) e
  avisa quando voltar.
- **"Dead man's switch"** (opcional, ex. Healthchecks.io): `HEALTHCHECK_PING_URL`,
  `BACKUP_PING_URL` (período 1 dia) e `RESTORE_TEST_PING_URL` (período 7 dias). Se o cron parar
  de rodar, o serviço avisa.
- **Disco**: `status` mostra o espaço livre da pasta de backups. Com menos de 20% livre, reduza
  `BACKUP_KEEP_*` ou aumente o disco.

## 9. E-mail (SMTP)

Formato: `SMTP_URL=smtp://usuario:senha@host:587` (STARTTLS, recomendado) ou
`smtps://usuario:senha@host:465` (TLS desde o início). Caracteres especiais no usuário/senha vão
com percent-encoding (`@`→`%40`, `:`→`%3A`, `/`→`%2F`, `#`→`%23`).

Comportamento da API:
- `SMTP_REQUIRE_TLS=true` (padrão em homolog/prod): em `smtp://`, recusa enviar se o servidor não
  oferecer STARTTLS; certificados inválidos são recusados.
- Tempo-limite de `SMTP_TIMEOUT_MS` (15 s) por etapa e até `MAIL_MAX_ATTEMPTS` (3) tentativas com
  espera exponencial, só para falhas temporárias (rede, respostas 4xx). Credencial errada e 5xx
  falham na hora.
- Falha de SMTP nunca vira detalhe na resposta HTTP: "esqueci minha senha" responde igual
  (envio fora da requisição); o convite do admin responde 503 com mensagem genérica em pt-BR
  ("a conta foi criada… peça para usar Esqueci minha senha"). O detalhe fica no log da API.
- Na partida, a API testa a conexão e registra `SMTP conectado e autenticado` (ou o erro) no log.
- Teste manual: `levelusp-vm.sh mail-test destino@exemplo.com` (dentro do contêiner) ou, em dev,
  `pnpm --filter @levelusp/api mail:test destino@exemplo.com` (lê `apps/api/.env`).

Provedores possíveis (gratuitos ou baratos; confira limites e termos atuais antes de escolher):

| Provedor | Forma da configuração |
|---|---|
| SMTP institucional da USP (pedir à STI uma conta de serviço/relay) | `smtp://conta:senha@<host-informado>:587`, `MAIL_FROM=LevelUSP <nao-responda@…usp.br>` |
| Google Workspace / Gmail (senha de app, exige 2FA; limite diário baixo) | `smtp://conta%40dominio:<senha-de-app>@smtp.gmail.com:587` |
| Brevo (ex-Sendinblue) | `smtp://<login-smtp>:<chave-smtp>@smtp-relay.brevo.com:587` |
| Amazon SES (pago por uso, centavos) | `smtp://<usuario-smtp>:<senha-smtp>@email-smtp.sa-east-1.amazonaws.com:587` |
| Resend | `smtps://resend:<api-key>@smtp.resend.com:465` |
| Mailgun / Postmark / SMTP2GO | `smtp://<usuario>:<senha>@<host-do-provedor>:587` |

Em todos: verifique o domínio do remetente no provedor e publique **SPF**, **DKIM** e **DMARC**
(`p=none` no começo) no DNS — sem isso, Gmail e Outlook mandam para o spam. Microsoft 365 com
autenticação básica de SMTP está sendo desativado; prefira outro provedor.

## 10. Proteção de dados (LGPD) e fim do estudo

### 10.1 Onde há dados pessoais

| Local | Dados | Retenção |
|---|---|---|
| Banco `levelusp` (volume `pgdata`) | nome, e-mail, username, avatar, progresso, submissões de código, notas, provas, certificados (nome), sessões (IP, navegador), `audit_log` (e-mails em ações de admin), pedidos de professor | Durante o estudo; eliminação ao final (10.3) |
| Volume `uploads` | avatares e capas | Idem |
| Backups locais (`$BACKUP_DIR`) | cópia de tudo acima | Rotação: ≤ 7 dias (diários), ≤ 4 semanas (semanais), 10 manuais |
| Cópia externa | idem, cifrada | `BACKUP_RCLONE_MAX_AGE` (ex. 35 dias) ou política do destino |
| Logs dos contêineres | IPs (Caddy), e-mails nos avisos da API quando SMTP falha ou não está configurado | Rotação do Docker: ≤ 50 MB por contêiner |
| `/var/log/levelusp` | só estados (ok/falha), caminhos de backup | 8 semanas |
| Bancos `levelusp_antes_*` (após restauração) | cópia completa | Apagar assim que a restauração for validada |
| Notebook (homolog/prod antigo) | `infra/compose/backups/*` e volumes Docker | Apagar após o corte para a VM |
| Supabase/Vercel antigos | dados da versão anterior | Apagar após a importação (seção 11) |

Princípios: só a equipe do projeto tem acesso SSH; ninguém copia dumps para máquinas pessoais;
exportações para análise saem **pseudonimizadas** (10.3, passo 3).

### 10.2 Direitos dos titulares durante o estudo

A própria plataforma oferece exportação dos dados e exclusão da conta (Configurações). A exclusão
apaga do banco imediatamente; das cópias de backup, o dado some quando o backup sai da rotação
(no máximo 4 semanas + a retenção externa). Informe esse prazo no termo de consentimento.

### 10.3 Procedimento de eliminação ao final do estudo

O protocolo de pesquisa prevê: "dados identificáveis serão eliminados ao final". Execute na
data definida pelo protocolo, com duas pessoas (quem executa e quem confere), e registre em ata.

1. **Avisar** os participantes com antecedência (e-mail/aviso na plataforma) com a data e a
   orientação para baixarem certificados e exportarem seus dados.
2. **Congelar**: `SIGNUP_ENABLED=false` no `vm.env` e `levelusp-vm.sh deploy`.
3. **Extrair o conjunto de dados da pesquisa, sem identificação** (se o protocolo prevê análise
   posterior). Exemplo, com um sal aleatório que é descartado em seguida (impede religar os dados
   às pessoas):

   ```bash
   SAL="$(openssl rand -hex 32)"
   sudo infra/scripts/levelusp-vm.sh psql -At -c "copy (
     select encode(sha256((p.user_id::text || '$SAL')::bytea), 'hex') as participante,
            p.lesson_id as licao, p.status, p.score, p.completed_at::date as dia
       from lesson_progress p
   ) to stdout with csv header" > /root/levelusp-pesquisa.csv
   unset SAL
   ```

   Ajuste as colunas ao que o protocolo autoriza (sem nome, e-mail, username, IP, texto livre e
   código-fonte que possa conter nome). Revise o CSV antes de guardar no repositório de dados da
   pesquisa. Datas exatas e combinações raras também podem identificar: agregue quando possível.
4. **Certificados**: a verificação pública mostra o nome do aluno. Ao eliminar o banco, os links de
   verificação dos PDFs deixam de funcionar (o PDF continua válido como documento). Registre essa
   consequência no termo de consentimento/ata.
5. **Desligar e apagar a aplicação e os volumes**:

   ```bash
   sudo infra/scripts/levelusp-vm.sh down
   sudo docker volume rm levelusp-prod_pgdata levelusp-prod_uploads
   sudo docker volume ls | grep levelusp     # deve sair vazio (caddy_* não têm dados pessoais)
   ```

6. **Apagar os backups**: `sudo rm -rf /var/backups/levelusp` e, no destino externo,
   `sudo rclone purge <BACKUP_RCLONE_REMOTE>` (ou apagar a pasta no servidor do gancho). Confirme
   no destino que não há lixeira/versões retidas (Google Drive e S3 com versionamento guardam
   cópias: esvazie a lixeira e apague versões).
7. **Destruir as chaves**: apague `BACKUP_AGE_IDENTITY_FILE`/`BACKUP_GPG_PASSPHRASE_FILE` da VM e,
   só depois de confirmar o passo 6 em todos os destinos, a cópia do cofre (sem a chave, qualquer
   cópia esquecida fica ilegível).
8. **Logs**: `sudo rm -rf /var/log/levelusp` e `sudo docker system prune -af` (remove contêineres
   parados e seus logs).
9. **Outras cópias**: notebook (`infra/compose/backups/`, volumes `levelusp-*` do Docker Desktop),
   máquinas de quem fez exercícios de restauração, Supabase e Vercel antigos (seção 11).
10. **VM**: pedir à STI a destruição da VM e dos seus snapshots/backups de hipervisor (ou
    reinstalação com sobrescrita do disco), com confirmação por escrito.
11. **Ata**: data, quem executou e conferiu, lista do que foi apagado (passos 5–10), onde está o
    conjunto pseudonimizado e a confirmação da STI. Anexe ao relatório do comitê de ética.

## 11. Antes de abrir para alunos reais

Versão acionável da lista de `seguranca.md`. Marque cada item e anote data/responsável.

**Supabase e Vercel antigos (a chave `service_role` já foi exposta)**
- [ ] Importar os dados para a VM (`levelusp-vm.sh import`, ver `migracao-dados.md`) e conferir
      contagens (usuários, cursos, lições, progresso) entre Supabase e VM.
- [ ] No Supabase: *Project Settings → API Keys* — revogar a chave `service_role` antiga. Em
      projetos com chaves JWT legadas, *Project Settings → JWT Keys* → gerar novo segredo (invalida
      `anon` e `service_role` antigos de uma vez). Conferir que a importação ainda não precisa delas.
- [ ] Na Vercel: *Settings → Environment Variables* — apagar as variáveis com chaves do Supabase;
      *Settings → Git* — desconectar o repositório; depois *Settings → General → Delete Project*.
- [ ] No Supabase, depois de validar a VM por algumas semanas: baixar um último backup **cifrado**
      (guardado como os demais, com a mesma retenção) e *Settings → General → Pause project* e
      então *Delete project*. Dados de alunos não podem ficar esquecidos lá.
- [ ] Procurar a chave antiga em históricos (`.env` locais, mensagens, CI) e apagar.

**SMTP**
- [ ] `SMTP_URL`/`MAIL_FROM` configurados; `mail-test` OK; SPF/DKIM/DMARC publicados.
- [ ] Roteiro R3 (seção 5) concluído para Gmail, Outlook e e-mail USP.

**Gabaritos `legacy`**
- [ ] Converter os casos `legacy` para declarativos (`migracao-dados.md`). Conferir o que resta:
      `levelusp-vm.sh psql -c "select count(*) from lessons where jsonb_path_exists(test_cases, '\$[*] ? (@.kind == \"legacy\")')"`
      (o seed de demonstração tem 19; a meta é 0 no conteúdo real).

**Servidor institucional (este guia)**
- [ ] VM preparada (seção 3): SSH só por chave, ufw, fail2ban, atualizações automáticas.
- [ ] `check` sem avisos de SMTP e de criptografia; `deploy` OK; roteiros R1–R2 (seção 5).
- [ ] Backups cifrados, chave guardada fora da VM por duas pessoas, `restore-test` OK, um
      exercício manual de restauração feito e registrado.
- [ ] Monitor externo e alertas testados.
- [ ] Senha do admin inicial trocada; `SEED_ADMIN_PASSWORD` removida do `vm.env`.
- [ ] Decidir `SIGNUP_ENABLED` (aberto ou por convite) conforme o protocolo.
- [ ] Notebook: desligar a produção antiga (`levelusp.ps1 down -Env prod`), remover a tarefa
      agendada `LevelUSP-update-prod`/`LevelUSP-backup-prod` e apagar `infra/compose/backups/prod`
      e o volume `levelusp-prod_pgdata` depois do corte.
- [ ] GitHub: environment `production` com aprovação obrigatória; `main` protegida.

## 12. Incidentes

**Site fora do ar**
1. `sudo infra/scripts/levelusp-vm.sh status` — qual serviço não está `healthy`?
2. `levelusp-vm.sh logs <serviço>` — erro de configuração aparece na partida, em português.
3. Só o público falha (local ok)? Túnel: painel da Cloudflare (conector conectado?) e
   `logs cloudflared`. Caddy: DNS, portas 80/443, `logs caddy` (falha de certificado).
4. Depois de um deploy? `levelusp-vm.sh rollback <sha-anterior>` (veja `deploy-history.log`).
5. Disco cheio (`df -h`): `docker system prune` (imagens antigas), reduzir `BACKUP_KEEP_*`.
6. VM reiniciou e nada subiu: `sudo systemctl status docker`; `levelusp-vm.sh deploy`.

**Banco corrompido ou dados apagados por engano**
1. Parar escrita: `sudo infra/scripts/levelusp-vm.sh down`.
2. `backup manual incidente` (se o postgres subir) para preservar o estado.
3. Escolher o backup anterior ao problema e `restore` (seção 7.4). Anotar o que se perdeu.

**Suspeita de vazamento ou invasão (LGPD)**
1. Conter: tirar o site do ar (`down`) ou bloquear o acesso; **não** apagar logs nem a VM
   (evidência).
2. Avisar imediatamente o orientador/controlador e o encarregado de dados (DPO) da USP. Incidente
   com risco relevante aos titulares precisa ser comunicado à ANPD e aos alunos afetados no prazo
   da regulamentação vigente (Resolução CD/ANPD nº 15/2024: 3 dias úteis) e ao comitê de ética.
3. Trocar todos os segredos: `POSTGRES_PASSWORD` (também dentro do banco:
   `ALTER USER levelusp PASSWORD '…'`), `RUNNER_TOKEN`, token do túnel, senha SMTP, chave de
   backup (backups novos com chave nova); invalidar todas as sessões (painel admin → sessões).
4. Revisar `audit_log`, logs da API e do Caddy/Cloudflare do período; registrar a linha do tempo.
5. Corrigir a causa, `deploy`, e documentar o incidente.

## 13. Referência rápida

```
levelusp-vm.sh setup | check | deploy [TAG] | rollback SHA | status | logs [SERVIÇO]
levelusp-vm.sh backup [daily|manual] [RÓTULO] | restore DIR [--target-db NOME] [--no-uploads] [--yes]
levelusp-vm.sh restore-test [DIR] | health-check | mail-test EMAIL | seed | import | psql [ARGS]
levelusp-vm.sh install-cron | down
backup.sh list | prune
```

Variáveis: todas em `infra/env/vm.env.example`, com comentários. Outro arquivo de ambiente:
`LEVELUSP_ENV_FILE=/caminho/arquivo.env levelusp-vm.sh …`.
