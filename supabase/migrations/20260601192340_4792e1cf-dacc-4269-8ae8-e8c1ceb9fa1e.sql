
-- 1) Revogar EXECUTE público das funções SECURITY DEFINER (apenas internas/triggers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_student_created_by() FROM PUBLIC, anon, authenticated;

-- has_role e owns_student precisam ser chamáveis dentro de policies (security definer ok),
-- mas não há motivo para serem invocadas diretamente pelo cliente.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_student(uuid) FROM PUBLIC, anon;

-- 2) Corrigir INSERT em students: nunca permitir created_by NULL
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='students' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.students', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can insert their own students"
ON public.students
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());
