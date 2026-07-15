"use client"

import Link from "next/link"
import { Reveal, motion } from "./motion-primitives"
import { FileCode, Code2, Terminal, CheckCircle2, Zap, Trophy } from "lucide-react"

const CODE_LINES = [
  { n: 1, content: <><span className="text-[#C586C0]">def</span> <span className="text-[#DCDCAA]">calcular_media</span><span className="text-gray-300">(notas):</span></> },
  { n: 2, content: <span className="pl-4 text-[#6A9955]"># Calcula a média das notas</span> },
  { n: 3, content: <span className="pl-4"><span className="text-[#C586C0]">return</span> <span className="text-[#DCDCAA]">sum</span><span className="text-gray-300">(notas) / </span><span className="text-[#DCDCAA]">len</span><span className="text-gray-300">(notas)</span></span> },
  { n: 4, content: <span /> },
  { n: 5, content: <><span className="text-[#9CDCFE]">notas</span> <span className="text-gray-300">= [</span><span className="text-[#B5CEA8]">8.5</span><span className="text-gray-300">, </span><span className="text-[#B5CEA8]">9.0</span><span className="text-gray-300">, </span><span className="text-[#B5CEA8]">7.5</span><span className="text-gray-300">, </span><span className="text-[#B5CEA8]">10.0</span><span className="text-gray-300">]</span></> },
  { n: 6, content: <><span className="text-[#9CDCFE]">media</span> <span className="text-gray-300">= </span><span className="text-[#DCDCAA]">calcular_media</span><span className="text-gray-300">(notas)</span></> },
  { n: 7, content: <><span className="text-[#DCDCAA]">print</span><span className="text-gray-300">(</span><span className="text-[#CE9178]">f&quot;Sua média é: </span><span className="text-[#9CDCFE]">{"{"}media{"}"}</span><span className="text-[#CE9178]">&quot;</span><span className="text-gray-300">)</span></> },
]

export function IdeShowcase() {
  return (
    <section id="ide" className="relative overflow-hidden py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#7C3AED]">
            Aprenda fazendo
          </p>
          <h2 className="text-balance text-4xl font-bold text-[#4C1D95] sm:text-5xl">
            Uma IDE completa dentro do navegador
          </h2>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-gray-600">
            Escreva, execute e teste código Python real — sem instalar nada. A prática acontece no
            mesmo lugar onde você lê a teoria.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="relative mx-auto mt-16 max-w-5xl">
          {/* Glow */}
          <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-[#7C3AED] via-[#A78BFA] to-[#7C3AED] opacity-20 blur-2xl" />

          {/* IDE window */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <FileCode className="h-4 w-4" />
                main.py — LevelUSP IDE
              </div>
              <div className="w-16" />
            </div>

            <div className="flex">
              {/* Sidebar */}
              <div className="hidden w-48 border-r border-gray-100 bg-gray-50 p-3 sm:block">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Arquivos</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 rounded-lg bg-[#F3E8FF] px-3 py-2 text-sm font-medium text-[#7C3AED]">
                    <FileCode className="h-4 w-4" /> main.py
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600">
                    <FileCode className="h-4 w-4" /> data.csv
                  </div>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600">
                    <FileCode className="h-4 w-4" /> utils.py
                  </div>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1">
                <div className="flex border-b border-gray-100">
                  <div className="flex items-center gap-2 border-b-2 border-[#7C3AED] bg-white px-4 py-2 text-sm font-medium text-[#4C1D95]">
                    <Code2 className="h-4 w-4 text-[#7C3AED]" /> main.py
                  </div>
                </div>

                <div className="bg-[#1E1E2E] p-4 font-mono text-xs sm:text-sm">
                  <div className="space-y-1">
                    {CODE_LINES.map((line, i) => (
                      <motion.div
                        key={line.n}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                        className="flex"
                      >
                        <span className="w-8 select-none text-gray-500">{line.n}</span>
                        <span>{line.content}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-[#7C3AED]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Console</span>
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 1.1 }}
                    className="rounded-lg bg-[#1E1E2E] p-3 font-mono text-sm"
                  >
                    <div className="flex items-center gap-2 text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Sua média é: 8.75</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating glass badges */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -left-4 top-1/4 hidden rounded-2xl glass px-4 py-3 md:flex"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C3AED]">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">XP ganho</p>
                <p className="font-bold text-[#4C1D95]">+50 XP</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -right-4 top-1/2 hidden rounded-2xl glass px-4 py-3 md:flex"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Desafio</p>
                <p className="font-bold text-green-600">Concluído!</p>
              </div>
            </div>
          </motion.div>
        </Reveal>

        <div className="mt-16 text-center">
          <Link href="/signup">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-8 py-4 text-lg font-bold text-white btn-3d">
              <Terminal className="h-5 w-5" />
              Experimentar a IDE
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
