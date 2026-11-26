/**
 * Ataques ao motor python-completo (CPython nativo em contêiner gVisor), contra o Docker REAL:
 * fuga de rede, escrita fora do tmpfs, fork bomb, memória, tempo, leitura de ambiente/segredos,
 * privilégio e reaproveitamento entre lotes.
 *
 * Só roda quando o Docker tem o runtime `runsc` e a imagem do motor existe (o job `gvisor` do
 * CI instala o runsc e constrói a variante enxuta). Variáveis:
 *   NATIVE_ATTACKS_IMAGE       imagem do motor (padrão `levelusp/python-completo:enxuta`)
 *   NATIVE_ATTACKS_REQUIRED=1  falha, em vez de pular, se faltar o runsc ou a imagem (CI)
 *   NATIVE_ATTACKS_ALLOW_RUNC=1  roda com `runc` quando não há runsc — só para depurar a suíte
 *                              numa máquina de desenvolvimento; não prova o isolamento do gVisor
 */
import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { ProbeObservation, ProjectFile } from "@levelusp/contracts"
import { createDockerClient } from "../../src/docker-cli"
import { NATIVE_CONTAINER_LABEL, NativeEngine } from "../../src/native-engine"
import { DOCKER_RUNTIMES_FORMAT, INSECURE_RUNTIME, parseDockerRuntimes, SECURE_RUNTIME, type NativeRuntime } from "../../src/native-policy"

const testDir = path.dirname(fileURLToPath(import.meta.url))
const dockerBin = process.env.DOCKER_BIN ?? "docker"
const image = process.env.NATIVE_ATTACKS_IMAGE ?? "levelusp/python-completo:enxuta"
const isRequired = process.env.NATIVE_ATTACKS_REQUIRED === "1"

function docker(args: string[]): string | undefined {
  try {
    return execFileSync(dockerBin, args, { encoding: "utf8", timeout: 20_000, stdio: ["ignore", "pipe", "ignore"] })
  } catch {
    return undefined
  }
}

const runtimes = parseDockerRuntimes(docker(["info", "--format", DOCKER_RUNTIMES_FORMAT]) ?? "")
const hasRunsc = runtimes.includes(SECURE_RUNTIME)
const hasImage = docker(["image", "inspect", "--format", "{{.Id}}", image]) !== undefined
const allowsRunc = !isRequired && process.env.NATIVE_ATTACKS_ALLOW_RUNC === "1" && runtimes.includes(INSECURE_RUNTIME)
const runtime: NativeRuntime | undefined = hasRunsc ? SECURE_RUNTIME : allowsRunc ? INSECURE_RUNTIME : undefined
const canRun = runtime !== undefined && hasImage

const MEMORY_MB = 256
const PIDS_LIMIT = 64
const WORK_DISK_MB = 16
const TIMEOUT_MS = 4_000
/** Segredo plantado no ambiente do executor: não pode aparecer em lugar nenhum do contêiner. */
const PLANTED_SECRET = "segredo-do-executor-7f3a9c1e5b2d"

/** Programa que tenta cada ação e imprime um JSON `{nome: "ok ..." | "ERRO Tipo"}`. */
const attempts = (...lines: string[]): ProjectFile[] => [{
  path: "main.py",
  content: [
    "import json, os, sys",
    "r = {}",
    "def tenta(nome, acao):",
    "    try:",
    "        r[nome] = 'ok ' + repr(acao())[:300]",
    "    except BaseException as erro:",
    "        r[nome] = 'ERRO ' + type(erro).__name__",
    ...lines,
    "print(json.dumps(r))",
  ].join("\n") + "\n",
}]

const program = (...lines: string[]): ProjectFile[] => [{ path: "main.py", content: lines.join("\n") + "\n" }]

describe("python-completo: pré-requisitos da suíte de ataques", () => {
  it("no CI o runsc e a imagem existem (a suíte não pode ser pulada em silêncio)", () => {
    if (isRequired) expect({ hasRunsc, hasImage }).toEqual({ hasRunsc: true, hasImage: true })
    else expect(true).toBe(true)
  })
})

describe.skipIf(!canRun)("python-completo: ataques ao contêiner", () => {
  let engine: NativeEngine

  const run = async (files: ProjectFile[], timeoutMs = TIMEOUT_MS): Promise<ProbeObservation> => {
    const [observation] = await engine.run({ files, entry: "main.py", probes: [{ kind: "run", id: "r", stdin: "" }], limits: { timeoutMs, memoryMb: 128 }, libraries: [] })
    if (!observation) throw new Error("o motor não devolveu observação")
    return observation
  }
  const results = async (files: ProjectFile[]): Promise<Record<string, string>> => {
    const observation = await run(files)
    expect(observation.ok, JSON.stringify(observation)).toBe(true)
    return JSON.parse(observation.stdout ?? "{}") as Record<string, string>
  }
  const liveContainers = (): string[] => (docker(["ps", "--quiet", "--filter", `label=${NATIVE_CONTAINER_LABEL}`]) ?? "").split(/\s+/).filter((id) => id !== "")

  beforeAll(async () => {
    process.env.RUNNER_TOKEN = PLANTED_SECRET
    process.env.DATABASE_URL = `postgres://levelusp:${PLANTED_SECRET}@db/levelusp`
    engine = new NativeEngine({
      docker: createDockerClient(dockerBin),
      image,
      runtime: runtime ?? SECURE_RUNTIME,
      insecure: runtime === INSECURE_RUNTIME,
      harnessPath: path.resolve(testDir, "../../python/harness.py"),
      bootstrapPath: path.resolve(testDir, "../../python/native_bootstrap.py"),
      warm: 1,
      memoryMb: MEMORY_MB,
      cpus: 1,
      pidsLimit: PIDS_LIMIT,
      workDiskMb: WORK_DISK_MB,
      bootTimeoutMs: 90_000,
      preload: ["numpy"],
    })
    await engine.start()
    expect(engine.readiness, "autoteste do motor").toEqual({ ready: true, reason: "" })
  })

  afterAll(async () => {
    await engine.shutdown()
  })

  it("roda CPython 3.14 nativo com numpy, como usuário sem privilégio", async () => {
    const found = await results(attempts(
      "import platform",
      "tenta('python', lambda: platform.python_version())",
      "tenta('numpy', lambda: int(__import__('numpy').arange(5).sum()))",
      "tenta('uid', lambda: (os.getuid(), os.getgid()))",
      "tenta('kernel', lambda: os.uname().release)",
    ))
    expect(found.python).toMatch(/^ok '3\.14\./)
    expect(found.numpy).toBe("ok 10")
    expect(found.uid).toBe("ok (65534, 65534)")
    expect(engine.versions.python).toMatch(/^3\.14\.\d+ \(nativo\)$/)
    // O gVisor apresenta o próprio kernel (4.4.0), não o da máquina: prova de que o runsc está em uso.
    if (runtime === SECURE_RUNTIME) expect(found.kernel).toMatch(/^ok '4\.4\.0/)
  })

  it("rede: nenhuma saída (TCP, UDP, DNS, HTTP) e nenhuma interface além do loopback", async () => {
    const found = await results(attempts(
      "import socket, urllib.request",
      "def tcp():",
      "    s = socket.socket(); s.settimeout(2); s.connect(('1.1.1.1', 53)); return 'conectou'",
      "def udp():",
      "    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.settimeout(2); s.sendto(b'x', ('8.8.8.8', 53)); return 'enviou'",
      "tenta('tcp', tcp)",
      "tenta('udp', udp)",
      "tenta('dns', lambda: socket.getaddrinfo('pypi.org', 443))",
      "tenta('http', lambda: urllib.request.urlopen('http://93.184.216.34/', timeout=2).status)",
      "tenta('metadados', lambda: urllib.request.urlopen('http://169.254.169.254/latest/meta-data/', timeout=2).status)",
      "tenta('interfaces', lambda: sorted(nome for _, nome in socket.if_nameindex()))",
    ))
    for (const route of ["tcp", "udp", "dns", "http", "metadados"]) expect(found[route], route).toMatch(/^ERRO /)
    expect(["ok ['lo']", "ok []"]).toContain(found.interfaces)
  })

  it("disco: nada fora de /work e /tmp é gravável, e /work tem teto", async () => {
    const found = await results(attempts(
      "import sysconfig",
      "def grava(caminho):",
      "    with open(caminho, 'w') as arquivo: arquivo.write('x')",
      "    return 'gravou'",
      "for nome, caminho in {'raiz': '/invasor', 'etc': '/etc/invasor', 'usr': '/usr/local/invasor', 'home': '/home/invasor', 'var': '/var/tmp/invasor',",
      "                      'site': sysconfig.get_paths()['purelib'] + '/invasor.py', 'stdlib': sysconfig.get_paths()['stdlib'] + '/invasor.py',",
      "                      'proc': '/proc/sys/kernel/hostname', 'sys': '/sys/invasor'}.items():",
      "    tenta(nome, lambda caminho=caminho: grava(caminho))",
      "tenta('passwd', lambda: open('/etc/passwd', 'a').write('invasor:x:0:0::/:/bin/sh'))",
      "tenta('work', lambda: grava('/work/ok.txt'))",
      "def enche():",
      `    with open('/work/grande.bin', 'wb') as arquivo:`,
      `        for _ in range(${WORK_DISK_MB * 2}): arquivo.write(b'x' * 1048576)`,
      "    return 'coube'",
      "tenta('enche', enche)",
    ))
    for (const place of ["raiz", "etc", "usr", "home", "var", "site", "stdlib", "proc", "sys", "passwd"]) expect(found[place], place).toMatch(/^ERRO /)
    expect(found.work).toBe("ok 'gravou'")
    expect(found.enche).toBe("ERRO OSError")
  })

  it("disco: não executa binário gravado no projeto (tmpfs noexec)", async () => {
    const found = await results(attempts(
      "import shutil, subprocess",
      "def executa(pasta):",
      "    alvo = pasta + '/sh-copiado'",
      "    shutil.copy('/bin/sh', alvo); os.chmod(alvo, 0o755)",
      "    return subprocess.run([alvo, '-c', 'echo executou'], capture_output=True, timeout=3).stdout",
      "tenta('work', lambda: executa('/work'))",
      "tenta('tmp', lambda: executa('/tmp'))",
    ))
    expect(found.work).toMatch(/^ERRO /)
    expect(found.tmp).toMatch(/^ERRO /)
  })

  it("segredos: o ambiente do executor não chega ao contêiner, que não vê socket nem volume da máquina", async () => {
    const found = await results(attempts(
      "def le(caminho):",
      "    with open(caminho, 'rb') as arquivo: return arquivo.read().decode('latin1')",
      "tenta('ambiente', lambda: sorted(os.environ))",
      "tenta('valores', lambda: ' '.join(os.environ.values()))",
      "tenta('proc_self', lambda: le('/proc/self/environ'))",
      "tenta('proc_1', lambda: le('/proc/1/environ') + le('/proc/1/cmdline'))",
      "tenta('socket', lambda: [caminho for caminho in ('/var/run/docker.sock', '/run/docker.sock', '/run/containerd/containerd.sock') if os.path.exists(caminho)])",
      "tenta('montagens', lambda: le('/proc/mounts'))",
      "tenta('argv', lambda: sys.argv)",
    ))
    const everything = JSON.stringify(found)
    expect(everything).not.toContain(PLANTED_SECRET)
    expect(everything).not.toMatch(/RUNNER_TOKEN|DATABASE_URL/)
    expect(found.ambiente).not.toMatch(/TOKEN|SECRET|PASSWORD|DATABASE|DOCKER/i)
    expect(found.socket).toBe("ok []")
    expect(found.montagens).not.toMatch(/docker\.sock|\/host|\/var\/lib\/docker\/volumes/)
  })

  it("privilégio: não vira root, não tem capability e não monta nada", async () => {
    const found = await results(attempts(
      "import ctypes",
      "def capacidades():",
      "    with open('/proc/self/status') as arquivo:",
      "        return [linha.split()[1] for linha in arquivo if linha.startswith(('CapEff', 'CapPrm', 'CapBnd'))]",
      "tenta('setuid', lambda: os.setuid(0))",
      "tenta('chown', lambda: os.chown('/work', 0, 0))",
      "tenta('capacidades', capacidades)",
      "def monta():",
      "    libc = ctypes.CDLL(None, use_errno=True)",
      "    if libc.mount(b'proc', b'/work', b'proc', 0, None) != 0: raise OSError(ctypes.get_errno(), 'mount')",
      "    return 'montou'",
      "tenta('mount', monta)",
      "tenta('chroot', lambda: os.chroot('/work'))",
      "tenta('nice', lambda: os.nice(-5))",
    ))
    for (const action of ["setuid", "chown", "mount", "chroot", "nice"]) expect(found[action], action).toMatch(/^ERRO /)
    expect(found.capacidades).toMatch(/^ok \[('0+'(, )?)*\]$/)
  })

  it("tempo: laço infinito é morto no prazo e o contêiner some", async () => {
    const startedAt = performance.now()
    const observation = await run(program("while True:", "    pass"), 2_000)
    expect(observation).toMatchObject({ ok: false, timedOut: true })
    expect(performance.now() - startedAt).toBeLessThan(12_000)
    expect(engine.stats()).toMatchObject({ timedOut: 1 })
  })

  it("memória: alocar além do teto derruba só o contêiner", async () => {
    const observation = await run(program(
      "blocos = []",
      "while True:",
      "    blocos.append(bytearray(16 * 1024 * 1024))",
      `    if len(blocos) * 16 > ${MEMORY_MB * 8}: break`,
      "print('alocou', len(blocos) * 16, 'MB')",
    ), 15_000)
    expect(observation.ok, JSON.stringify(observation)).toBe(false)
    expect(observation.stdout ?? "").not.toContain("alocou")
  })

  it("fork bomb: o número de processos é limitado e o motor continua atendendo", async () => {
    const observation = await run(program(
      "import os, time",
      "filhos = 0",
      "try:",
      "    while filhos < 5000:",
      "        if os.fork() == 0:",
      "            time.sleep(30)",
      "            os._exit(0)",
      "        filhos += 1",
      "except OSError:",
      "    pass",
      "print('filhos', filhos)",
    ), 6_000)
    const forked = /filhos (\d+)/.exec(observation.stdout ?? "")?.[1]
    // Ou o limite barrou o fork (e o programa contou quantos criou), ou o contêiner foi morto.
    if (forked !== undefined) expect(Number(forked)).toBeLessThanOrEqual(PIDS_LIMIT)
    else expect(observation.ok).toBe(false)
    const next = await results(attempts("tenta('vivo', lambda: 1 + 1)"))
    expect(next.vivo).toBe("ok 2")
  })

  it("saída: inundar a saída padrão é cortado", async () => {
    const observation = await run(program("import os", "bloco = b'x' * 65536", "while True:", "    os.write(1, bloco)"), 10_000)
    expect(observation).toMatchObject({ ok: false, error: "Saída grande demais: o programa imprimiu dados demais." })
  })

  it("uso único: nada do lote anterior (arquivos, módulos alterados) chega ao próximo", async () => {
    const first = await results(attempts(
      "import json as modulo_json",
      "def planta():",
      "    for caminho in ('/work/herdado.txt', '/tmp/herdado.txt'):",
      "        with open(caminho, 'w') as arquivo: arquivo.write('do lote anterior')",
      "    modulo_json.herdado = True",
      "    return 'plantou'",
      "tenta('planta', planta)",
    ))
    expect(first.planta).toBe("ok 'plantou'")
    const second = await results(attempts(
      "import json as modulo_json",
      "tenta('work', lambda: os.path.exists('/work/herdado.txt'))",
      "tenta('tmp', lambda: os.path.exists('/tmp/herdado.txt'))",
      "tenta('modulo', lambda: hasattr(modulo_json, 'herdado'))",
    ))
    expect(second).toEqual({ work: "ok False", tmp: "ok False", modulo: "ok False" })
  })

  it("depois dos ataques não sobra contêiner além do pool", async () => {
    // O `docker rm -f` dos lotes mortos é assíncrono: dá um tempo para o Docker terminar.
    await new Promise<void>((resolve) => setTimeout(resolve, 3_000))
    expect(liveContainers().length).toBeLessThanOrEqual(1)
  })
})
