import Link from "next/link"
import { createClient } from "@supabase/supabase-js"
import { CheckCircle2, XCircle, Download, GraduationCap } from "lucide-react"

// Página PÚBLICA de verificação de certificado — não exige login.
// Usa a RPC verify_certificate (security definer) com a chave anônima:
// expõe apenas nome, curso, data e nota, e somente para quem tem o código.

export const dynamic = "force-dynamic"

interface VerifiedCertificate {
  student_name: string
  course_title: string
  issued_at: string
  exam_score: number
}

async function verifyCode(code: string): Promise<VerifiedCertificate | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { persistSession: false } },
  )
  const { data } = await supabase.rpc("verify_certificate" as never, { p_code: code } as never)
  const rows = (data ?? []) as unknown as VerifiedCertificate[]
  return rows[0] ?? null
}

export default async function CertificadoPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const cert = await verifyCode(decodeURIComponent(code))

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-purple-100 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-purple-600" />
          <span className="text-lg font-bold text-purple-900">LevelUSP</span>
          <span className="ml-auto text-xs uppercase tracking-widest text-gray-400">
            Verificação de certificado
          </span>
        </div>

        {cert ? (
          <>
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-green-50 p-4 ring-1 ring-green-200">
              <CheckCircle2 className="h-8 w-8 shrink-0 text-green-600" />
              <div>
                <p className="font-bold text-green-800">Certificado autêntico</p>
                <p className="text-sm text-green-700">
                  Emitido pela plataforma LevelUSP — Universidade de São Paulo.
                </p>
              </div>
            </div>

            <dl className="space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Aluno(a)</dt>
                <dd className="text-xl font-bold text-gray-900">{cert.student_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Curso</dt>
                <dd className="text-lg font-semibold text-purple-900">{cert.course_title}</dd>
              </div>
              <div className="flex gap-8">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Emitido em</dt>
                  <dd className="font-medium text-gray-700">
                    {new Date(cert.issued_at).toLocaleDateString("pt-BR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Prova final</dt>
                  <dd className="font-medium text-gray-700">{Number(cert.exam_score).toFixed(0)}%</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Código</dt>
                <dd className="font-mono text-sm text-gray-600">{decodeURIComponent(code).toUpperCase()}</dd>
              </div>
            </dl>

            <a
              href={`/api/certificate/pdf/${encodeURIComponent(code)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
            >
              <Download className="h-4 w-4" />
              Baixar certificado em PDF
            </a>
          </>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
              <XCircle className="h-8 w-8 shrink-0 text-red-500" />
              <div>
                <p className="font-bold text-red-800">Certificado não encontrado</p>
                <p className="text-sm text-red-700">
                  O código <span className="font-mono">{decodeURIComponent(code)}</span> não
                  corresponde a nenhum certificado emitido pela LevelUSP.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Confira se o código foi digitado corretamente. Em caso de dúvida, entre em
              contato com a equipe LevelUSP.
            </p>
          </>
        )}

        <div className="mt-8 border-t border-gray-100 pt-4 text-center">
          <Link href="/" className="text-sm font-medium text-purple-600 hover:underline">
            Conheça a LevelUSP →
          </Link>
        </div>
      </div>
    </main>
  )
}
