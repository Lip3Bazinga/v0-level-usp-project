import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import {
  CONTENT_BUNDLE_FORMAT, contentAssetPath, contentAssetUrl, nonEmpty,
  type BundleAsset, type BundleCourse, type BundleExam, type BundleLesson, type BundleModule, type BundleTrack, type ContentAssetType,
} from "@levelusp/contracts"
import { parseLessonFile } from "./lesson-parser"
import { assetVersion, type AssetSource } from "./rich-content"
import { SourceMap, type ContentProblem } from "./source-map"
import { assembleCourse, assembleModule, loadCourseFields, loadExam, loadModuleFields, loadTrack } from "./yaml-content"
import { readYamlFile, YamlSyntaxError } from "./yaml-file"

/**
 * Percorre a árvore de conteúdo (docs/v2/curso-e-passos.md §6):
 *   <raiz>/trilhas/<trilha>.yaml
 *   <raiz>/cursos/<curso>/curso.yaml, prova.yaml, <modulo>/modulo.yaml, <modulo>/NN-<slug>.lvl.md
 *   <raiz>/cursos/<curso>/<modulo>/assets/<imagem>   (só as citadas nas narrativas entram no pacote)
 * e monta o pacote (ainda sem a validação final do schema). Arquivos com
 * problema ficam fora do pacote; os problemas saem com `arquivo:linha`.
 */

/** Pacote montado a partir dos arquivos, antes da validação final. */
export interface CompiledBundle {
  format: typeof CONTENT_BUNDLE_FORMAT
  tracks: BundleTrack[]
  courses: BundleCourse[]
  /** Imagens citadas nas narrativas: `<curso>/<módulo>/<arquivo>` → tipo e conteúdo em base64. */
  assets: Record<string, BundleAsset>
}

/** Contagens para o resumo dos comandos. */
export interface ContentStats {
  tracks: number
  courses: number
  modules: number
  lessons: number
  steps: number
}

/** Resultado da compilação: o pacote, as origens de cada objeto e os problemas dos arquivos. */
export interface CompiledContent {
  bundle: CompiledBundle
  locations: SourceMap
  problems: ContentProblem[]
  stats: ContentStats
}

/** Onde está o conteúdo e como os caminhos aparecem nos relatórios. */
export interface CompileOptions {
  /** Raiz do conteúdo (a pasta com `trilhas/` e `cursos/`). */
  contentDir: string
  /** Os caminhos dos relatórios são relativos a esta pasta (padrão: a raiz do conteúdo). */
  displayRoot?: string
}

const TRACKS_DIR = "trilhas"
const COURSES_DIR = "cursos"
const COURSE_FILE = "curso.yaml"
const EXAM_FILE = "prova.yaml"
const MODULE_FILE = "modulo.yaml"
const ASSETS_DIR = "assets"
const LESSON_SUFFIX = ".lvl.md"
const LESSON_FILE_NAME = /^(\d+)-([a-z0-9]+(?:-[a-z0-9]+)*)\.lvl\.md$/
const YAML_EXTENSIONS = [".yaml", ".yml"]
/** Pastas auxiliares (imagens, rascunhos) que o compilador ignora. */
const IGNORED_PREFIXES = [".", "_"]

interface Walker {
  contentDir: string
  displayRoot: string
  locations: SourceMap
  problems: ContentProblem[]
  assets: Record<string, BundleAsset>
}

/** Curso e módulo de uma lição: formam o caminho público das imagens dela. */
interface ModuleScope {
  courseSlug: string
  moduleSlug: string
}

/**
 * Imagens de um módulo: lidas de `<módulo>/assets/` e, quando citadas, incluídas no pacote
 * sob `<curso>/<módulo>/<arquivo>`. A URL devolvida leva a versão (hash) do conteúdo.
 */
function moduleAssets(walker: Walker, moduleDir: string, scope: ModuleScope): AssetSource {
  const assetsDir = path.join(moduleDir, ASSETS_DIR)
  return {
    read(fileName: string): Uint8Array | null {
      const absolutePath = path.join(assetsDir, fileName)
      // O nome já foi validado (sem barras), mas o caminho resolvido é conferido de novo antes de ler.
      if (path.dirname(absolutePath) !== assetsDir || !existsSync(absolutePath) || !statSync(absolutePath).isFile()) return null
      return new Uint8Array(readFileSync(absolutePath))
    },
    publish(fileName: string, contentType: ContentAssetType, bytes: Uint8Array): string {
      const assetPath = contentAssetPath(scope.courseSlug, scope.moduleSlug, fileName)
      walker.assets[assetPath] = { content_type: contentType, base64: Buffer.from(bytes).toString("base64") }
      return contentAssetUrl(assetPath, assetVersion(bytes))
    },
  }
}

/** Caminho relativo à base de exibição; fora dela (ex.: pasta temporária), o caminho absoluto. */
function display(walker: Walker, absolutePath: string): string {
  const relative = path.relative(walker.displayRoot, absolutePath)
  if (relative.startsWith("..")) return absolutePath
  return relative.split(path.sep).join("/")
}

function listDirectories(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !IGNORED_PREFIXES.some((prefix) => entry.name.startsWith(prefix)))
    .map((entry) => entry.name)
    .sort()
}

function listFiles(dir: string, accept: (name: string) => boolean): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && accept(entry.name))
    .map((entry) => entry.name)
    .sort()
}

/** Lê um YAML; erro de sintaxe vira problema e devolve null. */
function readYaml(walker: Walker, absolutePath: string): ReturnType<typeof readYamlFile> | null {
  try {
    return readYamlFile(absolutePath, display(walker, absolutePath))
  } catch (error) {
    if (!(error instanceof YamlSyntaxError)) throw error
    walker.problems.push({ file: error.file, line: error.line, message: error.message })
    return null
  }
}

function compileTracks(walker: Walker): BundleTrack[] {
  const tracksDir = path.join(walker.contentDir, TRACKS_DIR)
  if (!existsSync(tracksDir)) return []
  const tracks: BundleTrack[] = []
  for (const name of listFiles(tracksDir, (file) => YAML_EXTENSIONS.includes(path.extname(file)))) {
    const yaml = readYaml(walker, path.join(tracksDir, name))
    const track = yaml && loadTrack(yaml, walker.problems, walker.locations)
    if (track) tracks.push(track)
  }
  return tracks.sort((left, right) => left.sort_order - right.sort_order || left.slug.localeCompare(right.slug))
}

interface LessonFile {
  name: string
  order: number
}

/** Arquivos `NN-slug.lvl.md` do módulo, na ordem do prefixo numérico. */
function listLessonFiles(walker: Walker, moduleDir: string): LessonFile[] {
  const files: LessonFile[] = []
  for (const name of listFiles(moduleDir, (file) => file.endsWith(LESSON_SUFFIX))) {
    const match = LESSON_FILE_NAME.exec(name)
    if (!match) {
      walker.problems.push({ file: display(walker, path.join(moduleDir, name)), line: null, message: "nome de arquivo de lição inválido: use NN-slug.lvl.md (ex.: 01-ola-python.lvl.md)" })
      continue
    }
    const order = Number(match[1])
    const clash = files.find((file) => file.order === order)
    if (clash) {
      walker.problems.push({ file: display(walker, path.join(moduleDir, name)), line: null, message: `prefixo ${match[1] ?? ""} repetido no módulo (também em ${clash.name}); a ordem das lições ficaria ambígua` })
      continue
    }
    files.push({ name, order })
  }
  return files.sort((left, right) => left.order - right.order)
}

function compileLessons(walker: Walker, moduleDir: string, scope: ModuleScope): BundleLesson[] {
  const lessons: BundleLesson[] = []
  const assets = moduleAssets(walker, moduleDir, scope)
  for (const { name } of listLessonFiles(walker, moduleDir)) {
    const absolutePath = path.join(moduleDir, name)
    const parsed = parseLessonFile(readFileSync(absolutePath, "utf8"), display(walker, absolutePath), walker.locations, { assets })
    walker.problems.push(...parsed.problems)
    if (parsed.lesson) lessons.push(parsed.lesson)
  }
  return lessons
}

function compileModule(walker: Walker, moduleDir: string, courseSlug: string): BundleModule | null {
  const moduleFile = path.join(moduleDir, MODULE_FILE)
  if (!existsSync(moduleFile)) {
    walker.problems.push({ file: display(walker, moduleDir), line: null, message: `pasta de módulo sem ${MODULE_FILE} (pastas auxiliares começam com _ ou .)` })
    return null
  }
  const yaml = readYaml(walker, moduleFile)
  const fields = yaml && loadModuleFields(yaml, walker.problems, walker.locations)
  // Módulo com YAML inválido fica fora do pacote; o nome da pasta só serve para ler as lições e apontar os problemas delas.
  const lessons = compileLessons(walker, moduleDir, { courseSlug, moduleSlug: fields?.slug ?? path.basename(moduleDir) })
  return fields ? assembleModule(fields, lessons, walker.locations) : null
}

function compileModules(walker: Walker, courseDir: string, courseSlug: string): BundleModule[] {
  const modules: BundleModule[] = []
  for (const name of listDirectories(courseDir)) {
    const module = compileModule(walker, path.join(courseDir, name), courseSlug)
    if (module) modules.push(module)
  }
  return modules.sort((left, right) => left.sort_order - right.sort_order || left.slug.localeCompare(right.slug))
}

function compileExam(walker: Walker, courseDir: string): BundleExam | null {
  const examFile = path.join(courseDir, EXAM_FILE)
  if (!existsSync(examFile)) return null
  const yaml = readYaml(walker, examFile)
  return yaml && loadExam(yaml, walker.problems, walker.locations)
}

function compileCourse(walker: Walker, courseDir: string): BundleCourse | null {
  const courseFile = path.join(courseDir, COURSE_FILE)
  if (!existsSync(courseFile)) {
    walker.problems.push({ file: display(walker, courseDir), line: null, message: `pasta de curso sem ${COURSE_FILE} (pastas auxiliares começam com _ ou .)` })
    return null
  }
  const yaml = readYaml(walker, courseFile)
  const fields = yaml && loadCourseFields(yaml, walker.problems, walker.locations)
  const exam = compileExam(walker, courseDir)
  const modules = compileModules(walker, courseDir, fields?.slug ?? path.basename(courseDir))
  return fields ? assembleCourse(fields, exam, modules, walker.locations) : null
}

function compileCourses(walker: Walker): BundleCourse[] {
  const coursesDir = path.join(walker.contentDir, COURSES_DIR)
  if (!existsSync(coursesDir) || !statSync(coursesDir).isDirectory()) {
    walker.problems.push({ file: nonEmpty(display(walker, walker.contentDir)) ?? ".", line: null, message: `pasta ${COURSES_DIR}/ não encontrada em ${walker.contentDir}` })
    return []
  }
  const courses: BundleCourse[] = []
  for (const name of listDirectories(coursesDir)) {
    const course = compileCourse(walker, path.join(coursesDir, name))
    if (course) courses.push(course)
  }
  return courses.sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug))
}

/** Contagens do pacote montado. */
export function countContent(bundle: CompiledBundle): ContentStats {
  const modules = bundle.courses.flatMap((course) => course.modules)
  const lessons = modules.flatMap((module) => module.lessons)
  return {
    tracks: bundle.tracks.length,
    courses: bundle.courses.length,
    modules: modules.length,
    lessons: lessons.length,
    steps: lessons.reduce((total, lesson) => total + lesson.steps.length, 0),
  }
}

/**
 * Compila a árvore de conteúdo. Não valida o pacote inteiro (isso é `validateBundle`)
 * nem aplica o lint; devolve o que conseguiu montar e os problemas encontrados.
 */
export function compileContent(options: CompileOptions): CompiledContent {
  const contentDir = path.resolve(options.contentDir)
  const walker: Walker = { contentDir, displayRoot: path.resolve(options.displayRoot ?? contentDir), locations: new SourceMap(), problems: [], assets: {} }
  const tracks = compileTracks(walker)
  const courses = compileCourses(walker)
  const assets = Object.fromEntries(Object.entries(walker.assets).sort(([left], [right]) => left.localeCompare(right)))
  const bundle: CompiledBundle = { format: CONTENT_BUNDLE_FORMAT, tracks, courses, assets }
  return { bundle, locations: walker.locations, problems: walker.problems, stats: countContent(bundle) }
}
