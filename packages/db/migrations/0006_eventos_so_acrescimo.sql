-- O log do experimento (`events`) é só de acréscimo também no banco: última linha de defesa
-- caso algum código, script ou sessão SQL tente reescrever ou apagar a série do estudo.
--
-- DELETE: sempre recusado.
-- UPDATE: recusado, exceto a anonimização feita pela FK `events_user_id_profiles_id_fk`
--   (ON DELETE SET NULL) quando a conta é apagada: `user_id` vira null e o resto da linha
--   (id, type, payload, created_at) fica idêntico. A exceção vale só para a ação referencial:
--   o UPDATE da FK roda de dentro do gatilho de integridade referencial, então chega aqui com
--   `pg_trigger_depth() > 1`; um `UPDATE events SET user_id = NULL` direto da sessão chega com
--   profundidade 1 e é recusado (ele desvincularia o evento do grupo de uma conta viva).
--
-- Limites conhecidos: TRUNCATE não dispara gatilho de linha e continua permitido (os testes e2e
-- zeram o banco com ele); um UPDATE só de anonimização emitido de dentro de outro gatilho também
-- passaria pela exceção (não existe gatilho assim no schema); e quem pode fazer DDL na tabela
-- (dono/superusuário) pode desligar o gatilho.

CREATE OR REPLACE FUNCTION events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'events é só de acréscimo: DELETE não é permitido (evento %)', OLD.id
      USING ERRCODE = 'restrict_violation';
  END IF;
  IF pg_trigger_depth() > 1
    AND NEW.user_id IS NULL
    AND NEW.id IS NOT DISTINCT FROM OLD.id
    AND NEW.type IS NOT DISTINCT FROM OLD.type
    AND NEW.payload IS NOT DISTINCT FROM OLD.payload
    AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'events é só de acréscimo: UPDATE só é permitido na anonimização de user_id feita pela exclusão da conta (evento %)', OLD.id
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER events_append_only BEFORE UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION events_append_only();
