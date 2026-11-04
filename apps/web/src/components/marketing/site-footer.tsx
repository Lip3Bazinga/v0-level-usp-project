"use client"

import Link from "next/link"
import { Github, Mail, GraduationCap, MapPin } from "lucide-react"
import { BrandLogo } from "@/components/design-system/brand-logo"
import { ROUTES } from "@/lib/constants"
import { CAMPUS_ADDRESS, CONTACT_EMAIL_HREF, FOOTER_LINK_GROUPS, GITHUB_URL } from "./content/site"

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <BrandLogo
              size="lg"
              href={ROUTES.home}
              taglineClassName="flex items-center gap-1 text-xs text-level-purple"
              tagline={
                <>
                  <GraduationCap className="h-3 w-3" /> Iniciativa da USP
                </>
              }
            />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-gray-600">
              Plataforma gratuita e gamificada de ensino de programação, desenvolvida na
              Universidade de São Paulo para democratizar a computação em todo o Brasil.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-gray-500">
              <MapPin className="h-4 w-4 text-level-purple" />
              {CAMPUS_ADDRESS}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light text-level-purple transition-colors hover:bg-[#E9D5FF]"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href={CONTACT_EMAIL_HREF}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-level-purple-light text-level-purple transition-colors hover:bg-[#E9D5FF]"
                aria-label="E-mail"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {FOOTER_LINK_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-4 text-sm font-semibold text-level-purple-dark">{group.title}</h3>
              <ul className="space-y-3">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors hover:text-level-purple"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} LevelUSP — Universidade de São Paulo. Conteúdo aberto e
            gratuito.
          </p>
          <p className="text-sm font-medium text-level-purple">
            100% gratuito para todos os brasileiros
          </p>
        </div>
      </div>
    </footer>
  )
}
