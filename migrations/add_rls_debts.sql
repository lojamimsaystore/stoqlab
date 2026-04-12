-- Migration: Habilitar RLS nas tabelas debts e debt_payments
-- Executar no Supabase Dashboard → SQL Editor
-- Data: 2026-04-12

-- Habilita Row Level Security
ALTER TABLE debts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payments ENABLE ROW LEVEL SECURITY;

-- Política de isolamento por tenant para debts
CREATE POLICY "tenant_isolation_debts"
  ON debts
  USING (tenant_id = auth_tenant_id());

-- Política de isolamento por tenant para debt_payments
-- debt_payments referencia debts via debt_id; filtramos pelo tenant_id direto
CREATE POLICY "tenant_isolation_debt_payments"
  ON debt_payments
  USING (tenant_id = auth_tenant_id());

-- Confirma que as políticas foram criadas
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('debts', 'debt_payments')
ORDER BY tablename, policyname;
