import { Injectable } from "@nestjs/common"
import type { AdminExamQuestion, ExamQuestionInput, ExamQuestionUpdateInput } from "@levelusp/contracts"
import { AppError, NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { AuditService } from "../audit/audit.service"
import { toAdminQuestion } from "./exams.mapper"
import { ExamsRepository } from "./exams.repository"

export interface AdminExamSummary {
  id: string
  course_id: string
  course_title: string
  title: string
}

/** Banco de questões da prova final (somente admin — inclui gabarito). */
@Injectable()
export class ExamsAdminService {
  constructor(
    private readonly repo: ExamsRepository,
    private readonly audit: AuditService,
  ) {}

  listExams(): Promise<AdminExamSummary[]> {
    return this.repo.listExams()
  }

  async questions(examId: string): Promise<AdminExamQuestion[]> {
    await this.requireExam(examId)
    return (await this.repo.questionsOfExam(examId)).map(toAdminQuestion)
  }

  async createQuestion(actor: AuthUser, examId: string, input: ExamQuestionInput): Promise<AdminExamQuestion> {
    const exam = await this.requireExam(examId)
    const row = await this.repo.insertQuestion({
      examId,
      prompt: input.prompt,
      options: input.options,
      correctIndex: input.correct_index,
      explanation: input.explanation,
      topic: input.topic,
      sortOrder: input.sort_order,
      active: input.active,
    })
    await this.audit.log(actor, "exam_question.created", row.id, { exam_id: examId, exam_title: exam.title })
    return toAdminQuestion(row)
  }

  async updateQuestion(actor: AuthUser, id: string, input: ExamQuestionUpdateInput): Promise<AdminExamQuestion> {
    const current = await this.repo.findQuestion(id)
    if (!current) throw NotFound("Questão")
    const options = input.options ?? current.options
    const correctIndex = input.correct_index ?? current.correctIndex
    if (correctIndex >= options.length) {
      throw new AppError(400, "VALIDATION", "correct_index fora das opções", [{ path: "correct_index", message: "correct_index fora das opções" }])
    }
    const row = await this.repo.updateQuestion(id, {
      ...(input.prompt !== undefined ? { prompt: input.prompt } : {}),
      ...(input.options !== undefined ? { options: input.options } : {}),
      ...(input.correct_index !== undefined ? { correctIndex: input.correct_index } : {}),
      ...(input.explanation !== undefined ? { explanation: input.explanation } : {}),
      ...(input.topic !== undefined ? { topic: input.topic } : {}),
      ...(input.sort_order !== undefined ? { sortOrder: input.sort_order } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    })
    if (!row) throw NotFound("Questão")
    await this.audit.log(actor, "exam_question.updated", id, { exam_id: row.examId, fields: Object.keys(input) })
    return toAdminQuestion(row)
  }

  private async requireExam(examId: string) {
    const exam = await this.repo.findExam(examId)
    if (!exam) throw NotFound("Prova")
    return exam
  }
}
