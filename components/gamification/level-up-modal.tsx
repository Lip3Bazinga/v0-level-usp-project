"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { Trophy, Star, Zap, ArrowUp } from "lucide-react"

interface LevelUpModalProps {
  show: boolean
  newLevel: number
  onClose: () => void
}

function fireLevelUpConfetti() {
  const colors = ["#FACC15", "#F59E0B", "#7C3AED", "#A78BFA", "#FFFFFF"]

  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.5, x: 0.5 },
    colors,
    shapes: ["circle", "square"],
    gravity: 0.7,
    scalar: 1.4,
    ticks: 300,
    zIndex: 10000,
  })

  setTimeout(() => {
    confetti({ particleCount: 80, angle: 60, spread: 70, origin: { x: 0, y: 0.5 }, colors, zIndex: 10000 })
    confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.5 }, colors, zIndex: 10000 })
  }, 200)

  setTimeout(() => {
    confetti({ particleCount: 60, spread: 80, origin: { y: 0.3, x: 0.5 }, colors, zIndex: 10000 })
  }, 500)
}

export function LevelUpModal({ show, newLevel, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (show) {
      fireLevelUpConfetti()
      const timer = setTimeout(onClose, 5000)
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
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: -30 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 flex flex-col items-center overflow-hidden rounded-3xl bg-gradient-to-b from-yellow-400 via-amber-400 to-yellow-500 px-10 py-10 text-center shadow-2xl shadow-yellow-500/40"
            style={{ maxWidth: 400, width: "100%" }}
          >
            {/* Background glow rings */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-3xl bg-white/20"
            />

            {/* Stars orbit */}
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, rotate: [0, 360] }}
                transition={{ delay: 0.2 + i * 0.1, rotate: { duration: 4, repeat: Infinity, ease: "linear" } }}
                className="absolute"
                style={{
                  top: `${20 + i * 12}%`,
                  left: i % 2 === 0 ? `${5 + i * 3}%` : "auto",
                  right: i % 2 !== 0 ? `${5 + i * 3}%` : "auto",
                }}
              >
                <Star className="h-4 w-4 fill-white/80 text-white/80" />
              </motion.div>
            ))}

            {/* Up arrow burst */}
            <motion.div
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
              className="relative z-10 mb-2 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl shadow-yellow-600/40"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ArrowUp className="h-10 w-10 text-yellow-500" />
              </motion.div>
            </motion.div>

            {/* Level up text */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative z-10 mt-1 text-lg font-bold uppercase tracking-widest text-white/90"
            >
              LEVEL UP!
            </motion.p>

            {/* New level number */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 250, damping: 14 }}
              className="relative z-10 mt-3 flex items-center justify-center gap-3"
            >
              <Trophy className="h-8 w-8 text-white drop-shadow-lg" />
              <span className="text-7xl font-black text-white drop-shadow-xl">{newLevel}</span>
              <Trophy className="h-8 w-8 text-white drop-shadow-lg" />
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="relative z-10 mt-2 text-sm font-semibold text-white/80"
            >
              Você alcançou o Nível {newLevel}!
            </motion.p>

            {/* XP info */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="relative z-10 mt-4 flex items-center gap-2 rounded-full bg-white/25 px-5 py-2"
            >
              <Zap className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">{newLevel * 1000} XP para o próximo nível</span>
            </motion.div>

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={handleClose}
              className="relative z-10 mt-6 rounded-full bg-white/30 px-8 py-2.5 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/50 hover:scale-105"
            >
              Continuar
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
