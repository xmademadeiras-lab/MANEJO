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
  Activity,
  Filter,
  Percent,
  ClipboardCheck,
  Search,
  Building2,
  FileText,
  ShieldCheck,
  BadgeAlert,
  ArrowRight,
  Hammer,
  Box,
  Trash2
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100/80 shadow-xs">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">
                Módulo de Relatórios Consolidados
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Analíticos fiscais de saldo, carregamentos de frotas e rendimentos de desdobro.</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-slate-900/10 border border-slate-950 no-print"
          id="print-report-btn"
        >
          <Printer className="w-4 h-4 text-emerald-450" />
          <span>Imprimir Relatório</span>
        </button>
      </div>

      {/* Subtab Buttons Selector / Premium Visual Rail */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px no-print">
        <button
          onClick={() => setReportSubTab("estoque")}
          className={`px-5 py-3.5 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            reportSubTab === "estoque"
              ? "border-emerald-600 text-emerald-900 bg-emerald-50/20 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-btn-report-estoque"
        >
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Estoque na AUTEX</span>
        </button>
        <button
          onClick={() => setReportSubTab("carregamentos")}
          className={`px-5 py-3.5 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            reportSubTab === "carregamentos"
              ? "border-emerald-600 text-emerald-900 bg-emerald-50/20 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-btn-report-carregamentos"
        >
          <Truck className="w-4 h-4 text-emerald-600" />
          <span>Carregamentos & Logística</span>
        </button>
        <button
          onClick={() => setReportSubTab("serraria")}
          className={`px-5 py-3.5 text-xs uppercase tracking-wider font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            reportSubTab === "serraria"
              ? "border-emerald-600 text-emerald-900 bg-emerald-50/20 font-black"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
          id="tab-btn-report-serraria"
        >
          <Factory className="w-4 h-4 text-emerald-600" />
          <span>Serraria e Rendimento</span>
        </button>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block p-6 border-2 border-slate-300 bg-slate-50 rounded-2xl mb-8 text-xs font-mono">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-base font-black text-slate-950 uppercase tracking-tight">XMADE MADEIRAS LTDA</h1>
            <p className="text-[10px] text-slate-700 font-bold">RECONCILIAÇÃO CONTABILIDADE FLORESTAL — RELATÓRIO OFICIAL</p>
          </div>
          <span className="text-[10px] bg-slate-900 text-white px-2 py-1 font-bold rounded">SISTEMA INTEGRADO</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-1.5 pt-4 border-t border-slate-200">
          <p>AUTEX Vigente: <span className="font-bold text-slate-900">{activeAutex?.numero || "Nenhuma Selecionada"}</span></p>
          <p>Modalidade: <span className="font-bold text-slate-900">{
            reportSubTab === "estoque" ? "Saldo de Cotas na AUTEX" :
            reportSubTab === "carregamentos" ? "Logs de Despacho Logístico" :
            "Monitoramento de Rendimento de Serraria"
          }</span></p>
          {filterOwner && <p>Filtro por Titular/Dono: <span className="font-bold text-slate-900">{filterOwner}</span></p>}
          {filterEspecie && <p>Filtro por Espécie: <span className="font-bold text-slate-900">{filterEspecie}</span></p>}
          <p>Data de Emissão: <span className="font-bold text-slate-900">{new Date().toLocaleString("pt-BR")}</span></p>
        </div>
      </div>

      {/* Advanced Filter Box (Premium Styling) */}
      <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200/80 rounded-2xl p-6 no-print text-xs shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px]">Filtros de Auditoria em Tempo Real</span>
          </div>
          <span className="text-[9px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-lg uppercase border border-emerald-100/50">
            {reportSubTab === "estoque" ? "Mapeamento de Saldo" :
             reportSubTab === "carregamentos" ? "Consumo Logístico" :
             "Eficiência de Conversão"}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Filter Owner */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Titular / Proprietário</label>
            <div className="relative">
              <select
                value={filterOwner}
                onChange={(e) => setFilterOwner(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/15 focus:outline-none focus:border-emerald-600 transition font-bold text-xs cursor-pointer appearance-none"
              >
                <option value="">— Todos Proprietários —</option>
                {activeAutex?.detentores.map(det => (
                  <option key={det} value={det}>{det}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-405">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Filter Species */}
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Espécie Florestal</label>
            <div className="relative">
              <select
                value={filterEspecie}
                onChange={(e) => setFilterEspecie(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/15 focus:outline-none focus:border-emerald-600 transition font-bold text-xs cursor-pointer appearance-none"
              >
                <option value="">— Todas as espécies —</option>
                {activeAutex?.items.map(item => (
                  <option key={item.id} value={item.especie}>{item.especie}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-405">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          {/* Filter Truck Plate (Only shown in shipping) */}
          <div className={reportSubTab === "carregamentos" ? "block" : "hidden"}>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Filtrar por Placa</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Busca por placa..."
                value={filterTruck}
                onChange={(e) => setFilterTruck(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/15 focus:outline-none focus:border-emerald-600 transition font-mono font-bold text-xs placeholder-slate-400 capitalize"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 select-none">
                <Search className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Filter Entry Type (Only shown in shipping) */}
          <div className={reportSubTab === "carregamentos" ? "block" : "hidden"}>
            <label className="block text-[9px] font-bold uppercase text-slate-450 mb-1.5">Tipo de Lançamento</label>
            <div className="relative">
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500/15 focus:outline-none focus:border-emerald-600 transition font-bold text-xs cursor-pointer appearance-none"
              >
                <option value="">— Todos os tipos —</option>
                <option value="Manual">Abate Manual</option>
                <option value="XML">Xml / NFe Inserida</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-405">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Clear Filters */}
        {(filterOwner || filterTruck || filterEspecie || filterTipo) && (
          <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                setFilterOwner("");
                setFilterTruck("");
                setFilterEspecie("");
                setFilterTipo("");
              }}
              className="text-[10px] text-rose-600 hover:text-rose-750 font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar Filtros Selecionados</span>
            </button>
          </div>
        )}
      </div>

      {/* --- REPORT VIEW 1: ESTOQUE NA AUTEX --- */}
      {reportSubTab === "estoque" && (
        <div className="space-y-6">
          {/* Metrics overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-400"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cota Outorgada AUTEX</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {totalVolumeAutorizado.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold">m³</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-semibold">Limite Global Licenciado</span>
                <ClipboardCheck className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Volume Retirado (Abatido)</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-600 font-mono tracking-tight">
                  {totalVolumeExpedido.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-amber-500 font-mono font-bold">m³</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Relação de Consumo:</span>
                <span className="text-amber-600 font-extrabold font-mono text-[11px]">
                  {(totalVolumeAutorizado > 0 ? (totalVolumeExpedido / totalVolumeAutorizado) * 100 : 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600"></div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Cota de Saldo Disponível</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
                  {totalSaldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-emerald-650 font-mono font-bold">m³</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Percentual Remanescente:</span>
                <span className="text-emerald-700 font-extrabold font-mono text-[11px]">
                  {(totalVolumeAutorizado > 0 ? (totalSaldoAtual / totalVolumeAutorizado) * 100 : 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              {totalSaldoAtual <= 0 ? (
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-600"></div>
              ) : totalSaldoAtual < totalVolumeAutorizado * 0.20 ? (
                <div className="absolute top-0 left-0 w-full h-1 bg-rose-500 animate-pulse"></div>
              ) : (
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-450"></div>
              )}
              <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">Status Fiel Depositário</span>
              <div className="mt-3 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  totalSaldoAtual <= 0 ? "bg-rose-600" :
                  totalSaldoAtual < totalVolumeAutorizado * 0.20 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                }`}></div>
                <span className="text-xs font-extrabold text-slate-800 tracking-tight uppercase">
                  {totalSaldoAtual <= 0 ? "COTA EXAURIDA" :
                   totalSaldoAtual < totalVolumeAutorizado * 0.20 ? "ATENÇÃO CRÍTICA" : "OPERAÇÃO LIBERADA"}
                </span>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[9px] text-slate-450">
                Análise de conformidade florestal
              </div>
            </div>
          </div>

          {/* Table Breakdown of stock items (Spreadsheet Design) */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200/80 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-emerald-600 rounded"></span>
                  Demonstrativo Consolidado de Saldo por Espécie Florestal
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Metragem cúbica fiscal disponível por espécie e seu detentor legal na AUTEX selecionada.</p>
              </div>
              <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-200/60 text-slate-600 px-2.5 py-1 rounded-lg">
                {autexItemsWithStatus.length} Matrizes Reguladas
              </span>
            </div>

            {!activeAutex ? (
              <div className="p-16 text-center text-slate-400 italic">
                Nenhuma licença de manejo florestal carregada no momento. Cadastre ou selecione uma AUTEX na barra lateral de navegação.
              </div>
            ) : autexItemsWithStatus.length === 0 ? (
              <div className="p-16 text-center text-slate-400 italic">
                Nenhuma cota corresponde aos filtros operacionais selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 font-mono">
                      <th className="px-6 py-4">Espécie Regulada</th>
                      <th className="px-6 py-4">Titular Responsável</th>
                      <th className="px-6 py-4 text-right">Vol. Autorizado</th>
                      <th className="px-6 py-4 text-right text-amber-600">Vol. Retirado</th>
                      <th className="px-6 py-4 text-right text-emerald-800 font-bold">Saldo Disponível</th>
                      <th className="px-6 py-4 text-center">Nível Consumido</th>
                      <th className="px-6 py-4 text-center">Auditoria de Risco</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {autexItemsWithStatus.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40 transition duration-150">
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-900 block">{item.especie}</span>
                          <span className="text-[9px] text-slate-400 font-mono font-medium tracking-wide">ID: {item.id.slice(0, 8).toUpperCase()}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-slate-600 font-mono truncate max-w-[150px]" title={item.dono}>{item.dono}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-800">{item.volumeAutorizado.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-amber-600">-{item.volumeConsumido.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/5">{item.volumeRestante.toFixed(3)} m³</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5 w-32 mx-auto">
                            <span className="text-[10px] text-slate-500 font-mono font-bold min-w-[32px] text-right">{item.pctConsumo.toFixed(1)}%</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${
                                item.status === "ESGOTADO" ? "bg-rose-500" :
                                item.status === "CRITICO" ? "bg-amber-500" : "bg-emerald-500"
                              }`} style={{ width: `${Math.min(100, item.pctConsumo)}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center gap-1 px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded-full ${
                            item.status === "ESGOTADO" ? "bg-rose-50 text-rose-700 border border-rose-150" :
                            item.status === "CRITICO" ? "bg-amber-50 text-amber-800 border border-amber-150" :
                            "bg-emerald-50 text-emerald-850 border border-emerald-150"
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${
                              item.status === "ESGOTADO" ? "bg-rose-550" :
                              item.status === "CRITICO" ? "bg-amber-550" : "bg-emerald-550"
                            }`}></span>
                            {item.status === "ESGOTADO" ? "Zerado" :
                             item.status === "CRITICO" ? "Critico" : "Estável"}
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
            <div className="bg-white border rounded-2xl p-6 border-slate-200/80 md:col-span-7 space-y-4 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-10s pb-2 mb-2">
                  <Clock className="w-4 h-4 text-emerald-700" /> 
                  Consumo Acumulado de Cotas por Titular de Manejo
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Mapeamento percentual de volume expedido do plano de corte individual por contratante.</p>
              </div>

              {volByOwnerList.length === 0 ? (
                <p className="text-xs italic text-slate-400 py-10 text-center">Nenhum faturamento de quota florestal verificado na AUTEX ativa.</p>
              ) : (
                <div className="space-y-5 pt-2">
                  {volByOwnerList.map(row => {
                    const totalAuthorizedForOwner = activeAutex?.items
                      .filter(i => i.dono.toLowerCase().trim() === row.owner.toLowerCase().trim())
                      .reduce((sum, item) => sum + item.volumeAutorizado, 0) || 1;
                    const pctOfAuthorized = (row.volume / totalAuthorizedForOwner) * 100;

                    return (
                      <div key={row.owner} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50/50 transition">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-800 font-extrabold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            {row.owner}
                          </span>
                          <span className="font-mono text-rose-600 font-black">-{row.volume.toFixed(3)} m³</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                          <span>Percentual Total Utilizado:</span>
                          <span className="font-bold text-slate-700 font-mono">{pctOfAuthorized.toFixed(2)}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, pctOfAuthorized)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Informational Guidelines Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border text-white border-slate-950 rounded-2xl shadow-sm p-6 md:col-span-5 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest bg-emerald-950/80 border border-emerald-900/30 px-2.5 py-1 rounded-lg">Auditoria Sisflora / DOF</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">AUTEX Protocolada:</p>
                  <span className="text-sm font-bold font-mono text-white leading-tight block mt-1 tracking-wider">{activeAutex?.numero || "Pendente de seleção"}</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Detentores Associados:</p>
                  <p className="text-xs text-slate-200 mt-2 flex flex-wrap gap-1.5">
                    {activeAutex?.detentores.map(det => (
                      <span key={det} className="bg-white/10 hover:bg-white/15 cursor-default transition border border-white/5 px-2 py-1 rounded-md text-[9px] font-mono font-bold">{det}</span>
                    )) || "Não cadastrado"}
                  </p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed font-sans mt-5">
                O acompanhamento periódico da AUTEX evita faturamentos bloqueados ou impedimentos no DOF em portarias nacionais de divisa territorial.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- REPORT VIEW 2: CARREGAMENTOS / LOGÍSTICA --- */}
      {reportSubTab === "carregamentos" && (
        <div className="space-y-6">
          {/* Logistics KPIs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-400"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Despachos</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {filteredCarregamentos.length}
                </span>
                <span className="text-xs text-slate-500 font-bold font-sans">Viagens</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-semibold">Faturamentos Registrados</span>
                <Truck className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500"></div>
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Volume Total Expedido</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-rose-600 font-mono tracking-tight">
                  {totalVolDispatched.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-rose-500 font-mono font-bold">m³</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Retirada Física no Pátio</span>
                <Layers className="w-4 h-4 text-rose-450" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600"></div>
              <span className="text-[10px] font-bold text-emerald-850 uppercase tracking-wider block">Média de Carga Útil</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-950 font-mono tracking-tight">
                  {(filteredCarregamentos.length > 0 ? totalVolDispatched / filteredCarregamentos.length : 0).toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-emerald-655 font-mono font-bold">m³/frete</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Cubagem média por veículo</span>
                <Activity className="w-4 h-4 text-emerald-505" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Frota Ativa Reconciliada</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-900 font-mono tracking-tight">
                  {truckSummaryList.length}
                </span>
                <span className="text-xs text-blue-500 font-sans font-bold">Placas</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Rastros de expedição</span>
                <ShieldCheck className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Table representing fleet usage statistics */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200/80 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-blue-600 rounded"></span>
                  Desempenho Logístico e Volumétrico por Veículo
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Associação de condutores cadastrados e histórico consolidado de faturamento físico por placa.</p>
              </div>
              <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-200/60 text-slate-600 px-2.5 py-1 rounded-lg">
                {truckSummaryList.length} Transportadores Monitorados
              </span>
            </div>

            {truckSummaryList.length === 0 ? (
              <div className="p-16 text-center text-slate-400 italic">
                Nenhum veículo com histórico de carregamento localizado para os filtros vigentes. Cadastre ou vincule veículos no painel de Logística.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 font-mono">
                      <th className="px-6 py-4">Placa Identificadora</th>
                      <th className="px-6 py-4">Equipamento / Modelo</th>
                      <th className="px-6 py-4">Operador Responsável (Motorista)</th>
                      <th className="px-6 py-4 text-center">Faturamentos (Viagens)</th>
                      <th className="px-6 py-4 text-right">Volume Total Escoado</th>
                      <th className="px-6 py-4 text-right">Média por Viagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-705">
                    {truckSummaryList.map(row => (
                      <tr key={row.plate} className="hover:bg-slate-50/40 transition duration-150">
                        <td className="px-6 py-4">
                          <span className="font-mono font-black bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 rounded-lg uppercase tracking-wider text-[11px] shadow-2xs">
                            {row.plate}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">{row.modelo}</td>
                        <td className="px-6 py-4 text-slate-500 italic font-medium">{row.motorista}</td>
                        <td className="px-6 py-4 text-center font-mono font-extrabold text-slate-900 bg-slate-50/30">{row.trips} fx</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-rose-600 bg-rose-50/5">-{row.volumeTotal.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-extrabold text-emerald-800">{row.volumeMedio.toFixed(3)} m³</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* In depth audited list (Espelho Fiscal Table) */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200/80 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-rose-500 rounded"></span>
                  Espelho Fiscal de Registro de Cargas & Abatimentos autorizados
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Espelho auditado de debitamento bruto de cota de maneio via NFe ou lançamento manual do sistema.</p>
              </div>
              <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-200/60 text-slate-650 px-2.5 py-1 rounded-lg">
                {filteredCarregamentos.length} Lançamentos Auditados
              </span>
            </div>

            {filteredCarregamentos.length === 0 ? (
              <div className="p-16 text-center text-slate-400 italic">
                Nenhum demonstrativo de carregamento corresponde aos filtros atuais. Ajuste-os no painel superior.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <th className="px-6 py-4">Faturamento / Emissão</th>
                      <th className="px-6 py-4">Modalidade de Registro</th>
                      <th className="px-6 py-4">Veículo Transportador</th>
                      <th className="px-6 py-4">Proprietário da Carga</th>
                      <th className="px-6 py-4">Espécie Transportada</th>
                      <th className="px-6 py-4 text-right font-bold">Volume Líquido</th>
                      <th className="px-6 py-4 text-center no-print">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-semibold">
                    {filteredCarregamentos.map((ded) => (
                      <tr key={ded.id} className="hover:bg-slate-50/40 transition duration-150">
                        <td className="px-6 py-4">
                          <div className="font-mono font-black text-slate-900">
                            NFe #{ded.numeroNfe}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-350" />
                            {ded.dataEmissao}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase rounded-md border ${
                            ded.tipoLancamento === "XML" 
                              ? "bg-blue-50 text-blue-700 border-blue-150" 
                              : "bg-slate-50 text-slate-700 border-slate-150"
                          }`}>
                            <FileText className="w-3 h-3" />
                            {ded.tipoLancamento === "XML" ? "XML / IMPORTADO" : "MANUAL"}
                          </span>
                          {ded.xmlFileName && (
                            <span className="block text-[9px] font-mono text-slate-400 font-medium truncate max-w-[130px] mt-1" title={ded.xmlFileName}>
                              XML: {ded.xmlFileName}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-150">
                            {ded.placaCaminhao ? ded.placaCaminhao.toUpperCase() : "Não Declarada"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-650">{ded.dono}</td>
                        <td className="px-6 py-4 font-extrabold text-slate-800">{ded.especie}</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-rose-600 bg-rose-50/5">
                          -{ded.volume.toFixed(3)} m³
                        </td>
                        <td className="px-6 py-4 text-center no-print">
                          <button
                            onClick={() => onDeleteDeduction(ded.id, ded.numeroNfe)}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-extrabold hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
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
        <div className="space-y-6 animate-fade-in">
          {/* Sawmill performance KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Matéria-Prima Processada</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {sawmillOverview.rawVolumeTora.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-slate-500 font-mono font-bold">m³</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Toras Desdobradas (Patas e Pontas)</span>
                <Hammer className="w-4 h-4 text-amber-500" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-650"></div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Volume Final Serrado</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
                  {sawmillOverview.prodVolumeSerrado.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-emerald-600 font-mono font-bold">m³</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Peças Acabadas de Alta Performance</span>
                <Layers className="w-4 h-4 text-emerald-500" />
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-650"></div>
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Rendimento Industrial</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-blue-900 font-mono tracking-tight">
                  {sawmillOverview.yieldPercentage.toFixed(1)}%
                </span>
                <span className="text-xs text-blue-500 font-sans font-bold">Eficiência</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-3">
                <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${Math.min(100, sawmillOverview.yieldPercentage)}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-xs relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 left-0 w-full h-1 bg-slate-900"></div>
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wider block">Volume em Pátio (Logs)</span>
              <div className="mt-2.5 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-850 font-mono tracking-tight">
                  {aggregatePatioStockVal.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                </span>
                <span className="text-xs text-slate-500 font-mono font-bold">m³</span>
              </div>
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span>Saldo físico estocado</span>
                <Box className="w-4 h-4 text-slate-605" />
              </div>
            </div>
          </div>

          {/* Stock Patio representation tables */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200/80 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-amber-500 rounded"></span>
                  Inventário Físico do Pátio de Toras (Saldo Ativo)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Cubagem restante em pátio de desdobro secundário, atualizado conforme faturamentos e cortes.</p>
              </div>
              <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-200/60 text-slate-600 px-2.5 py-1 rounded-lg">
                {patioReportLogs.length} Lotes Reconhecidos
              </span>
            </div>

            {patioReportLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400 italic">
                Nenhum saldo físico localizado no pátio para o filtro especificado.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 font-mono">
                      <th className="px-6 py-4">Essência Florestal</th>
                      <th className="px-6 py-4">Titular Responsável</th>
                      <th className="px-6 py-4 text-right">Vol. Recebido (Bruto)</th>
                      <th className="px-6 py-4 text-right">Vol. Desdobrado</th>
                      <th className="px-6 py-4 text-right text-emerald-800 font-extrabold">Saldo Líquido em Pátio</th>
                      <th className="px-6 py-4 text-center">Nível de Industrialização</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-705">
                    {patioReportLogs.map((item, index) => {
                      const totalReceived = item.volume || 1;
                      const conversionPct = (item.processed / totalReceived) * 100;
                      return (
                        <tr key={index} className="hover:bg-slate-50/40 transition duration-150">
                          <td className="px-6 py-4 font-black text-slate-900 uppercase tracking-tight">{item.especie}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-bold text-slate-600 font-mono truncate max-w-[150px]" title={item.dono}>{item.dono}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{item.volume.toFixed(3)} m³</td>
                          <td className="px-6 py-4 text-right font-mono font-semibold text-rose-500 bg-rose-50/5">-{item.processed.toFixed(3)} m³</td>
                          <td className="px-6 py-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/10">{item.saldo.toFixed(3)} m³</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5 w-32 mx-auto">
                              <span className="text-[10px] text-slate-500 font-mono font-bold min-w-[32px] text-right">{conversionPct.toFixed(1)}%</span>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-650 transition-all duration-300" style={{ width: `${Math.min(100, conversionPct)}%` }}></div>
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
            <div className="bg-white border text-slate-900 rounded-2xl border-slate-200/80 p-6 md:col-span-7 space-y-4 shadow-xs">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                  <Percent className="w-4 h-4 text-emerald-700" /> Rendimento do Desdobro por Tipologia de Peça
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Associação volumétrica específica e rendimento médio nominal por família de produto processada.</p>
              </div>

              {sawmillProductBreakdown.length === 0 ? (
                <p className="text-xs italic text-slate-400 py-12 text-center">Nenhum faturamento de desdobro de serraria foi computado.</p>
              ) : (
                <div className="space-y-5 pt-2">
                  {sawmillProductBreakdown.map(row => {
                    const pctShare = sawmillOverview.prodVolumeSerrado > 0 ? (row.volumeSerrado / sawmillOverview.prodVolumeSerrado) * 100 : 0;
                    return (
                      <div key={row.product} className="space-y-1.5 p-3 rounded-xl hover:bg-slate-50/50 transition">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-800 font-extrabold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-650"></span>
                            {row.product}
                          </span>
                          <span className="font-mono text-emerald-700 font-bold">
                            {row.volumeSerrado.toFixed(3)} m³ 
                            <span className="text-slate-400 text-[9px] font-medium ml-1">({pctShare.toFixed(1)}% do total)</span>
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Eficiência Nominal (Yield):</span>
                          <span className="font-bold text-blue-700 font-mono">{row.yieldPercentage.toFixed(1)}%</span>
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
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border text-white border-slate-950 rounded-2xl shadow-sm p-6 md:col-span-5 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-[#fbc116] uppercase tracking-widest bg-amber-955/80 border border-amber-900/30 px-2.5 py-1 rounded-lg">Performance Industrial</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Rendimento Médio Geral (Conversão):</p>
                  <span className="text-3xl font-mono font-black text-emerald-400 leading-none block mt-1.5">{sawmillOverview.yieldPercentage.toFixed(2)}%</span>
                </div>
                <p className="text-xs text-slate-350 leading-relaxed font-sans">
                  A produtividade acima de 40% é considerada benchmark global para serrarias verticais de madeiras tropicais nativas da Amazônia.
                </p>
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1.5 text-[10px] leading-relaxed">
                  <span className="font-bold text-slate-300 uppercase block tracking-wider text-[9px]">Instrução Normativa IBAMA</span>
                  <p className="text-slate-400">O rendimento mínimo padrão exigido para o desdobro de toras de serraria nativa é de <span className="font-mono font-black text-white bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">35%</span>.</p>
                </div>
              </div>
              <div className="pt-5 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed font-sans mt-5">
                Rendimento abaixo do limite do DOF requer recalibração imediata nas serras fitas.
              </div>
            </div>
          </div>

          {/* Historical detailed table log */}
          <div className="bg-white border text-slate-900 rounded-2xl shadow-sm border-slate-200/80 overflow-hidden print-full-width">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-850 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-slate-900 rounded"></span>
                  Demonstrativos de Linha de Produção & Rendimentos de Lote
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Relatório fiscal detalhado de desdobro de toras com cubagem exata de entrada e quantidade de peças obtidas.</p>
              </div>
              <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-200/60 text-slate-650 px-2.5 py-1 rounded-lg">
                {filteredSawmillLogs.length} Registros Processados
              </span>
            </div>

            {filteredSawmillLogs.length === 0 ? (
              <div className="p-16 text-center text-slate-400 italic">
                O arquivo de processamento histórico encontra-se vazio sob as seleções vigentes.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                      <th className="px-6 py-4">Lote / Registro</th>
                      <th className="px-6 py-4">Proprietário de Origem</th>
                      <th className="px-6 py-4">Essência Processada</th>
                      <th className="px-6 py-4 text-center">Produto Acabado</th>
                      <th className="px-6 py-4 text-right">Volume Entrada (Tora)</th>
                      <th className="px-6 py-4 text-right text-emerald-800">Volume Saída (Serrado)</th>
                      <th className="px-6 py-4 text-right text-blue-700 font-bold">Rendimento Obtido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-semibold">
                    {filteredSawmillLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/40 transition duration-150">
                        <td className="px-6 py-4">
                          <div className="font-mono font-black text-slate-900">
                            REG #{log.id.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-350" />
                            {log.dataProcessamento}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-600 font-mono text-[11px] truncate max-w-[130px]">{log.dono}</td>
                        <td className="px-6 py-4 font-bold text-slate-800">{log.especie}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                            {log.produtoSaida || "Serrado bruto"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-slate-500">{log.volumeTora.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-emerald-800 bg-emerald-50/5">+{log.volumeSerrado.toFixed(3)} m³</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-blue-700 bg-blue-50/5">{log.rendimento.toFixed(1)}% yield</td>
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
