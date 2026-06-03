/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AutexItem {
  id: string;
  especie: string;
  volumeAutorizado: number; // in m³
  dono: string; // Dona da madeira / Detentor
}

export interface Autex {
  id: string;
  numero: string; // e.g., "12.3456/2026-AUTEX"
  descricao: string;
  detentores: string[]; // List of wood owners involved
  items: AutexItem[];
  dataCriacao: string;
}

export interface NfeItem {
  especie: string;
  volume: number;
  dono: string;
  valido: boolean;
  motivoInvalidez?: string;
  autexItemId?: string; // matched item
}

export interface NfeImportResult {
  numeroNfe: string;
  chaveAcesso?: string;
  dataEmissao: string;
  emitenteNome: string;
  destinatarioNome: string;
  items: NfeItem[];
}

export interface NfeDeduction {
  id: string;
  autexId: string;
  autexItemId: string; // ref to specific item
  numeroNfe: string;
  chaveAcesso?: string;
  dataEmissao: string;
  dono: string; // Owner of the wood
  especie: string;
  volume: number; // m³ subtracted
  dataImportacao: string;
  xmlFileName?: string;
  placaCaminhao?: string; // transport license plate
  tipoLancamento?: "Manual" | "XML"; // manual launch or XML import
}

export interface SawmillProcessLog {
  id: string;
  especie: string;
  dono: string;
  volumeTora: number;      // raw log volume consumed (m³)
  volumeSerrado: number;   // sawn timber product volume produced (m³)
  produtoSaida: string;    // e.g., "Viga", "Prancha", "Tábua", "Ripa", "Sarrafo"
  rendimento: number;      // yield percentage (e.g., 45.5%)
  dataProcessamento: string;
}

export interface UserAccount {
  id: string;
  username: string;
  senha?: string;
  nome: string;
  cargo: string;
  role: "admin" | "operator" | "auditor";
  ativo: boolean;
  dataCriacao: string;
  permissoes: string[]; // e.g. ["Visualização Completa", "Lançar Abates", "Configurar Logística", "Industrializar Serraria", "Efetuar Backup", "Controle de Usuários"]
}

export interface SecurityLog {
  id: string;
  timestamp: string;
  usuario: string;
  acao: string;
  detalhes: string;
  status: "sucesso" | "erro" | "alerta";
}

