-- ============================================================
--  STOQLAB — Migration: Master user + Plano Vitalício
--  Aplicar no SQL Editor do Supabase
-- ============================================================

-- 1. Adiciona 'master' ao enum user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'master';

-- 2. Adiciona 'vitalicio' ao enum plan_type
ALTER TYPE plan_type ADD VALUE IF NOT EXISTS 'vitalicio';

-- ============================================================
--  INSTRUÇÕES PARA CRIAR O USUÁRIO MASTER
-- ============================================================
--
-- Passo 1: Criar um tenant interno para o master (rode uma vez):
--
-- INSERT INTO tenants (name, slug, plan, is_active)
-- VALUES ('Stoqlab Admin', 'stoqlab-admin', 'vitalicio', true)
-- RETURNING id;
--
-- Passo 2: Crie o usuário no Supabase Auth (painel Authentication > Users > New User)
--   E-mail: seu-email-master@stoqlab.com
--   Confirmar e-mail: sim
--
-- Passo 3: Insira na tabela users com o ID retornado acima e o auth user ID:
--
-- INSERT INTO users (id, tenant_id, name, role, is_active)
-- VALUES (
--   '<AUTH_USER_ID>',        -- ID do usuário criado no Auth
--   '<TENANT_ID_DO_PASSO_1>', -- ID do tenant criado no passo 1
--   'Master Admin',
--   'master',
--   true
-- );
