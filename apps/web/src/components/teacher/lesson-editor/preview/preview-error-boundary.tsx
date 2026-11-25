"use client"

import { Component } from "react"

interface PreviewErrorBoundaryProps {
  /** Muda quando o conteúdo muda: a prévia tenta de novo depois de uma falha. */
  resetKey: string
  children: React.ReactNode
}

interface PreviewErrorBoundaryState {
  failedKey: string | null
}

/**
 * Isola um passo da prévia: se o conteúdo do professor quebrar a renderização, a prévia mostra um
 * aviso no lugar do passo em vez de derrubar a tela do editor. Tenta de novo quando `resetKey` muda.
 */
export class PreviewErrorBoundary extends Component<PreviewErrorBoundaryProps, PreviewErrorBoundaryState> {
  override state: PreviewErrorBoundaryState = { failedKey: null }

  static getDerivedStateFromError(): Partial<PreviewErrorBoundaryState> {
    return { failedKey: "" }
  }

  override componentDidCatch(): void {
    this.setState({ failedKey: this.props.resetKey })
  }

  override render(): React.ReactNode {
    const { failedKey } = this.state
    if (failedKey !== null && (failedKey === "" || failedKey === this.props.resetKey)) {
      return (
        <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Não foi possível mostrar este passo na prévia: algo no conteúdo quebrou a tela. Corrija o passo no editor e a prévia volta sozinha.
        </p>
      )
    }
    return this.props.children
  }
}
