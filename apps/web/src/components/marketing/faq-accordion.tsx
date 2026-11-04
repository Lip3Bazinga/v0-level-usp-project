"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { EASE } from "./motion-primitives"
import type { FaqItem } from "./content/faq"

interface FaqAccordionProps {
  items: readonly FaqItem[]
}

/** Lista de perguntas em que só uma resposta fica aberta por vez (a primeira começa aberta). */
export function FaqAccordion({ items }: FaqAccordionProps): React.JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index
        return (
          <div
            key={item.question}
            className={cn(
              "overflow-hidden rounded-2xl border transition-colors",
              isOpen ? "border-level-purple-medium bg-white" : "border-gray-100 bg-white",
            )}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-level-purple-dark">{item.question}</span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-level-purple transition-transform",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                >
                  <p className="px-6 pb-5 leading-relaxed text-gray-600">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
