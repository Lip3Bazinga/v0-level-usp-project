import {
  Code2, Flame, Trophy, Zap, Target, BookOpen, Lightbulb,
  Rocket, Star, Crown, Medal, Award, type LucideIcon,
} from "lucide-react"

/** Ícones lucide disponíveis para badges (nome string → componente). */
export const BADGE_ICONS: Record<string, LucideIcon> = {
  Code2, Flame, Trophy, Zap, Target, BookOpen, Lightbulb,
  Rocket, Star, Crown, Medal, Award,
}

/** Resolve o nome do ícone para o componente, com fallback em Award. */
export function badgeIcon(name: string): LucideIcon {
  return BADGE_ICONS[name] ?? Award
}

/** Lista de nomes disponíveis (para o seletor no admin). */
export const BADGE_ICON_NAMES = Object.keys(BADGE_ICONS)
