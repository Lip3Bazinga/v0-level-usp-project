import type { UserRole } from "@levelusp/contracts"
import { cn, getInitials } from "@/lib/utils"

const ROLE_AVATAR_CLASSES: Record<UserRole, string> = {
  admin: "bg-destructive/10 text-destructive",
  teacher: "bg-level-purple-light text-level-purple-dark",
  student: "bg-level-purple-subtle text-level-purple",
}

/** Proporção entre o tamanho da fonte das iniciais e o diâmetro do avatar. */
const INITIALS_FONT_RATIO = 0.35

interface UserAvatarProps {
  name: string
  role: UserRole
  sizePx?: number
}

/** Iniciais do usuário num círculo com a cor do papel. */
export function UserAvatar({ name, role, sizePx = 36 }: UserAvatarProps): React.JSX.Element {
  return (
    <div
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold", ROLE_AVATAR_CLASSES[role])}
      style={{ width: sizePx, height: sizePx, fontSize: sizePx * INITIALS_FONT_RATIO }}
    >
      {getInitials(name)}
    </div>
  )
}
