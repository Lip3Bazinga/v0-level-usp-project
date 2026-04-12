"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { CheckCircle2, Zap, Star } from "lucide-react"

interface SuccessFeedbackProps {
  show: boolean
  xpEarned: number
  onClose: () => void
}

function firePurpleConfetti() {
  const colors = ["#7C3AED", "#A78BFA", "#C4B5FD", "#DDD6FE", "#FFFFFF"]

  // Explosao central
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

  // Laterais com delay
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.65 },
      colors,
    })
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.65 },
      colors,
    })
  }, 150)
}

export function SuccessFeedback({ show, xpEarned, onClose }: SuccessFeedbackProps) {
  useEffect(() => {
    if (show) {
      firePurpleConfetti()
    }
  }, [show])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
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
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Header gradient */}
            <div className="relative bg-gradient-to-br from-level-purple to-level-purple-dark px-8 pb-12 pt-8 text-center">
              {/* Estrelas decorativas */}
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
                Parabens!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-1 text-sm text-white/80"
              >
                Voce completou o desafio com sucesso!
              </motion.p>
            </div>

            {/* XP Badge flutuante */}
            <motion.div
              initial={{ scale: 0, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 250 }}
              className="relative -mt-6 flex justify-center"
            >
              <div className="flex items-center gap-2 rounded-full bg-white px-6 py-3 shadow-lg ring-4 ring-level-purple/20">
                <Zap className="h-6 w-6 text-yellow-500" />
                <span className="text-2xl font-bold text-level-purple-dark">
                  +{xpEarned} XP
                </span>
              </div>
            </motion.div>

            {/* Conteudo inferior */}
            <div className="px-8 pb-8 pt-6 text-center">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-6 text-sm text-muted-foreground"
              >
                Continue praticando para subir de nivel e manter seu streak!
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={handleClose}
                className="btn-3d w-full rounded-xl bg-level-purple py-3 text-sm font-semibold text-white transition-colors hover:bg-level-purple-medium"
              >
                Continuar Aprendendo
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
