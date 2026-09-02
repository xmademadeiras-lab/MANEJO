/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { X, Warehouse, Plus, Trash2, Edit3, Check, MapPin, Phone, User, Package, AlertCircle } from "lucide-react";
import { 
  GalpaoEntity, 
  getRegisteredGalpoes, 
  saveRegisteredGalpoes, 
  addRegisteredGalpao, 
  updateRegisteredGalpao, 
  deleteRegisteredGalpao,
  DEFAULT_GALPOES
} from "../lib/galpaoData";

interface ManageGalpoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGalpao?: (galpao: GalpaoEntity) => void;
}

export default function ManageGalpoesModal({
  isOpen,
  onClose,
  onSelectGalpao
}: ManageGalpoesModalProps) {
  const [galpoes, setGalpoes] = useState<GalpaoEntity[]>([]);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  
  // Form fields for adding/editing
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidadeUf, setCidadeUf] = useState("");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [capacidadeM3, setCapacidadeM3] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const refreshList = () => {
    setGalpoes(getRegisteredGalpoes());
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setIsEditingId(null);
    setNome("");
    setEndereco("");
    setCidadeUf("");
    setPontoReferencia("");
    setResponsavel("");
    setTelefone("");
    setCapacidadeM3("");
    setObservacoes("");
  };

  const handleStartEdit = (g: GalpaoEntity) => {
    setIsEditingId(g.id);
    setNome(g.nome);
    setEndereco(g.endereco);
    setCidadeUf(g.cidadeUf);
    setPontoReferencia(g.pontoReferencia || "");
    setResponsavel(g.responsavel || "");
    setTelefone(g.telefone || "");
    setCapacidadeM3(g.capacidadeM3 ? String(g.capacidadeM3) : "");
    setObservacoes(g.observacoes || "");
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      alert("Por favor, preencha o nome do Galpão.");
      return;
    }
    if (!endereco.trim()) {
      alert("Por favor, preencha o endereço do Galpão.");
      return;
    }

    const cap = parseFloat(capacidadeM3);
    const itemData = {
      nome: nome.trim(),
      endereco: endereco.trim(),
      cidadeUf: cidadeUf.trim() || "PA",
      pontoReferencia: pontoReferencia.trim(),
      responsavel: responsavel.trim(),
      telefone: telefone.trim(),
      capacidadeM3: isNaN(cap) ? undefined : cap,
      observacoes: observacoes.trim()
    };

    if (isEditingId) {
      updateRegisteredGalpao({
        id: isEditingId,
        ...itemData
      });
    } else {
      const created = addRegisteredGalpao(itemData);
      if (onSelectGalpao) {
        onSelectGalpao(created);
      }
    }

    resetForm();
    refreshList();
  };

  const handleDelete = (id: string, name: string) => {
    if (galpoes.length <= 1) {
      alert("Mantenha ao menos um galpão registrado no sistema.");
      return;
    }
    if (window.confirm(`Deseja realmente remover o galpão "${name}"?`)) {
      deleteRegisteredGalpao(id);
      refreshList();
      if (isEditingId === id) resetForm();
    }
  };

  const handleRestoreDefaults = () => {
    if (window.confirm("Restaurar lista padrão de galpões cadastrados?")) {
      saveRegisteredGalpoes(DEFAULT_GALPOES);
      refreshList();
      resetForm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Warehouse className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
                <span>Gestão de Galpões & Depósitos Externos</span>
              </h2>
              <p className="text-xs text-slate-400">
                Cadastre endereços e localidades externas para onde toras do manejo podem ser destinadas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* Form Side */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                {isEditingId ? <Edit3 className="w-3.5 h-3.5 text-amber-600" /> : <Plus className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{isEditingId ? "Editar Galpão" : "Novo Galpão / Depósito"}</span>
              </h3>
              {isEditingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Nome / Identificação do Galpão *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Galpão Central - BR-163 Km 45"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Endereço Completo (Rua / Rodovia / Lote) *
                </label>
                <input
                  type="text"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Rodovia BR-163, Km 45 - Zona Rural"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Cidade / UF
                  </label>
                  <input
                    type="text"
                    value={cidadeUf}
                    onChange={(e) => setCidadeUf(e.target.value)}
                    placeholder="Ex: Santarém - PA"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Capacidade Estimada (m³)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={capacidadeM3}
                    onChange={(e) => setCapacidadeM3(e.target.value)}
                    placeholder="Ex: 5000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Ponto de Referência
                </label>
                <input
                  type="text"
                  value={pontoReferencia}
                  onChange={(e) => setPontoReferencia(e.target.value)}
                  placeholder="Ex: Próximo ao Posto San Remo / Trevo Sul"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Responsável / Encarregado
                  </label>
                  <input
                    type="text"
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Ex: Carlos Alberto"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                    Telefone / Contato
                  </label>
                  <input
                    type="text"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="Ex: (93) 99122-3401"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações sobre guindaste, acesso para bitrem, etc."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>{isEditingId ? "Salvar Alterações" : "Cadastrar Galpão"}</span>
              </button>
            </form>
          </div>

          {/* List Side */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                Galpões Cadastrados ({galpoes.length})
              </span>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Restaurar Padrões
              </button>
            </div>

            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {galpoes.map((g) => (
                <div
                  key={g.id}
                  className={`p-4 bg-white border rounded-xl shadow-xs transition ${
                    isEditingId === g.id
                      ? "border-amber-500 ring-2 ring-amber-500/10"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm">{g.nome}</span>
                        {g.capacidadeM3 && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold font-mono px-2 py-0.5 rounded">
                            Cap: {g.capacidadeM3.toLocaleString("pt-BR")} m³
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="font-medium">{g.endereco} — <strong className="text-slate-900">{g.cidadeUf}</strong></span>
                        </div>
                        {g.pontoReferencia && (
                          <div className="text-[11px] text-slate-500 pl-5">
                            Ref: {g.pontoReferencia}
                          </div>
                        )}
                        {(g.responsavel || g.telefone) && (
                          <div className="flex items-center gap-4 text-[11px] text-slate-600 pl-5 pt-0.5">
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
                        {g.observacoes && (
                          <div className="text-[10px] text-slate-400 italic pl-5 pt-0.5">
                            "{g.observacoes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(g)}
                        className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                        title="Editar galpão"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(g.id, g.nome)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Remover galpão"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
}
