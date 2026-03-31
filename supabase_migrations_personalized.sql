-- Add personalized columns to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS fb_link TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS tg_link TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS ws_link TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS custom_photocard_url TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS require_institution BOOLEAN DEFAULT false;
