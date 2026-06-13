"use client"

import { useEffect, useCallback, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { CheckCircle2, Zap, Star, ArrowRight, Award } from "lucide-react"
import { XpParticles } from "@/components/gamification/xp-particles"
import { LevelUpModal } from "@/components/gamification/level-up-modal"

interface SuccessFeedbackProps {
  show: boolean
  xpEarned: number
  hasNextLesson?: boolean
  isCourseEnd?: boolean
  prevLevel?: number
  newLevel?: number
  xpBadgeRef?: React.RefObject<HTMLElement | null>
  onClose: () => void
  onNext?: () => void
}

function firePurpleConfetti() {
  const colors = ["#7C3AED", "#A78BFA", "#C4B5FD", "#DDD6FE", "#FFFFFF"]

  confetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6, x: 0.5 },
    colors,
    shapes: ["circle", "square"],
    gravity: 0.8,
    scalar: 1.2,
    ticks: 200,
  })

  setTimeout(() => {
    confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors })
    confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors })
  }, 150)
}

export function SuccessFeedback({
  show,
  xpEarned,
  hasNextLesson = false,
  isCourseEnd = false,
  prevLevel,
  newLevel,
  xpBadgeRef,
  onClose,
  onNext,
}: SuccessFeedbackProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [fireParticles, setFireParticles] = useState(false)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const didLevelUp = newLevel != null && prevLevel != null && newLevel > prevLevel

  useEffect(() => {
    if (show) {
      firePurpleConfetti()
      // Fire particles after brief delay so card is visible
      const t = setTimeout(() => setFireParticles(true), 500)
      return () => clearTimeout(t)
    } else {
      setFireParticles(false)
    }
  }, [show])

  const handleParticlesComplete = useCallback(() => {
    setFireParticles(false)
    if (didLevelUp) {
      setTimeout(() => setShowLevelUp(true), 300)
    }
  }, [didLevelUp])

  const handleClose = useCallback(() => onClose(), [onClose])
  const handleNext = useCallback(() => {
    onClose()
    onNext?.()
  }, [onClose, onNext])

  return (
    <>
      {/* Particles flying to XP badge */}
      {xpBadgeRef && (
        <XpParticles
          trigger={fireParticles}
          count={xpEarned > 0 ? Math.min(120, xpEarned) : 60}
          sourceRef={cardRef as React.RefObject<HTMLElement | null>}
          targetRef={xpBadgeRef}
          onComplete={handleParticlesComplete}
        />
      )}

      {/* Level-up modal (shown after particles finish) */}
      <LevelUpModal
        show={showLevelUp}
        newLevel={newLevel ?? 1}
        onClose={() => setShowLevelUp(false)}
      />

      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          >
            <motion.div
              ref={cardRef}
              initial={{ scale: 0.5, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              {/* Header gradient */}
              <div className="relative bg-linear-to-br from-level-purple to-level-purple-dark px-8 pb-12 pt-8 text-center">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="absolute left-6 top-6"
                >
                  <Star className="h-6 w-6 fill-yellow-300 text-yellow-300" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: "spring" }}
                  className="absolute right-8 top-10"
                >
                  <Star className="h-4 w-4 fill-yellow-300 text-yellow-300" />
                </motion.div>

                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur"
                >
                  <CheckCircle2 className="h-12 w-12 text-white" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-white"
                >
                  Parabéns!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-1 text-sm text-white/80"
                >
                  Você completou o desafio com sucesso!
                </motion.p>
              </div>

              {/* XP Badge flutuante */}
              <motion.div
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 250 }}
                className="relative -mt-6 flex justify-center"
              >
                <motion.div
                  animate={{ boxShadow: ["0 0 0px #FACC15", "0 0 20px #FACC15", "0 0 0px #FACC15"] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                  className="flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-lg ring-4 ring-level-purple/20"
                >
                  <Zap className="h-6 w-6 text-yellow-500" />
                  <span className="text-2xl font-bold text-level-purple-dark">+{xpEarned} XP</span>
                </motion.div>
              </motion.div>

              {/* Ações */}
              <div className="px-8 pb-8 pt-6 text-center">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mb-6 text-sm text-muted-foreground"
                >
                  Continue praticando para subir de nível e manter seu streak!
                </motion.p>

                <div className="flex flex-col gap-3">
                  {isCourseEnd && onNext && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 }}
                      onClick={handleNext}
                      className="btn-3d w-full rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.02] shadow-lg shadow-yellow-400/30 flex items-center justify-center gap-2"
                    >
                      <Award className="h-4 w-4" />
                      Ver Certificado
                    </motion.button>
                  )}
                  {hasNextLesson && onNext && !isCourseEnd && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.65 }}
                      onClick={handleNext}
                      className="btn-3d w-full rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-medium flex items-center justify-center gap-2"
                    >
                      Próxima Lição
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  )}
                  <motion.button
        