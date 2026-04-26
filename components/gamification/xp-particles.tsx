"use client"

import { useEffect, useRef, useCallback } from "react"

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  opacity: number
  size: number
  color: string
  targetX: number
  targetY: number
  phase: "explode" | "travel"
  progress: number
}

interface XpParticlesProps {
  trigger: boolean
  count?: number
  sourceRef: React.RefObject<HTMLElement | null>
  targetRef: React.RefObject<HTMLElement | null>
  onComplete?: () => void
}

const COLORS = ["#FACC15", "#FDE68A", "#FEF08A", "#FCD34D", "#F59E0B", "#FFFFFF"]

export function XpParticles({ trigger, count = 80, sourceRef, targetRef, onComplete }: XpParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number | null>(null)
  const particlesRef = useRef<Particle[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !sourceRef.current || !targetRef.current) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const srcRect = sourceRef.current.getBoundingClientRect()
    const tgtRect = targetRef.current.getBoundingClientRect()

    const sx = srcRect.left + srcRect.width / 2
    const sy = srcRect.top + srcRect.height / 2
    const tx = tgtRect.left + tgtRect.width / 2
    const ty = tgtRect.top + tgtRect.height / 2

    particlesRef.current = Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 2 + Math.random() * 4
      return {
        id: i,
        x: sx + (Math.random() - 0.5) * 40,
        y: sy + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        opacity: 1,
        size: 3 + Math.random() * 4,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        targetX: tx,
        targetY: ty,
        phase: "explode",
        progress: 0,
      }
    })

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let frame = 0

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = 0
      for (const p of particlesRef.current) {
        if (p.phase === "explode") {
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.92
          p.vy *= 0.92
          if (frame > 20) {
            p.phase = "travel"
          }
        } else {
          const dx = p.targetX - p.x
          const dy = p.targetY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 8) {
            p.opacity -= 0.12
          } else {
            p.x += dx * 0.06
            p.y += dy * 0.06
          }
        }

        if (p.opacity <= 0) continue
        alive++

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.opacity, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity * 0.9
        ctx.shadowBlur = 8
        ctx.shadowColor = "#FACC15"
        ctx.fill()
        ctx.globalAlpha = 1
      }

      frame++

      if (alive > 0) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        onCompleteRef.current?.()
      }
    }

    if (animRef.current) cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(animate)
  }, [count, sourceRef, targetRef])

  useEffect(() => {
    if (trigger) {
      startAnimation()
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [trigger, startAnimation])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ width: "100vw", height: "100vh" }}
    />
  )
}
