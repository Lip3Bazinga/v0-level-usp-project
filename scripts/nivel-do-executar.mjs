// Em que lição um aluno típico chega ao nível que libera o "Executar"?
//
// Uso (depois de `pnpm build`, que gera o dist do contracts):
//   node scripts/nivel-do-executar.mjs            nível = RUN_BUTTON_MIN_LEVEL, a trilha inteira
//   node scripts/nivel-do-executar.mjs 4          outro nível
//   node scripts/nivel-do-executar.mjs 4 n1-fundamentos   só um curso (a conta recomeça do zero)
//
// Aluno típico: faz tudo na ordem da trilha e nunca vê a solução (XP cheio de cada passo).
// XP contado: o de cada passo (`steps[].xp`) mais o da lição (`xp_reward`) ao concluí-la — a mesma
// soma do GamificationService. Fora da conta: badges e sequência (não dão XP), provas e certificados
// (não dão XP) e a metade do XP de passo com solução vista.
import { readFileSync } from "node:fs"
import * as contracts from "../packages/contracts/dist/index.js"

const BUNDLE_PATH = new URL("../packages/db/seed/trilha-python-ia.json", import.meta.url)

const [levelArgument, courseSlug] = process.argv.slice(2)
const targetLevel = Number(levelArgument ?? contracts.RUN_BUTTON_MIN_LEVEL)
if (!Number.isInteger(targetLevel) || targetLevel < 1) {
  console.error("Informe o nível (inteiro ≥ 1) ou rode `pnpm build` para o contracts exportar RUN_BUTTON_MIN_LEVEL.")
  process.exit(1)
}

const bundle = JSON.parse(readFileSync(BUNDLE_PATH, "utf8"))
const orderedSlugs = bundle.tracks.flatMap((track) => track.courses)
const courses = (courseSlug ? [courseSlug] : orderedSlugs).map((slug) => {
  const course = bundle.courses.find((candidate) => candidate.slug === slug)
  if (!course) throw new Error(`curso "${slug}" não está no pacote`)
  return course
})

let totalXp = 0
let lessonNumber = 0
let reached = null
const levelUps = []
for (const course of courses) {
  let lessonInCourse = 0
  for (const module of [...course.modules].sort((first, second) => first.sort_order - second.sort_order)) {
    for (const lesson of module.lessons) {
      lessonNumber += 1
      lessonInCourse += 1
      const levelBefore = contracts.levelForXp(totalXp)
      totalXp += lesson.steps.reduce((sum, step) => sum + step.xp, 0) + lesson.xp_reward
      const level = contracts.levelForXp(totalXp)
      if (level === levelBefore) continue
      const point = { level, course: course.slug, module: module.slug, lesson: lesson.slug, lessonInCourse, lessonNumber, totalXp }
      levelUps.push(point)
      if (!reached && level >= targetLevel) reached = point
    }
  }
  console.log(`${course.slug}: termina com ${totalXp} XP acumulados (nível ${contracts.levelForXp(totalXp)})`)
}

console.log("\nSubidas de nível (ao concluir a lição):")
for (const point of levelUps) {
  console.log(`  nível ${String(point.level).padStart(2)} · ${point.totalXp} XP · ${point.course} · lição ${point.lessonInCourse} do curso (${point.lesson})`)
}

console.log(`\nNível ${targetLevel} pede ${contracts.xpForLevel(targetLevel)} XP.`)
if (reached) {
  console.log(`Chega ao nível ${targetLevel} ao concluir ${reached.lesson} — lição ${reached.lessonInCourse} de ${reached.course} (módulo ${reached.module}), ${reached.lessonNumber}ª da conta, com ${reached.totalXp} XP.`)
} else {
  console.log(`Não chega ao nível ${targetLevel}: o conteúdo contado soma ${totalXp} XP (nível ${contracts.levelForXp(totalXp)}).`)
}
