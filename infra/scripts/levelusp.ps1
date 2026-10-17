<#
.SYNOPSIS
  Opera os ambientes do LevelUSP no notebook (Docker Desktop + Cloudflare Quick Tunnel).

.EXAMPLE
  .\infra\scripts\levelusp.ps1 setup  -Env homolog   # cria infra/env/homolog.env com segredos aleatórios
  .\infra\scripts\levelusp.ps1 up     -Env homolog   # baixa imagens, sobe tudo, abre o túnel e mostra o link
  .\infra\scripts\levelusp.ps1 seed   -Env homolog   # admin + usuários demo + curso Python Completo
  .\infra\scripts\levelusp.ps1 status -Env homolog   # link público, saúde e versão
  .\infra\scripts\levelusp.ps1 update -Env homolog   # puxa a imagem nova (se houver) e reinicia
  .\infra\scripts\levelusp.ps1 backup -Env prod      # pg_dump comprimido em infra/compose/backups/<env>
  .\infra\scripts\levelusp.ps1 restore -Env homolog -File .\backup.sql.gz
  .\infra\scripts\levelusp.ps1 import -Env prod      # importa o Supabase (pede SOURCE_DATABASE_URL)
  .\infra\scripts\levelusp.ps1 logs   -Env homolog [-Service api]
  .\infra\scripts\levelusp.ps1 down   -Env homolog
  .\infra\scripts\levelusp.ps1 install-autoupdate    # tarefa agendada: update a cada 5 min (homolog e prod)
#>
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [ValidateSet("setup", "up", "down", "status", "update", "seed", "backup", "restore", "import", "logs", "install-autoupdate")]
  [string]$Command,
  [ValidateSet("homolog", "prod")] [string]$Env = "homolog",
  [string]$Service = "",
  [string]$File = ""
)
$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ComposeDir = Join-Path $Root "infra\compose"
$EnvFile = Join-Path $Root "infra\env\$Env.env"
$Project = "levelusp-$Env"

function Compose([string[]]$CmdArgs) {
  & docker compose -p $Project --env-file $EnvFile -f (Join-Path $ComposeDir "compose.yml") --profile tunnel @CmdArgs
  if ($LASTEXITCODE -ne 0) { throw "docker compose $($CmdArgs -join ' ') falhou ($LASTEXITCODE)" }
}

function New-Secret {
  $b = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  $s = [Convert]::ToBase64String($b) -replace '[^A-Za-z0-9]', ''
  return $s.Substring(0, 40)
}

function Set-EnvValue([string]$Key, [string]$Value) {
  $lines = Get-Content $EnvFile
  if ($lines -match "^$Key=") { $lines = $lines -replace "^$Key=.*", "$Key=$Value" } else { $lines += "$Key=$Value" }
  Set-Content -Path $EnvFile -Value $lines -Encoding utf8
}

function Get-EnvValue([string]$Key) {
  $line = (Get-Content $EnvFile) | Where-Object { $_ -match "^$Key=" } | Select-Object -First 1
  if ($line) { return $line.Substring($Key.Length + 1) } else { return "" }
}

function Assert-EnvFile { if (-not (Test-Path $EnvFile)) { throw "Arquivo $EnvFile não existe. Rode primeiro: levelusp.ps1 setup -Env $Env" } }

function Get-TunnelUrl([int]$TimeoutSec = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  while ((Get-Date) -lt $deadline) {
    $logs = & docker compose -p $Project --env-file $EnvFile -f (Join-Path $ComposeDir "compose.yml") --profile tunnel logs tunnel 2>&1 | Out-String
    $m = [regex]::Matches($logs, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($m.Count -gt 0) { return $m[$m.Count - 1].Value }
    Start-Sleep -Seconds 2
  }
  return $null
}

switch ($Command) {
  "setup" {
    $example = "$EnvFile.example"
    if (Test-Path $EnvFile) { Write-Host "$EnvFile já existe — mantido." ; break }
    Copy-Item $example $EnvFile
    foreach ($k in "POSTGRES_PASSWORD", "RUNNER_TOKEN", "SEED_ADMIN_PASSWORD") { Set-EnvValue $k (New-Secret) }
    Write-Host "Criado $EnvFile com segredos aleatórios."
    Write-Host "Senha do admin ($(Get-EnvValue 'SEED_ADMIN_EMAIL')): $(Get-EnvValue 'SEED_ADMIN_PASSWORD')"
  }
  "up" {
    Assert-EnvFile
    Compose @("pull", "--quiet")
    Compose @("up", "-d", "tunnel")
    $url = Get-TunnelUrl
    if ($url) {
      Set-EnvValue "APP_ORIGIN" $url
      Write-Host "Túnel ativo: $url"
    } else { Write-Warning "Não consegui ler o endereço do túnel; links de e-mail usarão $(Get-EnvValue 'APP_ORIGIN')." }
    Compose @("up", "-d", "--remove-orphans")
    Write-Host "`nLevelUSP ($Env) no ar:"
    Write-Host "  público: $(Get-EnvValue 'APP_ORIGIN')"
    Write-Host "  local:   http://localhost:$(Get-EnvValue 'WEB_PORT')"
  }
  "down" { Assert-EnvFile; Compose @("down") }
  "status" {
    Assert-EnvFile
    Compose @("ps")
    $url = Get-TunnelUrl 5
    Write-Host "`nEndereço público: $url"
    try { (Invoke-RestMethod "http://localhost:$(Get-EnvValue 'WEB_PORT')/api/health/ready") | Format-List } catch { Write-Warning "API indisponível: $_" }
  }
  "update" {
    Assert-EnvFile
    $before = (& docker compose -p $Project --env-file $EnvFile -f (Join-Path $ComposeDir "compose.yml") images -q 2>$null) -join ","
    Compose @("pull", "--quiet")
    Compose @("up", "-d", "--remove-orphans")
    $after = (& docker compose -p $Project --env-file $EnvFile -f (Join-Path $ComposeDir "compose.yml") images -q 2>$null) -join ","
    if ($before -ne $after) { Write-Host "[$(Get-Date -Format s)] $Env atualizado para a imagem mais recente." }
  }
  "seed" { Assert-EnvFile; Compose @("--profile", "tools", "run", "--rm", "seed") }
  "import" {
    Assert-EnvFile
    if (-not $env:SOURCE_DATABASE_URL) { $env:SOURCE_DATABASE_URL = Read-Host "Connection string do Supabase (Settings > Database > Connection string, modo Session)" }
    Compose @("--profile", "tools", "run", "--rm", "-e", "SOURCE_DATABASE_URL=$($env:SOURCE_DATABASE_URL)", "import-supabase")
  }
  "backup" {
    Assert-EnvFile
    $dir = Join-Path $ComposeDir ("backups\" + $Env); New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $name = "levelusp-$Env-$(Get-Date -Format yyyyMMdd-HHmmss).sql.gz"
    Compose @("exec", "-T", "postgres", "sh", "-c", "pg_dump -U levelusp -d levelusp --no-owner | gzip > /backups/$name")
    Write-Host "Backup salvo em $(Join-Path $dir $name)"
    # Mantém os 14 mais recentes
    Get-ChildItem $dir -Filter "*.sql.gz" | Sort-Object LastWriteTime -Descending | Select-Object -Skip 14 | Remove-Item
  }
  "restore" {
    Assert-EnvFile
    if (-not (Test-Path $File)) { throw "Informe -File com o caminho do backup .sql.gz" }
    $confirm = Read-Host "Isto SOBRESCREVE o banco de $Env. Digite o nome do ambiente para confirmar"
    if ($confirm -ne $Env) { throw "Cancelado." }
    Compose @("stop", "api", "web")
    Copy-Item $File (Join-Path $ComposeDir ("backups\" + $Env + "\restore.sql.gz"))
    Compose @("exec", "-T", "postgres", "sh", "-c", "dropdb -U levelusp --if-exists levelusp_old; psql -U levelusp -d postgres -c 'ALTER DATABASE levelusp RENAME TO levelusp_old' && createdb -U levelusp levelusp && gunzip -c /backups/restore.sql.gz | psql -U levelusp -d levelusp -q")
    Compose @("up", "-d")
    Write-Host "Restaurado. O banco anterior ficou como levelusp_old."
  }
  "logs" { Assert-EnvFile; if ($Service) { Compose @("logs", "-f", "--tail", "200", $Service) } else { Compose @("logs", "-f", "--tail", "100") } }
  "install-autoupdate" {
    $script = Join-Path $PSScriptRoot "levelusp.ps1"
    foreach ($e in "homolog", "prod") {
      if (-not (Test-Path (Join-Path $Root "infra\env\$e.env"))) { continue }
      $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" update -Env $e"
      $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 5)
      Register-ScheduledTask -TaskName "LevelUSP-update-$e" -Action $action -Trigger $trigger -Description "Atualiza o LevelUSP ($e) quando há imagem nova no GHCR" -Force | Out-Null
      Write-Host "Tarefa agendada LevelUSP-update-$e criada (a cada 5 min)."
    }
    $bk = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" backup -Env prod"
    Register-ScheduledTask -TaskName "LevelUSP-backup-prod" -Action $bk -Trigger (New-ScheduledTaskTrigger -Daily -At 3am) -Force | Out-Null
    Write-Host "Backup diário de prod agendado para 03:00."
  }
}
