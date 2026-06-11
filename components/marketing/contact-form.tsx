"use client"

import { useState } from "react"
import { Send, CheckCircle2 } from "lucide-react"

const SUBJECTS = ["Dúvida geral", "Suporte ao aluno", "Escola parceira", "Quero ser voluntário", "Imprensa"]

export function ContactForm() {
  const [sent, setSent] = useState(false)
  const [subject, setSubject] = useState(SUBJECTS[0])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Front-end only: simulate submission. Wire to a backend/email service when available.
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-[#E9D5FF] bg-white p-12 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F3E8FF]">
          <CheckCircle2 className="h-8 w-8 text-[#7C3AED]" />
        </div>
        <h3 className="mt-5 text-xl font-bold text-[#4C1D95]">Mensagem enviada!</h3>
        <p className="mt-2 max-w-sm text-gray-600">
          Obrigado por entrar em contato. Nossa equipe responderá no seu e-mail o quanto antes.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 rounded-xl border-2 border-[#E9D5FF] px-6 py-2.5 font-semibold text-[#7C3AED] transition-colors hover:bg-[#F3E8FF]"
        >
          Enviar outra mensagem
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#4C1D95]">
            Nome
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition-colors focus:border-[#7C3AED] focus:ring-2 focus:ring-[#E9D5FF]"
            placeholder="Seu nome"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#4C1D95]">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition-colors focus:border-[#7C3AED] focus:ring-2 focus:ring-[#E9D5FF]"
            placeholder="voce@email.com"
          />
        </div>
      </div>

      <div className="mt-5">
        <span className="mb-1.5 block text-sm font-medium text-[#4C1D95]">Assunto</span>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSubject(s)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                subject === s
                  ? "bg-[#7C3AED] text-white"
                  : "bg-[#F3E8FF] text-[#7C3AED] hover:bg-[#E9D5FF]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-[#4C1D95]">
          Mensagem
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition-colors focus:border-[#7C3AED] focus:ring-2 focus:ring-[#E9D5FF]"
          placeholder="Como podemos ajudar?"
        />
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] px-8 py-4 font-semibold text-white btn-3d sm:w-auto"
      >
        <Send className="h-5 w-5" />
        Enviar mensagem
      </button>
    </form>
  )
}
