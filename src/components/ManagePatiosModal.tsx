/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Warehouse, Factory, Plus, Trash2, Check, X, AlertCircle, Sparkles } from "lucide-react";
import { 
  getRegisteredPatios, 
  saveRegisteredPatios, 
  getRegisteredSerrarias, 
  saveRegisteredSerrarias,
  DEFAULT_PATIOS,
  DEFAULT_SERRARIAS
} from "../lib/sawmillsData";

interface ManagePatiosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  initialTab?: "patios" | "serrarias";
}

export default function ManagePatiosModal({
  isOpen,
  onClose,
  onUpdated,
  initialTab = "patios"
}: ManagePatiosModalProps) {
  const [activeTab, setActiveTab] = useState<"patios" | "serrarias">(initialTab);
  const [patios, setPatios] = useState<string[]>(() => getRegisteredPatios());
  const [serrarias, setSerrarias] = useState<string[]>(() => getRegisteredSerrarias());

  const [newPatioName, setNewPatioName] = useState("");
  const [newSerrariaName, setNewSerrariaName] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 3000);
  };

  const handleAddPatio = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPatioName.trim();
    if (!clean) {
      showFeedback("Digite o nome do novo pátio.", "error");
      return;
    }
    if (patios.some(p => p.toLowerCase() === clean.toLowerCase())) {
      showFeedback("Já existe um pátio cadastrado com esse nome.", "error");
      return;
    }

    const updated = [...patios, clean];
    setPatios(updated);
    saveRegisteredPatios(updated);
    setNewPatioName("");
    showFeedback(`Pátio "${clean}" cadastrado com sucesso!`);
    if (onUpdated) onUpdated();
  };

  const handleDeletePatio = (nameToDelete: string) => {
    if (patios.length <= 1) {
      showFeedback("O sistema deve manter pelo menos um pátio de descarregamento cadastrado.", "error");
      return;
    }
    if (window.confirm(`Deseja remover o "${nameToDelete}" da lista de pátios disponíveis? (Os registros históricos com este pátio continuarão preservados)`)) {
      const updated = patios.filter(p => p !== nameToDelete);
      setPatios(updated);
      saveRegisteredPatios(updated);
      showFeedback(`Pátio "${nameToDelete}" removido.`);
      if (onUpdated) onUpdated();
    }
  };

  const handleResetPatios = () => {
    if (window.confirm("Deseja restaurar a lista padrão de pátios?")) {
      setPatios(DEFAULT_PATIOS);
      saveRegisteredPatios(DEFAULT_PATIOS);
      showFeedback("Pátios restaurados para os padrões do sistema.");
      if (onUpdated) onUpdated();
    }
  };

  const handleAddSerraria = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSerrariaName.trim();
    if (!clean) {
      showFeedback("Digite o nome da nova serraria.", "error");
      return;
    }
    if (serrarias.some(s => s.toLowerCase() === clean.toLowerCase())) {
      showFeedback("Já existe uma serraria cadastrada com esse nome.", "error");
      return;
    }

    const updated = [...serrarias, clean];
    setSerrarias(updated);
    saveRegisteredSerrarias(updated);
    setNewSerrariaName("");
    showFeedback(`Serraria "${clean}" cadastrada com sucesso!`);
    if (onUpdated) onUpdated();
  };

  const handleDeleteSerraria = (nameToDelete: string) => {
    if (serrarias.length <= 1) {
      showFeedback("O sistema deve manter pelo menos uma serraria cadastrada.", "error");
      return;
    }
    if (window.confirm(`Deseja remover a "${nameToDelete}" da lista de serrarias disponíveis?`)) {
      const updated = serrarias.filter(s => s !== nameToDelete);
      setSerrarias(updated);
      saveRegisteredSerrarias(updated);
      showFeedback(`Serraria "${nameToDelete}" removida.`);
      if (onUpdated) onUpdated();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-white">
                Cadastro e Gestão de Pátios de Descarregamento
              </h3>
              <p className="text-[11px] text-slate-400">
                Organize áreas de descarregamento para segregar toras e evitar mistura no pátio da serraria
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-100 p-1.5 border-b border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("patios")}
            className={`flex-1 py-2 text-xs font-extrabold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "patios"
                ? "bg-white text-amber-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Warehouse className="w-4 h-4 text-amber-600" />
            <span>Pátios de Toras ({patios.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("serrarias")}
            className={`flex-1 py-2 text-xs font-extrabold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "serrarias"
                ? "bg-white text-emerald-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Factory className="w-4 h-4 text-emerald-600" />
            <span>Serrarias & Destinos ({serrarias.length})</span>
          </button>
        </div>

        {/* Feedback Message */}
        {feedbackMsg && (
          <div className={`px-5 py-2 text-xs font-bold flex items-center gap-2 ${
            feedbackMsg.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200" 
              : "bg-rose-50 text-rose-800 border-b border-rose-200"
          }`}>
            <Sparkles className="w-4 h-4" />
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {activeTab === "patios" ? (
            <>
              {/* Add Patio Form */}
              <form onSubmit={handleAddPatio} className="space-y-2 bg-amber-50/40 p-4 rounded-xl border border-amber-200/80">
                <label className="block text-[11px] font-black uppercase tracking-wider text-amber-950">
                  Adicionar Novo Pátio de Toras
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPatioName}
                    onChange={(e) => setNewPatioName(e.target.value)}
                    placeholder="Ex: Pátio 04 (Lote Novo), Pátio Secundário 2, Pátio KM 12..."
                    className="flex-1 px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 transition"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
                <p className="text-[10px] text-amber-800/80">
                  Crie novos pátios para separar toras de diferentes fornecedores, contratos ou espécies sem misturar o estoque.
                </p>
              </form>

              {/* Patios List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <span>Pátios Registrados no Sistema</span>
                  <button
                    type="button"
                    onClick={handleResetPatios}
                    className="text-slate-400 hover:text-slate-700 underline cursor-pointer"
                  >
                    Restaurar padrões
                  </button>
                </div>

                <div className="space-y-1.5 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {patios.map((patio, index) => (
                    <div 
                      key={patio}
                      className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-[10px]">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-slate-900 block">{patio}</span>
                          <span className="text-[10px] text-slate-400">Área disponível para descarregamento de toras</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePatio(patio)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remover este pátio"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Add Serraria Form */}
              <form onSubmit={handleAddSerraria} className="space-y-2 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200/80">
                <label className="block text-[11px] font-black uppercase tracking-wider text-emerald-950">
                  Adicionar Nova Serraria / Filial
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSerrariaName}
                    onChange={(e) => setNewSerrariaName(e.target.value)}
                    placeholder="Ex: Serraria 03, Serraria Vale do Rio, Serraria Terceirizada..."
                    className="flex-1 px-3.5 py-2 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Adicionar</span>
                  </button>
                </div>
              </form>

              {/* Serrarias List */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <span>Serrarias Registradas</span>
                </div>

                <div className="space-y-1.5 divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {serrarias.map((serraria, index) => (
                    <div 
                      key={serraria}
                      className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-[10px]">
                          {index + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-slate-900 block">{serraria}</span>
                          <span className="text-[10px] text-slate-400">Unidade de processamento de madeira</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteSerraria(serraria)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remover esta serraria"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            As alterações são salvas e sincronizadas instantaneamente.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Concluir
          </button>
        </div>

      </div>
    </div>
  );
}
