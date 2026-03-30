-- Add allow_photocard column to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS allow_photocard BOOLEAN DEFAULT false;
