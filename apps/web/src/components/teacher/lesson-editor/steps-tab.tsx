"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, ListOrdered, Plus, Trash2 } from "lucide-react"
import {
  BLANK_TOKEN, EXERCISE_MODES, exerciseModeSchema, MAX_EXPECTED_OUTPUT_LENGTH, MAX_LESSON_STEPS, STEP_KINDS,
  type LessonStepInput, type StepKind, type StepQuizQuestionInput,
} from "@levelusp/contracts"
import { countBlanks } from "@/lib/utils/exercise-modes"
import { moveItem, type MoveDirection } from "@/lib/utils"
import { ADD_BUTTON_CLASS, EditorPanel, MINI_LABEL_CLASS, SMALL_INPUT_CLASS } from "./panel"
import {
  checkpointsFromLines, createStep, EXERCISE_MODE_LABELS, exerciseModeChanges, hintsFromLines, linesOf, mainFileContent, parseTestCasesJson, parsonsContentChanges,
  parsonsDistractors, renumberSteps, STEP_KIND_LABELS, withMainFileContent,
} from "./steps-form"

const TEXTAREA_CLASS = `${SMALL_INPUT_CLASS} font-mono`
const JSON_INDENT = 2

interface StepsTabProps {
  steps: LessonStepInput[]
  onChange: (steps: LessonStepInput[]) => void
  /** Índice do passo aberto. Quando informado, o componente é controlado pela tela (ex.: a prévia segue o passo em edição). */
  openIndex?: number
  /** Avisa que o professor abriu outro passo (clique, novo passo, remover ou mover). */
  onOpenIndexChange?: (index: number) => void
}

/**
 * Editor dos passos da lição guiada: leitura, exercício (modo de resposta — código, lacunas ou
 * ordenar —, código inicial, solução, instruções, dicas e casos de teste), previsão (código, saída
 * esperada e dicas) e quiz. Ao salvar, a lista inteira é enviada em `steps` e substitui
 * os passos da lição (o id de cada posição é preservado pela API).
 *
 * O passo aberto é interno por padrão; com `openIndex` (e `onOpenIndexChange`) a tela controla
 * qual passo está aberto e fica sabendo qual o professor está editando.
 */
export function StepsTab({ steps, onChange, openIndex: controlledOpenIndex, onOpenIndexChange }: StepsTabProps): React.JSX.Element {
  const [internalOpenIndex, setInternalOpenIndex] = useState(0)
  const openIndex = controlledOpenIndex ?? internalOpenIndex
  const setOpenIndex = (index: number): void => {
    setInternalOpenIndex(index)
    onOpenIndexChange?.(index)
  }

  const patchStep = (index: number, changes: Partial<LessonStepInput>): void => {
    onChange(steps.map((step, position) => (position === index ? { ...step, ...changes } : step)))
  }
  const addStep = (kind: StepKind): void => {
    onChange([...steps, createStep(kind, steps.length + 1)])
    setOpenIndex(steps.length)
  }
  const removeStep = (index: number): void => {
    onChange(renumberSteps(steps.filter((_step, position) => position !== index)))
    setOpenIndex(Math.max(0, index - 1))
  }
  const moveStep = (index: number, direction: MoveDirection): void => {
    onChange(renumberSteps(moveItem(steps, index, direction)))
    setOpenIndex(index + direction)
  }

  return (
    <EditorPanel
      icon={ListOrdered}
      title="Passos da lição"
      subtitle="O aluno percorre os passos em ordem; cada exercício é corrigido pelos casos do próprio passo."
      action={
        <div className="flex flex-wrap gap-2">
          {STEP_KINDS.map((kind) => (
            <button key={kind} type="button" onClick={() => addStep(kind)} disabled={steps.length >= MAX_LESSON_STEPS} className={ADD_BUTTON_CLASS}>
              <Plus className="h-4 w-4" /> {STEP_KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      }
    >
      {steps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum passo ainda. Adicione uma leitura, um exercício, um quiz ou uma previsão.
        </p>
      ) : (
        <ol className="space-y-3">
          {steps.map((step, index) => (
            <li key={`${step.order}-${step.kind}`} className="rounded-xl border-2 border-border">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpenIndex(index)} aria-expanded={openIndex === index} className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-level-purple-dark">
                  {step.order}. {STEP_KIND_LABELS[step.kind]} — {step.title}
                </button>
                <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} aria-label={`Mover o passo ${step.order} para cima`} className="rounded p-1 text-muted-foreground hover:text-level-purple disabled:opacity-30">
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => moveStep(index, 1)} disabled={index === steps.length - 1} aria-label={`Mover o passo ${step.order} para baixo`} className="rounded p-1 text-muted-foreground hover:text-level-purple disabled:opacity-30">
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => removeStep(index)} aria-label={`Remover o passo ${step.order}`} className="rounded p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {openIndex === index && <StepFields step={step} onChange={(changes) => patchStep(index, changes)} />}
            </li>
          ))}
        </ol>
      )}
    </EditorPanel>
  )
}

interface StepFieldsProps {
  step: LessonStepInput
  onChange: (changes: Partial<LessonStepInput>) => void
}

function StepFields({ step, onChange }: StepFieldsProps): React.JSX.Element {
  const fieldId = (name: string): string => `passo-${step.order}-${name}`
  return (
    <div className="space-y-3 border-t border-border p-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
        <div>
          <label htmlFor={fieldId("titulo")} className={MINI_LABEL_CLASS}>Título</label>
          <input id={fieldId("titulo")} value={step.title} onChange={(event) => onChange({ title: event.target.value })} className={SMALL_INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor={fieldId("xp")} className={MINI_LABEL_CLASS}>XP do passo</label>
          <input
            id={fieldId("xp")}
            type="number"
            min={0}
            max={5000}
            value={step.xp}
            onChange={(event) => onChange({ xp: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })}
            className={SMALL_INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label htmlFor={fieldId("narrativa")} className={MINI_LABEL_CLASS}>Texto (Markdown)</label>
        <textarea id={fieldId("narrativa")} rows={6} value={step.narrative_markdown} onChange={(event) => onChange({ narrative_markdown: event.target.value })} className={SMALL_INPUT_CLASS} />
      </div>
      {step.kind === "exercicio" && <ExerciseFields step={step} onChange={onChange} fieldId={fieldId} />}
      {step.kind === "previsao" && <PredictionFields step={step} onChange={onChange} fieldId={fieldId} />}
      {step.kind === "quiz" && <QuizFields questions={step.quiz_questions} onChange={(quiz_questions) => onChange({ quiz_questions })} fieldId={fieldId} />}
    </div>
  )
}

interface ExerciseFieldsProps extends StepFieldsProps {
  fieldId: (name: string) => string
}

function ExerciseFields({ step, onChange, fieldId }: ExerciseFieldsProps): React.JSX.Element {
  // O JSON em edição pode estar incompleto: só vira `test_cases` quando passa na validação.
  const [casesText, setCasesText] = useState(() => JSON.stringify(step.test_cases, null, JSON_INDENT))
  const [casesError, setCasesError] = useState<string | null>(null)

  const handleCasesChange = (text: string): void => {
    setCasesText(text)
    const parsed = parseTestCasesJson(text)
    setCasesError(parsed.ok ? null : parsed.error)
    if (parsed.ok) onChange({ test_cases: parsed.cases })
  }

  const mode = step.exercise_mode
  const solution = mainFileContent(step.solution_files)
  const starter = mainFileContent(step.starter_files)

  const handleSolutionChange = (content: string): void => {
    // No modo ordenar as linhas do aluno saem da solução: mudou a solução, as linhas são refeitas.
    if (mode === "ordenar") onChange(parsonsContentChanges(content, parsonsDistractors(step.parsons_lines, solution)))
    else onChange({ solution_files: withMainFileContent(step.solution_files, content) })
  }

  return (
    <>
      <div>
        <label htmlFor={fieldId("modo")} className={MINI_LABEL_CLASS}>Como o aluno responde</label>
        <select
          id={fieldId("modo")}
          value={mode}
          onChange={(event) => {
            const parsed = exerciseModeSchema.safeParse(event.target.value)
            if (parsed.success) onChange(exerciseModeChanges(step, parsed.data))
          }}
          className={SMALL_INPUT_CLASS}
        >
          {EXERCISE_MODES.map((option) => (
            <option key={option} value={option}>{EXERCISE_MODE_LABELS[option]}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={fieldId("instrucoes")} className={MINI_LABEL_CLASS}>Instruções (uma por linha; viram os checkpoints 1, 2, 3…)</label>
        <textarea
          id={fieldId("instrucoes")}
          rows={3}
          defaultValue={step.checkpoints.map((checkpoint) => checkpoint.instruction).join("\n")}
          onChange={(event) => onChange({ checkpoints: checkpointsFromLines(event.target.value, step.checkpoints) })}
          className={SMALL_INPUT_CLASS}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {mode === "ordenar" ? (
          <div>
            <label htmlFor={fieldId("distratores")} className={MINI_LABEL_CLASS}>Distratores (opcional; uma linha errada por linha, sem indentação)</label>
            <textarea
              id={fieldId("distratores")}
              rows={8}
              spellCheck={false}
              defaultValue={parsonsDistractors(step.parsons_lines, solution).join("\n")}
              onChange={(event) => onChange(parsonsContentChanges(solution, linesOf(event.target.value)))}
              className={TEXTAREA_CLASS}
            />
          </div>
        ) : (
          <div>
            <label htmlFor={fieldId("inicial")} className={MINI_LABEL_CLASS}>
              {mode === "lacunas" ? `Código inicial (main.py) — marque cada lacuna com ${BLANK_TOKEN}` : "Código inicial (main.py)"}
            </label>
            <textarea
              id={fieldId("inicial")}
              rows={8}
              spellCheck={false}
              value={starter}
              onChange={(event) => onChange({ starter_files: withMainFileContent(step.starter_files, event.target.value) })}
              aria-describedby={mode === "lacunas" ? fieldId("inicial-lacunas") : undefined}
              className={TEXTAREA_CLASS}
            />
            {mode === "lacunas" && (
              <p id={fieldId("inicial-lacunas")} className="mt-1 text-xs text-muted-foreground">
                Lacunas encontradas: {countBlanks(starter)}. O aluno só edita as lacunas; a correção usa os casos de teste.
              </p>
            )}
          </div>
        )}
        <div>
          <label htmlFor={fieldId("solucao")} className={MINI_LABEL_CLASS}>
            {mode === "ordenar" ? "Solução (as linhas dela, embaralhadas, são o que o aluno ordena; indente com 4 espaços)" : "Solução de referência (o aluno só vê depois das tentativas)"}
          </label>
          <textarea id={fieldId("solucao")} rows={8} spellCheck={false} value={solution} onChange={(event) => handleSolutionChange(event.target.value)} className={TEXTAREA_CLASS} />
        </div>
      </div>
      {mode === "ordenar" && (
        <div>
          <p className={MINI_LABEL_CLASS}>Linhas que o aluno recebe (já embaralhadas, sem indentação)</p>
          <ol aria-label="Linhas que o aluno recebe" className="list-decimal space-y-0.5 rounded-xl border border-border bg-muted/40 py-2 pl-8 pr-3 font-mono text-xs">
            {step.parsons_lines.map((line) => (
              <li key={line.id}>{line.text}</li>
            ))}
          </ol>
        </div>
      )}
      <div>
        <label htmlFor={fieldId("dicas")} className={MINI_LABEL_CLASS}>Dicas (uma por linha, até 3; reveladas uma a uma)</label>
        <textarea
          id={fieldId("dicas")}
          rows={3}
          defaultValue={step.hints.join("\n")}
          onChange={(event) => onChange({ hints: hintsFromLines(event.target.value) })}
          className={SMALL_INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor={fieldId("casos")} className={MINI_LABEL_CLASS}>Casos de teste (JSON; use &quot;checkpoint&quot; para ligar o caso à instrução)</label>
        <textarea
          id={fieldId("casos")}
          rows={8}
          spellCheck={false}
          value={casesText}
          onChange={(event) => handleCasesChange(event.target.value)}
          aria-invalid={casesError !== null}
          aria-describedby={casesError ? fieldId("casos-erro") : undefined}
          className={TEXTAREA_CLASS}
        />
        {casesError && <p id={fieldId("casos-erro")} role="alert" className="mt-1 text-xs text-destructive">{casesError} (os últimos casos válidos continuam valendo)</p>}
      </div>
    </>
  )
}

function PredictionFields({ step, onChange, fieldId }: ExerciseFieldsProps): React.JSX.Element {
  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <label htmlFor={fieldId("codigo")} className={MINI_LABEL_CLASS}>Código que o aluno lê (main.py; ele não pode executar)</label>
          <textarea
            id={fieldId("codigo")}
            rows={8}
            spellCheck={false}
            value={mainFileContent(step.starter_files)}
            onChange={(event) => onChange({ starter_files: withMainFileContent(step.starter_files, event.target.value) })}
            className={TEXTAREA_CLASS}
          />
        </div>
        <div>
          <label htmlFor={fieldId("saida")} className={MINI_LABEL_CLASS}>Saída esperada (exatamente o que o código imprime)</label>
          <textarea
            id={fieldId("saida")}
            rows={8}
            spellCheck={false}
            maxLength={MAX_EXPECTED_OUTPUT_LENGTH}
            value={step.expected_output}
            onChange={(event) => onChange({ expected_output: event.target.value })}
            aria-describedby={fieldId("saida-ajuda")}
            className={TEXTAREA_CLASS}
          />
          <p id={fieldId("saida-ajuda")} className="mt-1 text-xs text-muted-foreground">
            O editor não executa o código: rode-o antes e copie a saída. A comparação ignora espaços no fim das linhas; o aluno nunca recebe este texto antes das tentativas.
          </p>
        </div>
      </div>
      <div>
        <label htmlFor={fieldId("dicas")} className={MINI_LABEL_CLASS}>Dicas (uma por linha, até 3; reveladas uma a uma)</label>
        <textarea
          id={fieldId("dicas")}
          rows={3}
          defaultValue={step.hints.join("\n")}
          onChange={(event) => onChange({ hints: hintsFromLines(event.target.value) })}
          className={SMALL_INPUT_CLASS}
        />
      </div>
    </>
  )
}

interface QuizFieldsProps {
  questions: StepQuizQuestionInput[]
  onChange: (questions: StepQuizQuestionInput[]) => void
  fieldId: (name: string) => string
}

function QuizFields({ questions, onChange, fieldId }: QuizFieldsProps): React.JSX.Element {
  const patchQuestion = (index: number, changes: Partial<StepQuizQuestionInput>): void => {
    onChange(questions.map((question, position) => (position === index ? { ...question, ...changes } : question)))
  }
  return (
    <div className="space-y-3">
      {questions.map((question, index) => (
        <fieldset key={index} className="space-y-2 rounded-xl border border-border p-3">
          <legend className="px-1 text-xs font-bold text-level-purple-dark">Questão {index + 1}</legend>
          <div>
            <label htmlFor={fieldId(`q${index}-enunciado`)} className={MINI_LABEL_CLASS}>Enunciado</label>
            <input id={fieldId(`q${index}-enunciado`)} value={question.prompt} onChange={(event) => patchQuestion(index, { prompt: event.target.value })} className={SMALL_INPUT_CLASS} />
          </div>
          <div>
            <label htmlFor={fieldId(`q${index}-opcoes`)} className={MINI_LABEL_CLASS}>Alternativas (uma por linha)</label>
            <textarea
              id={fieldId(`q${index}-opcoes`)}
              rows={4}
              defaultValue={question.options.join("\n")}
              onChange={(event) => {
                const options = linesOf(event.target.value)
                patchQuestion(index, { options, correct_index: Math.min(question.correct_index, Math.max(options.length - 1, 0)) })
              }}
              className={SMALL_INPUT_CLASS}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <div>
              <label htmlFor={fieldId(`q${index}-correta`)} className={MINI_LABEL_CLASS}>Alternativa correta</label>
              <select
                id={fieldId(`q${index}-correta`)}
                value={question.correct_index}
                onChange={(event) => patchQuestion(index, { correct_index: Number(event.target.value) })}
                className={SMALL_INPUT_CLASS}
              >
                {question.options.map((option, optionIndex) => (
                  <option key={optionIndex} value={optionIndex}>{optionIndex + 1}. {option}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={fieldId(`q${index}-explicacao`)} className={MINI_LABEL_CLASS}>Explicação (aparece depois da resposta)</label>
              <input id={fieldId(`q${index}-explicacao`)} value={question.explanation} onChange={(event) => patchQuestion(index, { explanation: event.target.value })} className={SMALL_INPUT_CLASS} />
            </div>
          </div>
          <button type="button" onClick={() => onChange(questions.filter((_question, position) => position !== index))} disabled={questions.length === 1} className="text-xs font-semibold text-destructive disabled:opacity-40">
            Remover questão
          </button>
        </fieldset>
      ))}
      <button type="button" onClick={() => onChange([...questions, { prompt: "Pergunta", options: ["Alternativa A", "Alternativa B"], correct_index: 0, explanation: "" }])} className={ADD_BUTTON_CLASS}>
        <Plus className="h-4 w-4" /> Questão
      </button>
    </div>
  )
}
