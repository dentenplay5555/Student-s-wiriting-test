-- Run this in Supabase Dashboard → SQL Editor
-- Creates the submissions table matching the lesson payload structure

CREATE TABLE IF NOT EXISTS public.submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  student_name TEXT NOT NULL,
  student_class TEXT NOT NULL,
  student_no TEXT NOT NULL,
  student_email TEXT NOT NULL,

  draft_first TEXT NOT NULL,
  draft_second TEXT NOT NULL,
  draft_final TEXT NOT NULL,

  ai_feedback_record TEXT NOT NULL,

  think_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  think_critique TEXT,

  practice_tr SMALLINT NOT NULL CHECK (practice_tr BETWEEN 1 AND 5),
  practice_cc SMALLINT NOT NULL CHECK (practice_cc BETWEEN 1 AND 5),
  practice_lr SMALLINT NOT NULL CHECK (practice_lr BETWEEN 1 AND 5),
  practice_gra SMALLINT NOT NULL CHECK (practice_gra BETWEEN 1 AND 5),
  practice_me SMALLINT NOT NULL CHECK (practice_me BETWEEN 1 AND 5),
  practice_total SMALLINT NOT NULL,

  self_check JSONB NOT NULL DEFAULT '[]'::jsonb,

  reflect_did_well TEXT NOT NULL,
  reflect_to_improve TEXT NOT NULL,

  prism_qstring TEXT,
  prism_knowledge_state TEXT,
  prism_total SMALLINT,
  prism_model TEXT,

  teacher_feedback_good TEXT,
  teacher_feedback_next TEXT,

  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_email ON public.submissions (student_email);
CREATE INDEX IF NOT EXISTS idx_submissions_created ON public.submissions (created_at DESC);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Students (anon key in browser) can submit work
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.submissions;
CREATE POLICY "Allow anonymous insert"
  ON public.submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Teachers: view in Supabase dashboard (service role) or log in as authenticated user
DROP POLICY IF EXISTS "Authenticated users can read" ON public.submissions;
CREATE POLICY "Authenticated users can read"
  ON public.submissions FOR SELECT
  TO authenticated
  USING (true);
