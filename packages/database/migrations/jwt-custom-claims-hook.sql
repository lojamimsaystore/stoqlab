-- ============================================================
--  STOQLAB — JWT Custom Claims Hook (v2)
--  Adiciona tenant_id e user_role no token JWT
--
--  SECURITY DEFINER: roda como postgres (bypassa RLS)
--  Aplicar no SQL Editor do Supabase
-- ============================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER                          -- roda como dono da função (bypassa RLS)
SET search_path = public                  -- evita path injection
AS $$
DECLARE
  claims        jsonb;
  v_tenant_id   uuid;
  v_role        text;
BEGIN
  claims := event -> 'claims';

  SELECT tenant_id, role::text
  INTO v_tenant_id, v_role
  FROM public.users
  WHERE id = (event ->> 'user_id')::uuid
    AND deleted_at IS NULL
    AND is_active = true;

  IF v_tenant_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(v_tenant_id::text));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Permite que a função leia a tabela users (necessário com RLS ativo)
GRANT SELECT ON public.users TO supabase_auth_admin;
