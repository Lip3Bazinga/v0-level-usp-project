"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react"

interface Particle {
  x: number
  y: number
  velocityX: number
  velocityY: number
  opacity: number
  size: number
  color: string
  phase: "explode" | "travel"
}

interface Point {
  x: number
  y: number
}

interface XpParticlesProps {
  trigger: boolean
  count?: number
  sourceRef: RefObject<HTMLElement | null>
  targetRef: RefObject<HTMLElement | null>
  onComplete?: () => void
}

const COLORS = ["#FACC15", "#FDE68A", "#FEF08A", "#FCD34D", "#F59E0B", "#FFFFFF"]
const GLOW_COLOR = "#FACC15"
/** Quadros de "explosão" antes de as partículas seguirem para o alvo. */
const EXPLODE_FRAMES = 20
const EXPLODE_FRICTION = 0.92
const TRAVEL_EASING = 0.06
const ARRIVAL_DISTANCE_PX = 8
const FADE_PER_FRAME = 0.12
const SPAWN_SPREAD_PX = 40

function centerOf(element: HTMLElement): Point {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function spawnParticles(count: number, source: Point): Particle[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.5
    const speed = 2 + Math.random() * 4
    return {
      x: source.x + (Math.random() - 0.5) * SPAWN_SPREAD_PX,
      y: source.y + (Math.random() - 0.5) * SPAWN_SPREAD_PX,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      opacity: 1,
      size: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      phase: "explode",
    }
  })
}

/** Avança uma partícula um quadro: espalha, depois voa até o alvo e some ao chegar. */
function stepParticle(particle: Particle, target: Point, frame: number): void {
  if (particle.phase === "explode") {
    particle.x += particle.velocityX
    particle.y += particle.velocityY
    particle.velocityX *= EXPLODE_FRICTION
    particle.velocityY *= EXPLODE_FRICTION
    if (frame > EXPLODE_FRAMES) particle.phase = "travel"
    return
  }
  const deltaX = target.x - particle.x
  const deltaY = target.y - particle.y
  if (Math.hypot(deltaX, deltaY) < ARRIVAL_DISTANCE_PX) {
    particle.opacity -= FADE_PER_FRAME
  } else {
    particle.x += deltaX * TRAVEL_EASING
    particle.y += deltaY * TRAVEL_EASING
  }
}

function drawParticle(context: CanvasRenderingContext2D, particle: Particle): void {
  context.beginPath()
  context.arc(particle.x, particle.y, particle.size * particle.opacity, 0, Math.PI * 2)
  context.fillStyle = particle.color
  context.globalAlpha = particle.opacity * 0.9
  context.shadowBlur = 8
  context.shadowColor = GLOW_COLOR
  context.fill()
  context.globalAlpha = 1
}

/** Partículas de XP que saem do card de sucesso e voam até o selo de XP do cabeçalho. */
export function XpParticles({ trigger, count = 80, sourceRef, targetRef, onComplete }: XpParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const onCompleteRef = useRef(onComplete)

  useLayoutEffect(() => {
    onCompleteRef.current = onComplete
  })

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context || !sourceRef.current || !targetRef.current) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const target = centerOf(targetRef.current)
    const particles = spawnParticles(count, centerOf(sourceRef.current))
    let frame = 0

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      let visibleCount = 0
      for (const particle of particles) {
        stepParticle(particle, target, frame)
        if (particle.opacity <= 0) continue
        visibleCount++
        drawParticle(context, particle)
      }
      frame++

      if (visibleCount > 0) {
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }
      context.clearRect(0, 0, canvas.width, canvas.height)
      onCompleteRef.current?.()
    }

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = requestAnimationFrame(animate)
  }, [count, sourceRef, targetRef])

  useEffect(() => {
    if (trigger) startAnimation()
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
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
