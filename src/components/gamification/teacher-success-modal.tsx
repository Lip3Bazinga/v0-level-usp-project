"use client"

import { useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"
import { BookOpen, GraduationCap, Star, CheckCircle2, Rocket } from "lucide-react"

type TeacherSuccessType = "lesson" | "course"

interface TeacherSuccessModalProps {
  show: boolean
  type: TeacherSuccessType
  title: string
  onClose: () => void
  onView?: () => void
}

function fireTeacherConfetti() {
  const colors = ["#7C3AED", "#A78BFA", "#10B981", "#FACC15", "#FFFFFF"]
  confetti({
    particleCount: 120,
    spread: 90,
    origin: { y: 0.5, x: 0.5 },
    colors,
    gravity: 0.7,
    scalar: 1.2,
    ticks: 260,
    zIndex: 9999,
  })
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.55 }, colors, zIndex: 9999 })
    confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.55 }, colors, zIndex: 9999 })
  }, 300)
}

export function TeacherSuccessModal({ show, type, title, onClose, onView }: TeacherSuccessModalProps) {
  useEffect(() => {
    if (show) {
      fireTeacherConfetti()
      const timer = setTimeout(onClose, 6000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  const handleClose = useCallback(() => onClose(), [onClose])
  const isLesson = type === "lesson"
  const Icon = isLesson ? BookOpen : GraduationCap
  const gradientClass = isLesson
    ? "from-level-purple to-level-purple-dark"
    : "from-emerald-500 to-teal-600"

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className={`relative bg-gradient-to-br ${gradientClass} px-6 pb-12 pt-7 text-center`}>
              {/* Decorations */}
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
                  transition={{ delay: 0.3 + i * 0.2, duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  className="absolute"
                  style={{
                    top: `${15 + i * 20}%`,
                    left: i % 2 === 0 ? `${8 + i * 5}%` : "auto",
                    right: i % 2 !== 0 ? `${8 + i * 5}%` : "auto",
                  }}
                >
                  <Star className="h-4 w-4 fill-white/60 text-white/60" />
                </motion.div>
              ))}

              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"
              >
                <Icon className="h-9 w-9 text-white" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs font-bold uppercase tracking-widest text-white/75"
              >
                {isLesson ? "Nova Lição Criada!" : "Novo Curso Criado!"}
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-1 text-lg font-black text-white"
              >
                {title}
              </motion.h2>
            </div>

            {/* Floating check badge */}
            <motion.div
              initial={{ scale: 0, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 260 }}
              className="relative -mt-8 flex justify-center"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl ring-4 ring-green-400/30">
                <CheckCircle2 className="h-9 w-9 text-green-500" />
              </div>
            </motion.div>

            {/* Content */}
            <div className="px-6 pb-6 pt-4 text-center">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mb-5 text-sm text-muted-foreground"
              >
                {isLesson
                  ? "Sua lição foi salva! Publique para que os alunos possam acessá-la."
                  : "Seu curso foi criado com sucesso! Adicione lições e publique para os alunos."}
              </motion.p>

              <div className="flex gap-2">
                {onView && (
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => { onClose(); onView() }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-level-purple py-2.5 text-sm font-semibold text-level-purple transition-all hover:bg-level-purple-subtle"
                  >
                    <Rocket className="h-4 w-4" />
                    Visualizar
                  </motion.button>
                )}
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 }}
                  onClick={handleClose}
                  className={`${onView ? "flex-1" : "w-full"} rounded-xl bg-level-purple py-2.5 text-sm font-bold text-white transition-all hover:bg-level-purple-dark`}
                >
                  Continuar Editando
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
