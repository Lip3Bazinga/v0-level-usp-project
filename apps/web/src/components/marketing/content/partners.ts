interface Partner {
  name: string
  fullName: string
  role: string
}

export const PARTNERS = [
  {
    name: "DCM/FFCLRP-USP",
    fullName:
      "Departamento de Computação e Matemática da Faculdade de Filosofia, Ciências e Letras de Ribeirão Preto da Universidade de São Paulo",
    role: "Apoio institucional",
  },
] as const satisfies readonly Partner[]

export const PARTNERSHIP_BENEFITS = [
  "Acesso a relatórios de impacto e engajamento das suas turmas",
  "Material didático aberto",
  "Co-criação de trilhas voltadas à sua comunidade",
  "Visibilidade como apoiador da democratização da tecnologia",
] as const
