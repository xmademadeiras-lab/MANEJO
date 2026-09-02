/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { NfeDeduction } from "../types";
import { 
  Truck, 
  Search, 
  MapPin, 
  TrendingUp, 
  Calculator, 
  AlertCircle, 
  Calendar, 
  Plus, 
  Maximize2, 
  User,
  Scale,
  Gauge,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  ArrowRight,
  Warehouse,
  Factory
} from "lucide-react";
import { getRegisteredSerrarias, getRegisteredPatios } from "../lib/sawmillsData";

interface LogisticaModuleProps {
  deductions: NfeDeduction[];
  onSaveDeductions?: (list: NfeDeduction[], description?: string) => void;
}

interface CustomTruckData {
  id: string;
  placa: string;
  modelo: string;
  motorista: string;
  capacidadeMaxM3: number;
}

export default function LogisticaModule({ deductions, onSaveDeductions }: LogisticaModuleProps) {
  // Local storage for registered trucks list
  const [trucksList, setTrucksList] = useState<CustomTruckData[]>([]);

  // Directory of sawmills and patios
  const [registeredSerrarias, setRegisteredSerrarias] = useState<string[]>([]);
  const [registeredPatios, setRegisteredPatios] = useState<string[]>([]);

  // Form state for registering new carrier truck
  const [newPlaca, setNewPlaca] = useState("");
  const [newModelo, setNewModelo] = useState("");
  const [newMotorista, setNewMotorista] = useState("");
  const [newCapacidade, setNewCapacidade] = useState("45");

  // Filters
  const [truckFilter, setTruckFilter] = useState("");
  const [filterPatio, setFilterPatio] = useState("");
  const [filterSerraria, setFilterSerraria] = useState("");
  const [searchPlaca, setSearchPlaca] = useState("");

  // Edit State for Fleet Truck Directory
  const [editingTruck, setEditingTruck] = useState<(CustomTruckData & { isRegistered?: boolean }) | null>(null);
  const [editTruckPlaca, setEditTruckPlaca] = useState("");
  const [editTruckModelo, setEditTruckModelo] = useState("");
  const [editTruckMotorista, setEditTruckMotorista] = useState("");
  const [editTruckCapacidade, setEditTruckCapacidade] = useState("45");
  const [editUpdateHistoricalDeductions, setEditUpdateHistoricalDeductions] = useState(true);

  // Edit State for Specific Shipment / Trip Plate & Yard & Sawmill
  const [editingShipment, setEditingShipment] = useState<{
    numeroNfe: string;
    placaCaminhao: string;
    dono: string;
    dataEmissao: string;
    volume: number;
    serrariaDestino: string;
    patioDescarregamento: string;
  } | null>(null);
  const [editShipmentNewPlaca, setEditShipmentNewPlaca] = useState("");
  const [editShipmentNewPatio, setEditShipmentNewPatio] = useState("");
  const [editShipmentNewSerraria, setEditShipmentNewSerraria] = useState("");
  const [editShipmentSelectedFleetPlaca, setEditShipmentSelectedFleetPlaca] = useState("");
  const [editShipmentScope, setEditShipmentScope] = useState<"single" | "all">("single");

  // Loading configured trucks and directories
  useEffect(() => {
    setRegisteredSerrarias(getRegisteredSerrarias());
    setRegisteredPatios(getRegisteredPatios());

    const saved = localStorage.getItem("logistica_trucks_directory");
    if (saved) {
      try {
        setTrucksList(JSON.parse(saved));
      } catch (e) {
        setTrucksList([]);
      }
    } else {
      // Default sample trucks
      const defaults: CustomTruckData[] = [
        { id: "t1", placa: "MDF-2026", modelo: "Scania R440 Graneleiro", motorista: "Carlos Ribeiro (Zeca)", capacidadeMaxM3: 45 },
        { id: "t2", placa: "PA-5040", modelo: "Mercedes-Benz Atego Vermelho", motorista: "Ademir Souza", capacidadeMaxM3: 35 },
        { id: "t3", placa: "Scania Graneleiro", modelo: "Volvo FH 540 Traçado", motorista: "Marcos Pereira", capacidadeMaxM3: 50 }
      ];
      setTrucksList(defaults);
      localStorage.setItem("logistica_trucks_directory", JSON.stringify(defaults));
    }
  }, []);

  // Save trucks list to local storage
  const saveTrucks = (list: CustomTruckData[]) => {
    setTrucksList(list);
    localStorage.setItem("logistica_trucks_directory", JSON.stringify(list));
  };

  // Register new truck
  const handleAddTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaca.trim()) {
      alert("A identificação ou placa do veículo é obrigatória.");
      return;
    }

    const cleanedPlaca = newPlaca.trim().toUpperCase();
    if (trucksList.some(t => t.placa.toUpperCase() === cleanedPlaca)) {
      alert(`O veículo com a placa/id "${cleanedPlaca}" já está cadastrado.`);
      return;
    }

    const nCap = parseFloat(newCapacidade) || 45;

    const nTruck: CustomTruckData = {
      id: "trk_" + Math.random().toString(36).substr(2, 9),
      placa: cleanedPlaca,
      modelo: newModelo.trim() || "Caminhão não especificado",
      motorista: newMotorista.trim() || "Motorista não informado",
      capacidadeMaxM3: nCap
    };

    const updated = [...trucksList, nTruck];
    saveTrucks(updated);

    // Reset fields
    setNewPlaca("");
    setNewModelo("");
    setNewMotorista("");
    alert("Veículo de transporte cadastrado com sucesso!");
  };

  const handleDeleteTruck = (id: string, placa: string) => {
    if (window.confirm(`Deseja remover o cadastro do caminhão [${placa}]? Isso não afetará os lançamentos de faturamento retroativos.`)) {
      const updated = trucksList.filter(t => t.id !== id);
      saveTrucks(updated);
    }
  };

  // Handlers for Editing Fleet Vehicle
  const handleStartEditTruck = (truck: CustomTruckData & { isRegistered?: boolean }) => {
    setEditingTruck(truck);
    setEditTruckPlaca(truck.placa);
    setEditTruckModelo(truck.modelo || "");
    setEditTruckMotorista(truck.motorista || "");
    setEditTruckCapacidade(truck.capacidadeMaxM3 ? truck.capacidadeMaxM3.toString() : "45");
    setEditUpdateHistoricalDeductions(true);
  };

  const handleSaveEditTruck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTruck) return;

    const cleanedOldPlaca = editingTruck.placa.trim().toUpperCase();
    const cleanedNewPlaca = editTruckPlaca.trim().toUpperCase();

    if (!cleanedNewPlaca) {
      alert("A placa ou identificação do veículo não pode ficar em branco.");
      return;
    }

    // Check if new plate collides with a DIFFERENT registered truck
    const plateCollision = trucksList.some(
      t => t.id !== editingTruck.id && t.placa.toUpperCase() === cleanedNewPlaca
    );
    if (plateCollision) {
      alert(`A placa "${cleanedNewPlaca}" já está cadastrada para outro veículo.`);
      return;
    }

    const nCap = parseFloat(editTruckCapacidade) || 45;

    let updatedList: CustomTruckData[];
    if (editingTruck.isRegistered) {
      updatedList = trucksList.map(t => {
        if (t.id === editingTruck.id) {
          return {
            ...t,
            placa: cleanedNewPlaca,
            modelo: editTruckModelo.trim() || "Caminhão não especificado",
            motorista: editTruckMotorista.trim() || "Motorista não informado",
            capacidadeMaxM3: nCap
          };
        }
        return t;
      });
    } else {
      // Registering an external truck that was edit-saved
      const newRegisteredTruck: CustomTruckData = {
        id: "trk_" + Math.random().toString(36).substr(2, 9),
        placa: cleanedNewPlaca,
        modelo: editTruckModelo.trim() || "Caminhão Externo",
        motorista: editTruckMotorista.trim() || "Não Cadastrado",
        capacidadeMaxM3: nCap
      };
      updatedList = [...trucksList, newRegisteredTruck];
    }

    saveTrucks(updatedList);

    // Update historical deductions if option selected and plate changed
    if (editUpdateHistoricalDeductions && onSaveDeductions && cleanedOldPlaca !== cleanedNewPlaca) {
      const updatedDeductions = deductions.map(d => {
        if ((d.placaCaminhao || "Não Informado").trim().toUpperCase() === cleanedOldPlaca) {
          return {
            ...d,
            placaCaminhao: cleanedNewPlaca
          };
        }
        return d;
      });
      onSaveDeductions(
        updatedDeductions,
        `Alteração da placa do veículo de "${cleanedOldPlaca}" para "${cleanedNewPlaca}"`
      );
    }

    setEditingTruck(null);
    alert("Dados e placa do veículo atualizados com sucesso!");
  };

  // Handlers for Editing Trip / Shipment Vehicle Plate, Yard & Sawmill
  const handleStartEditShipment = (trip: {
    numeroNfe: string;
    placaCaminhao: string;
    dono: string;
    dataEmissao: string;
    volume: number;
    serrariaDestino: string;
    patioDescarregamento: string;
  }) => {
    setEditingShipment(trip);
    setEditShipmentNewPlaca(trip.placaCaminhao);
    setEditShipmentNewPatio(trip.patioDescarregamento || "Pátio 01 (Principal)");
    setEditShipmentNewSerraria(trip.serrariaDestino || "Serraria Principal (Matriz)");
    const matchedInFleet = trucksList.find(t => t.placa.toUpperCase() === trip.placaCaminhao.toUpperCase());
    setEditShipmentSelectedFleetPlaca(matchedInFleet ? matchedInFleet.placa : "custom");
    setEditShipmentScope("single");
  };

  const handleSaveEditShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    const cleanedOldPlaca = editingShipment.placaCaminhao.trim().toUpperCase();
    const cleanedNewPlaca = editShipmentNewPlaca.trim().toUpperCase();
    const newPatio = editShipmentNewPatio.trim() || "Pátio 01 (Principal)";
    const newSerraria = editShipmentNewSerraria.trim() || "Serraria Principal (Matriz)";

    if (!cleanedNewPlaca) {
      alert("A placa ou identificação do veículo é obrigatória.");
      return;
    }

    if (!onSaveDeductions) {
      alert("Função de salvamento de faturamento não configurada.");
      return;
    }

    const updatedDeductions = deductions.map(d => {
      const dNfe = (d.numeroNfe || "S/N").trim();
      const dPlaca = (d.placaCaminhao || "Não Informado").trim().toUpperCase();

      if (editShipmentScope === "single") {
        if (dNfe === editingShipment.numeroNfe.trim() && dPlaca === cleanedOldPlaca) {
          return {
            ...d,
            placaCaminhao: cleanedNewPlaca,
            patioDescarregamento: newPatio,
            serrariaDestino: newSerraria
          };
        }
      } else {
        if (dPlaca === cleanedOldPlaca) {
          return {
            ...d,
            placaCaminhao: cleanedNewPlaca,
            patioDescarregamento: newPatio,
            serrariaDestino: newSerraria
          };
        }
      }
      return d;
    });

    onSaveDeductions(
      updatedDeductions,
      `Edição de placa (${cleanedNewPlaca}), pátio (${newPatio}) e serraria (${newSerraria}) da NF #${editingShipment.numeroNfe}`
    );

    setEditingShipment(null);
    alert("Dados da viagem, pátio de descarregamento e serraria de destino atualizados com sucesso!");
  };

  // Analytical Calculations from Actual Deductions
  // 1. Grouped volumes and trips per truck from real faturamento logs
  const realTruckStats = useMemo(() => {
    const statsMap: Record<string, { totalVol: number; nfs: Set<string>; species: Set<string>; lastDate: string }> = {};

    deductions.forEach(ded => {
      const originalTruck = (ded.placaCaminhao || "Não Informado").trim();
      
      // Let's match either the exact plate in our directory or try to find a substring match
      let pairedKey = originalTruck;
      const matchedDirect = trucksList.find(t => t.placa.toUpperCase() === originalTruck.toUpperCase());
      if (matchedDirect) {
        pairedKey = matchedDirect.placa;
      }

      const existing = statsMap[pairedKey];
      if (existing) {
        existing.totalVol += ded.volume;
        if (ded.numeroNfe) existing.nfs.add(ded.numeroNfe.trim());
        existing.species.add(ded.especie);
        if (ded.dataEmissao && (!existing.lastDate || ded.dataEmissao > existing.lastDate)) {
          existing.lastDate = ded.dataEmissao;
        }
      } else {
        const setNfs = new Set<string>();
        if (ded.numeroNfe) setNfs.add(ded.numeroNfe.trim());
        statsMap[pairedKey] = {
          totalVol: ded.volume,
          nfs: setNfs,
          species: new Set([ded.especie]),
          lastDate: ded.dataEmissao || ""
        };
      }
    });

    return statsMap;
  }, [deductions, trucksList]);

  // Combine registered trucks with real transport data
  const integratedCarrierList = useMemo(() => {
    // Collect all unique truck references from deduction logs
    const allLogPlates = Array.from(new Set(deductions.map(d => (d.placaCaminhao || "Não Informado").trim())));
    
    // Start with all registered trucks
    const list = trucksList.map(t => {
      const stats = realTruckStats[t.placa] || { totalVol: 0, nfs: new Set<string>(), species: new Set<string>(), lastDate: "-" };
      return {
        id: t.id,
        placa: t.placa,
        modelo: t.modelo,
        motorista: t.motorista,
        capacidadeMaxM3: t.capacidadeMaxM3,
        totalVol: stats.totalVol,
        viagensCount: stats.nfs.size,
        speciesList: Array.from(stats.species),
        ultimaViagem: stats.lastDate,
        isRegistered: true
      };
    });

    // Add trucks that appeared in deductions but aren't registered formally
    allLogPlates.forEach(plate => {
      const isAlreadyRepresented = list.some(x => x.placa.toUpperCase() === plate.toUpperCase());
      if (!isAlreadyRepresented) {
        const stats = realTruckStats[plate] || { totalVol: 0, nfs: new Set<string>(), species: new Set<string>(), lastDate: "-" };
        list.push({
          id: "unreg_" + plate,
          placa: plate,
          modelo: "Caminhão Externo",
          motorista: "Não Cadastrado",
          capacidadeMaxM3: 45, // default assumption
          totalVol: stats.totalVol,
          viagensCount: stats.nfs.size,
          speciesList: Array.from(stats.species),
          ultimaViagem: stats.lastDate,
          isRegistered: false
        });
      }
    });

    // Apply filtering
    return list.filter(item => {
      const matchesSearch = !searchPlaca || item.placa.toLowerCase().includes(searchPlaca.toLowerCase());
      return matchesSearch;
    });

  }, [trucksList, realTruckStats, deductions, searchPlaca]);

  // General statistics
  const logisticsOverview = useMemo(() => {
    let totalM3Logistics = 0;
    const allTripsSec = new Set<string>();
    
    deductions.forEach(d => {
      totalM3Logistics += d.volume;
      if (d.numeroNfe) allTripsSec.add(d.numeroNfe.trim());
    });

    return {
      totalM3Logistics,
      totalTrips: allTripsSec.size,
      activeTrucksCount: Object.keys(realTruckStats).filter(k => k !== "Não Informado").length
    };
  }, [deductions, realTruckStats]);

  // Filter actual single trips/shipments records
  const shipmentsList = useMemo(() => {
    // Map individual deductions to transport trips
    // To present it logically, we group deductions by NFe + Placa combinations
    const tripsGroup: Record<string, {
      numeroNfe: string;
      dataEmissao: string;
      placaCaminhao: string;
      dono: string;
      species: Set<string>;
      volume: number;
      serrariaDestino: string;
      patioDescarregamento: string;
    }> = {};

    deductions.forEach(d => {
      const key = `${d.numeroNfe || "S/N"}||${d.placaCaminhao || "Não Informado"}`;
      if (tripsGroup[key]) {
        tripsGroup[key].volume += d.volume;
        tripsGroup[key].species.add(d.especie);
        if (d.serrariaDestino && !tripsGroup[key].serrariaDestino) {
          tripsGroup[key].serrariaDestino = d.serrariaDestino;
        }
        if (d.patioDescarregamento && !tripsGroup[key].patioDescarregamento) {
          tripsGroup[key].patioDescarregamento = d.patioDescarregamento;
        }
      } else {
        tripsGroup[key] = {
          numeroNfe: d.numeroNfe || "S/N",
          dataEmissao: d.dataEmissao || "-",
          placaCaminhao: d.placaCaminhao || "Não Informado",
          dono: d.dono || "-",
          species: new Set([d.especie]),
          volume: d.volume,
          serrariaDestino: d.serrariaDestino || "Serraria Principal (Matriz)",
          patioDescarregamento: d.patioDescarregamento || "Pátio 01 (Principal)"
        };
      }
    });

    let parsedArray = Object.values(tripsGroup).map(grp => ({
      ...grp,
      especiesFormatted: Array.from(grp.species).join(", ")
    }));

    // Sort by latest date
    parsedArray.sort((a, b) => b.dataEmissao.localeCompare(a.dataEmissao));

    // Filter by selected truck
    if (truckFilter) {
      parsedArray = parsedArray.filter(t => t.placaCaminhao.toLowerCase().includes(truckFilter.toLowerCase()));
    }
    // Filter by patio
    if (filterPatio) {
      parsedArray = parsedArray.filter(t => t.patioDescarregamento.toLowerCase().includes(filterPatio.toLowerCase()));
    }
    // Filter by serraria
    if (filterSerraria) {
      parsedArray = parsedArray.filter(t => t.serrariaDestino.toLowerCase().includes(filterSerraria.toLowerCase()));
    }

    return parsedArray;
  }, [deductions, truckFilter, filterPatio, filterSerraria]);

  return (
    <div className="space-y-6 animate-fade-in" id="workspace-tab-logistica">
      
      {/* Module Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-800" />
            <span>Controle de Logística Integrada & Frotas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle e auditoria de transporte florestal, cargas de caminhões que trouxeram do manejo e monitoramento de capacidade m³.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-100 px-3.5 py-1.5 font-mono text-[11px] rounded-lg text-emerald-805 font-bold shadow-xs">
          <Gauge className="w-4 h-4 text-emerald-600" />
          <span>FROTA ATIVA: <strong className="text-emerald-950 text-xs">{integratedCarrierList.length} CAMINHÕES</strong></span>
        </div>
      </div>

      {/* Logistics KPI Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI 1: Volume Transportado */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Total Escoado</span>
          <div className="text-3xl font-extrabold text-slate-950 mt-1.5 font-mono flex items-baseline gap-1">
            <span>{logisticsOverview.totalM3Logistics.toFixed(3)}</span>
            <span className="text-xs font-normal text-slate-550">m³</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-650">
            <span>Transporte de Tora Roliça</span>
            <span className="text-emerald-600 font-mono text-[10px]">100% Baixado Manejo</span>
          </div>
        </div>

        {/* KPI 2: Total Viagens */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Viagens Realizadas</span>
          <div className="text-3xl font-extrabold text-slate-950 mt-1.5 font-mono">
            <span>{logisticsOverview.totalTrips}</span>
            <span className="text-xs font-normal text-slate-550 ml-1">Cargas</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-650">
            <span>Média por Carga</span>
            <span className="font-mono text-slate-900">
              {logisticsOverview.totalTrips > 0 ? (logisticsOverview.totalM3Logistics / logisticsOverview.totalTrips).toFixed(2) : "0.00"} m³
            </span>
          </div>
        </div>

        {/* KPI 3: Frota Cadastrada */}
        <div className="bg-gradient-to-br from-white to-slate-50/50 p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Faturamento Ativo</span>
          <div className="text-3xl font-extrabold text-slate-950 mt-1.5 font-mono">
            <span>{logisticsOverview.activeTrucksCount}</span>
            <span className="text-xs font-normal text-slate-550 ml-1">Veículos Únicos</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-650">
            <span>Veículos sem cadastro formal</span>
            <span className="font-mono text-rose-600 font-bold uppercase text-[10px]">
              {integratedCarrierList.filter(x => !x.isRegistered).length} Externo(s)
            </span>
          </div>
        </div>

      </div>

      {/* Grid: Trucks Directory Left, Registration Form Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Truck Frota Inventory */}
        <div className="lg:col-span-8 bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-800 rounded-full inline-block"></span>
                <span>Diretório da Frota e Desempenho de Carga</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Visão consolidada de caminhões, motoristas e as capacidades escoadas.</p>
            </div>

            {/* Quick Plate Search */}
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Placa do veículo..."
                value={searchPlaca}
                onChange={(e) => setSearchPlaca(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-slate-55 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integratedCarrierList.map((truck) => {
              // Calculate percentage of typical load carried as visual meter to avoid overweight/underload
              const avgLoad = truck.viagensCount > 0 ? truck.totalVol / truck.viagensCount : 0;
              const loadPercentage = Math.round((avgLoad / truck.capacidadeMaxM3) * 100);

              return (
                <div 
                  key={truck.id} 
                  className={`border p-4 rounded-xl flex flex-col justify-between space-y-3 relative overflow-hidden transition-all hover:bg-slate-50/20 ${
                    truck.isRegistered ? "border-slate-200 bg-white shadow-xs" : "border-dashed border-slate-200 bg-slate-50/40"
                  }`}
                >
                  {/* Watermark of unregistered carrier */}
                  {!truck.isRegistered && (
                    <span className="absolute top-0 right-0 bg-amber-500 text-white font-mono text-[8px] font-bold px-2 py-0.5 rounded-bl shadow-xs uppercase">
                      EXTERNO
                    </span>
                  )}

                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-sm font-bold px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-900 rounded-md inline-block tracking-tight text-center">
                        {truck.placa}
                      </span>
                      <h4 className="text-xs font-bold text-slate-800 mt-1.5 uppercase font-sans tracking-tight">{truck.modelo}</h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Motorista: <strong className="text-slate-700">{truck.motorista}</strong></span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditTruck(truck)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer transition flex items-center gap-1 text-[10px] font-bold"
                        title="Editar placa e dados do veículo"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                      {truck.isRegistered && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTruck(truck.id, truck.placa)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition"
                          title="Excluir cadastro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Volume transported, average and voyages counts */}
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1 text-[10px] text-slate-500">
                    <div>
                      <span className="block text-[8px] uppercase font-bold text-slate-400">TOTAL MOVIDO</span>
                      <span className="font-mono font-bold text-slate-900">{truck.totalVol.toFixed(3)} m³</span>
                    </div>
                    <div className="text-center border-x border-slate-100 px-1">
                      <span className="block text-[8px] uppercase font-bold text-slate-400">VIAGENS</span>
                      <span className="font-mono font-bold text-slate-900">{truck.viagensCount}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[8px] uppercase font-bold text-slate-400">MÉD./CARGA</span>
                      <span className="font-mono font-bold text-slate-900">{avgLoad.toFixed(2)} m³</span>
                    </div>
                  </div>

                  {/* Visual Capacity Overload check meter */}
                  {truck.viagensCount > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-500">
                        <span>Aproveitamento da Caçamba ({truck.capacidadeMaxM3} m³ max):</span>
                        <span className={loadPercentage > 100 ? "text-rose-600 font-mono font-bold animate-pulse" : "font-mono text-emerald-700"}>
                          {loadPercentage}% {loadPercentage > 100 && "⚠️ Excesso"}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${loadPercentage > 100 ? "bg-rose-500" : loadPercentage > 85 ? "bg-amber-500" : "bg-emerald-500"}`} 
                          style={{ width: `${Math.min(100, loadPercentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Species List carried */}
                  {truck.speciesList.length > 0 && (
                    <div className="text-[9px] text-slate-400 uppercase tracking-tighter truncate" title={`Espécies: ${truck.speciesList.join(", ")}`}>
                      <strong>Espécies:</strong> {truck.speciesList.join(", ")}
                    </div>
                  )}
                </div>
              );
            })}

            {integratedCarrierList.length === 0 && (
              <div className="col-span-2 p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Nenhum veículo corresponde à placa pesquisada.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Register New Carrier Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-white to-slate-50/40 p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-700 bg-emerald-50 p-1 rounded-full shrink-0" />
              <span>Cadastrar Novo Veículo</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Habilite análises de volumetria de caminhões e frotas.</p>
          </div>

          <form onSubmit={handleAddTruck} className="space-y-4 pt-1">
            
            {/* Placa Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Placa ou Identificação *
              </label>
              <input
                type="text"
                maxLength={20}
                required
                placeholder="Ex: PLACA-PA-5040"
                value={newPlaca}
                onChange={(e) => setNewPlaca(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
              />
            </div>

            {/* Modelo do Veículo Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Modelo do Caminhão
              </label>
              <input
                type="text"
                placeholder="Ex: Scania R440, Volvo"
                value={newModelo}
                onChange={(e) => setNewModelo(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
              />
            </div>

            {/* Motorista Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Nome do Motorista
              </label>
              <input
                type="text"
                placeholder="Ex: Maurício de Souza"
                value={newMotorista}
                onChange={(e) => setNewMotorista(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
              />
            </div>

            {/* Capacidade M³ Estimada Input */}
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                Capacidade Estimada de Carga (m³)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                placeholder="Ex: 45 ou 32.5"
                value={newCapacidade}
                onChange={(e) => setNewCapacidade(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
              />
              <p className="text-[9px] text-slate-400 mt-1">Digite o limite em m³ para monitoramento de sobrecarga no pátio.</p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 hover:-translate-y-0.5 transition-all duration-150 shadow-sm cursor-pointer"
            >
              Gravar Cadastro
            </button>

          </form>
        </div>

      </div>

      {/* Shipments List & Manifest Trips Audit */}
      <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-slate-805 rounded-full inline-block"></span>
              <span>Histórico de Viagens & Manifesto de Cargas (Manifests Inventory)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Audite faturamentos consolidados e agrupados por viagens específicas realizadas.</p>
          </div>

          {/* Table filter drop */}
          <div className="flex flex-wrap gap-2">
            <select
              value={truckFilter}
              onChange={(e) => setTruckFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg focus:outline-none text-slate-700"
            >
              <option value="">— Filtrar por caminhão —</option>
              {Array.from(new Set(deductions.map(d => (d.placaCaminhao || "Não Informado").trim()))).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={filterPatio}
              onChange={(e) => setFilterPatio(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg focus:outline-none text-slate-700"
            >
              <option value="">— Filtrar por pátio —</option>
              {Array.from(new Set(deductions.map(d => d.patioDescarregamento || "Pátio 01 (Principal)"))).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={filterSerraria}
              onChange={(e) => setFilterSerraria(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs font-bold rounded-lg focus:outline-none text-slate-700"
            >
              <option value="">— Filtrar por serraria —</option>
              {Array.from(new Set(deductions.map(d => d.serrariaDestino || "Serraria Principal (Matriz)"))).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {shipmentsList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
            Nenhuma viagem registrada de escoamento no período selecionado.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-150 rounded-xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wide">
                  <th className="px-4 py-3">Código/Nota NFe</th>
                  <th className="px-4 py-3">Caminhão de Transporte</th>
                  <th className="px-4 py-3">Pátio / Serraria Destino</th>
                  <th className="px-4 py-3">Dono do Lote</th>
                  <th className="px-4 py-3 text-center">Data Emissão</th>
                  <th className="px-4 py-3">Espécies Florestais</th>
                  <th className="px-4 py-3 text-right">Volume Total Escoado</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shipmentsList.map((trip, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">NF #{trip.numeroNfe}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800 bg-slate-50/60 rounded px-2 py-1 inline-block my-2">
                      {trip.placaCaminhao}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded">
                          <Warehouse className="w-3 h-3 text-amber-600" />
                          {trip.patioDescarregamento}
                        </span>
                        <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                          <Factory className="w-2.5 h-2.5 text-slate-400" />
                          {trip.serrariaDestino}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-semibold">{trip.dono}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-500">{trip.dataEmissao}</td>
                    <td className="px-4 py-3 text-slate-500 font-medium truncate max-w-[180px]" title={trip.especiesFormatted}>
                      {trip.especiesFormatted}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 bg-rose-50/10">
                      -{trip.volume.toFixed(3)} m³
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-emerald-50 text-emerald-950 border border-emerald-100 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full inline-block">
                        Entregue
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleStartEditShipment(trip)}
                        className="px-2.5 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition flex items-center gap-1 cursor-pointer mx-auto"
                        title="Editar placa, pátio ou serraria de destino desta viagem"
                      >
                        <Edit2 className="w-3 h-3 text-emerald-700" />
                        <span>Editar Dados</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL 1: EDIT FLEET TRUCK DIRECTORY --- */}
      {editingTruck && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm tracking-tight">Editar Cadastro do Veículo</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTruck(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditTruck} className="p-5 space-y-4">
              
              {/* Placa Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Placa / Identificação do Veículo *
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={editTruckPlaca}
                  onChange={(e) => setEditTruckPlaca(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  placeholder="EX: MDF-2026"
                />
              </div>

              {/* Modelo Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Modelo do Caminhão
                </label>
                <input
                  type="text"
                  value={editTruckModelo}
                  onChange={(e) => setEditTruckModelo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  placeholder="Ex: Scania R440, Volvo"
                />
              </div>

              {/* Motorista Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Nome do Motorista
                </label>
                <input
                  type="text"
                  value={editTruckMotorista}
                  onChange={(e) => setEditTruckMotorista(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  placeholder="Ex: Carlos Ribeiro"
                />
              </div>

              {/* Capacidade Field */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Capacidade Estimada de Carga (m³)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  value={editTruckCapacidade}
                  onChange={(e) => setEditTruckCapacidade(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>

              {/* Checkbox Retroactive Updates */}
              {editingTruck.placa.trim().toUpperCase() !== editTruckPlaca.trim().toUpperCase() && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <label className="flex items-start gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={editUpdateHistoricalDeductions}
                      onChange={(e) => setEditUpdateHistoricalDeductions(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-amber-900 font-medium leading-tight">
                      Atualizar histórico de faturamento: alterar os registros das notas/viagens anteriores com a placa antiga <strong>[{editingTruck.placa}]</strong> para a nova placa.
                    </span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTruck(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Salvar Alterações</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT SHIPMENT / TRIP (PLATE, PATIO & SERRARIA) --- */}
      {editingShipment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200 overflow-hidden animate-scale-in">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm tracking-tight">Editar Dados da Carga / Viagem</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingShipment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEditShipment} className="p-5 space-y-4">
              
              {/* Trip Context Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-800">
                  <span>Nota Fiscal: <strong className="font-mono text-emerald-800">NF #{editingShipment.numeroNfe}</strong></span>
                  <span className="text-slate-500 font-mono text-[11px]">{editingShipment.dataEmissao}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Dono: <strong>{editingShipment.dono}</strong></span>
                  <span className="font-mono font-bold text-rose-600">-{editingShipment.volume.toFixed(3)} m³</span>
                </div>
                <div className="pt-1.5 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Placa Atual:</span>
                    <span className="font-mono font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded border border-amber-200 text-xs">
                      {editingShipment.placaCaminhao}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Pátio Atual:</span>
                    <span className="font-bold text-slate-700 text-xs">
                      {editingShipment.patioDescarregamento}
                    </span>
                  </div>
                </div>
              </div>

              {/* Select from registered fleet dropdown */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Selecionar da Frota Cadastrada
                </label>
                <select
                  value={editShipmentSelectedFleetPlaca}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditShipmentSelectedFleetPlaca(val);
                    if (val && val !== "custom") {
                      setEditShipmentNewPlaca(val);
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                >
                  <option value="custom">— Digitar Placa Personalizada —</option>
                  {trucksList.map(truck => (
                    <option key={truck.id} value={truck.placa}>
                      [{truck.placa}] {truck.modelo} - {truck.motorista}
                    </option>
                  ))}
                </select>
              </div>

              {/* New Placa Text Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Placa do Veículo Transportador *
                </label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={editShipmentNewPlaca}
                  onChange={(e) => {
                    setEditShipmentNewPlaca(e.target.value);
                    setEditShipmentSelectedFleetPlaca("custom");
                  }}
                  placeholder="EX: MDF-2026"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-sm font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>

              {/* Edit Pátio de Descarregamento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                    <Warehouse className="w-3 h-3 text-amber-600" />
                    <span>Pátio de Descarregamento</span>
                  </label>
                  <select
                    value={registeredPatios.includes(editShipmentNewPatio) ? editShipmentNewPatio : "custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "custom") {
                        setEditShipmentNewPatio(val);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition mb-1.5"
                  >
                    {registeredPatios.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    <option value="custom">Outro Pátio...</option>
                  </select>
                  <input
                    type="text"
                    value={editShipmentNewPatio}
                    onChange={(e) => setEditShipmentNewPatio(e.target.value)}
                    placeholder="Nome do Pátio"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                </div>

                {/* Edit Serraria Destino */}
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1 flex items-center gap-1">
                    <Factory className="w-3 h-3 text-emerald-600" />
                    <span>Serraria de Destino</span>
                  </label>
                  <select
                    value={registeredSerrarias.includes(editShipmentNewSerraria) ? editShipmentNewSerraria : "custom"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== "custom") {
                        setEditShipmentNewSerraria(val);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition mb-1.5"
                  >
                    {registeredSerrarias.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                    <option value="custom">Outra Serraria...</option>
                  </select>
                  <input
                    type="text"
                    value={editShipmentNewSerraria}
                    onChange={(e) => setEditShipmentNewSerraria(e.target.value)}
                    placeholder="Nome da Serraria"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                </div>
              </div>

              {/* Scope Radio Group */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                  Escopo da Alteração
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer hover:bg-slate-50 transition text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="editScope"
                      value="single"
                      checked={editShipmentScope === "single"}
                      onChange={() => setEditShipmentScope("single")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Alterar apenas nesta nota/viagem específica (NF #{editingShipment.numeroNfe})</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 border rounded-xl cursor-pointer hover:bg-slate-50 transition text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="editScope"
                      value="all"
                      checked={editShipmentScope === "all"}
                      onChange={() => setEditShipmentScope("all")}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Alterar em TODOS os lançamentos registrados com a placa antiga [{editingShipment.placaCaminhao}]</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingShipment(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Salvar Dados da Carga</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
