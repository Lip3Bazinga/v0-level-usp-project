"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Zap, Star, ArrowRight, Award } from "lucide-react"
import { XpParticles } from "@/components/gamification/xp-particles"
import { LevelUpModal } from "@/components/gamification/level-up-modal"
import { CelebrationModal } from "@/components/gamification/celebration-modal"
import { fireConfetti, fireConfettiAfter } from "@/components/gamification/celebration"
import { SUCCESS_PARTICLES_DELAY_MS, SUCCESS_LEVEL_UP_DELAY_MS } from "@/lib/constants"
import { cn } from "@/lib/utils"

interface SuccessFeedbackProps {
  isOpen: boolean
  xpEarned: number
  hasNextLesson?: boolean
  isCourseEnd?: boolean
  prevLevel?: number
  newLevel?: number
  /** Selo de XP do cabeçalho: com ele, partículas voam do card até o selo. */
  xpBadgeRef?: RefObject<HTMLElement | null>
  onClose: () => void
  onNext?: () => void
}

interface LevelUpTransition {
  prevLevel: number
  newLevel: number
}

const MAX_PARTICLES = 120
const DEFAULT_PARTICLES = 60

/**
 * Níveis para a animação de subida a partir do resultado da API. Sem o nível
 * anterior conhecido, assume o imediatamente abaixo do novo.
 */
export function getLevelUpTransition(
  result: { level_up: boolean; new_level: number } | null | undefined,
  levelBefore: number | null,
): LevelUpTransition | null {
  if (!result?.level_up) return null
  return { prevLevel: levelBefore ?? result.new_level - 1, newLevel: result.new_level }
}

function firePurpleConfetti() {
  const colors = ["#7C3AED", "#A78BFA", "#C4B5FD", "#DDD6FE", "#FFFFFF"]
  fireConfetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6, x: 0.5 },
    colors,
    shapes: ["circle", "square"],
    gravity: 0.8,
    scalar: 1.2,
    ticks: 200,
  })
  fireConfettiAfter(
    150,
    { particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.65 }, colors },
    { particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.65 }, colors },
  )
}

export function SuccessFeedback({
  isOpen,
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
  const [areParticlesFlying, setAreParticlesFlying] = useState(false)
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false)
  const didLevelUp = newLevel != null && prevLevel != null && newLevel > prevLevel

  if (!isOpen && areParticlesFlying) setAreParticlesFlying(false)

  useEffect(() => {
    if (!isOpen) return
    firePurpleConfetti()
    const timer = setTimeout(() => setAreParticlesFlying(true), SUCCESS_PARTICLES_DELAY_MS)
    return () => clearTimeout(timer)
  }, [isOpen])

  const openLevelUpSoon = useCallback(() => {
    setTimeout(() => setIsLevelUpOpen(true), SUCCESS_LEVEL_UP_DELAY_MS)
  }, [])

  const handleParticlesComplete = useCallback(() => {
    setAreParticlesFlying(false)
    if (didLevelUp) openLevelUpSoon()
  }, [didLevelUp, openLevelUpSoon])

  // Sem alvo para as partículas, a subida de nível aparece ao fechar o card.
  const handleClose = useCallback(() => {
    onClose()
    if (didLevelUp && !xpBadgeRef) openLevelUpSoon()
  }, [onClose, didLevelUp, xpBadgeRef, openLevelUpSoon])

  const handleNext = useCallback(() => {
    onClose()
    onNext?.()
  }, [onClose, onNext])

  return (
    <>
      {xpBadgeRef && (
        <XpParticles
          trigger={areParticlesFlying}
          count={xpEarned > 0 ? Math.min(MAX_PARTICLES, xpEarned) : DEFAULT_PARTICLES}
          sourceRef={cardRef}
          targetRef={xpBadgeRef}
          onComplete={handleParticlesComplete}
        />
      )}

      <LevelUpModal isOpen={isLevelUpOpen} newLevel={newLevel ?? 1} onClose={() => setIsLevelUpOpen(false)} />

      <CelebrationModal
        ref={cardRef}
        isOpen={isOpen}
        onClose={handleClose}
        backdropClassName="z-50 bg-black/60"
        backdropTransition={{ duration: 0.3 }}
        motion={{
          initial: { scale: 0.5, opacity: 0, y: 30 },
          animate: { scale: 1, opacity: 1, y: 0 },
          exit: { scale: 0.8, opacity: 0, y: 20 },
          transition: { type: "spring", stiffness: 300, damping: 20 },
        }}
        aria-labelledby="success-feedback-title"
        className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
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
            className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/25"
          >
            <CheckCircle2 className="h-12 w-12 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            id="success-feedback-title"
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

        <motion.div
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 250 }}
          className="relative -mt-6 flex justify-center"
        >
          <div className="relative flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-lg ring-4 ring-level-purple/20">
            {/* Halo pulsante via opacidade e escala (GPU), sem animar box-shadow. */}
            <motion.span
              aria-hidden
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.15, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.6, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-yellow-400"
              style={{ willChange: "transform, opacity" }}
            />
            <Zap className="relative h-6 w-6 text-yellow-500" />
            <span className="relative text-2xl font-bold text-level-purple-dark">
              {xpEarned > 0 ? `+${xpEarned} XP` : "XP já conquistado"}
            </span>
          </div>
        </motion.div>

        <div className="px-8 pb-8 pt-6 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-6 text-sm text-muted-foreground"
          >
            Continue praticando para subir de nível e manter sua sequência!
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
                className="btn-3d w-full rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark flex items-center justify-center gap-2"
              >
                Próxima Lição
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            )}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={handleClose}
              className={cn(
                "w-full rounded-xl py-3 text-sm font-semibold transition-colors",
                hasNextLesson || isCourseEnd ? "border border-level-purple text-level-purple hover:bg-level-purple-light" : "btn-3d bg-level-purple text-white hover:bg-level-purple-dark",
              )}
            >
              Continuar Aqui
            </motion.button>
          </div>
        </div>
      </CelebrationModal>
    </>
  )
}
