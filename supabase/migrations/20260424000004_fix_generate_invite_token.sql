-- Repair: qualify gen_random_bytes with extensions schema (pgcrypto lives there on Supabase)
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  v_alphabet_len int := 54;
  v_bytes bytea;
  v_token text := '';
  v_i int;
BEGIN
  v_bytes := extensions.gen_random_bytes(8);
  FOR v_i IN 0..7 LOOP
    v_token := v_token || substr(v_alphabet, (get_byte(v_bytes, v_i) % v_alphabet_len) + 1, 1);
  END LOOP;
  RETURN v_token;
END;
$$;
