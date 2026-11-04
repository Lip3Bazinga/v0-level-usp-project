"use client"

import { useState, type FormEvent } from "react"
import { CheckCircle2, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { CONTACT_SUBJECTS, type ContactSubject } from "./content/contact"

const LABEL_CLASS = "mb-1.5 block text-sm font-medium text-level-purple-dark"
const FIELD_CLASS =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none transition-colors focus:border-level-purple focus:ring-2 focus:ring-[#E9D5FF]"

function ContactSentNotice({ onSendAnother }: { onSendAnother: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-[#E9D5FF] bg-white p-12 text-center shadow-sm">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-level-purple-light">
        <CheckCircle2 className="h-8 w-8 text-level-purple" />
      </div>
      <h3 className="mt-5 text-xl font-bold text-level-purple-dark">Mensagem enviada!</h3>
      <p className="mt-2 max-w-sm text-gray-600">
        Obrigado por entrar em contato. Nossa equipe responderá no seu e-mail o quanto antes.
      </p>
      <button
        type="button"
        onClick={onSendAnother}
        className="mt-6 rounded-xl border-2 border-[#E9D5FF] px-6 py-2.5 font-semibold text-level-purple transition-colors hover:bg-level-purple-light"
      >
        Enviar outra mensagem
      </button>
    </div>
  )
}

interface SubjectPickerProps {
  selected: ContactSubject
  onSelect: (subject: ContactSubject) => void
}

function SubjectPicker({ selected, onSelect }: SubjectPickerProps): React.JSX.Element {
  return (
    <div className="mt-5">
      <span className={LABEL_CLASS}>Assunto</span>
      <div className="flex flex-wrap gap-2">
        {CONTACT_SUBJECTS.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => onSelect(subject)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              subject === selected
                ? "bg-level-purple text-white"
                : "bg-level-purple-light text-level-purple hover:bg-[#E9D5FF]",
            )}
          >
            {subject}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ContactForm(): React.JSX.Element {
  const [isSent, setIsSent] = useState(false)
  const [subject, setSubject] = useState<ContactSubject>(CONTACT_SUBJECTS[0])

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    // A API ainda não tem endpoint de contato: por enquanto o envio só confirma na tela.
    setIsSent(true)
  }

  if (isSent) return <ContactSentNotice onSendAnother={() => setIsSent(false)} />

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={LABEL_CLASS}>
            Nome
          </label>
          <input id="name" name="name" required className={FIELD_CLASS} placeholder="Seu nome" />
        </div>
        <div>
          <label htmlFor="email" className={LABEL_CLASS}>
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={FIELD_CLASS}
            placeholder="voce@email.com"
          />
        </div>
      </div>

      <SubjectPicker selected={subject} onSelect={setSubject} />

      <div className="mt-5">
        <label htmlFor="message" className={LABEL_CLASS}>
          Mensagem
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className={cn(FIELD_CLASS, "resize-none")}
          placeholder="Como podemos ajudar?"
        />
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-level-purple px-8 py-4 font-semibold text-white btn-3d sm:w-auto"
      >
        <Send className="h-5 w-5" />
        Enviar mensagem
      </button>
    </form>
  )
}
