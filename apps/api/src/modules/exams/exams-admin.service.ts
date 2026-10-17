import { Injectable } from "@nestjs/common"
import {
  CORRECT_INDEX_OUT_OF_RANGE, type AdminExamQuestion, type AdminExamSummary, type ExamQuestionInput, type ExamQuestionUpdateInput,
} from "@levelusp/contracts"
import type { ExamQuestionInsert } from "@levelusp/db"
import { NotFound, ValidationFailed } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { AuditService } from "../audit/audit.service"
import { toAdminExamSummary, toAdminQuestion } from "./exams.mapper"
import { ExamsRepository } from "./exams.repository"

const QUESTION_PATCH: PatchMapping<ExamQuestionUpdateInput, ExamQuestionInsert> = {
  prompt: (prompt) => ({ prompt }),
  options: (options) => ({ options }),
  correct_index: (correctIndex) => ({ correctIndex }),
  explanation: (explanation) => ({ explanation }),
  topic: (topic) => ({ topic }),
  sort_order: (sortOrder) => ({ sortOrder }),
  active: (active) => ({ active }),
}

/** Banco de questões da prova final (somente admin — inclui gabarito). */
@Injectable()
export class ExamsAdminService {
  constructor(
    private readonly repo: ExamsRepository,
    private readonly audit: AuditService,
  ) {}

  async listExams(): Promise<AdminExamSummary[]> {
    return (await this.repo.listExams()).map(toAdminExamSummary)
  }

  async questions(examId: string): Promise<AdminExamQuestion[]> {
    await this.findExam(examId)
    return (await this.repo.questionsOfExam(examId)).map(toAdminQuestion)
  }

  async createQuestion(actor: AuthUser, examId: string, input: ExamQuestionInput): Promise<AdminExamQuestion> {
    const exam = await this.findExam(examId)
    const question = await this.repo.insertQuestion({
      examId,
      prompt: input.prompt,
      options: input.options,
      correctIndex: input.correct_index,
      explanation: input.explanation,
      topic: input.topic,
      sortOrder: input.sort_order,
      active: input.active,
    })
    await this.audit.log(actor, "exam_question.created", question.id, { exam_id: examId, exam_title: exam.title })
    return toAdminQuestion(question)
  }

  async updateQuestion(actor: AuthUser, id: string, input: ExamQuestionUpdateInput): Promise<AdminExamQuestion> {
    const current = await this.repo.findQuestion(id)
    if (!current) throw NotFound("Questão")
    // PATCH parcial: o gabarito precisa caber nas opções resultantes (as novas ou as gravadas).
    const options = input.options ?? current.options
    const correctIndex = input.correct_index ?? current.correctIndex
    if (correctIndex >= options.length) {
      throw ValidationFailed([{ path: CORRECT_INDEX_OUT_OF_RANGE.path.join("."), message: CORRECT_INDEX_OUT_OF_RANGE.message }])
    }
    const question = await this.repo.updateQuestion(id, buildPatch(input, QUESTION_PATCH))
    if (!question) throw NotFound("Questão")
    await this.audit.log(actor, "exam_question.updated", id, { exam_id: question.examId, fields: Object.keys(input) })
    return toAdminQuestion(question)
  }

  private async findExam(examId: string) {
    const exam = await this.repo.findExam(examId)
    if (!exam) throw NotFound("Prova")
    return exam
  }
}
