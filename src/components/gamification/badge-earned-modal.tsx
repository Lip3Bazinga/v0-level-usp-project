"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { Shield, Star, Sparkles } from "lucide-react"

interface BadgeEarnedModalProps {
  show: boolean
  badgeName: string
  badgeDescription?: string
  badgeIcon?: string
  onClose: () => void
}

function fireBadgeConfetti() {
  const colors = ["#7C3AED", "#A78BFA", "#C4B5FD", "#FACC15", "#FFFFFF"]
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.45, x: 0.5 },
    colors,
    shapes: ["circle"],
    gravity: 0.6,
    scalar: 1.1,
    ticks: 250,
    zIndex: 10001,
  })
}

export function BadgeEarnedModal({ show, badgeName, badgeDescription, badgeIcon, onClose }: BadgeEarnedModalProps) {
  useEffect(() => {
    if (show) {
      fireBadgeConfetti()
      const timer = setTimeout(onClose, 6000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  const handleClose = useCallback(() => onClose(), [onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Top gradient header */}
            <div className="relative bg-gradient-to-br from-level-purple to-level-purple-dark px-6 pb-16 pt-8 text-center">
              {/* Sparkle decorations */}
              {[...Array(6)].map((_, i) => (
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
                className="text-xl font-black text-white"
              >
                {badgeName}
              </motion.p>
            </div>

            {/* Floating badge icon */}
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 260 }}
              className="relative -mt-10 flex justify-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-level-purple">
                {badgeIcon ? (
                  <span className="text-4xl">{badgeIcon}</span>
                ) : (
                  <Shield className="h-10 w-10 text-level-purple" />
                )}
              </div>
              {/* Orbiting stars */}
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

            {/* Content */}
            <div className="px-6 pb-7 pt-4 text-center">
              {badgeDescription && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mb-5 text-sm text-muted-foreground"
                >
                  {badgeDescription}
                </motion.p>
              )}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                onClick={handleClose}
                className="w-full rounded-xl bg-level-purple py-3 text-sm font-bold text-white transition-all hover:bg-level-purple-dark hover:scale-[1.02]"
              >
                Incrível! Continuar
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
