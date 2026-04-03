-- ---------------------------------------------------------------------------
-- Fix: populate display_name in user_profiles on signup
--
-- The original handle_new_user() trigger inserted only the user id,
-- leaving display_name NULL even though the value was passed via
-- supabase.auth.signUp({ options: { data: { display_name: '...' } } }).
-- That metadata is available in NEW.raw_user_meta_data on the trigger row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'display_name'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.reward_formulas (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
