import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import type { Test as HttpTest } from "supertest"
import { eq, sql } from "drizzle-orm"
import { lessons, notes, platformSettings } from "@levelusp/db"
import type { Course, LessonWithTests, Note, Profile } from "@levelusp/contracts"
import { agent, bodyOf, countRows, createTestApp, CSRF_HEADER_NAME, required, signUp, type SignedUpUser, type TestContext } from "../e2e/harness"
import { SQL_INJECTION_PAYLOADS, XSS_PAYLOADS } from "./support"

/*
 * Injeção (OWASP A03:2021): SQL em todo parâmetro textual, XSS armazenado e
 * refletido, poluição de protótipo pelo corpo JSON, bombas de profundidade e
 * tamanho, ReDoS nas expressões regulares que recebem texto do usuário,
 * travessia de caminho e injeção em log/cabeçalho.
 */

/** Uma consulta com `pg_sleep` injetada levaria segundos; parametrizada, volta na hora. */
const MAX_INJECTED_RESPONSE_MS = 1_500
/** Teto para regex sobre entrada de 50 mil caracteres (backtracking catastrófico levaria minutos). */
const MAX_REGEX_RESPONSE_MS = 1_000

function isPolluted(): boolean {
  const probe: Record<string, unknown> = {}
  return "polluted" in probe || "isAdmin" in probe || Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")
}

describe("Injeção e entradas hostis", () => {
  let ctx: TestContext
  let student: SignedUpUser
  let teacher: SignedUpUser

  beforeAll(async () => {
    ctx = await createTestApp()
  })
  afterAll(() => ctx.close())
  beforeEach(async () => {
    await ctx.reset()
    student = await signUp(ctx.app)
    teacher = await signUp(ctx.app, "teacher", ctx.db)
  })

  describe("SQL injection", () => {
    it("parâmetros de rota, consulta e login tratam a carga como texto (sem 500, sem atraso, sem vazamento)", async () => {
      const anonymous = agent(ctx.app)
      for (const payload of SQL_INJECTION_PAYLOADS) {
        const encoded = encodeURIComponent(payload)
        const probes = [
          (): HttpTest => anonymous.get(`/api/users/by-username/${encoded}`),
          (): HttpTest => anonymous.get(`/api/certificates/${encoded}`),
          (): HttpTest => anonymous.get(`/api/certificates/${encoded}/pdf`),
          (): HttpTest => anonymous.get(`/api/files/${encoded}`),
          (): HttpTest => anonymous.get(`/api/leaderboard?limit=${encoded}`),
          (): HttpTest => anonymous.get(`/api/courses/${encoded}`),
          (): HttpTest => anonymous.post("/api/auth/sign-in", { email: `${payload}@usp.br`, password: payload }),
          (): HttpTest => anonymous.post("/api/auth/sign-in", { email: "a@usp.br", password: payload }),
          (): HttpTest => anonymous.post("/api/auth/password/forgot", { email: payload }),
          (): HttpTest => anonymous.post("/api/auth/password/reset", { token: payload, password: "senhaForte123" }),
        ]
        for (const probe of probes) {
          const startedAt = Date.now()
          const response = await probe()
          expect(Date.now() - startedAt).toBeLessThan(MAX_INJECTED_RESPONSE_MS)
          expect(response.status).toBeLessThan(500)
          expect(JSON.stringify(response.body)).not.toMatch(/argon2|password_hash|syntax error|pg_|relation "/i)
        }
      }
      expect(await countRows(ctx.db, sql`select count(*)::int as n from users`)).toBe(2)
    })

    it("cargas gravadas em notas, perfil e cursos voltam literais e o banco segue íntegro", async () => {
      for (const payload of SQL_INJECTION_PAYLOADS) {
        const note = await student.agent.post("/api/me/notes", { title: payload, content: payload })
        expect(note.status).toBe(201)
        const stored = required(await ctx.db.query.notes.findFirst({ where: eq(notes.id, bodyOf<Note>(note).id) }), "nota")
        expect(stored.content).toBe(payload)
        const profile = await student.agent.patch("/api/me/profile", { bio: payload, full_name: payload })
        expect(bodyOf<Profile>(profile).bio).toBe(payload)
        const course = await teacher.agent.post("/api/courses", { title: `Curso ${payload}`, description: payload })
        expect(bodyOf<Course>(course).description).toBe(payload)
      }
      expect(await countRows(ctx.db, sql`select count(*)::int as n from users`)).toBe(2)
      expect(await countRows(ctx.db, sql`select count(*)::int as n from notes`)).toBe(SQL_INJECTION_PAYLOADS.length)
    })
  })

  describe("XSS", () => {
    it("HTML rico de lição e curso é sanitizado no servidor (sem script, evento nem javascript:)", async () => {
      for (const payload of XSS_PAYLOADS) {
        const content = `<p>ok</p>${payload}`
        const lesson = bodyOf<LessonWithTests>(await teacher.agent.post("/api/lessons", { title: "Lição XSS", content_markdown: content }))
        const stored = required(await ctx.db.query.lessons.findFirst({ where: eq(lessons.id, lesson.id) }), "lição").contentMarkdown
        expect(stored).not.toMatch(/<script|onerror|onload|javascript:|<iframe|<style|<math|<svg/i)
        const course = bodyOf<Course>(await teacher.agent.post("/api/courses", { title: "Curso XSS", long_description: content }))
        expect(course.long_description).not.toMatch(/<script|onerror|onload|javascript:|<iframe|<style|<math|<svg/i)
      }
    })

    it("respostas são JSON (nosniff), nunca HTML: entrada refletida não executa", async () => {
      const payload = encodeURIComponent("<script>alert(1)</script>")
      for (const path of [`/api/users/by-username/${payload}`, `/api/certificates/${payload}`, `/api/nao-existe/${payload}`, `/api/lessons/${payload}`]) {
        const response = await agent(ctx.app).get(path)
        expect(response.headers["content-type"]).toMatch(/^application\/json/)
        expect(response.headers["x-content-type-options"]).toBe("nosniff")
        expect(response.text).not.toContain("<script>")
      }
    })

    it("nome com HTML vai para o PDF do certificado como texto, servido como application/pdf", async () => {
      const { renderCertificatePdf } = await import("@/modules/certificates/certificate-pdf")
      const pdf = await renderCertificatePdf({
        code: "LVL-AAAA-BBBB",
        studentName: "<script>alert(1)</script> ) Tj /JavaScript (app.alert(1))",
        courseTitle: "<img src=x onerror=alert(1)>",
        issuedAt: new Date().toISOString(),
        examScore: 90,
        projectStatus: "passed",
        verifyUrl: "https://levelusp.teste.example/certificado/LVL-AAAA-BBBB",
      })
      const text = pdf.toString("latin1")
      expect(text.startsWith("%PDF-")).toBe(true)
      // Nenhuma ação JavaScript nem OpenAction injetada pelo nome.
      expect(text).not.toMatch(/\/JS\s|\/JavaScript\s*<<|\/OpenAction|\/Launch/)
    })
  })

  describe("poluição de protótipo", () => {
    it("__proto__ e constructor.prototype no corpo não contaminam Object.prototype", async () => {
      const bodies = [
        '{"__proto__": {"polluted": true, "isAdmin": true}, "content": "x"}',
        '{"constructor": {"prototype": {"polluted": true}}, "content": "x"}',
        '{"content": "x", "title": {"__proto__": {"polluted": true}}}',
      ]
      for (const body of bodies) {
        const response = await student.agent.raw.post("/api/me/notes").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/json").send(body)
        expect(response.status).toBeLessThan(500)
        expect(isPolluted()).toBe(false)
      }
      const patch = await student.agent.raw.patch("/api/me/profile").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/json").send('{"__proto__": {"role": "admin"}, "bio": "oi"}')
      expect(bodyOf<Profile>(patch).role).toBe("student")
      expect(isPolluted()).toBe(false)
    })

    it("chaves __proto__ em registros (respostas da prova, configurações) não poluem nem viram configuração mágica", async () => {
      const admin = await signUp(ctx.app, "admin", ctx.db)
      const settings = await admin.agent.raw.put("/api/admin/settings").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/json").send('{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}}')
      expect(settings.status).toBeLessThan(500)
      expect(isPolluted()).toBe(false)
      const rows = await ctx.db.select().from(platformSettings)
      expect(rows.map((row) => row.key).sort()).not.toContain("polluted")
      const quiz = await student.agent.raw.post("/api/lessons/00000000-0000-4000-8000-000000000000/quiz/submissions").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/json").send('{"answers": {"__proto__": {"polluted": 1}}}')
      expect(quiz.status).toBeLessThan(500)
      expect(isPolluted()).toBe(false)
    })
  })

  describe("bombas de tamanho e profundidade", () => {
    it("corpo JSON acima de 1 MB recebe 413 sem derrubar a API", async () => {
      const big = JSON.stringify({ content: "a".repeat(1_100_000) })
      const response = await student.agent.raw.post("/api/me/notes").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/json").send(big)
      expect(response.status).toBe(413)
      expect((await student.agent.get("/api/auth/me")).status).toBe(200)
    })

    it("JSON aninhado a 200 mil níveis não gera 500 nem derruba o processo", async () => {
      const depth = 200_000
      const bomb = `{"content":${"[".repeat(depth)}${"]".repeat(depth)}}`
      const response = await student.agent.raw.post("/api/me/notes").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/json").send(bomb)
      expect([400, 413]).toContain(response.status)
      expect((await student.agent.get("/api/auth/me")).status).toBe(200)
    })

    it("JSON malformado e tipo de conteúdo inesperado respondem 400 genérico", async () => {
      const malformed = await student.agent.raw.post("/api/me/notes").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/json").send('{"content": "x",')
      expect(malformed.status).toBe(400)
      expect(malformed.text).not.toMatch(/SyntaxError|Unexpected|at JSON\.parse|node_modules/)
      const xml = await student.agent.raw.post("/api/me/notes").set(CSRF_HEADER_NAME, "1").set("Content-Type", "application/xml").send("<?xml version='1.0'?><!DOCTYPE x [<!ENTITY e SYSTEM 'file:///etc/passwd'>]><x>&e;</x>")
      expect(xml.status).toBe(400)
      expect(xml.text).not.toContain("root:")
    })

    it("listas e textos acima do contrato são recusados (projeto de código, tags, alternativas)", async () => {
      const files = Array.from({ length: 31 }, (_, index) => ({ path: `f${index}.py`, content: "x" }))
      expect((await student.agent.put("/api/lessons/00000000-0000-4000-8000-000000000000/snapshot", { files })).status).toBe(400)
      const huge = [{ path: "main.py", content: "x".repeat(100_001) }]
      expect((await student.agent.put("/api/lessons/00000000-0000-4000-8000-000000000000/snapshot", { files: huge })).status).toBe(400)
      expect((await teacher.agent.post("/api/courses", { title: "Tags", tags: Array.from({ length: 21 }, () => "t") })).status).toBe(400)
    })
  })

  describe("ReDoS", () => {
    it("regex que recebem texto do usuário respondem rápido com 50 mil caracteres hostis", async () => {
      const evil = `${"a".repeat(50_000)}!`
      const probes = [
        (): HttpTest => agent(ctx.app).post("/api/auth/sign-in", { email: `${"a.".repeat(25_000)}@`, password: "x" }),
        (): HttpTest => agent(ctx.app).post("/api/auth/sign-up", { email: `${"a".repeat(50_000)}@${"b".repeat(50_000)}`, password: "senhaForte123", full_name: "x" }),
        (): HttpTest => agent(ctx.app).get(`/api/certificates/${"A-".repeat(25_000)}`),
        (): HttpTest => agent(ctx.app).get(`/api/files/${"0-".repeat(25_000)}.png`),
        (): HttpTest => student.agent.patch("/api/me/profile", { username: evil }),
        (): HttpTest => student.agent.put("/api/lessons/00000000-0000-4000-8000-000000000000/snapshot", { files: [{ path: `${"a/".repeat(90)}x.py!`, content: "" }] }),
        (): HttpTest => teacher.agent.post("/api/lessons", { title: "Regex", content_markdown: `<${"a".repeat(50_000)}` }),
      ]
      for (const probe of probes) {
        const startedAt = Date.now()
        const response = await probe()
        expect(Date.now() - startedAt).toBeLessThan(MAX_REGEX_RESPONSE_MS)
        expect(response.status).toBeLessThan(500)
      }
    })
  })

  describe("travessia de caminho", () => {
    it("arquivos públicos só por nome UUID; ../, codificação dupla e byte nulo dão 404", async () => {
      for (const name of ["..%2F..%2Fetc%2Fpasswd", "%2e%2e%2f%2e%2e%2fpackage.json", "..%252f..%252fetc%252fpasswd", "x.png%00.txt", "....//....//etc/passwd", "%2Fetc%2Fpasswd"]) {
        const response = await agent(ctx.app).get(`/api/files/${name}`)
        expect(response.status).toBe(404)
        expect(response.text).not.toMatch(/root:|"name":\s*"@levelusp/)
      }
    })

    it("caminhos de arquivo do projeto do aluno não escapam do diretório", async () => {
      for (const path of ["../main.py", "/etc/passwd.py", "a/../../b.py", "C:\\x.py", "..\\..\\x.py", "main.py\u0000.txt", "~/.ssh/id.py", "%2e%2e/x.py"]) {
        const response = await student.agent.put("/api/lessons/00000000-0000-4000-8000-000000000000/snapshot", { files: [{ path, content: "" }] })
        expect(response.status).toBe(400)
      }
    })
  })

  describe("injeção em cabeçalho e log", () => {
    it("x-request-id do cliente só é reaproveitado se for um identificador simples", async () => {
      const forged = await agent(ctx.app).raw.get("/api/health/live").set("x-request-id", "id falso\" level=error msg=\"admin logou")
      expect(forged.headers["x-request-id"]).not.toContain("admin logou")
      expect(forged.headers["x-request-id"]).toMatch(/^[\w.-]{1,64}$/)
      const legit = await agent(ctx.app).raw.get("/api/health/live").set("x-request-id", "cf-ray.8a1b2c3d-GRU")
      expect(legit.headers["x-request-id"]).toBe("cf-ray.8a1b2c3d-GRU")
    })
  })
})
