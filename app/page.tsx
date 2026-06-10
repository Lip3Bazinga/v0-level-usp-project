"use client"

import Link from "next/link"
import { LevelButton } from "@/components/design-system/level-button"
import { 
  Code2, 
  Database, 
  Gamepad2, 
  Rocket, 
  ChevronRight, 
  Play,
  BookOpen,
  Users,
  Trophy,
  Zap,
  ArrowRight,
  CheckCircle2,
  Terminal,
  FileCode,
  Star
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]">
              <Rocket className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#4C1D95]">LevelUSP</span>
          </div>
          
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-[#7C3AED] transition-colors">
              Recursos
            </a>
            <Link href="/cursos" className="text-sm font-medium text-gray-600 hover:text-[#7C3AED] transition-colors">
              Cursos
            </Link>
            <a href="#ide" className="text-sm font-medium text-gray-600 hover:text-[#7C3AED] transition-colors">
              IDE
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden text-sm font-medium text-[#7C3AED] hover:text-[#4C1D95] transition-colors sm:block">
              Entrar
            </Link>
            <Link href="/signup">
              <button className="rounded-full bg-[#7C3AED] px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#6D28D9] hover:shadow-lg hover:shadow-purple-200">
                Comecar Gratis
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-40 lg:pb-32">
        {/* Background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-linear-to-b from-[#F3E8FF] to-transparent opacity-60 blur-3xl" />
        
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-[#F3E8FF] px-4 py-2 text-sm font-medium text-[#7C3AED] mb-8">
              <Zap className="h-4 w-4" />
              Uma iniciativa da USP - 100% Gratuito
            </div>
            
            {/* Main heading */}
            <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-[#4C1D95] sm:text-6xl lg:text-7xl text-balance leading-tight">
              Aprenda a programar de forma{" "}
              <span className="relative">
                <span className="relative z-10 text-[#7C3AED]">gamificada</span>
                <span className="absolute bottom-2 left-0 right-0 h-3 bg-[#E9D5FF] -z-0 rounded" />
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="mx-auto mt-8 max-w-2xl text-xl text-gray-600 leading-relaxed text-pretty">
              Transforme sua jornada de aprendizado em uma aventura. Ganhe XP, 
              conquiste badges e evolua suas habilidades enquanto domina Python 
              e Ciencia de Dados.
            </p>

            {/* CTA Buttons */}
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup">
                <button className="group relative inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-10 py-5 text-lg font-bold text-white transition-all hover:bg-[#6D28D9] btn-3d">
                  <Play className="h-5 w-5" />
                  Comecar Agora
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>
              </Link>
              <Link href="/cursos">
                <button className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#E9D5FF] px-8 py-4 text-lg font-semibold text-[#7C3AED] transition-all hover:bg-[#F3E8FF] hover:border-[#7C3AED]">
                  <BookOpen className="h-5 w-5" />
                  Ver Cursos
                </button>
              </Link>
            </div>

            {/* Social proof */}
            <div className="mt-16 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-white bg-linear-to-br from-[#A78BFA] to-[#7C3AED]"
                  />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-[#4C1D95]">50,000+</span> estudantes ativos
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#7C3AED] mb-4">
              Recursos
            </p>
            <h2 className="text-4xl font-bold text-[#4C1D95] sm:text-5xl">
              Tudo que voce precisa para aprender
            </h2>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Uma plataforma completa com ferramentas modernas e metodologia gamificada
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {/* Python Card */}
            <div className="group relative rounded-3xl border border-gray-100 bg-white p-8 transition-all hover:border-[#E9D5FF] hover:shadow-xl hover:shadow-purple-100">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                <Code2 className="h-7 w-7 text-[#7C3AED]" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-[#4C1D95]">
                Aprenda Python
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Domine a linguagem mais popular do mercado. Do basico ao avancado, 
                com exercicios praticos e projetos reais.
              </p>
              <ul className="mt-6 space-y-3">
                {["Sintaxe moderna", "POO completo", "Projetos praticos"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-[#7C3AED]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/cursos" className="inline-flex items-center gap-1 text-sm font-semibold text-[#7C3AED] transition-all group-hover:gap-2">
                  Explorar curso <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Data Science Card */}
            <div className="group relative rounded-3xl border border-gray-100 bg-white p-8 transition-all hover:border-[#E9D5FF] hover:shadow-xl hover:shadow-purple-100">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                <Database className="h-7 w-7 text-[#7C3AED]" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-[#4C1D95]">
                Ciencia de Dados
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Analise dados como um profissional. Aprenda pandas, numpy, 
                visualizacao e machine learning basico.
              </p>
              <ul className="mt-6 space-y-3">
                {["Pandas & NumPy", "Visualizacao", "Machine Learning"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-[#7C3AED]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/cursos" className="inline-flex items-center gap-1 text-sm font-semibold text-[#7C3AED] transition-all group-hover:gap-2">
                  Explorar curso <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Gamification Card */}
            <div className="group relative rounded-3xl border border-gray-100 bg-white p-8 transition-all hover:border-[#E9D5FF] hover:shadow-xl hover:shadow-purple-100">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                <Gamepad2 className="h-7 w-7 text-[#7C3AED]" />
              </div>
              <h3 className="mb-3 text-xl font-bold text-[#4C1D95]">
                Gamificacao
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Transforme o aprendizado em uma aventura. Ganhe XP, suba de nivel, 
                colecione badges e compita com amigos.
              </p>
              <ul className="mt-6 space-y-3">
                {["Sistema de XP", "Badges e conquistas", "Rankings"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-[#7C3AED]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href="/signup" className="inline-flex items-center gap-1 text-sm font-semibold text-[#7C3AED] transition-all group-hover:gap-2">
                  Saiba mais <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IDE Mockup Section */}
      <section id="ide" className="py-24 lg:py-32 bg-linear-to-b from-white via-[#FAFAFA] to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#7C3AED] mb-4">
              Ambiente de Desenvolvimento
            </p>
            <h2 className="text-4xl font-bold text-[#4C1D95] sm:text-5xl">
              IDE completa no navegador
            </h2>
            <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto">
              Escreva, execute e teste seu codigo diretamente no navegador. 
              Sem instalacoes, sem configuracoes.
            </p>
          </div>

          {/* IDE Mockup */}
          <div className="relative mx-auto max-w-5xl">
            {/* Glow effect */}
            <div className="absolute -inset-4 rounded-3xl bg-linear-to-r from-[#7C3AED] via-[#A78BFA] to-[#7C3AED] opacity-20 blur-2xl" />
            
            {/* IDE Window */}
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              {/* Title bar */}
              <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <FileCode className="h-4 w-4" />
                  main.py - LevelUSP IDE
                </div>
                <div className="w-16" />
              </div>

              {/* IDE Content */}
              <div className="flex">
                {/* Sidebar */}
                <div className="w-48 border-r border-gray-100 bg-gray-50 p-3">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Arquivos
                  </p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 rounded-lg bg-[#F3E8FF] px-3 py-2 text-sm font-medium text-[#7C3AED]">
                      <FileCode className="h-4 w-4" />
                      main.py
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
                      <FileCode className="h-4 w-4" />
                      data.csv
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100">
                      <FileCode className="h-4 w-4" />
                      utils.py
                    </div>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1">
                  {/* Editor tabs */}
                  <div className="flex border-b border-gray-100">
                    <div className="flex items-center gap-2 border-b-2 border-[#7C3AED] bg-white px-4 py-2 text-sm font-medium text-[#4C1D95]">
                      <Code2 className="h-4 w-4 text-[#7C3AED]" />
                      main.py
                    </div>
                  </div>

                  {/* Code area */}
                  <div className="bg-[#1E1E2E] p-4 font-mono text-sm">
                    <div className="space-y-1">
                      <div className="flex">
                        <span className="w-8 text-gray-500">1</span>
                        <span><span className="text-[#C586C0]">def</span> <span className="text-[#DCDCAA]">calcular_media</span><span className="text-gray-300">(notas):</span></span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-gray-500">2</span>
                        <span className="pl-4"><span className="text-[#6A9955]"># Calcula a media das notas</span></span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-gray-500">3</span>
                        <span className="pl-4"><span className="text-[#C586C0]">return</span> <span className="text-[#DCDCAA]">sum</span><span className="text-gray-300">(notas) / </span><span className="text-[#DCDCAA]">len</span><span className="text-gray-300">(notas)</span></span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-gray-500">4</span>
                        <span></span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-gray-500">5</span>
                        <span><span className="text-[#9CDCFE]">notas</span> <span className="text-gray-300">=</span> <span className="text-gray-300">[</span><span className="text-[#B5CEA8]">8.5</span><span className="text-gray-300">,</span> <span className="text-[#B5CEA8]">9.0</span><span className="text-gray-300">,</span> <span className="text-[#B5CEA8]">7.5</span><span className="text-gray-300">,</span> <span className="text-[#B5CEA8]">10.0</span><span className="text-gray-300">]</span></span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-gray-500">6</span>
                        <span><span className="text-[#9CDCFE]">media</span> <span className="text-gray-300">=</span> <span className="text-[#DCDCAA]">calcular_media</span><span className="text-gray-300">(notas)</span></span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-gray-500">7</span>
                        <span><span className="text-[#DCDCAA]">print</span><span className="text-gray-300">(</span><span className="text-[#CE9178]">f&quot;Sua media e: </span><span className="text-[#9CDCFE]">{"{"}media{"}"}</span><span className="text-[#CE9178]">&quot;</span><span className="text-gray-300">)</span></span>
                      </div>
                      <div className="flex">
                        <span className="w-8 text-gray-500">8</span>
                        <span className="animate-pulse text-gray-300">|</span>
                      </div>
                    </div>
                  </div>

                  {/* Console output */}
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Terminal className="h-4 w-4 text-[#7C3AED]" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Console</span>
                    </div>
                    <div className="rounded-lg bg-[#1E1E2E] p-3 font-mono text-sm">
                      <div className="flex items-center gap-2 text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Sua media e: 8.75</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -left-4 top-1/4 rounded-2xl bg-white p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7C3AED]">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">XP Ganho</p>
                  <p className="font-bold text-[#4C1D95]">+50 XP</p>
                </div>
              </div>
            </div>

            <div className="absolute -right-4 top-1/3 rounded-2xl bg-white p-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-bold text-green-600">Correto!</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA after IDE */}
          <div className="mt-16 text-center">
            <Link href="/signup">
              <button className="inline-flex items-center gap-2 rounded-2xl bg-[#7C3AED] px-8 py-4 text-lg font-bold text-white transition-all hover:bg-[#6D28D9] btn-3d">
                <Terminal className="h-5 w-5" />
                Experimentar IDE
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: "50K+", label: "Estudantes ativos", icon: Users },
              { value: "200+", label: "Licoes interativas", icon: BookOpen },
              { value: "15", label: "Trilhas de aprendizado", icon: Rocket },
              { value: "98%", label: "Satisfacao", icon: Trophy },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3E8FF]">
                  <stat.icon className="h-7 w-7 text-[#7C3AED]" />
                </div>
                <div className="text-4xl font-bold text-[#4C1D95]">{stat.value}</div>
                <div className="mt-1 text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#7C3AED] px-8 py-16 sm:px-16 sm:py-24">
            {/* Background pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNGRkZGRkYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSI0Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
            
            <div className="relative text-center">
              <h2 className="text-4xl font-bold text-white sm:text-5xl">
                Pronto para comecar sua jornada?
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-xl text-purple-100">
                Junte-se a milhares de brasileiros que estao aprendendo 
                programacao gratuitamente com a LevelUSP.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/signup">
                  <button className="inline-flex items-center gap-2 rounded-2xl bg-white px-10 py-5 text-lg font-bold text-[#7C3AED] transition-all hover:bg-purple-50 hover:shadow-xl">
                    <Play className="h-5 w-5" />
                    Comecar Gratis
                  </button>
                </Link>
                <Link href="/login">
                  <button className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-all hover:bg-white/10">
                    Ja tenho conta
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7C3AED]">
                <Rocket className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold text-[#4C1D95]">LevelUSP</span>
                <p className="text-xs text-gray-500">Uma iniciativa da USP</p>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/leaderboard" className="text-sm text-gray-600 hover:text-[#7C3AED]">
                Ranking
              </Link>
              <Link href="/login" className="text-sm text-gray-600 hover:text-[#7C3AED]">
                Entrar
              </Link>
              <Link href="/signup" className="text-sm text-gray-600 hover:text-[#7C3AED]">
                Cadastrar
              </Link>
            </div>

            <p className="text-sm text-gray-500">
              100% Gratuito para todos os brasileiros
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
