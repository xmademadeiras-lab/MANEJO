/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";
import { Autex, AutexItem, NfeDeduction, SawmillProcessLog, SecurityLog, UserAccount } from "../types";

// Grab Supabase environment configs if available
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

// Exporting configuration existence checks
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Fetch all AUTEX contracts from Supabase, including their nested wood item records.
 */
export async function fetchAutexListDb(): Promise<Autex[] | null> {
  if (!supabase) return null;
  try {
    // Fetch principal autex data
    const { data: autexData, error: autexErr } = await supabase
      .from("autex")
      .select("*");
    if (autexErr) throw autexErr;

    // Fetch individual authorized wood spec items
    const { data: itemsData, error: itemsErr } = await supabase
      .from("autex_items")
      .select("*");
    if (itemsErr) throw itemsErr;

    // Format clean Typescript typed structure matching state models
    const list: Autex[] = (autexData || []).map(a => {
      const matchingItems: AutexItem[] = (itemsData || [])
        .filter(i => i.autex_id === a.id)
        .map(i => ({
          id: i.id,
          especie: i.especie,
          volumeAutorizado: Number(i.volume_autorizado),
          dono: i.dono
        }));
      
      return {
        id: a.id,
        numero: a.numero,
        descricao: a.descricao || "",
        detentores: a.detentores || [],
        items: matchingItems,
        dataCriacao: a.data_criacao
      };
    });

    return list;
  } catch (err) {
    console.warn("Erro ao carregar AUTEX do Supabase:", err);
    return null;
  }
}

/**
 * Saves or updates a specific AUTEX contract, cascading into its items.
 */
export async function saveAutexInDb(autex: Autex): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error: autexErr } = await supabase
      .from("autex")
      .upsert({
        id: autex.id,
        numero: autex.numero,
        descricao: autex.descricao,
        detentores: autex.detentores,
        data_criacao: autex.dataCriacao
      });
    if (autexErr) throw autexErr;

    // Delete existing item associations for safety prior to batch insert matching local list definition
    const { error: deleteErr } = await supabase
      .from("autex_items")
      .delete()
      .eq("autex_id", autex.id);
    if (deleteErr) throw deleteErr;

    if (autex.items.length > 0) {
      const itemsToInsert = autex.items.map(item => ({
        id: item.id,
        autex_id: autex.id,
        especie: item.especie,
        volume_autorizado: item.volumeAutorizado,
        dono: item.dono
      }));
      const { error: itemsErr } = await supabase
        .from("autex_items")
        .insert(itemsToInsert);
      if (itemsErr) throw itemsErr;
    }

    return true;
  } catch (err) {
    console.warn(`Erro ao salvar AUTEX ${autex.numero} no Supabase:`, err);
    return false;
  }
}

/**
 * Delete an AUTEX and its referenced items.
 */
export async function deleteAutexInDb(autexId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("autex")
      .delete()
      .eq("id", autexId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn(`Erro ao deletar AUTEX ${autexId} no Supabase:`, err);
    return false;
  }
}

/**
 * Fetch all NF-e deduction logs from Supabase.
 */
export async function fetchDeductionsDb(): Promise<NfeDeduction[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("deductions")
      .select("*");
    if (error) throw error;

    return (data || []).map(d => ({
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
      tipoLancamento: d.tipo_lancamento as "Manual" | "XML",
      serrariaDestino: d.serraria_destino || undefined,
      patioDescarregamento: d.patio_descarregamento || undefined
    }));
  } catch (err) {
    console.warn("Erro ao carregar abatimentos do Supabase:", err);
    return null;
  }
}

/**
 * Save deduction logs to Supabase database.
 */
export async function saveDeductionsInDb(deductions: NfeDeduction[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const dbPayload = deductions.map(d => ({
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
      tipo_lancamento: d.tipoLancamento || 'Manual',
      serraria_destino: d.serrariaDestino || null,
      patio_descarregamento: d.patioDescarregamento || null
    }));

    const { error } = await supabase
      .from("deductions")
      .upsert(dbPayload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Erro ao salvar abatimentos no Supabase:", err);
    return false;
  }
}

/**
 * Delete a deduction record.
 */
export async function deleteDeductionInDb(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("deductions")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Erro ao excluir faturamento do Supabase:", err);
    return false;
  }
}

/**
 * Fetch sawmill industrial logs from Supabase.
 */
export async function fetchSawmillLogsDb(): Promise<SawmillProcessLog[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("sawmill_logs")
      .select("*");
    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      especie: s.especie,
      dono: s.dono,
      volumeTora: Number(s.volume_tora),
      volumeSerrado: Number(s.volume_serrado),
      produtoSaida: s.produto_saida,
      rendimento: Number(s.rendimento),
      dataProcessamento: s.data_processamento,
      serraria: s.serraria || undefined,
      patio: s.patio || undefined
    }));
  } catch (err) {
    console.warn("Erro ao carregar logs da serraria do Supabase:", err);
    return null;
  }
}

/**
 * Save sawmill logs list to Supabase.
 */
export async function saveSawmillLogsInDb(logs: SawmillProcessLog[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const dbPayload = logs.map(s => ({
      id: s.id,
      especie: s.especie,
      dono: s.dono,
      volume_tora: s.volumeTora,
      volume_serrado: s.volumeSerrado,
      produto_saida: s.produtoSaida,
      rendimento: s.rendimento,
      data_processamento: s.dataProcessamento,
      serraria: s.serraria || null,
      patio: s.patio || null
    }));

    const { error } = await supabase
      .from("sawmill_logs")
      .upsert(dbPayload);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Erro ao salvar logs da serraria no Supabase:", err);
    return false;
  }
}

/**
 * Delete a single sawmill log record.
 */
export async function deleteSawmillLogInDb(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("sawmill_logs")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Erro ao excluir log da serraria do Supabase:", err);
    return false;
  }
}

/**
 * Fetch all system audit security logs.
 */
export async function fetchSecurityLogsDb(): Promise<SecurityLog[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("security_logs")
      .select("*")
      .order("timestamp", { ascending: false });
    if (error) throw error;

    return (data || []).map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      usuario: s.usuario,
      acao: s.acao,
      detalhes: s.detalhes || "",
      status: s.status as "sucesso" | "erro" | "alerta"
    }));
  } catch (err) {
    console.warn("Erro ao carregar logs de segurança do Supabase:", err);
    return null;
  }
}

/**
 * Save a new single safety audit event.
 */
export async function saveSecurityLogInDb(log: SecurityLog): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("security_logs")
      .insert({
        id: log.id,
        timestamp: log.timestamp,
        usuario: log.usuario,
        acao: log.acao,
        detalhes: log.detalhes,
        status: log.status
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Erro ao registrar log de segurança no Supabase:", err);
    return false;
  }
}

/**
 * Fetch system active user accounts database list.
 */
export async function fetchUserAccountsDb(): Promise<UserAccount[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("user_accounts")
      .select("*");
    if (error) throw error;

    return (data || []).map(u => ({
      id: u.id,
      username: u.username,
      senha: u.senha || undefined,
      nome: u.nome,
      cargo: u.cargo,
      role: u.role as "admin" | "operator" | "auditor",
      ativo: u.ativo,
      dataCriacao: u.data_creacao || u.data_criacao, // fallback if named differently
      permissoes: u.permissoes || []
    }));
  } catch (err) {
    console.warn("Erro ao carregar contas de usuários do Supabase:", err);
    return null;
  }
}

/**
 * Save user system account definition to database schemas.
 */
export async function saveUserAccountInDb(user: UserAccount): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("user_accounts")
      .upsert({
        id: user.id,
        username: user.username,
        senha: user.senha || null,
        nome: user.nome,
        cargo: user.cargo,
        role: user.role,
        ativo: user.ativo,
        data_criacao: user.dataCriacao,
        permissoes: user.permissoes
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Erro ao salvar conta de usuário no Supabase:", err);
    return false;
  }
}

/**
 * Delete specific user ID configurations.
 */
export async function deleteUserAccountInDb(id: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from("user_accounts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Erro ao excluir usuário do Supabase:", err);
    return false;
  }
}

/**
 * Bulk sync all existing client local storage lists directly into the Supabase server tables
 */
export async function syncAllLocalStorageToSupabase(
  autexList: Autex[],
  deductions: NfeDeduction[],
  sawmillLogs: SawmillProcessLog[],
  userAccounts: UserAccount[],
  securityLogs: SecurityLog[]
): Promise<{ success: boolean; message: string }> {
  if (!supabase) {
    return { success: false, message: "Mecanismo Supabase não configurado no seu arquivo .env" };
  }

  try {
    // 1. Sync autex and its items
    for (const autex of autexList) {
      await saveAutexInDb(autex);
    }

    // 2. Sync deductions
    if (deductions.length > 0) {
      await saveDeductionsInDb(deductions);
    }

    // 3. Sync sawmill logs
    if (sawmillLogs.length > 0) {
      await saveSawmillLogsInDb(sawmillLogs);
    }

    // 4. Sync users
    for (const user of userAccounts) {
      await saveUserAccountInDb(user);
    }

    // 5. Sync security logs
    for (const log of securityLogs) {
      await saveSecurityLogInDb(log);
    }

    return { 
      success: true, 
      message: "Sincronização completa de dados legados para o banco Supabase com sucesso!" 
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: `Erro de sincronização: ${err.message || err}` 
    };
  }
}

/**
 * Test connections and measure api latency of Supabase Project.
 */
export async function checkSupabaseConnection(): Promise<{ success: boolean; message: string; latency?: number }> {
  if (!supabase) {
    return { success: false, message: "Supabase não está configurado. Verifique as credenciais no arquivo .env" };
  }
  
  const startTime = performance.now();
  try {
    // Ping with a lightweight select on the 'autex' table
    const { error } = await supabase
      .from("autex")
      .select("id")
      .limit(1);
      
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    if (error) {
      // If error code indicates table not existing, postgres is alive but migrations are missing
      if (error.code === "PGRST116" || error.code === "42P01") {
        return { 
          success: false, 
          message: `Conectado ao Supabase, mas tabelas não foram encontradas! Erro: ${error.message} (Código ${error.code}). Por favor, execute as Migrations descritas no arquivo /supabase/README.md para criar os esquemas necessários.`,
          latency: duration 
        };
      }
      throw error;
    }

    return {
      success: true,
      message: "Conexão com o banco de dados remota do Supabase estabelecida com sucesso!",
      latency: duration
    };
  } catch (err: any) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    return {
      success: false,
      message: `Falha de conexão com o Supabase: ${err?.message || err?.details || err || "Erro desconhecido"}`,
      latency: duration
    };
  }
}
