import type { ReactNode } from "react"
import { SiteNav } from "@/components/marketing/site-nav"
import { SiteFooter } from "@/components/marketing/site-footer"

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  )
}
