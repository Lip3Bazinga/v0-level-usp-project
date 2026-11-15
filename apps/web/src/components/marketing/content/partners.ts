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
