-- Drop the restrictive policy
DROP POLICY IF EXISTS "Super Admin can manage notifications" ON notifications;

-- Recreate with case-insensitive check to be safer
CREATE POLICY "Super Admin can manage notifications" 
  ON notifications FOR ALL 
  USING (lower(auth.jwt() ->> 'email') = 'alif@g.com') 
  WITH CHECK (lower(auth.jwt() ->> 'email') = 'alif@g.com');
