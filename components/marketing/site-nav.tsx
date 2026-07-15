"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Rocket, Menu, X, ChevronDown } from "lucide-react"

const PRIMARY_LINKS = [
  { href: "/sobre", label: "Sobre" },
  { href: "/metodologia", label: "Metodologia" },
  { href: "/trilhas", label: "Trilhas" },
  { href: "/impacto", label: "Impacto" },
]

const MORE_LINKS = [
  { href: "/equipe", label: "Equipe", desc: "Quem constrói o LevelUSP" },
  { href: "/parceiros", label: "Parceiros", desc: "Instituições que apoiam" },
  { href: "/faq", label: "Perguntas frequentes", desc: "Tire suas dúvidas" },
  { href: "/contato", label: "Contato", desc: "Fale com a equipe" },
]

const ALL_MOBILE_LINKS = [...PRIMARY_LINKS, ...MORE_LINKS.map((l) => ({ href: l.href, label: l.label }))]

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setOpen(false)
    setMoreOpen(false)
  }, [pathname])

  const isActive = (href: string) => pathname === href

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open ? "glass py-2" : "bg-transparent py-4"
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

        <div className="hidden items-center gap-6 lg:flex">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-sm font-medium transition-colors hover:text-[#7C3AED] ${
                isActive(link.href) ? "text-[#7C3AED]" : "text-gray-600"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <motion.span
                  layoutId="nav-underline"
                  className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-[#7C3AED]"
                />
              )}
            </Link>
          ))}

          {/* "Mais" dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setMoreOpen(true)}
            onMouseLeave={() => setMoreOpen(false)}
          >
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-[#7C3AED]"
            >
              Mais
              <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-full w-72 pt-3"
                >
                  <div className="glass overflow-hidden rounded-2xl p-2">
                    {MORE_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-[#F3E8FF]"
                      >
                        <span className="text-sm font-semibold text-[#4C1D95]">{link.label}</span>
                        <span className="text-xs text-gray-500">{link.desc}</span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-4 mt-2 overflow-hidden rounded-2xl border border-[#E9D5FF] bg-white lg:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {ALL_MOBILE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[#F3E8FF] hover:text-[#7C3AED] ${
                    isActive(link.href) ? "bg-[#F3E8FF] text-[#7C3AED]" : "text-gray-700"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="my-2 h-px bg-gray-100" />
              <Link
                href="/login"
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-[#7C3AED] hover:bg-[#F3E8FF]"
              >
                Entrar
              </Link>
              <Link href="/signup">
                <button className="mt-1 w-full rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white">
                  Começar grátis
                </button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
