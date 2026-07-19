// Compat: os tipos de domínio agora vivem em `@/lib/types` (split por domínio).
// Este arquivo re-exporta tudo para não quebrar os imports existentes de
// `@/lib/supabase/types`. Prefira importar de `@/lib/types` em código novo.
export type * from "@/lib/types"
