/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Autex } from "./types";

export const DEFAULT_AUTEX_LIST: Autex[] = [
  {
    id: "autex-1",
    numero: "15.0844/2026-AUTEX",
    descricao: "Plano de Manejo Florestal Sustentável - Gleba Jacarandá",
    detentores: ["Madeiras Juruá Eireli", "Fazenda Vista Alegre"],
    dataCriacao: "2026-01-15",
    items: [
      { id: "item-1-1", especie: "Ipê", volumeAutorizado: 450.0, dono: "Madeiras Juruá Eireli" },
      { id: "item-1-2", especie: "Jatobá", volumeAutorizado: 300.25, dono: "Madeiras Juruá Eireli" },
      { id: "item-1-3", especie: "Cedro", volumeAutorizado: 180.5, dono: "Fazenda Vista Alegre" },
      { id: "item-1-4", especie: "Angelim-pedra", volumeAutorizado: 520.0, dono: "Fazenda Vista Alegre" },
      { id: "item-1-5", especie: "Cumaru", volumeAutorizado: 250.0, dono: "Madeiras Juruá Eireli" },
      { id: "item-1-6", especie: "Roxinho", volumeAutorizado: 90.0, dono: "Fazenda Vista Alegre" },
    ],
  },
  {
    id: "autex-2",
    numero: "09.1102/2026-AUTEX",
    descricao: "Área de Exploração Florestal Consolidada - Lote Tapajós",
    detentores: ["Cooperativa Agroforestal Tapajós", "Madeireira Progresso Ltda"],
    dataCriacao: "2026-03-10",
    items: [
      { id: "item-2-1", especie: "Ipê", volumeAutorizado: 185.0, dono: "Madeireira Progresso Ltda" },
      { id: "item-2-2", especie: "Jatobá", volumeAutorizado: 450.0, dono: "Cooperativa Agroforestal Tapajós" },
      { id: "item-2-3", especie: "Freijó", volumeAutorizado: 220.0, dono: "Cooperativa Agroforestal Tapajós" },
      { id: "item-2-4", especie: "Itaúba", volumeAutorizado: 310.0, dono: "Madeireira Progresso Ltda" },
    ],
  },
];

export const AVAILABLE_SPECIES = [
  "Ipê",
  "Jatobá",
  "Cedro",
  "Angelim-pedra",
  "Cumaru",
  "Roxinho",
  "Freijó",
  "Itaúba",
  "Maracatiara",
  "Tauari",
  "Massaranduba",
  "Sucupira"
];
