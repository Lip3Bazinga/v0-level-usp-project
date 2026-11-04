import {
  Award, BookOpen, Code2, Crown, Flame, Lightbulb, Medal, Rocket, Star, Target, Trophy, Zap, type LucideIcon,
} from "lucide-react"

/** Ícones disponíveis para badges; a badge guarda só o nome (string) no banco. */
const BADGE_ICONS: Record<string, LucideIcon> = {
  Code2, Flame, Trophy, Zap, Target, BookOpen, Lightbulb, Rocket, Star, Crown, Medal, Award,
}

/** `true` quando o nome salvo na badge é um dos ícones conhecidos (badges antigas guardam emoji). */
export function isBadgeIconName(name: string): boolean {
  return Object.hasOwn(BADGE_ICONS, name)
}

/** Componente do ícone pelo nome salvo; nomes desconhecidos caem em Award. */
export function badgeIcon(name: string): LucideIcon {
  return BADGE_ICONS[name] ?? Award
}

/** Opções do seletor de ícone no cadastro de badges. */
export const BADGE_ICON_NAMES = Object.keys(BADGE_ICONS)
