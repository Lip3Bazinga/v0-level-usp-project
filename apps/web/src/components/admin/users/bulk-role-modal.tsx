"use client"

import { BookOpen, ChevronRight, Shield, Users, type LucideIcon } from "lucide-react"
import type { UserRole } from "@levelusp/contracts"
import { cn } from "@/lib/utils"
import { AdminModal } from "../admin-modal"

interface RoleOption {
  role: UserRole
  label: string
  description: string
  icon: LucideIcon
  isDanger: boolean
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: "student", label: "Aluno", description: "Acesso às lições publicadas", icon: Users, isDanger: false },
  { role: "teacher", label: "Professor", description: "Criar e editar lições", icon: BookOpen, isDanger: false },
  { role: "admin", label: "Administrador", description: "Acesso total", icon: Shield, isDanger: true },
]

interface BulkRoleModalProps {
  selectedCount: number
  isBusy: boolean
  onSelectRole: (role: UserRole) => void
  onClose: () => void
}

export function BulkRoleModal({ selectedCount, isBusy, onSelectRole, onClose }: BulkRoleModalProps): React.JSX.Element {
  return (
    <AdminModal
      title={`Alterar papel de ${selectedCount} usuário(s)`}
      icon={<Shield className="h-5 w-5" />}
      bodyClassName="space-y-2 p-6"
      onClose={onClose}
    >
      <p className="mb-3 text-xs text-muted-foreground">Esta ação é registrada no log de auditoria.</p>
      {ROLE_OPTIONS.map((option) => {
        const Icon = option.icon
        return (
          <button
            key={option.role}
            disabled={isBusy}
            onClick={() => onSelectRole(option.role)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all",
              option.isDanger
                ? "border-border hover:border-destructive hover:bg-destructive/5"
                : "border-border hover:border-level-purple hover:bg-level-purple-subtle",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                option.isDanger ? "bg-destructive/10 text-destructive" : "bg-level-purple-light text-level-purple",
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-level-purple-dark">{option.label}</p>
              <p className="text-[11px] text-muted-foreground">{option.description}</p>
            </div>
            <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )
      })}
    </AdminModal>
  )
}
