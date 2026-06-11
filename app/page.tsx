import { SiteNav } from "@/components/marketing/site-nav"
import { Hero } from "@/components/marketing/hero"
import { MissionSection } from "@/components/marketing/mission-section"
import { MethodSection } from "@/components/marketing/method-section"
import { IdeShowcase } from "@/components/marketing/ide-showcase"
import { ScienceSection } from "@/components/marketing/science-section"
import { JourneyScroll } from "@/components/marketing/journey-scroll"
import { ImpactSection } from "@/components/marketing/impact-section"
import { CtaFooter } from "@/components/marketing/cta-footer"

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <SiteNav />
      <main>
        <Hero />
        <MissionSection />
        <MethodSection />
        <IdeShowcase />
        <ScienceSection />
        <JourneyScroll />
        <ImpactSection />
        <CtaFooter />
      </main>
    </div>
  )
}
