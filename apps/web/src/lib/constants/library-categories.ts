import type { LibraryCategory } from "@levelusp/contracts"

/** Rótulos das categorias do catálogo de bibliotecas Python (a ordem de exibição é a de `LIBRARY_CATEGORIES`). */
export const LIBRARY_CATEGORY_LABELS: Record<LibraryCategory, string> = {
  "data-science": "Ciência de Dados",
  ml: "Machine Learning",
  "deep-learning": "Deep Learning",
  visualization: "Visualização",
  math: "Matemática",
  general: "Geral",
}
