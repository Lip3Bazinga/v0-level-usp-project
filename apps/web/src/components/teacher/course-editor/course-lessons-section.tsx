"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Link2, Loader2, Plus } from "lucide-react"
import type { Lesson } from "@levelusp/contracts"
import {
  addLessonToCourse, errorMessage, fetchCourseLessons, fetchTeacherLessons, removeLessonFromCourse, reorderLessons,
} from "@/lib/api"
import { SortableLesson } from "./sortable-lesson"

/**
 * Lições do curso: lista arrastável (a ordem é salva na hora), remover e
 * anexar lições avulsas do professor. Avisa o pai sobre a lista atual (prévia).
 */
export function CourseLessonsSection({ courseId, onLessonsChange, onError, onBusyChange }: {
  courseId: string
  onLessonsChange: (lessons: Lesson[]) => void
  onError: (message: string) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const [courseLessons, setCourseLessons] = useState<Lesson[]>([])
  const [freeLessons, setFreeLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [showAddPanel, setShowAddPanel] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const setLessons = useCallback(
    (next: Lesson[]) => {
      setCourseLessons(next)
      onLessonsChange(next)
    },
    [onLessonsChange],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchCourseLessons(courseId), fetchTeacherLessons()])
      .then(([inCourse, mine]) => {
        if (cancelled) return
        const sorted = [...inCourse].sort((a, b) => a.order - b.order)
        setLessons(sorted)
        const ids = new Set(sorted.map((l) => l.id))
        setFreeLessons(mine.filter((l) => !ids.has(l.id) && l.course_id === null))
      })
      .catch((err) => !cancelled && onError(errorMessage(err, "Não foi possível carregar as lições do curso.")))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const previous = courseLessons
    const reordered = arrayMove(
      previous,
      previous.findIndex((l) => l.id === active.id),
      previous.findIndex((l) => l.id === over.id),
    )
    setLessons(reordered) // otimista
    onBusyChange?.(true)
    try {
      await reorderLessons(courseId, reordered.map((l) => l.id))
    } catch (err) {
      setLessons(previous)
      onError(`Erro ao salvar a nova ordem: ${errorMessage(err)}`)
    } finally {
      onBusyChange?.(false)
    }
  }

  const handleRemove = async (lessonId: string) => {
    setRemovingId(lessonId)
    try {
      await removeLessonFromCourse(lessonId, courseId)
      const removed = courseLessons.find((l) => l.id === lessonId)
      setLessons(courseLessons.filter((l) => l.id !== lessonId))
      if (removed) setFreeLessons((prev) => [...prev, { ...removed, course_id: null }])
    } catch (err) {
      onError(`Erro ao remover lição: ${errorMessage(err)}`)
    } finally {
      setRemovingId(null)
    }
  }

  const handleAdd = async (lesson: Lesson) => {
    setAddingId(lesson.id)
    try {
      const order = courseLessons.length + 1
      await addLessonToCourse(lesson.id, courseId, order)
      setLessons([...courseLessons, { ...lesson, course_id: courseId, order }])
      setFreeLessons((prev) => prev.filter((l) => l.id !== lesson.id))
    } catch (err) {
      onError(`Erro ao adicionar lição: ${errorMessage(err)}`)
    } finally {
      setAddingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-level-purple" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {courseLessons.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma lição vinculada ainda. Adicione abaixo.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={courseLessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {courseLessons.map((lesson, i) => (
                <SortableLesson key={lesson.id} lesson={lesson} index={i} onRemove={handleRemove} removing={removingId === lesson.id} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <button
        type="button"
        onClick={() => setShowAddPanel((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-level-purple hover:text-level-purple"
      >
        <Link2 className="h-4 w-4" />
        {showAddPanel ? "Fechar painel" : "Adicionar lição ao curso"}
      </button>

      {showAddPanel && (
        <div className="rounded-xl border-2 border-level-purple/30 bg-level-purple-subtle/30 p-4">
          <p className="mb-3 text-xs font-semibold text-level-purple-dark">Suas lições avulsas — clique para adicionar ao curso</p>
          {freeLessons.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              Nenhuma lição avulsa disponível.{" "}
              <Link href="/teacher/edit/new" className="font-medium text-level-purple hover:underline">Criar nova lição</Link>
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
                    onClick={() => handleAdd(lesson)}
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
              href="/teacher/edit/new"
              className="flex items-center justify-center gap-2 rounded-lg border border-level-purple px-4 py-2 text-xs font-semibold text-level-purple transition-colors hover:bg-level-purple hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Criar nova lição e vincular depois
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
