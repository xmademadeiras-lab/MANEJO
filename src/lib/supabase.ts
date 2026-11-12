/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import migrationSqlRaw from "../../supabase/migrations/20261112000000_full_persistence_and_user_workspace.sql?raw";
import {
  Autex,
  NfeDeduction,
  SawmillProcessLog,
  SecurityLog,
  TruckEntity,
  UserAccount,
  UserChecklist,
  UserEvent,
  UserNote,
} from "../types";
import type { GalpaoDispatchLog, GalpaoEntity } from "./galpaoData";

export interface SupabaseStatusResponse {
  configured: boolean;
  connected: boolean;
  hasServerSecrets: boolean;
  latency?: number;
  missingTables?: string[];
  permissionDenied?: boolean;
  message: string;
}

export interface SupabaseBootstrapPayload {
  autexList: Autex[] | null;
  deductions: NfeDeduction[] | null;
  sawmillLogs: SawmillProcessLog[] | null;
  userAccounts: UserAccount[] | null;
  securityLogs: SecurityLog[] | null;
  trucks: TruckEntity[] | null;
  galpoes: GalpaoEntity[] | null;
  galpaoDispatches: GalpaoDispatchLog[] | null;
  sawmills: string[] | null;
  yards: string[] | null;
  nfeMappings: Record<string, { especie: string; dono: string }> | null;
}

export interface UserWorkspacePayload {
  events: UserEvent[];
  notes: UserNote[];
  checklists: UserChecklist[];
}

const REQUIRED_TABLES = [
  "autex",
  "autex_items",
  "deductions",
  "sawmill_logs",
  "user_accounts",
  "security_logs",
  "trucks",
  "galpoes",
  "galpao_dispatches",
  "sawmills",
  "yards",
  "nfe_mappings",
  "user_events",
  "user_notes",
  "user_checklists",
] as const;

const DEFAULT_USERS_SEED = [
  {
    id: "user-master",
    username: "COSTA",
    senha: "1318",
    nome: "Diretor Costa (Master)",
    cargo: "Administrador Geral Integrado",
    role: "admin",
    ativo: true,
    data_criacao: "2026-06-03",
    permissoes: [
      "Visualização Completa",
      "Lançar Abates",
      "Configurar Logística",
      "Industrializar Serraria",
      "Efetuar Backup",
      "Controle de Usuários",
    ],
  },
  {
    id: "user-1",
    username: "Gestor_Matriz_01",
    senha: "1234",
    nome: "Marcos Estrela",
    cargo: "Diretor Geral de Operações",
    role: "admin",
    ativo: true,
    data_criacao: "2026-01-10",
    permissoes: [
      "Visualização Completa",
      "Lançar Abates",
      "Configurar Logística",
      "Industrializar Serraria",
      "Efetuar Backup",
      "Controle de Usuários",
    ],
  },
];

class ApiRouteUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiRouteUnavailableError";
  }
}

let browserClient: SupabaseClient | null = null;
function getDirectBrowserSupabase(): SupabaseClient | null {
  const url = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) return null;
  if (!browserClient) {
    browserClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return browserClient;
}

function isStatic404Payload(status: number, contentType: string, text: string): boolean {
  if (status === 404) return true;
  const trimmed = text.trim();
  if (!contentType.includes("application/json")) {
    if (
      trimmed.startsWith("<") ||
      trimmed.includes("NOT_FOUND") ||
      trimmed.includes("The page could not be found")
    ) {
      return true;
    }
  }
  return false;
}

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (isStatic404Payload(response.status, contentType, text)) {
    throw new ApiRouteUnavailableError(
      "Rota de backend /api/supabase não encontrada neste servidor."
    );
  }

  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { message: text };
  }

  if (!response.ok) {
    throw new Error(parsed?.error || parsed?.message || `HTTP ${response.status}`);
  }
  return parsed as T;
}

export async function checkSupabaseConnection(): Promise<{
  success: boolean;
  configured: boolean;
  hasServerSecrets?: boolean;
  missingTables?: string[];
  permissionDenied?: boolean;
  message: string;
  latency?: number;
}> {
  try {
    const status = await apiJson<SupabaseStatusResponse>("/api/supabase/status");
    return {
      success: status.connected,
      configured: status.configured,
      hasServerSecrets: status.hasServerSecrets,
      missingTables: status.missingTables,
      permissionDenied: status.permissionDenied,
      message: status.message,
      latency: status.latency,
    };
  } catch (err: any) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const start = Date.now();
        try {
          const checks = await Promise.all(
            REQUIRED_TABLES.map(async (table) => {
              const { error } = await direct.from(table).select("*").limit(1);
              return { table, error };
            })
          );
          const latency = Date.now() - start;

          const missingTables = checks
            .filter(
              (c) =>
                c.error &&
                (c.error.code === "42P01" ||
                  c.error.code === "PGRST205" ||
                  c.error.message?.includes("does not exist") ||
                  c.error.message?.includes("Could not find the table"))
            )
            .map((c) => c.table);

          const permissionError = checks.find(
            (c) =>
              c.error &&
              (c.error.code === "42501" ||
                c.error.message?.toLowerCase().includes("permission denied"))
          )?.error;

          if (permissionError) {
            return {
              success: false,
              configured: true,
              permissionDenied: true,
              missingTables,
              latency,
              message:
                "As tabelas existem no Supabase, mas falta permissão GRANT para API. Clique em 'Copiar SQL das Tabelas' e execute no SQL Editor do Supabase.",
            };
          }

          if (missingTables.length > 0) {
            return {
              success: false,
              configured: true,
              missingTables,
              latency,
              message: `Conectado ao Supabase, mas faltam ${missingTables.length} tabela(s): ${missingTables.join(", ")}.`,
            };
          }

          const firstErr = checks.find(
            (c) => c.error && c.error.code !== "PGRST116"
          )?.error;
          if (firstErr) {
            return {
              success: false,
              configured: true,
              latency,
              message: `Erro ao conectar no Supabase: ${firstErr.message}`,
            };
          }

          return {
            success: true,
            configured: true,
            missingTables: [],
            latency,
            message: "Conectado diretamente ao Supabase com todas as tabelas ativas!",
          };
        } catch (directErr: any) {
          return {
            success: false,
            configured: true,
            message: `Falha ao conectar no Supabase: ${directErr?.message || directErr}`,
          };
        }
      }

      return {
        success: false,
        configured: false,
        message:
          "API /api/supabase não encontrada neste endereço estático. Faça o redeploy com a pasta api/ configurada (Vercel/Node) ou adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.",
      };
    }

    return {
      success: false,
      configured: false,
      message: `Falha ao verificar status do servidor Supabase: ${err?.message || err}`,
    };
  }
}

export async function fetchMigrationSql(): Promise<string> {
  try {
    const res = await fetch("/api/supabase/migration-sql");
    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();
    if (
      res.ok &&
      !isStatic404Payload(res.status, contentType, text) &&
      text.includes("CREATE TABLE")
    ) {
      return text;
    }
  } catch {
    // Fallback to bundled SQL file
  }
  return migrationSqlRaw;
}

async function directBootstrapFromSupabase(
  client: SupabaseClient
): Promise<SupabaseBootstrapPayload> {
  const [
    autexRes,
    itemsRes,
    deductionsRes,
    sawmillRes,
    usersRes,
    secLogsRes,
    trucksRes,
    galpoesRes,
    dispatchesRes,
    sawmillsRes,
    yardsRes,
    mappingsRes,
  ] = await Promise.all([
    client.from("autex").select("*"),
    client.from("autex_items").select("*"),
    client.from("deductions").select("*"),
    client.from("sawmill_logs").select("*"),
    client.from("user_accounts").select("*"),
    client
      .from("security_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(150),
    client.from("trucks").select("*"),
    client.from("galpoes").select("*"),
    client.from("galpao_dispatches").select("*"),
    client.from("sawmills").select("*"),
    client.from("yards").select("*"),
    client.from("nfe_mappings").select("*"),
  ]);

  const autexList = (autexRes.data || []).map((a: any) => ({
    id: a.id,
    numero: a.numero,
    descricao: a.descricao || "",
    detentores: a.detentores || [],
    dataCriacao: a.data_criacao,
    items: (itemsRes.data || [])
      .filter((i: any) => i.autex_id === a.id)
      .map((i: any) => ({
        id: i.id,
        especie: i.especie,
        volumeAutorizado: Number(i.volume_autorizado),
        dono: i.dono,
      })),
  }));

  const deductions = (deductionsRes.data || []).map((d: any) => ({
    id: d.id,
    autexId: d.autex_id,
    autexItemId: d.autex_item_id,
    numeroNfe: d.numero_nfe,
    chaveAcesso: d.chave_acesso || undefined,
    dataEmissao: d.data_emissao,
    dono: d.dono,
    especie: d.especie,
    volume: Number(d.volume),
    dataImportacao: d.data_importacao,
    xmlFileName: d.xml_file_name || undefined,
    placaCaminhao: d.placa_caminhao || undefined,
    tipoLancamento: d.tipo_lancamento || "Manual",
    destinoTipo: d.destino_tipo || undefined,
    serrariaDestino: d.serraria_destino || undefined,
    patioDescarregamento: d.patio_descarregamento || undefined,
    galpaoDestino: d.galpao_destino || undefined,
    galpaoEndereco: d.galpao_endereco || undefined,
  }));

  const sawmillLogs = (sawmillRes.data || []).map((s: any) => ({
    id: s.id,
    especie: s.especie,
    dono: s.dono,
    volumeTora: Number(s.volume_tora),
    volumeSerrado: Number(s.volume_serrado),
    produtoSaida: s.produto_saida,
    rendimento: Number(s.rendimento),
    dataProcessamento: s.data_processamento,
    serraria: s.serraria || undefined,
    patio: s.patio || undefined,
  }));

  let userAccounts = (usersRes.data || []).map((u: any) => ({
    id: u.id,
    username: u.username,
    senha: u.senha || undefined,
    nome: u.nome,
    cargo: u.cargo,
    role: u.role,
    ativo: u.ativo,
    dataCriacao: u.data_criacao,
    permissoes: u.permissoes || [],
  }));

  if (!usersRes.error && userAccounts.length === 0) {
    await client.from("user_accounts").upsert(DEFAULT_USERS_SEED);
    userAccounts = DEFAULT_USERS_SEED.map((u) => ({
      id: u.id,
      username: u.username,
      senha: u.senha,
      nome: u.nome,
      cargo: u.cargo,
      role: u.role as "admin" | "operator" | "auditor",
      ativo: u.ativo,
      dataCriacao: u.data_criacao,
      permissoes: u.permissoes,
    }));
  }

  const securityLogs = (secLogsRes.data || []).map((l: any) => ({
    id: l.id,
    timestamp: l.timestamp,
    usuario: l.usuario,
    acao: l.acao,
    detalhes: l.detalhes || "",
    status: l.status,
  }));

  const trucks = (trucksRes.data || []).map((t: any) => ({
    id: t.id,
    placa: t.placa,
    modelo: t.modelo || "",
    motorista: t.motorista || "",
    capacidadeMaxM3: Number(t.capacidade_max_m3 || 45),
  }));

  const galpoes = (galpoesRes.data || []).map((g: any) => ({
    id: g.id,
    nome: g.nome,
    endereco: g.endereco,
    cidadeUf: g.cidade_uf,
    pontoReferencia: g.ponto_referencia || undefined,
    responsavel: g.responsavel || undefined,
    telefone: g.telefone || undefined,
    capacidadeM3:
      g.capacidade_m3 !== null && g.capacidade_m3 !== undefined
        ? Number(g.capacidade_m3)
        : undefined,
    observacoes: g.observacoes || undefined,
  }));

  const galpaoDispatches = (dispatchesRes.data || []).map((d: any) => ({
    id: d.id,
    galpaoId: d.galpao_id,
    galpaoNome: d.galpao_nome,
    especie: d.especie,
    dono: d.dono,
    volume: Number(d.volume),
    tipoSaida: d.tipo_saida,
    destinatario: d.destinatario,
    documentoRef: d.documento_ref || undefined,
    placaCaminhao: d.placa_caminhao || undefined,
    motorista: d.motorista || undefined,
    dataSaida: d.data_saida,
    observacoes: d.observacoes || undefined,
  }));

  const sawmills = (sawmillsRes.data || []).map((s: any) => s.nome);
  const yards = (yardsRes.data || []).map((y: any) => y.nome);
  const nfeMappings: Record<string, { especie: string; dono: string }> = {};
  for (const m of mappingsRes.data || []) {
    nfeMappings[m.chave_xml] = { especie: m.especie, dono: m.dono };
  }

  return {
    autexList: autexRes.error ? null : autexList,
    deductions: deductionsRes.error ? null : deductions,
    sawmillLogs: sawmillRes.error ? null : sawmillLogs,
    userAccounts: usersRes.error ? null : userAccounts,
    securityLogs: secLogsRes.error ? null : securityLogs,
    trucks: trucksRes.error ? null : trucks,
    galpoes: galpoesRes.error ? null : galpoes,
    galpaoDispatches: dispatchesRes.error ? null : galpaoDispatches,
    sawmills: sawmillsRes.error ? null : sawmills,
    yards: yardsRes.error ? null : yards,
    nfeMappings: mappingsRes.error ? null : nfeMappings,
  };
}

export async function fetchBootstrapFromServer(): Promise<SupabaseBootstrapPayload | null> {
  try {
    return await apiJson<SupabaseBootstrapPayload>("/api/supabase/bootstrap");
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        try {
          return await directBootstrapFromSupabase(direct);
        } catch (directErr) {
          console.warn("Erro no bootstrap direto Supabase:", directErr);
        }
      }
    }
    console.warn("Bootstrap Supabase indisponível (rodando offline-first):", err);
    return null;
  }
}

export async function loginWithSupabase(
  username: string,
  password: string
): Promise<{
  handled: boolean;
  authenticated: boolean;
  user?: UserAccount;
  error?: string;
}> {
  try {
    const response = await fetch("/api/supabase/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (response.status === 503) {
      return { handled: false, authenticated: false };
    }

    if (isStatic404Payload(response.status, contentType, text)) {
      const direct = getDirectBrowserSupabase();
      if (!direct) {
        return { handled: false, authenticated: false };
      }

      const { data: allUsers, error } = await direct.from("user_accounts").select("*");
      if (error) {
        return { handled: false, authenticated: false };
      }
      let users = allUsers || [];
      if (users.length === 0) {
        await direct.from("user_accounts").upsert(DEFAULT_USERS_SEED);
        users = DEFAULT_USERS_SEED as any[];
      }
      const match = users.find(
        (u: any) => String(u.username || "").toUpperCase() === username.trim().toUpperCase()
      );
      if (!match) {
        return { handled: true, authenticated: false, error: "Operador não localizado no banco de dados." };
      }
      if (!match.ativo) {
        return {
          handled: true,
          authenticated: false,
          error: "Esta credencial de login está desativada. Contate o administrador.",
        };
      }
      if (password.trim() !== (match.senha || "1234")) {
        return { handled: true, authenticated: false, error: "Assinatura ou senha de segurança incorreta." };
      }
      return {
        handled: true,
        authenticated: true,
        user: {
          id: match.id,
          username: match.username,
          nome: match.nome,
          cargo: match.cargo,
          role: match.role,
          ativo: match.ativo,
          dataCriacao: match.data_criacao,
          permissoes: match.permissoes || [],
        },
      };
    }

    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      return {
        handled: true,
        authenticated: false,
        error: data?.error || "Credenciais inválidas.",
      };
    }

    return {
      handled: true,
      authenticated: Boolean(data.authenticated),
      user: data.user,
    };
  } catch {
    return { handled: false, authenticated: false };
  }
}

export async function registerWithSupabase(payload: {
  nome: string;
  username: string;
  cargo: string;
  password: string;
}): Promise<{
  handled: boolean;
  registered: boolean;
  user?: UserAccount;
  error?: string;
}> {
  try {
    const response = await fetch("/api/supabase/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();

    if (response.status === 503) {
      return { handled: false, registered: false };
    }

    if (isStatic404Payload(response.status, contentType, text)) {
      const direct = getDirectBrowserSupabase();
      if (!direct) {
        return { handled: false, registered: false };
      }

      const cleanNome = payload.nome.trim();
      const cleanUsername = payload.username.trim().replace(/[^a-zA-Z0-9_-]/g, "");
      const cleanCargo = payload.cargo.trim() || "Operador Operacional";
      const cleanPassword = payload.password.trim();

      const { data: existingUsers, error: fetchErr } = await direct
        .from("user_accounts")
        .select("id, username");
      if (fetchErr) return { handled: false, registered: false };

      const list = existingUsers || [];
      if (list.length === 0) {
        await direct.from("user_accounts").upsert(DEFAULT_USERS_SEED);
      }

      const duplicate = [...list, ...(list.length === 0 ? DEFAULT_USERS_SEED : [])].some(
        (u: any) => String(u.username || "").toLowerCase() === cleanUsername.toLowerCase()
      );
      if (duplicate) {
        return {
          handled: true,
          registered: false,
          error: `O usuário "${cleanUsername}" já está cadastrado.`,
        };
      }

      const newAccount = {
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: cleanUsername,
        senha: cleanPassword,
        nome: cleanNome,
        cargo: cleanCargo,
        role: "operator" as const,
        ativo: true,
        data_criacao: new Date().toISOString().split("T")[0],
        permissoes: [
          "Visualização Completa",
          "Lançar Abates",
          "Configurar Logística",
          "Industrializar Serraria",
        ],
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await direct.from("user_accounts").insert(newAccount);
      if (insertErr) {
        return { handled: true, registered: false, error: insertErr.message };
      }

      return {
        handled: true,
        registered: true,
        user: {
          id: newAccount.id,
          username: newAccount.username,
          nome: newAccount.nome,
          cargo: newAccount.cargo,
          role: newAccount.role,
          ativo: newAccount.ativo,
          dataCriacao: newAccount.data_criacao,
          permissoes: newAccount.permissoes,
        },
      };
    }

    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
      return {
        handled: true,
        registered: false,
        error: data?.error || "Não foi possível criar a conta.",
      };
    }

    return {
      handled: true,
      registered: Boolean(data.registered),
      user: data.user,
    };
  } catch {
    return { handled: false, registered: false };
  }
}

// --- AUTEX ---
export async function saveAutexInDb(autex: Autex): Promise<boolean> {
  try {
    await apiJson("/api/supabase/autex", {
      method: "POST",
      body: JSON.stringify(autex),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error: aErr } = await direct.from("autex").upsert({
          id: autex.id,
          numero: autex.numero,
          descricao: autex.descricao || "",
          detentores: autex.detentores || [],
          data_criacao: autex.dataCriacao,
        });
        if (!aErr) {
          await direct.from("autex_items").delete().eq("autex_id", autex.id);
          if (autex.items?.length) {
            await direct.from("autex_items").insert(
              autex.items.map((item) => ({
                id: item.id,
                autex_id: autex.id,
                especie: item.especie,
                volume_autorizado: item.volumeAutorizado,
                dono: item.dono,
              }))
            );
          }
          return true;
        }
      }
    }
    console.warn(`Erro ao salvar AUTEX ${autex.numero}:`, err);
    return false;
  }
}

export async function deleteAutexInDb(autexId: string): Promise<boolean> {
  try {
    await apiJson(`/api/supabase/autex/${encodeURIComponent(autexId)}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("autex").delete().eq("id", autexId);
        return !error;
      }
    }
    console.warn(`Erro ao deletar AUTEX ${autexId}:`, err);
    return false;
  }
}

// --- DEDUCTIONS ---
export async function saveDeductionsInDb(deductions: NfeDeduction[]): Promise<boolean> {
  try {
    await apiJson("/api/supabase/deductions", {
      method: "POST",
      body: JSON.stringify(deductions),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct && deductions.length > 0) {
        const { error } = await direct.from("deductions").upsert(
          deductions.map((d) => ({
            id: d.id,
            autex_id: d.autexId,
            autex_item_id: d.autexItemId,
            numero_nfe: d.numeroNfe,
            chave_acesso: d.chaveAcesso || null,
            data_emissao: d.dataEmissao,
            dono: d.dono,
            especie: d.especie,
            volume: d.volume,
            data_importacao: d.dataImportacao,
            xml_file_name: d.xmlFileName || null,
            placa_caminhao: d.placaCaminhao || null,
            tipo_lancamento: d.tipoLancamento || "Manual",
            destino_tipo: d.destinoTipo || "serraria",
            serraria_destino: d.serrariaDestino || null,
            patio_descarregamento: d.patioDescarregamento || null,
            galpao_destino: d.galpaoDestino || null,
            galpao_endereco: d.galpaoEndereco || null,
          }))
        );
        return !error;
      }
    }
    console.warn("Erro ao salvar abatimentos no Supabase:", err);
    return false;
  }
}

export async function deleteDeductionInDb(id: string): Promise<boolean> {
  try {
    await apiJson(`/api/supabase/deductions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("deductions").delete().eq("id", id);
        return !error;
      }
    }
    console.warn("Erro ao excluir faturamento no Supabase:", err);
    return false;
  }
}

// --- SAWMILL LOGS ---
export async function saveSawmillLogsInDb(logs: SawmillProcessLog[]): Promise<boolean> {
  try {
    await apiJson("/api/supabase/sawmill-logs", {
      method: "POST",
      body: JSON.stringify(logs),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct && logs.length > 0) {
        const { error } = await direct.from("sawmill_logs").upsert(
          logs.map((s) => ({
            id: s.id,
            especie: s.especie,
            dono: s.dono,
            volume_tora: s.volumeTora,
            volume_serrado: s.volumeSerrado,
            produto_saida: s.produtoSaida,
            rendimento: s.rendimento,
            data_processamento: s.dataProcessamento,
            serraria: s.serraria || null,
            patio: s.patio || null,
          }))
        );
        return !error;
      }
    }
    console.warn("Erro ao salvar logs da serraria no Supabase:", err);
    return false;
  }
}

export async function deleteSawmillLogInDb(id: string): Promise<boolean> {
  try {
    await apiJson(`/api/supabase/sawmill-logs/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("sawmill_logs").delete().eq("id", id);
        return !error;
      }
    }
    console.warn("Erro ao excluir log da serraria no Supabase:", err);
    return false;
  }
}

// --- SECURITY LOGS ---
export async function saveSecurityLogInDb(log: SecurityLog): Promise<boolean> {
  try {
    await apiJson("/api/supabase/security-logs", {
      method: "POST",
      body: JSON.stringify(log),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("security_logs").upsert({
          id: log.id,
          timestamp: log.timestamp,
          usuario: log.usuario,
          acao: log.acao,
          detalhes: log.detalhes || "",
          status: log.status || "sucesso",
        });
        return !error;
      }
    }
    console.warn("Erro ao registrar log de segurança no Supabase:", err);
    return false;
  }
}

export async function clearSecurityLogsInDb(): Promise<boolean> {
  try {
    await apiJson("/api/supabase/security-logs", {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("security_logs").delete().neq("id", "");
        return !error;
      }
    }
    return false;
  }
}

// --- USER ACCOUNTS ---
export async function fetchUserAccountsDb(): Promise<UserAccount[] | null> {
  try {
    return await apiJson<UserAccount[]>("/api/supabase/users");
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { data, error } = await direct.from("user_accounts").select("*");
        if (error) return null;
        return (data || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          senha: u.senha || undefined,
          nome: u.nome,
          cargo: u.cargo,
          role: u.role,
          ativo: u.ativo,
          dataCriacao: u.data_criacao,
          permissoes: u.permissoes || [],
        }));
      }
    }
    return null;
  }
}

export async function saveUserAccountInDb(user: UserAccount): Promise<boolean> {
  try {
    await apiJson("/api/supabase/users", {
      method: "POST",
      body: JSON.stringify(user),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("user_accounts").upsert({
          id: user.id,
          username: user.username,
          senha: user.senha || null,
          nome: user.nome,
          cargo: user.cargo,
          role: user.role || "operator",
          ativo: user.ativo !== undefined ? Boolean(user.ativo) : true,
          data_criacao: user.dataCriacao || new Date().toISOString().split("T")[0],
          permissoes: user.permissoes || [],
          updated_at: new Date().toISOString(),
        });
        return !error;
      }
    }
    console.warn("Erro ao salvar conta de usuário no Supabase:", err);
    return false;
  }
}

export async function deleteUserAccountInDb(id: string): Promise<boolean> {
  try {
    await apiJson(`/api/supabase/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("user_accounts").delete().eq("id", id);
        return !error;
      }
    }
    console.warn("Erro ao excluir usuário no Supabase:", err);
    return false;
  }
}

// --- LOGISTICS, DIRECTORIES, GALPÕES, MAPPINGS ---
export async function saveTrucksInDb(trucks: TruckEntity[]): Promise<boolean> {
  try {
    await apiJson("/api/supabase/trucks", {
      method: "POST",
      body: JSON.stringify(trucks),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        await direct.from("trucks").delete().neq("id", "");
        if (trucks.length > 0) {
          const { error } = await direct.from("trucks").upsert(
            trucks.map((t) => ({
              id: t.id,
              placa: t.placa,
              modelo: t.modelo || "",
              motorista: t.motorista || "",
              capacidade_max_m3: Number(t.capacidadeMaxM3 || 45),
            }))
          );
          return !error;
        }
        return true;
      }
    }
    return false;
  }
}

export async function saveDirectoriesInDb(payload: {
  sawmills?: string[];
  yards?: string[];
}): Promise<boolean> {
  try {
    await apiJson("/api/supabase/directories", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        if (Array.isArray(payload.sawmills)) {
          await direct.from("sawmills").delete().neq("nome", "");
          if (payload.sawmills.length > 0) {
            await direct
              .from("sawmills")
              .upsert(payload.sawmills.map((nome) => ({ nome })));
          }
        }
        if (Array.isArray(payload.yards)) {
          await direct.from("yards").delete().neq("nome", "");
          if (payload.yards.length > 0) {
            await direct
              .from("yards")
              .upsert(payload.yards.map((nome) => ({ nome })));
          }
        }
        return true;
      }
    }
    return false;
  }
}

export async function saveGalpoesInDb(galpoes: GalpaoEntity[]): Promise<boolean> {
  try {
    await apiJson("/api/supabase/galpoes", {
      method: "POST",
      body: JSON.stringify(galpoes),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        await direct.from("galpoes").delete().neq("id", "");
        if (galpoes.length > 0) {
          const { error } = await direct.from("galpoes").upsert(
            galpoes.map((g) => ({
              id: g.id,
              nome: g.nome,
              endereco: g.endereco,
              cidade_uf: g.cidadeUf,
              ponto_referencia: g.pontoReferencia || null,
              responsavel: g.responsavel || null,
              telefone: g.telefone || null,
              capacidade_m3: g.capacidadeM3 ?? null,
              observacoes: g.observacoes || null,
            }))
          );
          return !error;
        }
        return true;
      }
    }
    return false;
  }
}

export async function saveGalpaoDispatchesInDb(
  dispatches: GalpaoDispatchLog[]
): Promise<boolean> {
  try {
    await apiJson("/api/supabase/galpao-dispatches", {
      method: "POST",
      body: JSON.stringify(dispatches),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        await direct.from("galpao_dispatches").delete().neq("id", "");
        if (dispatches.length > 0) {
          const { error } = await direct.from("galpao_dispatches").upsert(
            dispatches.map((d) => ({
              id: d.id,
              galpao_id: d.galpaoId,
              galpao_nome: d.galpaoNome,
              especie: d.especie,
              dono: d.dono,
              volume: d.volume,
              tipo_saida: d.tipoSaida,
              destinatario: d.destinatario,
              documento_ref: d.documentoRef || null,
              placa_caminhao: d.placaCaminhao || null,
              motorista: d.motorista || null,
              data_saida: d.dataSaida,
              observacoes: d.observacoes || null,
            }))
          );
          return !error;
        }
        return true;
      }
    }
    return false;
  }
}

export async function saveNfeMappingsInDb(
  mappings: Record<string, { especie: string; dono: string }>
): Promise<boolean> {
  try {
    await apiJson("/api/supabase/nfe-mappings", {
      method: "POST",
      body: JSON.stringify(mappings),
    });
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const entries = Object.entries(mappings || {}).map(([chave, val]) => ({
          chave_xml: chave,
          especie: val.especie,
          dono: val.dono,
          updated_at: new Date().toISOString(),
        }));
        if (entries.length > 0) {
          const { error } = await direct.from("nfe_mappings").upsert(entries);
          return !error;
        }
        return true;
      }
    }
    return false;
  }
}

// --- PER-USER WORKSPACE: EVENTS, NOTES, CHECKLISTS ---
export async function fetchUserWorkspaceDb(
  username: string
): Promise<UserWorkspacePayload | null> {
  try {
    return await apiJson<UserWorkspacePayload>(
      `/api/supabase/workspace/${encodeURIComponent(username)}`
    );
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const [eventsRes, notesRes, checklistsRes] = await Promise.all([
          direct
            .from("user_events")
            .select("*")
            .eq("username", username)
            .order("data_evento", { ascending: true }),
          direct
            .from("user_notes")
            .select("*")
            .eq("username", username)
            .order("fixada", { ascending: false }),
          direct.from("user_checklists").select("*").eq("username", username),
        ]);
        return {
          events: (eventsRes.data || []).map((e: any) => ({
            id: e.id,
            username: e.username,
            titulo: e.titulo,
            descricao: e.descricao || "",
            dataEvento: e.data_evento,
            horaEvento: e.hora_evento || undefined,
            categoria: e.categoria || "Operacional",
            prioridade: e.prioridade || "media",
            concluido: Boolean(e.concluido),
            createdAt: e.created_at,
            updatedAt: e.updated_at,
          })),
          notes: (notesRes.data || []).map((n: any) => ({
            id: n.id,
            username: n.username,
            titulo: n.titulo,
            conteudo: n.conteudo,
            cor: n.cor || "emerald",
            fixada: Boolean(n.fixada),
            tags: n.tags || [],
            createdAt: n.created_at,
            updatedAt: n.updated_at,
          })),
          checklists: (checklistsRes.data || []).map((c: any) => ({
            id: c.id,
            username: c.username,
            titulo: c.titulo,
            categoria: c.categoria || "Operacional",
            items: Array.isArray(c.items) ? c.items : [],
            createdAt: c.created_at,
            updatedAt: c.updated_at,
          })),
        };
      }
    }
    return null;
  }
}

export async function saveUserEventInDb(
  username: string,
  event: UserEvent
): Promise<boolean> {
  try {
    await apiJson(
      `/api/supabase/workspace/${encodeURIComponent(username)}/events`,
      {
        method: "POST",
        body: JSON.stringify(event),
      }
    );
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("user_events").upsert({
          id: event.id,
          username,
          titulo: event.titulo,
          descricao: event.descricao || "",
          data_evento: event.dataEvento,
          hora_evento: event.horaEvento || null,
          categoria: event.categoria || "Operacional",
          prioridade: event.prioridade || "media",
          concluido: Boolean(event.concluido),
          created_at: event.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return !error;
      }
    }
    return false;
  }
}

export async function deleteUserEventInDb(
  username: string,
  id: string
): Promise<boolean> {
  try {
    await apiJson(
      `/api/supabase/workspace/${encodeURIComponent(username)}/events/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct
          .from("user_events")
          .delete()
          .eq("id", id)
          .eq("username", username);
        return !error;
      }
    }
    return false;
  }
}

export async function saveUserNoteInDb(
  username: string,
  note: UserNote
): Promise<boolean> {
  try {
    await apiJson(
      `/api/supabase/workspace/${encodeURIComponent(username)}/notes`,
      {
        method: "POST",
        body: JSON.stringify(note),
      }
    );
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("user_notes").upsert({
          id: note.id,
          username,
          titulo: note.titulo,
          conteudo: note.conteudo,
          cor: note.cor || "emerald",
          fixada: Boolean(note.fixada),
          tags: note.tags || [],
          created_at: note.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return !error;
      }
    }
    return false;
  }
}

export async function deleteUserNoteInDb(
  username: string,
  id: string
): Promise<boolean> {
  try {
    await apiJson(
      `/api/supabase/workspace/${encodeURIComponent(username)}/notes/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct
          .from("user_notes")
          .delete()
          .eq("id", id)
          .eq("username", username);
        return !error;
      }
    }
    return false;
  }
}

export async function saveUserChecklistInDb(
  username: string,
  checklist: UserChecklist
): Promise<boolean> {
  try {
    await apiJson(
      `/api/supabase/workspace/${encodeURIComponent(username)}/checklists`,
      {
        method: "POST",
        body: JSON.stringify(checklist),
      }
    );
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct.from("user_checklists").upsert({
          id: checklist.id,
          username,
          titulo: checklist.titulo,
          categoria: checklist.categoria || "Operacional",
          items: Array.isArray(checklist.items) ? checklist.items : [],
          created_at: checklist.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return !error;
      }
    }
    return false;
  }
}

export async function deleteUserChecklistInDb(
  username: string,
  id: string
): Promise<boolean> {
  try {
    await apiJson(
      `/api/supabase/workspace/${encodeURIComponent(username)}/checklists/${encodeURIComponent(id)}`,
      { method: "DELETE" }
    );
    return true;
  } catch (err) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        const { error } = await direct
          .from("user_checklists")
          .delete()
          .eq("id", id)
          .eq("username", username);
        return !error;
      }
    }
    return false;
  }
}

function collectLocalArray<T>(prefix: string): T[] {
  const collected: T[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) || "[]");
        if (Array.isArray(parsed)) {
          collected.push(...parsed);
        }
      } catch {
        // Ignore malformed local key
      }
    }
  }
  return collected;
}

export async function syncAllLocalStorageToSupabase(
  autexList: Autex[],
  deductions: NfeDeduction[],
  sawmillLogs: SawmillProcessLog[],
  userAccounts: UserAccount[],
  securityLogs: SecurityLog[]
): Promise<{ success: boolean; message: string }> {
  try {
    const trucksRaw = localStorage.getItem("logistica_trucks_directory");
    const galpoesRaw = localStorage.getItem("manejo_galpoes_directory");
    const dispatchesRaw = localStorage.getItem("manejo_galpao_dispatches");
    const sawmillsRaw = localStorage.getItem("manejo_serrarias_directory");
    const yardsRaw = localStorage.getItem("manejo_patios_directory");
    const mappingsRaw = localStorage.getItem("nfe_xml_saved_mappings");

    const userEvents = collectLocalArray<UserEvent>("etw_user_events_");
    const userNotes = collectLocalArray<UserNote>("etw_user_notes_");
    const userChecklists = collectLocalArray<UserChecklist>("etw_user_checklists_");

    const payload = {
      autexList,
      deductions,
      sawmillLogs,
      userAccounts,
      securityLogs,
      trucks: trucksRaw ? JSON.parse(trucksRaw) : [],
      galpoes: galpoesRaw ? JSON.parse(galpoesRaw) : [],
      galpaoDispatches: dispatchesRaw ? JSON.parse(dispatchesRaw) : [],
      sawmills: sawmillsRaw ? JSON.parse(sawmillsRaw) : [],
      yards: yardsRaw ? JSON.parse(yardsRaw) : [],
      nfeMappings: mappingsRaw ? JSON.parse(mappingsRaw) : {},
      userEvents,
      userNotes,
      userChecklists,
    };

    return await apiJson<{ success: boolean; message: string }>(
      "/api/supabase/sync-all",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  } catch (err: any) {
    if (err instanceof ApiRouteUnavailableError) {
      const direct = getDirectBrowserSupabase();
      if (direct) {
        try {
          for (const a of autexList) {
            await saveAutexInDb(a);
          }
          if (deductions.length) await saveDeductionsInDb(deductions);
          if (sawmillLogs.length) await saveSawmillLogsInDb(sawmillLogs);
          for (const u of userAccounts) {
            await saveUserAccountInDb(u);
          }
          for (const l of securityLogs) {
            await saveSecurityLogInDb(l);
          }
          const trucksRaw = localStorage.getItem("logistica_trucks_directory");
          const galpoesRaw = localStorage.getItem("manejo_galpoes_directory");
          const dispatchesRaw = localStorage.getItem("manejo_galpao_dispatches");
          const sawmillsRaw = localStorage.getItem("manejo_serrarias_directory");
          const yardsRaw = localStorage.getItem("manejo_patios_directory");
          const mappingsRaw = localStorage.getItem("nfe_xml_saved_mappings");

          if (trucksRaw) await saveTrucksInDb(JSON.parse(trucksRaw));
          if (galpoesRaw) await saveGalpoesInDb(JSON.parse(galpoesRaw));
          if (dispatchesRaw) await saveGalpaoDispatchesInDb(JSON.parse(dispatchesRaw));
          await saveDirectoriesInDb({
            sawmills: sawmillsRaw ? JSON.parse(sawmillsRaw) : undefined,
            yards: yardsRaw ? JSON.parse(yardsRaw) : undefined,
          });
          if (mappingsRaw) await saveNfeMappingsInDb(JSON.parse(mappingsRaw));

          for (const ev of collectLocalArray<UserEvent>("etw_user_events_")) {
            await saveUserEventInDb(ev.username, ev);
          }
          for (const note of collectLocalArray<UserNote>("etw_user_notes_")) {
            await saveUserNoteInDb(note.username, note);
          }
          for (const cl of collectLocalArray<UserChecklist>("etw_user_checklists_")) {
            await saveUserChecklistInDb(cl.username, cl);
          }
          return {
            success: true,
            message: "Sincronização direta com o Supabase concluída com sucesso!",
          };
        } catch (directErr: any) {
          return {
            success: false,
            message: directErr?.message || "Falha ao sincronizar diretamente com o Supabase.",
          };
        }
      }
      return {
        success: false,
        message:
          "API /api/supabase não encontrada neste servidor estático. Faça o redeploy com suporte à pasta api/ ou configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.",
      };
    }

    return {
      success: false,
      message: err?.message || "Falha ao sincronizar dados com o Supabase.",
    };
  }
}
