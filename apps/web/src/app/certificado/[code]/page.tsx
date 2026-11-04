import Link from "next/link"
import { CheckCircle2, XCircle, Download, GraduationCap } from "lucide-react"
import type { CertificateVerification } from "@levelusp/contracts"
import { certificatePdfUrl, fetchCertificateVerification } from "@/lib/api"
import { ROUTES } from "@/lib/constants"
import { formatDate, formatPercent } from "@/lib/utils"

// Página PÚBLICA de verificação de certificado — não exige login.
// Renderizada no servidor: consulta a API (rota pública GET /certificates/:code),
// que expõe apenas nome, curso, data e nota, e somente para quem tem o código.

export const dynamic = "force-dynamic"

interface VerifiedCertificate extends CertificateVerification {
  student_name: string
  course_title: string
  issued_at: string
}

/** `null` para código inexistente, inválido ou com dados incompletos (e se a API falhar). */
async function verifyCode(verificationCode: string): Promise<VerifiedCertificate | null> {
  try {
    const verification = await fetchCertificateVerification(verificationCode)
    const { valid, student_name, course_title, issued_at } = verification
    if (!valid || !student_name || !course_title || !issued_at) return null
    return { ...verification, student_name, course_title, issued_at }
  } catch {
    return null
  }
}

interface CertificadoPageProps {
  params: Promise<{ code: string }>
}

export default async function CertificadoPage({ params }: CertificadoPageProps): Promise<React.JSX.Element> {
  const { code } = await params
  const verificationCode = decodeURIComponent(code)
  const certificate = await verifyCode(verificationCode)

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-3xl border border-purple-100 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-purple-600" />
          <span className="text-lg font-bold text-purple-900">LevelUSP</span>
          <span className="ml-auto text-xs uppercase tracking-widest text-gray-500">
            Verificação de certificado
          </span>
        </div>

        {certificate ? (
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
                <dd className="text-xl font-bold text-gray-900">{certificate.student_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Curso</dt>
                <dd className="text-lg font-semibold text-purple-900">{certificate.course_title}</dd>
              </div>
              <div className="flex gap-8">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Emitido em</dt>
                  <dd className="font-medium text-gray-700">
                    {formatDate(certificate.issued_at, "long")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-400">Prova final</dt>
                  <dd className="font-medium text-gray-700">{formatPercent(certificate.exam_score ?? 0)}</dd>
                </div>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-400">Código</dt>
                <dd className="font-mono text-sm text-gray-600">{verificationCode.toUpperCase()}</dd>
              </div>
            </dl>

            <a
              href={certificatePdfUrl(verificationCode)}
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
                  O código <span className="font-mono">{verificationCode}</span> não
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
          <Link href={ROUTES.home} className="text-sm font-medium text-purple-600 hover:underline">
            Conheça a LevelUSP →
          </Link>
        </div>
      </div>
    </main>
  )
}
