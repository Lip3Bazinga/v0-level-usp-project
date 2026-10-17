import { createElement } from "react"
import { badgeIcon } from "@/lib/badge-icons"

interface BadgeIconProps {
  /** Nome do ícone salvo na badge (ex.: "Trophy"). */
  name: string
  className?: string
}

/**
 * Ícone de badge pelo nome. Use no lugar de `const Icon = badgeIcon(name)` na
 * renderização, que o React Compiler acusa como componente criado durante o render;
 * aqui o ícone vem de uma tabela fixa, então não há estado a perder.
 */
export function BadgeIcon({ name, className }: BadgeIconProps) {
  return createElement(badgeIcon(name), { className })
}
