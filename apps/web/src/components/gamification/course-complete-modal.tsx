"use client"

import { motion } from "framer-motion"
import { Trophy, Star, Award, Download, Zap } from "lucide-react"
import { CelebrationDialog } from "@/components/gamification/celebration-dialog"
import { fireConfetti, fireConfettiAfter, useCelebration } from "@/components/gamification/celebration"

interface CourseCompleteModalProps {
  show: boolean
  courseTitle: string
  courseXp?: number
  hasCertificate?: boolean
  onClose: () => void
  onDownloadCertificate?: () => void
}

const ORBIT_POSITIONS = [0, 1, 2, 3, 4]
const ORBIT_RADIUS_PX = 60
const SIDE_BURST_COUNT = 3
const SIDE_BURST_INTERVAL_MS = 400

function orbitTransform(position: number): string {
  const angle = (position / ORBIT_POSITIONS.length) * Math.PI * 2
  return `translateX(${Math.cos(angle) * ORBIT_RADIUS_PX}px) translateY(${Math.sin(angle) * ORBIT_RADIUS_PX}px)`
}

function fireCourseCompleteConfetti() {
  const shared = { colors: ["#FACC15", "#F59E0B", "#7C3AED", "#A78BFA", "#10B981", "#FFFFFF"], zIndex: 10_000 }
  fireConfetti({
    ...shared,
    particleCount: 200,
    spread: 120,
    origin: { y: 0.5, x: 0.5 },
    shapes: ["circle", "square"],
    gravity: 0.65,
    scalar: 1.5,
    ticks: 350,
  })
  for (let burst = 0; burst < SIDE_BURST_COUNT; burst++) {
    fireConfettiAfter(
      burst * SIDE_BURST_INTERVAL_MS,
      { ...shared, particleCount: 80, angle: 60, spread: 80, origin: { x: 0, y: 0.6 } },
      { ...shared, particleCount: 80, angle: 120, spread: 80, origin: { x: 1, y: 0.6 } },
    )
  }
}

/** Sem fechamento automático: o botão de certificado precisa ficar disponível. */
export function CourseCompleteModal({
  show,
  courseTitle,
  courseXp,
  hasCertificate = false,
  onClose,
  onDownloadCertificate,
}: CourseCompleteModalProps) {
  useCelebration(show, { celebrate: fireCourseCompleteConfetti, onClose })

  return (
    <CelebrationDialog
      isOpen={show}
      onClose={onClose}
      backdropClassName="z-[10000] bg-black/70"
      motion={{
        initial: { scale: 0.3, opacity: 0, y: 60 },
        animate: { scale: 1, opacity: 1, y: 0 },
        exit: { scale: 0.8, opacity: 0 },
        transition: { type: "spring", stiffness: 230, damping: 16, delay: 0.05 },
      }}
      aria-label="Curso concluído"
      className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
    >
      <div className="relative bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 px-6 pb-14 pt-8 text-center">
        {ORBIT_POSITIONS.map((i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 5 + i, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Star
              className="absolute h-4 w-4 fill-white/60 text-white/60"
              style={{ transform: orbitTransform(i) }}
            />
          </motion.div>
        ))}

        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/25 shadow-inner"
        >
          <motion.div
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
          >
            <Trophy className="h-12 w-12 text-white" />
          </motion.div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-black text-white"
        >
          Curso Concluído!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-1 text-sm font-medium text-white/80"
        >
          {courseTitle}
        </motion.p>
      </div>

      <motion.div
        initial={{ scale: 0, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260 }}
        className="relative -mt-7 flex justify-center"
      >
        <div className="flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-lg ring-4 ring-yellow-400/30">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span className="text-lg font-black text-level-purple-dark">+{courseXp ?? 0} XP!</span>
        </div>
      </motion.div>

      <div className="px-7 pb-7 pt-5 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-5 text-sm text-muted-foreground"
        >
          Parabéns! Você completou todas as lições deste curso. Seu esforço e dedicação foram incríveis!
        </motion.p>

        {hasCertificate && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            onClick={onDownloadCertificate}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-yellow-400/30 transition-all hover:scale-[1.02] hover:shadow-xl"
          >
            <Award className="h-5 w-5" />
            Baixar Certificado
            <Download className="h-4 w-4" />
          </motion.button>
        )}

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: hasCertificate ? 0.7 : 0.6 }}
          onClick={onClose}
          className="w-full rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-all hover:bg-level-purple-dark hover:scale-[1.02]"
        >
          Continuar Aprendendo
        </motion.button>
      </div>
    </CelebrationDialog>
  )
}
