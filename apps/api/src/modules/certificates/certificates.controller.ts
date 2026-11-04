import { Controller, Get, HttpCode, Param, Post, Res, StreamableFile } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import type { Response } from "express"
import { CurrentUser, Public } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { UuidPipe } from "@/common/pipes/uuid.pipe"
import { CertificatesService } from "./certificates.service"
import type { CertificateIssue, MyCertificate, CertificateVerification } from "@levelusp/contracts"

@ApiTags("certificates")
@Controller()
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  /** Idempotente: 200 tanto na emissão quanto quando já existia (alreadyIssued). */
  @HttpCode(200)
  @Post("courses/:id/certificate")
  issue(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string): Promise<CertificateIssue> {
    return this.certificates.issue(user, courseId)
  }

  /** MyCertificate | null — o null vai como JSON explícito (o Nest mandaria corpo vazio). */
  @Get("courses/:id/certificate")
  async findMyCertificate(@CurrentUser() user: AuthUser, @Param("id", UuidPipe) courseId: string, @Res() response: Response): Promise<void> {
    response.json(await this.certificates.findMyCertificate(user, courseId))
  }

  @Get("me/certificates")
  listMyCertificates(@CurrentUser() user: AuthUser): Promise<MyCertificate[]> {
    return this.certificates.listMyCertificates(user)
  }

  @Public()
  @Get("certificates/:code")
  verify(@Param("code") code: string): Promise<CertificateVerification> {
    return this.certificates.verify(code)
  }

  @Public()
  @Get("certificates/:code/pdf")
  async getPdf(@Param("code") code: string, @Res({ passthrough: true }) response: Response): Promise<StreamableFile> {
    const { code: normalized, buffer } = await this.certificates.getPdf(code)
    // O visualizador de PDF do navegador é um plugin: a CSP padrão da API (default-src 'none') o bloquearia.
    response.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; object-src 'self'; frame-ancestors 'self'")
    response.setHeader("Cache-Control", "private, max-age=3600")
    return new StreamableFile(buffer, {
      type: "application/pdf",
      disposition: `inline; filename="certificado-levelusp-${normalized}.pdf"`,
      length: buffer.length,
    })
  }
}
