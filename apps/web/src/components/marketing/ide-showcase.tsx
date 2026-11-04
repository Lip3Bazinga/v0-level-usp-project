"use client"

import Link from "next/link"
import { CheckCircle2, Code2, FileCode, Terminal, Trophy, Zap, type LucideIcon } from "lucide-react"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { Reveal, motion } from "./motion-primitives"
import { SectionIntro } from "./section-heading"
import {
  IDE_SAMPLE_CODE,
  IDE_SAMPLE_FILE_NAME,
  IDE_SAMPLE_OUTPUT,
  IDE_SAMPLE_PROJECT_FILES,
  type CodeLine,
  type CodeTokenKind,
} from "./content/home"

const TOKEN_CLASS: Record<CodeTokenKind, string> = {
  keyword: "text-[#C586C0]",
  function: "text-[#DCDCAA]",
  punctuation: "text-gray-300",
  comment: "text-[#6A9955]",
  variable: "text-[#9CDCFE]",
  number: "text-[#B5CEA8]",
  string: "text-[#CE9178]",
}

/** As linhas de código "digitam" em sequência; o console aparece depois da última. */
const CODE_LINE_DELAY_SECONDS = 0.3
const CODE_LINE_STAGGER_SECONDS = 0.1
const CONSOLE_DELAY_SECONDS = 1.1

function CodeLineContent({ line }: { line: CodeLine }) {
  const tokens = line.tokens.map((token, index) =>
    typeof token === "string" ? (
      token
    ) : (
      <span key={index} className={TOKEN_CLASS[token[0]]}>
        {token[1]}
      </span>
    ),
  )
  return line.isIndented ? <span className="pl-4">{tokens}</span> : <>{tokens}</>
}

function CodeEditor() {
  return (
    <div className="bg-[#1E1E2E] p-4 font-mono text-xs sm:text-sm">
      <div className="space-y-1">
        {IDE_SAMPLE_CODE.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: CODE_LINE_DELAY_SECONDS + index * CODE_LINE_STAGGER_SECONDS,
            }}
            className="flex"
          >
            <span className="w-8 select-none text-gray-500">{index + 1}</span>
            <span>
              <CodeLineContent line={line} />
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ProjectFilesSidebar() {
  return (
    <div className="hidden w-48 border-r border-gray-100 bg-gray-50 p-3 sm:block">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Arquivos</p>
      <div className="space-y-1">
        {IDE_SAMPLE_PROJECT_FILES.map((fileName) => (
          <div
            key={fileName}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
              fileName === IDE_SAMPLE_FILE_NAME
                ? "bg-level-purple-light font-medium text-level-purple"
                : "text-gray-600",
            )}
          >
            <FileCode className="h-4 w-4" /> {fileName}
          </div>
        ))}
      </div>
    </div>
  )
}

function ConsolePanel() {
  return (
    <div className="border-t border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Terminal className="h-4 w-4 text-level-purple" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Console
        </span>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: CONSOLE_DELAY_SECONDS }}
        className="rounded-lg bg-[#1E1E2E] p-3 font-mono text-sm"
      >
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>{IDE_SAMPLE_OUTPUT}</span>
        </div>
      </motion.div>
    </div>
  )
}

function IdeWindow() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <FileCode className="h-4 w-4" />
          {IDE_SAMPLE_FILE_NAME} — LevelUSP IDE
        </div>
        <div className="w-16" />
      </div>

      <div className="flex">
        <ProjectFilesSidebar />
        <div className="flex-1">
          <div className="flex border-b border-gray-100">
            <div className="flex items-center gap-2 border-b-2 border-level-purple bg-white px-4 py-2 text-sm font-medium text-level-purple-dark">
              <Code2 className="h-4 w-4 text-level-purple" /> {IDE_SAMPLE_FILE_NAME}
            </div>
          </div>
          <CodeEditor />
          <ConsolePanel />
        </div>
      </div>
    </div>
  )
}

interface FloatingBadgeProps {
  icon: LucideIcon
  iconBackgroundClass: string
  caption: string
  value: string
  valueClass: string
  /** Sobe (negativo) ou desce (positivo) no laço de flutuação. */
  floatOffsetPx: number
  floatDurationSeconds: number
  positionClass: string
}

function FloatingBadge({
  icon: Icon,
  iconBackgroundClass,
  caption,
  value,
  valueClass,
  floatOffsetPx,
  floatDurationSeconds,
  positionClass,
}: FloatingBadgeProps) {
  return (
    <motion.div
      animate={{ y: [0, floatOffsetPx, 0] }}
      transition={{ duration: floatDurationSeconds, repeat: Infinity, ease: "easeInOut" }}
      className={cn("absolute hidden rounded-2xl glass px-4 py-3 md:flex", positionClass)}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            iconBackgroundClass,
          )}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{caption}</p>
          <p className={cn("font-bold", valueClass)}>{value}</p>
        </div>
      </div>
    </motion.div>
  )
}

export function IdeShowcase() {
  return (
    <section id="ide" className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Aprenda fazendo"
          title="Uma IDE completa dentro do navegador"
          description="Escreva, execute e teste código Python real — sem instalar nada. A prática acontece no mesmo lugar onde você lê a teoria."
        />

        <Reveal delay={0.1} className="relative mx-auto mt-16 max-w-5xl">
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-level-purple via-level-purple-medium to-level-purple opacity-20 blur-2xl" />
          <IdeWindow />
          <FloatingBadge
            icon={Zap}
            iconBackgroundClass="bg-level-purple"
            caption="XP ganho"
            value="+50 XP"
            valueClass="text-level-purple-dark"
            floatOffsetPx={-10}
            floatDurationSeconds={4}
            positionClass="-left-4 top-1/4"
          />
          <FloatingBadge
            icon={Trophy}
            iconBackgroundClass="bg-green-500"
            caption="Desafio"
            value="Concluído!"
            valueClass="text-green-600"
            floatOffsetPx={10}
            floatDurationSeconds={5}
            positionClass="-right-4 top-1/2"
          />
        </Reveal>

        <div className="mt-16 text-center">
          <Link
            href={ROUTES.signup}
            className="inline-flex items-center gap-2 rounded-2xl bg-level-purple px-8 py-4 text-lg font-bold text-white btn-3d"
          >
            <Terminal className="h-5 w-5" />
            Experimentar a IDE
          </Link>
        </div>
      </div>
    </section>
  )
}
