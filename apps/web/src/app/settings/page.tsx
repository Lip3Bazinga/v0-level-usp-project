"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Loader2, LogOut, Rocket, Shield, User, type LucideIcon } from "lucide-react"
import type { Profile } from "@levelusp/contracts"
import { useAuth } from "@/contexts/auth-context"
import { useSignOut } from "@/hooks/use-sign-out"
import { ROUTES } from "@/lib/constants"
import { ProfileSettingsSection, useProfileForm } from "./profile-settings"
import { SecuritySettingsSection, useSecuritySettings } from "./security-settings"

type SettingsTab = "profile" | "security"

const TABS: readonly { id: SettingsTab; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "security", label: "Segurança", icon: Shield },
]

export default function SettingsPage() {
  const router = useRouter()
  const { profile, isLoading: isAuthLoading } = useAuth()

  useEffect(() => {
    if (!isAuthLoading && !profile) router.push(ROUTES.loginWithNext(ROUTES.settings))
  }, [isAuthLoading, profile, router])

  if (isAuthLoading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-level-purple" />
      </div>
    )
  }

  return <SettingsContent key={profile.id} profile={profile} />
}

function SettingsContent({ profile }: { profile: Profile }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")
  const profileForm = useProfileForm(profile)
  const security = useSecuritySettings()
  const signOut = useSignOut()

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href={ROUTES.dashboard}
              aria-label="Voltar ao painel"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-level-purple">
                <Rocket className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-level-purple-dark">Configurações</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col gap-8 md:flex-row">
          <nav aria-label="Seções das configurações" className="w-full shrink-0 md:w-56">
            <div className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-level-purple text-white"
                      : "text-muted-foreground hover:bg-level-purple-subtle hover:text-level-purple-dark"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}

              <div className="my-4 border-t border-border" />

              <button
                onClick={() => void signOut()}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </button>
            </div>
          </nav>

          <div className="flex-1">
            {activeTab === "profile" ? (
              <ProfileSettingsSection profile={profile} form={profileForm} />
            ) : (
              <SecuritySettingsSection security={security} />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
