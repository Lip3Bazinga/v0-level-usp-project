"use client"

import { useState } from "react"
import Link from "next/link"
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Link2, Loader2, Plus } from "lucide-react"
import type { Lesson } from "@levelusp/contracts"
import { ROUTES } from "@/lib/constants"
import { SortableLesson } from "./sortable-lesson"
import type { CourseLessons } from "./use-course-lessons"

/** Distância mínima do arraste, para um clique nos botões do item não iniciar a reordenação. */
const DRAG_ACTIVATION_DISTANCE_PX = 5

interface CourseLessonsSectionProps {
  lessons: CourseLessons
}

/** Lista arrastável das lições do curso e painel para anexar lições avulsas do professor. */
export function CourseLessonsSection({ lessons }: CourseLessonsSectionProps): React.JSX.Element {
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE_PX } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (over) void lessons.reorder(String(active.id), String(over.id))
  }

  if (lessons.isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-level-purple" />
      </div>
    )
  }

  if (lessons.loadError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {lessons.loadError}
        <button type="button" onClick={() => void lessons.reload()} className="font-semibold underline">
          Tentar novamente
        </button>
      </div>
    )
  }

  const { courseLessons } = lessons

  return (
    <div className="space-y-3">
      {courseLessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma lição vinculada ainda. Adicione abaixo.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={courseLessons.map((lesson) => lesson.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {courseLessons.map((lesson, index) => (
                <SortableLesson
                  key={lesson.id}
                  lesson={lesson}
                  position={index + 1}
                  onRemove={(lessonId) => void lessons.remove(lessonId)}
                  isRemoving={lessons.removingId === lesson.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        type="button"
        onClick={() => setIsAddPanelOpen((wasOpen) => !wasOpen)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
      >
        <Link2 className="h-4 w-4" />
        {isAddPanelOpen ? "Fechar painel" : "Adicionar lição ao curso"}
      </button>

      {isAddPanelOpen && <FreeLessonsPanel freeLessons={lessons.freeLessons} addingId={lessons.addingId} onAdd={(lesson) => void lessons.add(lesson)} />}
    </div>
  )
}

interface FreeLessonsPanelProps {
  freeLessons: Lesson[]
  addingId: string | null
  onAdd: (lesson: Lesson) => void
}

function FreeLessonsPanel({ freeLessons, addingId, onAdd }: FreeLessonsPanelProps): React.JSX.Element {
  return (
    <div className="rounded-xl border-2 border-level-purple/30 bg-level-purple-subtle/30 p-4">
      <p className="mb-3 text-xs font-semibold text-level-purple-dark">Suas lições avulsas — clique para adicionar ao curso</p>
      {freeLessons.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">
          Nenhuma lição avulsa disponível.{" "}
          <Link href={ROUTES.teacherNewLesson} className="font-medium text-level-purple hover:underline">
            Criar nova lição
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {freeLessons.map((lesson) => (
            <div key={lesson.id} className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-level-purple-dark">{lesson.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {lesson.difficulty} · +{lesson.xp_reward} XP
                  {!lesson.published && <span className="ml-1 text-amber-500">· Rascunho</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(lesson)}
                disabled={addingId === lesson.id}
                className="flex items-center gap-1.5 rounded-lg bg-level-purple px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-level-purple-dark disabled:opacity-40"
              >
                {addingId === lesson.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Adicionar
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 border-t border-level-purple/20 pt-3">
        <Link
          href={ROUTES.teacherNewLesson}
          className="flex items-center justify-center gap-2 rounded-lg border border-level-purple px-4 py-2 text-xs font-semibold text-level-purple transition-colors hover:bg-level-purple hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" /> Criar nova lição e vincular depois
        </Link>
      </div>
    </div>
  )
}
