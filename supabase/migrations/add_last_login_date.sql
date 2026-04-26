-- Add last_login_date to profiles for daily streak tracking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_login_date date;
