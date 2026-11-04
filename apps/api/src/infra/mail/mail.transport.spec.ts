import { createServer, type Server, type Socket } from "node:net"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { buildSmtpOptions, createMailTransport } from "./mail.transport"

/**
 * Servidor SMTP mínimo, em texto puro (sem STARTTLS), para provar o comportamento
 * real do nodemailer com as nossas opções: entrega, recusa sem TLS e tempo-limite.
 */
interface FakeSmtp {
  port: number
  received: string[]
  close: () => Promise<void>
}

function replyTo(socket: Socket, command: string, state: { inData: boolean; buffer: string }, received: string[]): void {
  if (state.inData) {
    if (command === ".") {
      state.inData = false
      received.push(state.buffer)
      state.buffer = ""
      socket.write("250 2.0.0 OK enfileirado\r\n")
    } else {
      state.buffer += `${command}\n`
    }
    return
  }
  const verb = command.split(" ")[0]?.toUpperCase()
  if (verb === "EHLO") socket.write("250-falso.local\r\n250 8BITMIME\r\n")
  else if (verb === "DATA") {
    state.inData = true
    socket.write("354 pode enviar\r\n")
  } else if (verb === "QUIT") socket.end("221 tchau\r\n")
  else socket.write("250 OK\r\n")
}

async function startFakeSmtp(options: { greets: boolean }): Promise<FakeSmtp> {
  const received: string[] = []
  const sockets = new Set<Socket>()
  const server: Server = createServer((socket) => {
    sockets.add(socket)
    socket.on("close", () => sockets.delete(socket))
    if (!options.greets) return
    const state = { inData: false, buffer: "" }
    let pending = ""
    socket.write("220 falso.local ESMTP\r\n")
    socket.on("data", (chunk: Buffer) => {
      pending += chunk.toString("utf8")
      let lineEnd = pending.indexOf("\r\n")
      while (lineEnd >= 0) {
        replyTo(socket, pending.slice(0, lineEnd), state, received)
        pending = pending.slice(lineEnd + 2)
        lineEnd = pending.indexOf("\r\n")
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const { port } = server.address() as AddressInfo // listen numa porta TCP sempre devolve AddressInfo
  return {
    port,
    received,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy()
        server.close(() => resolve())
      }),
  }
}

const MESSAGE = { from: "LevelUSP <nao-responda@levelusp.usp.br>", to: "aluna@usp.br", subject: "Teste de SMTP", text: "Olá" }

describe("buildSmtpOptions", () => {
  it("smtps:// usa TLS direto; smtp:// exige STARTTLS quando pedido; tempos-limite curtos", () => {
    expect(buildSmtpOptions({ SMTP_URL: "smtps://u:s@smtp.x.com:465", SMTP_REQUIRE_TLS: true, SMTP_TIMEOUT_MS: 5_000 })).toMatchObject({
      requireTLS: false,
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 5_000,
    })
    expect(buildSmtpOptions({ SMTP_URL: "smtp://u:s@smtp.x.com:587", SMTP_REQUIRE_TLS: true, SMTP_TIMEOUT_MS: 5_000 }).requireTLS).toBe(true)
  })

  it("sem SMTP_URL não cria transporte", () => {
    expect(createMailTransport({ SMTP_URL: undefined, SMTP_REQUIRE_TLS: true, SMTP_TIMEOUT_MS: 5_000 })).toBeNull()
  })
})

describe("transporte SMTP real (nodemailer) contra servidor falso", () => {
  let smtp: FakeSmtp | undefined
  afterEach(async () => {
    await smtp?.close()
    smtp = undefined
  })

  it("entrega a mensagem quando TLS não é obrigatório", async () => {
    smtp = await startFakeSmtp({ greets: true })
    const transport = createMailTransport({ SMTP_URL: `smtp://127.0.0.1:${smtp.port}`, SMTP_REQUIRE_TLS: false, SMTP_TIMEOUT_MS: 2_000 })
    await transport?.sendMail(MESSAGE)
    expect(smtp.received).toHaveLength(1)
    expect(smtp.received[0]).toContain("Subject: Teste de SMTP")
  })

  it("com TLS obrigatório, recusa enviar a um servidor sem STARTTLS (nada trafega em claro)", async () => {
    smtp = await startFakeSmtp({ greets: true })
    const transport = createMailTransport({ SMTP_URL: `smtp://127.0.0.1:${smtp.port}`, SMTP_REQUIRE_TLS: true, SMTP_TIMEOUT_MS: 2_000 })
    await expect(transport?.sendMail(MESSAGE)).rejects.toThrow()
    expect(smtp.received).toHaveLength(0)
  })

  it("desiste dentro do tempo-limite quando o servidor não responde", async () => {
    smtp = await startFakeSmtp({ greets: false })
    const transport = createMailTransport({ SMTP_URL: `smtp://127.0.0.1:${smtp.port}`, SMTP_REQUIRE_TLS: false, SMTP_TIMEOUT_MS: 1_000 })
    const startedAt = Date.now()
    await expect(transport?.sendMail(MESSAGE)).rejects.toMatchObject({ code: "ETIMEDOUT" })
    expect(Date.now() - startedAt).toBeLessThan(4_000)
  })
})
