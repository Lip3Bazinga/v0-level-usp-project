"use client"

import { motion } from "framer-motion"
import { BookOpen, CheckCircle2, Zap } from "lucide-react"
import { CELEBRATION_AUTO_CLOSE_MS } from "@/lib/constants"
import { CelebrationModal } from "@/components/gamification/celebration-modal"
import { fireConfetti, useCelebration } from "@/components/gamification/celebration"

interface EnrollmentModalProps {
  isOpen: boolean
  courseTitle: string
  courseXp?: number
  onClose: () => void
}

const BASE_BENEFITS = ["Acesso completo ao conteúdo", "Progresso salvo automaticamente", "Certificado ao concluir"]

function fireEnrollmentConfetti() {
  fireConfetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.55, x: 0.5 },
    colors: ["#7C3AED", "#A78BFA", "#10B981", "#34D399", "#FFFFFF"],
    gravity: 0.75,
    scalar: 1.1,
    ticks: 220,
    zIndex: 9999,
  })
}

export function EnrollmentModal({ isOpen, courseTitle, courseXp, onClose }: EnrollmentModalProps) {
  useCelebration(isOpen, { celebrate: fireEnrollmentConfetti, onClose, autoCloseMs: CELEBRATION_AUTO_CLOSE_MS.enrollment })
  const hasCourseXp = Boolean(courseXp)
  const benefits = hasCourseXp ? [...BASE_BENEFITS, `${courseXp} XP ao completar o curso`] : BASE_BENEFITS

  return (
    <CelebrationModal
      isOpen={isOpen}
      onClose={onClose}
      backdropClassName="z-[9999] bg-black/60"
      motion={{
        initial: { scale: 0.5, opacity: 0, y: 30 },
        animate: { scale: 1, opacity: 1, y: 0 },
        exit: { scale: 0.85, opacity: 0 },
        transition: { type: "spring", stiffness: 280, damping: 18 },
      }}
      aria-label="Matrícula realizada"
      className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
    >
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pb-12 pt-7 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 250 }}
          className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"
        >
          <BookOpen className="h-9 w-9 text-white" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-black text-white"
        >
          Matrícula Realizada!
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-1 text-sm text-white/80"
        >
          Bem-vindo ao curso
        </motion.p>
      </div>

      <motion.div
        initial={{ scale: 0, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 260 }}
        className="relative -mt-6 flex justify-center px-4"
      >
        <div className="w-full rounded-2xl bg-white px-5 py-3 shadow-lg ring-4 ring-emerald-500/20 text-center">
          <p className="text-sm font-bold text-gray-900 line-clamp-2">{courseTitle}</p>
        </div>
      </motion.div>

      <div className="px-6 pb-6 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-4 space-y-2"
        >
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              {benefit}
            </div>
          ))}
        </motion.div>

        {hasCourseXp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-level-purple-subtle px-4 py-2"
          >
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold text-level-purple-dark">+{courseXp} XP disponíveis</span>
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={onClose}
          className="w-full rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-all hover:bg-level-purple-dark hover:scale-[1.02]"
        >
          Começar a Aprender!
        </motion.button>
      </div>
    </CelebrationModal>
  )
}
