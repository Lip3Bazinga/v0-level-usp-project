"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useSyncExternalStore, type FocusEvent, type KeyboardEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown, Menu, X } from "lucide-react"
import { BrandLogo } from "@/components/design-system/brand-logo"
import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { EASE } from "./motion-primitives"
import { MORE_NAV_LINKS, PRIMARY_NAV_LINKS } from "./content/site"

/** A partir desta rolagem a barra ganha fundo de vidro e fica mais baixa. */
const SCROLLED_THRESHOLD_PX = 24
const MORE_MENU_ID = "site-nav-more"

const MOBILE_NAV_LINKS = [...PRIMARY_NAV_LINKS, ...MORE_NAV_LINKS]

function subscribeToScroll(onScroll: () => void) {
  window.addEventListener("scroll", onScroll, { passive: true })
  return () => window.removeEventListener("scroll", onScroll)
}

function useIsScrolledPast(thresholdPx: number): boolean {
  return useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > thresholdPx,
    () => false,
  )
}
interface UseMenuOpenOnRouteResult {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}


/**
 * Menu que fecha sozinho ao trocar de página: guarda em qual rota foi aberto em vez
 * de sincronizar um booleano com a rota por efeito.
 */
function useMenuOpenOnRoute(pathname: string): UseMenuOpenOnRouteResult {
  const [openedOnPath, setOpenedOnPath] = useState<string | null>(null)
  const isOpen = openedOnPath === pathname
  return {
    isOpen,
    open: () => setOpenedOnPath(pathname),
    close: () => setOpenedOnPath(null),
    toggle: () => setOpenedOnPath(isOpen ? null : pathname),
  }
}

function SiteLogo(): React.JSX.Element {
  return (
    <BrandLogo
      href={ROUTES.home}
      markClassName="shadow-lg shadow-purple-300/40"
      wordmarkClassName="text-lg"
      tagline="Iniciativa da USP"
      taglineClassName="text-[10px] font-medium text-level-purple"
    />
  )
}

function PrimaryLinks({ pathname }: { pathname: string }): React.JSX.Element[] {
  return PRIMARY_NAV_LINKS.map((link) => {
    const isActive = pathname === link.href
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "relative text-sm font-medium transition-colors hover:text-level-purple",
          isActive ? "text-level-purple" : "text-gray-600",
        )}
      >
        {link.label}
        {isActive && (
          <motion.span
            layoutId="nav-underline"
            className="absolute -bottom-1.5 left-0 right-0 h-0.5 rounded-full bg-level-purple"
          />
        )}
      </Link>
    )
  })
}

function MoreMenu({ pathname }: { pathname: string }): React.JSX.Element {
  const menu = useMenuOpenOnRoute(pathname)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") menu.close()
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    const isFocusStayingInside =
      event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)
    if (!isFocusStayingInside) menu.close()
  }

  return (
    <div
      className="relative"
      onMouseEnter={menu.open}
      onMouseLeave={menu.close}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <button
        type="button"
        aria-expanded={menu.isOpen}
        aria-controls={MORE_MENU_ID}
        onClick={menu.toggle}
        className="flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-level-purple"
      >
        Mais
        <ChevronDown className={cn("h-4 w-4 transition-transform", menu.isOpen && "rotate-180")} />
      </button>
      <AnimatePresence>
        {menu.isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            id={MORE_MENU_ID}
            className="absolute right-0 top-full w-72 pt-3"
          >
            <div className="glass overflow-hidden rounded-2xl p-2">
              {MORE_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col rounded-xl px-4 py-3 transition-colors hover:bg-level-purple-light"
                >
                  <span className="text-sm font-semibold text-level-purple-dark">{link.label}</span>
                  <span className="text-xs text-gray-500">{link.description}</span>
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MobileMenu({ pathname }: { pathname: string }): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mx-4 mt-2 overflow-hidden rounded-2xl border border-[#E9D5FF] bg-white lg:hidden"
    >
      <div className="flex flex-col gap-1 p-4">
        {MOBILE_NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-level-purple-light hover:text-level-purple",
              pathname === link.href ? "bg-level-purple-light text-level-purple" : "text-gray-700",
            )}
          >
            {link.label}
          </Link>
        ))}
        <div className="my-2 h-px bg-gray-100" />
        <Link
          href={ROUTES.login}
          className="rounded-lg px-3 py-2.5 text-sm font-semibold text-level-purple hover:bg-level-purple-light"
        >
          Entrar
        </Link>
        <Link
          href={ROUTES.signup}
          className="mt-1 block w-full rounded-full bg-level-purple px-6 py-2.5 text-center text-sm font-semibold text-white"
        >
          Começar grátis
        </Link>
      </div>
    </motion.div>
  )
}

export function SiteNav(): React.JSX.Element {
  const pathname = usePathname()
  const isScrolled = useIsScrolledPast(SCROLLED_THRESHOLD_PX)
  const mobileMenu = useMenuOpenOnRoute(pathname)

  return (
    <motion.nav
      aria-label="Navegação do site"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        isScrolled || mobileMenu.isOpen ? "glass py-2" : "bg-transparent py-4",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <SiteLogo />

        <div className="hidden items-center gap-6 lg:flex">
          <PrimaryLinks pathname={pathname} />
          <MoreMenu pathname={pathname} />
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href={ROUTES.login}
            className="text-sm font-semibold text-level-purple transition-colors hover:text-level-purple-dark"
          >
            Entrar
          </Link>
          <Link
            href={ROUTES.signup}
            className="rounded-full bg-level-purple px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-300/40 transition-all hover:bg-[#6D28D9] hover:shadow-purple-400/50"
          >
            Começar grátis
          </Link>
        </div>

        <button
          type="button"
          onClick={mobileMenu.toggle}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-level-purple-dark lg:hidden"
          aria-label={mobileMenu.isOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileMenu.isOpen}
        >
          {mobileMenu.isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>{mobileMenu.isOpen && <MobileMenu pathname={pathname} />}</AnimatePresence>
    </motion.nav>
  )
}
