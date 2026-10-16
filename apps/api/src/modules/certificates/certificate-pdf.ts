import PDFDocument from "pdfkit"
import { formatIssuedDate, formatScore } from "./certificates.domain"

export interface CertificatePdfData {
  code: string
  studentName: string
  courseTitle: string
  issuedAt: string
  examScore: number
  projectStatus: "passed" | "waived"
  verifyUrl: string
}

const PURPLE = "#7C3AED"
const PURPLE_DARK = "#4C1D95"
const PURPLE_LIGHT = "#A78BFA"
const GRAY = "#666666"
const INK = "#1A1A1A"

/** PDF A4 paisagem do certificado (porte do layout de apps/web/.../certificate/pdf). */
export function renderCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
      info: { Title: `Certificado LevelUSP ${data.code}`, Author: "LevelUSP", Subject: data.courseTitle },
    })
    const chunks: Buffer[] = []
    doc.on("data", (c: Buffer) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const { width, height } = doc.page
    doc.lineWidth(4).strokeColor(PURPLE).rect(20, 20, width - 40, height - 40).stroke()
    doc.lineWidth(1).strokeColor(PURPLE_LIGHT).rect(34, 34, width - 68, height - 68).stroke()

    /** Texto centralizado numa linha, reduzindo a fonte se não couber. */
    const center = (text: string, top: number, font: string, size: number, color: string, maxWidth = width - 140) => {
      doc.font(font)
      let s = size
      while (s > 8 && doc.fontSize(s).widthOfString(text) > maxWidth) s -= 1
      doc.fontSize(s).fillColor(color).text(text, (width - maxWidth) / 2, top, { width: maxWidth, align: "center", lineBreak: false })
      return s
    }

    center("LevelUSP", 80, "Times-Bold", 30, PURPLE)
    center("Universidade de São Paulo", 118, "Helvetica", 11, GRAY)
    center("CERTIFICADO DE CONCLUSÃO", 160, "Times-Bold", 34, PURPLE_DARK)
    center("Certificamos que", 222, "Times-Roman", 15, GRAY)

    const nameSize = center(data.studentName, 258, "Times-Bold", 32, INK)
    const nameWidth = doc.font("Times-Bold").fontSize(nameSize).widthOfString(data.studentName)
    const lineY = 258 + nameSize + 8
    doc
      .lineWidth(1.5)
      .strokeColor(PURPLE)
      .moveTo((width - nameWidth) / 2 - 20, lineY)
      .lineTo((width + nameWidth) / 2 + 20, lineY)
      .stroke()

    center("concluiu com aproveitamento o curso", 322, "Times-Roman", 15, GRAY)
    center(data.courseTitle, 350, "Times-Bold", 22, PURPLE_DARK)
    const project = data.projectStatus === "waived" ? "dispensado" : "aprovado"
    center(`Nota na prova final: ${formatScore(data.examScore)}  ·  Projeto final: ${project}`, 390, "Helvetica", 12, GRAY)

    doc.font("Helvetica").fontSize(11).fillColor(GRAY)
    doc.text(`Emitido em ${formatIssuedDate(data.issuedAt)}`, 60, height - 82, { lineBreak: false })
    const codeText = `Código de verificação: ${data.code}`
    doc.text(codeText, width - 60 - doc.widthOfString(codeText), height - 82, { lineBreak: false })
    center(`Verifique a autenticidade em ${data.verifyUrl}`, height - 58, "Helvetica", 9, GRAY)

    doc.end()
  })
}
