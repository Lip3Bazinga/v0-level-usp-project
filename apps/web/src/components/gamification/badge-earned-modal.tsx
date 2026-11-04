"use client"

import { motion } from "framer-motion"
import { Shield, Star, Sparkles } from "lucide-react"
import { isBadgeIconName } from "@/lib/badge-icons"
import { CELEBRATION_AUTO_CLOSE_MS } from "@/lib/constants"
import { BadgeIcon } from "@/components/design-system/badge-icon"
import { CelebrationModal } from "@/components/gamification/celebration-modal"
import { fireConfetti, useCelebration } from "@/components/gamification/celebration"

interface BadgeEarnedModalProps {
  isOpen: boolean
  badgeName: string
  badgeDescription?: string
  badgeIcon?: string
  onClose: () => void
}

const SPARKLE_POSITIONS = [0, 1, 2, 3, 4, 5]

/**
 * O seed e o admin gravam o NOME do ícone lucide (ex.: "Rocket"); badges antigas guardam um
 * emoji, que segue como texto. Um nome desconhecido não deve aparecer escrito no lugar do ícone.
 */
const ICON_NAME_PATTERN = /^[A-Za-z0-9_-]+$/

function fireBadgeConfetti() {
  fireConfetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.45, x: 0.5 },
    colors: ["#7C3AED", "#A78BFA", "#C4B5FD", "#FACC15", "#FFFFFF"],
    shapes: ["circle"],
    gravity: 0.6,
    scalar: 1.1,
    ticks: 250,
    zIndex: 10001,
  })
}

function EarnedBadgeIcon({ icon }: { icon?: string }) {
  if (icon && isBadgeIconName(icon)) return <BadgeIcon name={icon} className="h-10 w-10 text-level-purple" />
  if (icon && !ICON_NAME_PATTERN.test(icon)) return <span className="text-4xl" aria-hidden="true">{icon}</span>
  return <Shield className="h-10 w-10 text-level-purple" />
}

export function BadgeEarnedModal({ isOpen, badgeName, badgeDescription, badgeIcon, onClose }: BadgeEarnedModalProps) {
  useCelebration(isOpen, { celebrate: fireBadgeConfetti, onClose, autoCloseMs: CELEBRATION_AUTO_CLOSE_MS.badgeEarned })

  return (
    <CelebrationModal
      isOpen={isOpen}
      onClose={onClose}
      backdropClassName="z-[10001] bg-black/60"
      motion={{
        initial: { scale: 0.4, opacity: 0, rotateY: -90 },
        animate: { scale: 1, opacity: 1, rotateY: 0 },
        exit: { scale: 0.7, opacity: 0 },
        transition: { type: "spring", stiffness: 220, damping: 18, delay: 0.05 },
      }}
      aria-labelledby="badge-earned-title"
      aria-describedby={badgeDescription ? "badge-earned-desc" : undefined}
      className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
    >
      <div className="relative bg-gradient-to-br from-level-purple to-level-purple-dark px-6 pb-16 pt-8 text-center">
        {SPARKLE_POSITIONS.map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ delay: 0.3 + i * 0.15, duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
            className="absolute"
            style={{
              top: `${10 + (i % 3) * 25}%`,
              left: i < 3 ? `${5 + i * 8}%` : "auto",
              right: i >= 3 ? `${5 + (i - 3) * 8}%` : "auto",
            }}
          >
            <Sparkles className="h-4 w-4 text-yellow-300/80" />
          </motion.div>
        ))}

        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-2 text-xs font-bold uppercase tracking-widest text-white/70"
        >
          Novo Emblema Desbloqueado!
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          id="badge-earned-title"
          className="text-xl font-black text-white"
        >
          {badgeName}
        </motion.p>
      </div>

      <motion.div
        initial={{ scale: 0, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.35, type: "spring", stiffness: 260 }}
        className="relative -mt-10 flex justify-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-level-purple">
          <EarnedBadgeIcon icon={badgeIcon} />
        </div>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 3 + i, repeat: Infinity, ease: "linear", delay: i * 0.4 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Star
              className="absolute h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
              style={{ transform: `translateY(-${40 + i * 6}px) rotate(${i * 120}deg)` }}
            />
          </motion.div>
        ))}
      </motion.div>

      <div className="px-6 pb-7 pt-4 text-center">
        {badgeDescription && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            id="badge-earned-desc"
            className="mb-5 text-sm text-muted-foreground"
          >
            {badgeDescription}
          </motion.p>
        )}
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={onClose}
          className="w-full rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-all hover:bg-level-purple-dark hover:scale-[1.02]"
        >
          Incrível! Continuar
        </motion.button>
      </div>
    </CelebrationModal>
  )
}
