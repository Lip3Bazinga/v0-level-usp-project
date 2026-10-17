"use client"

import { Stagger, motion, staggerItem } from "./motion-primitives"
import { SectionIntro } from "./section-heading"
import { MISSIONS } from "./content/home"

export function MissionSection() {
  return (
    <section id="missao" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionIntro
          eyebrow="Nossa missão social"
          title="Educação em computação é um direito, não um privilégio"
          description="A LevelUSP nasceu dentro da Universidade de São Paulo com um propósito claro: expandir o acesso ao conhecimento de programação por todos os cantos do Brasil — começando por quem mais precisa."
        />

        <Stagger className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MISSIONS.map((mission) => (
            <motion.div
              key={mission.title}
              variants={staggerItem}
              whileHover={{ y: -6 }}
              className="rounded-3xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-xl hover:shadow-purple-100"
            >
              <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-level-purple-light">
                <mission.icon className="h-7 w-7 text-level-purple" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-level-purple-dark">{mission.title}</h3>
              <p className="text-sm leading-relaxed text-gray-600">{mission.description}</p>
            </motion.div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
