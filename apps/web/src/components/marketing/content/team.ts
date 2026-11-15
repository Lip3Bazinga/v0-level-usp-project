interface TeamMember {
  name: string
  role: string
  affiliation: string
  initials: string
}

/** Sigla do departamento e da unidade da USP em que o projeto é desenvolvido. */
export const TEAM_AFFILIATION = "DCM/FFCLRP-USP"

/** Nome por extenso de `TEAM_AFFILIATION`. */
export const TEAM_AFFILIATION_FULL_NAME =
  "Departamento de Computação e Matemática da Faculdade de Filosofia, Ciências e Letras de Ribeirão Preto da Universidade de São Paulo"

export const TEAM_MEMBERS = [
  { name: "Filipe Pio Magalhães", role: "Autor", affiliation: TEAM_AFFILIATION, initials: "FM" },
  { name: "Prof. Evandro Ruiz", role: "Orientador", affiliation: TEAM_AFFILIATION, initials: "ER" },
] as const satisfies readonly TeamMember[]
