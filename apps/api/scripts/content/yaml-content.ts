import { z } from "zod"
import { bundleCourseSchema, bundleExamSchema, bundleModuleSchema, bundleTrackSchema, type BundleCourse, type BundleExam, type BundleModule, type BundleTrack } from "@levelusp/contracts"
import type { ContentProblem, SourceMap } from "./source-map"
import { translateYamlKeys, validateYaml, type KeySpecMap, type YamlFile } from "./yaml-file"

/**
 * `curso.yaml`, `modulo.yaml`, `prova.yaml` e `trilhas/*.yaml` (docs/v2/curso-e-passos.md §6):
 * chaves pt-BR traduzidas para o pacote e validadas com o schema do pacote,
 * com os padrões aplicados. Cada objeto fica registrado no `SourceMap` com a
 * linha de cada chave.
 */

/** Chaves de `curso.yaml` → campos do curso no pacote. */
export const COURSE_KEYS: KeySpecMap = {
  slug: "slug",
  titulo: "title",
  descricao: "description",
  descricao_longa: "long_description",
  nivel: "level",
  tags: "tags",
  horas: "estimated_hours",
  ordem: "order",
  publicado: "published",
  prerequisito: "prerequisite",
  sequencial: "sequential",
}

/** Chaves de `modulo.yaml` → campos do módulo no pacote. */
export const MODULE_KEYS: KeySpecMap = {
  slug: "slug",
  titulo: "title",
  descricao: "description",
  icone: "icon",
  cor: "color",
  ordem: "sort_order",
}

/** Chaves de uma questão de `prova.yaml`. */
export const EXAM_QUESTION_KEYS: KeySpecMap = {
  enunciado: "prompt",
  opcoes: "options",
  correta: "correct_index",
  explicacao: "explanation",
  topico: "topic",
}

/** Chaves de `prova.yaml` → prova do pacote. */
export const EXAM_KEYS: KeySpecMap = {
  titulo: "title",
  descricao: "description",
  nota_minima: "passing_score",
  tempo_min: "time_limit_minutes",
  intervalo_min: "cooldown_minutes",
  questoes_por_tentativa: "questions_per_attempt",
  questoes: { name: "questions", items: EXAM_QUESTION_KEYS },
}

/** Chaves de `trilhas/<trilha>.yaml` → trilha do pacote. */
export const TRACK_KEYS: KeySpecMap = {
  slug: "slug",
  titulo: "title",
  descricao: "description",
  icone: "icon",
  cor: "color",
  ordem: "sort_order",
  publicada: "published",
  titulo_certificado: "certificate_title",
  cursos: "courses",
}

/** Campos do curso que vêm do `curso.yaml` (prova e módulos vêm de outros arquivos). */
const courseFieldsSchema = z.object(bundleCourseSchema.shape).omit({ exam: true, modules: true })
/** Campos do curso lidos do `curso.yaml`. */
export type CourseFields = z.infer<typeof courseFieldsSchema>

const moduleFieldsSchema = z.object(bundleModuleSchema.shape).omit({ lessons: true })
/** Campos do módulo lidos do `modulo.yaml`. */
export type ModuleFields = z.infer<typeof moduleFieldsSchema>

/** Registra o objeto e a linha de cada chave de primeiro nível do YAML. */
function locate(target: object, yaml: YamlFile, spec: KeySpecMap, locations: SourceMap): void {
  locations.set(target, { file: yaml.file, line: 1 })
  for (const [sourceKey, entry] of Object.entries(spec)) {
    const line = yaml.keyLineOf([], sourceKey)
    if (line !== undefined) locations.setField(target, typeof entry === "string" ? entry : entry.name, line)
  }
}

function loadFields<T extends object>(yaml: YamlFile, spec: KeySpecMap, schema: z.ZodType<T>, problems: ContentProblem[], locations: SourceMap): T | null {
  const translated = translateYamlKeys(yaml, spec, problems)
  if (!translated) return null
  const value = validateYaml(yaml, translated, schema, spec, problems)
  if (value) locate(value, yaml, spec, locations)
  return value
}

/** Campos de `curso.yaml`; null (com os problemas registrados) quando inválido. */
export function loadCourseFields(yaml: YamlFile, problems: ContentProblem[], locations: SourceMap): CourseFields | null {
  return loadFields(yaml, COURSE_KEYS, courseFieldsSchema, problems, locations)
}

/** Campos de `modulo.yaml`. */
export function loadModuleFields(yaml: YamlFile, problems: ContentProblem[], locations: SourceMap): ModuleFields | null {
  return loadFields(yaml, MODULE_KEYS, moduleFieldsSchema, problems, locations)
}

/** Prova de `prova.yaml`, com cada questão localizada na sua linha. */
export function loadExam(yaml: YamlFile, problems: ContentProblem[], locations: SourceMap): BundleExam | null {
  const exam = loadFields(yaml, EXAM_KEYS, bundleExamSchema, problems, locations)
  if (!exam) return null
  exam.questions.forEach((question, index) => {
    locations.set(question, { file: yaml.file, line: yaml.lineOf(["questoes", index]) ?? 1 })
  })
  return exam
}

/** Trilha de `trilhas/<trilha>.yaml`. */
export function loadTrack(yaml: YamlFile, problems: ContentProblem[], locations: SourceMap): BundleTrack | null {
  return loadFields(yaml, TRACK_KEYS, bundleTrackSchema, problems, locations)
}

/** Monta o curso do pacote a partir dos campos, da prova e dos módulos já compilados. */
export function assembleCourse(fields: CourseFields, exam: BundleExam | null, modules: BundleModule[], locations: SourceMap): BundleCourse {
  const course: BundleCourse = { ...fields, exam, modules }
  locations.copy(fields, course)
  return course
}

/** Monta o módulo do pacote a partir dos campos e das lições já lidas. */
export function assembleModule(fields: ModuleFields, lessons: BundleModule["lessons"], locations: SourceMap): BundleModule {
  const module: BundleModule = { ...fields, lessons }
  locations.copy(fields, module)
  return module
}
