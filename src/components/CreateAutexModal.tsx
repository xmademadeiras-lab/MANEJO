/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Autex, AutexItem } from "../types";
import { AVAILABLE_SPECIES } from "../data";
import { Plus, X, Trash2, Upload, FileSpreadsheet, Download, Info } from "lucide-react";

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
  const [customSpeciesList, setCustomSpeciesList] = useState<string[]>(AVAILABLE_SPECIES);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Generate UTF-8 encoded CSV with BOM to avoid special character issues in Excel
    const headers = "Espécie;Volume Autorizado;Dono da Madeira";
    const rows = [
      "Ipê;450.00;Madeiras Juruá Eireli",
      "Jatobá;300.25;Madeiras Juruá Eireli",
      "Cedro;180.50;Fazenda Vista Alegre",
      "Angelim-pedra;520.00;Fazenda Vista Alegre"
    ];
    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "modelo_importacao_itens_autex.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error("O arquivo está vazio.");
        }

        const lines = text.split(/\r?\n/);
        const cleanLines = lines.map(line => line.trim()).filter(line => line.length > 0);
        
        if (cleanLines.length === 0) {
          throw new Error("Nenhuma linha de dados encontrada no arquivo CSV.");
        }

        // Detect delimiter: semicolon or comma
        const firstLine = cleanLines[0];
        const semicolonCount = (firstLine.match(/;/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        const delimiter = semicolonCount >= commaCount ? ';' : ',';

        // Parse first line to check for headers
        const firstLineFields = firstLine.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ""));
        const hasHeaders = firstLineFields.some(field => {
          const f = field.toLowerCase();
          return f.includes("espec") || f.includes("espéc") || f.includes("vol") || f.includes("dono") || f.includes("proprie") || f.includes("detent") || f.includes("owner");
        });

        let colEspecieIdx = 0;
        let colVolumeIdx = 1;
        let colDonoIdx = 2;
        let dataStartIdx = 0;

        if (hasHeaders) {
          dataStartIdx = 1;
          firstLineFields.forEach((field, idx) => {
            const f = field.toLowerCase();
            if (f.includes("espec") || f.includes("espéc") || f.includes("nome") || f.includes("madeira") || f.includes("species")) {
              colEspecieIdx = idx;
            } else if (f.includes("vol") || f.includes("quant") || f.includes("limite") || f.includes("autoriz") || f.includes("m³")) {
              colVolumeIdx = idx;
            } else if (f.includes("dono") || f.includes("proprie") || f.includes("detent") || f.includes("owner") || f.includes("empres") || f.includes("fili") || f.includes("parceir")) {
              colDonoIdx = idx;
            }
          });
        }

        const parsedItems: Omit<AutexItem, "id">[] = [];
        const newCustomSpecies = [...customSpeciesList];

        for (let i = dataStartIdx; i < cleanLines.length; i++) {
          const rawLine = cleanLines[i];
          // Simple split by delimiter with quote handling
          const fields: string[] = [];
          let currentField = "";
          let inQuotes = false;
          for (let j = 0; j < rawLine.length; j++) {
            const char = rawLine[j];
            if (char === '"' || char === "'") {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              fields.push(currentField.trim());
              currentField = "";
            } else {
              currentField += char;
            }
          }
          fields.push(currentField.trim());
          const cleanFields = fields.map(v => v.replace(/^["']|["']$/g, ""));

          if (cleanFields.length < 2) continue; // skip invalid short lines

          // Extract values
          const rawEspecie = cleanFields[colEspecieIdx];
          let rawVolume = cleanFields[colVolumeIdx] || "0";
          const rawDono = cleanFields[colDonoIdx] || "";

          if (!rawEspecie) continue;

          // Clean Brazilian float number format (e.g. 1.250,50 or 1250,50)
          rawVolume = rawVolume.replace(/\s/g, "");
          if (rawVolume.includes(",") && rawVolume.includes(".")) {
            rawVolume = rawVolume.replace(/\./g, "").replace(",", ".");
          } else if (rawVolume.includes(",")) {
            rawVolume = rawVolume.replace(",", ".");
          }
          const volumeAutorizado = parseFloat(rawVolume) || 0;

          // Capitalize first letter of specie name for alignment
          const especieFormatted = rawEspecie.charAt(0).toUpperCase() + rawEspecie.slice(1);
          
          parsedItems.push({
            especie: especieFormatted,
            volumeAutorizado: volumeAutorizado,
            dono: rawDono
          });

          if (!newCustomSpecies.includes(especieFormatted)) {
            newCustomSpecies.push(especieFormatted);
          }
        }

        if (parsedItems.length === 0) {
          throw new Error("Nenhum item válido pôde ser extraído do arquivo CSV.");
        }

        setCustomSpeciesList(newCustomSpecies);
        setItems(parsedItems);

        // Prefill detentores automatically from items
        const importedDonos = parsedItems.map(item => item.dono.trim()).filter(d => d.length > 0);
        const uniqueImportedDonos = Array.from(new Set(importedDonos));
        if (uniqueImportedDonos.length > 0) {
          setDetentoresInput(uniqueImportedDonos.join(", "));
        }

        setImportStatus({
          type: "success",
          message: `Sucesso! Importados ${parsedItems.length} itens da planilha.`
        });

        // Auto-clear status after 6 seconds
        setTimeout(() => setImportStatus(null), 6000);
      } catch (err: any) {
        setImportStatus({
          type: "error",
          message: err.message || "Erro desconhecido ao processar arquivo."
        });
      }

      // Reset file input value to allow uploading same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };

    reader.onerror = () => {
      setImportStatus({
        type: "error",
        message: "Erro ao ler o arquivo CSV."
      });
    };

    reader.readAsText(file, "UTF-8");
  };

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

            {/* CSV Import Panel */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-3" id="csv-import-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">Importar Itens da AUTEX via Planilha (.CSV)</h5>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      Preencha a lista em lote automaticamente. O CSV deve conter as colunas: <strong className="text-slate-700">Espécie, Volume Autorizado, Dono da Madeira (Proprietário)</strong>.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-300 text-[10px] font-bold uppercase rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Baixar modelo de CSV estruturado"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    <span>Modelo CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase rounded-lg shadow-xs hover:shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar CSV</span>
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                    className="hidden"
                  />
                </div>
              </div>

              {/* CSV Import feedback banner */}
              {importStatus && (
                <div className={`p-3 rounded-lg border flex items-start gap-2 text-xs transition-all ${
                  importStatus.type === "success" 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{importStatus.message}</span>
                </div>
              )}
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
                      {customSpeciesList.map(sp => (
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
