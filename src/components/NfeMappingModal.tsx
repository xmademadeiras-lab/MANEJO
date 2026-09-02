/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Autex, NfeImportResult, NfeItem } from "../types";
import { X, Check, AlertTriangle, FileText, Landmark, CheckCircle2, Factory, Warehouse, Truck, PlusCircle, Building2, MapPin } from "lucide-react";
import { 
  getRegisteredSerrarias, 
  getRegisteredPatios, 
  addRegisteredPatio, 
  addRegisteredSerraria 
} from "../lib/sawmillsData";
import { 
  GalpaoEntity, 
  getRegisteredGalpoes 
} from "../lib/galpaoData";
import ManagePatiosModal from "./ManagePatiosModal";
import ManageGalpoesModal from "./ManageGalpoesModal";

interface NfeMappingModalProps {
  isOpen: boolean;
  importResult: NfeImportResult | null;
  activeAutex: Autex;
  onClose: () => void;
  onConfirm: (
    mappedItems: { item: NfeItem; autexItemId: string }[], 
    placaCaminhao: string,
    serrariaDestino?: string,
    patioDescarregamento?: string,
    destinoTipo?: "serraria" | "galpao",
    galpaoDestino?: string,
    galpaoEndereco?: string
  ) => void;
  onAddAutexItem?: (especie: string, dono: string, volumeAutorizado: number) => { id: string; especie: string; dono: string; volumeAutorizado: number } | null;
  initialDestinoTipo?: "serraria" | "galpao";
  initialSerraria?: string;
  initialPatio?: string;
  initialGalpaoId?: string;
}

export default function NfeMappingModal({
  isOpen,
  importResult,
  activeAutex,
  onClose,
  onConfirm,
  onAddAutexItem,
  initialDestinoTipo = "serraria",
  initialSerraria,
  initialPatio,
  initialGalpaoId
}: NfeMappingModalProps) {
  // We keep local independent choices of species and owner for each item index
  const [selectedSpecies, setSelectedSpecies] = useState<Record<number, string>>({});
  const [selectedOwners, setSelectedOwners] = useState<Record<number, string>>({});
  const [placaCaminhao, setPlacaCaminhao] = useState("");
  const [destinoTipo, setDestinoTipo] = useState<"serraria" | "galpao">(initialDestinoTipo);
  const [serrariaDestino, setSerrariaDestino] = useState(initialSerraria || "Serraria Principal (Matriz)");
  const [patioDescarregamento, setPatioDescarregamento] = useState(initialPatio || "Pátio 01 (Principal)");
  const [selectedGalpaoId, setSelectedGalpaoId] = useState(initialGalpaoId || "");

  // Lists of options
  const [registeredSerrarias, setRegisteredSerrarias] = useState<string[]>([]);
  const [registeredPatios, setRegisteredPatios] = useState<string[]>([]);
  const [registeredGalpoes, setRegisteredGalpoes] = useState<GalpaoEntity[]>([]);
  const [isManagePatiosOpen, setIsManagePatiosOpen] = useState(false);
  const [isManageGalpoesOpen, setIsManageGalpoesOpen] = useState(false);
  const [managePatiosTab, setManagePatiosTab] = useState<"patios" | "serrarias">("patios");

  // Track if modal was opened to handle initialization properly
  const [lastOpen, setLastOpen] = useState(false);

  // States for on-the-fly registration of AUTEX items
  const [registeringIndex, setRegisteringIndex] = useState<number | null>(null);
  const [newEspecie, setNewEspecie] = useState("");
  const [newDono, setNewDono] = useState("");
  const [newVolume, setNewVolume] = useState("");

  const refreshAllDestinations = () => {
    const serrarias = getRegisteredSerrarias();
    const patios = getRegisteredPatios();
    const galpoes = getRegisteredGalpoes();
    setRegisteredSerrarias(serrarias);
    setRegisteredPatios(patios);
    setRegisteredGalpoes(galpoes);
    if (galpoes.length > 0 && !selectedGalpaoId) {
      setSelectedGalpaoId(galpoes[0].id);
    }
  };

  useEffect(() => {
    const handler1 = () => refreshAllDestinations();
    const handler2 = () => refreshAllDestinations();
    window.addEventListener("patios_serrarias_updated", handler1);
    window.addEventListener("galpoes_updated", handler2);
    return () => {
      window.removeEventListener("patios_serrarias_updated", handler1);
      window.removeEventListener("galpoes_updated", handler2);
    };
  }, []);

  // Reset mappings and load saved relationships when modal opens
  useEffect(() => {
    if (isOpen && !lastOpen) {
      setLastOpen(true);
      setPlacaCaminhao("");
      setRegisteringIndex(null);
      setDestinoTipo(initialDestinoTipo || "serraria");
      
      const serrarias = getRegisteredSerrarias();
      const patios = getRegisteredPatios();
      const galpoes = getRegisteredGalpoes();
      setRegisteredSerrarias(serrarias);
      setRegisteredPatios(patios);
      setRegisteredGalpoes(galpoes);
      setSerrariaDestino(initialSerraria || (serrarias.length > 0 ? serrarias[0] : "Serraria Principal (Matriz)"));
      setPatioDescarregamento(initialPatio || (patios.length > 0 ? patios[0] : "Pátio 01 (Principal)"));
      setSelectedGalpaoId(initialGalpaoId || (galpoes.length > 0 ? galpoes[0].id : ""));
      
      const initialSpecies: Record<number, string> = {};
      const initialOwners: Record<number, string> = {};

      // Load saved mapping associations from localStorage
      let savedMappings: Record<string, { especie: string; dono: string }> = {};
      try {
        const stored = localStorage.getItem("nfe_xml_saved_mappings");
        if (stored) {
          savedMappings = JSON.parse(stored);
        }
      } catch (e) {
        console.error("Error loading XML mappings:", e);
      }

      if (importResult && activeAutex) {
        importResult.items.forEach((item, index) => {
          const itemKey = item.especie.trim().toLowerCase();
          const savedMeta = savedMappings[itemKey];

          let match = null;

          // 1. Try to find if there's a stored mapping for this XML species and it matches an active AUTEX item
          if (savedMeta) {
            match = activeAutex.items.find(
              ai => ai.especie.toLowerCase().trim() === savedMeta.especie.toLowerCase().trim() &&
                    ai.dono.toLowerCase().trim() === savedMeta.dono.toLowerCase().trim()
            );
          }

          // 2. Try case insensitive name match fallback
          if (!match) {
            match = activeAutex.items.find(
              ai => ai.especie.toLowerCase().trim() === item.especie.toLowerCase().trim()
            );
          }

          if (match) {
            initialSpecies[index] = match.especie;
            initialOwners[index] = match.dono;
          } else {
            // Find first default values or fallback to xml values
            if (activeAutex.items.length > 0) {
              initialSpecies[index] = activeAutex.items[0].especie;
              initialOwners[index] = activeAutex.items[0].dono;
            } else {
              initialSpecies[index] = item.especie;
              initialOwners[index] = item.dono || activeAutex.detentores[0] || "Sem Dono";
            }
          }
        });
        setSelectedSpecies(initialSpecies);
        setSelectedOwners(initialOwners);
      }
    } else if (!isOpen && lastOpen) {
      setLastOpen(false);
    }
  }, [isOpen, importResult, activeAutex, lastOpen]);

  if (!isOpen || !importResult) return null;

  const handleSpeciesChange = (itemIdx: number, especie: string) => {
    setSelectedSpecies(prev => ({ ...prev, [itemIdx]: especie }));

    // Persistently remember this relation!
    const xmlItem = importResult.items[itemIdx];
    const currentOwner = selectedOwners[itemIdx] || "";
    if (xmlItem) {
      const itemKey = xmlItem.especie.trim().toLowerCase();
      let savedMappings: Record<string, { especie: string; dono: string }> = {};
      try {
        const stored = localStorage.getItem("nfe_xml_saved_mappings");
        if (stored) {
          savedMappings = JSON.parse(stored);
        }
      } catch (e) {}

      savedMappings[itemKey] = {
        especie,
        dono: currentOwner
      };
      localStorage.setItem("nfe_xml_saved_mappings", JSON.stringify(savedMappings));
    }
  };

  const handleOwnerChange = (itemIdx: number, dono: string) => {
    setSelectedOwners(prev => ({ ...prev, [itemIdx]: dono }));

    // Update persisted mapping with manual wood owner choice
    const xmlItem = importResult.items[itemIdx];
    const currentSpecies = selectedSpecies[itemIdx] || "";
    if (xmlItem) {
      const itemKey = xmlItem.especie.trim().toLowerCase();
      let savedMappings: Record<string, { especie: string; dono: string }> = {};
      try {
        const stored = localStorage.getItem("nfe_xml_saved_mappings");
        if (stored) {
          savedMappings = JSON.parse(stored);
        }
      } catch (e) {}

      savedMappings[itemKey] = {
        especie: currentSpecies,
        dono
      };
      localStorage.setItem("nfe_xml_saved_mappings", JSON.stringify(savedMappings));
    }
  };

  const handleConfirm = () => {
    const finalMappings: { item: NfeItem; autexItemId: string }[] = [];

    for (let i = 0; i < importResult.items.length; i++) {
      const rawItem = importResult.items[i];
      const spec = selectedSpecies[i] || "";
      const owner = selectedOwners[i] || "";

      if (!spec) {
        alert("Por favor, selecione para qual espécie da AUTEX este saldo dEve abater.");
        return;
      }
      if (!owner) {
        alert("Por favor, selecione para qual dono da AUTEX este saldo dEve abater.");
        return;
      }

      // Find the corresponding autexItemId from activeAutex.items
      let matchedAutexItem = activeAutex.items.find(
        ai => ai.especie.toLowerCase().trim() === spec.toLowerCase().trim() &&
              ai.dono.toLowerCase().trim() === owner.toLowerCase().trim()
      );

      // Dynamically auto-create combination if it is missing but we have onAddAutexItem callback
      if (!matchedAutexItem && onAddAutexItem) {
        // Find existing quota of same species to have a reasonable default volume, otherwise fallback to 1000
        const existingSameSpecies = activeAutex.items.find(ai => ai.especie.toLowerCase().trim() === spec.toLowerCase().trim());
        const defaultVolume = existingSameSpecies ? existingSameSpecies.volumeAutorizado : 1000;
        
        const registered = onAddAutexItem(spec, owner, defaultVolume);
        if (registered) {
          matchedAutexItem = {
            id: registered.id,
            especie: registered.especie,
            dono: registered.dono,
            volumeAutorizado: registered.volumeAutorizado
          };
        }
      }

      if (!matchedAutexItem) {
        alert(`Ocorreu um erro: A combinação da espécie "${spec}" com o dono "${owner}" não pôde ser cadastrada na AUTEX.`);
        return;
      }

      finalMappings.push({
        item: {
          ...rawItem,
          especie: matchedAutexItem.especie,
          dono: matchedAutexItem.dono,
          autexItemId: matchedAutexItem.id,
        },
        autexItemId: matchedAutexItem.id
      });
    }

    // Auto register patio and serraria if they are new
    if (destinoTipo === "serraria") {
      if (patioDescarregamento && patioDescarregamento.trim()) {
        addRegisteredPatio(patioDescarregamento.trim());
      }
      if (serrariaDestino && serrariaDestino.trim()) {
        addRegisteredSerraria(serrariaDestino.trim());
      }
      onConfirm(finalMappings, placaCaminhao, serrariaDestino, patioDescarregamento, "serraria");
    } else {
      const gEntity = registeredGalpoes.find(g => g.id === selectedGalpaoId) || registeredGalpoes[0];
      const gNome = gEntity?.nome || "Galpão Principal";
      const gEnd = gEntity ? `${gEntity.endereco} (${gEntity.cidadeUf})` : "Endereço cadastrado";
      onConfirm(finalMappings, placaCaminhao, undefined, undefined, "galpao", gNome, gEnd);
    }
    
    onClose();
  };

  // --- Inline fast registration functions ---
  const startRegistration = (idx: number) => {
    const xmlItem = importResult.items[idx];
    setRegisteringIndex(idx);
    setNewEspecie(xmlItem.especie);
    setNewDono(xmlItem.dono || activeAutex.detentores[0] || "");
    // Pre-fill with a reasonable volume authorized
    setNewVolume(Math.max(100, Math.ceil(xmlItem.volume * 2.5)).toString());
  };

  const handleCancelRegistration = () => {
    setRegisteringIndex(null);
  };

  const handleCreateNewAutexItem = (idx: number) => {
    if (!onAddAutexItem) {
      alert("Ação de cadastro rápido indisponível.");
      return;
    }
    const vol = parseFloat(newVolume);
    if (!newEspecie.trim()) {
      alert("Informe o nome da espécie.");
      return;
    }
    if (!newDono.trim()) {
      alert("Informe o proprietário/dono da madeira.");
      return;
    }
    if (isNaN(vol) || vol <= 0) {
      alert("Insira um volume autorizado válido maior que zero.");
      return;
    }

    const registered = onAddAutexItem(newEspecie.trim(), newDono.trim(), vol);
    if (registered) {
      // 1. Immediately map this item
      setSelectedSpecies(prev => ({ ...prev, [idx]: registered.especie }));
      setSelectedOwners(prev => ({ ...prev, [idx]: registered.dono }));

      // 2. Persist the relation so that it stays mapped next time
      const xmlItem = importResult.items[idx];
      const itemKey = xmlItem.especie.trim().toLowerCase();
      let savedMappings: Record<string, { especie: string; dono: string }> = {};
      try {
        const stored = localStorage.getItem("nfe_xml_saved_mappings");
        if (stored) {
          savedMappings = JSON.parse(stored);
        }
      } catch (e) {}

      savedMappings[itemKey] = {
        especie: registered.especie,
        dono: registered.dono
      };
      localStorage.setItem("nfe_xml_saved_mappings", JSON.stringify(savedMappings));

      // Close registration card
      setRegisteringIndex(null);
    } else {
      alert("Ocorreu um erro ao registrar a espécie no contrato.");
    }
  };

  // Extract unique species and owners for selection menus
  const uniqueAutexSpecies = Array.from(new Set(activeAutex.items.map(ai => ai.especie)));
  const uniqueAutexOwners = Array.from(new Set([
    ...activeAutex.detentores,
    ...activeAutex.items.map(ai => ai.dono)
  ])).filter(Boolean);

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="nfe-mapping-modal-overlay">
      <div 
        className="bg-white border border-slate-200 shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden rounded-2xl"
        id="nfe-mapping-modal-container"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-slate-200 bg-emerald-50 flex items-center justify-center rounded-xl shadow-xs">
              <FileText className="w-5 h-5 text-emerald-800" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Mapeamento da NF-e nº {importResult.numeroNfe}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Associe a espécie e o dono separadamente para cada item da nota fiscal</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 font-bold p-1.5 hover:bg-slate-100 rounded-lg transition"
            id="close-nfe-mapping-modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="px-5 py-3.5 bg-emerald-950 text-white flex flex-wrap gap-x-8 gap-y-2 text-xs">
          <div className="flex items-center gap-1.5 align-middle">
            <span className="font-bold text-emerald-300 uppercase tracking-wider">Emitente:</span>
            <span className="truncate max-w-[200px] font-medium">{importResult.emitenteNome}</span>
          </div>
          <div className="flex items-center gap-1.5 align-middle">
            <span className="font-bold text-emerald-300 uppercase tracking-wider">Destinatário:</span>
            <span className="truncate max-w-[200px] font-medium">{importResult.destinatarioNome}</span>
          </div>
          <div className="flex items-center gap-1.5 align-middle">
            <span className="font-bold text-emerald-300 uppercase tracking-wider">Emissão:</span>
            <span className="font-mono text-slate-200 font-medium">{importResult.dataEmissao}</span>
          </div>
          <div className="flex items-center gap-1.5 align-middle ml-auto">
            <span className="font-bold text-yellow-405 uppercase tracking-wider">AUTEX:</span>
            <span className="font-mono font-bold text-yellow-350">{activeAutex.numero}</span>
          </div>
        </div>

        {/* Truck & Destination Routing (Serraria vs Galpão Externo) */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 space-y-3">
          
          {/* Destination Type Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/70">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Destino Físico das Toras:</span>
              <div className="inline-flex bg-slate-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setDestinoTipo("serraria")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                    destinoTipo === "serraria"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Factory className="w-3 h-3" />
                  <span>Serraria (Pátio de Desdobro)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDestinoTipo("galpao")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
                    destinoTipo === "galpao"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Warehouse className="w-3 h-3" />
                  <span>Galpão / Depósito (Outro Endereço)</span>
                </button>
              </div>
            </div>

            {destinoTipo === "galpao" ? (
              <span className="text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                ⚠️ Não entra no pátio da Serraria (armazenamento externo)
              </span>
            ) : (
              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                ✓ Entra no estoque bruto da Serraria para desdobro
              </span>
            )}
          </div>

          {/* Dynamic Destination Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            
            {/* Veículo / Placa */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Truck className="w-3.5 h-3.5 text-slate-700" />
                <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Veículo (Placa / Caminhão):</label>
              </div>
              <input
                type="text"
                placeholder="Ex: ABC-1234 / Scania"
                value={placaCaminhao}
                onChange={(e) => setPlacaCaminhao(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 focus:outline-none placeholder-slate-400 uppercase"
              />
            </div>

            {destinoTipo === "serraria" ? (
              <>
                {/* Serraria Destino */}
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-emerald-700" />
                      <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Lançar para Serraria:</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setManagePatiosTab("serrarias");
                        setIsManagePatiosOpen(true);
                      }}
                      className="text-[9px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-0.5 cursor-pointer"
                      title="Cadastrar nova Serraria"
                    >
                      <PlusCircle className="w-3 h-3" /> + Nova
                    </button>
                  </div>
                  <input
                    type="text"
                    list="xml-serrarias-list"
                    value={serrariaDestino}
                    onChange={(e) => setSerrariaDestino(e.target.value)}
                    placeholder="Selecione ou digite a serraria"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 focus:outline-none text-emerald-950"
                  />
                  <datalist id="xml-serrarias-list">
                    {registeredSerrarias.map(s => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Pátio de Descarregamento */}
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-amber-700" />
                      <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Pátio do Descarregamento:</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setManagePatiosTab("patios");
                        setIsManagePatiosOpen(true);
                      }}
                      className="text-[9px] font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-0.5 cursor-pointer"
                      title="Adicionar outro pátio para não misturar toras"
                    >
                      <PlusCircle className="w-3 h-3" /> + Novo Pátio
                    </button>
                  </div>
                  <input
                    type="text"
                    list="xml-patios-list"
                    value={patioDescarregamento}
                    onChange={(e) => setPatioDescarregamento(e.target.value)}
                    placeholder="Selecione ou digite o pátio"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-xs focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 focus:outline-none text-amber-950"
                  />
                  <datalist id="xml-patios-list">
                    {registeredPatios.map(p => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>
              </>
            ) : (
              /* Galpão Selector (Span 2 cols) */
              <div className="md:col-span-2">
                <div className="flex items-center justify-between gap-1.5 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    <label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Galpão / Depósito de Destino (Outro Endereço):</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsManageGalpoesOpen(true)}
                    className="text-[9px] font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-0.5 cursor-pointer"
                    title="Cadastrar ou editar galpões com novos endereços"
                  >
                    <PlusCircle className="w-3 h-3" /> + Gerenciar Galpões / Endereços
                  </button>
                </div>
                <select
                  value={selectedGalpaoId}
                  onChange={(e) => setSelectedGalpaoId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg font-bold text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none text-amber-950"
                >
                  {registeredGalpoes.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.nome} — {g.endereco} ({g.cidadeUf})
                    </option>
                  ))}
                </select>
                {(() => {
                  const g = registeredGalpoes.find(x => x.id === selectedGalpaoId);
                  if (g) {
                    return (
                      <div className="text-[10px] text-amber-800 flex items-center gap-1 mt-1 truncate">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span><strong>Endereço:</strong> {g.endereco} - {g.cidadeUf} {g.responsavel ? `• Resp: ${g.responsavel}` : ""}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

          </div>
        </div>

        {/* Items mapping list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">
            <span>DADOS EXTRAÍDOS DO XML</span>
            <span>VINCULAÇÃO DE LICENÇA (VIGENTE)</span>
          </div>

          <div className="space-y-4">
            {importResult.items.map((item, idx) => {
              const specVal = selectedSpecies[idx] || "";
              const ownerVal = selectedOwners[idx] || "";

              // Find matching AUTEX item
              const matchedAutexRow = activeAutex.items.find(
                ai => ai.especie.toLowerCase().trim() === specVal.toLowerCase().trim() &&
                      ai.dono.toLowerCase().trim() === ownerVal.toLowerCase().trim()
              );

              const isEspecieMismatch = specVal.toLowerCase().trim() !== item.especie.toLowerCase().trim();

              return (
                <div 
                  key={idx} 
                  className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 transition flex flex-col gap-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    {/* Left part: parsed XML item details */}
                    <div className="md:col-span-12 lg:col-span-5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 font-bold uppercase rounded-md">Item #{idx + 1}</span>
                        <span className="text-base font-extrabold text-slate-900">{item.especie}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                        <div>
                          <span>Volume XML:</span>{" "}
                          <span className="font-mono text-rose-600 font-bold">{item.volume.toFixed(4)} m³</span>
                        </div>
                        {item.dono && (
                          <div>
                            <span>Dono declarado:</span>{" "}
                            <span className="text-slate-700 font-mono italic max-w-[120px] inline-block truncate align-bottom">{item.dono}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Icon */}
                    <div className="hidden lg:flex lg:col-span-1 justify-center">
                      <Check className="w-5 h-5 text-emerald-650 bg-emerald-50 rounded-full p-0.5" />
                    </div>

                    {/* Right part: mapping choices in distinct columns */}
                    <div className="md:col-span-12 lg:col-span-6 space-y-2.5">
                      
                      {/* Grid with separate Espécie and Proprietário/Dono selectors */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Espécie Column Selector */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Espécie na AUTEX</label>
                            <span className="text-[8px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded-md font-bold uppercase tracking-tight">Liberado</span>
                          </div>
                          <select
                            value={selectedSpecies[idx] || ""}
                            onChange={e => handleSpeciesChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-bold"
                          >
                            {uniqueAutexSpecies.length === 0 ? (
                              <option value="">Sem espécie cadastrada</option>
                            ) : (
                              uniqueAutexSpecies.map(esp => (
                                <option key={esp} value={esp}>
                                  {esp}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* Dono Column Selector */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider font-bold">Dono na AUTEX</label>
                          </div>
                          <select
                            value={selectedOwners[idx] || ""}
                            onChange={e => handleOwnerChange(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-600 font-bold"
                          >
                            {uniqueAutexOwners.length === 0 ? (
                              <option value="">Sem dono cadastrado</option>
                            ) : (
                              uniqueAutexOwners.map(dono => (
                                <option key={dono} value={dono}>
                                  {dono}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                      </div>

                      {/* Display Balance & Alignment Check */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                        {/* Matching validation badge */}
                        <div>
                          {isEspecieMismatch ? (
                            <div className="flex items-center gap-1.5 text-amber-805 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 text-[9px] font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                              <span>Espécie divergente do XML</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-emerald-950 bg-emerald-50/50 border border-emerald-200 rounded-lg px-2.5 py-1 text-[9px] font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-650" />
                              <span>Espécie correspondente</span>
                            </div>
                          )}
                        </div>

                        {/* Balance check */}
                        <div>
                          {matchedAutexRow ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[9px] font-mono text-slate-600 font-bold flex items-center justify-between">
                              <span className="uppercase text-[8px] text-slate-400 font-sans tracking-tight">SALDO ATUAL:</span>
                              <span>{matchedAutexRow.volumeAutorizado.toFixed(3)} m³</span>
                            </div>
                          ) : (
                            <div className="bg-rose-50 border border-rose-200 rounded-lg px-2 py-1 text-[9px] font-bold text-rose-800 flex items-center justify-center leading-tight">
                              <span>⚠️ Sem cota cadastrada</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Inline Register Option Section */}
                  <div className="border-t border-slate-100 pt-2 text-xs">
                    {registeringIndex === idx ? (
                      <div className="p-4 bg-amber-50/20 border border-dashed border-amber-200 rounded-xl space-y-3 animate-fade-in">
                        <div className="flex justify-between items-center bg-slate-900 p-2 text-white text-[9px] font-bold uppercase tracking-wider rounded-lg">
                          <span>⚙️ Cadastro Rápido de Espécie / Cota na AUTEX</span>
                          <button
                            type="button"
                            onClick={handleCancelRegistration}
                            className="text-amber-200 hover:text-white text-[9px] font-bold uppercase transition"
                          >
                            Cancelar
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-semibold">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Espécie do Manejo (Produto)</label>
                            <input
                              type="text"
                              value={newEspecie}
                              onChange={(e) => setNewEspecie(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                              placeholder="Ex: Cedro"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Proprietário / Dono</label>
                            <input
                              type="text"
                              list={`new-dono-datalist-${idx}`}
                              value={newDono}
                              onChange={(e) => setNewDono(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                              placeholder="Digite ou selecione"
                            />
                            <datalist id={`new-dono-datalist-${idx}`}>
                              {activeAutex.detentores.map(det => (
                                <option key={det} value={det} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Cota M³ Autorizada</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                step="0.001"
                                value={newVolume}
                                onChange={(e) => setNewVolume(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold font-mono"
                                placeholder="Cota"
                              />
                              <button
                                type="button"
                                onClick={() => setNewVolume(item.volume.toString())}
                                className="px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg font-bold text-[8px] uppercase tracking-tighter shrink-0"
                                title="Preencher com o volume exato da NFe"
                              >
                                Copiar NF
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={handleCancelRegistration}
                            className="px-3 py-1.5 text-[9px] bg-slate-100 font-bold uppercase rounded-lg border border-slate-200 hover:bg-slate-200"
                          >
                            Voltar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateNewAutexItem(idx)}
                            className="px-4 py-1.5 text-[9px] bg-emerald-900 hover:bg-emerald-800 text-white font-bold uppercase rounded-lg shadow-sm"
                          >
                            Gravar & Vincular Cota
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-[11px] p-2 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 font-semibold">
                        <span>A espécie <strong>"{item.especie}"</strong> com dono <strong>"{item.dono || "Não Declarado"}"</strong> não possui a cota ideal cadastrada na AUTEX ativa?</span>
                        <button
                          type="button"
                          onClick={() => startRegistration(idx)}
                          className="px-2.5 py-1 text-[10px] bg-white border border-slate-200 hover:bg-slate-50 font-bold transition rounded-lg text-slate-700 shadow-xs uppercase font-sans text-[8px] tracking-tight"
                        >
                          + Criar Cota AUTEX
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center bg-slate-50 gap-4">
          <div className="flex items-center gap-2 text-rose-600 text-xs font-bold uppercase tracking-wider text-center sm:text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>O volume será abatido permanentemente da AUTEX ativa.</span>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 text-xs font-bold uppercase rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-emerald-950 text-white hover:bg-emerald-900 font-bold uppercase tracking-wider text-xs rounded-xl shadow-xs transition flex items-center gap-2"
              id="confirm-mapping-btn"
            >
              Confirmar & Abater Saldo
            </button>
          </div>
        </div>
      </div>

      <ManagePatiosModal
        isOpen={isManagePatiosOpen}
        onClose={() => setIsManagePatiosOpen(false)}
        initialTab={managePatiosTab}
        onUpdated={refreshAllDestinations}
      />

      <ManageGalpoesModal
        isOpen={isManageGalpoesOpen}
        onClose={() => setIsManageGalpoesOpen(false)}
        onSelectGalpao={(g) => {
          setSelectedGalpaoId(g.id);
          refreshAllDestinations();
        }}
      />
    </div>
  );
}
