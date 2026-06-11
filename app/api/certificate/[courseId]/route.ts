import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)!

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  )
}

/**
 * Gera um certificado de conclusão como HTML imprimível.
 * O aluno usa "Imprimir → Salvar como PDF" do navegador.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params
  const name = req.nextUrl.searchParams.get("name") ?? "Estudante"

  // Busca o curso para o título e validação básica
  const { data: course } = await admin
    .from("courses")
    .select("title, published")
    .eq("id", courseId)
    .maybeSingle()

  if (!course) {
    return new Response("Curso não encontrado", { status: 404 })
  }

  const courseTitle = (course as { title: string }).title
  const today = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })
  const certId = courseId.slice(0, 8).toUpperCase()

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Certificado — ${escapeHtml(courseTitle)}</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #F3E8FF; }
  .cert {
    width: 297mm; height: 210mm; padding: 24mm;
    background: #fff; position: relative;
    border: 2mm solid #7C3AED; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
  }
  .border-inner { position: absolute; inset: 10mm; border: 0.5mm solid #A78BFA; }
  .brand { color: #7C3AED; font-size: 22pt; font-weight: bold; letter-spacing: 2px; margin-bottom: 6mm; }
  .title { color: #4C1D95; font-size: 34pt; font-weight: bold; margin-bottom: 10mm; }
  .label { color: #666; font-size: 13pt; margin-bottom: 4mm; }
  .name { color: #1a1a1a; font-size: 30pt; font-weight: bold; border-bottom: 0.5mm solid #7C3AED; padding-bottom: 3mm; margin-bottom: 8mm; }
  .course { color: #4C1D95; font-size: 18pt; margin-bottom: 14mm; }
  .footer { display: flex; justify-content: space-between; width: 100%; margin-top: auto; color: #666; font-size: 11pt; }
  .print-hint { position: fixed; top: 8px; right: 8px; background: #7C3AED; color: #fff; padding: 8px 14px; border-radius: 8px; font-family: sans-serif; font-size: 12px; }
  @media print { .print-hint { display: none; } body { background: #fff; } }
</style>
</head>
<body>
  <div class="print-hint">Use Ctrl/Cmd+P → Salvar como PDF</div>
  <div class="cert">
    <div class="border-inner"></div>
    <div class="brand">LevelUSP</div>
    <div class="title">Certificado de Conclusão</div>
    <div class="label">Certificamos que</div>
    <div class="name">${escapeHtml(name)}</div>
    <div class="label">concluiu com êxito o curso</div>
    <div class="course">${escapeHtml(courseTitle)}</div>
    <div class="footer">
      <span>Emitido em ${today}</span>
      <span>Certificado nº ${certId}</span>
    </div>
  </div>
</body>
</html>`

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}
