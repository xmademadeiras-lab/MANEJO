-- Migration: 20261112000000_full_persistence_and_user_workspace.sql
-- Description: Complete idempotent schema for ETW CONTROLE DE AUTEX including logistics, warehouses, and per-user events, notes, and checklists.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure base tables exist even if running this migration standalone
CREATE TABLE IF NOT EXISTS public.autex (
    id TEXT PRIMARY KEY,
    numero TEXT NOT NULL,
    descricao TEXT,
    detentores TEXT[] DEFAULT '{}'::TEXT[],
    data_criacao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.autex_items (
    id TEXT PRIMARY KEY,
    autex_id TEXT REFERENCES public.autex(id) ON DELETE CASCADE,
    especie TEXT NOT NULL,
    volume_autorizado NUMERIC(12, 4) NOT NULL,
    dono TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

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

-- Add missing destination/logistics columns to deductions
ALTER TABLE public.deductions ADD COLUMN IF NOT EXISTS destino_tipo TEXT DEFAULT 'serraria';
ALTER TABLE public.deductions ADD COLUMN IF NOT EXISTS serraria_destino TEXT;
ALTER TABLE public.deductions ADD COLUMN IF NOT EXISTS patio_descarregamento TEXT;
ALTER TABLE public.deductions ADD COLUMN IF NOT EXISTS galpao_destino TEXT;
ALTER TABLE public.deductions ADD COLUMN IF NOT EXISTS galpao_endereco TEXT;

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

-- Add missing sawmill/yard columns to sawmill_logs
ALTER TABLE public.sawmill_logs ADD COLUMN IF NOT EXISTS serraria TEXT;
ALTER TABLE public.sawmill_logs ADD COLUMN IF NOT EXISTS patio TEXT;

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

ALTER TABLE public.user_accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

CREATE TABLE IF NOT EXISTS public.security_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    usuario TEXT NOT NULL,
    acao TEXT NOT NULL,
    detalhes TEXT,
    status TEXT DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'erro', 'alerta')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Fleet trucks directory
CREATE TABLE IF NOT EXISTS public.trucks (
    id TEXT PRIMARY KEY,
    placa TEXT NOT NULL UNIQUE,
    modelo TEXT,
    motorista TEXT,
    capacidade_max_m3 NUMERIC(10, 2) DEFAULT 45,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- External Warehouses (Galpões)
CREATE TABLE IF NOT EXISTS public.galpoes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    endereco TEXT NOT NULL,
    cidade_uf TEXT NOT NULL,
    ponto_referencia TEXT,
    responsavel TEXT,
    telefone TEXT,
    capacidade_m3 NUMERIC(12, 2),
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Outbound dispatches from External Warehouses
CREATE TABLE IF NOT EXISTS public.galpao_dispatches (
    id TEXT PRIMARY KEY,
    galpao_id TEXT NOT NULL,
    galpao_nome TEXT NOT NULL,
    especie TEXT NOT NULL,
    dono TEXT NOT NULL,
    volume NUMERIC(12, 4) NOT NULL,
    tipo_saida TEXT NOT NULL,
    destinatario TEXT NOT NULL,
    documento_ref TEXT,
    placa_caminhao TEXT,
    motorista TEXT,
    data_saida TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Sawmills and Yards directories
CREATE TABLE IF NOT EXISTS public.sawmills (
    nome TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.yards (
    nome TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Saved NF-e XML species/owner mappings
CREATE TABLE IF NOT EXISTS public.nfe_mappings (
    chave_xml TEXT PRIMARY KEY,
    especie TEXT NOT NULL,
    dono TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Per-user Events
CREATE TABLE IF NOT EXISTS public.user_events (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT DEFAULT '',
    data_evento TEXT NOT NULL,
    hora_evento TEXT,
    categoria TEXT DEFAULT 'Operacional',
    prioridade TEXT DEFAULT 'media' CHECK (prioridade IN ('alta', 'media', 'baixa')),
    concluido BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Per-user Notes
CREATE TABLE IF NOT EXISTS public.user_notes (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    cor TEXT DEFAULT 'emerald',
    fixada BOOLEAN DEFAULT FALSE NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[],
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Per-user Checklists
CREATE TABLE IF NOT EXISTS public.user_checklists (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    titulo TEXT NOT NULL,
    categoria TEXT DEFAULT 'Operacional',
    items JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_autex_items_autex_id ON public.autex_items(autex_id);
CREATE INDEX IF NOT EXISTS idx_deductions_autex_id ON public.deductions(autex_id);
CREATE INDEX IF NOT EXISTS idx_deductions_autex_item_id ON public.deductions(autex_item_id);
CREATE INDEX IF NOT EXISTS idx_deductions_especie ON public.deductions(especie);
CREATE INDEX IF NOT EXISTS idx_user_accounts_username ON public.user_accounts(username);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON public.security_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_galpao_dispatches_galpao_id ON public.galpao_dispatches(galpao_id);
CREATE INDEX IF NOT EXISTS idx_user_events_username ON public.user_events(username);
CREATE INDEX IF NOT EXISTS idx_user_notes_username ON public.user_notes(username);
CREATE INDEX IF NOT EXISTS idx_user_checklists_username ON public.user_checklists(username);

-- Enable RLS
ALTER TABLE public.autex ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autex_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmill_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galpoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galpao_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sawmills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfe_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_checklists ENABLE ROW LEVEL SECURITY;

-- Idempotent permissive policies
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'autex', 'autex_items', 'deductions', 'sawmill_logs', 'user_accounts',
        'security_logs', 'trucks', 'galpoes', 'galpao_dispatches', 'sawmills',
        'yards', 'nfe_mappings', 'user_events', 'user_notes', 'user_checklists'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'Permit all access to ' || tbl
        ) THEN
            EXECUTE format('CREATE POLICY "Permit all access to %I" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- Explicit GRANT permissions for Supabase API roles (prevents "permission denied for table ...")
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

