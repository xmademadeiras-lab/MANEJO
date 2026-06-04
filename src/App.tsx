/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
const logoUrl = "/logo.png";
import { Autex, NfeDeduction, NfeImportResult, NfeItem, SawmillProcessLog } from "./types";
import { DEFAULT_AUTEX_LIST } from "./data";
import { parseNfeXml, generateSampleNfeXml } from "./utils/xmlParser";
import CreateAutexModal from "./components/CreateAutexModal";
import NfeMappingModal from "./components/NfeMappingModal";
import SerrariaModule from "./components/SerrariaModule";
import LogisticaModule from "./components/LogisticaModule";
import RelatoriosModule from "./components/RelatoriosModule";
import BackupModule from "./components/BackupModule";
import UserControlModule from "./components/UserControlModule";
import LoginOverlay from "./components/LoginOverlay";
import PwaInstallModal from "./components/PwaInstallModal";
import { SecurityLog } from "./types";
import { 
  FileText, 
  Upload, 
  Plus, 
  RotateCcw, 
  Trash2, 
  FileDown, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  TreePine,
  Layers,
  ArrowRightLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  Landmark,
  Truck,
  Search,
  Printer,
  Menu,
  X,
  LayoutDashboard,
  FileSpreadsheet,
  Calendar,
  User,
  Factory,
  Clock,
  TrendingUp,
  BarChart2,
  Database,
  Shield,
  Download
} from "lucide-react";

export default function App() {
  // --- States ---
  const [autexList, setAutexList] = useState<Autex[]>([]);
  const [activeAutexId, setActiveAutexId] = useState<string>("");
  const [deductions, setDeductions] = useState<NfeDeduction[]>([]);
  
  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<"painel" | "lancamento" | "relatorios" | "serraria" | "logistica" | "backup" | "usuarios">("painel");
  const [sawmillLogs, setSawmillLogs] = useState<SawmillProcessLog[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("etw_sidebar_collapsed") === "true");

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("etw_sidebar_collapsed", String(next));
      return next;
    });
  };
  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dashboardOwnerSearch, setDashboardOwnerSearch] = useState("");

  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem("etw_current_user") || "COSTA");
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("etw_is_authenticated") === "true";
  });

  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>(() => {
    const saved = localStorage.getItem("etw_security_logs");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  const handleAddSecurityLog = (acao: string, detalhes: string, status: "sucesso" | "erro" | "alerta", userOverride?: string) => {
    const newLog: SecurityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      usuario: userOverride || currentUser,
      acao,
      detalhes,
      status
    };
    const updated = [newLog, ...securityLogs].slice(0, 100);
    setSecurityLogs(updated);
    localStorage.setItem("etw_security_logs", JSON.stringify(updated));
  };

  const handleLoginSuccess = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem("etw_current_user", username);
    localStorage.setItem("etw_is_authenticated", "true");
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("etw_is_authenticated");
    setIsAuthenticated(false);
    handleAddSecurityLog("LOGOUT", "Sessão encerrada voluntariamente pelo operador", "sucesso");
  };

  const handleClearSecurityLogs = () => {
    setSecurityLogs([]);
    localStorage.removeItem("etw_security_logs");
  };

  const handleSwitchUser = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem("etw_current_user", username);
  };

  // --- Manual Launch State ---
  const [manualNfNumber, setManualNfNumber] = useState("");
  const [manualVolume, setManualVolume] = useState("");
  const [manualItemId, setManualItemId] = useState(""); // AutexItem ID
  const [manualEspecie, setManualEspecie] = useState("");
  const [manualDono, setManualDono] = useState("");
  const [manualCaminhaoState, setManualCaminhaoState] = useState("");
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().split("T")[0]);

  // --- Report Filter State ---
  const [filterOwner, setFilterOwner] = useState("");
  const [filterTruck, setFilterTruck] = useState("");
  const [filterEspecie, setFilterEspecie] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [reportSubTab, setReportSubTab] = useState<"estoque" | "carregamentos" | "serraria">("estoque");
  
  // PWA (Progressive Web App) Support
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => {
    return (window as any).deferredInstallPrompt || null;
  });
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleCustomPrompt = (e: any) => {
      if (e.detail) {
        setDeferredPrompt(e.detail);
      }
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      handleAddSecurityLog("PROCESSO PWA", "Aplicativo de gerenciamento de AUTEX instalado com sucesso", "sucesso");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("pwaPromptAvailable", handleCustomPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone) {
      setIsPwaInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("pwaPromptAvailable", handleCustomPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Modals / Imports
  const [isCreateAutexOpen, setIsCreateAutexOpen] = useState(false);
  const [isMappingOpen, setIsMappingOpen] = useState(false);
  const [xmlImportResult, setXmlImportResult] = useState<NfeImportResult | null>(null);
  const [importedFileName, setImportedFileName] = useState<string>("");

  // Keep manual launch defaults synced to active AUTEX
  const activeAutex = autexList.find(a => a.id === activeAutexId) || autexList[0];

  useEffect(() => {
    if (activeAutex && activeAutex.items.length > 0) {
      const firstItem = activeAutex.items[0];
      setManualItemId(firstItem.id);
      setManualEspecie(firstItem.especie);
      setManualDono(firstItem.dono);
    } else {
      setManualItemId("");
      setManualEspecie("");
      setManualDono("");
    }
  }, [activeAutexId, autexList]);

  // Sync manualItemId when manualEspecie or manualDono change
  useEffect(() => {
    if (activeAutex) {
      const match = activeAutex.items.find(
        i => i.especie.trim().toLowerCase() === manualEspecie.trim().toLowerCase() &&
             i.dono.trim().toLowerCase() === manualDono.trim().toLowerCase()
      );
      if (match) {
        setManualItemId(match.id);
      } else {
        setManualItemId("");
      }
    }
  }, [manualEspecie, manualDono, activeAutexId, autexList]);
  
  // Simulator generator values
  const [simNfeNum, setSimNfeNum] = useState("1024");
  const [simVolume, setSimVolume] = useState("25.5");
  const [simSelectedEspecie, setSimSelectedEspecie] = useState("Ipê");
  
  // Drag and drop feedback
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Initialize from LocalStorage or Default ---
  useEffect(() => {
    const savedAutex = localStorage.getItem("manejo_autex_list");
    const savedDeductions = localStorage.getItem("manejo_deductions_list");
    const savedActiveId = localStorage.getItem("manejo_active_autex_id");

    if (savedAutex) {
      try {
        const parsed = JSON.parse(savedAutex);
        setAutexList(parsed);
        if (savedActiveId && parsed.some((a: Autex) => a.id === savedActiveId)) {
          setActiveAutexId(savedActiveId);
        } else if (parsed.length > 0) {
          setActiveAutexId(parsed[0].id);
        }
      } catch (e) {
        setAutexList(DEFAULT_AUTEX_LIST);
        setActiveAutexId(DEFAULT_AUTEX_LIST[0].id);
      }
    } else {
      setAutexList(DEFAULT_AUTEX_LIST);
      setActiveAutexId(DEFAULT_AUTEX_LIST[0].id);
    }

    if (savedDeductions) {
      try {
        setDeductions(JSON.parse(savedDeductions));
      } catch (e) {
        setDeductions([]);
      }
    }

    const savedSawmillLogs = localStorage.getItem("sawmill_logs_list");
    if (savedSawmillLogs) {
      try {
        setSawmillLogs(JSON.parse(savedSawmillLogs));
      } catch (e) {
        setSawmillLogs([]);
      }
    }
  }, []);

  // --- Save states to LocalStorage ---
  const saveAutexList = (list: Autex[]) => {
    setAutexList(list);
    localStorage.setItem("manejo_autex_list", JSON.stringify(list));
  };

  const saveDeductions = (list: NfeDeduction[]) => {
    setDeductions(list);
    localStorage.setItem("manejo_deductions_list", JSON.stringify(list));
  };

  const saveSawmillLogs = (list: SawmillProcessLog[]) => {
    setSawmillLogs(list);
    localStorage.setItem("sawmill_logs_list", JSON.stringify(list));
  };

  // --- Active Autex object storage and persistence ---

  useEffect(() => {
    if (activeAutex) {
      localStorage.setItem("manejo_active_autex_id", activeAutex.id);
    }
  }, [activeAutexId]);

  // --- Dynamic calculations for the Active Autex ---
  const activeItemsWithBalances = activeAutex
    ? activeAutex.items.map(item => {
        // Sum deductions for this item
        const itemDeductions = deductions.filter(
          d => d.autexId === activeAutex.id && d.autexItemId === item.id
        );
        const volumeExpedido = itemDeductions.reduce((acc, curr) => acc + curr.volume, 0);
        const saldoAtual = item.volumeAutorizado - volumeExpedido;
        const percentUtilizado = (volumeExpedido / item.volumeAutorizado) * 100;

        return {
          ...item,
          volumeExpedido,
          saldoAtual: Math.max(0, saldoAtual),
          percentUtilizado: Math.min(100, percentUtilizado)
        };
      })
    : [];

  // General statistics for active AUTEX
  const totalVolumeAutorizado = activeItemsWithBalances.reduce((acc, curr) => acc + curr.volumeAutorizado, 0);
  const totalVolumeExpedido = activeItemsWithBalances.reduce((acc, curr) => acc + curr.volumeExpedido, 0);
  const totalSaldoAtual = Math.max(0, totalVolumeAutorizado - totalVolumeExpedido);
  const percentageTotalExpedido = totalVolumeAutorizado > 0 ? (totalVolumeExpedido / totalVolumeAutorizado) * 100 : 0;
  const activeAutexDeductionsCount = deductions.filter(d => d.autexId === activeAutex?.id).length;

  // --- Operations ---
  
  // Save new AUTEX
  const handleCreateAutex = (newAutex: Autex) => {
    const updated = [newAutex, ...autexList];
    saveAutexList(updated);
    setActiveAutexId(newAutex.id);
    handleAddSecurityLog("CADASTRO AUTEX", `Cadastrou contrato AUTEX nº ${newAutex.numero}`, "sucesso");
  };

  // Parse CSV helper
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = "";
    
    // Auto-detect delimiter
    const commaCount = (text.match(/,/g) || []).length;
    const semicolonCount = (text.match(/;/g) || []).length;
    const delimiter = semicolonCount > commaCount ? ';' : ',';

    let i = 0;
    while (i < text.length) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i++;
      } else if (char === delimiter && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = "";
        i++;
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = "";
        if (row.length > 0 && row.some(cell => cell !== "")) {
          lines.push(row);
        }
        row = [];
        if (char === '\r' && nextChar === '\n') {
          i += 2;
        } else {
          i++;
        }
      } else {
        currentValue += char;
        i++;
      }
    }
    if (currentValue !== "" || row.length > 0) {
      row.push(currentValue.trim());
      if (row.some(cell => cell !== "")) {
        lines.push(row);
      }
    }
    return lines;
  };

  // Helper to find header column indexes with alias safety & accents tolerance
  const findHeaderIdx = (headers: string[], aliases: string[]): number => {
    return headers.findIndex(h => {
      const cleaned = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "").trim();
      return aliases.some(alias => {
        const cleanedAlias = alias.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/g, "").trim();
        return cleaned === cleanedAlias || cleaned.includes(cleanedAlias) || cleanedAlias.includes(cleaned);
      });
    });
  };

  // Export selected AUTEX as a CSV file backup
  const handleExportActiveAutex = () => {
    if (!activeAutex) {
      alert("Nenhum contrato AUTEX ativo para exportar.");
      return;
    }
    
    // Columns: numero_autex;descricao_autex;data_criacao;id_item;especie;volume_autorizado;dono
    const headers = ["numero_autex", "descricao_autex", "data_criacao", "id_item", "especie", "volume_autorizado", "dono"];
    const rows = activeAutex.items.map(item => [
      activeAutex.numero,
      activeAutex.descricao,
      activeAutex.dataCriacao,
      item.id,
      item.especie,
      item.volumeAutorizado.toString().replace(".", ","), // Use local pt-BR decimals in CSV
      item.dono
    ]);

    const escapeCsv = (val: string) => {
      if (val.includes(";") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return val;
    };

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(escapeCsv).join(";"))
    ].join("\r\n");

    const fileName = `ETW_AUTEX_CONTRATO_${activeAutex.numero.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export full system backup to a single CSV (all AUTEX and their items)
  const handleExportAllBackup = () => {
    if (autexList.length === 0) {
      alert("Nenhum contrato AUTEX cadastrado para exportar.");
      return;
    }
    
    const headers = ["numero_autex", "descricao_autex", "data_criacao", "id_item", "especie", "volume_autorizado", "dono"];
    const rows: string[][] = [];

    autexList.forEach(autex => {
      autex.items.forEach(item => {
        rows.push([
          autex.numero,
          autex.descricao,
          autex.dataCriacao,
          item.id,
          item.especie,
          item.volumeAutorizado.toString().replace(".", ","),
          item.dono
        ]);
      });
    });

    const escapeCsv = (val: string) => {
      if (val.includes(";") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
      }
      return val;
    };

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(escapeCsv).join(";"))
    ].join("\r\n");

    const fileName = `ETW_CONTROLE_AUTEX_BACKUP_COMPLETO_${new Date().toISOString().split("T")[0]}.csv`;
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import AUTEX / Backup from CSV file
  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text || text.trim() === "") {
          alert("Erro: O arquivo selecionado está vazio.");
          return;
        }

        const parsedLines = parseCSV(text);
        if (parsedLines.length < 2) {
          alert("Erro: O arquivo CSV deve conter no mínimo uma linha de cabeçalho e uma linha de dados.");
          return;
        }

        const headers = parsedLines[0];
        
        // Match columns
        const numIdx = findHeaderIdx(headers, ["numero_autex", "numero", "protocolo", "autex", "contrato"]);
        const descIdx = findHeaderIdx(headers, ["descricao_autex", "descricao", "local", "area"]);
        const dateIdx = findHeaderIdx(headers, ["data_criacao", "data_criacao_autex", "data", "criacao"]);
        const idIdx = findHeaderIdx(headers, ["id_item", "id_do_item", "id"]);
        const especIdx = findHeaderIdx(headers, ["especie", "madeira", "essencia"]);
        const volIdx = findHeaderIdx(headers, ["volume_autorizado", "volume", "limite", "cota"]);
        const donoIdx = findHeaderIdx(headers, ["dono", "detentor", "empresa", "cnpj", "proprietario"]);

        if (numIdx === -1 || especIdx === -1 || volIdx === -1) {
          alert("Formato de CSV inválido. Certifique-se de que o cabeçalho contenha pelo menos colunas que identifiquem: 'numero_autex', 'especie' e 'volume_autorizado'.");
          return;
        }

        // Reconstruct AUTEXes grouping by number
        const autexMap: Record<string, { numero: string; descricao: string; dataCriacao: string; items: any[] }> = {};

        for (let r = 1; r < parsedLines.length; r++) {
          const row = parsedLines[r];
          if (row.length === 0 || (row.length === 1 && row[0] === "")) continue; // skip blank lines
          
          const numero = row[numIdx] ? row[numIdx].trim() : "";
          if (!numero) continue; // skip rows without a contract number

          const descricao = descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : "Importado via CSV";
          const dataCriacao = dateIdx !== -1 && row[dateIdx] ? row[dateIdx].trim() : new Date().toISOString().split("T")[0];
          const itemId = idIdx !== -1 && row[idIdx] ? row[idIdx].trim() : `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const especie = row[especIdx] ? row[especIdx].trim() : "Espécie Não Informada";
          
          // Support decimal notation like 120,50 and 120.50
          let volStr = volIdx !== -1 ? row[volIdx].trim() : "0";
          volStr = volStr.replace(",", ".");
          const volumeAutorizado = parseFloat(volStr) || 0;
          
          const dono = donoIdx !== -1 && row[donoIdx] ? row[donoIdx].trim() : "Detentor Padrão";

          if (!autexMap[numero]) {
            autexMap[numero] = {
              numero,
              descricao,
              dataCriacao,
              items: []
            };
          }

          autexMap[numero].items.push({
            id: itemId,
            especie,
            volumeAutorizado,
            dono
          });
        }

        const importedAutexesKeys = Object.keys(autexMap);
        if (importedAutexesKeys.length === 0) {
          alert("Nenhuma AUTEX válida foi encontrada no arquivo CSV.");
          return;
        }

        // Perform merges
        let updatedAutexList = [...autexList];
        let selectActiveId = activeAutexId;

        if (importedAutexesKeys.length === 1) {
          const key = importedAutexesKeys[0];
          const parsed = autexMap[key];
          
          const importedAutex: Autex = {
            id: `autex-${Date.now()}`,
            numero: parsed.numero,
            descricao: parsed.descricao,
            dataCriacao: parsed.dataCriacao,
            detentores: Array.from(new Set(parsed.items.map(i => i.dono))).filter(Boolean),
            items: parsed.items
          };

          const exists = autexList.find(a => a.numero === importedAutex.numero);
          if (exists) {
            const overwrite = window.confirm(`Já existe uma AUTEX registrada com o número "${importedAutex.numero}". Deseja substituí-la mantendo o ID interno (e preservar os faturamentos vinculados se as espécies coincidirem)?`);
            if (overwrite) {
              // Map old items to imported ones to prevent breaking deductions where possible
              const mergedItems = importedAutex.items.map(item => {
                const oldMatch = exists.items.find(oi => oi.especie.toLowerCase() === item.especie.toLowerCase());
                if (oldMatch) {
                  return { ...item, id: oldMatch.id }; // preserve internal ID
                }
                return item;
              });

              importedAutex.id = exists.id;
              importedAutex.items = mergedItems;
              importedAutex.detentores = Array.from(new Set(mergedItems.map(i => i.dono))).filter(Boolean);

              updatedAutexList = autexList.map(a => a.id === exists.id ? importedAutex : a);
              selectActiveId = exists.id;
              alert(`AUTEX "${importedAutex.numero}" atualizada com sucesso via CSV!`);
            } else {
              const cloneId = `autex-clone-${Date.now()}`;
              importedAutex.id = cloneId;
              importedAutex.numero = `${importedAutex.numero} (Cópia)`;
              updatedAutexList = [importedAutex, ...autexList];
              selectActiveId = cloneId;
              alert(`AUTEX importada como cópia: "${importedAutex.numero}"`);
            }
          } else {
            updatedAutexList = [importedAutex, ...autexList];
            selectActiveId = importedAutex.id;
            alert(`AUTEX "${importedAutex.numero}" importada com sucesso via CSV!`);
          }
        } else {
          // Multiple AUTEXes in a single CSV
          const overwriteAll = window.confirm(`Foram localizados ${importedAutexesKeys.length} contratos AUTEX no arquivo CSV.\n\nDeseja importar todos eles? Contratos duplicados serão adicionados como novos.`);
          if (overwriteAll) {
            const newAutexes: Autex[] = importedAutexesKeys.map((key, idx) => {
              const parsed = autexMap[key];
              return {
                id: `autex-bulk-${Date.now()}-${idx}`,
                numero: parsed.numero,
                descricao: parsed.descricao,
                dataCriacao: parsed.dataCriacao,
                detentores: Array.from(new Set(parsed.items.map(i => i.dono))).filter(Boolean),
                items: parsed.items
              };
            });

            updatedAutexList = [...newAutexes, ...autexList];
            selectActiveId = newAutexes[0].id;
            alert(`${newAutexes.length} contratos AUTEX importados do CSV com sucesso!`);
          }
        }

        saveAutexList(updatedAutexList);
        if (selectActiveId) {
          setActiveAutexId(selectActiveId);
        }
      } catch (err: any) {
        alert(`Falha ao ler ou analisar o arquivo CSV: ${err.message}`);
      }
    };
    reader.readAsText(file, "utf-8");
    e.target.value = ""; // Clear file selector
  };

  // Delete entire selected AUTEX with related deductions
  const handleDeleteActiveAutex = () => {
    if (!activeAutex) {
      alert("Nenhum contrato AUTEX ativo para excluir.");
      return;
    }
    const confirmMsg = `ATENÇÃO CRÍTICA!\n\nVocê está prestes a EXCLUIR DEFINITIVAMENTE a AUTEX "${activeAutex.numero}" de forma permanente.\n\nIsso apagará todas as espécies autorizadas e EXCLUIRÁ TODOS os lançamentos de faturamento associados a ela.\n\nEsta operação não pode ser desfeita.\n\nDeseja realmente continuar?`;
    if (window.confirm(confirmMsg)) {
      const remainingList = autexList.filter(a => a.id !== activeAutex.id);
      saveAutexList(remainingList);
      
      const filteredDeductions = deductions.filter(d => d.autexId !== activeAutex.id);
      saveDeductions(filteredDeductions);

      if (remainingList.length > 0) {
        setActiveAutexId(remainingList[0].id);
      } else {
        setActiveAutexId("");
      }

      alert("AUTEX e todos os abatimentos associados foram excluídos.");
    }
  };

  // Delete a specific authorizing item (species / owner) from the active AUTEX
  const handleDeleteAutexItem = (itemId: string, especieName: string) => {
    if (!activeAutex) return;
    const confirmMsg = `Deseja realmente excluir a espécie "${especieName}" desta AUTEX?\n\nIsso removerá o item e também excluirá permanentemente todos os lançamentos (XML ou manuais) associados a ele.`;
    if (window.confirm(confirmMsg)) {
      const updatedItems = activeAutex.items.filter(item => item.id !== itemId);
      
      const updatedList = autexList.map(a => {
        if (a.id === activeAutex.id) {
          return {
            ...a,
            items: updatedItems,
            detentores: Array.from(new Set(updatedItems.map(i => i.dono))).filter(Boolean)
          };
        }
        return a;
      });
      saveAutexList(updatedList);
      
      // Cascade delete deductions related to this item
      const remainingDeductions = deductions.filter(
        d => !(d.autexId === activeAutex.id && d.autexItemId === itemId)
      );
      saveDeductions(remainingDeductions);
      
      alert(`Espécie "${especieName}" e seus lançamentos relacionados foram removidos do contrato.`);
    }
  };

  // Reset demo back to defaults
  const handleResetDefaults = () => {
    if (window.confirm("Deseja realmente redefinir o sistema para os dados de demonstração originais? Isso limpará os abatimentos atuais!")) {
      setAutexList(DEFAULT_AUTEX_LIST);
      setActiveAutexId(DEFAULT_AUTEX_LIST[0].id);
      setDeductions([]);
      setSawmillLogs([]);
      localStorage.removeItem("manejo_autex_list");
      localStorage.removeItem("manejo_active_autex_id");
      localStorage.removeItem("manejo_deductions_list");
      localStorage.removeItem("sawmill_logs_list");
    }
  };

  // Deleting a deduction (restoring its balance on AUTEX)
  const handleDeleteDeduction = (id: string, nfNumber: string) => {
    if (window.confirm(`Tem certeza que deseja estornar o lançamento da NF-e nº ${nfNumber}? O volume correspondente retornará ao saldo da AUTEX.`)) {
      const updated = deductions.filter(d => d.id !== id);
      saveDeductions(updated);
    }
  };

  // --- XML file upload handling ---

  const processXmlText = (xmlContent: string, fileName: string) => {
    try {
      const parsed = parseNfeXml(xmlContent);
      setXmlImportResult(parsed);
      setImportedFileName(fileName);
      setIsMappingOpen(true);
    } catch (err: any) {
      alert(`Erro ao ler XML: ${err.message || "Verifique se o arquivo corresponde a uma NF-e NF-55 padrão."}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processXmlText(text, file.name);
    };
    reader.readAsText(file);
    // Clear input to allow re-upload
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Drag & drop handlers
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
        const text = event.target?.result as string;
        processXmlText(text, file.name);
      };
      reader.readAsText(file);
    }
  };

  // Confirming the mapped items from the NfeMappingModal
  const handleConfirmMapping = (mappedItems: { item: NfeItem; autexItemId: string }[], placaCaminhao?: string) => {
    if (!xmlImportResult) return;

    // Check if any mapped item would exceed the available balance on the AUTEX
    let exceedsBalance = false;
    let exceededMessage = "";

    const newLogs: NfeDeduction[] = [];

    mappedItems.forEach(({ item, autexItemId }) => {
      const autexItemWithBalance = activeItemsWithBalances.find(ai => ai.id === autexItemId);
      if (autexItemWithBalance) {
        if (item.volume > autexItemWithBalance.saldoAtual) {
          exceedsBalance = true;
          exceededMessage += `\n- ${item.especie} (${item.dono}): volume de ${item.volume} m³ excede o saldo atual disponível de ${autexItemWithBalance.saldoAtual.toFixed(2)} m³.`;
        }

        newLogs.push({
          id: `deduct-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          autexId: activeAutex.id,
          autexItemId,
          numeroNfe: xmlImportResult.numeroNfe,
          chaveAcesso: xmlImportResult.chaveAcesso,
          dataEmissao: xmlImportResult.dataEmissao,
          dono: item.dono,
          especie: item.especie,
          volume: item.volume,
          dataImportacao: new Date().toISOString(),
          xmlFileName: importedFileName || "Importação direta",
          placaCaminhao: placaCaminhao?.trim() || "Não Informado",
          tipoLancamento: "XML"
        });
      }
    });

    if (exceedsBalance) {
      const proceed = window.confirm(
        `Alerta de Inconsistência de Saldo!${exceededMessage}\n\nDeseja realizar o abatimento mesmo assim (o saldo ficará negativo ou zerado)?`
      );
      if (!proceed) return;
    }

    // Save logs to state
    saveDeductions([...newLogs, ...deductions]);
    
    // Clean up
    setXmlImportResult(null);
    setImportedFileName("");
    setIsMappingOpen(false);
  };

  // Handler to register a new AutexItem on the fly (from XML mapping screen)
  const handleAddAutexItemOnTheFly = (especie: string, dono: string, volumeAutorizado: number) => {
    if (!activeAutex) return null;
    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      especie: especie.trim(),
      dono: dono.trim(),
      volumeAutorizado: volumeAutorizado
    };

    const updatedList = autexList.map(a => {
      if (a.id === activeAutex.id) {
        const updatedItems = [...a.items, newItem];
        const updatedDetentores = Array.from(new Set([...a.detentores, dono.trim()])).filter(Boolean);
        return {
          ...a,
          items: updatedItems,
          detentores: updatedDetentores
        };
      }
      return a;
    });

    saveAutexList(updatedList);
    return newItem;
  };

  // --- Manual Launch Submit Handler ---
  const handleManualLaunchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAutex) {
      alert("Nenhum contrato AUTEX ativo.");
      return;
    }
    if (!manualItemId) {
      alert(
        `A combinação da espécie "${manualEspecie}" com o proprietário "${manualDono}" não possui uma cota de saldo autorizada cadastrada nesta AUTEX.\n\nPor favor, digite ou selecione uma combinação de espécie e proprietário válida registrada no contrato.`
      );
      return;
    }
    const vol = parseFloat(manualVolume);
    if (isNaN(vol) || vol <= 0) {
      alert("Por favor, digite um volume válido maior que zero.");
      return;
    }
    const nf = manualNfNumber.trim() || `MAN-${Math.floor(1000 + Math.random() * 9000)}`;

    const selectedItem = activeAutex.items.find(i => i.id === manualItemId);
    const itemWithBalance = activeItemsWithBalances.find(ai => ai.id === manualItemId);

    if (!selectedItem || !itemWithBalance) {
      alert("Item da AUTEX não encontrado.");
      return;
    }

    if (vol > itemWithBalance.saldoAtual) {
      const proceed = window.confirm(
        `Alerta de Inconsistência de Saldo!\n\nO volume lançado (${vol.toFixed(3)} m³) é maior que o saldo disponível de ${itemWithBalance.saldoAtual.toFixed(3)} m³ para a espécie ${selectedItem.especie} (${manualDono}).\nDeseja prosseguir com o abatimento mesmo assim?`
      );
      if (!proceed) return;
    }

    const newLog: NfeDeduction = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      autexId: activeAutex.id,
      autexItemId: manualItemId,
      numeroNfe: nf,
      dataEmissao: manualDate,
      dono: manualDono.trim() || selectedItem.dono,
      especie: selectedItem.especie,
      volume: vol,
      dataImportacao: new Date().toISOString(),
      xmlFileName: "Lançamento Manual",
      placaCaminhao: manualCaminhaoState.trim() || "Não Informado",
      tipoLancamento: "Manual"
    };

    saveDeductions([newLog, ...deductions]);
    
    // Clear inputs and keep some defaults
    setManualVolume("");
    setManualCaminhaoState("");
    setManualNfNumber("");
    alert(`Lançamento manual registrado com sucesso para a espécie ${selectedItem.especie}!`);
  };

  // --- Click to simulate triggers ---
  const handleSimulateQuickImport = (type: "single" | "multi") => {
    const randomNfeNum = Math.floor(Math.random() * 9000 + 1000).toString();
    const emitente = "Manejo e Comércio Pará S/A";
    const destinatario = "Exportadora Geral de Madeiras Eireli";

    let itemsToGenerate: { especie: string; volume: number }[] = [];

    if (type === "single") {
      const vol = parseFloat(simVolume) || 12.5;
      itemsToGenerate.push({
        especie: simSelectedEspecie,
        volume: vol
      });
    } else {
      // Simulate multiple species subtracting at once (like multi-item invoice)
      if (activeAutex) {
        activeAutex.items.slice(0, 3).forEach((item, idx) => {
          itemsToGenerate.push({
            especie: item.especie,
            volume: 15.45 * (idx + 1)
          });
        });
      } else {
        itemsToGenerate.push(
          { especie: "Ipê", volume: 18.45 },
          { especie: "Jatobá", volume: 22.3 }
        );
      }
    }

    const xmlStr = generateSampleNfeXml({
      numero: randomNfeNum,
      emitente,
      destinatario,
      items: itemsToGenerate
    });

    processXmlText(xmlStr, `NFProc_${randomNfeNum}.xml`);
  };

  const handleDownloadSampleXml = () => {
    const items = activeAutex 
      ? activeAutex.items.slice(0, 2).map(i => ({ especie: i.especie, volume: 10.0 }))
      : [{ especie: "Ipê", volume: 15.0 }];
      
    const xmlText = generateSampleNfeXml({
      numero: "2026110",
      emitente: "Souto Florestal Ltda",
      destinatario: "Madeireira Central S/A",
      items
    });

    const blob = new Blob([xmlText], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `NFe_Exemplo_Manejo_${activeAutex?.numero || "AUTEX"}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Report and Statistical Calculations ---
  const filteredDeductions = deductions.filter(d => {
    if (d.autexId !== activeAutex?.id) return false;
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

  // Grouped by Owner
  const volByOwnerObj: Record<string, number> = {};
  filteredDeductions.forEach(d => {
    volByOwnerObj[d.dono] = (volByOwnerObj[d.dono] || 0) + d.volume;
  });
  const volByOwnerList = Object.entries(volByOwnerObj)
    .map(([owner, volume]) => ({ owner, volume }))
    .sort((a, b) => b.volume - a.volume);

  // Grouped by Truck Plate
  const volByTruckObj: Record<string, number> = {};
  filteredDeductions.forEach(d => {
    const truck = d.placaCaminhao || "Não Informado";
    volByTruckObj[truck] = (volByTruckObj[truck] || 0) + d.volume;
  });
  const volByTruckList = Object.entries(volByTruckObj)
    .map(([truck, volume]) => ({ truck, volume }))
    .sort((a, b) => b.volume - a.volume);

  // Split totalSaldoAtual for the bold 9xl counter
  const totalSaldoString = totalSaldoAtual.toFixed(2);
  const [saldoIntRaw, saldoDec] = totalSaldoString.split(".");
  const saldoInt = Number(saldoIntRaw).toLocaleString("pt-BR");

  if (!isAuthenticated) {
    return (
      <>
        <LoginOverlay 
          onLogin={handleLoginSuccess} 
          onAddSecurityLog={handleAddSecurityLog} 
          deferredPrompt={deferredPrompt}
          onOpenInstallModal={() => setIsPwaModalOpen(true)}
        />
        <PwaInstallModal
          isOpen={isPwaModalOpen}
          onClose={() => setIsPwaModalOpen(false)}
          deferredPrompt={deferredPrompt}
          onInstallSuccess={() => {
            setIsPwaInstalled(true);
            handleAddSecurityLog("PROCESSO PWA", "Aplicativo instalado e inicializado via prompt", "sucesso");
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col md:flex-row relative" id="application-root">
      
      {/* Dynamic Printing Style Overlay */}
      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
            }
            #app-sidebar, #mobile-nav-bar, .no-print, button, form, .simulate-box {
              display: none !important;
            }
            #main-content-panel {
              padding: 0 !important;
              margin: 0 !important;
              max-width: 100% !important;
              box-shadow: none !important;
              border: none !important;
            }
            .print-full-width {
              width: 100% !important;
              grid-column: span 12 / span 12 !important;
            }
          }
        `}
      </style>

      {/* Mobile Sticky Header */}
      <div className="md:hidden flex items-center justify-between bg-emerald-950 text-white px-5 py-4 border-b border-emerald-900 shrink-0 z-30 no-print" id="mobile-nav-bar">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl} alt="ETW Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
          <span className="font-mono text-sm font-semibold tracking-tight text-white">ETW CONTROLE DE AUTEX</span>
         </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-emerald-905 border border-emerald-800 text-emerald-300 hover:text-white hover:bg-emerald-800 transition cursor-pointer rounded-lg"
          aria-label="Toggle navigation drawer"
          id="mobile-sidebar-toggle"
        >
          {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* PERSISTENT LEFT SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 md:sticky md:top-0 md:h-screen flex flex-col bg-emerald-950 text-emerald-150 border-r border-emerald-900/40 shadow-2xl md:shadow-none z-50 transform md:transform-none transition-all duration-300 ease-in-out shrink-0 no-print overflow-y-auto ${
          isSidebarCollapsed ? "md:w-20 w-72" : "w-72"
        } ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        id="app-sidebar"
      >
        {/* Title / Brand Header */}
        <div className={`p-4 border-b border-emerald-900/40 flex ${isSidebarCollapsed ? "md:flex-col items-center gap-3 py-6" : "items-center justify-between gap-3"} bg-emerald-950/80 transition-all`}>
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? "md:flex-col" : ""}`}>
            <img src={logoUrl} alt="ETW Logo" className={`object-contain transition-all duration-300 ${isSidebarCollapsed ? "w-10 h-10" : "w-12 h-12"}`} referrerPolicy="no-referrer" />
            {!isSidebarCollapsed && (
              <div className="transition-all duration-300">
                <div className="flex items-center gap-1">
                  <span className="text-lg font-extrabold tracking-tight text-white leading-none">ETW CONTROLE</span>
                </div>
                <span className="text-[9px] text-emerald-400/90 font-mono tracking-widest uppercase font-bold block mt-1">Manejo vs AUTEX</span>
              </div>
            )}
          </div>
          
          {/* Collapse toggle button on desktop */}
          <button
            onClick={toggleSidebarCollapse}
            className="hidden md:flex p-1.5 bg-emerald-900/50 hover:bg-emerald-850 hover:text-white text-emerald-300 border border-emerald-800/60 rounded-lg cursor-pointer transition shrink-0"
            title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
            type="button"
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* ACTIVE PORTFOLIO WIDGET */}
        {!isSidebarCollapsed ? (
          <div className="p-5 border-b border-emerald-900/40 bg-emerald-950/30 space-y-3.5 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Ações do Contrato</span>
              <button
                onClick={() => setIsCreateAutexOpen(true)}
                className="text-[9px] bg-emerald-500 hover:bg-emerald-450 text-white font-sans font-bold uppercase px-2.5 py-1.5 transition shrink-0 cursor-pointer rounded-lg shadow-sm"
                id="open-create-autex-modal-btn"
              >
                + Nova AUTEX
              </button>
            </div>

            {activeAutex ? (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={activeAutexId}
                    onChange={(e) => {
                       setActiveAutexId(e.target.value);
                       setIsSidebarOpen(false); // Auto close on mobile
                    }}
                    className="w-full appearance-none pl-3.5 pr-8 py-2.5 bg-emerald-900/50 hover:bg-emerald-900 border border-emerald-850/60 text-white text-xs font-mono font-semibold uppercase tracking-wide rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition cursor-pointer"
                    id="autex-selector"
                  >
                    {autexList.map((a) => (
                      <option key={a.id} value={a.id} className="bg-emerald-950 text-white font-mono">
                        AUTEX {a.numero.substring(0, 16)}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-emerald-400">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/70 rounded-xl text-[11px] leading-relaxed space-y-1.5 text-emerald-250/95">
                  <div className="flex justify-between font-mono">
                    <span className="text-emerald-400 font-bold">Protocolo:</span>
                    <span className="text-white font-bold">{activeAutex.numero}</span>
                  </div>
                  <div className="truncate" title={activeAutex.descricao}>
                    <span className="text-emerald-400 font-bold">Local:</span> {activeAutex.descricao}
                  </div>
                  <div className="pt-2 flex flex-wrap gap-1 border-t border-emerald-905/40 pb-2">
                    {activeAutex.detentores.map((det) => (
                      <span key={det} className="bg-emerald-900/50 border border-emerald-805 text-emerald-305 px-2 py-0.5 rounded-lg text-[9px] font-medium tracking-tighter truncate max-w-[110px]" title={det}>
                        {det}
                      </span>
                    ))}
                  </div>
                  <div className="pt-2 flex items-center gap-1.5 border-t border-emerald-900/40">
                    <button
                      onClick={handleExportActiveAutex}
                      title="Exportar esta AUTEX (.csv)"
                      className="flex-1 py-1.5 px-2 text-[10px] bg-emerald-900 hover:bg-emerald-850 hover:text-white text-emerald-305 border border-emerald-800 transition cursor-pointer text-center font-bold rounded-lg uppercase leading-normal"
                      type="button"
                      id="sidebar-export-autex-btn"
                    >
                      Exportar
                    </button>
                    <button
                      onClick={handleDeleteActiveAutex}
                      title="Excluir esta AUTEX permanentemente"
                      className="py-1.5 px-3 text-[10px] bg-rose-950/30 hover:bg-rose-900 hover:text-white text-rose-300 border border-rose-900/50 transition cursor-pointer text-center font-bold rounded-lg uppercase flex items-center justify-center leading-normal"
                      type="button"
                      id="sidebar-delete-autex-btn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-emerald-400 italic">Nenhum contrato cadastrado</div>
            )}
          </div>
        ) : (
          /* Minimized folder plus icon on desktop */
          <div className="hidden md:flex flex-col items-center py-4 border-b border-emerald-900/40 bg-emerald-950/30">
            <button
              onClick={() => {
                setIsSidebarCollapsed(false);
                setIsCreateAutexOpen(true);
              }}
              className="w-10 h-10 bg-emerald-500 hover:bg-emerald-450 text-white rounded-xl flex items-center justify-center transition shadow-sm cursor-pointer"
              title="Criar Nova AUTEX"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* VERTICAL NAVLINKS */}
        <nav className={`flex-1 ${isSidebarCollapsed ? "md:px-2 py-4" : "px-3 py-4"} space-y-1.5`} id="sidebar-navigation">
          <button
            type="button"
            onClick={() => {
              setActiveTab("painel");
              setIsSidebarOpen(false);
            }}
            title="Painel de Saldos"
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 py-3 gap-3" : "gap-3 px-4 py-3"
            } ${
              activeTab === "painel"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-300 hover:text-white hover:bg-emerald-900/40"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>📊 Painel de Saldos</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("lancamento");
              setIsSidebarOpen(false);
            }}
            title="Baixar Lançamentos"
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 py-3 gap-3" : "gap-3 px-4 py-3"
            } ${
              activeTab === "lancamento"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-300 hover:text-white hover:bg-emerald-900/40"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>✍️ Baixar Lançamentos</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("logistica");
              setIsSidebarOpen(false);
            }}
            title="Módulo de Logística"
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 py-3 gap-3" : "gap-3 px-4 py-3"
            } ${
              activeTab === "logistica"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-300 hover:text-white hover:bg-emerald-900/40"
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>🚚 Módulo de Logística</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("relatorios");
              setIsSidebarOpen(false);
            }}
            title="Módulo de Relatórios"
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 py-3 gap-3" : "gap-3 px-4 py-3"
            } ${
              activeTab === "relatorios"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-300 hover:text-white hover:bg-emerald-900/40"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>📋 Módulo de Relatórios</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("serraria");
              setIsSidebarOpen(false);
            }}
            title="Módulo Serraria"
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 py-3 gap-3" : "gap-3 px-4 py-3"
            } ${
              activeTab === "serraria"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-300 hover:text-white hover:bg-emerald-900/40"
            }`}
          >
            <Factory className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>🪚 Módulo Serraria</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("backup");
              setIsSidebarOpen(false);
            }}
            title="Módulo Backup"
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 py-3 gap-3" : "gap-3 px-4 py-3"
            } ${
              activeTab === "backup"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-300 hover:text-white hover:bg-emerald-900/40"
            }`}
          >
            <Database className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>💾 Módulo Backup</span>}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("usuarios");
              setIsSidebarOpen(false);
            }}
            title="Controle de Usuários"
            className={`w-full flex items-center transition-all duration-150 rounded-xl cursor-pointer ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 py-3 gap-3" : "gap-3 px-4 py-3"
            } ${
              activeTab === "usuarios"
                ? "bg-emerald-800 text-white shadow-sm"
                : "text-emerald-300 hover:text-white hover:bg-emerald-900/40"
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>👥 Controle de Usuários</span>}
          </button>

          {/* PWA Install Action Button */}
          <button
            type="button"
            onClick={async () => {
              if (deferredPrompt) {
                try {
                  deferredPrompt.prompt();
                  const { outcome } = await deferredPrompt.userChoice;
                  if (outcome === "accepted") {
                    setIsPwaInstalled(true);
                    setDeferredPrompt(null);
                    handleAddSecurityLog("PROCESSO PWA", "Aplicativo de gerenciamento de AUTEX instalado via clique direto do menu", "sucesso");
                  }
                } catch (err) {
                  console.error("Erro ao invocar prompt nativo:", err);
                  setIsPwaModalOpen(true);
                }
              } else {
                setIsPwaModalOpen(true);
              }
              setIsSidebarOpen(false);
            }}
            title="Baixar e Instalar Aplicativo (PWA)"
            className={`w-full flex items-center transition-all duration-300 rounded-xl cursor-pointer py-3 border border-emerald-500/25 bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-300 hover:text-white ${
              isSidebarCollapsed ? "md:justify-center md:px-2 md:py-3.5 px-4 gap-3" : "gap-3 px-4"
            }`}
          >
            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isSidebarCollapsed && (
              <span className="flex items-center gap-1.5 font-bold text-left leading-none">
                📥 Instalar WebApp
                {deferredPrompt && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                )}
              </span>
            )}
          </button>
        </nav>

        {/* OPERATOR INFO & UTILITIES */}
        <div className={`p-4 border-t border-emerald-900/40 bg-emerald-950/50 text-[10px] flex ${isSidebarCollapsed ? "md:flex-col items-center gap-4 text-center justify-center py-6" : "items-center justify-between"} font-mono tracking-wide transition-all`}>
          {isSidebarCollapsed ? (
            <button
              onClick={handleLogout}
              className="p-2.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-900/60 rounded-xl transition flex items-center justify-center cursor-pointer"
              title={`Sair da Sessão (Operador: ${currentUser})`}
            >
              <User className="w-4 h-4 text-emerald-400 group-hover:text-rose-400" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse shrink-0"></span>
                <span className="text-emerald-300/80">Operador: {currentUser}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-900/60 rounded-md text-[8px] font-bold uppercase transition"
                title="Encerrar Sessão Segura"
              >
                SAIR
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Backdrop for mobile sidebar drawer */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* MAIN CONTENT WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0" id="main-content-panel">
        
        {/* Workspace Container */}
        <main className="flex-1 p-4 md:p-8 space-y-8 max-w-7xl w-full mx-auto">

          {/* DYNAMIC COMPONENT: TAB 1 (PAINEL DE SALDOS) */}
          {activeTab === "painel" && (
            <div className="space-y-8 animate-fade-in" id="workspace-tab-painel">
              
              {/* Dashboard Intro Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Métricas Gerais de Saldo</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-mono uppercase tracking-wide">
                      Manejo Ativo
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Quadro consolidado de faturamento, espécies liberadas e abatimento em metros cúbicos (m³).</p>
                </div>
                
                {activeAutex && (
                  <div className="px-4 py-2 bg-slate-100 border border-slate-200 text-xs font-mono rounded-sm text-slate-700 flex items-center gap-2 shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Início do Contrato: <strong className="text-slate-950">{activeAutex.dataCriacao}</strong></span>
                  </div>
                )}
              </div>

              {/* Scoreboards Section: Giant number remainder displays */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                
                {/* Giant Box of Remaining Balance */}
                <div className="lg:col-span-8 bg-gradient-to-br from-white to-slate-50 p-6 md:p-8 border border-slate-150 rounded-2xl shadow-md flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-40"></div>
                  
                  <div className="relative">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                      Volume Disponível para Faturamento
                    </span>
                    <div className="flex items-baseline gap-1.5 flex-wrap mt-5">
                      <span className="text-6xl md:text-8xl font-black tracking-tight leading-none text-slate-900">{saldoInt}</span>
                      <div className="flex flex-col">
                        <span className="text-2xl md:text-4xl font-extrabold text-emerald-600 leading-none">,{saldoDec}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mt-1">m³ Saldo Geral</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 relative">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-605 shrink-0" />
                      <span className="text-xs font-semibold text-slate-650">Contabilidade AUTEX balanceada em tempo real</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-slate-100/80 text-slate-650 px-2.5 py-1 rounded-lg">
                      ATIVIDADE EM {new Date().getFullYear()}
                    </span>
                  </div>
                </div>

                {/* Vertical metrics boxes */}
                <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  
                  <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Limite Autorizado</span>
                    <div className="my-2">
                      <span className="text-2xl md:text-3xl font-extrabold font-mono text-white">
                        {totalVolumeAutorizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-1">m³</span>
                    </div>
                    <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Cota Total da Licença</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-xs flex flex-col justify-between border-l-4 border-l-orange-500">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest block">Volume Abatido</span>
                    <div className="my-2">
                      <span className="text-2xl md:text-3xl font-extrabold font-mono text-slate-900">
                        {totalVolumeExpedido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xs text-slate-500 font-mono ml-0.5">m³</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-400">
                      <span>Total Consumido</span>
                      <span className="text-orange-600 font-mono font-bold">{percentageTotalExpedido.toFixed(1)}%</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Inventory Table Container */}
              <div className="bg-white border text-slate-900 rounded-lg shadow-sm border-slate-200 overflow-hidden">
                
                {/* Header Filter box */}
                <div className="p-6 border-b border-slate-150 flex flex-col sm:flex-row justify-between items-stretch sm:items-center bg-slate-50 gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Saldos Autorizados no Contrato</h3>
                    <p className="text-xs text-slate-500 mt-1">Busque espécies licenciadas e consulte seus proprietários e cotas vigentes.</p>
                  </div>

                  {/* Search inside dashboard */}
                  <div className="relative w-full sm:w-72">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Pesquisar espécie ou dono..."
                      value={dashboardSearch}
                      onChange={(e) => setDashboardSearch(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2 bg-white border border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-sm focus:outline-none placeholder-slate-400 font-bold transition"
                      id="dashboard-search-input"
                    />
                    {dashboardSearch && (
                      <button
                        onClick={() => setDashboardSearch("")}
                        className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-800 font-bold text-[10px] cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                </div>

                {/* Table Logic with Search filters applied */}
                {(() => {
                  const itemsSearched = activeItemsWithBalances.filter(item => {
                    const matchesSpecie = item.especie.toLowerCase().includes(dashboardSearch.toLowerCase());
                    const matchesOwner = item.dono.toLowerCase().includes(dashboardSearch.toLowerCase());
                    return matchesSpecie || matchesOwner;
                  });

                  if (itemsSearched.length === 0) {
                    return (
                      <div className="p-12 text-center text-slate-400 space-y-2">
                        <Search className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
                        <p className="text-sm font-semibold">Nenhuma espécie localizada para a busca "{dashboardSearch}".</p>
                      </div>
                    );
                  }

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono">
                            <th className="px-6 py-4">Espécie Florestal</th>
                            <th className="px-6 py-4">Proprietário / Detentor</th>
                            <th className="px-6 py-4 text-right">Vol. Autorizado</th>
                            <th className="px-6 py-4 text-right text-orange-600">Vol. Expedido</th>
                            <th className="px-6 py-4 text-right text-emerald-800">Saldo Atual</th>
                            <th className="px-6 py-4 text-center">Consumo da Carga</th>
                            <th className="px-6 py-4 text-center no-print">Excluir</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-xs">
                          {itemsSearched.map((item) => {
                            const isLow = item.saldoAtual < 15 && item.volumeAutorizado > 30;
                            const isExhausted = item.saldoAtual <= 0;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition duration-150">
                                <td className="px-6 py-4.5 font-extrabold text-slate-900 text-sm">
                                  {item.especie}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                  <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 border border-slate-200/50 rounded-sm">
                                    <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span>{item.dono}</span>
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-extrabold text-slate-400">
                                  {item.volumeAutorizado.toFixed(3)} m³
                                </td>
                                <td className="px-6 py-4 text-right font-mono font-black text-orange-600">
                                  {item.volumeExpedido > 0 ? `-${item.volumeExpedido.toFixed(3)} m³` : "0,000"}
                                </td>
                                <td className={`px-6 py-4 text-right font-mono font-black text-sm ${
                                  isExhausted ? "text-rose-600 bg-rose-50" : isLow ? "text-amber-600 bg-amber-50" : "text-emerald-950 font-bold"
                                }`}>
                                  {item.saldoAtual.toFixed(3)} m³
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-center gap-1 min-w-[70px]">
                                    <span className="text-[10px] font-mono font-black text-slate-800">{item.percentUtilizado.toFixed(1)}%</span>
                                    <div className="w-20 bg-slate-100 h-2 border border-slate-200/80 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full transition-all duration-300 rounded-full ${
                                          isExhausted ? "bg-rose-600" : item.percentUtilizado > 85 ? "bg-amber-500" : "bg-emerald-650"
                                        }`}
                                        style={{ width: `${item.percentUtilizado}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center no-print border-l border-slate-100">
                                  <button
                                    onClick={() => handleDeleteAutexItem(item.id, item.especie)}
                                    title="Excluir item da lista de saldos autorizados"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xs transition cursor-pointer flex items-center justify-center mx-auto"
                                    type="button"
                                    id={`delete-autex-item-${item.id}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>

              {/* Transactions Logs / Historical Box */}
              <div className="bg-white border text-slate-900 rounded-lg shadow-sm border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-150 flex justify-between items-center bg-slate-50">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Histórico Recente de Lançamentos</h3>
                    <p className="text-xs text-slate-500 mt-1">Últimas baixas efetuadas para a AUTEX ativa</p>
                  </div>
                  {deductions.filter(d => d.autexId === activeAutex?.id).length > 0 && (
                    <button 
                      onClick={() => {
                        if (window.confirm("Deseja realmente limpar todos os abatimentos desta sessão?")) {
                          saveDeductions([]);
                        }
                      }}
                      className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-300 text-xs font-black uppercase text-rose-600 transition rounded-sm shadow-sm hover:border-slate-400 cursor-pointer text-center"
                      id="clear-logs-btn"
                    >
                      Limpar Histórico
                    </button>
                  )}
                </div>

                {deductions.filter(d => d.autexId === activeAutex?.id).length === 0 ? (
                  <div className="p-12 text-center text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-sm font-semibold">Nenhum lançamento gravado até o momento.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">
                          <th className="px-6 py-4">Nº da Nota</th>
                          <th className="px-6 py-4">Tipo / Arquivo</th>
                          <th className="px-6 py-4">Veículo / Caminhão</th>
                          <th className="px-6 py-4">Espécie / Dono</th>
                          <th className="px-6 py-4 text-right">Volume Abatido</th>
                          <th className="px-6 py-4 text-center">Reverter</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-xs">
                        {deductions
                          .filter(d => d.autexId === activeAutex?.id)
                          .slice(0, 5) // Display five latest logs
                          .map((ded) => (
                            <tr key={ded.id} className="hover:bg-slate-50/40 transition">
                              <td className="px-6 py-4.5">
                                <span className="font-extrabold text-slate-900">Nota #{ded.numeroNfe}</span>
                                <span className="block text-[10px] text-slate-400 mt-1 font-mono">{ded.dataEmissao}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-full ${
                                  ded.tipoLancamento === "Manual"
                                    ? "bg-amber-50 text-amber-800 border-amber-300/60"
                                    : "bg-emerald-50 text-emerald-850 border-emerald-300/60"
                                }`}>
                                  {ded.tipoLancamento || "XML"}
                                </span>
                                <span className="block text-[9px] text-slate-400 mt-1 max-w-[170px] truncate" title={ded.xmlFileName}>
                                  {ded.xmlFileName}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-mono font-bold text-slate-700">
                                <span className="inline-flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>{ded.placaCaminhao || "Não Informado"}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-slate-900 border-b border-dashed border-slate-300">{ded.especie}</span>
                                <span className="block text-[10px] text-slate-400 font-mono italic mt-1">{ded.dono}</span>
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-black text-rose-600 text-sm">
                                -{ded.volume.toFixed(3)} m³
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handleDeleteDeduction(ded.id, ded.numeroNfe)}
                                  className="text-[10px] border border-slate-300 hover:border-rose-400 text-slate-500 hover:text-rose-600 px-2 py-1 transition font-bold cursor-pointer rounded-xs"
                                  title="Estornar lançamento"
                                >
                                  REVERTER
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Módulo de Importação e Exportação de AUTEX */}
              <div className="bg-white border text-slate-900 rounded-lg shadow-sm border-slate-200 p-6 no-print grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 items-stretch" id="autex-backup-exchange-panel">
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-850" />
                      <span>Exportação de Contratos (CSV)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Transmita e preserve seus dados operacionais. Baixe os registros do contrato ativo ou faça backup consolidado de todas as AUTEX em planilhas compatíveis com o Excel.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={handleExportActiveAutex}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 text-xs rounded-sm transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      id="export-active-autex-btn"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Exportar AUTEX Ativa (.CSV)</span>
                    </button>
                    <button
                      onClick={handleExportAllBackup}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 text-xs rounded-sm transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      id="export-all-backup-btn"
                    >
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span>Backup de Todas AUTEX (.CSV)</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-150 pt-4 md:pt-0 md:pl-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-950 uppercase tracking-wider flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-850" />
                      <span>Restaurar / Importar AUTEX (CSV)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Carregue planilhas de contratos em formato .CSV contendo colunas como número da AUTEX, espécies autorizadas, volumes e detentores para registrar automaticamente.
                    </p>
                  </div>
                  <div className="pt-2">
                    <label 
                      htmlFor="csv-import-file-elem"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-sm transition cursor-pointer select-none shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Selecionar Planilha .CSV</span>
                    </label>
                    <input
                      type="file"
                      id="csv-import-file-elem"
                      accept=".csv"
                      onChange={handleImportCsvFile}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* DYNAMIC COMPONENT: TAB 2 (BAIXAR LANÇAMENTOS - MANUAL & XML) */}
          {activeTab === "lancamento" && (
            <div className="space-y-8 animate-fade-in" id="workspace-tab-lancamento">
              
              {/* Layout Intro Title */}
              <div className="border-b border-slate-200 pb-5">
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Baixar Lançamentos & Deduções</h2>
                <p className="text-xs text-slate-500 mt-1">Registre a saída física de cargas de madeira da licença. Processe arquivos XML oficiais ou insira os dados manualmente para baixa.</p>
              </div>

              {/* Two Column Section Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Column left (6 columns) - XML Drop and Simulator */}
                <div className="lg:col-span-6 space-y-8">
                  
                  {/* Real XML Importer Widget */}
                  <div className="bg-white border text-slate-900 rounded-lg shadow-sm border-slate-200 p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-850" />
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Importação Dinâmica de XML</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Os volumes das notas fiscais (modelo NF-55) serão detectados automaticamente e validados para o abatimento.</p>

                    {/* Drag and Drop XML Area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`py-12 px-4 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center cursor-pointer transition ${
                        isDragging 
                          ? "border-emerald-600 bg-emerald-50/60" 
                          : "border-slate-300 hover:border-slate-800 hover:bg-slate-50/50"
                      }`}
                      id="xml-file-uploader-box"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".xml"
                        className="hidden"
                      />
                      
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 shadow-sm border ${
                        isDragging ? "bg-emerald-100 text-emerald-800 border-emerald-400" : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        <Upload className="w-5 h-5" />
                      </div>
                      
                      <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Clique para selecionar ou arraste o arquivo</span>
                      <span className="text-[10px] text-slate-400 mt-1">Formato suportado: XML de faturamento (.xml)</span>
                    </div>

                    <div className="p-4 bg-emerald-50 text-emerald-950 border border-emerald-200/50 text-[11px] leading-relaxed rounded-sm space-y-1">
                      <span className="font-extrabold uppercase text-[10px] block text-emerald-950">Mapeador Inteligente</span>
                      O sistema processa e permite configurar os proprietários das cotas correspondentes a cada espécie faturada na nota, fornecendo uma previsão de cota antes do débito final.
                    </div>
                  </div>

                  {/* Simulator Box */}
                  <div className="bg-slate-100 border text-slate-900 rounded-lg border-slate-200 p-6 space-y-4 simulate-box" id="simulation-playground-container">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-emerald-800" />
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Simulador XML para Testes</h3>
                      </div>
                      <span className="text-[9px] bg-amber-100 border border-amber-300 font-mono font-black text-amber-850 px-2 py-0.5 rounded-xs animate-pulse">
                        Ambiente Demo
                      </span>
                    </div>
                    <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                      Gere notas fiscais fictícias para certificar o comportamento de conciliação:
                    </p>

                    {activeAutex ? (
                      <div className="space-y-4 pt-2 border-t border-slate-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Nº NF-e</label>
                            <input 
                              type="text" 
                              value={simNfeNum}
                              onChange={e => setSimNfeNum(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm"
                              placeholder="Ex: 5044"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Metragem (m³)</label>
                            <input 
                              type="text" 
                              value={simVolume}
                              onChange={e => setSimVolume(e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 text-xs font-mono text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm"
                              placeholder="Ex: 25.5"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Espécie do XML Simulado</label>
                          <select
                            value={simSelectedEspecie}
                            onChange={e => setSimSelectedEspecie(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-slate-800 font-bold rounded-sm"
                          >
                            {activeAutex.items.map(item => (
                              <option key={item.id} value={item.especie}>{item.especie} ({item.dono})</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono">
                          <button
                            onClick={() => handleSimulateQuickImport("single")}
                            className="bg-emerald-900 hover:bg-emerald-850 text-white text-[10px] font-extrabold uppercase tracking-wider py-2 transition text-center cursor-pointer rounded-xs border border-emerald-950"
                            id="simulate-single-btn"
                          >
                            Subtrair Espécie
                          </button>
                          <button
                            onClick={() => handleSimulateQuickImport("multi")}
                            className="bg-slate-900 hover:bg-slate-850 text-white text-[10px] font-extrabold uppercase tracking-wider py-2 transition text-center cursor-pointer rounded-xs border border-slate-955"
                            id="simulate-multi-btn"
                            title="Gera uma nota fiscal com múltiplas espécies de madeira"
                          >
                            Nota Multi-Espécie
                          </button>
                        </div>

                        <div className="pt-2 border-t border-slate-200">
                          <button
                            onClick={handleDownloadSampleXml}
                            className="w-full bg-white hover:bg-slate-50 text-slate-900 text-[10px] font-black uppercase tracking-wider py-2 border border-slate-300 rounded-sm cursor-pointer text-center transition flex items-center justify-center gap-1.5 shadow-xs"
                            id="download-sample-xml-btn"
                          >
                            <FileDown className="w-3.5 h-3.5 shrink-0 text-slate-500" /> Salvar Arquivo XML Física para Carregamento
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-rose-500">Selecione ou crie uma AUTEX válida para utilizar o simulador.</p>
                    )}
                  </div>

                </div>

                {/* Column right (6 columns) - Beautiful manual launch form */}
                <div className="lg:col-span-6">
                  
                  <div className="bg-white border text-slate-900 rounded-lg shadow-sm border-slate-200 p-6 space-y-5">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Truck className="w-5 h-5 text-amber-700" />
                      <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Lançamento Direto / Manual</h3>
                    </div>

                    {!activeAutex ? (
                      <div className="p-4 bg-rose-50 text-rose-700 text-xs rounded-xs border border-rose-100">
                        Nenhum contrato AUTEX selecionado para lançamentos manuais.
                      </div>
                    ) : (
                      <form onSubmit={handleManualLaunchSubmit} className="space-y-4 text-xs font-medium">
                        
                        {/* Number of NF */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Número da NF-e / Documento</label>
                          <input
                            type="text"
                            placeholder="Ex/Num: 10452 (Deixe vazio para gerar randômico)"
                            value={manualNfNumber}
                            onChange={(e) => setManualNfNumber(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800 font-mono"
                          />
                        </div>

                        {/* Transport vehicle option */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Caminhão de Transporte (Placa do Veículo)</label>
                          <input
                            type="text"
                            placeholder="Ex: ABC-1234, Mercedes-Benz Vermelho, Volvo"
                            value={manualCaminhaoState}
                            onChange={(e) => setManualCaminhaoState(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800 font-bold"
                            required
                          />
                          <div className="flex gap-2 mt-2 font-mono text-[9px] text-slate-400">
                            <span>Atalhos de Placa:</span>
                            <button type="button" onClick={() => setManualCaminhaoState("PLACA-MDF-2026")} className="underline hover:text-slate-800 cursor-pointer">MDF-2026</button>
                            <span>|</span>
                            <button type="button" onClick={() => setManualCaminhaoState("PLACA-PA-5040")} className="underline hover:text-slate-800 cursor-pointer">PA-5040</button>
                            <span>|</span>
                            <button type="button" onClick={() => setManualCaminhaoState("Scania Graneleiro")} className="underline hover:text-slate-800 cursor-pointer">Scania</button>
                          </div>
                        </div>

                        {/* Date of posting */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">Data de Emissão do Lançamento</label>
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800 font-mono"
                            required
                          />
                        </div>

                        {/* Species and Owner select fields separated */}
                        {(() => {
                          const uniqueSpecies = Array.from(new Set(activeAutex.items.map(item => item.especie)));
                          const uniqueOwners = Array.from(new Set(activeAutex.items.map(item => item.dono)));
                          const currentMatchingItem = activeAutex.items.find(
                            i => i.especie.trim().toLowerCase() === manualEspecie.trim().toLowerCase() &&
                                 i.dono.trim().toLowerCase() === manualDono.trim().toLowerCase()
                          );
                          const matchingBalance = currentMatchingItem
                            ? activeItemsWithBalances.find(b => b.id === currentMatchingItem.id)
                            : null;

                          return (
                            <>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Separated species field */}
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                                    Espécie do Manejo (Preenchimento)
                                  </label>
                                  <input
                                    type="text"
                                    list="manual-especie-datalist"
                                    value={manualEspecie}
                                    onChange={(e) => setManualEspecie(e.target.value)}
                                    placeholder="Ex: Ipê, Cumaru..."
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800 font-bold"
                                    required
                                  />
                                  <datalist id="manual-especie-datalist">
                                    {uniqueSpecies.map(esp => (
                                      <option key={esp} value={esp} />
                                    ))}
                                  </datalist>
                                  <span className="text-[10px] text-slate-400 mt-1 block">
                                    Digite ou selecione uma espécie cadastrada.
                                  </span>
                                </div>

                                {/* Separated owner field */}
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5">
                                    Proprietário / Dono da Madeira (Preenchimento)
                                  </label>
                                  <input
                                    type="text"
                                    list="manual-dono-datalist"
                                    value={manualDono}
                                    onChange={(e) => setManualDono(e.target.value)}
                                    placeholder="Ex: Empresa de Madeiras S/A..."
                                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800 font-bold"
                                    required
                                  />
                                  <datalist id="manual-dono-datalist">
                                    {uniqueOwners.map(owner => (
                                      <option key={owner} value={owner} />
                                    ))}
                                  </datalist>
                                  <span className="text-[10px] text-slate-400 mt-1 block">
                                    Digite ou selecione o detentor da cota de saldo.
                                  </span>
                                </div>
                              </div>

                              {/* Balance Check / Helper visual state */}
                              <div className="pt-1 select-none">
                                {currentMatchingItem && matchingBalance ? (
                                  <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-md text-emerald-950 font-medium text-[11px]">
                                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse flex-shrink-0"></span>
                                    <span>
                                      Cota vinculada: <strong className="font-extrabold text-emerald-800">{matchingBalance.saldoAtual.toFixed(3)} m³ livres</strong> (de {currentMatchingItem.volumeAutorizado.toFixed(3)} m³ originais).
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-[11px]">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 flex-shrink-0"></span>
                                    <div>
                                      <span className="font-semibold block">⚠️ Combinação não registrada na AUTEX:</span>
                                      <span className="text-[10px] text-amber-805 block mt-0.5">
                                        Não há cota de saldo autorizada cadastrada para a espécie "{manualEspecie || '(vazia)'}" associada ao proprietário "{manualDono || '(vazio)'}". Por favor, digite ou selecione uma combinação compatível.
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}

                        {/* Metragem / Volume */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 font-bold">Volume a Abater (m³)</label>
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            placeholder="Ex: 15.450"
                            value={manualVolume}
                            onChange={(e) => setManualVolume(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 text-slate-800 focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800 font-mono text-base font-black text-rose-600 focus:bg-rose-50/20"
                            required
                          />
                        </div>

                        {/* Action Submit */}
                        <div className="pt-3 border-t border-slate-100 flex justify-end">
                          <button
                            type="submit"
                            className="w-full sm:w-auto px-6 py-3 bg-emerald-900 hover:bg-emerald-800 text-white font-black uppercase tracking-wider text-xs rounded-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-emerald-950"
                            id="submit-manual-launch"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                            <span>Abater Saldo da AUTEX</span>
                          </button>
                        </div>

                      </form>
                    )}
                  </div>

                </div>

              </div>
              
            </div>
          )}

          {/* DYNAMIC COMPONENT: TAB 3 (MÓDULO DE RELATÓRIOS & ANALÍTICO) */}
          {activeTab === "relatorios" && (
            <RelatoriosModule
              activeAutex={activeAutex}
              deductions={deductions}
              sawmillLogs={sawmillLogs}
              onDeleteDeduction={handleDeleteDeduction}
              filterOwner={filterOwner}
              setFilterOwner={setFilterOwner}
              filterEspecie={filterEspecie}
              setFilterEspecie={setFilterEspecie}
              filterTruck={filterTruck}
              setFilterTruck={setFilterTruck}
              filterTipo={filterTipo}
              setFilterTipo={setFilterTipo}
              reportSubTab={reportSubTab}
              setReportSubTab={setReportSubTab}
              totalVolumeAutorizado={totalVolumeAutorizado}
              totalVolumeExpedido={totalVolumeExpedido}
              totalSaldoAtual={totalSaldoAtual}
              volByOwnerList={volByOwnerList}
            />
          )}

          {/* DYNAMIC COMPONENT: TAB 4 (MÓDULO SERRARIA) */}
          {activeTab === "serraria" && (
            <SerrariaModule 
              deductions={deductions}
              sawmillLogs={sawmillLogs}
              onSaveSawmillLogs={saveSawmillLogs}
            />
          )}

          {/* DYNAMIC COMPONENT: TAB 5 (MÓDULO LOGÍSTICA) */}
          {activeTab === "logistica" && (
            <LogisticaModule 
              deductions={deductions}
            />
          )}

          {/* DYNAMIC COMPONENT: TAB 6 (MÓDULO BACKUP) */}
          {activeTab === "backup" && (
            <BackupModule
              autexList={autexList}
              onRestoreAutexList={saveAutexList}
              deductions={deductions}
              onRestoreDeductions={saveDeductions}
              sawmillLogs={sawmillLogs}
              onRestoreSawmillLogs={saveSawmillLogs}
              currentUser={currentUser}
              onAddSecurityLog={handleAddSecurityLog}
            />
          )}

          {/* DYNAMIC COMPONENT: TAB 7 (CONTROLE DE USUÁRIOS) */}
          {activeTab === "usuarios" && (
            <UserControlModule
              currentUser={currentUser}
              onSwitchUser={handleSwitchUser}
              securityLogs={securityLogs}
              onAddSecurityLog={handleAddSecurityLog}
              onClearSecurityLogs={handleClearSecurityLogs}
            />
          )}

        </main>

        {/* FOOTER */}
        <footer className="bg-slate-900 text-slate-450 py-6 px-8 border-t border-slate-950 flex flex-col sm:flex-row items-center justify-between text-[11px] font-medium tracking-wide shrink-0 gap-4 mt-auto no-print">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-center sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-405 animate-pulse"></span>
              <span className="font-mono text-[10px] text-slate-350">Controle Sincronizado</span>
            </div>
          </div>
          <div className="text-slate-500 font-mono text-center sm:text-right">
            © 2026 ETW CONTROLE DE AUTEX • DESENVOLVIDO POR ESTRELOW SOLUCOES TECNOLOGICAS
          </div>
        </footer>

      </div>

      {/* --- MODALS AND OVERLAYS --- */}
      
      <CreateAutexModal
        isOpen={isCreateAutexOpen}
        onClose={() => setIsCreateAutexOpen(false)}
        onSave={handleCreateAutex}
      />

      <NfeMappingModal
        isOpen={isMappingOpen}
        importResult={xmlImportResult}
        activeAutex={activeAutex}
        onClose={() => {
          setIsMappingOpen(false);
          setXmlImportResult(null);
          setImportedFileName("");
        }}
        onConfirm={handleConfirmMapping}
        onAddAutexItem={handleAddAutexItemOnTheFly}
      />

      <PwaInstallModal
        isOpen={isPwaModalOpen}
        onClose={() => setIsPwaModalOpen(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => {
          setIsPwaInstalled(true);
          handleAddSecurityLog("PROCESSO PWA", "Aplicativo instalado e inicializado via prompt", "sucesso");
        }}
      />

    </div>
  );
}
