import { NextRequest } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { serviceClient } from "@/lib/admin-auth"

// GET /api/certificate/pdf/[code] — PDF do certificado, público por código.
// O código de verificação é a credencial: sem ele, nada é exposto.
export const runtime = "nodejs"

const PURPLE = rgb(0.486, 0.227, 0.929)      // #7C3AED
const PURPLE_DARK = rgb(0.298, 0.114, 0.584) // #4C1D95
const GRAY = rgb(0.4, 0.4, 0.4)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params

  const admin = serviceClient()
  const { data } = await admin.rpc("verify_certificate" as never, { p_code: code } as never)
  const rows = (data ?? []) as {
    student_name: string
    course_title: string
    issued_at: string
    exam_score: number
  }[]
  if (!rows.length) {
    return new Response("Certificado não encontrado", { status: 404 })
  }
  const cert = rows[0]

  const doc = await PDFDocument.create()
  const page = doc.addPage([842, 595]) // A4 paisagem (pontos)
  const { width, height } = page.getSize()

  const serif = await doc.embedFont(StandardFonts.TimesRoman)
  const serifBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const sans = await doc.embedFont(StandardFonts.Helvetica)

  // Bordas
  page.drawRectangle({
    x: 20, y: 20, width: width - 40, height: height - 40,
    borderColor: PURPLE, borderWidth: 4,
  })
  page.drawRectangle({
    x: 34, y: 34, width: width - 68, height: height - 68,
    borderColor: rgb(0.655, 0.545, 0.98), borderWidth: 1,
  })

  const centerText = (text: string, y: number, font = serif, size = 14, color = GRAY) => {
    const w = font.widthOfTextAtSize(text, size)
    page.drawText(text, { x: (width - w) / 2, y, size, font, color })
  }

  centerText("LevelUSP", height - 110, serifBold, 30, PURPLE)
  centerText("Universidade de São Paulo", height - 132, sans, 11, GRAY)
  centerText("CERTIFICADO DE CONCLUSÃO", height - 190, serifBold, 34, PURPLE_DARK)
  centerText("Certificamos que", height - 245, serif, 15, GRAY)
  centerText(cert.student_name, height - 295, serifBold, 32, rgb(0.1, 0.1, 0.1))

  // Linha sob o nome
  const nameWidth = serifBold.widthOfTextAtSize(cert.student_name, 32)
  page.drawLine({
    start: { x: (width - nameWidth) / 2 - 20, y: height - 305 },
    end: { x: (width + nameWidth) / 2 + 20, y: height - 305 },
    thickness: 1.5,
    color: PURPLE,
  })

  centerText("concluiu com aproveitamento o curso", height - 340, serif, 15, GRAY)
  centerText(cert.course_title, height - 375, serifBold, 22, PURPLE_DARK)
  centerText(
    `Nota na prova final: ${Number(cert.exam_score).toFixed(0)}%  ·  Projeto final: aprovado`,
    height - 405, sans, 12, GRAY,
  )

  const issuedDate = new Date(cert.issued_at).toLocaleDateString("pt-BR", {
    day: "numeric", month: "long", year: "numeric",
  })
  page.drawText(`Emitido em ${issuedDate}`, { x: 60, y: 70, size: 11, font: sans, color: GRAY })

  const codeText = `Código de verificação: ${code.toUpperCase()}`
  const codeW = sans.widthOfTextAtSize(codeText, 11)
  page.drawText(codeText, { x: width - 60 - codeW, y: 70, size: 11, font: sans, color: GRAY })

  const verifyText = `Verifique a autenticidade em levelusp.vercel.app/certificado/${code.toUpperCase()}`
  const verifyW = sans.widthOfTextAtSize(verifyText, 9)
  page.drawText(verifyText, { x: (width - verifyW) / 2, y: 48, size: 9, font: sans, color: GRAY })

  const bytes = await doc.save()
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificado-levelusp-${code.toUpperCase()}.pdf"`,
      "Cache-Control": "private, max-age=3600",
    },
  })
}
