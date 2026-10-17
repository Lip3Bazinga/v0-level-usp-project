import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import {
  attachLessonSchema, courseInputSchema, courseUpdateSchema, publishSchema, reorderLessonsSchema,
  type AttachLessonInput, type CourseInput, type CourseUpdateInput, type PublishInput, type ReorderLessonsInput,
} from "@levelusp/contracts"
import { CurrentUser, OptionalAuth, Public, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { CoursesService } from "./courses.service"

@ApiTags("catalog")
@Controller()
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  // ── Leitura pública (identifica o usuário se houver sessão) ────────────────

  @Public()
  @OptionalAuth()
  @Get("courses")
  list(@CurrentUser() user: AuthUser | undefined) {
    return this.courses.listPublished(user)
  }

  @Public()
  @OptionalAuth()
  @Get("courses/:id")
  get(@CurrentUser() user: AuthUser | undefined, @Param("id", UuidPipe) id: string) {
    return this.courses.get(user, id)
  }

  @Public()
  @OptionalAuth()
  @Get("courses/:id/lessons")
  lessons(@CurrentUser() user: AuthUser | undefined, @Param("id", UuidPipe) id: string) {
    return this.courses.lessons(user, id)
  }

  // ── Autoria (professor dono ou admin) ──────────────────────────────────────

  @Roles("teacher", "admin")
  @Get("teacher/courses")
  teacherCourses(@CurrentUser() user: AuthUser) {
    return this.courses.teacherCourses(user)
  }

  @Roles("teacher", "admin")
  @Post("courses")
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(courseInputSchema)) body: CourseInput) {
    return this.courses.create(user, body)
  }

  @Roles("teacher", "admin")
  @Patch("courses/:id")
  update(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(courseUpdateSchema)) body: CourseUpdateInput) {
    return this.courses.update(user, id, body)
  }

  @Roles("teacher", "admin")
  @HttpCode(204)
  @Delete("courses/:id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    await this.courses.remove(user, id)
  }

  @Roles("teacher", "admin")
  @Patch("courses/:id/publish")
  publish(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(publishSchema)) body: PublishInput) {
    return this.courses.publish(user, id, body.published)
  }

  @Roles("teacher", "admin")
  @HttpCode(204)
  @Put("courses/:id/lessons/order")
  async reorder(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(reorderLessonsSchema)) body: ReorderLessonsInput) {
    await this.courses.reorder(user, id, body.lesson_ids)
  }

  @Roles("teacher", "admin")
  @HttpCode(204)
  @Post("courses/:id/lessons")
  async attach(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(attachLessonSchema)) body: AttachLessonInput) {
    await this.courses.attachLesson(user, id, body)
  }

  @Roles("teacher", "admin")
  @HttpCode(204)
  @Delete("courses/:id/lessons/:lessonId")
  async detach(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Param("lessonId", UuidPipe) lessonId: string) {
    await this.courses.detachLesson(user, id, lessonId)
  }

  // ── Matrícula ──────────────────────────────────────────────────────────────

  @HttpCode(204)
  @Post("courses/:id/enrollment")
  async enroll(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    await this.courses.enroll(user, id)
  }

  @HttpCode(204)
  @Delete("courses/:id/enrollment")
  async unenroll(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string) {
    await this.courses.unenroll(user, id)
  }

  @Get("me/enrollments")
  myEnrollments(@CurrentUser() user: AuthUser) {
    return this.courses.myEnrollments(user)
  }
}
