"use client"

import { useEffect, useRef, useState } from "react"
import {
  DndContext, KeyboardSensor, pointerWithin, PointerSensor, rectIntersection, useDraggable, useDroppable, useSensor, useSensors,
  type Announcements, type CollisionDetection, type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ArrowDown, ArrowUp, GripVertical, IndentDecrease, IndentIncrease, Plus, X } from "lucide-react"
import { MAX_PARSONS_INDENT, type ParsonsLine, type ParsonsPlacement } from "@levelusp/contracts"
import { cn } from "@/lib/utils"
import { availableLines, indentLine, moveLine, placeLine, unplaceLine } from "@/lib/utils/exercise-modes"

const SOURCE_AREA_ID = "area:origem"
const ANSWER_AREA_ID = "area:resposta"
/** Quantos pixels de arrasto na horizontal valem um nível de indentação. */
const INDENT_DRAG_PX = 28
const INDENT_STEP_REM = 1.5
const ICON_BUTTON_CLASS = "rounded p-1 text-gray-600 hover:bg-level-purple-light hover:text-level-purple focus-visible:outline-2 focus-visible:outline-level-purple disabled:opacity-30"
const HANDLE_CLASS = "cursor-grab touch-none rounded p-1 text-gray-400 hover:text-level-purple focus-visible:outline-2 focus-visible:outline-level-purple active:cursor-grabbing"

const isAreaId = (id: string | number): boolean => id === SOURCE_AREA_ID || id === ANSWER_AREA_ID

/**
 * Onde a linha arrastada está: vale o que está sob o ponteiro (no arrasto por teclado, o que a
 * linha cobre) e, havendo uma linha da resposta ali, ela ganha da área em volta — senão a área,
 * que contém as linhas, capturaria todo arrasto e não daria para reordenar.
 */
const detectCollision: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)
  const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args)
  const lineHit = hits.find((hit) => !isAreaId(hit.id))
  if (lineHit) return [lineHit]
  const [areaHit] = hits
  return areaHit ? [areaHit] : []
}

const SCREEN_READER_INSTRUCTIONS = {
  draggable: "Para arrastar pelo teclado, pressione Espaço na alça, use as setas e solte com Espaço; Esc cancela. Os botões ao lado de cada linha fazem o mesmo sem arrastar.",
}

interface ParsonsBoardProps {
  /** Linhas do passo como a API entregou: já embaralhadas, com os distratores no meio. */
  lines: readonly ParsonsLine[]
  /** Resposta do aluno: as linhas escolhidas, na ordem, com a indentação de cada uma. */
  placements: readonly ParsonsPlacement[]
  onChange: (placements: ParsonsPlacement[]) => void
}

/**
 * Exercício de ordenar (Parsons): linhas disponíveis de um lado, resposta do outro. O aluno
 * arrasta (soltar mais à direita ou à esquerda muda a indentação) ou usa os botões de cada
 * linha — adicionar, remover, subir, descer, indentar e desindentar —, que cobrem tudo pelo
 * teclado. A tela não sabe a ordem certa: só guarda o que o aluno montou.
 */
export function ParsonsBoard({ lines, placements, onChange }: ParsonsBoardProps): React.JSX.Element {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const containerRef = useRef<HTMLDivElement>(null)
  // Depois de uma ação por botão a linha muda de lugar: o foco é devolvido a um botão dela.
  const pendingFocus = useRef<string[]>([])
  const [announcement, setAnnouncement] = useState("")
  const available = availableLines(lines, placements)
  const textById = new Map(lines.map((line) => [line.id, line.text]))

  useEffect(() => {
    const candidates = pendingFocus.current
    pendingFocus.current = []
    for (const focusKey of candidates) {
      const button = containerRef.current?.querySelector<HTMLButtonElement>(`[data-focus="${focusKey}"]:not(:disabled)`)
      if (button) {
        button.focus()
        return
      }
    }
  }, [placements])

  const apply = (next: ParsonsPlacement[], message: string, focusKeys: string[]): void => {
    pendingFocus.current = focusKeys
    setAnnouncement(message)
    onChange(next)
  }

  const handleAdd = (lineId: string): void => {
    const sourceIndex = available.findIndex((line) => line.id === lineId)
    const neighbor = available[sourceIndex + 1] ?? available[sourceIndex - 1]
    apply(placeLine(placements, lineId), `Linha adicionada à resposta na posição ${placements.length + 1}.`, [...(neighbor ? [`${neighbor.id}:add`] : []), `${lineId}:remove`])
  }
  const handleRemove = (lineId: string): void => {
    const index = placements.findIndex((placement) => placement.line_id === lineId)
    const neighbor = placements[index + 1] ?? placements[index - 1]
    apply(unplaceLine(placements, lineId), "Linha devolvida às linhas disponíveis.", [...(neighbor ? [`${neighbor.line_id}:remove`] : []), `${lineId}:add`])
  }
  const handleMove = (lineId: string, direction: -1 | 1): void => {
    const next = moveLine(placements, lineId, direction)
    const position = next.findIndex((placement) => placement.line_id === lineId) + 1
    apply(next, `Linha movida para a posição ${position} de ${next.length}.`, direction === -1 ? [`${lineId}:up`, `${lineId}:down`] : [`${lineId}:down`, `${lineId}:up`])
  }
  const handleIndent = (lineId: string, delta: -1 | 1): void => {
    const next = indentLine(placements, lineId, delta)
    const indent = next.find((placement) => placement.line_id === lineId)?.indent ?? 0
    apply(next, `Indentação da linha: nível ${indent}.`, delta === -1 ? [`${lineId}:outdent`, `${lineId}:indent`] : [`${lineId}:indent`, `${lineId}:outdent`])
  }

  const handleDragEnd = ({ active, over, delta }: DragEndEvent): void => {
    if (!over) return
    const lineId = String(active.id)
    const overId = String(over.id)
    const isPlaced = placements.some((placement) => placement.line_id === lineId)
    if (overId === SOURCE_AREA_ID) {
      if (isPlaced) apply(unplaceLine(placements, lineId), "Linha devolvida às linhas disponíveis.", [])
      return
    }
    const overIndex = placements.findIndex((placement) => placement.line_id === overId)
    // Solta na área da resposta, fora de qualquer linha: vai para o fim.
    const moved = placeLine(placements, lineId, overIndex === -1 ? placements.length : overIndex)
    // Arrastar para os lados dentro da resposta ajusta a indentação, como num editor de blocos.
    const next = isPlaced ? indentLine(moved, lineId, Math.round(delta.x / INDENT_DRAG_PX)) : moved
    apply(next, `Linha na posição ${next.findIndex((placement) => placement.line_id === lineId) + 1} de ${next.length}.`, [])
  }

  const describe = (id: string | number): string => textById.get(String(id)) ?? "linha"
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Linha ${describe(active.id)} levantada.`,
    onDragOver: ({ over }) => (over ? (over.id === SOURCE_AREA_ID ? "Sobre as linhas disponíveis." : "Sobre a resposta.") : "Fora das áreas."),
    onDragEnd: ({ active }) => `Linha ${describe(active.id)} solta.`,
    onDragCancel: () => "Arrasto cancelado.",
  }

  return (
    <DndContext sensors={sensors} collisionDetection={detectCollision} onDragEnd={handleDragEnd} accessibility={{ announcements, screenReaderInstructions: SCREEN_READER_INSTRUCTIONS }}>
      <div ref={containerRef} className="grid h-full gap-3 overflow-auto bg-gray-50 p-3 md:grid-cols-2">
        <DropArea id={SOURCE_AREA_ID} title="Linhas disponíveis" hint="Algumas linhas podem sobrar: nem todas fazem parte da resposta.">
          {available.length === 0 && <p className="p-3 text-xs text-muted-foreground">Todas as linhas estão na resposta.</p>}
          <ul className="space-y-1.5">
            {available.map((line) => (
              <SourceLine key={line.id} line={line} onAdd={handleAdd} />
            ))}
          </ul>
        </DropArea>
        <DropArea id={ANSWER_AREA_ID} title="Sua resposta" hint="Ordene as linhas e ajuste a indentação de cada uma.">
          {placements.length === 0 && <p className="p-3 text-xs text-muted-foreground">Arraste as linhas para cá ou use o botão Adicionar de cada linha.</p>}
          <SortableContext items={placements.map((placement) => placement.line_id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-1.5">
              {placements.map((placement, index) => (
                <AnswerLine
                  key={placement.line_id}
                  placement={placement}
                  text={textById.get(placement.line_id) ?? ""}
                  position={index + 1}
                  total={placements.length}
                  onMove={handleMove}
                  onIndent={handleIndent}
                  onRemove={handleRemove}
                />
              ))}
            </ol>
          </SortableContext>
        </DropArea>
      </div>
      <p aria-live="polite" className="sr-only">{announcement}</p>
    </DndContext>
  )
}

interface DropAreaProps {
  id: string
  title: string
  hint: string
  children: React.ReactNode
}

function DropArea({ id, title, hint, children }: DropAreaProps): React.JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <section ref={setNodeRef} aria-label={title} className={cn("flex min-h-40 flex-col rounded-xl border-2 border-dashed bg-white p-2 transition-colors", isOver ? "border-level-purple bg-level-purple-light/40" : "border-gray-300")}>
      <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-level-purple">{title}</h3>
      <p className="mb-2 px-1 text-xs text-muted-foreground">{hint}</p>
      {children}
    </section>
  )
}

interface SourceLineProps {
  line: ParsonsLine
  onAdd: (lineId: string) => void
}

function SourceLine({ line, onAdd }: SourceLineProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: line.id })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), zIndex: isDragging ? 50 : undefined }} className={cn("flex items-center gap-1 rounded-lg border bg-white px-1 py-1", isDragging ? "border-level-purple shadow-lg" : "border-gray-200")}>
      <button type="button" {...attributes} {...listeners} aria-label={`Arrastar a linha: ${line.text}`} className={HANDLE_CLASS}>
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-xs text-gray-900">{line.text}</code>
      <button type="button" data-focus={`${line.id}:add`} onClick={() => onAdd(line.id)} aria-label={`Adicionar à resposta: ${line.text}`} className={ICON_BUTTON_CLASS}>
        <Plus className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  )
}

interface AnswerLineProps {
  placement: ParsonsPlacement
  text: string
  /** Posição na resposta (1 = primeira linha). */
  position: number
  total: number
  onMove: (lineId: string, direction: -1 | 1) => void
  onIndent: (lineId: string, delta: -1 | 1) => void
  onRemove: (lineId: string) => void
}

function AnswerLine({ placement, text, position, total, onMove, onIndent, onRemove }: AnswerLineProps): React.JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: placement.line_id })
  const { line_id: lineId, indent } = placement
  const label = `linha ${position}: ${text}`
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }} className={cn("flex items-center gap-1 rounded-lg border bg-white px-1 py-1", isDragging ? "border-level-purple shadow-lg" : "border-gray-200")}>
      <button type="button" {...attributes} {...listeners} aria-label={`Arrastar a ${label}`} className={HANDLE_CLASS}>
        <GripVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      <code data-indent={indent} style={{ paddingLeft: `${indent * INDENT_STEP_REM}rem` }} className="min-w-0 flex-1 overflow-x-auto whitespace-pre font-mono text-xs text-gray-900">
        <span className="sr-only">Nível de indentação {indent}: </span>
        {text}
      </code>
      <button type="button" data-focus={`${lineId}:outdent`} onClick={() => onIndent(lineId, -1)} disabled={indent === 0} aria-label={`Desindentar a ${label}`} className={ICON_BUTTON_CLASS}>
        <IndentDecrease className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" data-focus={`${lineId}:indent`} onClick={() => onIndent(lineId, 1)} disabled={indent >= MAX_PARSONS_INDENT} aria-label={`Indentar a ${label}`} className={ICON_BUTTON_CLASS}>
        <IndentIncrease className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" data-focus={`${lineId}:up`} onClick={() => onMove(lineId, -1)} disabled={position === 1} aria-label={`Subir a ${label}`} className={ICON_BUTTON_CLASS}>
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" data-focus={`${lineId}:down`} onClick={() => onMove(lineId, 1)} disabled={position === total} aria-label={`Descer a ${label}`} className={ICON_BUTTON_CLASS}>
        <ArrowDown className="h-4 w-4" aria-hidden="true" />
      </button>
      <button type="button" data-focus={`${lineId}:remove`} onClick={() => onRemove(lineId)} aria-label={`Remover da resposta a ${label}`} className={ICON_BUTTON_CLASS}>
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  )
}
