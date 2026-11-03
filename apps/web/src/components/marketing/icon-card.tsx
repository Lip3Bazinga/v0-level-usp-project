import { StaggerItem } from "./motion-primitives"
import type { IconHighlight } from "./content/types"

/** Cartão compacto com ícone, título e texto; filho direto de `<Stagger>`. */
export function IconCard({ icon: Icon, title, description }: IconHighlight): React.JSX.Element {
  return (
    <StaggerItem className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-level-purple-light">
        <Icon className="h-6 w-6 text-level-purple" />
      </div>
      <h3 className="text-lg font-semibold text-level-purple-dark">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p>
    </StaggerItem>
  )
}
