# Integração Supabase - Controle de AUTEX ETW

Este diretório contém a estrutura completa de banco de dados relacional em PostgreSQL/Supabase para persistência em nuvem de **todas** as informações do sistema:
- Contratos **AUTEX** e espécies/detentores (`autex`, `autex_items`)
- Lançamentos e abatimentos de **Notas Fiscais / NF-e** (`deductions`)
- Processos industriais de **Serraria** (`sawmill_logs`)
- **Contas de Usuários e Permissões** (`user_accounts`) e **Trilha de Auditoria / Segurança** (`security_logs`)
- **Logística, Frota, Serrarias, Pátios e Galpões** (`trucks`, `sawmills`, `yards`, `galpoes`, `galpao_dispatches`)
- **Mapeamentos XML salvos** (`nfe_mappings`)
- **Eventos, Notas e Checklists individuais de cada usuário** (`user_events`, `user_notes`, `user_checklists`)

---

## 🔐 Configurando as Credenciais no Painel Secrets (Recomendado)

Para manter suas chaves seguras no servidor (sem expor no navegador), adicione no painel **Secrets** do AI Studio (ou no arquivo `.env` local):

```env
SUPABASE_URL="https://seu-projeto-id.supabase.co"
SUPABASE_ANON_KEY="sua-chave-anon-publica"
# Opcional (recomendado no backend se usar RLS restrito):
SUPABASE_SERVICE_ROLE_KEY="sua-chave-service-role"
```

> O servidor proxy `/api/supabase/*` lê automaticamente `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_ANON_KEY` (além de aceitar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como fallback).

---

## 🚀 Como Aplicar as Tabelas no Supabase (SQL Editor)

1. Acesse o seu [Supabase Dashboard](https://supabase.com) e abra o projeto.
2. No menu lateral esquerdo, clique em **SQL Editor** → **New Query**.
3. Copie todo o conteúdo do arquivo `/supabase/migrations/20261112000000_full_persistence_and_user_workspace.sql` (ou clique no botão **Copiar SQL das Tabelas** dentro do próprio painel do sistema).
4. Cole no editor e clique em **Run**.
5. No topo do sistema, clique em **Testar Conexão** e depois em **Sincronizar Manual** para enviar qualquer dado local existente para a nuvem!
