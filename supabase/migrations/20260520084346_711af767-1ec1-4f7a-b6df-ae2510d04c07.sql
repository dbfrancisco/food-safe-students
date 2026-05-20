
-- Scope all data to the owning user (created_by on students)

-- Helper: check student ownership
CREATE OR REPLACE FUNCTION public.owns_student(_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = _student_id AND created_by = auth.uid()
  )
$$;

-- Auto-set created_by on insert
CREATE OR REPLACE FUNCTION public.set_student_created_by()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_set_created_by ON public.students;
CREATE TRIGGER students_set_created_by
BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.set_student_created_by();

-- STUDENTS: replace admin-wide with owner-only
DROP POLICY IF EXISTS "Admins can view students" ON public.students;
DROP POLICY IF EXISTS "Admins can insert students" ON public.students;
DROP POLICY IF EXISTS "Admins can update students" ON public.students;
DROP POLICY IF EXISTS "Admins can delete students" ON public.students;

CREATE POLICY "Users can view own students" ON public.students
FOR SELECT TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can insert own students" ON public.students
FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() OR created_by IS NULL);

CREATE POLICY "Users can update own students" ON public.students
FOR UPDATE TO authenticated USING (created_by = auth.uid());

CREATE POLICY "Users can delete own students" ON public.students
FOR DELETE TO authenticated USING (created_by = auth.uid());

-- ALLERGIES: owner-only via student
DROP POLICY IF EXISTS "Admins can view allergies" ON public.allergies;
DROP POLICY IF EXISTS "Admins can insert allergies" ON public.allergies;
DROP POLICY IF EXISTS "Admins can update allergies" ON public.allergies;
DROP POLICY IF EXISTS "Admins can delete allergies" ON public.allergies;

CREATE POLICY "Users can view own allergies" ON public.allergies
FOR SELECT TO authenticated USING (public.owns_student(student_id));

CREATE POLICY "Users can insert own allergies" ON public.allergies
FOR INSERT TO authenticated WITH CHECK (public.owns_student(student_id));

CREATE POLICY "Users can update own allergies" ON public.allergies
FOR UPDATE TO authenticated USING (public.owns_student(student_id));

CREATE POLICY "Users can delete own allergies" ON public.allergies
FOR DELETE TO authenticated USING (public.owns_student(student_id));

-- GUARDIANS: owner-only via student
DROP POLICY IF EXISTS "Admins can view guardians" ON public.guardians;
DROP POLICY IF EXISTS "Admins can insert guardians" ON public.guardians;
DROP POLICY IF EXISTS "Admins can update guardians" ON public.guardians;
DROP POLICY IF EXISTS "Admins can delete guardians" ON public.guardians;

CREATE POLICY "Users can view own guardians" ON public.guardians
FOR SELECT TO authenticated USING (public.owns_student(student_id));

CREATE POLICY "Users can insert own guardians" ON public.guardians
FOR INSERT TO authenticated WITH CHECK (public.owns_student(student_id));

CREATE POLICY "Users can update own guardians" ON public.guardians
FOR UPDATE TO authenticated USING (public.owns_student(student_id));

CREATE POLICY "Users can delete own guardians" ON public.guardians
FOR DELETE TO authenticated USING (public.owns_student(student_id));
