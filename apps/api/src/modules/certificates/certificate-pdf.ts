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

const OUTER_BORDER_INSET = 20
const INNER_BORDER_INSET = 34
/** Margem lateral total do texto centralizado. */
const TEXT_SIDE_MARGIN = 140
const FOOTER_SIDE_MARGIN = 60
const MIN_FONT_SIZE = 8
const NAME_TOP = 258
const NAME_UNDERLINE_GAP = 8
const NAME_UNDERLINE_OVERHANG = 20

interface CenteredText {
  top: number
  font: string
  size: number
  color: string
  /** Torna a linha um link (anotação /URI do PDF). */
  link?: string
}

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
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    const { width, height } = doc.page
    const maxTextWidth = width - TEXT_SIDE_MARGIN
    doc.lineWidth(4).strokeColor(PURPLE).rect(OUTER_BORDER_INSET, OUTER_BORDER_INSET, width - 2 * OUTER_BORDER_INSET, height - 2 * OUTER_BORDER_INSET).stroke()
    doc.lineWidth(1).strokeColor(PURPLE_LIGHT).rect(INNER_BORDER_INSET, INNER_BORDER_INSET, width - 2 * INNER_BORDER_INSET, height - 2 * INNER_BORDER_INSET).stroke()

    /** Texto centralizado numa linha, reduzindo a fonte se não couber. Devolve o tamanho usado. */
    const drawCentered = (text: string, { top, font, size, color, link }: CenteredText): number => {
      doc.font(font)
      let fittedSize = size
      while (fittedSize > MIN_FONT_SIZE && doc.fontSize(fittedSize).widthOfString(text) > maxTextWidth) fittedSize -= 1
      doc.fontSize(fittedSize).fillColor(color).text(text, (width - maxTextWidth) / 2, top, { width: maxTextWidth, align: "center", lineBreak: false, link })
      return fittedSize
    }

    drawCentered("LevelUSP", { top: 80, font: "Times-Bold", size: 30, color: PURPLE })
    drawCentered("Universidade de São Paulo", { top: 118, font: "Helvetica", size: 11, color: GRAY })
    drawCentered("CERTIFICADO DE CONCLUSÃO", { top: 160, font: "Times-Bold", size: 34, color: PURPLE_DARK })
    drawCentered("Certificamos que", { top: 222, font: "Times-Roman", size: 15, color: GRAY })

    const nameSize = drawCentered(data.studentName, { top: NAME_TOP, font: "Times-Bold", size: 32, color: INK })
    const nameWidth = doc.font("Times-Bold").fontSize(nameSize).widthOfString(data.studentName)
    const underlineY = NAME_TOP + nameSize + NAME_UNDERLINE_GAP
    doc
      .lineWidth(1.5)
      .strokeColor(PURPLE)
      .moveTo((width - nameWidth) / 2 - NAME_UNDERLINE_OVERHANG, underlineY)
      .lineTo((width + nameWidth) / 2 + NAME_UNDERLINE_OVERHANG, underlineY)
      .stroke()

    drawCentered("concluiu com aproveitamento o curso", { top: 322, font: "Times-Roman", size: 15, color: GRAY })
    drawCentered(data.courseTitle, { top: 350, font: "Times-Bold", size: 22, color: PURPLE_DARK })
    const projectLabel = data.projectStatus === "waived" ? "dispensado" : "aprovado"
    drawCentered(`Nota na prova final: ${formatScore(data.examScore)}  ·  Projeto final: ${projectLabel}`, { top: 390, font: "Helvetica", size: 12, color: GRAY })

    const footerTop = height - 82
    doc.font("Helvetica").fontSize(11).fillColor(GRAY)
    doc.text(`Emitido em ${formatIssuedDate(data.issuedAt)}`, FOOTER_SIDE_MARGIN, footerTop, { lineBreak: false })
    const codeText = `Código de verificação: ${data.code}`
    doc.text(codeText, width - FOOTER_SIDE_MARGIN - doc.widthOfString(codeText), footerTop, { lineBreak: false })
    // Link clicável além do texto: quem recebe o PDF verifica com um clique.
    drawCentered(`Verifique a autenticidade em ${data.verifyUrl}`, { top: height - 58, font: "Helvetica", size: 9, color: GRAY, link: data.verifyUrl })

    doc.end()
  })
}
