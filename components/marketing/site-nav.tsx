"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Rocket, Menu, X } from "lucide-react"

const NAV_LINKS = [
  { href: "#missao", label: "Missão" },
  { href: "#metodo", label: "Método" },
  { href: "#ciencia", label: "Ciência" },
  { href: "#impacto", label: "Impacto" },
  { href: "#cursos", label: "Cursos" },
]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass py-2" : "bg-transparent py-4"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED] shadow-lg shadow-purple-300/40">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="block text-lg font-bold text-[#4C1D95]">LevelUSP</span>
            <span className="block text-[10px] font-medium text-[#7C3AED]">Iniciativa da USP</span>
          </div>
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-[#7C3AED]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/login"
            className="text-sm font-semibold text-[#7C3AED] transition-colors hover:text-[#4C1D95]"
          >
            Entrar
          </Link>
          <Link href="/signup">
            <button className="rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-300/40 transition-all hover:bg-[#6D28D9] hover:shadow-purple-400/50">
              Começar grátis
            </button>
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-[#4C1D95] lg:hidden"
          aria-label="Abrir menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass mx-4 mt-2 overflow-hidden rounded-2xl lg:hidden"
        >
          <div className="flex flex-col gap-1 p-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-[#F3E8FF] hover:text-[#7C3AED]"
              >
                {link.label}
              </a>
            ))}
            <Link href="/signup" onClick={() => setOpen(false)}>
              <button className="mt-2 w-full rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white">
                Começar grátis
              </button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
  )
}
