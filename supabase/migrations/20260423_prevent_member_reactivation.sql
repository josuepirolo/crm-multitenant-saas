-- Impede reativação de membro sem passar pela lógica da aplicação.
-- Um membro com deleted_at preenchido não pode ter deleted_at zerado via UPDATE direto.
-- A reativação só deve ocorrer via Service Role (Server Action com admin client),
-- que nunca expõe esse endpoint ao usuário.

CREATE OR REPLACE FUNCTION prevent_member_reactivation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o registro já estava soft-deleted e a app tenta zerar deleted_at via anon/user role
  IF OLD.deleted_at IS NOT NULL
     AND NEW.deleted_at IS NULL
     AND current_role != 'service_role'
  THEN
    RAISE EXCEPTION 'Reativação de membro requer privilégio de serviço.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_member_reactivation ON workspace_members;
CREATE TRIGGER trg_prevent_member_reactivation
  BEFORE UPDATE ON workspace_members
  FOR EACH ROW
  EXECUTE FUNCTION prevent_member_reactivation();
