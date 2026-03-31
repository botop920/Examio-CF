-- Add photocard customization columns to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS photocard_title TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS photocard_bg_color TEXT DEFAULT '#050505';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS photocard_text_color TEXT DEFAULT '#FFFFFF';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS photocard_accent_color TEXT DEFAULT '#0071E3';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS photocard_show_rank BOOLEAN DEFAULT true;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS photocard_show_stats BOOLEAN DEFAULT true;
