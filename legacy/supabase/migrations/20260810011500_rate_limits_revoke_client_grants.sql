-- rate_limits e infraestrutura de defesa: so o service role escreve/le.
-- anon e authenticated tinham SELECT/INSERT/UPDATE/DELETE concedidos. A RLS
-- deny-all ja barrava na pratica, mas manter o grant e superficie desnecessaria
-- (mesmo raciocinio do REVOKE de PUBLIC nas funcoes internas, em 03/08).
REVOKE ALL ON TABLE public.rate_limits FROM anon;
REVOKE ALL ON TABLE public.rate_limits FROM authenticated;
