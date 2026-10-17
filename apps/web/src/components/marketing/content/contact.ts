import { Clock, Github, Mail, MapPin, type LucideIcon } from "lucide-react"
import { CAMPUS_ADDRESS, CONTACT_EMAIL, CONTACT_EMAIL_HREF, GITHUB_URL } from "./site"

export const CONTACT_SUBJECTS = [
  "Dúvida geral",
  "Suporte ao aluno",
  "Escola parceira",
  "Quero ser voluntário",
  "Imprensa",
] as const

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number]

interface ContactChannel {
  icon: LucideIcon
  title: string
  value: string
  /** Canais sem link (endereço, horário) são só informativos. */
  href?: string
}

export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  { icon: Mail, title: "E-mail", value: CONTACT_EMAIL, href: CONTACT_EMAIL_HREF },
  { icon: Github, title: "GitHub", value: "github.com/levelusp", href: GITHUB_URL },
  { icon: MapPin, title: "Localização", value: CAMPUS_ADDRESS },
  { icon: Clock, title: "Atendimento", value: "Seg. a sex., das 9h às 18h" },
]
