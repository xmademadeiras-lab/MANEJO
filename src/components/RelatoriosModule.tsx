/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { Autex, NfeDeduction, SawmillProcessLog } from "../types";
import { 
  FileSpreadsheet, 
  Layers, 
  Truck, 
  Factory, 
  Printer, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Calendar,
  User,
  Activity
} from "lucide-react";

interface RelatoriosModuleProps {
  activeAutex: Autex | null | undefined;
  deductions: NfeDeduction[];
  sawmillLogs: SawmillProcessLog[];
  onDeleteDeduction: (id: string, numeroNfe: string) => void;
  
  // Shared search/filter states
  filterOwner: string;
  setFilterOwner: (owner: string) => void;
  filterEspecie: string;
  setFilterEspecie: (especie: string) => void;
  filterTruck: string;
  setFilterTruck: (truck: string) => void;
  filterTipo: string;
  setFilterTipo: (tipo: string) => void;
  
  reportSubTab: "estoque" | "carregamentos" | "serraria";
  setReportSubTab: (subTab: "estoque" | "carregamentos" | "serraria") => void;

  totalVolumeAutorizado: number;
  totalVolumeExpedido: number;
  totalSaldoAtual: number;
  volByOwnerList: { owner: string; volume: number }[];
}

export default function RelatoriosModule({
  activeAutex,
  deductions,
  sawmillLogs,
  onDeleteDeduction,
  filterOwner,
  setFilterOwner,
  filterEspecie,
  setFilterEspecie,
  filterTruck,
  setFilterTruck,
  filterTipo,
  setFilterTipo,
  reportSubTab,
  setReportSubTab,
  totalVolumeAutorizado,
  totalVolumeExpedido,
  totalSaldoAtual,
  volByOwnerList
}: RelatoriosModuleProps) {

  // --- Dynamic Filtering & Calculations for "Estoque na AUTEX" ---
  const filteredAutexItems = useMemo(() => {
    if (!activeAutex) return [];
    return activeAutex.items.filter(item => {
      if (filterOwner && item.dono.toLowerCase() !== filterOwner.toLowerCase()) return false;
      if (filterEspecie && item.especie.toLowerCase() !== filterEspecie.toLowerCase()) return false;
      return true;
    });
  }, [activeAutex, filterOwner, filterEspecie]);

  const autexItemsWithStatus = useMemo(() => {
    if (!activeAutex) return [];
    return filteredAutexItems.map(item => {
      // Find deductions specifically for this item
      const itemDeductions = deductions.filter(d => 
        d.autexId === activeAutex.id && 
        d.especie.toLowerCase().trim() === item.especie.toLowerCase().trim() && 
        d.dono.toLowerCase().trim() === item.dono.toLowerCase().trim()
      );
      const volumeConsumido = itemDeductions.reduce((total, d) => total + d.volume, 0);
      const volumeRestante = Math.max(0, item.volumeAutorizado - volumeConsumido);
      const pctConsumo = item.volumeAutorizado > 0 ? (volumeConsumido / item.volumeAutorizado) * 100 : 0;
      
      let status: "ESGOTADO" | "CRITICO" | "ESTAVEL";
      if (volumeRestante <= 0.005) {
        status = "ESGOTADO";
      } else if (volumeRestante < item.volumeAutorizado * 0.20) {
        status = "CRITICO";
      } else {
        status = "ESTAVEL";
      }

      return {
        ...item,
        volumeConsumido,
        volumeRestante,
        pctConsumo,
        status
      };
    });
  }, [activeAutex, filteredAutexItems, deductions]);

  // --- Dynamic Filtering & Calculations for "Carregamentos / Logística" ---
  const filteredCarregamentos = useMemo(() => {
    return deductions.filter(d => {
      if (activeAutex && d.autexId !== activeAutex.id) return false;
      if (filterOwner && d.dono.toLowerCase() !== filterOwner.toLowerCase()) return false;
      if (filterEspecie && d.especie.toLowerCase() !== filterEspecie.toLowerCase()) return false;
      if (filterTipo && d.tipoLancamento !== filterTipo) return false;
      if (filterTruck) {
        if (!d.placaCaminhao || d.placaCaminhao.toLowerCase().indexOf(filterTruck.toLowerCase()) === -1) {
          return false;
        }
      }
      return true;
    });
  }, [deductions, activeAutex, filterOwner, filterEspecie, filterTipo, filterTruck]);

  const totalVolDispatched = useMemo(() => {
    return filteredCarregamentos.reduce((sum, d) => sum + d.volume, 0);
  }, [filteredCarregamentos]);

  // Group faturamentos/deductions by truck plate
  const truckSummaryList = useMemo(() => {
    const uniquePlates: string[] = Array.from(new Set<string>(
      filteredCarregamentos
        .map(d => d.placaCaminhao)
        .filter((p): p is string => typeof p === "string" && p !== "")
    ));
    
    // Retrieve registered trucks directory to cross reference driver names if possible
    const savedTrucksRaw = localStorage.getItem("logistica_trucks_directory");
    let registeredFleet: any[] = [];
    if (savedTrucksRaw) {
      try {
        registeredFleet = JSON.parse(savedTrucksRaw);
      } catch (e) {}
    }

    return uniquePlates.map(plate => {
      const cleanPlate = plate.trim().toUpperCase();
      const registered = registeredFleet.find(t => t.placa.trim().toUpperCase() === cleanPlate);
      const truckDeds = filteredCarregamentos.filter(d => d.placaCaminhao?.trim().toUpperCase() === cleanPlate);
      const sumVolume = truckDeds.reduce((sum, d) => sum + d.volume, 0);
      const tripsCount = truckDeds.length;
      
      return {
        plate: cleanPlate,
        modelo: registered?.modelo || "Não Cadastrado",
        motorista: registered?.motorista || "Não Informado",
        capacidade: registered?.capacidadeMaxM3 || 45,
        trips: tripsCount,
        volumeTotal: sumVolume,
        volumeMedio: tripsCount > 0 ? sumVolume / tripsCount : 0
      };
    }).sort((a, b) => b.volumeTotal - a.volumeTotal);
  }, [filteredCarregamentos]);

  // --- Dynamic Filtering & Calculations for "Serraria" ---
  const patioReportLogs = useMemo(() => {
    // 1) received logs (deductions)
    const received: { especie: string; dono: string; volume: number; faturamentoCount: number }[] = [];
    deductions.forEach(ded => {
      const cleanEsp = ded.especie.trim();
      const cleanDono = ded.dono.trim();
      const existing = received.find(
        x => x.especie.toLowerCase().trim() === cleanEsp.toLowerCase().trim() &&
             x.dono.toLowerCase().trim() === cleanDono.toLowerCase().trim()
      );
      if (existing) {
        existing.volume += ded.volume;
        existing.faturamentoCount += 1;
      } else {
        received.push({
          especie: cleanEsp,
          dono: cleanDono,
          volume: ded.volume,
          faturamentoCount: 1
        });
      }
    });

    // 2) processed logs
    const processedMap: Record<string, number> = {};
    sawmillLogs.forEach(log => {
      const key = `${log.especie.toLowerCase().trim()}||${log.dono.toLowerCase().trim()}`;
      processedMap[key] = (processedMap[key] || 0) + log.volumeTora;
    });

    // 3) stock yard representation
    return received.map(item => {
      const key = `${item.especie.toLowerCase().trim()}||${item.dono.toLowerCase().trim()}`;
      const processed = processedMap[key] || 0;
      const saldo = Math.max(0, item.volume - processed);
      return {
        ...item,
        processed,
        saldo
      };
    }).filter(item => {
      if (filterOwner && item.dono.toLowerCase() !== filterOwner.toLowerCase()) return false;
      if (filterEspecie && item.especie.toLowerCase() !== filterEspecie.toLowerCase()) return false;
      return true;
    });
  }, [deductions, sawmillLogs, filterOwner, filterEspecie]);

  const aggregatePatioStockVal = useMemo(() => {
    return patioReportLogs.reduce((sum, item) => sum + item.saldo, 0);
  }, [patioReportLogs]);

  const filteredSawmillLogs = useMemo(() => {
    return sawmillLogs.filter(log => {
      if (filterOwner && log.dono.toLowerCase() !== filterOwner.toLowerCase()) return false;
      if (filterEspecie && log.especie.toLowerCase() !== filterEspecie.toLowerCase()) return false;
      return true;
    });
  }, [sawmillLogs, filterOwner, filterEspecie]);

  const sawmillOverview = useMemo(() => {
    const rawVolumeTora = filteredSawmillLogs.reduce((sum, s) => sum + s.volumeTora, 0);
    const prodVolumeSerrado = filteredSawmillLogs.reduce((sum, s) => sum + s.volumeSerrado, 0);
    const yieldPercentage = rawVolumeTora > 0 ? (prodVolumeSerrado / rawVolumeTora) * 100 : 0;
    return {
      rawVolumeTora,
      prodVolumeSerrado,
      yieldPercentage
    };
  }, [filteredSawmillLogs]);

  const sawmillProductBreakdown = useMemo(() => {
    const productGroups: Record<string, { volumeTora: number; volumeSerrado: number }> = {};
    filteredSawmillLogs.forEach(s => {
      const p = s.produtoSaida || "Serrado bruto";
      if (!productGroups[p]) {
        productGroups[p] = { volumeTora: 0, volumeSerrado: 0 };
      }
      productGroups[p].volumeTora += s.volumeTora;
      productGroups[p].volumeSerrado += s.volumeSerrado;
    });

    return Object.entries(productGroups).map(([product, data]) => {
      const yieldPct = data.volumeTora > 0 ? (data.volumeSerrado / data.volumeTora) * 100 : 0;
      return {
        product,
        volumeSerrado: data.volumeSerrado,
        volumeTora: data.volumeTora,
        yieldPercentage: yieldPct
      };
    }).sort((a, b) => b.volumeSerrado - a.volumeSerrado);
  }, [filteredSawmillLogs]);

  return (
    <div className="space-y-8 animate-fade-in" id="workspace-tab-relatorios">
      {/* Header Menu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-905" />
            <span>Módulo de Relatórios Consolidados</span>
          </h2>
          <p className="text-xs text-slate-550 mt-1">Gere analíticos fiscais de saldo na AUTEX, carregamentos de frotas logísticas e rendimento de desdobro em tempo real.</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm border border-slate-950 no-print"
          id="print-report-btn"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Relatório</span>
        </button>
      </div>

      {/* Subtab Buttons Selector */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px no-print">
        <button
          onClick={() => setReportSubTab("estoque")}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            reportSubTab === "estoque"
              ? "border-emerald-600 text-emerald-900 bg-emerald-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-btn-report-estoque"
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Estoque na AUTEX</span>
        </button>
        <button
          onClick={() => setReportSubTab("carregamentos")}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            reportSubTab === "carregamentos"
              ? "border-emerald-600 text-emerald-900 bg-emerald-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-btn-report-carregamentos"
        >
          <Truck className="w-4 h-4 text-emerald-600" />
          <span>Carregamentos / Logística</span>
        </button>
        <button
          onClick={() => setReportSubTab("serraria")}
          className={`px-5 py-3 text-xs uppercase tracking-wider font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            reportSubTab === "serraria"
              ? "border-emerald-600 text-emerald-900 bg-emerald-50/30"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-btn-report-serraria"
        >
          <Factory className="w-4 h-4 text-emerald-600" />
          <span>Serraria e Rendimento</span>
        </button>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block p-5 border border-slate-300 bg-slate-50 rounded-xl mb-6 text-xs font-mono">
        <h1 className="text-base font-bold text-slate-950 uppercase">RECONCILIAÇÃO CONTABILIDADE FLORESTAL — RELATÓRIO DO SISTEMA</h1>
        <p className="mt-1">AUTEX Vigente: <span className="font-bold">{activeAutex?.numero || "Nenhuma Selecionada"}</span></p>
        <p>Modalidade de Auditoria: {
          reportSubTab === "estoque" ? "Saldo de Cotas na AUTEX" :
          reportSubTab === "carregamentos" ? "Logs de Despacho de Carregamentos Logísticos" :
          "Monitoramento de Rendimento e Processamento de Serraria"
        }</p>
        {filterOwner && <p>Filtro por Titular/Dono: {filterOwner}</p>}
        {filterEspecie && <p>Filtro por Espécie: {filterEspecie}</p>}
        <p className="mt-2 text-slate-400 text-[10px]">Gerado automaticamente em {new Date().toLocaleString()}</p>
      </div>

      {/* Advanced Filter Box (Dynamically formatted) */}
      <div className="bg-white border rounded-2xl border-slate-200 p-5 space-y-4 no-print text-xs shadow-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px] block">Filtros para Consulta de Relatório</span>
          <span className="text-[9px] bg-slate-105 text-slate-600 font-bold px-2 py-0.5 rounded-lg uppercase border border-slate-150">
            {reportSubTab === "estoque" ? "Visualizando Estoque" :
             reportSubTab === "carregamentos" ? "Visualizando Logística" :
             "Visualizando Serraria"}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Filter Owner */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Titular / Proprietário</label>
            <select
              value={filterOwner}
              onChange={(e) => setFilterOwner(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:outline-none font-bold text-xs"
            >
              <option value="">— Todos Proprietários —</option>
              {activeAutex?.detentores.map(det => (
                <option key={det} value={det}>{det}</option>
              ))}
            </select>
          </div>

          {/* Filter Species */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Espécie Florestal</label>
            <select
              value={filterEspecie}
              onChange={(e) => setFilterEspecie(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:outline-none font-bold text-xs"
            >
              <option value="">— Todas as espécies —</option>
              {activeAutex?.items.map(item => (
                <option key={item.id} value={item.especie}>{item.especie}</option>
              ))}
            </select>
          </div>

          {/* Filter Truck Plate (Only shown in shipping) */}
          <div className={reportSubTab === "carregamentos" ? "block" : "hidden animate-fade-in"}>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Filtrar por Placa</label>
            <input
              type="text"
              placeholder="Digite a placa..."
              value={filterTruck}
              onChange={(e) => setFilterTruck(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:outline-none font-semibold font-mono text-xs placeholder-slate-400 capitalize"
            />
          </div>

          {/* Filter Entry Type (Only shown in shipping) */}
          <div className={reportSubTab === "carregamentos" ? "block" : "hidden"}>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Tipo de Lançamento</label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:outline-none font-bold text-xs"
            >
              <option value="">— Todos os tipos —</option>
              <option value="Manual">Abate Manual</option>
              <option value="XML">Xml / NFe Inserida</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(filterOwner || filterTruck || filterEspecie || filterTipo) && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                setFilterOwner("");
                setFilterTruck("");
                setFilterEspecie("");
                setFilterTipo("");
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              <span>Limpar Filtros</span>
            </button>
          </div>
        )}
      </div>

      {/* --- REPORT VIEW 1: ESTOQUE NA AUTEX --- */}
      {reportSubTab === "estoque" && (
        <div className="space-y-6">
          {/* Metrics overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cota de Corte Outorgada</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {totalVolumeAutorizado.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">m³</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Limite global estipulado na AUTEX</span>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Cota Consumida (Expedido)</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-orange-600 font-mono">
                  {totalVolumeExpedido.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-orange-450 font-mono font-bold">m³</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Percentual Usado:</span>
                <span className="text-orange-600 font-bold font-mono">{(totalVolumeAutorizado > 0 ? (totalVolumeExpedido / totalVolumeAutorizado) * 100 : 0).toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Saldo de Volume Restante</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-950 font-mono">
                  {totalSaldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-emerald-450 font-mono font-bold">m³</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1">
                <span>Percentual Livre:</span>
                <span className="text-emerald-700 font-bold font-mono">{(totalVolumeAutorizado > 0 ? (totalSaldoAtual / totalVolumeAutorizado) * 105 : 0).toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-850 uppercase tracking-wider">Situação Jurídico-Fiscal</span>
              <div className="mt-2 flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${
                  totalSaldoAtual <= 0 ? "bg-rose-550" :
                  totalSaldoAtual < totalVolumeAutorizado * 0.20 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                }`}></div>
                <span className="text-sm font-extrabold text-slate-805">
                  {totalSaldoAtual <= 0 ? "EXAURIDA" :
                   totalSaldoAtual < totalVolumeAutorizado * 0.20 ? "ALERTA DE QUOTA" : "REGULAR AUTORIZADO"}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1.5">Balanço fiscal auditado</span>
            </div>
          </div>

          {/* Table Breakdown of stock items */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Demonstrativo Detalhado de Saldo de Pátio Comercial</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Metragem cúbica fiscal disponível por espécie e dono legal na AUTEX ativa.</p>
              </div>
              <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                {autexItemsWithStatus.length} Itens Encontrados
              </span>
            </div>

            {!activeAutex ? (
              <div className="p-12 text-center text-slate-400 italic">
                Nenhuma licença de manejo florestal carregada no momento. Cadastre ou selecione uma AUTEX na barra lateral.
              </div>
            ) : autexItemsWithStatus.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                Nenhum item corresponde aos filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 font-mono">
                      <th className="px-6 py-4">Espécie Regulada</th>
                      <th className="px-6 py-4">Titular Responsável</th>
                      <th className="px-6 py-4 text-right">Vol. Autorizado</th>
                      <th className="px-6 py-4 text-right text-orange-600">Vol. Retirado</th>
                      <th className="px-6 py-4 text-right text-emerald-800 font-bold">Saldo Disponível</th>
                      <th className="px-6 py-4 text-center">Nível Consumido</th>
                      <th className="px-6 py-4 text-center">Alerta de Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {autexItemsWithStatus.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition duration-150">
                        <td className="px-6 py-4 font-bold text-slate-900">{item.especie}</td>
                        <td className="px-6 py-4 font-bold text-slate-600 font-mono text-[11px] truncate max-w-[150px]" title={item.dono}>{item.dono}</td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-slate-700">{item.volumeAutorizado.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-semibold text-orange-600">-{item.volumeConsumido.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-emerald-800">{item.volumeRestante.toFixed(3)} m³</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 w-24 mx-auto">
                            <span className="text-[9px] text-slate-450 font-mono text-center font-bold">{item.pctConsumo.toFixed(1)}%</span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-300 ${
                                item.status === "ESGOTADO" ? "bg-rose-500" :
                                item.status === "CRITICO" ? "bg-amber-500" : "bg-emerald-500"
                              }`} style={{ width: `${Math.min(100, item.pctConsumo)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-2 py-0.5 text-[9px] font-black tracking-wide uppercase rounded-lg ${
                            item.status === "ESGOTADO" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                            item.status === "CRITICO" ? "bg-amber-50 text-amber-800 border border-amber-100" :
                            "bg-emerald-50 text-emerald-800 border border-emerald-100"
                          }`}>
                            {item.status === "ESGOTADO" ? "Zerado" :
                             item.status === "CRITICO" ? "Saldo Crítico" : "Em Estoque"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Grouped by Owner display */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Owner Quotas */}
            <div className="bg-white border rounded-2xl p-5 border-slate-200 md:col-span-7 space-y-4 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-4 h-4 text-emerald-800" /> Consumo Acumulado de Cotas por Titular
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Demonstrativo da proporção individual de cota abatida da licença do plano de manejo.</p>
              </div>

              {volByOwnerList.length === 0 ? (
                <p className="text-xs italic text-slate-400 py-6 text-center">Nenhum faturamento de quota verificado.</p>
              ) : (
                <div className="space-y-4 pt-1">
                  {volByOwnerList.map(row => {
                    const totalAuthorizedForOwner = activeAutex?.items
                      .filter(i => i.dono.toLowerCase().trim() === row.owner.toLowerCase().trim())
                      .reduce((sum, item) => sum + item.volumeAutorizado, 0) || 1;
                    const pctOfAuthorized = (row.volume / totalAuthorizedForOwner) * 100;

                    return (
                      <div key={row.owner} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-800 font-bold">{row.owner}</span>
                          <span className="font-mono text-rose-600 font-bold">-{row.volume.toFixed(3)} m³</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Percentual Usado da Licença de Dono:</span>
                          <span className="font-semibold text-slate-750">{pctOfAuthorized.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, pctOfAuthorized)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Informational Guidelines Card */}
            <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 border text-white border-slate-900 rounded-2xl shadow-sm p-6 md:col-span-5 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest bg-emerald-900/60 border border-emerald-800 px-2.5 py-1 rounded-lg">Auditoria Sisflora / DOF</span>
                <div>
                  <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">AUTEX Protocolada:</p>
                  <span className="text-base font-bold font-mono text-white leading-tight">{activeAutex?.numero || "Pendente de seleção"}</span>
                </div>
                <div>
                  <p className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">Detentores de Lotes:</p>
                  <p className="text-xs text-slate-100 leading-relaxed font-semibold flex flex-wrap gap-1 mt-1">
                    {activeAutex?.detentores.map(det => (
                      <span key={det} className="bg-emerald-900/60 border border-emerald-800/80 px-2 py-0.5 rounded-md text-[10px] font-mono">{det}</span>
                    )) || "Não cadastrado"}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-emerald-800/40 text-[10px] text-emerald-200/90 leading-relaxed font-sans">
                O acompanhamento do volume disponível evita o surgimento de faturamentos bloqueados (Glosa de DOF ou divergência fiscal em barreira de divisa).
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REPORT VIEW 2: CARREGAMENTOS / LOGÍSTICA --- */}
      {reportSubTab === "carregamentos" && (
        <div className="space-y-6">
          {/* Logistics KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Cargas de Madeira</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {filteredCarregamentos.length}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">Viagens</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Despacho de caminhão na AUTEX</span>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Total Fiscal Despachado</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-650 font-mono">
                  {totalVolDispatched.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-rose-400 font-mono font-bold">m³</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Volume que saiu fisicamente da frota</span>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-emerald-850 uppercase tracking-wider">Média de Carga Física</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-950 font-mono">
                  {(filteredCarregamentos.length > 0 ? totalVolDispatched / filteredCarregamentos.length : 0).toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-emerald-450 font-mono font-bold">m³/viagem</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Média volumétrica por veículo</span>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Veículos Utilizados</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {truckSummaryList.length}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">Placas</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Frota atuante monitorada</span>
            </div>
          </div>

          {/* Table representing fleet usage statistics */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Desempenho de Carga e Transporte por Veículo</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Associação de motoristas e faturamento físico focado no acompanhamento de logística.</p>
              </div>
              <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-650 px-2.5 py-1 rounded-md">
                {truckSummaryList.length} Transportadores Monitorados
              </span>
            </div>

            {truckSummaryList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic animate-fade-in">
                Nenhum carregamento faturado rastreado para os filtros especificados. Cadastre veículos no painel de Logística.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 font-mono">
                      <th className="px-6 py-4">Placa Identificadora</th>
                      <th className="px-6 py-4">Equipamento / Modelo</th>
                      <th className="px-6 py-4">Operador do Caminhão</th>
                      <th className="px-6 py-4 text-center">Faturamentos (Viagens)</th>
                      <th className="px-6 py-4 text-right">Volume Transportado</th>
                      <th className="px-6 py-4 text-right">Volume Médio / Frete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {truckSummaryList.map(row => (
                      <tr key={row.plate} className="hover:bg-slate-50/40 transition duration-150">
                        <td className="px-6 py-4"><span className="font-mono font-bold bg-slate-105 text-slate-755 border border-slate-200 px-2.5 py-1 rounded-lg uppercase">{row.plate}</span></td>
                        <td className="px-6 py-4 font-bold text-slate-800">{row.modelo}</td>
                        <td className="px-6 py-4 text-slate-600 font-semibold">{row.motorista}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-slate-800">{row.trips}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-rose-650">-{row.volumeTotal.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-800">{row.volumeMedio.toFixed(3)} m³</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* In depth audited list */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">Histórico de Abatimentos de Transporte (Espelho Fiscal)</h3>
                <p className="text-[10px] text-slate-400 mt-1">Lançamentos de carga liquida debitados no acompanhamento fiscal da AUTEX.</p>
              </div>
              <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-650 px-2.5 py-1 rounded-md">
                {filteredCarregamentos.length} Viagens Verificadas
              </span>
            </div>

            {filteredCarregamentos.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                Nenhum carregamento corresponde aos filtros atuais. Ajuste-os nos campos de busca.
              </div>
            ) : (
              <div className="overflow-x-auto font-sans">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-450 uppercase tracking-wider font-mono">
                      <th className="px-6 py-4">Nota Fiscal / Emissão</th>
                      <th className="px-6 py-4">Lançamento de Registro</th>
                      <th className="px-6 py-4">Veículo Transportador</th>
                      <th className="px-6 py-4">Proprietário da Carga</th>
                      <th className="px-6 py-4">Espécie Transportada</th>
                      <th className="px-6 py-4 text-right font-bold">Volume Despachado</th>
                      <th className="px-6 py-4 text-center no-print">Ferramentas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredCarregamentos.map((ded) => (
                      <tr key={ded.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                          NFe #{ded.numeroNfe}
                          <span className="block text-[9px] text-slate-450 font-mono font-medium mt-0.5">{ded.dataEmissao}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-550 font-mono text-[11px]">
                          <span className="capitalize font-bold text-slate-650">{ded.tipoLancamento}</span>
                          <span className="block text-[9px] text-slate-400 truncate max-w-[120px]" title={ded.xmlFileName}>{ded.xmlFileName || "Digitação Manual"}</span>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">
                          {ded.placaCaminhao ? <span className="uppercase">{ded.placaCaminhao}</span> : "Não Declarado"}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-700">{ded.dono}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{ded.especie}</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-rose-605">
                          -{ded.volume.toFixed(3)} m³
                        </td>
                        <td className="px-6 py-4 text-center no-print">
                          <button
                            onClick={() => onDeleteDeduction(ded.id, ded.numeroNfe)}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- REPORT VIEW 3: RENDIMENTO DE SERRARIA --- */}
      {reportSubTab === "serraria" && (
        <div className="space-y-6">
          {/* Sawmill performance KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matéria-Prima Processada (Toras)</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {sawmillOverview.rawVolumeTora.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">m³</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Toras brutas do pátio submetidas a corte</span>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Volume de Madeira Serrada</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {sawmillOverview.prodVolumeSerrado.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-emerald-450 font-mono font-bold">m³</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-medium block mt-1">Soma de peças acabadas obtidas</span>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider font-bold">Rendimento Operacional</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-900 font-mono">
                  {sawmillOverview.yieldPercentage.toFixed(1)}%
                </span>
                <span className="text-[10px] text-blue-500 font-mono font-bold">Rendimento</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${Math.min(100, sawmillOverview.yieldPercentage)}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">Logs Armazenadas no Pátio</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-850 font-mono">
                  {aggregatePatioStockVal.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">m³</span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-1">Saldo restante em pátio de desdobro</span>
            </div>
          </div>

          {/* Stock Patio representation tables */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Acompanhamento e Inventário Base do Pátio de Toras</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Saldo disponível para corte, derivado do volume recebido de campo deduzido do histórico de processamento.</p>
              </div>
              <span className="font-mono text-[9px] font-bold bg-slate-100 text-slate-650 px-2.5 py-1 rounded-md">
                {patioReportLogs.length} Lotes Diferenciados
              </span>
            </div>

            {patioReportLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                Nenhuma madeira em tora localizada no pátio para os filtros vigentes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 font-mono">
                      <th className="px-6 py-4">Espécie</th>
                      <th className="px-6 py-4">Titular de Operação</th>
                      <th className="px-6 py-4 text-right">Vol. Recebido na Fábrica</th>
                      <th className="px-6 py-4 text-right">Vol. Desdobrado (Tora)</th>
                      <th className="px-6 py-4 text-right text-emerald-800 font-bold">Saldo Sobressalente em Pátio</th>
                      <th className="px-6 py-4 text-center">Nível de Industrialização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {patioReportLogs.map((item, index) => {
                      const totalReceived = item.volume || 1;
                      const conversionPct = (item.processed / totalReceived) * 100;
                      return (
                        <tr key={index} className="hover:bg-slate-50/40 transition duration-150 font-medium">
                          <td className="px-6 py-4 font-bold text-slate-900">{item.especie}</td>
                          <td className="px-6 py-4 font-semibold text-slate-600 font-mono text-[11px] truncate max-w-[150px]">{item.dono}</td>
                          <td className="px-6 py-4 text-right font-mono font-semibold text-slate-700">{item.volume.toFixed(3)} m³</td>
                          <td className="px-6 py-4 text-right font-mono font-semibold text-slate-450">-{item.processed.toFixed(3)} m³</td>
                          <td className="px-6 py-4 text-right font-mono font-black text-emerald-800">{item.saldo.toFixed(3)} m³</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1 w-24 mx-auto">
                              <span className="text-[9px] text-slate-450 font-mono text-center font-bold">{conversionPct.toFixed(1)}% cortado</span>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-500 transition-all duration-300" style={{ width: `${Math.min(100, conversionPct)}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Breakdown output design */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* Sawn outputs distribution list */}
            <div className="bg-white border text-slate-900 rounded-2xl border-slate-200 p-5 md:col-span-7 space-y-4 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-800" /> Rendimento do Desdobro por Família de Peça
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Associa o volume final serrado obtido e o rendimento (%) para cada categoria de corte.</p>
              </div>

              {sawmillProductBreakdown.length === 0 ? (
                <p className="text-xs italic text-slate-400 py-6 text-center animate-fade-in">Não há histórico de desdobros cadastrados.</p>
              ) : (
                <div className="space-y-4 pt-1">
                  {sawmillProductBreakdown.map(row => {
                    const pctShare = sawmillOverview.prodVolumeSerrado > 0 ? (row.volumeSerrado / sawmillOverview.prodVolumeSerrado) * 100 : 0;
                    return (
                      <div key={row.product} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-850 font-bold">{row.product}</span>
                          <span className="font-mono text-emerald-700 font-bold">{row.volumeSerrado.toFixed(3)} m³ <span className="text-slate-400 text-[9px]">({pctShare.toFixed(1)}%)</span></span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Eficiência de Conversão:</span>
                          <span className="font-semibold text-blue-700 font-mono">{row.yieldPercentage.toFixed(1)}% yield</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${Math.min(100, row.yieldPercentage)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Industrial Efficiency guideline */}
            <div className="bg-slate-900 border text-white border-slate-950 rounded-2xl shadow-sm p-5 md:col-span-5 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#fbc116] bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg uppercase font-mono inline-block">Métrica de Conversão Industrial</span>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Rendimento Geral de Conversão:</p>
                  <span className="text-2xl font-mono font-black text-emerald-400">{sawmillOverview.yieldPercentage.toFixed(2)}%</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-sans pt-1">
                  Medição de desempenho geral da linha de serra fita e multilâmicas. Um rendimento acima de 40% é considerado bem-sucedido na indústria madeireira.
                </p>
                <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl space-y-1 text-[11px] leading-snug">
                  <span className="font-bold text-slate-200">Ref. CONAMA/IBAMA:</span>
                  <p className="text-slate-450">Fator de Rendimento Requerido: <span className="font-mono font-bold text-slate-200">35.0%</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Historical detailed table log */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-750 tracking-wider">Histórico de Linha de Produção de Serraria</h3>
                <p className="text-[10px] text-slate-400 mt-1">Lista completa de lotes processados, peças fabricadas e rendimento mensurado.</p>
              </div>
              <span className="font-mono text-[9px] font-bold bg-slate-200/85 text-slate-700 px-2 py-1 rounded-lg">
                {filteredSawmillLogs.length} Entradas Auditadas
              </span>
            </div>

            {filteredSawmillLogs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 italic">
                O arquivo de processamento histórico encontra-se vazio sob as seleções vigentes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-450 uppercase tracking-wider font-mono">
                      <th className="px-6 py-4">Lote / Registro</th>
                      <th className="px-6 py-4 font-sans">Proprietário</th>
                      <th className="px-6 py-4">Espécie Desdobrada</th>
                      <th className="px-6 py-4 text-center">Produto de Saída</th>
                      <th className="px-6 py-4 text-right">M.P. Tora</th>
                      <th className="px-6 py-4 text-right text-emerald-800">Acabado Serrado</th>
                      <th className="px-6 py-4 text-right text-blue-700 font-bold">Rendimento Obtido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredSawmillLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition duration-150">
                        <td className="px-6 py-4 font-mono font-bold text-slate-900">
                          REG #{log.id.slice(-6).toUpperCase()}
                          <span className="block text-[9px] text-slate-450 font-mono mt-0.5">{log.dataProcessamento}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-650 font-mono text-[11px] truncate max-w-[130px]">{log.dono}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{log.especie}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-105 text-slate-755 border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-sans">{log.produtoSaida || "Serrado bruto"}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-550">{log.volumeTora.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-800 font-black">+{log.volumeSerrado.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-blue-700">{log.rendimento.toFixed(1)}% yield</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
