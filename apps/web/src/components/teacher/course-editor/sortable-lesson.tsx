"use client"

import Link from "next/link"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Eye, GripVertical, Link2Off, Loader2 } from "lucide-react"
import type { Lesson } from "@levelusp/contracts"

/** Item arrastável da lista de lições do curso. */
export function SortableLesson({ lesson, index, onRemove, removing }: {
  lesson: Lesson
  index: number
  onRemove: (id: string) => void
  removing: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
      className={`flex items-center gap-3 rounded-xl border-2 bg-white px-3 py-2.5 transition-colors ${
        isDragging ? "border-level-purple shadow-lg" : "border-border hover:border-level-purple/40"
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-level-purple active:cursor-grabbing"
        title="Arrastar para reordenar"
        aria-label={`Reordenar ${lesson.title}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-level-purple-subtle text-[11px] font-bold text-level-purple">
        {index + 1}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-level-purple-dark">{lesson.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {lesson.difficulty} · +{lesson.xp_reward} XP
          {!lesson.published && <span className="ml-1 text-amber-500">· Rascunho</span>}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/teacher/edit/${lesson.id}`}
          target="_blank"
          title="Editar lição"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-level-purple-light hover:text-level-purple"
        >
          <Eye className="h-3.5 w-3.5" />
        </Link>
        <button
          onClick={() => onRemove(lesson.id)}
          disabled={removing}
          title="Remover do curso"
          aria-label={`Remover ${lesson.title} do curso`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
        >
          {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
