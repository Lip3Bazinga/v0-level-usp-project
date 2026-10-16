import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { noteInputSchema, noteUpdateSchema, type NoteInput, type NoteUpdateInput } from "@levelusp/contracts"
import { CurrentUser } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { NotesService } from "./notes.service"

@ApiTags("notes")
@Controller("me/notes")
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.notes.list(user)
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(noteInputSchema)) body: NoteInput) {
    return this.notes.create(user, body)
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string, @Body(new ZodPipe(noteUpdateSchema)) body: NoteUpdateInput) {
    return this.notes.update(user, id, body)
  }

  @HttpCode(204)
  @Delete(":id")
  async remove(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) id: string): Promise<void> {
    await this.notes.remove(user, id)
  }
}
