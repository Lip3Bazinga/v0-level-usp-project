import { json } from "@/lib/admin-auth"

// Rota legada desativada: gerava um "certificado" HTML sem verificar
// conclusão, prova ou projeto — e aceitava qualquer nome via query string.
// O fluxo oficial agora é:
//   POST /api/certificate/issue        (emissão com as 3 condições)
//   GET  /api/certificate/pdf/[code]   (PDF oficial por código)
//   /certificado/[code]                (verificação pública)
export async function GET() {
  return json(
    { error: "Rota descontinuada. Use POST /api/certificate/issue e GET /api/certificate/pdf/[code]." },
    410,
  )
}
