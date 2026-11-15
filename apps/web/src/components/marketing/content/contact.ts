import { Bug, Github, MapPin, type LucideIcon } from "lucide-react"
import { CAMPUS_ADDRESS, GITHUB_ISSUES_URL, GITHUB_REPOSITORY, GITHUB_URL } from "./site"

interface ContactChannel {
  icon: LucideIcon
  title: string
  value: string
  /** Canais sem link (endereço) são só informativos. */
  href?: string
}

export const CONTACT_CHANNELS: readonly ContactChannel[] = [
  { icon: Github, title: "Repositório", value: GITHUB_REPOSITORY, href: GITHUB_URL },
  { icon: Bug, title: "Dúvidas e problemas", value: "Abra uma issue no GitHub", href: GITHUB_ISSUES_URL },
  { icon: MapPin, title: "Localização", value: CAMPUS_ADDRESS },
]
