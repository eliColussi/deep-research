-- Add pro_plan_active and plan_type fields to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN pro_plan_active boolean DEFAULT false,
ADD COLUMN plan_type text;

-- Comment on new columns
COMMENT ON COLUMN user_profiles.pro_plan_active IS 'Indicates whether the user has an active paid plan';
COMMENT ON COLUMN user_profiles.plan_type IS 'Stores the plan type (e.g., monthly or annual)';
