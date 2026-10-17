import { Module } from "@nestjs/common"
import { ExamsModule } from "../exams/exams.module"
import { CertificatesController } from "./certificates.controller"
import { CertificatesRepository } from "./certificates.repository"
import { CertificatesService } from "./certificates.service"

@Module({
  imports: [ExamsModule],
  controllers: [CertificatesController],
  providers: [CertificatesRepository, CertificatesService],
})
export class CertificatesModule {}
