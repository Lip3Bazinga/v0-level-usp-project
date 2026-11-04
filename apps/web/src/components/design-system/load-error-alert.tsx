interface LoadErrorAlertProps {
  /** Frase principal, ex.: "Não foi possível carregar os cursos." */
  message: string
  onRetry: () => void
}

/**
 * Estado de erro de uma busca, com nova tentativa. Existe para que uma falha da API
 * não seja mostrada como lista vazia ("Nenhum curso encontrado").
 */
export function LoadErrorAlert({ message, onRetry }: LoadErrorAlertProps): React.JSX.Element {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
      <p className="text-base font-semibold text-red-800">{message}</p>
      <p className="mt-1 text-sm text-red-700">Verifique sua conexão e tente novamente.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-level-purple px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-level-purple-dark"
      >
        Tentar novamente
      </button>
    </div>
  )
}
