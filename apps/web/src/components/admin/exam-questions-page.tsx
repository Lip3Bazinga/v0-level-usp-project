"use client"

import { useCallback, useEffect, useState } from "react"
import type { AdminExamQuestion, ExamQuestionInput } from "@levelusp/contracts"
import {
  createExamQuestion, errorMessage, fetchAdminExams, fetchExamQuestionsAdmin, updateExamQuestion, type AdminExamSummary,
} from "@/lib/api"
import { CheckCircle2, ChevronDown, GraduationCap, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import type { OnToast } from "@/lib/types/ui"

// Gestão do banco de questões da prova final. O gabarito só aparece aqui
// (rotas /admin) — a API nunca envia correct_index ao aluno.

type AdminExamQuestionInput = ExamQuestionInput

const EMPTY_FORM: AdminExamQuestionInput = {
  prompt: "",
  options: ["", "", "", ""],
  correct_index: 0,
  explanation: "",
  topic: "",
  sort_order: 0,
  active: true,
}

export function ExamQuestionsAdminPage({ onToast }: { onToast: OnToast }) {
  const [exams, setExams] = useState<AdminExamSummary[]>([])
  const [examId, setExamId] = useState<string>("")
  const [questions, setQuestions] = useState<AdminExamQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | "nova" | null>(null)
  const [form, setForm] = useState<AdminExamQuestionInput>(EMPTY_FORM)

  useEffect(() => {
    fetchAdminExams()
      .then((rows) => {
        setExams(rows)
        if (rows.length) setExamId((current) => current || rows[0]!.id)
        else setLoading(false)
      })
      .catch((e) => {
        onToast(errorMessage(e, "Erro ao carregar as provas"), "danger")
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadQuestions = useCallback(async () => {
    if (!examId) return
    setLoading(true)
    try {
      setQuestions(await fetchExamQuestionsAdmin(examId))
    } catch (e) {
      onToast(errorMessage(e, "Erro ao carregar questões"), "danger")
    } finally {
      setLoading(false)
    }
  }, [examId, onToast])

  useEffect(() => { loadQuestions() }, [loadQuestions])

  const startCreate = () => {
    setForm({ ...EMPTY_FORM, options: ["", "", "", ""], sort_order: questions.length + 1 })
    setEditingId("nova")
  }

  const startEdit = (q: AdminExamQuestion) => {
    setForm({
      prompt: q.prompt,
      options: [...q.options],
      correct_index: q.correct_index,
      explanation: q.explanation,
      topic: q.topic,
      sort_order: q.sort_order,
      active: q.active,
    })
    setEditingId(q.id)
  }

  const handleSave = async () => {
    if (form.prompt.trim().length < 10) { onToast("Enunciado muito curto", "danger"); return }
    if (form.options.some((o) => !o.trim())) { onToast("Preencha todas as alternativas", "danger"); return }
    if (form.correct_index >= form.options.length) { onToast("Marque a alternativa correta", "danger"); return }
    setSaving(true)
    try {
      if (editingId === "nova") {
        const created = await createExamQuestion(examId, form)
        setQuestions((prev) => [...prev, created])
        onToast("Questão criada")
      } else if (editingId) {
        const updated = await updateExamQuestion(editingId, form)
        setQuestions((prev) => prev.map((q) => (q.id === updated.id ? updated : q)))
        onToast("Questão atualizada")
      }
      setEditingId(null)
    } catch (e) {
      onToast(errorMessage(e, "Erro ao salvar"), "danger")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (q: AdminExamQuestion) => {
    setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, active: !q.active } : x)))
    try {
      await updateExamQuestion(q.id, { active: !q.active })
      onToast(!q.active ? "Questão ativada" : "Questão desativada")
    } catch (e) {
      setQuestions((prev) => prev.map((x) => (x.id === q.id ? { ...x, active: q.active } : x)))
      onToast(errorMessage(e, "Erro ao atualizar"), "danger")
    }
  }

  const activeCount = questions.filter((q) => q.active).length

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-level-purple-dark">Questões da Prova</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Banco de questões da prova final — o gabarito nunca é visível para alunos
          </p>
        </div>
        <button
          onClick={startCreate}
          disabled={!examId}
          className="flex items-center gap-2 rounded-xl bg-level-purple px-4 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Nova questão
        </button>
      </div>

      {/* Seleção da prova */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="appearance-none rounded-xl border border-border bg-white py-2.5 pl-4 pr-10 text-sm font-medium focus:border-level-purple focus:outline-none"
          >
            {exams.map((e) => (
              <option key={e.id} value={e.id}>{e.course_title} — {e.title}</option>
            ))}
            {!exams.length && <option value="">Nenhuma prova cadastrada</option>}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <span className="text-xs text-muted-foreground">
          {questions.length} questões · {activeCount} ativas na prova
        </span>
      </div>

      {/* Formulário (criar/editar) */}
      {editingId !== null && (
        <div className="mb-6 rounded-2xl border-2 border-level-purple bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-level-purple-dark">
              {editingId === "nova" ? "Nova questão" : "Editar questão"}
            </h2>
            <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <label className="mb-1 block text-xs font-semibold text-muted-foreground">Enunciado</label>
          <textarea
            value={form.prompt}
            onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))}
            rows={3}
            className="mb-4 w-full rounded-xl border border-border p-3 text-sm focus:border-level-purple focus:outline-none"
            placeholder="Ex.: Qual é o resultado de 7 // 2 em Python?"
          />

          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Alternativas (marque a correta)</span>
            <button
              type="button"
              disabled={form.options.length >= 8}
              onClick={() => setForm((f) => ({ ...f, options: [...f.options, ""] }))}
              className="text-xs font-semibold text-level-purple hover:underline disabled:opacity-40"
            >
              + alternativa
            </button>
          </div>
          <div className="mb-4 space-y-2">
            {form.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correta"
                  checked={form.correct_index === i}
                  onChange={() => setForm((f) => ({ ...f, correct_index: i }))}
                  className="accent-[#7C3AED]"
                />
                <input
                  value={opt}
                  onChange={(e) => setForm((f) => {
                    const options = [...f.options]
                    options[i] = e.target.value
                    return { ...f, options }
                  })}
                  className="flex-1 rounded-lg border border-border px-3 py-2 font-mono text-xs focus:border-level-purple focus:outline-none"
                  placeholder={`Alternativa ${i + 1}`}
                />
                <button
                  type="button"
                  aria-label={`Remover alternativa ${i + 1}`}
                  disabled={form.options.length <= 2}
                  onClick={() =>
                    setForm((f) => {
                      const options = f.options.filter((_, j) => j !== i)
                      const correct_index = f.correct_index === i ? 0 : f.correct_index > i ? f.correct_index - 1 : f.correct_index
                      return { ...f, options, correct_index }
                    })
                  }
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <label className="mb-1 block text-xs font-semibold text-muted-foreground">
            Explicação (mostrada a quem erra, após entregar a prova)
          </label>
          <textarea
            value={form.explanation}
            onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
            rows={2}
            className="mb-4 w-full rounded-xl border border-border p-3 text-sm focus:border-level-purple focus:outline-none"
          />

          <div className="mb-4 flex flex-wrap gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Tópico</label>
              <input
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                className="rounded-lg border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
                placeholder="ex.: poo, funcional"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Ordem</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-24 rounded-lg border border-border px-3 py-2 text-sm focus:border-level-purple focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white hover:bg-level-purple-dark transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Salvar questão
          </button>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-level-purple" />
        </div>
      ) : !questions.length ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <GraduationCap className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          Nenhuma questão nesta prova ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className={`rounded-2xl border border-border bg-white p-4 ${q.active ? "" : "opacity-60"}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-level-purple-subtle text-xs font-bold text-level-purple">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-level-purple-dark whitespace-pre-wrap">{q.prompt}</p>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, i) => (
                      <p
                        key={i}
                        className={`font-mono text-xs ${
                          i === q.correct_index ? "font-bold text-green-700" : "text-muted-foreground"
                        }`}
                      >
                        {i === q.correct_index ? "✓ " : "· "}{opt}
                      </p>
                    ))}
                  </div>
                  {q.topic && (
                    <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {q.topic}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => startEdit(q)}
                    className="rounded-lg border border-border p-2 text-muted-foreground hover:text-level-purple hover:border-level-purple transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => toggleActive(q)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      q.active
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-muted text-muted-foreground hover:bg-muted/70"
                    }`}
                  >
                    {q.active ? "Ativa" : "Inativa"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
