/** Dispara o download de um `Blob` no navegador com o nome de arquivo dado. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = Object.assign(document.createElement("a"), { href: url, download: filename })
  // Anexar ao documento garante o clique em navegadores que ignoram links soltos.
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/** Baixa um texto como arquivo. */
export function downloadText(text: string, filename: string, mimeType = "text/plain"): void {
  downloadBlob(new Blob([text], { type: mimeType }), filename)
}

/** Baixa um valor como JSON indentado (exportações LGPD). */
export function downloadJson(data: unknown, filename: string): void {
  downloadText(JSON.stringify(data, null, 2), filename, "application/json")
}
