"use client"

import { useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Flame, Zap } from "lucide-react"

interface StreakAnimationProps {
  show: boolean
  streakDays: number
  isNewStreak?: boolean
  onClose: () => void
}

export function StreakAnimation({ show, streakDays, isNewStreak = true, onClose }: StreakAnimationProps) {
  const handleClose = useCallback(() => onClose(), [onClose])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 w-full max-w-xs overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 p-7 text-center shadow-2xl shadow-orange-500/40"
          >
            {/* Glow effect */}
            <motion.div
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-3xl bg-yellow-400/20"
            />

            {/* Flame icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 280 }}
              className="relative z-10 mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-white/20"
            >
              <motion.div
                animate={{ scale: [1, 1.12, 1], rotate: [-4, 4, -4] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                style={{ willChange: "transform" }}
              >
                <Flame className="h-12 w-12 text-yellow-300" />
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative z-10 text-xs font-bold uppercase tracking-widest text-white/80"
            >
              {isNewStreak ? "Streak Aumentado!" : "Streak Mantido!"}
            </motion.p>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 250 }}
              className="relative z-10 mt-2 flex items-center justify-center gap-2"
            >
              <span className="text-6xl font-black text-white drop-shadow-xl">{streakDays}</span>
              <span className="text-2xl font-bold text-white/80">{streakDays === 1 ? "dia" : "dias"}</span>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
              className="relative z-10 mt-1 text-sm font-medium text-white/70"
            >
              Você voltou hoje! Continue assim!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="relative z-10 mt-4 flex items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-1.5"
            >
              <Zap className="h-3.5 w-3.5 text-yellow-300" />
              <span className="text-xs font-semibold text-white">+{streakDays * 5} XP bônus de streak!</span>
            </motion.div>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75 }}
              onClick={handleClose}
              className="relative z-10 mt-5 rounded-full bg-white/30 px-7 py-2 text-sm font-bold text-white transition-all hover:bg-white/50 hover:scale-105"
            >
              Continuar
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
