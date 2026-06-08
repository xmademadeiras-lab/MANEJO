-- Migration: 20260608000000_init_etw_autex.sql
-- Description: Initialize ETW AUTEX Control tables on Supabase/PostgreSQL

-- Enable UUID extension if needed (though we use text keys matching client-side generators, UUID is standard)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 
-- Table: autex
-- 
CREATE TABLE IF NOT EXISTS public.autex (
    id TEXT PRIMARY KEY,
    numero TEXT NOT NULL,
    descricao TEXT,
    detentores TEXT[] DEFAULT '{}'::TEXT[],
    data_criacao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.autex IS 'Tabela que armazena os contratos de AUTEX cadastrados no sistema.';

--
-- Table: autex_items
--
CREATE TABLE IF NOT EXISTS public.autex_items (
    id TEXT PRIMARY KEY,
    autex_id TEXT REFERENCES public.autex(id) ON DELETE CASCADE,
    especie TEXT NOT NULL,
    volume_autorizado NUMERIC(12, 4) NOT NULL,
    dono TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.autex_items IS 'Itens e espécies de madeira autorizadas no escopo de cada AUTEX.';

--
-- Table: deductions
--
CREATE TABLE IF NOT EXISTS public.deductions (
    id TEXT PRIMARY KEY,
    autex_id TEXT REFERENCES public.autex(id) ON DELETE CASCADE,
    autex_item_id TEXT REFERENCES public.autex_items(id) ON DELETE CASCADE,
    numero_nfe TEXT NOT NULL,
    chave_acesso TEXT,
    data_emissao TEXT NOT NULL,
    dono TEXT NOT NULL,
    especie TEXT NOT NULL,
    volume NUMERIC(12, 4) NOT NULL,
    data_importacao TEXT NOT NULL,
    xml_file_name TEXT,
    placa_caminhao TEXT,
    tipo_lancamento TEXT DEFAULT 'Manual' CHECK (tipo_lancamento IN ('Manual', 'XML')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.deductions IS 'Lançamentos de faturamento de guias florestais / NF-e para abatimento de saldo da AUTEX.';

--
-- Table: sawmill_logs
--
CREATE TABLE IF NOT EXISTS public.sawmill_logs (
    id TEXT PRIMARY KEY,
    especie TEXT NOT NULL,
    dono TEXT NOT NULL,
    volume_tora NUMERIC(12, 4) NOT NULL,
    volume_serrado NUMERIC(12, 4) NOT NULL,
    produto_saida TEXT NOT NULL,
    rendimento NUMERIC(6, 2) NOT NULL,
    data_processamento TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.sawmill_logs IS 'Registros de processos de industrialização da serraria (conversão de tora em madeira serrada).';

--
-- Table: user_accounts
--
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    senha TEXT,
    nome TEXT NOT NULL,
    cargo TEXT NOT NULL,
    role TEXT DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'auditor')),
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    data_criacao TEXT NOT NULL,
    permissoes TEXT[] DEFAULT '{}'::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.user_accounts IS 'Contas de usuários do sistema para controle de acesso refinado (RBAC).';

--
-- Table: security_logs
--
CREATE TABLE IF NOT EXISTS public.security_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    usuario TEXT NOT NULL,
    acao TEXT NOT NULL,
    detalhes TEXT,
    status TEXT DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'erro', 'alerta')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE public.security_logs IS 'Logs de auditoria de segurança das operações críticas feitas no sistema.';

-- Create indexes for performance and rapid search queries

CREATE INDEX IF NOT EXISTS idx_autex_items_autex_id ON public.autex_items(autex_id);
CREATE INDEX IF NOT EXISTS idx_deductions_autex_id ON public.deductions(autex_id);
CREATE INDEX IF NOT EXISTS idx_deductions_autex_item_id ON public.deductions(autex_item_id);
CREATE INDEX IF NOT EXISTS idx_deductions_especie ON public.deductions(especie);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON public.user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON public.security_logs(timestamp DESC);

-- Enable Row Level Security (RLS) on tables for secure client-side querying

ALTER TABLE public.autex ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autex_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Create Permissive Select/Insert/Update/Delete policies for quick integration.
-- (Can be refined in Supabase dashboard depending on active sessions details metadata)

-- Policy for autex
CREATE POLICY "Permit all access to autex" ON public.autex FOR ALL USING (true) WITH CHECK (true);

-- Policy for autex_items
CREATE POLICY "Permit all access to autex_items" ON public.autex_items FOR ALL USING (true) WITH CHECK (true);

-- Policy for deductions
CREATE POLICY "Permit all access to deductions" ON public.deductions FOR ALL USING (true) WITH CHECK (true);

-- Policy for sawmill_logs
CREATE POLICY "Permit all access to sawmill_logs" ON public.sawmill_logs FOR ALL USING (true) WITH CHECK (true);

-- Policy for user_accounts
CREATE POLICY "Permit all access to user_accounts" ON public.user_accounts FOR ALL USING (true) WITH CHECK (true);

-- Policy for security_logs
CREATE POLICY "Permit all access to security_logs" ON public.security_logs FOR ALL USING (true) WITH CHECK (true);
