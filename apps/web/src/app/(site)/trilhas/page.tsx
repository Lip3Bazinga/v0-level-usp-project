import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2, Clock, Code2 } from "lucide-react"
import {
  LEARNING_TRACKS,
  TRACK_FEATURES,
  TRACK_LEVEL_BADGE_CLASSES,
} from "@/components/marketing/content/tracks"
import { FinalCta } from "@/components/marketing/final-cta"
import { Reveal, Stagger, StaggerItem } from "@/components/marketing/motion-primitives"
import { PageHero } from "@/components/marketing/page-hero"
import { DIFFICULTY_LABELS, ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Trilhas de aprendizado — Currículo do LevelUSP",
  description:
    "Explore as trilhas de aprendizado do LevelUSP: Python, Ciência de Dados, Desenvolvimento Web e mais. Currículo estruturado, gratuito e baseado em prática real.",
}

type LearningTrack = (typeof LEARNING_TRACKS)[number]

function FeaturesStrip() {
  return (
    <section className="pb-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {TRACK_FEATURES.map((feature) => (
            <StaggerItem
              key={feature.title}
              className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-level-purple-light">
                <feature.icon className="h-5 w-5 text-level-purple" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-level-purple-dark">{feature.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{feature.description}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}

function TrackCard({ track }: { track: LearningTrack }) {
  return (
    <StaggerItem
      whileHover={{ y: -6 }}
      className="flex flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-100"
    >
      <div className="p-7">
        <div className="mb-5 flex items-center justify-between">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: track.accentColor }}
          >
            <track.icon className="h-7 w-7 text-white" />
          </div>
          <span
            className={cn("rounded-full px-3 py-1 text-xs font-semibold", TRACK_LEVEL_BADGE_CLASSES[track.level])}
          >
            {DIFFICULTY_LABELS[track.level]}
          </span>
        </div>
        <h3 className="text-xl font-bold text-level-purple-dark">{track.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">{track.description}</p>

        <ul className="mt-5 space-y-2">
          {track.modules.map((moduleTitle) => (
            <li key={moduleTitle} className="flex items-center gap-2 text-sm text-gray-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-level-purple" />
              {moduleTitle}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-gray-100 px-7 py-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-4 w-4" /> {track.lessonCount} lições
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> {track.hours}h
        </span>
      </div>
    </StaggerItem>
  )
}

export default function TracksPage() {
  return (
    <>
      <PageHero
        eyebrow="Trilhas de aprendizado"
        icon={<Code2 className="h-4 w-4" />}
        title={
          <>
            Um <span className="gradient-text">currículo completo</span>, do primeiro código à IA
          </>
        }
        description="Trilhas estruturadas que levam você do absoluto zero até habilidades avançadas, sempre com prática real na IDE e projetos avaliados automaticamente."
      />

      <FeaturesStrip />

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Stagger className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {LEARNING_TRACKS.map((track) => (
              <TrackCard key={track.title} track={track} />
            ))}
          </Stagger>

          <Reveal className="mt-12 text-center">
            <Link
              href={ROUTES.courses}
              className="inline-flex items-center gap-2 rounded-2xl bg-level-purple px-8 py-4 text-lg font-semibold text-white btn-3d"
            >
              Ver catálogo completo
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Reveal>
        </div>
      </section>

      <FinalCta
        title="Escolha sua trilha e comece agora"
        description="Todas as trilhas são gratuitas e você pode começar por onde quiser. Crie sua conta e dê o primeiro passo na sua jornada em tecnologia."
      />
    </>
  )
}
