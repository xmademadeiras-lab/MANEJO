/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
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
      message: status.message,
      latency: status.latency,
    };
  } catch (err: any) {
    return {
      success: false,
      configured: false,
      message: `Falha ao verificar status do servidor Supabase: ${err?.message || err}`,
    };
  }
}

export async function fetchMigrationSql(): Promise<string> {
  const res = await fetch("/api/supabase/migration-sql");
  if (!res.ok) {
    throw new Error("Não foi possível carregar o script SQL de migração.");
  }
  return res.text();
}

export async function fetchBootstrapFromServer(): Promise<SupabaseBootstrapPayload | null> {
  try {
    return await apiJson<SupabaseBootstrapPayload>("/api/supabase/bootstrap");
  } catch (err) {
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

    if (response.status === 503) {
      return { handled: false, authenticated: false };
    }

    const data = await response.json();
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

    if (response.status === 503) {
      return { handled: false, registered: false };
    }

    const data = await response.json();
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
  } catch {
    return false;
  }
}

// --- USER ACCOUNTS ---
export async function fetchUserAccountsDb(): Promise<UserAccount[] | null> {
  try {
    return await apiJson<UserAccount[]>("/api/supabase/users");
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
  } catch {
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
    return {
      success: false,
      message: err?.message || "Falha ao sincronizar dados com o Supabase.",
    };
  }
}
