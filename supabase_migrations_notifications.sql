-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'update'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read notifications
CREATE POLICY "Everyone can read notifications" 
  ON notifications FOR SELECT 
  USING (true);

-- Policy: Only Super Admin can insert/update/delete
-- Replace 'alif@g.com' with your actual super admin email if different, 
-- though the code seems to hardcode it.
CREATE POLICY "Super Admin can manage notifications" 
  ON notifications FOR ALL 
  USING (lower(auth.jwt() ->> 'email') = 'alif@g.com') 
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'alif@g.com');
