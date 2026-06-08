# Integração Supabase - Controle de AUTEX ETW

Este diretório contém a estrutura de banco de dados relacional para persistência de dados em nuvem do sistema de controle de AUTEX, faturamentos florestais e industrialização de serraria.

---

## 📂 Estrutura do Diretório

- `/supabase/migrations/`
  - `20260608000000_init_etw_autex.sql`: Migration inicial em PostgreSQL configurando as tabelas, índices e políticas de segurança RLS (Row Level Security).

---

## 🚀 Como Aplicar as Migrations no seu Projeto Supabase

Você pode aplicar a estrutura do banco de dados de duas formas simples:

### Opção 1: Via Editor SQL do Supabase (Mais Rápido)
1. Acesse o seu [Supabase Dashboard](https://supabase.com).
2. Selecione o seu projeto.
3. No menu lateral esquerdo, clique em **SQL Editor** (Ícone de terminal `SQL`).
4. Clique em **New Query** para abrir uma aba em branco.
5. Copie todo o conteúdo de `/supabase/migrations/20260608000000_init_etw_autex.sql` deste projeto e cole no terminal.
6. Clique no botão **Run** no canto inferior direito. Suas tabelas e índices serão provisionados instantaneamente!

### Opção 2: Via Supabase CLI (Desenvolvimento Local)
Se você utiliza a ferramenta de linha de comando oficial do Supabase:
```bash
# Link seu projeto local com o do Supabase remoto
supabase link --project-ref seu-id-de-projeto

# Empurre as migrations locais para o seu banco remoto
supabase db push
```

---

## ⚙️ Configurando as Credenciais no Sistema

Para que a conexão automática Cloud entre em operação, configure as seguintes variáveis no seu arquivo de ambiente local `.env` (declaradas no template `.env.example`):

```env
VITE_SUPABASE_URL="https://seu-projeto-id.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica-aqui"
```

---

## 🔒 Robustez & Tolerância a Falhas (Offline-First)

Para garantir operação contínua e ininterrupta nos pátios de manejo ou áreas com instabilidade de rede:
- **Resiliência Local**: Se as chaves do Supabase não forem configuradas no ambiente, o sistema funciona de forma transparente e segura utilizando o `localStorage` do navegador.
- **Sincronização em Lote**: Ao configurar as credenciais, o sistema carrega o estado em tempo real. No topo da tela, o painel do sincronizador permite que você dispare a **Sincronização Manual** enviando todo o histórico acumulado localmente para o Supabase com um único clique.
