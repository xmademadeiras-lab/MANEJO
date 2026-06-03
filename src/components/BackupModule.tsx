/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo } from "react";
import { Autex, NfeDeduction, SawmillProcessLog } from "../types";
import { 
  Database, 
  Download, 
  Upload, 
  FileDown, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Layers, 
  FileSpreadsheet,
  Clock,
  Info
} from "lucide-react";

interface BackupModuleProps {
  autexList: Autex[];
  onRestoreAutexList: (list: Autex[]) => void;
  deductions: NfeDeduction[];
  onRestoreDeductions: (list: NfeDeduction[]) => void;
  sawmillLogs: SawmillProcessLog[];
  onRestoreSawmillLogs: (list: SawmillProcessLog[]) => void;
  currentUser: string;
  onAddSecurityLog: (action: string, details: string, status: "sucesso" | "erro" | "alerta") => void;
}

export default function BackupModule({
  autexList,
  onRestoreAutexList,
  deductions,
  onRestoreDeductions,
  sawmillLogs,
  onRestoreSawmillLogs,
  currentUser,
  onAddSecurityLog
}: BackupModuleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Statistics calculation for current database weights
  const stats = useMemo(() => {
    const serialized = JSON.stringify({ autexList, deductions, sawmillLogs });
    const sizeInKb = (serialized.length / 1024).toFixed(2);
    return {
      autexCount: autexList.length,
      itemCount: autexList.reduce((acc, curr) => acc + curr.items.length, 0),
      deductionsCount: deductions.length,
      industrialCount: sawmillLogs.length,
      estimatedSize: `${sizeInKb} KB`
    };
  }, [autexList, deductions, sawmillLogs]);

  // Export full JSON backup file
  const handleExportJSON = () => {
    try {
      const savedTrucksRaw = localStorage.getItem("logistica_trucks_directory");
      const trucksDirectory = savedTrucksRaw ? JSON.parse(savedTrucksRaw) : [];
      const savedUsersRaw = localStorage.getItem("etw_user_accounts");
      const userAccounts = savedUsersRaw ? JSON.parse(savedUsersRaw) : [];

      const backupObj = {
        version: "1.1.0",
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser,
        analytics: {
          autexCount: autexList.length,
          deductionsCount: deductions.length,
          sawmillCount: sawmillLogs.length
        },
        data: {
          autexList,
          deductions,
          sawmillLogs,
          trucksDirectory,
          userAccounts
        }
      };

      const jsonStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `ETW_CONTROLE_BACKUP_${new Date().toISOString().split("T")[0]}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ text: "Backup geral em JSON exportado com sucesso!", type: "success" });
      onAddSecurityLog("EXPORTAR BACKUP", "Exportou backup completo do sistema em formato JSON", "sucesso");
    } catch (e: any) {
      setMessage({ text: `Falha ao exportar backup: ${e.message}`, type: "error" });
      onAddSecurityLog("EXPORTAR BACKUP", `Falha: ${e.message}`, "erro");
    }
  };

  // Import JSON backup file
  const handleImportJSON = (jsonText: string) => {
    try {
      const parsed = JSON.parse(jsonText);
      
      // Basic validation
      if (!parsed.data || typeof parsed.data !== "object") {
        throw new Error("Formato de backup inválido. Chave 'data' não encontrada.");
      }

      const { autexList: impAutex, deductions: impDeductions, sawmillLogs: impSawmill, trucksDirectory, userAccounts } = parsed.data;

      let countLoaded = 0;

      if (Array.isArray(impAutex)) {
        onRestoreAutexList(impAutex);
        countLoaded += impAutex.length;
      }
      if (Array.isArray(impDeductions)) {
        onRestoreDeductions(impDeductions);
      }
      if (Array.isArray(impSawmill)) {
        onRestoreSawmillLogs(impSawmill);
      }
      if (Array.isArray(trucksDirectory)) {
        localStorage.setItem("logistica_trucks_directory", JSON.stringify(trucksDirectory));
      }
      if (Array.isArray(userAccounts)) {
        localStorage.setItem("etw_user_accounts", JSON.stringify(userAccounts));
      }

      setMessage({ 
        text: `Backup restaurado com sucesso! Carregados contratos e lançamentos correspondentes.`, 
        type: "success" 
      });
      onAddSecurityLog("RESTAURAR BACKUP", `Restaurou backup datado de ${parsed.exportedAt || "data desconhecida"} exportado por ${parsed.exportedBy || "desconhecido"}`, "sucesso");
    } catch (e: any) {
      setMessage({ text: `Falha ao importar arquivo JSON: ${e.message}`, type: "error" });
      onAddSecurityLog("RESTAURAR BACKUP", `Falha na restauração: ${e.message}`, "erro");
    }
  };

  // Standard File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        handleImportJSON(text);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === "string") {
          handleImportJSON(text);
        }
      };
      reader.readAsText(file);
    }
  };

  // Export Specific Datasets to CSV
  const handleExportCSV = (dataset: "autex" | "deductions" | "sawmill") => {
    try {
      let csvContent = "";
      let filename = "";

      if (dataset === "autex") {
        // Flat Autex Items list
        const headers = "id_autex;numero_autex;descricao;fornecedor_detentor;especie;volume_autorizado_m3\n";
        const rows = autexList.flatMap(a => 
          a.items.map(i => `${a.id};"${a.numero}";"${a.descricao}";"${i.dono}";"${i.especie}";${i.volumeAutorizado}`)
        ).join("\n");
        csvContent = headers + rows;
        filename = `ETW_EXPORT_CONTRATOS_AUTEX_${Date.now()}.csv`;
      } else if (dataset === "deductions") {
        const headers = "id_lancamento;id_autex;numero_nfe;chave_acesso;data_emissao;dono_carga;especie;volume_m3;placa_caminhao;tipo\n";
        const rows = deductions.map(d => 
          `${d.id};${d.autexId};"${d.numeroNfe}";"${d.chaveAcesso || ""}";"${d.dataEmissao}";"${d.dono}";"${d.especie}";${d.volume};"${d.placaCaminhao || ""}";"${d.tipoLancamento || "Manual"}"`
        ).join("\n");
        csvContent = headers + rows;
        filename = `ETW_EXPORT_ABATES_CARREGAMENTOS_${Date.now()}.csv`;
      } else if (dataset === "sawmill") {
        const headers = "id_processo;especie;cliente_dono;volume_consumido_toras_m3;volume_produzido_serrado_m3;produto_saida;rendimento_percent;data_processamento\n";
        const rows = sawmillLogs.map(s => 
          `${s.id};"${s.especie}";"${s.dono}";${s.volumeTora};${s.volumeSerrado};"${s.produtoSaida}";${s.rendimento.toFixed(2)};"${s.dataProcessamento}"`
        ).join("\n");
        csvContent = headers + rows;
        filename = `ETW_EXPORT_Serraria_DESDOBRO_${Date.now()}.csv`;
      }

      // Encode document to UTF-8 BOM to prevent Excel letter distortion
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ text: `Relatório CSV do dataset exportado com sucesso!`, type: "success" });
      onAddSecurityLog("EXPORTAR DATASET", `Exportou planilha CSV do dataset ${dataset}`, "sucesso");
    } catch (e: any) {
      setMessage({ text: `Erro ao exportar CSV: ${e.message}`, type: "error" });
      onAddSecurityLog("EXPORTAR DATASET", `Falha CSV: ${e.message}`, "erro");
    }
  };

  // Reset to Factory Setup
  const handleWipeDatabase = () => {
    if (confirm("⚠️ ATENÇÃO EXTREMA: Deseja realmente zerar todos os dados do sistema? Isto excluirá permanentemente todos os lançamentos, indústrias, e cadastros locais. Por segurança, faça um backup antes!")) {
      localStorage.removeItem("manejo_autex_list");
      localStorage.removeItem("manejo_deductions_list");
      localStorage.removeItem("manejo_active_autex_id");
      localStorage.removeItem("sawmill_logs_list");
      localStorage.removeItem("logistica_trucks_directory");
      localStorage.removeItem("etw_user_accounts");
      
      onAddSecurityLog("LIMPAR BASE", "Executou comando de limpeza geral e restauração de fábrica", "alerta");
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="backup-module-container">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 p-6 rounded-sm border border-emerald-800 shadow-xs text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-800/80 border border-emerald-700/60 rounded-lg flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Centro de Backup e Segurança</h2>
              <p className="text-xs text-emerald-300 font-medium mt-1">
                Garantia de integridade e soberania dos dados do plano de manejo e pátio serraria.
              </p>
            </div>
          </div>
          <button
            onClick={handleExportJSON}
            className="px-5 py-3 bg-emerald-700 hover:bg-emerald-600 border border-emerald-605 text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-300" />
            <span>Exportar Backup Completo</span>
          </button>
        </div>
      </div>

      {/* Notifications banner */}
      {message && (
        <div className={`p-4 rounded-sm flex items-start gap-3 border text-xs leading-relaxed ${
          message.type === "success" 
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-900" 
            : message.type === "error"
            ? "bg-rose-50/70 border-rose-200 text-rose-900"
            : "bg-amber-50/70 border-amber-200 text-amber-900"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <span className="font-semibold block">{message.type === "success" ? "Operação bem sucedida" : "Notificação"}</span>
            <span className="font-mono mt-0.5 block">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-[10px] text-slate-400 hover:text-slate-650 cursor-pointer">Sair</button>
        </div>
      )}

      {/* Two-Column Grid: Left (Stats & Restores) | Right (Planilhas CSV & Danger) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          
          {/* Card 1: Data Weights & Statistics */}
          <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <Layers className="w-4 h-4 text-emerald-905" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Estatísticas do Banco de Dados Local</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 font-mono">
              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-sm">
                <span className="block text-[10px] text-slate-450 uppercase font-semibold">Tamanho Estimado</span>
                <span className="text-lg font-black text-slate-700 mt-1 block">{stats.estimatedSize}</span>
              </div>
              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-sm">
                <span className="block text-[10px] text-slate-450 uppercase font-semibold">Contratos AUTEX</span>
                <span className="text-lg font-black text-slate-700 mt-1 block">{stats.autexCount}</span>
              </div>
              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-sm">
                <span className="block text-[10px] text-slate-450 uppercase font-semibold">Itens Espécie</span>
                <span className="text-lg font-black text-slate-700 mt-1 block">{stats.itemCount}</span>
              </div>
              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-sm">
                <span className="block text-[10px] text-slate-450 uppercase font-semibold">Deduções / Abates</span>
                <span className="text-lg font-black text-slate-700 mt-1 block">{stats.deductionsCount}</span>
              </div>
              <div className="p-4 bg-slate-50/60 border border-slate-100 rounded-sm">
                <span className="block text-[10px] text-slate-450 uppercase font-semibold">Serraria Vol. logs</span>
                <span className="text-lg font-black text-slate-700 mt-1 block">{stats.industrialCount}</span>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-2.5 p-3.5 bg-emerald-50/40 rounded-sm text-xs text-slate-600 leading-relaxed border border-emerald-100">
              <Clock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                Cada modificação efetuada nos lançamentos, indústrias, faturamentos ou cadastros de caminhões é persistida automaticamente no ecossistema local do seu navegador para fins de contingência contínua e operação offline.
              </div>
            </div>
          </div>

          {/* Card 2: Restore JSON (Upload & Drag & Drop) */}
          <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <Upload className="w-4 h-4 text-emerald-905" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Importar & Restaurar Backup (JSON)</h3>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-sm p-8 text-center transition ${
                isDragging 
                  ? "border-emerald-600 bg-emerald-50/20" 
                  : "border-slate-350 hover:border-slate-450 bg-slate-50/30"
              }`}
            >
              <Database className="w-10 h-10 text-slate-350 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">Arraste seu arquivo de backup (.json) aqui</p>
              <p className="text-[10px] text-slate-450 mt-1">ou selecione-o do seu disco rígido</p>

              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-wider text-[10px] rounded-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-slate-300" />
                  <span>Selecionar Arquivo</span>
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
                id="json-file-picker"
              />
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50/40 border border-amber-200 text-amber-900 rounded-sm text-[11px] leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Aviso:</strong> A importação de um backup substituirá integralmente os dados correntes em execução. Tenha certeza da integridade do arquivo antes de restaurar.
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* Card 3: Specific Planilhas download in CSV */}
          <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-2xs">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
              <FileDown className="w-4 h-4 text-emerald-905" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Exportação Individual (CSV/Excel)</h3>
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Baixe tabelas específicas sanitizadas no formato adequado para processamentos externos com Excel, Google Sheets ou BI.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 border border-slate-100 rounded-sm hover:bg-slate-50/50 transition">
                <div>
                  <h4 className="text-xs font-bold text-slate-705 block">Contratos AUTEX e Saldos</h4>
                  <span className="text-[10px] text-slate-450 font-mono">Tabela com espécies e volumes permitidos</span>
                </div>
                <button
                  onClick={() => handleExportCSV("autex")}
                  className="p-2 text-emerald-900 hover:bg-emerald-50 rounded-sm border border-emerald-100 transition cursor-pointer"
                  title="Exportar contratos para Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-slate-100 rounded-sm hover:bg-slate-50/50 transition">
                <div>
                  <h4 className="text-xs font-bold text-slate-705 block">Lançamentos de Cargas (Abates)</h4>
                  <span className="text-[10px] text-slate-450 font-mono">Controle de saídas, motoristas e placas</span>
                </div>
                <button
                  onClick={() => handleExportCSV("deductions")}
                  className="p-2 text-emerald-900 hover:bg-emerald-50 rounded-sm border border-emerald-100 transition cursor-pointer"
                  title="Exportar abates para Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-slate-100 rounded-sm hover:bg-slate-50/50 transition">
                <div>
                  <h4 className="text-xs font-bold text-slate-705 block">Linha de Produção (Serraria)</h4>
                  <span className="text-[10px] text-slate-450 font-mono">Desdobros cadastrados, rendimentos e resíduos</span>
                </div>
                <button
                  onClick={() => handleExportCSV("sawmill")}
                  className="p-2 text-emerald-900 hover:bg-emerald-50 rounded-sm border border-emerald-100 transition cursor-pointer"
                  title="Exportar desdobro serraria para Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Factory Reset and Purge */}
          <div className="bg-rose-50/40 border border-rose-200 p-6 rounded-sm">
            <div className="flex items-center gap-2 border-b border-rose-250 pb-4 mb-4">
              <Trash2 className="w-4 h-4 text-rose-700" />
              <h3 className="font-extrabold text-sm uppercase tracking-wide text-rose-900">Limpeza Geral e Manutenção</h3>
            </div>

            <p className="text-xs text-rose-850 mb-5 leading-relaxed">
              Zera integralmente todas as configurações, tabelas de controle ambiental, faturamento de pátio de serraria e tabelas de caminhoneiros. Retorna o sistema ao estado de demonstração de fábrica.
            </p>

            <button
              onClick={handleWipeDatabase}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold uppercase tracking-wider text-[10px] rounded-sm transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-rose-700 w-full md:w-auto"
            >
              <Trash2 className="w-4 h-4 text-rose-100" />
              <span>Zerar Todo o Sistema</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
