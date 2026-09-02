/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { 
  Autex, 
  NfeDeduction 
} from "../types";
import { 
  GalpaoEntity, 
  GalpaoDispatchLog, 
  getRegisteredGalpoes, 
  saveRegisteredGalpoes, 
  getGalpaoDispatches, 
  saveGalpaoDispatches 
} from "../lib/galpaoData";
import { 
  Warehouse, 
  MapPin, 
  Truck, 
  PlusCircle, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Phone, 
  User, 
  Calendar, 
  FileText, 
  Trash2, 
  RefreshCw, 
  Filter,
  Check,
  X,
  TrendingUp,
  PackageCheck
} from "lucide-react";
import ManageGalpoesModal from "./ManageGalpoesModal";

interface GalpaoModuleProps {
  autexList: Autex[];
  activeAutex: Autex | null;
  deductions: NfeDeduction[];
  onSaveDeductions: (deductions: NfeDeduction[]) => void;
}

export default function GalpaoModule({
  autexList,
  activeAutex,
  deductions,
  onSaveDeductions
}: GalpaoModuleProps) {
  // Navigation sub-tab
  const [activeSubTab, setActiveSubTab] = useState<"estoque" | "lancamento" | "expedicoes" | "galpoes" | "historico">("estoque");

  // State for galpoes and dispatches
  const [galpoes, setGalpoes] = useState<GalpaoEntity[]>([]);
  const [dispatches, setDispatches] = useState<GalpaoDispatchLog[]>([]);
  const [isManageGalpoesModalOpen, setIsManageGalpoesModalOpen] = useState(false);

  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [galpaoFilter, setGalpaoFilter] = useState("");
  const [especieFilter, setEspecieFilter] = useState("");
  const [donoFilter, setDonoFilter] = useState("");

  // Direct Launch Form State (Manejo -> Galpão)
  const [launchSelectedAutexId, setLaunchSelectedAutexId] = useState<string>(activeAutex?.id || "");
  const [launchItemId, setLaunchItemId] = useState<string>("");
  const [launchEspecie, setLaunchEspecie] = useState<string>("");
  const [launchDono, setLaunchDono] = useState<string>("");
  const [launchVolume, setLaunchVolume] = useState<string>("");
  const [launchGalpaoId, setLaunchGalpaoId] = useState<string>("");
  const [launchPlaca, setLaunchPlaca] = useState<string>("");
  const [launchNfe, setLaunchNfe] = useState<string>("");
  const [launchData, setLaunchData] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Outbound Dispatch Modal/Form State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [dispatchGalpaoId, setDispatchGalpaoId] = useState<string>("");
  const [dispatchEspecie, setDispatchEspecie] = useState<string>("");
  const [dispatchDono, setDispatchDono] = useState<string>("");
  const [dispatchVolume, setDispatchVolume] = useState<string>("");
  const [dispatchTipo, setDispatchTipo] = useState<"Venda Direta" | "Transferência Serraria" | "Transferência Outro Galpão" | "Uso Próprio" | "Outro">("Venda Direta");
  const [dispatchDestinatario, setDispatchDestinatario] = useState<string>("");
  const [dispatchDocRef, setDispatchDocRef] = useState<string>("");
  const [dispatchPlaca, setDispatchPlaca] = useState<string>("");
  const [dispatchMotorista, setDispatchMotorista] = useState<string>("");
  const [dispatchData, setDispatchData] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [dispatchObs, setDispatchObs] = useState<string>("");

  // Load Galpões & Dispatches
  const refreshGalpoesAndDispatches = () => {
    const gList = getRegisteredGalpoes();
    const dList = getGalpaoDispatches();
    setGalpoes(gList);
    setDispatches(dList);
    if (gList.length > 0) {
      if (!launchGalpaoId) setLaunchGalpaoId(gList[0].id);
      if (!dispatchGalpaoId) setDispatchGalpaoId(gList[0].id);
    }
  };

  useEffect(() => {
    refreshGalpoesAndDispatches();
    const handler1 = () => refreshGalpoesAndDispatches();
    const handler2 = () => refreshGalpoesAndDispatches();
    window.addEventListener("galpoes_updated", handler1);
    window.addEventListener("galpao_dispatches_updated", handler2);
    return () => {
      window.removeEventListener("galpoes_updated", handler1);
      window.removeEventListener("galpao_dispatches_updated", handler2);
    };
  }, []);

  // Update launch form when activeAutex changes
  useEffect(() => {
    if (activeAutex) {
      setLaunchSelectedAutexId(activeAutex.id);
      if (activeAutex.items.length > 0) {
        setLaunchItemId(activeAutex.items[0].id);
        setLaunchEspecie(activeAutex.items[0].especie);
        setLaunchDono(activeAutex.items[0].dono);
      }
    }
  }, [activeAutex]);

  // Current selected AUTEX for launch
  const currentLaunchAutex = useMemo(() => {
    return autexList.find(a => a.id === launchSelectedAutexId) || activeAutex || autexList[0] || null;
  }, [autexList, launchSelectedAutexId, activeAutex]);

  // Deductions directed to Galpões
  const galpaoDeductions = useMemo(() => {
    return deductions.filter(d => d.destinoTipo === "galpao" || Boolean(d.galpaoDestino && d.destinoTipo !== "serraria"));
  }, [deductions]);

  // Map of galpão by name or id
  const galpaoMap = useMemo(() => {
    const map: Record<string, GalpaoEntity> = {};
    galpoes.forEach(g => {
      map[g.id] = g;
      map[g.nome.toLowerCase().trim()] = g;
    });
    return map;
  }, [galpoes]);

  // Helper to resolve galpão entity from deduction
  const resolveGalpaoFromDeduction = (d: NfeDeduction): GalpaoEntity | null => {
    if (d.galpaoDestino) {
      const match = galpaoMap[d.galpaoDestino.toLowerCase().trim()];
      if (match) return match;
    }
    if (galpoes.length > 0) return galpoes[0];
    return null;
  };

  // 1. Stock Calculation by (Galpão + Espécie + Dono)
  const stockInventory = useMemo(() => {
    interface StockItem {
      galpaoId: string;
      galpaoNome: string;
      galpaoEndereco: string;
      cidadeUf: string;
      especie: string;
      dono: string;
      volumeEntrada: number; // Inbound from Manejo
      volumeSaida: number;   // Outbound dispatches
      saldoAtual: number;    // Available logs
      numCargas: number;
    }

    const map: Record<string, StockItem> = {};

    // Process all inbound deductions from Manejo to Galpões
    galpaoDeductions.forEach(d => {
      const gEntity = resolveGalpaoFromDeduction(d);
      const gId = gEntity?.id || "galpao-default";
      const gNome = gEntity?.nome || d.galpaoDestino || "Galpão Principal";
      const gEnd = gEntity?.endereco || d.galpaoEndereco || "Endereço cadastrado";
      const gCid = gEntity?.cidadeUf || "PA";
      const esp = d.especie.trim();
      const dono = d.dono.trim();

      const key = `${gId}||${esp.toLowerCase()}||${dono.toLowerCase()}`;

      if (!map[key]) {
        map[key] = {
          galpaoId: gId,
          galpaoNome: gNome,
          galpaoEndereco: gEnd,
          cidadeUf: gCid,
          especie: esp,
          dono: dono,
          volumeEntrada: 0,
          volumeSaida: 0,
          saldoAtual: 0,
          numCargas: 0
        };
      }

      map[key].volumeEntrada += d.volume;
      map[key].numCargas += 1;
    });

    // Process all outbound dispatches from Galpões
    dispatches.forEach(disp => {
      const gId = disp.galpaoId;
      const esp = disp.especie.trim();
      const dono = disp.dono.trim();
      const key = `${gId}||${esp.toLowerCase()}||${dono.toLowerCase()}`;

      if (!map[key]) {
        const gEntity = galpoes.find(g => g.id === gId);
        map[key] = {
          galpaoId: gId,
          galpaoNome: disp.galpaoNome || gEntity?.nome || "Galpão",
          galpaoEndereco: gEntity?.endereco || "Endereço",
          cidadeUf: gEntity?.cidadeUf || "PA",
          especie: esp,
          dono: dono,
          volumeEntrada: 0,
          volumeSaida: 0,
          saldoAtual: 0,
          numCargas: 0
        };
      }

      map[key].volumeSaida += disp.volume;
    });

    // Calculate net balance
    const list = Object.values(map).map(item => ({
      ...item,
      saldoAtual: Math.max(0, item.volumeEntrada - item.volumeSaida)
    }));

    // Sort by Galpão name, then species
    return list.sort((a, b) => a.galpaoNome.localeCompare(b.galpaoNome) || a.especie.localeCompare(b.especie));
  }, [galpaoDeductions, dispatches, galpoes, galpaoMap]);

  // Filtered Stock Inventory
  const filteredStock = useMemo(() => {
    return stockInventory.filter(item => {
      const matchSearch = !searchFilter || 
        item.especie.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.galpaoNome.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.galpaoEndereco.toLowerCase().includes(searchFilter.toLowerCase());
      const matchGalpao = !galpaoFilter || item.galpaoId === galpaoFilter || item.galpaoNome.toLowerCase().includes(galpaoFilter.toLowerCase());
      const matchEspecie = !especieFilter || item.especie.toLowerCase() === especieFilter.toLowerCase();
      const matchDono = !donoFilter || item.dono.toLowerCase().includes(donoFilter.toLowerCase());
      return matchSearch && matchGalpao && matchEspecie && matchDono;
    });
  }, [stockInventory, searchFilter, galpaoFilter, especieFilter, donoFilter]);

  // Overall Global KPI Metrics for Galpões
  const metrics = useMemo(() => {
    const totalEntradas = stockInventory.reduce((acc, i) => acc + i.volumeEntrada, 0);
    const totalSaidas = stockInventory.reduce((acc, i) => acc + i.volumeSaida, 0);
    const saldoEstoque = totalEntradas - totalSaidas;
    const totalCargas = galpaoDeductions.length;
    const uniqueEspecies = new Set(stockInventory.map(i => i.especie)).size;
    const totalGalpoes = galpoes.length;

    return {
      totalEntradas,
      totalSaidas,
      saldoEstoque,
      totalCargas,
      uniqueEspecies,
      totalGalpoes
    };
  }, [stockInventory, galpaoDeductions, galpoes]);

  // Unique species list for filters
  const uniqueSpecies = useMemo(() => {
    return Array.from(new Set(stockInventory.map(i => i.especie))).sort();
  }, [stockInventory]);

  // Unique owners list for filters
  const uniqueOwners = useMemo(() => {
    return Array.from(new Set(stockInventory.map(i => i.dono))).sort();
  }, [stockInventory]);

  // Handle direct launch submission (Manejo -> Galpão)
  const handleLaunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentLaunchAutex) {
      alert("Selecione um contrato AUTEX de origem.");
      return;
    }

    const vol = parseFloat(launchVolume);
    if (isNaN(vol) || vol <= 0) {
      alert("Informe um volume de toras válido maior que zero.");
      return;
    }

    const targetGalpao = galpoes.find(g => g.id === launchGalpaoId) || galpoes[0];
    if (!targetGalpao) {
      alert("Cadastre ao menos um Galpão antes de realizar o lançamento.");
      return;
    }

    const matchedItem = currentLaunchAutex.items.find(i => i.id === launchItemId);
    const espName = matchedItem ? matchedItem.especie : (launchEspecie || "Madeira em Tora");
    const donoName = matchedItem ? matchedItem.dono : (launchDono || currentLaunchAutex.detentores[0] || "Proprietário");
    const autexItemId = matchedItem ? matchedItem.id : (currentLaunchAutex.items[0]?.id || `item-${Date.now()}`);

    const newDeduction: NfeDeduction = {
      id: `galpao-deduct-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      autexId: currentLaunchAutex.id,
      autexItemId: autexItemId,
      numeroNfe: launchNfe.trim() || `GUIA-GALP-${Math.floor(1000 + Math.random() * 9000)}`,
      dataEmissao: launchData,
      dono: donoName,
      especie: espName,
      volume: vol,
      dataImportacao: new Date().toISOString(),
      xmlFileName: "Saída de Manejo para Galpão",
      placaCaminhao: launchPlaca.trim() || "Não Informado",
      tipoLancamento: "Manual",
      destinoTipo: "galpao",
      galpaoDestino: targetGalpao.nome,
      galpaoEndereco: `${targetGalpao.endereco} (${targetGalpao.cidadeUf})`
    };

    onSaveDeductions([newDeduction, ...deductions]);
    
    // Clear form inputs
    setLaunchVolume("");
    setLaunchNfe("");
    setLaunchPlaca("");
    alert(`Toras destinadas com sucesso ao "${targetGalpao.nome}"!\n\nVolume: ${vol.toFixed(3)} m³ de ${espName} (${donoName})\nEndereço: ${targetGalpao.endereco}`);
    setActiveSubTab("estoque");
  };

  // Open dispatch modal from stock table row
  const handleQuickDispatch = (galpaoId: string, especie: string, dono: string, saldoMax: number) => {
    setDispatchGalpaoId(galpaoId);
    setDispatchEspecie(especie);
    setDispatchDono(dono);
    setDispatchVolume(saldoMax.toFixed(3));
    setDispatchTipo("Venda Direta");
    setDispatchDestinatario("");
    setDispatchDocRef("");
    setDispatchPlaca("");
    setDispatchMotorista("");
    setDispatchObs("");
    setIsDispatchModalOpen(true);
  };

  // Handle outbound dispatch form submission
  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const vol = parseFloat(dispatchVolume);
    if (isNaN(vol) || vol <= 0) {
      alert("Informe um volume de saída válido.");
      return;
    }

    const gEntity = galpoes.find(g => g.id === dispatchGalpaoId) || galpoes[0];
    const gNome = gEntity?.nome || "Galpão";

    // Check available stock
    const currentItem = stockInventory.find(
      i => i.galpaoId === dispatchGalpaoId &&
           i.especie.toLowerCase().trim() === dispatchEspecie.toLowerCase().trim() &&
           i.dono.toLowerCase().trim() === dispatchDono.toLowerCase().trim()
    );

    const availableSaldo = currentItem ? currentItem.saldoAtual : 0;
    if (vol > availableSaldo) {
      const proceed = window.confirm(
        `Atenção: O volume de saída (${vol.toFixed(3)} m³) é superior ao saldo atual (${availableSaldo.toFixed(3)} m³) deste lote no galpão.\nDeseja confirmar a expedição mesmo assim?`
      );
      if (!proceed) return;
    }

    const newDispatch: GalpaoDispatchLog = {
      id: `dispatch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      galpaoId: dispatchGalpaoId,
      galpaoNome: gNome,
      especie: dispatchEspecie,
      dono: dispatchDono,
      volume: vol,
      tipoSaida: dispatchTipo,
      destinatario: dispatchDestinatario.trim() || "Cliente / Destino Não Especificado",
      documentoRef: dispatchDocRef.trim(),
      placaCaminhao: dispatchPlaca.trim(),
      motorista: dispatchMotorista.trim(),
      dataSaida: dispatchData,
      observacoes: dispatchObs.trim()
    };

    const updated = [newDispatch, ...dispatches];
    saveGalpaoDispatches(updated);
    setDispatches(updated);
    setIsDispatchModalOpen(false);

    alert(`Expedição registrada com sucesso!\n\n${vol.toFixed(3)} m³ de ${dispatchEspecie} saíram do ${gNome} com destino a "${newDispatch.destinatario}".`);
  };

  // Delete an outbound dispatch
  const handleDeleteDispatch = (id: string) => {
    if (window.confirm("Deseja realmente excluir este registro de expedição do galpão?")) {
      const updated = dispatches.filter(d => d.id !== id);
      saveGalpaoDispatches(updated);
      setDispatches(updated);
    }
  };

  // Export Galpão Inventory to CSV
  const handleExportStockCsv = () => {
    const headers = [
      "GALPAO_DEPOSITO",
      "ENDERECO",
      "CIDADE_UF",
      "ESPECIE",
      "PROPRIETARIO_DONO",
      "TOTAL_RECEBIDO_MANEJO_M3",
      "TOTAL_EXPEDIDO_SAIDAS_M3",
      "SALDO_ESTOQUE_GALPAO_M3",
      "CARGAS_RECEBIDAS"
    ];

    const rows = filteredStock.map(item => [
      `"${item.galpaoNome.replace(/"/g, '""')}"`,
      `"${item.galpaoEndereco.replace(/"/g, '""')}"`,
      `"${item.cidadeUf.replace(/"/g, '""')}"`,
      `"${item.especie.replace(/"/g, '""')}"`,
      `"${item.dono.replace(/"/g, '""')}"`,
      item.volumeEntrada.toFixed(4).replace(".", ","),
      item.volumeSaida.toFixed(4).replace(".", ","),
      item.saldoAtual.toFixed(4).replace(".", ","),
      item.numCargas
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Estoque_Galpoes_Toras_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-900 text-white rounded-2xl p-6 sm:p-7 shadow-md border border-amber-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                <Warehouse className="w-3 h-3 text-amber-400" />
                <span>Depósito & Armazenamento Externo</span>
              </span>
              <span className="text-amber-200/60 text-xs font-mono">• Não direcionado para Serraria</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>Módulo de Galpão de Toras</span>
            </h1>
            <p className="text-amber-100/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Controle de toras brutas que saem do plano de manejo e são armazenadas em galpões ou depósitos com endereços específicos, mantendo rastreabilidade total separada do pátio da serraria.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap no-print">
            <button
              type="button"
              onClick={() => setIsManageGalpoesModalOpen(true)}
              className="px-3.5 py-2 bg-amber-800/80 hover:bg-amber-700 text-amber-100 border border-amber-600/50 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Building2 className="w-4 h-4 text-amber-300" />
              <span>+ Gerenciar Galpões / Endereços</span>
            </button>
            <button
              type="button"
              onClick={handleExportStockCsv}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Excel (.csv)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Saldo em Galpões</span>
            <Warehouse className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-900">
            {metrics.saldoEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <span className="text-xs font-sans font-bold text-slate-400">m³</span>
          </div>
          <span className="text-[10px] text-amber-700 font-medium">Toras prontas em estoque</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Entradas do Manejo</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">
            {metrics.totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <span className="text-xs font-sans font-bold text-slate-400">m³</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{metrics.totalCargas} cargas recebidas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Saídas / Expedições</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-700">
            {metrics.totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} <span className="text-xs font-sans font-bold text-slate-400">m³</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">{dispatches.length} expedições realizadas</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Galpões Ativos</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {metrics.totalGalpoes} <span className="text-xs font-sans font-bold text-slate-400">locais</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Endereços cadastrados</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Espécies Distintas</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {metrics.uniqueEspecies} <span className="text-xs font-sans font-bold text-slate-400">espécies</span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">Variedade de madeiras</span>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto no-print">
        <button
          type="button"
          onClick={() => setActiveSubTab("estoque")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "estoque"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>📦 Estoque de Toras por Galpão</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("lancamento")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "lancamento"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>✍️ Lançar do Manejo para o Galpão</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("expedicoes")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "expedicoes"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>🚚 Expedições & Saídas do Galpão</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("galpoes")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "galpoes"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>📍 Cadastro de Galpões & Endereços</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("historico")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeSubTab === "historico"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>📜 Histórico Analítico de Cargas</span>
        </button>
      </div>

      {/* --- SUB-TAB 1: ESTOQUE DE TORAS POR GALPÃO --- */}
      {activeSubTab === "estoque" && (
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider">Filtros</span>
              <span className="font-bold text-slate-700 text-xs uppercase tracking-wider">Buscar no Estoque</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 w-full lg:w-auto flex-1 max-w-4xl">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar espécie, galpão..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 font-medium"
                />
              </div>

              <div>
                <select
                  value={galpaoFilter}
                  onChange={(e) => setGalpaoFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 font-medium"
                >
                  <option value="">— Todos os Galpões —</option>
                  {galpoes.map(g => (
                    <option key={g.id} value={g.id}>{g.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={especieFilter}
                  onChange={(e) => setEspecieFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 font-medium"
                >
                  <option value="">— Todas as Espécies —</option>
                  {uniqueSpecies.map(esp => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={donoFilter}
                  onChange={(e) => setDonoFilter(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 font-medium"
                >
                  <option value="">— Todos os Proprietários —</option>
                  {uniqueOwners.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table of Inventory */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <Warehouse className="w-4 h-4 text-amber-600" />
                  <span>Estoque de Toras Armazenadas nos Galpões</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Saldo físico segregado por galpão, endereço e proprietário da madeira.</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveSubTab("lancamento")}
                className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer no-print"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Lançar do Manejo</span>
              </button>
            </div>

            {filteredStock.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <Warehouse className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Nenhuma tora armazenada nos galpões no momento.</p>
                <p className="mt-1">Realize lançamentos na aba "Lançar do Manejo para o Galpão" ou através da importação de NF-e para abastecer os galpões.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wide">
                      <th className="px-4 py-3">Galpão & Endereço</th>
                      <th className="px-4 py-3">Espécie Florestal</th>
                      <th className="px-4 py-3">Dono do Lote</th>
                      <th className="px-4 py-3 text-right">Rec. Manejo</th>
                      <th className="px-4 py-3 text-right">Saídas</th>
                      <th className="px-4 py-3 text-right text-amber-900">Saldo Atual (m³)</th>
                      <th className="px-4 py-3 text-center no-print">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredStock.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5">
                              <Warehouse className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{row.galpaoNome}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                              <span>{row.galpaoEndereco}</span>
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{row.especie}</td>
                        <td className="px-4 py-3 text-slate-600 font-medium">{row.dono}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700 font-semibold">{row.volumeEntrada.toFixed(3)} m³</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600 font-semibold">{row.volumeSaida.toFixed(3)} m³</td>
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-amber-900 text-sm bg-amber-50/50">
                          {row.saldoAtual.toFixed(3)} m³
                        </td>
                        <td className="px-4 py-3 text-center no-print">
                          {row.saldoAtual > 0 ? (
                            <button
                              type="button"
                              onClick={() => handleQuickDispatch(row.galpaoId, row.especie, row.dono, row.saldoAtual)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase rounded-lg transition shadow-xs flex items-center gap-1 mx-auto cursor-pointer"
                              title="Registrar saída / expedição deste lote"
                            >
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Expedir</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-mono">Esgotado</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-700">
                        Total Geral em Estoque ({filteredStock.length} Itens)
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-800">
                        {filteredStock.reduce((a, b) => a + b.volumeEntrada, 0).toFixed(3)} m³
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-rose-800">
                        {filteredStock.reduce((a, b) => a + b.volumeSaida, 0).toFixed(3)} m³
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-amber-950 text-sm bg-amber-100/70">
                        {filteredStock.reduce((a, b) => a + b.saldoAtual, 0).toFixed(3)} m³
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* --- SUB-TAB 2: LANÇAMENTO DO MANEJO -> GALPÃO --- */}
      {activeSubTab === "lancamento" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-amber-600" />
                <span>Lançar Toras do Manejo para Galpão Externo</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Abate o saldo do plano de manejo e transfere a guarda das toras diretamente para o galpão selecionado (não entra no pátio da serraria).
              </p>
            </div>

            <form onSubmit={handleLaunchSubmit} className="space-y-4">
              
              {/* Contrato AUTEX de Origem */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Contrato AUTEX de Origem (Manejo) *
                </label>
                <select
                  value={launchSelectedAutexId}
                  onChange={(e) => {
                    setLaunchSelectedAutexId(e.target.value);
                    const sel = autexList.find(a => a.id === e.target.value);
                    if (sel && sel.items.length > 0) {
                      setLaunchItemId(sel.items[0].id);
                      setLaunchEspecie(sel.items[0].especie);
                      setLaunchDono(sel.items[0].dono);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  required
                >
                  {autexList.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.numero} — {a.descricao}
                    </option>
                  ))}
                </select>
              </div>

              {/* Galpão de Destino */}
              <div className="bg-amber-50/60 p-4 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold uppercase text-amber-900 tracking-wider">
                    Galpão / Depósito de Destino (Outro Endereço) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsManageGalpoesModalOpen(true)}
                    className="text-[10px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
                  >
                    <Building2 className="w-3 h-3 text-amber-700" />
                    <span>+ Gerenciar Endereços</span>
                  </button>
                </div>
                <select
                  value={launchGalpaoId}
                  onChange={(e) => setLaunchGalpaoId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition"
                  required
                >
                  {galpoes.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.nome} — {g.endereco} ({g.cidadeUf})
                    </option>
                  ))}
                </select>
                {(() => {
                  const selG = galpoes.find(g => g.id === launchGalpaoId);
                  if (selG) {
                    return (
                      <div className="text-[11px] text-amber-800 flex items-center gap-1.5 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span><strong>Endereço de Entrega:</strong> {selG.endereco} - {selG.cidadeUf} {selG.responsavel ? `• Encarregado: ${selG.responsavel}` : ""}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Item da AUTEX (Espécie + Dono) */}
              {currentLaunchAutex && currentLaunchAutex.items.length > 0 && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Cota da Espécie / Proprietário no Manejo *
                  </label>
                  <select
                    value={launchItemId}
                    onChange={(e) => {
                      setLaunchItemId(e.target.value);
                      const it = currentLaunchAutex.items.find(i => i.id === e.target.value);
                      if (it) {
                        setLaunchEspecie(it.especie);
                        setLaunchDono(it.dono);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  >
                    {currentLaunchAutex.items.map(it => (
                      <option key={it.id} value={it.id}>
                        {it.especie} — Dono: {it.dono} (Cota Total: {it.volumeAutorizado} m³)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Volume, Placa, NF-e e Data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Volume das Toras (m³) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    placeholder="Ex: 28.500"
                    value={launchVolume}
                    onChange={(e) => setLaunchVolume(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Placa do Caminhão
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1234"
                    value={launchPlaca}
                    onChange={(e) => setLaunchPlaca(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    NF-e / Guia Florestal
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 001245"
                    value={launchNfe}
                    onChange={(e) => setLaunchNfe(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Data do Transporte
                  </label>
                  <input
                    type="date"
                    value={launchData}
                    onChange={(e) => setLaunchData(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-200" />
                  <span>Confirmar Entrada no Galpão</span>
                </button>
              </div>

            </form>
          </div>

          {/* Quick Info Side */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm space-y-3">
              <span className="text-amber-400 font-bold uppercase text-[10px] tracking-wider block">Como funciona o Módulo de Galpão?</span>
              <h4 className="text-sm font-extrabold text-white">Segregação Logística Externa</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quando uma carga sai da floresta (manejo) com destino a um galpão externo de estocagem, ela <strong>não é contabilizada na serraria</strong>.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4 pt-1">
                <li>O saldo é abatido do plano de manejo normalmente.</li>
                <li>As toras entram no saldo exclusivo do galpão de destino.</li>
                <li>Você pode registrar vendas diretas de toras ou transferências futuras.</li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB 3: EXPEDIÇÕES / SAÍDAS DO GALPÃO --- */}
      {activeSubTab === "expedicoes" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  <span>Expedições e Saídas de Toras do Galpão</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Registro de vendas diretas, transferências para serraria e saídas de madeira bruta.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDispatchGalpaoId(galpoes[0]?.id || "");
                  setDispatchEspecie(uniqueSpecies[0] || "");
                  setDispatchDono(uniqueOwners[0] || "");
                  setDispatchVolume("");
                  setIsDispatchModalOpen(true);
                }}
                className="text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1 cursor-pointer no-print"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                <span>+ Nova Expedição</span>
              </button>
            </div>

            {dispatches.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <ArrowUpRight className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Nenhuma expedição registrada até o momento.</p>
                <p className="mt-1">Use o botão "+ Nova Expedição" ou acesse a tabela de estoque para expedir toras armazenadas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wide">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Galpão de Origem</th>
                      <th className="px-4 py-3">Espécie & Dono</th>
                      <th className="px-4 py-3">Tipo de Saída</th>
                      <th className="px-4 py-3">Destinatário / Cliente</th>
                      <th className="px-4 py-3">Placa / Doc</th>
                      <th className="px-4 py-3 text-right">Volume (m³)</th>
                      <th className="px-4 py-3 text-center no-print">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dispatches.map((disp) => (
                      <tr key={disp.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{disp.dataSaida}</td>
                        <td className="px-4 py-3 font-bold text-amber-900">{disp.galpaoNome}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{disp.especie}</div>
                          <div className="text-[10px] text-slate-500">Dono: {disp.dono}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded">
                            {disp.tipoSaida}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{disp.destinatario}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {disp.placaCaminhao || "—"} {disp.documentoRef ? `(Doc: ${disp.documentoRef})` : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-extrabold text-rose-700 text-sm">
                          {disp.volume.toFixed(3)} m³
                        </td>
                        <td className="px-4 py-3 text-center no-print">
                          <button
                            type="button"
                            onClick={() => handleDeleteDispatch(disp.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Excluir registro de expedição"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* --- SUB-TAB 4: CADASTRO DE GALPÕES & ENDEREÇOS --- */}
      {activeSubTab === "galpoes" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>Locais de Armazenamento & Galpões Cadastrados</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Gerencie os endereços físicos dos galpões externos de estocagem de toras.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsManageGalpoesModalOpen(true)}
              className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Cadastrar / Editar Galpões</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {galpoes.map((g) => {
              // Calculate current stock in this specific galpão
              const itemsInThisGalpao = stockInventory.filter(i => i.galpaoId === g.id);
              const totalM3 = itemsInThisGalpao.reduce((acc, i) => acc + i.saldoAtual, 0);

              return (
                <div key={g.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-extrabold text-slate-900 text-sm leading-snug">{g.nome}</h4>
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold font-mono px-2 py-0.5 rounded shrink-0">
                        {totalM3.toFixed(2)} m³ estocado
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      <div className="flex items-start gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <span>{g.endereco} — <strong className="text-slate-900">{g.cidadeUf}</strong></span>
                      </div>
                      {g.pontoReferencia && (
                        <div className="text-[11px] text-slate-500 pl-5">
                          Ref: {g.pontoReferencia}
                        </div>
                      )}
                      {(g.responsavel || g.telefone) && (
                        <div className="flex items-center gap-3 text-[11px] text-slate-600 pl-5 pt-1">
                          {g.responsavel && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{g.responsavel}</span>
                            </span>
                          )}
                          {g.telefone && (
                            <span className="flex items-center gap-1 font-mono text-emerald-700 font-bold">
                              <Phone className="w-3 h-3 text-emerald-500" />
                              <span>{g.telefone}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">
                      {g.capacidadeM3 ? `Capacidade: ${g.capacidadeM3.toLocaleString("pt-BR")} m³` : "Sem limite cadastrado"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setGalpaoFilter(g.id);
                        setActiveSubTab("estoque");
                      }}
                      className="text-amber-700 hover:text-amber-900 font-bold text-xs cursor-pointer"
                    >
                      Ver Estoque &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- SUB-TAB 5: HISTÓRICO ANALÍTICO DE CARGAS (ENTRADAS DO MANEJO) --- */}
      {activeSubTab === "historico" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Histórico Analítico de Entradas do Manejo para Galpões</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Detalhamento individual de cada carga ou NF-e transferida para armazenagem externa.</p>
              </div>
            </div>

            {galpaoDeductions.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-bold text-slate-600 text-sm">Nenhuma entrada do manejo registrada para galpões.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wide">
                      <th className="px-4 py-3">Data Emissão</th>
                      <th className="px-4 py-3">NF-e / Guia</th>
                      <th className="px-4 py-3">Galpão de Destino</th>
                      <th className="px-4 py-3">Endereço de Entrega</th>
                      <th className="px-4 py-3">Espécie</th>
                      <th className="px-4 py-3">Dono</th>
                      <th className="px-4 py-3">Placa</th>
                      <th className="px-4 py-3 text-right">Volume (m³)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {galpaoDeductions.map((ded) => (
                      <tr key={ded.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{ded.dataEmissao}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{ded.numeroNfe}</td>
                        <td className="px-4 py-3 font-bold text-amber-900">{ded.galpaoDestino || "Galpão Central"}</td>
                        <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs truncate" title={ded.galpaoEndereco || ""}>
                          {ded.galpaoEndereco || "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">{ded.especie}</td>
                        <td className="px-4 py-3 text-slate-600">{ded.dono}</td>
                        <td className="px-4 py-3 font-mono text-slate-700">{ded.placaCaminhao || "—"}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                          {ded.volume.toFixed(3)} m³
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
                    <tr>
                      <td colSpan={7} className="px-4 py-3 uppercase tracking-wider font-extrabold text-slate-700">
                        Total Recebido do Manejo ({galpaoDeductions.length} Cargas)
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-black text-emerald-900 text-sm">
                        {galpaoDeductions.reduce((a, b) => a + b.volume, 0).toFixed(3)} m³
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: EXPEDIÇÃO / SAÍDA DO GALPÃO --- */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-400" />
                <h3 className="font-extrabold text-sm text-white">Registrar Expedição / Saída do Galpão</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Galpão de Origem *
                  </label>
                  <select
                    value={dispatchGalpaoId}
                    onChange={(e) => setDispatchGalpaoId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  >
                    {galpoes.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Tipo de Movimentação *
                  </label>
                  <select
                    value={dispatchTipo}
                    onChange={(e) => setDispatchTipo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  >
                    <option value="Venda Direta">Venda Direta de Toras</option>
                    <option value="Transferência Serraria">Transferência para Serraria</option>
                    <option value="Transferência Outro Galpão">Transferência para Outro Galpão</option>
                    <option value="Uso Próprio">Uso Próprio</option>
                    <option value="Outro">Outro Motivo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Espécie *
                  </label>
                  <input
                    type="text"
                    value={dispatchEspecie}
                    onChange={(e) => setDispatchEspecie(e.target.value)}
                    placeholder="Ex: Ipê"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Proprietário / Dono *
                  </label>
                  <input
                    type="text"
                    value={dispatchDono}
                    onChange={(e) => setDispatchDono(e.target.value)}
                    placeholder="Ex: Fazenda Santa Maria"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Volume a Expedir (m³) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={dispatchVolume}
                    onChange={(e) => setDispatchVolume(e.target.value)}
                    placeholder="Ex: 15.200"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/15 focus:border-rose-600 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Data da Saída *
                  </label>
                  <input
                    type="date"
                    value={dispatchData}
                    onChange={(e) => setDispatchData(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Destinatário / Cliente / Local de Entrega *
                </label>
                <input
                  type="text"
                  value={dispatchDestinatario}
                  onChange={(e) => setDispatchDestinatario(e.target.value)}
                  placeholder="Ex: Construtora Norte S/A - Obra Belém"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    value={dispatchPlaca}
                    onChange={(e) => setDispatchPlaca(e.target.value)}
                    placeholder="Ex: QWE-9876"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs uppercase font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    NF-e / CTRC / Guia
                  </label>
                  <input
                    type="text"
                    value={dispatchDocRef}
                    onChange={(e) => setDispatchDocRef(e.target.value)}
                    placeholder="Ex: NF 4589"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDispatchModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar Saída do Galpão</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: GERENCIAMENTO DE GALPÕES & ENDEREÇOS --- */}
      <ManageGalpoesModal
        isOpen={isManageGalpoesModalOpen}
        onClose={() => setIsManageGalpoesModalOpen(false)}
      />

    </div>
  );
}
