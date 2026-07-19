import { Hero } from "@/components/marketing/hero"
import { MissionSection } from "@/components/marketing/mission-section"
import { MethodSection } from "@/components/marketing/method-section"
import { IdeShowcase } from "@/components/marketing/ide-showcase"
import { ScienceSection } from "@/components/marketing/science-section"
import { JourneyScroll } from "@/components/marketing/journey-scroll"
import { ImpactSection } from "@/components/marketing/impact-section"
import { FinalCta } from "@/components/marketing/final-cta"

export default function HomePage() {
  return (
    <>
      <Hero />
      <MissionSection />
      <MethodSection />
      <IdeShowcase />
      <ScienceSection />
      <JourneyScroll />
      <ImpactSection />
      <FinalCta />
    </>
  )
}
