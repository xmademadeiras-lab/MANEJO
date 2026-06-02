/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Autex, AutexItem } from "../types";
import { AVAILABLE_SPECIES } from "../data";
import { Plus, X, Trash2 } from "lucide-react";

interface CreateAutexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (autex: Autex) => void;
}

export default function CreateAutexModal({ isOpen, onClose, onSave }: CreateAutexModalProps) {
  const [numero, setNumero] = useState("");
  const [descricao, setDescricao] = useState("");
  const [detentoresInput, setDetentoresInput] = useState("");
  const [items, setItems] = useState<Omit<AutexItem, "id">[]>([
    { especie: "Ipê", volumeAutorizado: 100, dono: "" }
  ]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { especie: "Jatobá", volumeAutorizado: 100, dono: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof Omit<AutexItem, "id">, value: any) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      [field]: field === "volumeAutorizado" ? parseFloat(value) || 0 : value
    };
    setItems(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) {
      alert("Por favor, insira o número da AUTEX.");
      return;
    }

    // Split detentores from input or extract uniquely from items
    const explicitDetentores = detentoresInput
      .split(",")
      .map(d => d.trim())
      .filter(d => d.length > 0);

    const itemDetentores = items.map(item => item.dono.trim()).filter(d => d.length > 0);
    const uniqueDetentores = Array.from(new Set([...explicitDetentores, ...itemDetentores]));

    if (uniqueDetentores.length === 0) {
      alert("Por favor, defina pelo menos um dono/detentor da madeira.");
      return;
    }

    // Map items to have proper IDs and auto-fill donor if empty and we have only 1 donor
    const autexItems: AutexItem[] = items.map((item, idx) => ({
      id: `item-gen-${Date.now()}-${idx}`,
      especie: item.especie,
      volumeAutorizado: item.volumeAutorizado || 0,
      dono: item.dono.trim() || uniqueDetentores[0]
    }));

    const newAutex: Autex = {
      id: `autex-${Date.now()}`,
      numero: numero.trim(),
      descricao: descricao.trim() || "Nova Autorização de Exploração",
      detentores: uniqueDetentores,
      items: autexItems,
      dataCriacao: new Date().toISOString().split("T")[0]
    };

    onSave(newAutex);
    
    // Reset form
    setNumero("");
    setDescricao("");
    setDetentoresInput("");
    setItems([{ especie: "Ipê", volumeAutorizado: 100, dono: "" }]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="create-autex-modal-overlay">
      <div 
        className="bg-white border border-slate-200 shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl"
        id="create-autex-modal-container"
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cadastrar Nova AUTEX</h3>
            <p className="text-xs text-slate-500 mt-1">Insira os volumes autorizados do manejo florestal</p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 font-bold p-1.5 hover:bg-slate-100/80 transition rounded-lg"
            id="close-autex-modal-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Número da AUTEX / Protocolo</label>
              <input
                type="text"
                placeholder="Ex: 12.0492/2026-AUTEX"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descrição / Local</label>
              <input
                type="text"
                placeholder="Ex: Gleba Castanhal - Setor Sul"
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Donos da Madeira (Detentores)</label>
            <input
              type="text"
              placeholder="Ex: Madeireira Pará, Fazenda Ipê (separados por vírgula)"
              value={detentoresInput}
              onChange={e => setDetentoresInput(e.target.value)}
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Deixe em branco para preencher com base nas donos dos itens de espécie abaixo.</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Espécies Autorizadas & Volumes</h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase rounded-lg shadow-sm transition flex items-center gap-1.5"
                id="add-autex-item-btn"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Espécie
              </button>
            </div>

            <div className="border border-slate-150 rounded-xl divide-y divide-slate-100 bg-slate-50/20 overflow-hidden">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white">
                  <div className="md:col-span-4">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Espécie</label>
                    <select
                      value={item.especie}
                      onChange={e => handleItemChange(idx, "especie", e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition font-bold"
                    >
                      {AVAILABLE_SPECIES.map(sp => (
                        <option key={sp} value={sp}>{sp}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Vol. Autorizado (m³)</label>
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      placeholder="0.00"
                      value={item.volumeAutorizado || ""}
                      onChange={e => handleItemChange(idx, "volumeAutorizado", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dona da Madeira</label>
                    <input
                      type="text"
                      placeholder="Ex: Madeireira Pará"
                      value={item.dono}
                      onChange={e => handleItemChange(idx, "dono", e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 focus:border-emerald-600 transition"
                      required
                    />
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      disabled={items.length === 1}
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-605 border border-slate-200 rounded-lg transition disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 -mx-5 -mb-5 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 hover:bg-slate-100 text-slate-500 text-xs font-bold uppercase rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-950 text-white hover:bg-emerald-900 font-bold uppercase tracking-wider text-xs rounded-xl shadow-xs transition"
              id="save-autex-btn"
            >
              Criar AUTEX
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
