/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { NfeDeduction, SawmillProcessLog } from "../types";
import { 
  Factory, 
  History, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Percent, 
  Database, 
  Calendar,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  Search,
  Scale
} from "lucide-react";

interface SerrariaModuleProps {
  deductions: NfeDeduction[];
  sawmillLogs: SawmillProcessLog[];
  onSaveSawmillLogs: (list: SawmillProcessLog[]) => void;
}

export default function SerrariaModule({
  deductions,
  sawmillLogs,
  onSaveSawmillLogs
}: SerrariaModuleProps) {
  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  // Form states for manual process registration (desdobro)
  const [serrariaEspecie, setSerrariaEspecie] = useState("");
  const [serrariaDono, setSerrariaDono] = useState("");
  const [serrariaVolTora, setSerrariaVolTora] = useState("");
  const [serrariaVolSerrado, setSerrariaVolSerrado] = useState("");
  const [serrariaProduto, setSerrariaProduto] = useState("Serrado");
  const [serrariaDate, setSerrariaDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Trigger form filling from pátio list click
  const handleQuickDesdobro = (especie: string, dono: string, maxVol: number) => {
    setSerrariaEspecie(especie);
    setSerrariaDono(dono);
    setSerrariaVolTora(maxVol.toFixed(3));
    // Pre-fill a standard 45% yield
    setSerrariaVolSerrado((maxVol * 0.45).toFixed(3));
    
    // Smooth scroll to form
    const elem = document.getElementById("form-desdobro-serraria");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  // 1. Dynamic Raw Logs calculation (Received logs = all deductions from management plan)
  const receivedBySpecAndOwner = useMemo(() => {
    const list: { especie: string; dono: string; volume: number; numLaunches: number }[] = [];
    deductions.forEach(ded => {
      const cleanEsp = ded.especie.trim();
      const cleanDono = ded.dono.trim();
      const existing = list.find(
        x => x.especie.toLowerCase().trim() === cleanEsp.toLowerCase().trim() &&
             x.dono.toLowerCase().trim() === cleanDono.toLowerCase().trim()
      );
      if (existing) {
        existing.volume += ded.volume;
        existing.numLaunches += 1;
      } else {
        list.push({
          especie: cleanEsp,
          dono: cleanDono,
          volume: ded.volume,
          numLaunches: 1
        });
      }
    });
    return list;
  }, [deductions]);

  // 2. Processed logs grouped by key
  const processedBySpecAndOwner = useMemo(() => {
    const map: Record<string, number> = {};
    sawmillLogs.forEach(log => {
      const key = `${log.especie.toLowerCase().trim()}||${log.dono.toLowerCase().trim()}`;
      map[key] = (map[key] || 0) + log.volumeTora;
    });
    return map;
  }, [sawmillLogs]);

  // 3. Yard Stock array (Pátio de Toras)
  const patioStockList = useMemo(() => {
    return receivedBySpecAndOwner.map(item => {
      const key = `${item.especie.toLowerCase().trim()}||${item.dono.toLowerCase().trim()}`;
      const processed = processedBySpecAndOwner[key] || 0;
      const saldo = Math.max(0, item.volume - processed);
      return {
        ...item,
        processed,
        saldo
      };
    });
  }, [receivedBySpecAndOwner, processedBySpecAndOwner]);

  // Lists of unique values for dropdowns
  const uniquePatioSpecies = useMemo(() => {
    return Array.from(new Set(patioStockList.map(x => x.especie)));
  }, [patioStockList]);

  const uniquePatioOwnersForSelectedSpecies = useMemo(() => {
    if (!serrariaEspecie) return [];
    return patioStockList
      .filter(x => x.especie.toLowerCase().trim() === serrariaEspecie.toLowerCase().trim())
      .map(x => x.dono);
  }, [serrariaEspecie, patioStockList]);

  // Sync owners list when species changes
  const handleSpeciesChange = (esp: string) => {
    setSerrariaEspecie(esp);
    const related = patioStockList.filter(x => x.especie.toLowerCase().trim() === esp.toLowerCase().trim());
    if (related.length > 0) {
      setSerrariaDono(related[0].dono);
    } else {
      setSerrariaDono("");
    }
  };

  // Calculate current available balance for the chosen form combination
  const currentAvailableFormBalance = useMemo(() => {
    if (!serrariaEspecie || !serrariaDono) return 0;
    const match = patioStockList.find(
      x => x.especie.toLowerCase().trim() === serrariaEspecie.toLowerCase().trim() &&
           x.dono.toLowerCase().trim() === serrariaDono.toLowerCase().trim()
    );
    return match ? match.saldo : 0;
  }, [serrariaEspecie, serrariaDono, patioStockList]);

  // Real-time yield calculation
  const formYieldPercent = useMemo(() => {
    const tora = parseFloat(serrariaVolTora);
    const serrado = parseFloat(serrariaVolSerrado);
    if (!tora || !serrado || isNaN(tora) || isNaN(serrado) || tora <= 0) return 0;
    return (serrado / tora) * 100;
  }, [serrariaVolTora, serrariaVolSerrado]);

  // Form submission: process logs
  const handleSubmitProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const toraVol = parseFloat(serrariaVolTora);
    const serradoVol = parseFloat(serrariaVolSerrado);

    if (!serrariaEspecie) {
      alert("Selecione a espécie para o desdobro.");
      return;
    }
    if (!serrariaDono) {
      alert("Selecione o proprietário florestal correspondente.");
      return;
    }
    if (isNaN(toraVol) || toraVol <= 0) {
      alert("Informe um volume de tora válido.");
      return;
    }
    if (isNaN(serradoVol) || serradoVol <= 0) {
      alert("Informe o volume de madeira serrada produzida.");
      return;
    }
    if (toraVol > currentAvailableFormBalance + 0.0001) {
      alert(`Volume superior ao saldo atual disponível no pátio de toras (${currentAvailableFormBalance.toFixed(3)} m³).`);
      return;
    }

    const newLog: SawmillProcessLog = {
      id: "proc_" + Math.random().toString(36).substr(2, 9),
      especie: serrariaEspecie,
      dono: serrariaDono,
      volumeTora: toraVol,
      volumeSerrado: serradoVol,
      produtoSaida: serrariaProduto,
      rendimento: parseFloat(((serradoVol / toraVol) * 100).toFixed(2)),
      dataProcessamento: serrariaDate
    };

    saveSawmillLogs([newLog, ...sawmillLogs]);

    // Clear and reset form fields intelligently
    setSerrariaVolTora("");
    setSerrariaVolSerrado("");
    alert("Processamento de desdobro registrado com sucesso! O estoque do pátio foi abatido e a madeira serrada foi adicionada.");
  };

  // Revert/Delete process log
  const handleDeleteProcessLog = (id: string, esp: string, vol: number) => {
    if (window.confirm(`Tem certeza que deseja estornar este desdobro de ${vol.toFixed(3)} m³ de ${esp}? O volume de toras retornará ao pátio.`)) {
      const updated = sawmillLogs.filter(x => x.id !== id);
      saveSawmillLogs(updated);
    }
  };

  const saveSawmillLogs = (list: SawmillProcessLog[]) => {
    onSaveSawmillLogs(list);
  };

  // Metrics calculation
  const totalLogsReceived = useMemo(() => deductions.reduce((sum, d) => sum + d.volume, 0), [deductions]);
  const totalLogsProcessed = useMemo(() => sawmillLogs.reduce((sum, l) => sum + l.volumeTora, 0), [sawmillLogs]);
  const currentLogsYardStock = useMemo(() => {
    return Math.max(0, totalLogsReceived - totalLogsProcessed);
  }, [totalLogsReceived, totalLogsProcessed]);

  const totalSawnProduced = useMemo(() => sawmillLogs.reduce((sum, l) => sum + l.volumeSerrado, 0), [sawmillLogs]);
  const overallYield = useMemo(() => {
    if (totalLogsProcessed === 0) return 0;
    return (totalSawnProduced / totalLogsProcessed) * 100;
  }, [totalLogsProcessed, totalSawnProduced]);

  // Grouped finished goods stock
  const sawnStockList = useMemo(() => {
    const list: { especie: string; dono: string; produto: string; volume: number }[] = [];
    sawmillLogs.forEach(log => {
      const existing = list.find(
        x => x.especie.toLowerCase().trim() === log.especie.toLowerCase().trim() &&
             x.dono.toLowerCase().trim() === log.dono.toLowerCase().trim() &&
             x.produto.toLowerCase().trim() === log.produtoSaida.toLowerCase().trim()
      );
      if (existing) {
        existing.volume += log.volumeSerrado;
      } else {
        list.push({
          especie: log.especie,
          dono: log.dono,
          produto: log.produtoSaida,
          volume: log.volumeSerrado
        });
      }
    });
    return list;
  }, [sawmillLogs]);

  // Apply filters to yard stock list
  const filteredPatioStock = useMemo(() => {
    return patioStockList.filter(item => {
      const matchSearch = !searchFilter || item.especie.toLowerCase().includes(searchFilter.toLowerCase());
      const matchOwner = !ownerFilter || item.dono.toLowerCase().includes(ownerFilter.toLowerCase());
      return matchSearch && matchOwner;
    });
  }, [patioStockList, searchFilter, ownerFilter]);

  // Apply filters to finished sawn stock
  const filteredSawnStock = useMemo(() => {
    return sawnStockList.filter(item => {
      const matchSearch = !searchFilter || item.especie.toLowerCase().includes(searchFilter.toLowerCase());
      const matchOwner = !ownerFilter || item.dono.toLowerCase().includes(ownerFilter.toLowerCase());
      const matchProduct = !productFilter || item.produto.toLowerCase() === productFilter.toLowerCase();
      return matchSearch && matchOwner && matchProduct;
    });
  }, [sawnStockList, searchFilter, ownerFilter, productFilter]);

  // Apply filters to historic process logs
  const filteredProcessLogs = useMemo(() => {
    return sawmillLogs.filter(log => {
      const matchSearch = !searchFilter || log.especie.toLowerCase().includes(searchFilter.toLowerCase());
      const matchOwner = !ownerFilter || log.dono.toLowerCase().includes(ownerFilter.toLowerCase());
      return matchSearch && matchOwner;
    });
  }, [sawmillLogs, searchFilter, ownerFilter]);

  return (
    <div className="space-y-6 animate-fade-in" id="workspace-tab-serraria">
      
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Factory className="w-6 h-6 text-emerald-800" />
            <span>Módulo Serraria - Gestão de Toras & Desdobro</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mecanismo Ativo: Quando você efetua o desdobro, o volume correspondente <strong className="text-amber-700">sai do Estoque de Toras</strong> e <strong className="text-emerald-700">entra no Estoque de Processados</strong> automaticamente.
          </p>
        </div>
        
        <div className="px-3 py-1.5 bg-emerald-50/60 border border-emerald-100 text-[11px] font-mono rounded-lg text-emerald-805 flex items-center gap-2 shadow-xs">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sincronismo Ativo: <strong className="text-emerald-950 uppercase">AUTEX → Serraria</strong></span>
        </div>
      </div>

      {/* Visual Flow Map Indicator */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-800 shadow-md">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>FLUXO DINÂMICO DE CONTROLE DE SALDOS</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center text-center text-xs">
          {/* Step 1 */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
            <span className="font-mono text-amber-400 font-bold text-[10px] uppercase">1. Entrada de Toras</span>
            <span className="font-bold text-white mt-0.5">Pátio de Toras Roliças</span>
            <span className="text-[9px] text-slate-400 mt-1">Baixas Automáticas do Manejo (AUTEX)</span>
          </div>
          {/* Transition Arrow 1 */}
          <div className="hidden md:flex flex-col items-center">
            <span className="text-emerald-400 font-bold font-mono text-base">➔ ➔ ➔</span>
            <span className="text-[9px] text-slate-400 font-mono tracking-tighter uppercase mt-0.5">Desdobrar (- m³ Toras)</span>
          </div>
          {/* Step 2 */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col items-center">
            <span className="font-mono text-emerald-400 font-bold text-[10px] uppercase">2. Saída de Processados</span>
            <span className="font-bold text-white mt-0.5">Estoque do Almoxarifado</span>
            <span className="text-[9px] text-slate-400 mt-1">Destino: Serrado, Beneficiado, Rodela, Lenha ou Lâmina</span>
          </div>
        </div>
      </div>

      {/* Metrics board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Logs Received */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Entrada de Matéria-Prima</span>
            <span className="text-2xl font-extrabold text-slate-950 mt-1 block font-mono">
              {totalLogsReceived.toFixed(3)} <span className="text-xs font-normal text-slate-500">m³</span>
            </span>
          </div>
          <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-4 pt-2.5 border-t border-slate-100">
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
            <span>Total recebido do Manejo</span>
          </div>
        </div>

        {/* Card 2: Logs Processed */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Processado</span>
            <span className="text-2xl font-extrabold text-slate-950 mt-1 block font-mono">
              {totalLogsProcessed.toFixed(3)} <span className="text-xs font-normal text-slate-500">m³</span>
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1 mt-4 pt-2.5 border-t border-slate-100">
            <Scale className="w-3.5 h-3.5 text-slate-400" />
            <span>Tora encaminhada p/ serra</span>
          </div>
        </div>

        {/* Card 3: Yard Stock */}
        <div className="bg-gradient-to-br from-amber-50/30 to-amber-55/70 p-5 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden">
          <div>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Saldo de Toras no Pátio</span>
            <span className="text-2xl font-extrabold text-amber-950 mt-1 block font-mono">
              {currentLogsYardStock.toFixed(3)} <span className="text-xs font-semibold text-amber-600">m³</span>
            </span>
          </div>
          <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1 mt-4 pt-2.5 border-t border-amber-200/60">
            <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Aguardando desdobro</span>
          </div>
        </div>

        {/* Card 4: Sawn Produced */}
        <div className="bg-gradient-to-br from-emerald-50/30 to-emerald-55/60 p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden">
          <div>
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Processados Produzidos</span>
            <span className="text-2xl font-extrabold text-emerald-950 mt-1 block font-mono">
              {totalSawnProduced.toFixed(3)} <span className="text-xs font-semibold text-emerald-700">m³</span>
            </span>
          </div>
          <div className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 mt-4 pt-2.5 border-t border-emerald-200/50">
            <ArrowUpFromLine className="w-3.5 h-3.5 text-emerald-600" />
            <span>Produto acabado estocado</span>
          </div>
        </div>

        {/* Card 5: Efficiency Yield */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col justify-between transition-all hover:shadow-md">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Eficiência de Rendimento</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-1 block font-mono">
              {overallYield.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1 mt-4 pt-2.5 border-t border-slate-100">
            <Percent className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">
              {overallYield === 0 ? "Sem processos" : overallYield >= 45 ? "Rendimento Excelente" : "Rendimento Regular"}
            </span>
          </div>
        </div>

      </div>

      {/* Audit & Filters row used for tables */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-2">
          <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Filtros</span>
          <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Buscar Ativos</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto flex-1 max-w-2xl">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Buscar espécie..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-55 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition font-medium"
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Filtrar por dono..."
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-55 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition font-medium"
            />
          </div>
          <div>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-slate-55 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition font-medium"
            >
              <option value="">— Todos os produtos —</option>
              <option value="Tora">Tora</option>
              <option value="Serrado">Serrado</option>
              <option value="Beneficiado">Beneficiado</option>
              <option value="Rodela">Rodela</option>
              <option value="Lenha">Lenha</option>
              <option value="Lâmina">Lâmina</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid: Stock Yards Table on the left, Form on the right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Pátio de Toras Stock Inventory */}
        <div className="lg:col-span-7 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span>
              <span>Estoque de Toras no Pátio (Pátio de Toras Roliças)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Saldo de madeira bruta disponível para desdobro.</p>
          </div>

          {filteredPatioStock.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              Nenhuma tora disponível no pátio. Realize faturamentos (baixas) no plano de manejo para abastecer a serraria.
            </div>
          ) : (
            <div className="overflow-hidden border border-slate-150 rounded-xl shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wide">
                    <th className="px-3.5 py-3">Espécie</th>
                    <th className="px-3.5 py-3">Dono de Lote</th>
                    <th className="px-3.5 py-3 text-right">Rec. (Manejo)</th>
                    <th className="px-3.5 py-3 text-right">Proc. (Desdobrado)</th>
                    <th className="px-3.5 py-3 text-right text-amber-900">Saldo no Pátio</th>
                    <th className="px-3.5 py-3 text-center no-print">Operação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatioStock.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{row.especie}</td>
                      <td className="px-3.5 py-2.5 text-slate-600 font-medium">{row.dono}</td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-slate-500">{row.volume.toFixed(3)} m³</td>
                      <td className="px-3.5 py-2.5 text-right font-mono text-slate-500">{row.processed.toFixed(3)} m³</td>
                      <td className="px-3.5 py-2.5 text-right font-mono font-bold text-amber-700 bg-amber-50/20">
                        {row.saldo.toFixed(3)} m³
                      </td>
                      <td className="px-3.5 py-2 text-center no-print">
                        {row.saldo > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleQuickDesdobro(row.especie, row.dono, row.saldo)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-805 font-bold text-[10px] uppercase px-2.5 py-1 rounded-md transition shadow-xs flex items-center gap-1 mx-auto"
                          >
                            <span>+ Desdobrar</span>
                          </button>
                        ) : (
                          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded leading-none inline-block">
                            ESGOTADO
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Log Processing Form (Ficha de Desdobro) */}
        <div 
          id="form-desdobro-serraria"
          className="lg:col-span-5 bg-gradient-to-br from-white to-slate-50/40 p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -mr-10 -mt-10 opacity-30"></div>
          
          <div className="relative">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-700 bg-emerald-50 p-1 rounded-full shrink-0" />
              <span>Registrar Desdobro (Serramento)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Informe o volume de toras processado e a madeira serrada resultante.</p>
          </div>

          <form onSubmit={handleSubmitProcess} className="space-y-4 pt-1 relative">
            
            {/* Espécie Dropdown selector */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Espécie de Madeira
              </label>
              <select
                value={serrariaEspecie}
                onChange={(e) => handleSpeciesChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
                required
              >
                <option value="">-- Selecione uma espécie --</option>
                {uniquePatioSpecies.map(esp => (
                  <option key={esp} value={esp}>{esp}</option>
                ))}
              </select>
            </div>

            {/* Owner Dropdown list holding this specie */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Proprietário / Dono do lote
              </label>
              <select
                value={serrariaDono}
                onChange={(e) => setSerrariaDono(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition disabled:opacity-50"
                disabled={!serrariaEspecie}
                required
              >
                <option value="">-- Selecione o dono --</option>
                {uniquePatioOwnersForSelectedSpecies.map(dono => (
                  <option key={dono} value={dono}>{dono}</option>
                ))}
              </select>
            </div>

            {/* Current Yard Balance Display Badge */}
            {serrariaEspecie && serrariaDono && (
              <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex justify-between items-center text-xs text-amber-900">
                <span className="font-semibold text-amber-800">Saldo de tora no pátio:</span>
                <span className="font-mono font-bold text-amber-950">{currentAvailableFormBalance.toFixed(3)} m³</span>
              </div>
            )}

            {/* Log Input Volume */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Volume de Tora Desdobrada (M³ Entrada)
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  step="0.001"
                  placeholder="Ex: 15.420"
                  value={serrariaVolTora}
                  onChange={(e) => setSerrariaVolTora(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => {
                    if (serrariaEspecie && serrariaDono) {
                      setSerrariaVolTora(currentAvailableFormBalance.toString());
                      setSerrariaVolSerrado((currentAvailableFormBalance * 0.45).toString());
                    }
                  }}
                  className="px-3 bg-slate-100 rounded-lg text-slate-700 font-bold text-[9px] uppercase hover:bg-slate-200 transition"
                  disabled={!serrariaEspecie || !serrariaDono}
                  title="Abater estoque total disponível"
                >
                  Tudo
                </button>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-slate-200/80 my-3"></div>

            {/* Output Product Selection */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Produto Acabado Produzido
              </label>
              <select
                value={serrariaProduto}
                onChange={(e) => setSerrariaProduto(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-805 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
                required
              >
                <option value="Tora">Tora</option>
                <option value="Serrado">Serrado</option>
                <option value="Beneficiado">Beneficiado</option>
                <option value="Rodela">Rodela</option>
                <option value="Lenha">Lenha</option>
                <option value="Lâmina">Lâmina</option>
              </select>
            </div>

            {/* Produced Sawn Timber Volume */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Volume Resultante Produzido (M³ Saída)
              </label>
              <input
                type="number"
                step="0.001"
                placeholder="Ex: 6.940 (Aprox. 45% de rendimento)"
                value={serrariaVolSerrado}
                onChange={(e) => setSerrariaVolSerrado(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
                required
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Data do Processamento
              </label>
              <input
                type="date"
                value={serrariaDate}
                onChange={(e) => setSerrariaDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition font-mono text-slate-800"
                required
              />
            </div>

            {/* Real-time yield renderer */}
            {formYieldPercent > 0 && (
              <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all ${
                formYieldPercent > 100 
                  ? "bg-rose-50 border-rose-200 text-rose-800" 
                  : formYieldPercent > 60 
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-emerald-50 border-emerald-100 text-emerald-800"
              }`}>
                <span className="flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-emerald-600" />
                  <span>Rendimento Estimado:</span>
                </span>
                <span className="font-mono font-bold">{formYieldPercent.toFixed(1)}%</span>
              </div>
            )}

            {/* Disclaimer on high yield */}
            {formYieldPercent > 70 && (
              <div className="text-[10px] text-amber-800 font-medium flex items-start gap-1 p-1 italic leading-tight">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-650" />
                <span>Rendimentos acima de 70% são incomuns no desdobro físico de toras roliças. Revise os campos.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-900 text-white font-bold rounded-xl text-xs hover:bg-emerald-850 hover:-translate-y-0.5 transition-all duration-150 shadow-sm cursor-pointer"
            >
              Gravar Desdobro & Produzir Processados
            </button>

          </form>
        </div>

      </div>

      {/* Sawn Lumber Inventory / Products Warehouse */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-600 rounded-full inline-block"></span>
            <span>Estoque de Madeira Processada (Almoxarifado de Acabados)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Volume acabado por produto, espécie e dono disponível para expedição.</p>
        </div>

        {filteredSawnStock.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            Nenhum produto de madeira processada estocado. Utilize a ficha lateral para realizar o desdobro de toras.
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-150 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wide">
                  <th className="px-3.5 py-3">Espécie</th>
                  <th className="px-3.5 py-3">Dono de Lote</th>
                  <th className="px-3.5 py-3">Produto Acabado</th>
                  <th className="px-3.5 py-3 text-right">Volume Estocado</th>
                  <th className="px-3.5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSawnStock.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition">
                    <td className="px-3.5 py-2.5 font-bold text-slate-900">{row.especie}</td>
                    <td className="px-3.5 py-2.5 text-slate-650 font-medium">{row.dono}</td>
                    <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-900 uppercase tracking-tight">{row.produto}</td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-emerald-800 bg-emerald-50/10">
                      {row.volume.toFixed(3)} m³
                    </td>
                    <td className="px-3.5 py-2.5 text-center">
                      <span className="bg-emerald-50 text-emerald-950 font-bold text-[9px] px-2.5 py-0.5 uppercase tracking-tight border border-emerald-250 rounded-full inline-block">
                        Disponível
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Production Logs / Decouple Desdobro History Logs */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              <span>Histórico Analítico de Desdobro (Serramento)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Audite o consumo de tora bruta, rendimento de processamento e estorne se necessário.</p>
          </div>
          <span className="font-mono text-[10px] font-bold bg-slate-105 text-slate-600 px-3 py-1 rounded-full border border-slate-200/50">
            {filteredProcessLogs.length} Processamentos
          </span>
        </div>

        {filteredProcessLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            Nenhum processamento registrado no período de auditoria.
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-150 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wide">
                  <th className="px-3.5 py-3">Data Operação</th>
                  <th className="px-3.5 py-3">Espécie Florestal</th>
                  <th className="px-3.5 py-3">Dono do Lote</th>
                  <th className="px-3.5 py-3 text-center">Volume Tora</th>
                  <th className="px-3.5 py-3">Produto Saída</th>
                  <th className="px-3.5 py-3 text-right">Volume Serrado</th>
                  <th className="px-3.5 py-3 text-center">Rendimento Base</th>
                  <th className="px-3.5 py-3 text-center no-print">Ações de Ajuste</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProcessLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-3.5 py-3 font-semibold text-slate-950 font-mono">{log.dataProcessamento}</td>
                    <td className="px-3.5 py-3 font-bold text-slate-900">{log.especie}</td>
                    <td className="px-3.5 py-3 font-mono text-slate-600">{log.dono}</td>
                    <td className="px-3.5 py-3 text-center font-mono font-semibold text-amber-700">-{log.volumeTora.toFixed(3)} m³</td>
                    <td className="px-3.5 py-3 font-bold text-indigo-905 uppercase tracking-tight">{log.produtoSaida}</td>
                    <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-850">+{log.volumeSerrado.toFixed(3)} m³</td>
                    <td className="px-3.5 py-3 text-center">
                      <span className={`px-2 py-0.5 font-mono font-bold rounded-sm text-[10px] ${
                        log.rendimento >= 45 
                          ? "bg-emerald-100/70 text-emerald-900 border border-emerald-200"
                          : "bg-amber-100/70 text-amber-900 border border-amber-200"
                      }`}>
                        {log.rendimento.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-center no-print border-l border-slate-50">
                      <button
                        type="button"
                        onClick={() => handleDeleteProcessLog(log.id, log.especie, log.volumeTora)}
                        className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer transition-all px-2 py-1 bg-rose-50/50 hover:bg-rose-100/80 rounded"
                      >
                        Estornar
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
  );
}
