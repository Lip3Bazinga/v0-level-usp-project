import { createElement } from "react"
import { BookOpen, Brain, Code2, Database, type LucideIcon } from "lucide-react"

/** Ícone por título dos cursos conhecidos; os demais usam o livro. */
const COURSE_ICONS: Record<string, LucideIcon> = {
  "Python Básico": Code2,
  "Python Intermediário": Brain,
  "Ciência de Dados": Database,
}

interface CourseIconProps {
  courseTitle: string
  className?: string
}

/** Componente estático (tabela fixa), para não criar um componente novo a cada renderização. */
export function CourseIcon({ courseTitle, className }: CourseIconProps): React.JSX.Element {
  return createElement(COURSE_ICONS[courseTitle] ?? BookOpen, { className })
}
