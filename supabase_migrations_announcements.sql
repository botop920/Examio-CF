CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    batch_id BIGINT REFERENCES batches(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own announcements"
    ON announcements FOR ALL
    USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view announcements"
    ON announcements FOR SELECT
    USING (true);
