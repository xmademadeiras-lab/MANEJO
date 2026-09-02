/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GalpaoEntity {
  id: string;
  nome: string;
  endereco: string;
  cidadeUf: string;
  pontoReferencia?: string;
  responsavel?: string;
  telefone?: string;
  capacidadeM3?: number;
  observacoes?: string;
}

export interface GalpaoDispatchLog {
  id: string;
  galpaoId: string;
  galpaoNome: string;
  especie: string;
  dono: string;
  volume: number; // m³ expedido
  tipoSaida: "Venda Direta" | "Transferência Serraria" | "Transferência Outro Galpão" | "Uso Próprio" | "Outro";
  destinatario: string; // Cliente / Destino
  documentoRef?: string; // NF / Guia / CTRC
  placaCaminhao?: string;
  motorista?: string;
  dataSaida: string;
  observacoes?: string;
}

export const DEFAULT_GALPOES: GalpaoEntity[] = [
  {
    id: "galpao-01",
    nome: "Galpão Central - Rodovia BR-163",
    endereco: "Rodovia BR-163, Km 45 - Zona Rural",
    cidadeUf: "Santarém - PA",
    pontoReferencia: "Ao lado do Posto San Remo",
    responsavel: "Carlos Alberto Silveira",
    telefone: "(93) 99122-3401",
    capacidadeM3: 5000,
    observacoes: "Pátio coberto e área externa para toras nobres"
  },
  {
    id: "galpao-02",
    nome: "Galpão 02 - Distrito Industrial",
    endereco: "Av. Perimetral Norte, Lote 12 - Distrito Industrial",
    cidadeUf: "Itaituba - PA",
    pontoReferencia: "Próximo ao Porto Fluvial",
    responsavel: "Marcos Vinicius Ribeiro",
    telefone: "(93) 98405-7789",
    capacidadeM3: 3500,
    observacoes: "Depósito logístico de apoio e transbordo"
  },
  {
    id: "galpao-03",
    nome: "Galpão 03 - Depósito Anapu",
    endereco: "Vicinal do Km 18, Travessão Sul, S/N",
    cidadeUf: "Anapu - PA",
    pontoReferencia: "Acesso pela Rodovia Transamazônica",
    responsavel: "José Ribamar Souza",
    telefone: "(91) 99311-8842",
    capacidadeM3: 2500,
    observacoes: "Armazenamento provisório de toras de manejo"
  }
];

export function getRegisteredGalpoes(): GalpaoEntity[] {
  try {
    const stored = localStorage.getItem("manejo_galpoes_directory");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading galpoes directory:", e);
  }
  return DEFAULT_GALPOES;
}

export function saveRegisteredGalpoes(list: GalpaoEntity[]): void {
  try {
    localStorage.setItem("manejo_galpoes_directory", JSON.stringify(list));
    window.dispatchEvent(new Event("galpoes_updated"));
  } catch (e) {
    console.error("Error saving galpoes directory:", e);
  }
}

export function addRegisteredGalpao(galpao: Omit<GalpaoEntity, "id">): GalpaoEntity {
  const current = getRegisteredGalpoes();
  const newGalpao: GalpaoEntity = {
    ...galpao,
    id: `galpao-${Date.now()}-${Math.floor(Math.random() * 1000)}`
  };
  const updated = [...current, newGalpao];
  saveRegisteredGalpoes(updated);
  return newGalpao;
}

export function updateRegisteredGalpao(updatedItem: GalpaoEntity): void {
  const current = getRegisteredGalpoes();
  const updated = current.map(g => (g.id === updatedItem.id ? updatedItem : g));
  saveRegisteredGalpoes(updated);
}

export function deleteRegisteredGalpao(id: string): void {
  const current = getRegisteredGalpoes();
  const updated = current.filter(g => g.id !== id);
  saveRegisteredGalpoes(updated);
}

export function getGalpaoDispatches(): GalpaoDispatchLog[] {
  try {
    const stored = localStorage.getItem("manejo_galpao_dispatches");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("Error reading galpao dispatches:", e);
  }
  return [];
}

export function saveGalpaoDispatches(list: GalpaoDispatchLog[]): void {
  try {
    localStorage.setItem("manejo_galpao_dispatches", JSON.stringify(list));
    window.dispatchEvent(new Event("galpao_dispatches_updated"));
  } catch (e) {
    console.error("Error saving galpao dispatches:", e);
  }
}
