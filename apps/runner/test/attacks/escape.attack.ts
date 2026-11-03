/**
 * Classe 1 (fuga do sandbox): sistema de arquivos fora dos três diretórios
 * concedidos, ambiente, rede, processos, threads, código nativo e vazamento
 * entre jobs. Tudo roda no CPython WASI real.
 */
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { findWritableRuntimePaths } from "../../src/config"
import { safeJoin } from "../../src/sandbox"
import { createSandbox, globalsProbe, isPythonAvailable, isRoot, jobsRoot, mainFile, pythonLibDir, runOne } from "./support"

const sandbox = createSandbox()

/** Cada tentativa vira uma variável global: "ok:<resultado>" ou o tipo da exceção. */
const tryAll = (attempts: Record<string, string>): string[] => [
  "import os, sys",
  "resultados = {}",
  "def tenta(nome, acao):",
  "    try:",
  "        resultados[nome] = 'ok:' + repr(acao())[:200]",
  "    except BaseException as erro:",
  "        resultados[nome] = type(erro).__name__",
  ...Object.entries(attempts).map(([name, action]) => `tenta(${JSON.stringify(name)}, lambda: ${action})`),
]

async function attempt(attempts: Record<string, string>): Promise<Record<string, string>> {
  const observation = await runOne(sandbox, mainFile(...tryAll(attempts)), globalsProbe("resultados"))
  expect(observation.ok).toBe(true)
  return observation.values?.resultados as Record<string, string>
}

const isBlocked = (result: string | undefined): boolean => result !== undefined && !result.startsWith("ok:")

describe.skipIf(!isPythonAvailable)("fuga do sandbox: sistema de arquivos", () => {
  it("nada fora de /lib, /harness e /work: raiz, /proc, /etc, /dev, /tmp, caminhos do host e ..", async () => {
    const results = await attempt({
      raiz: "os.listdir('/')",
      proc: "open('/proc/self/environ').read()",
      proc_mem: "open('/proc/self/mem', 'rb').read(1)",
      etc: "open('/etc/passwd').read()",
      dev: "os.listdir('/dev')",
      dev_null: "open('/dev/null').read()",
      tmp: "os.listdir('/tmp')",
      host_jobs: `os.listdir(${JSON.stringify(jobsRoot)})`,
      host_lib: `os.listdir(${JSON.stringify(pythonLibDir)})`,
      pontos: "os.listdir('/work/..')",
      pontos_harness: "open('/work/../harness/harness.py').read()",
      chdir: "(os.chdir('..'), os.listdir('.'))",
      lib_pontos: "os.listdir('/lib/..')",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
  })

  it("links simbólicos não saem do /work (absolutos, relativos, para /lib)", async () => {
    const results = await attempt({
      absoluto: "(os.symlink('/harness/harness.py', 'l1'), open('l1').read(10))",
      relativo: "(os.symlink('../harness/harness.py', 'l2'), open('l2').read(10))",
      para_lib: "(os.symlink('../../lib', 'l3'), os.listdir('l3'))",
      barra_final: "(os.symlink('/etc/', 'l4'), os.listdir('l4/'))",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
  })

  it("o harness é público mas não traz o lote: sem probes.json, sem nonce em argv/stdin/ambiente", async () => {
    const results = await attempt({
      sondas: "os.listdir('/harness')",
      argv: "(sys.argv, sys.orig_argv)",
      stdin: "os.read(0, 100000)",
      ambiente: "dict(os.environ)",
    })
    expect(results.sondas).toBe("ok:['harness.py']")
    expect(results.argv).toBe("ok:(['main.py'], ['python.cwasm', '-I', '-S', '/harness/harness.py'])")
    expect(results.stdin).toBe("ok:b''")
    expect(results.ambiente).toBe("ok:{}")
  })

  it("stdlib e harness: gravar, renomear ou criar hardlink falha — ou o executor acusa a stdlib gravável", async () => {
    const writable = findWritableRuntimePaths(path.dirname(pythonLibDir))
    if (writable.length > 0) {
      // Desenvolvimento como root/dono da stdlib: o convidado PODERIA alterá-la (o WASI
      // herda as permissões do processo). Não tentamos (estragaria a stdlib desta
      // máquina); o executor avisa na partida e, com NODE_ENV=production, recusa partir.
      expect(writable).toContain(pythonLibDir)
      return
    }
    const results = await attempt({
      lib: "open('/lib/python3.14/zz_ataque.py', 'w').write('x')",
      lib_existente: "open('/lib/python3.14/this.py', 'a').write('x')",
      harness: "open('/harness/harness.py', 'a').write('x')",
      harness_novo: "open('/harness/novo.py', 'w').write('x')",
      renomeia_lib: "os.rename('/lib/python3.14/this.py', '/work/this.py')",
      hardlink_lib: "(os.link('/lib/python3.14/this.py', '/work/this_link.py'), open('/work/this_link.py', 'a').write('x'))",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
  })

  it("findWritableRuntimePaths: stdlib gravável é acusada; somente leitura passa (exceto para root)", () => {
    const fakePython = mkdtempSync(path.join(os.tmpdir(), "lvl-stdlib-"))
    const lib = path.join(fakePython, "lib")
    const module = path.join(lib, "json.py")
    try {
      mkdirSync(lib)
      writeFileSync(module, "")
      expect(findWritableRuntimePaths(fakePython)).toContain(lib)
      chmodSync(module, 0o444)
      chmodSync(lib, 0o555)
      expect(findWritableRuntimePaths(fakePython)).toEqual(isRoot() ? [lib] : [])
    } finally {
      chmodSync(lib, 0o755)
      rmSync(fakePython, { recursive: true, force: true })
    }
  })

  it("nomes de arquivo do projeto não escapam do /work (.., absolutos)", () => {
    const base = path.join(jobsRoot, "base")
    expect(() => safeJoin(base, "../fora.py")).toThrow()
    expect(() => safeJoin(base, "/etc/passwd")).toThrow()
    expect(() => safeJoin(base, "a/../../fora.py")).toThrow()
    expect(() => safeJoin(base, "a/../../base-irma/x.py")).toThrow()
    expect(safeJoin(base, "pacote/modulo.py")).toBe(path.join(base, "pacote", "modulo.py"))
  })
})

describe.skipIf(!isPythonAvailable)("fuga do sandbox: rede, processos, threads, nativo", () => {
  it("sem sockets, DNS, HTTP, subprocessos, fork, threads nem ctypes", async () => {
    const results = await attempt({
      socket: "__import__('socket').create_connection(('1.1.1.1', 80), timeout=1)",
      socket_cru: "__import__('socket').socket().connect(('127.0.0.1', 8081))",
      dns: "__import__('socket').getaddrinfo('example.com', 80)",
      urllib: "__import__('urllib.request').request.urlopen('http://example.com', timeout=1)",
      subprocess: "__import__('subprocess').run(['ls'])",
      fork: "os.fork()",
      system: "os.system('ls')",
      posix_spawn: "os.posix_spawn('/bin/ls', ['ls'], {})",
      thread: "__import__('threading').Thread(target=print).start()",
      thread_cru: "__import__('_thread').start_new_thread(print, ())",
      ctypes: "__import__('ctypes')",
      mmap: "__import__('mmap')",
      kill: "os.kill(1, 9)",
    })
    for (const [name, result] of Object.entries(results)) expect(isBlocked(result), `${name}: ${result}`).toBe(true)
  })

  it("um job não vê arquivos nem estado de outro job", async () => {
    const writer = await runOne(sandbox, mainFile("open('segredo.txt', 'w').write('do job A')", "import builtins", "builtins.marca = 'A'"), globalsProbe())
    expect(writer.ok).toBe(true)
    const results = await attempt({
      arquivo: "open('segredo.txt').read()",
      listagem: "sorted(os.listdir('.'))",
      builtin: "__import__('builtins').marca",
    })
    expect(isBlocked(results.arquivo)).toBe(true)
    expect(results.listagem).toBe("ok:['main.py']")
    expect(isBlocked(results.builtin)).toBe(true)
  })
})
