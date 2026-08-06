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
  Scale,
  FileSpreadsheet,
  Upload,
  Download,
  RefreshCw,
  X,
  Edit2,
  Check,
  FileText,
  Wrench
} from "lucide-react";

interface ImportedSerrariaSaldo {
  id: string;
  produto: string;
  cientifico: string;
  popular: string;
  saldo: number;
}

const defaultExampleSaldos: ImportedSerrariaSaldo[] = [
  { id: "ex-1", produto: "Madeira beneficiada", cientifico: "Erisma uncinatum", popular: "Libra", saldo: 0.6073 },
  { id: "ex-2", produto: "Madeira serrada", cientifico: "Hymenaea courbaril", popular: "Jatobá", saldo: 2.994 },
  { id: "ex-3", produto: "Madeira serrada", cientifico: "Peltogyne paniculata", popular: "Roxinho", saldo: 2.4624 },
  { id: "ex-4", produto: "Madeira serrada", cientifico: "Copaifera multijuga", popular: "Copaíba", saldo: 0.2735 },
  { id: "ex-5", produto: "Madeira serrada", cientifico: "Aspidosperma ellipsocarpum", popular: "Peroba-rosa", saldo: 28.409 },
  { id: "ex-6", produto: "Madeira serrada", cientifico: "Protium robustum", popular: "Breu", saldo: 10.987 },
  { id: "ex-7", produto: "Madeira serrada", cientifico: "Qualea paraensis", popular: "Cambará", saldo: 32.2012 },
  { id: "ex-8", produto: "Madeira serrada", cientifico: "Erisma uncinatum", popular: "Libra", saldo: 20.0287 },
  { id: "ex-9", produto: "TORA", cientifico: "Allantoma lineata", popular: "Jequitibá", saldo: 68.385 },
  { id: "ex-10", produto: "TORA", cientifico: "Enterolobium schomburgkii", popular: "Orelha-de-macaco", saldo: 4.9813 },
  { id: "ex-11", produto: "TORA", cientifico: "Bowdichia nitida", popular: "Sucupira", saldo: 7.487 },
  { id: "ex-12", produto: "TORA", cientifico: "Caryocar villosum", popular: "Pequi", saldo: 6.1619 }
];

const scientificNamesMap: Record<string, string> = {
  "libra": "Erisma uncinatum",
  "jatoba": "Hymenaea courbaril",
  "roxinho": "Peltogyne paniculata",
  "copaiba": "Copaifera multijuga",
  "peroba-rosa": "Aspidosperma ellipsocarpum",
  "breu": "Protium robustum",
  "cambara": "Qualea paraensis",
  "jequitiba": "Allantoma lineata",
  "orelha-de-macaco": "Enterolobium schomburgkii",
  "sucupira": "Bowdichia nitida",
  "pequi": "Caryocar villosum",
  "ipe": "Handroanthus albus",
  "cedro": "Cedrela odorata",
  "angelim": "Hymenolobium petraeum",
  "angelim-pedra": "Hymenolobium petraeum",
  "cumaru": "Dipteryx odorata",
  "freijo": "Cordia goeldiana",
  "itauba": "Mezilaurus itauba",
  "massaranduba": "Manilkara huberi",
  "maracatiara": "Astronium lecointei",
  "tauari": "Couratari guianensis",
  "tatajuba": "Bagassa guianensis"
};

function getScientificName(popular: string): string {
  if (!popular) return "—";
  const norm = popular.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (scientificNamesMap[norm]) {
    return scientificNamesMap[norm];
  }

  // Fallback fuzzy/substring matching to match complex or composite names in active Autex / NF-e
  if (norm.includes("ipe")) return "Handroanthus albus";
  if (norm.includes("jatoba")) return "Hymenaea courbaril";
  if (norm.includes("cedro")) return "Cedrela odorata";
  if (norm.includes("angelim")) return "Hymenolobium petraeum";
  if (norm.includes("cumaru")) return "Dipteryx odorata";
  if (norm.includes("roxinho")) return "Peltogyne paniculata";
  if (norm.includes("freijo")) return "Cordia goeldiana";
  if (norm.includes("itauba")) return "Mezilaurus itauba";
  if (norm.includes("maracatiara")) return "Astronium lecointei";
  if (norm.includes("tauari")) return "Couratari guianensis";
  if (norm.includes("massaranduba")) return "Manilkara huberi";
  if (norm.includes("sucupira")) return "Bowdichia nitida";
  if (norm.includes("libra")) return "Erisma uncinatum";
  if (norm.includes("copaiba")) return "Copaifera multijuga";
  if (norm.includes("peroba")) return "Aspidosperma ellipsocarpum";
  if (norm.includes("breu")) return "Protium robustum";
  if (norm.includes("cambara")) return "Qualea paraensis";
  if (norm.includes("jequitiba")) return "Allantoma lineata";
  if (norm.includes("orelha")) return "Enterolobium schomburgkii";
  if (norm.includes("pequi")) return "Caryocar villosum";
  if (norm.includes("tatajuba")) return "Bagassa guianensis";

  return "—";
}

function getBaseProduct(prod: string): string {
  if (!prod) return "";
  const idx = prod.indexOf(" (");
  if (idx !== -1) {
    return prod.substring(0, idx).trim();
  }
  return prod.trim();
}

function getClientFromProduct(prod: string): string {
  if (!prod) return "";
  const idx = prod.indexOf(" (Venda: ");
  if (idx !== -1) {
    const endIdx = prod.indexOf(")", idx);
    if (endIdx !== -1) {
      return prod.substring(idx + 9, endIdx).trim();
    }
    return prod.substring(idx + 9).trim();
  }
  return "";
}

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

  // Sub tab navigation inside SerrariaModule
  const [serrariaSubTab, setSerrariaSubTab] = useState<"producao" | "saldos">("producao");

  // Search filter for balances
  const [saldosFilter, setSaldosFilter] = useState("");

  // Form tab selection
  const [activeFormTab, setActiveFormTab] = useState<"desdobro" | "beneficiamento" | "saida">("desdobro");

  // Form states for manual process registration (desdobro)
  const [serrariaEspecie, setSerrariaEspecie] = useState("");
  const [serrariaDono, setSerrariaDono] = useState("");
  const [serrariaVolTora, setSerrariaVolTora] = useState("");
  const [serrariaVolSerrado, setSerrariaVolSerrado] = useState("");
  const [serrariaProduto, setSerrariaProduto] = useState("Serrado");
  const [serrariaDate, setSerrariaDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form states for Beneficiamento (plainamento de madeira serrada -> beneficiada)
  const [benEspecie, setBenEspecie] = useState("");
  const [benDono, setBenDono] = useState("");
  const [benProdutoOrigem, setBenProdutoOrigem] = useState("Serrado");
  const [benVolEntrada, setBenVolEntrada] = useState("");
  const [benProdutoDestino, setBenProdutoDestino] = useState("Beneficiado");
  const [benVolSaida, setBenVolSaida] = useState("");
  const [benDate, setBenDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form states for manual product exit (venda externa)
  const [vendaEspecie, setVendaEspecie] = useState("");
  const [vendaDono, setVendaDono] = useState("");
  const [vendaProduto, setVendaProduto] = useState("");
  const [vendaVolume, setVendaVolume] = useState("");
  const [vendaCliente, setVendaCliente] = useState("");
  const [vendaDate, setVendaDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Edit mode states for product exit (venda externa)
  const [editingLog, setEditingLog] = useState<SawmillProcessLog | null>(null);
  const [editEspecie, setEditEspecie] = useState("");
  const [editDono, setEditDono] = useState("");
  const [editProduto, setEditProduto] = useState("");
  const [editVolume, setEditVolume] = useState("");
  const [editCliente, setEditCliente] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleExportSaldosCSV = () => {
    if (currentSaldosList.length === 0) return;

    let csvLines = ["PRODUTO;CIENTIFICO;POPULAR;SALDO"];
    currentSaldosList.forEach(item => {
      const cleanProd = item.produto.replace(/;/g, ",");
      const cleanCient = (item.cientifico || "").replace(/;/g, ",");
      const cleanPop = item.popular.replace(/;/g, ",");
      const cleanSaldo = item.saldo.toFixed(4).replace(".", ",");
      csvLines.push(`${cleanProd};${cleanCient};${cleanPop};${cleanSaldo}`);
    });

    const content = csvLines.join("\n");
    const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const filename = "estoque_serraria_sincronizado.csv";
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Metrics calculation
  const totalLogsReceived = useMemo(() => deductions.reduce((sum, d) => sum + d.volume, 0), [deductions]);
  const totalLogsProcessed = useMemo(() => sawmillLogs.reduce((sum, l) => sum + l.volumeTora, 0), [sawmillLogs]);
  const currentLogsYardStock = useMemo(() => {
    return Math.max(0, totalLogsReceived - totalLogsProcessed);
  }, [totalLogsReceived, totalLogsProcessed]);

  const totalSawnProduced = useMemo(() => sawmillLogs.filter(l => l.volumeSerrado > 0).reduce((sum, l) => sum + l.volumeSerrado, 0), [sawmillLogs]);
  const overallYield = useMemo(() => {
    if (totalLogsProcessed === 0) return 0;
    return (totalSawnProduced / totalLogsProcessed) * 100;
  }, [totalLogsProcessed, totalSawnProduced]);

  // Grouped finished goods stock
  const sawnStockList = useMemo(() => {
    const list: { especie: string; dono: string; produto: string; volume: number }[] = [];
    sawmillLogs.forEach(log => {
      const baseProduct = getBaseProduct(log.produtoSaida);
      const existing = list.find(
        x => x.especie.toLowerCase().trim() === log.especie.toLowerCase().trim() &&
             x.dono.toLowerCase().trim() === log.dono.toLowerCase().trim() &&
             getBaseProduct(x.produto).toLowerCase().trim() === baseProduct.toLowerCase().trim()
      );
      if (existing) {
        existing.volume += log.volumeSerrado;
      } else {
        list.push({
          especie: log.especie,
          dono: log.dono,
          produto: baseProduct,
          volume: log.volumeSerrado
        });
      }
    });
    return list;
  }, [sawmillLogs]);

  // Unique species available in Sawn/Benefited stock with positive volume
  const uniqueSawnSpecies = useMemo(() => {
    return Array.from(new Set(sawnStockList.filter(x => x.volume > 0.0001).map(x => x.especie)));
  }, [sawnStockList]);

  // Unique owners for selected species in Sawn/Benefited stock with positive volume
  const uniqueSawnOwnersForSelectedSpecies = useMemo(() => {
    if (!vendaEspecie) return [];
    return Array.from(new Set(
      sawnStockList
        .filter(x => x.especie.toLowerCase().trim() === vendaEspecie.toLowerCase().trim() && x.volume > 0.0001)
        .map(x => x.dono)
    ));
  }, [vendaEspecie, sawnStockList]);

  // Unique products for selected species and owner in Sawn/Benefited stock with positive volume
  const uniqueSawnProductsForSelectedSpecAndOwner = useMemo(() => {
    if (!vendaEspecie || !vendaDono) return [];
    return Array.from(new Set(
      sawnStockList
        .filter(
          x => x.especie.toLowerCase().trim() === vendaEspecie.toLowerCase().trim() &&
               x.dono.toLowerCase().trim() === vendaDono.toLowerCase().trim() &&
               x.volume > 0.0001
        )
        .map(x => x.produto)
    ));
  }, [vendaEspecie, vendaDono, sawnStockList]);

  // --- Edit Mode Derived Values ---

  // Calculate stock from all sawmillLogs EXCEPT the one being edited
  const currentSawnStockBalanceForEdit = useMemo(() => {
    if (!editingLog || !editEspecie || !editDono || !editProduto) return 0;
    
    const logsExceptCurrent = sawmillLogs.filter(l => l.id !== editingLog.id);
    const list: { especie: string; dono: string; produto: string; volume: number }[] = [];
    logsExceptCurrent.forEach(log => {
      const baseProduct = getBaseProduct(log.produtoSaida);
      const existing = list.find(
        x => x.especie.toLowerCase().trim() === log.especie.toLowerCase().trim() &&
             x.dono.toLowerCase().trim() === log.dono.toLowerCase().trim() &&
             getBaseProduct(x.produto).toLowerCase().trim() === baseProduct.toLowerCase().trim()
      );
      if (existing) {
        existing.volume += log.volumeSerrado;
      } else {
        list.push({
          especie: log.especie,
          dono: log.dono,
          produto: baseProduct,
          volume: log.volumeSerrado
        });
      }
    });

    const match = list.find(
      x => x.especie.toLowerCase().trim() === editEspecie.toLowerCase().trim() &&
           x.dono.toLowerCase().trim() === editDono.toLowerCase().trim() &&
           x.produto.toLowerCase().trim() === editProduto.toLowerCase().trim()
    );
    return match ? match.volume : 0;
  }, [editingLog, editEspecie, editDono, editProduto, sawmillLogs]);

  // Unique species in sawmillLogs that have positive production, or includes currently edited specie
  const editUniqueSpecies = useMemo(() => {
    const list = Array.from(new Set(
      sawmillLogs
        .filter(l => l.volumeSerrado > 0)
        .map(l => l.especie)
    ));
    if (editingLog && !list.some(s => s.toLowerCase().trim() === editingLog.especie.toLowerCase().trim())) {
      list.push(editingLog.especie);
    }
    return list;
  }, [sawmillLogs, editingLog]);

  // Unique owners of the selected edit species, or includes currently edited owner
  const editUniqueOwnersForSpecies = useMemo(() => {
    if (!editEspecie) return [];
    const list = Array.from(new Set(
      sawmillLogs
        .filter(l => l.volumeSerrado > 0 && l.especie.toLowerCase().trim() === editEspecie.toLowerCase().trim())
        .map(l => l.dono)
    ));
    if (editingLog && 
        editingLog.especie.toLowerCase().trim() === editEspecie.toLowerCase().trim() && 
        !list.some(d => d.toLowerCase().trim() === editingLog.dono.toLowerCase().trim())) {
      list.push(editingLog.dono);
    }
    return list;
  }, [editEspecie, sawmillLogs, editingLog]);

  // Unique products of the selected edit species and owner, or includes currently edited product
  const editUniqueProductsForSpecAndOwner = useMemo(() => {
    if (!editEspecie || !editDono) return [];
    const list = Array.from(new Set(
      sawmillLogs
        .filter(
          l => l.volumeSerrado > 0 &&
               l.especie.toLowerCase().trim() === editEspecie.toLowerCase().trim() &&
               l.dono.toLowerCase().trim() === editDono.toLowerCase().trim()
        )
        .map(l => getBaseProduct(l.produtoSaida))
    ));
    if (editingLog && 
        editingLog.especie.toLowerCase().trim() === editEspecie.toLowerCase().trim() && 
        editingLog.dono.toLowerCase().trim() === editDono.toLowerCase().trim()) {
      const baseProd = getBaseProduct(editingLog.produtoSaida);
      if (!list.some(p => p.toLowerCase().trim() === baseProd.toLowerCase().trim())) {
        list.push(baseProd);
      }
    }
    return list;
  }, [editEspecie, editDono, sawmillLogs, editingLog]);

  // Sync owners and products when species changes
  const handleVendaSpeciesChange = (esp: string) => {
    setVendaEspecie(esp);
    const relatedOwners = sawnStockList.filter(
      x => x.especie.toLowerCase().trim() === esp.toLowerCase().trim() && x.volume > 0.0001
    );
    if (relatedOwners.length > 0) {
      const firstDono = relatedOwners[0].dono;
      setVendaDono(firstDono);
      const relatedProds = sawnStockList.filter(
        x => x.especie.toLowerCase().trim() === esp.toLowerCase().trim() &&
             x.dono.toLowerCase().trim() === firstDono.toLowerCase().trim() &&
             x.volume > 0.0001
      );
      if (relatedProds.length > 0) {
        setVendaProduto(relatedProds[0].produto);
      } else {
        setVendaProduto("");
      }
    } else {
      setVendaDono("");
      setVendaProduto("");
    }
  };

  // Sync products when owner changes
  const handleVendaOwnerChange = (dono: string) => {
    setVendaDono(dono);
    const relatedProds = sawnStockList.filter(
      x => x.especie.toLowerCase().trim() === vendaEspecie.toLowerCase().trim() &&
           x.dono.toLowerCase().trim() === dono.toLowerCase().trim() &&
           x.volume > 0.0001
    );
    if (relatedProds.length > 0) {
      setVendaProduto(relatedProds[0].produto);
    } else {
      setVendaProduto("");
    }
  };

  // --- Beneficiamento Helpers & Derived Values ---

  const uniqueSawnOwnersForSelectedBenSpecies = useMemo(() => {
    if (!benEspecie) return [];
    return Array.from(new Set(
      sawnStockList
        .filter(x => x.especie.toLowerCase().trim() === benEspecie.toLowerCase().trim() && x.volume > 0.0001)
        .map(x => x.dono)
    ));
  }, [benEspecie, sawnStockList]);

  const uniqueSawnProductsForSelectedBenSpecAndOwner = useMemo(() => {
    if (!benEspecie || !benDono) return [];
    return Array.from(new Set(
      sawnStockList
        .filter(
          x => x.especie.toLowerCase().trim() === benEspecie.toLowerCase().trim() &&
               x.dono.toLowerCase().trim() === benDono.toLowerCase().trim() &&
               x.volume > 0.0001
        )
        .map(x => x.produto)
    ));
  }, [benEspecie, benDono, sawnStockList]);

  const handleBenSpeciesChange = (esp: string) => {
    setBenEspecie(esp);
    const relatedOwners = sawnStockList.filter(
      x => x.especie.toLowerCase().trim() === esp.toLowerCase().trim() && x.volume > 0.0001
    );
    if (relatedOwners.length > 0) {
      const firstDono = relatedOwners[0].dono;
      setBenDono(firstDono);
      const relatedProds = sawnStockList.filter(
        x => x.especie.toLowerCase().trim() === esp.toLowerCase().trim() &&
             x.dono.toLowerCase().trim() === firstDono.toLowerCase().trim() &&
             x.volume > 0.0001
      );
      if (relatedProds.length > 0) {
        setBenProdutoOrigem(relatedProds[0].produto);
      } else {
        setBenProdutoOrigem("");
      }
    } else {
      setBenDono("");
      setBenProdutoOrigem("");
    }
  };

  const handleBenOwnerChange = (dono: string) => {
    setBenDono(dono);
    const relatedProds = sawnStockList.filter(
      x => x.especie.toLowerCase().trim() === benEspecie.toLowerCase().trim() &&
           x.dono.toLowerCase().trim() === dono.toLowerCase().trim() &&
           x.volume > 0.0001
    );
    if (relatedProds.length > 0) {
      setBenProdutoOrigem(relatedProds[0].produto);
    } else {
      setBenProdutoOrigem("");
    }
  };

  const currentBenStockBalance = useMemo(() => {
    if (!benEspecie || !benDono || !benProdutoOrigem) return 0;
    const match = sawnStockList.find(
      x => x.especie.toLowerCase().trim() === benEspecie.toLowerCase().trim() &&
           x.dono.toLowerCase().trim() === benDono.toLowerCase().trim() &&
           x.produto.toLowerCase().trim() === benProdutoOrigem.toLowerCase().trim()
    );
    return match ? match.volume : 0;
  }, [benEspecie, benDono, benProdutoOrigem, sawnStockList]);

  const benYieldPercent = useMemo(() => {
    const volIn = parseFloat(benVolEntrada);
    const volOut = parseFloat(benVolSaida);
    if (!volIn || !volOut || isNaN(volIn) || isNaN(volOut) || volIn <= 0) return 0;
    return (volOut / volIn) * 100;
  }, [benVolEntrada, benVolSaida]);

  const handleSubmitBeneficiamento = (e: React.FormEvent) => {
    e.preventDefault();
    const volIn = parseFloat(benVolEntrada);
    const volOut = parseFloat(benVolSaida);

    if (!benEspecie) {
      alert("Selecione a espécie para o beneficiamento.");
      return;
    }
    if (!benDono) {
      alert("Selecione o proprietário florestal correspondente.");
      return;
    }
    if (!benProdutoOrigem) {
      alert("Selecione o produto serrado de origem.");
      return;
    }
    if (!benProdutoDestino) {
      alert("Selecione ou digite o produto beneficiado resultante.");
      return;
    }
    if (isNaN(volIn) || volIn <= 0) {
      alert("Informe um volume de entrada de madeira serrada válido.");
      return;
    }
    if (isNaN(volOut) || volOut <= 0) {
      alert("Informe o volume de madeira beneficiada produzido.");
      return;
    }
    if (volIn > currentBenStockBalance + 0.0001) {
      alert(`Volume de entrada superior ao estoque disponível de ${benProdutoOrigem} (${currentBenStockBalance.toFixed(3)} m³).`);
      return;
    }

    const yieldPct = parseFloat(((volOut / volIn) * 100).toFixed(2));

    // Entry 1: Abater produto de origem (Serrado)
    const logIn: SawmillProcessLog = {
      id: "ben_in_" + Math.random().toString(36).substr(2, 9),
      especie: benEspecie,
      dono: benDono,
      volumeTora: 0,
      volumeSerrado: -volIn,
      produtoSaida: `${benProdutoOrigem} (Beneficiamento - Consumo)`,
      rendimento: 0,
      dataProcessamento: benDate
    };

    // Entry 2: Entrada do produto beneficiado resultante
    const logOut: SawmillProcessLog = {
      id: "ben_out_" + Math.random().toString(36).substr(2, 9),
      especie: benEspecie,
      dono: benDono,
      volumeTora: 0,
      volumeSerrado: volOut,
      produtoSaida: benProdutoDestino,
      rendimento: yieldPct,
      dataProcessamento: benDate
    };

    saveSawmillLogs([logOut, logIn, ...sawmillLogs]);

    // Reset inputs
    setBenVolEntrada("");
    setBenVolSaida("");
    alert(`Beneficiamento gravado com sucesso!\n- ${volIn.toFixed(3)} m³ de ${benProdutoOrigem} foram processados.\n+ ${volOut.toFixed(3)} m³ de ${benProdutoDestino} foram adicionados ao estoque.`);
  };

  const handleQuickBeneficiar = (especie: string, dono: string, produto: string, maxVol: number) => {
    setActiveFormTab("beneficiamento");
    setBenEspecie(especie);
    setBenDono(dono);
    setBenProdutoOrigem(produto);
    setBenVolEntrada(maxVol.toFixed(3));
    setBenVolSaida((maxVol * 0.90).toFixed(3));
    
    // Smooth scroll to form
    const elem = document.getElementById("form-desdobro-serraria");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Calculate current available finished goods balance
  const currentSawnStockBalance = useMemo(() => {
    if (!vendaEspecie || !vendaDono || !vendaProduto) return 0;
    const match = sawnStockList.find(
      x => x.especie.toLowerCase().trim() === vendaEspecie.toLowerCase().trim() &&
           x.dono.toLowerCase().trim() === vendaDono.toLowerCase().trim() &&
           x.produto.toLowerCase().trim() === vendaProduto.toLowerCase().trim()
    );
    return match ? match.volume : 0;
  }, [vendaEspecie, vendaDono, vendaProduto, sawnStockList]);

  // Form submission: external product sale / exit
  const handleSubmitVenda = (e: React.FormEvent) => {
    e.preventDefault();
    const volVenda = parseFloat(vendaVolume);

    if (!vendaEspecie) {
      alert("Selecione a espécie para a saída.");
      return;
    }
    if (!vendaDono) {
      alert("Selecione o proprietário florestal correspondente.");
      return;
    }
    if (!vendaProduto) {
      alert("Selecione o produto acabado.");
      return;
    }
    if (isNaN(volVenda) || volVenda <= 0) {
      alert("Informe um volume de saída válido.");
      return;
    }
    if (volVenda > currentSawnStockBalance + 0.0001) {
      alert(`Volume superior ao estoque disponível para este produto (${currentSawnStockBalance.toFixed(3)} m³).`);
      return;
    }

    const labelCliente = vendaCliente.trim() ? `Venda: ${vendaCliente.trim()}` : "Venda Externa";
    const displayProduct = `${vendaProduto} (${labelCliente})`;

    const newLog: SawmillProcessLog = {
      id: "sale_" + Math.random().toString(36).substr(2, 9),
      especie: vendaEspecie,
      dono: vendaDono,
      volumeTora: 0,
      volumeSerrado: -volVenda,
      produtoSaida: displayProduct,
      rendimento: 0,
      dataProcessamento: vendaDate
    };

    saveSawmillLogs([newLog, ...sawmillLogs]);

    // Reset inputs
    setVendaVolume("");
    setVendaCliente("");
    alert(`Saída de produto registrada com sucesso! ${volVenda.toFixed(3)} m³ de ${vendaEspecie} (${vendaProduto}) foram abatidos do estoque.`);
  };

  // Quick fill sale form from Warehouse table
  const handleQuickVenda = (especie: string, dono: string, produto: string, maxVol: number) => {
    setActiveFormTab("saida");
    setVendaEspecie(especie);
    setVendaDono(dono);
    setVendaProduto(produto);
    setVendaVolume(maxVol.toFixed(3));
    
    // Smooth scroll to form
    const elem = document.getElementById("form-desdobro-serraria");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Revert/Delete process log (handles both Desdobro and Sale logs)
  const handleDeleteProcessLog = (id: string, esp: string, vol: number) => {
    const logItem = sawmillLogs.find(x => x.id === id);
    if (!logItem) return;

    const isVenda = logItem.volumeSerrado < 0;
    const msg = isVenda
      ? `Tem certeza que deseja estornar esta saída/venda de ${Math.abs(logItem.volumeSerrado).toFixed(3)} m³ de ${esp}? O volume retornará ao estoque de acabados.`
      : `Tem certeza que deseja estornar este desdobro de ${vol.toFixed(3)} m³ de ${esp}? O volume de toras retornará ao pátio.`;

    if (window.confirm(msg)) {
      const updated = sawmillLogs.filter(x => x.id !== id);
      saveSawmillLogs(updated);
    }
  };

  const handleEditVenda = (log: SawmillProcessLog) => {
    setEditingLog(log);
    setEditEspecie(log.especie);
    setEditDono(log.dono);
    const baseProd = getBaseProduct(log.produtoSaida);
    setEditProduto(baseProd);
    setEditVolume(Math.abs(log.volumeSerrado).toString());
    setEditCliente(getClientFromProduct(log.produtoSaida));
    setEditDate(log.dataProcessamento);
  };

  const handleSaveEditVenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;

    const volVenda = parseFloat(editVolume);

    if (!editEspecie) {
      alert("Selecione a espécie para a saída.");
      return;
    }
    if (!editDono) {
      alert("Selecione o proprietário florestal correspondente.");
      return;
    }
    if (!editProduto) {
      alert("Selecione o produto acabado.");
      return;
    }
    if (isNaN(volVenda) || volVenda <= 0) {
      alert("Informe um volume de saída válido.");
      return;
    }

    if (volVenda > currentSawnStockBalanceForEdit + 0.0001) {
      alert(`Volume superior ao estoque disponível para este produto (${currentSawnStockBalanceForEdit.toFixed(3)} m³).`);
      return;
    }

    const labelCliente = editCliente.trim() ? `Venda: ${editCliente.trim()}` : "Venda Externa";
    const displayProduct = `${editProduto} (${labelCliente})`;

    const updatedLogs = sawmillLogs.map(log => {
      if (log.id === editingLog.id) {
        return {
          ...log,
          especie: editEspecie,
          dono: editDono,
          volumeSerrado: -volVenda,
          produtoSaida: displayProduct,
          dataProcessamento: editDate
        };
      }
      return log;
    });

    saveSawmillLogs(updatedLogs);
    setEditingLog(null);
    alert("Saída de produto atualizada com sucesso!");
  };

  const saveSawmillLogs = (list: SawmillProcessLog[]) => {
    onSaveSawmillLogs(list);
  };

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

  // Dynamically generated real system balances (TORA and Processed Wood)
  const dynamicSystemSaldos = useMemo((): ImportedSerrariaSaldo[] => {
    const grouped: Record<string, { produto: string; cientifico: string; popular: string; saldo: number }> = {};
    
    // 1. Logs currently in the yard (TORA)
    patioStockList.forEach((item) => {
      if (item.saldo <= 0) return;
      const popularName = item.especie;
      // Group by Product type under "TORA" and Species Popular name
      const key = `TORA||${popularName.toLowerCase().trim()}`;
      if (!grouped[key]) {
        grouped[key] = {
          produto: "TORA",
          cientifico: getScientificName(popularName),
          popular: popularName,
          saldo: 0
        };
      }
      grouped[key].saldo += item.saldo;
    });

    // 2. Processed wood stock from active sawmill conversions
    sawnStockList.forEach((item) => {
      if (item.volume <= 0) return;
      const popularName = item.especie;
      
      // Map product name for general balances layout
      let displayProd = "Madeira serrada";
      const pLower = item.produto.toLowerCase();
      if (pLower.includes("benefic")) {
        displayProd = "Madeira beneficiada";
      } else if (pLower.includes("tora")) {
        displayProd = "TORA";
      } else if (pLower.includes("rodela")) {
        displayProd = "Rodela";
      } else if (pLower.includes("lenha")) {
        displayProd = "Lenha";
      } else if (pLower.includes("lamina") || pLower.includes("lâmina")) {
        displayProd = "Lâmina";
      } else {
        displayProd = "Madeira serrada"; // Default display product
      }

      const key = `${displayProd}||${popularName.toLowerCase().trim()}`;
      if (!grouped[key]) {
        grouped[key] = {
          produto: displayProd,
          cientifico: getScientificName(popularName),
          popular: popularName,
          saldo: 0
        };
      }
      grouped[key].saldo += item.volume;
    });

    // Format as ImportedSerrariaSaldo models
    return Object.values(grouped).map((val, i) => ({
      id: `sys-saldos-${i}-${val.produto}-${val.popular}`,
      produto: val.produto,
      cientifico: val.cientifico,
      popular: val.popular,
      saldo: val.saldo
    }));
  }, [patioStockList, sawnStockList]);

  // Current selected active balance list (always synced from real patio and sawn lists)
  const currentSaldosList = useMemo(() => {
    return dynamicSystemSaldos;
  }, [dynamicSystemSaldos]);

  // Dynamic KPIs calculations from active list
  const saldosKpis = useMemo(() => {
    let toraSum = 0;
    let serradoSum = 0;
    let beneficiadoSum = 0;
    let totalSum = 0;

    currentSaldosList.forEach(item => {
      totalSum += item.saldo;
      const prodLower = item.produto.toLowerCase();
      if (prodLower.includes("tora")) {
        toraSum += item.saldo;
      } else if (prodLower.includes("serrad")) {
        serradoSum += item.saldo;
      } else if (prodLower.includes("benefic")) {
        beneficiadoSum += item.saldo;
      } else {
        // If it's other products, they still contribute to general volume
        serradoSum += item.saldo; 
      }
    });

    return {
      toraSum,
      serradoSum,
      beneficiadoSum,
      totalSum
    };
  }, [currentSaldosList]);

  // Dynamic search filtered balance list
  const filteredSaldosList = useMemo(() => {
    return currentSaldosList.filter(item => {
      if (!saldosFilter) return true;
      const term = saldosFilter.toLowerCase();
      return (
        item.produto.toLowerCase().includes(term) ||
        item.cientifico.toLowerCase().includes(term) ||
        item.popular.toLowerCase().includes(term)
      );
    });
  }, [currentSaldosList, saldosFilter]);

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
            Mecanismo Ativo: Quando você efectua o desdobro, o volume correspondente <strong className="text-amber-700">sai do Estoque de Toras</strong> e <strong className="text-emerald-700">entra no Estoque de Processados</strong> automaticamente.
          </p>
        </div>
        
        <div className="px-3 py-1.5 bg-emerald-50/60 border border-emerald-100 text-[11px] font-mono rounded-lg text-emerald-805 flex items-center gap-2 shadow-xs">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sincronismo Ativo: <strong className="text-emerald-950 uppercase">AUTEX → Serraria</strong></span>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex gap-2 border-b border-slate-200/60 pb-1 no-print">
        <button
          type="button"
          onClick={() => setSerrariaSubTab("producao")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all border-b-2 rounded-t-lg cursor-pointer ${
            serrariaSubTab === "producao"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/40 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          🪚 Processos & Entrada de Toras
        </button>
        <button
          type="button"
          onClick={() => setSerrariaSubTab("saldos")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-all border-b-2 rounded-t-lg flex items-center gap-1.5 cursor-pointer ${
            serrariaSubTab === "saldos"
              ? "border-emerald-600 text-emerald-800 bg-emerald-50/40 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Relatório de Saldos Geral (Serrado, Tora, Beneficiado)</span>
        </button>
      </div>

      {serrariaSubTab === "producao" && (
        <>
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

        {/* Right Side: Tabbed Action Card (Desdobro or Venda Externa) */}
        <div 
          id="form-desdobro-serraria"
          className="lg:col-span-5 bg-gradient-to-br from-white to-slate-50/40 p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-full -mr-10 -mt-10 opacity-30"></div>
          
          {/* Segmented Control / Form Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1 relative z-10">
            <button
              type="button"
              onClick={() => setActiveFormTab("desdobro")}
              className={`flex-1 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeFormTab === "desdobro"
                  ? "bg-white text-emerald-800 shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Desdobro</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFormTab("beneficiamento");
                if (!benEspecie && uniqueSawnSpecies.length > 0) {
                  handleBenSpeciesChange(uniqueSawnSpecies[0]);
                }
              }}
              className={`flex-1 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeFormTab === "beneficiamento"
                  ? "bg-white text-amber-900 shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-700" />
              <span>Beneficiar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveFormTab("saida");
                if (!vendaEspecie && uniqueSawnSpecies.length > 0) {
                  handleVendaSpeciesChange(uniqueSawnSpecies[0]);
                }
              }}
              className={`flex-1 py-1.5 text-[10px] sm:text-[11px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                activeFormTab === "saida"
                  ? "bg-white text-indigo-800 shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Saída</span>
            </button>
          </div>

          {activeFormTab === "desdobro" ? (
            <>
              <div className="relative pt-1">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                  <span>Registrar Desdobro (Serramento)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Informe o volume de toras processado e a madeira serrada resultante.</p>
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
            </>
          ) : activeFormTab === "beneficiamento" ? (
            <>
              <div className="relative pt-1">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full"></span>
                  <span>Registrar Beneficiamento (Plainamento)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Processee a madeira que se encontra serrada para o estado de beneficiada.
                </p>
              </div>

              {uniqueSawnSpecies.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-100/50 border border-dashed border-slate-200 rounded-xl leading-relaxed">
                  Sem madeira serrada disponível em estoque para beneficiar. Realize primeiro o desdobro de toras.
                </div>
              ) : (
                <form onSubmit={handleSubmitBeneficiamento} className="space-y-4 pt-1 relative">
                  {/* Espécie */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Espécie de Madeira
                    </label>
                    <select
                      value={benEspecie}
                      onChange={(e) => handleBenSpeciesChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                      required
                    >
                      <option value="">-- Selecione uma espécie --</option>
                      {uniqueSawnSpecies.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Dono / Proprietário */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Proprietário / Dono
                    </label>
                    <select
                      value={benDono}
                      onChange={(e) => handleBenOwnerChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition disabled:opacity-50"
                      disabled={!benEspecie}
                      required
                    >
                      <option value="">-- Selecione o dono --</option>
                      {uniqueSawnOwnersForSelectedBenSpecies.map(dono => (
                        <option key={dono} value={dono}>{dono}</option>
                      ))}
                    </select>
                  </div>

                  {/* Produto de Origem (Serrado) */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Produto Serrado de Origem (Para Beneficiar)
                    </label>
                    <select
                      value={benProdutoOrigem}
                      onChange={(e) => setBenProdutoOrigem(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition disabled:opacity-50"
                      disabled={!benDono}
                      required
                    >
                      <option value="">-- Selecione o produto de origem --</option>
                      {uniqueSawnProductsForSelectedBenSpecAndOwner.map(prod => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>

                  {/* Current Sawn Stock Display Badge */}
                  {benEspecie && benDono && benProdutoOrigem && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex justify-between items-center text-xs text-amber-900">
                      <span className="font-semibold text-amber-800">Estoque de {benProdutoOrigem} disponível:</span>
                      <span className="font-mono font-bold text-amber-950">{currentBenStockBalance.toFixed(3)} m³</span>
                    </div>
                  )}

                  {/* Volume Entrada de Serrado */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Volume de Entrada Serrado (M³ Consumido)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Ex: 5.000"
                        value={benVolEntrada}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBenVolEntrada(val);
                          const numVal = parseFloat(val);
                          if (!isNaN(numVal) && numVal > 0) {
                            setBenVolSaida((numVal * 0.90).toFixed(3));
                          }
                        }}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (currentBenStockBalance > 0) {
                            setBenVolEntrada(currentBenStockBalance.toString());
                            setBenVolSaida((currentBenStockBalance * 0.90).toFixed(3));
                          }
                        }}
                        className="px-3 bg-amber-100/80 rounded-lg text-amber-900 font-bold text-[9px] uppercase hover:bg-amber-200 transition cursor-pointer"
                        disabled={!benEspecie || !benDono || !benProdutoOrigem}
                        title="Usar estoque total do produto"
                      >
                        Tudo
                      </button>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="border-t border-dashed border-amber-200/80 my-3"></div>

                  {/* Produto Resultante Beneficiado */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Produto Beneficiado Resultante (Produção)
                    </label>
                    <select
                      value={benProdutoDestino}
                      onChange={(e) => setBenProdutoDestino(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-amber-950 focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                      required
                    >
                      <option value="Beneficiado">Beneficiado (Geral)</option>
                      <option value="Assoalho">Assoalho</option>
                      <option value="Forro">Forro</option>
                      <option value="Deck">Deck</option>
                      <option value="Batente">Batente</option>
                      <option value="Sarrafo Beneficiado">Sarrafo Beneficiado</option>
                      <option value="Viga Plainada">Viga Plainada</option>
                      <option value="Prancha Plainada">Prancha Plainada</option>
                    </select>
                  </div>

                  {/* Volume Saída Beneficiado */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Volume Beneficiado Resultante (M³ Saída)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      placeholder="Ex: 4.500 (Aprox. 90% de aproveitamento)"
                      value={benVolSaida}
                      onChange={(e) => setBenVolSaida(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition"
                      required
                    />
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Data do Processamento
                    </label>
                    <input
                      type="date"
                      value={benDate}
                      onChange={(e) => setBenDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-600 transition font-mono text-slate-800"
                      required
                    />
                  </div>

                  {/* Yield Badge */}
                  {benYieldPercent > 0 && (
                    <div className="p-3 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-900 text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-4 h-4 text-amber-600" />
                        <span>Aproveitamento no Beneficiamento:</span>
                      </span>
                      <span className="font-mono font-bold">{benYieldPercent.toFixed(1)}%</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-800 text-white font-bold rounded-xl text-xs hover:bg-amber-900 hover:-translate-y-0.5 transition-all duration-150 shadow-sm cursor-pointer"
                  >
                    Gravar Beneficiamento & Atualizar Estoque
                  </button>
                </form>
              )}
            </>
          ) : (
            <>
              <div className="relative pt-1">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                  <span>Registrar Saída (Venda Externa)</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Registre a expedição / venda externa de produtos de madeira processada do estoque.</p>
              </div>

              {uniqueSawnSpecies.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-100/50 border border-dashed border-slate-200 rounded-xl leading-relaxed">
                  Sem produtos de madeira acabada em estoque para expedir. Realize desdobros de toras no pátio primeiro.
                </div>
              ) : (
                <form onSubmit={handleSubmitVenda} className="space-y-4 pt-1 relative">
                  {/* Espécie */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Espécie de Madeira
                    </label>
                    <select
                      value={vendaEspecie}
                      onChange={(e) => handleVendaSpeciesChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                      required
                    >
                      <option value="">-- Selecione uma espécie --</option>
                      {uniqueSawnSpecies.map(esp => (
                        <option key={esp} value={esp}>{esp}</option>
                      ))}
                    </select>
                  </div>

                  {/* Proprietário / Dono */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Proprietário / Dono do lote
                    </label>
                    <select
                      value={vendaDono}
                      onChange={(e) => handleVendaOwnerChange(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition disabled:opacity-50"
                      disabled={!vendaEspecie}
                      required
                    >
                      <option value="">-- Selecione o dono --</option>
                      {uniqueSawnOwnersForSelectedSpecies.map(dono => (
                        <option key={dono} value={dono}>{dono}</option>
                      ))}
                    </select>
                  </div>

                  {/* Produto acabado */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Produto Acabado
                    </label>
                    <select
                      value={vendaProduto}
                      onChange={(e) => setVendaProduto(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition disabled:opacity-50"
                      disabled={!vendaDono}
                      required
                    >
                      <option value="">-- Selecione o produto --</option>
                      {uniqueSawnProductsForSelectedSpecAndOwner.map(prod => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>

                  {/* Available Stock Display Badge */}
                  {vendaEspecie && vendaDono && vendaProduto && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl flex justify-between items-center text-xs text-indigo-900">
                      <span className="font-semibold text-indigo-800">Saldo estocado disponível:</span>
                      <span className="font-mono font-bold text-indigo-950">{currentSawnStockBalance.toFixed(3)} m³</span>
                    </div>
                  )}

                  {/* Volume de Saída */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Volume de Saída / Venda (M³)
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Ex: 5.420"
                        value={vendaVolume}
                        onChange={(e) => setVendaVolume(e.target.value)}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (vendaEspecie && vendaDono && vendaProduto) {
                            setVendaVolume(currentSawnStockBalance.toString());
                          }
                        }}
                        className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-[9px] uppercase transition border border-indigo-200 rounded-lg"
                        disabled={!vendaEspecie || !vendaDono || !vendaProduto}
                        title="Preencher com todo saldo disponível"
                      >
                        Tudo
                      </button>
                    </div>
                  </div>

                  {/* Cliente / Destinatário */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Cliente / Destinatário (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Madeireira Silva Ltda"
                      value={vendaCliente}
                      onChange={(e) => setVendaCliente(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                    />
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                      Data da Saída
                    </label>
                    <input
                      type="date"
                      value={vendaDate}
                      onChange={(e) => setVendaDate(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition font-mono text-slate-800"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-900 text-white font-bold rounded-xl text-xs hover:bg-indigo-850 hover:-translate-y-0.5 transition-all duration-150 shadow-sm cursor-pointer"
                  >
                    Gravar Saída & Abater Estoque Acabado
                  </button>
                </form>
              )}
            </>
          )}
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

        {filteredSawnStock.filter(row => row.volume > 0.0001).length === 0 ? (
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
                  <th className="px-3.5 py-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSawnStock.filter(row => row.volume > 0.0001).map((row, i) => (
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
                    <td className="px-3.5 py-2.5 text-center no-print">
                      <div className="flex items-center justify-center gap-1.5">
                        {row.produto.toLowerCase() !== "beneficiado" && (
                          <button
                            type="button"
                            onClick={() => handleQuickBeneficiar(row.especie, row.dono, row.produto, row.volume)}
                            className="bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-[9px] uppercase px-2 py-1 rounded transition border border-amber-200 inline-flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Beneficiar (plainar/acabar) este lote"
                          >
                            <Wrench className="w-3 h-3 text-amber-700" />
                            <span>Beneficiar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleQuickVenda(row.especie, row.dono, row.produto, row.volume)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-[9px] uppercase px-2 py-1 rounded transition border border-indigo-150 inline-flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          <span>Vender / Sair</span>
                        </button>
                      </div>
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
                {filteredProcessLogs.map((log) => {
                  const isVenda = log.volumeSerrado < 0;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-3.5 py-3 font-semibold text-slate-950 font-mono">{log.dataProcessamento}</td>
                      <td className="px-3.5 py-3 font-bold text-slate-900">{log.especie}</td>
                      <td className="px-3.5 py-3 font-mono text-slate-600">{log.dono}</td>
                      <td className="px-3.5 py-3 text-center font-mono font-semibold text-amber-700">
                        {isVenda ? "—" : `-${log.volumeTora.toFixed(3)} m³`}
                      </td>
                      <td className="px-3.5 py-3 font-bold text-indigo-905 uppercase tracking-tight">{log.produtoSaida}</td>
                      <td className={`px-3.5 py-3 text-right font-mono font-bold ${isVenda ? "text-rose-650" : "text-emerald-850"}`}>
                        {isVenda ? "" : "+"}{log.volumeSerrado.toFixed(3)} m³
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {log.produtoSaida.includes("Beneficiamento - Consumo") ? (
                          <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-sm font-bold text-[9px] tracking-wide uppercase inline-block">
                            CONSUMO BENEFICIAMENTO
                          </span>
                        ) : log.volumeTora === 0 && log.volumeSerrado > 0 && log.rendimento > 0 ? (
                          <span className="bg-amber-100/80 text-amber-900 border border-amber-250 px-2 py-0.5 rounded-sm font-bold text-[9px] tracking-wide uppercase inline-block font-mono">
                            BENEFICIADO ({log.rendimento.toFixed(1)}%)
                          </span>
                        ) : isVenda ? (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-sm font-bold text-[9px] tracking-wide uppercase inline-block">
                            SAÍDA / VENDA
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 font-mono font-bold rounded-sm text-[10px] ${
                            log.rendimento >= 45 
                              ? "bg-emerald-100/70 text-emerald-900 border border-emerald-200"
                              : "bg-amber-100/70 text-amber-900 border border-amber-200"
                          }`}>
                            {log.rendimento.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-center no-print border-l border-slate-50">
                        <div className="flex items-center justify-center gap-1.5">
                          {isVenda && (
                            <button
                              type="button"
                              onClick={() => handleEditVenda(log)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer transition-all px-2 py-1 bg-indigo-50/50 hover:bg-indigo-100/80 rounded flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProcessLog(log.id, log.especie, log.volumeTora)}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer transition-all px-2 py-1 bg-rose-50/50 hover:bg-rose-100/80 rounded"
                          >
                            Estornar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {/* --- GENERAL BALANCES REPORT SUBTAB --- */}
      {serrariaSubTab === "saldos" && (
        <div className="space-y-6 animate-fade-in pb-8">
          

          {/* 1. Analytical Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card Tora */}
            <div className="bg-gradient-to-br from-white to-amber-50/20 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-150">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estoque de Toras (TORA)</span>
                <span className="text-2xl font-extrabold text-amber-950 mt-1 block font-mono">
                  {saldosKpis.toraSum.toFixed(4).replace(".", ",")} <span className="text-xs font-normal text-slate-500">m³</span>
                </span>
              </div>
              <div className="text-[10px] font-bold text-amber-800 flex items-center gap-1.5 mt-4 pt-2 border-t border-slate-100">
                <Layers className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Toras roliças em estoque bruto</span>
              </div>
            </div>

            {/* Card Serrada */}
            <div className="bg-gradient-to-br from-white to-indigo-50/20 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-150">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estoque de Serrados</span>
                <span className="text-2xl font-extrabold text-indigo-950 mt-1 block font-mono">
                  {saldosKpis.serradoSum.toFixed(4).replace(".", ",")} <span className="text-xs font-normal text-slate-500">m³</span>
                </span>
              </div>
              <div className="text-[10px] font-bold text-indigo-800 flex items-center gap-1.5 mt-4 pt-2 border-t border-slate-100">
                <ArrowUpFromLine className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Madeira serrada beneficiada</span>
              </div>
            </div>

            {/* Card Beneficiada */}
            <div className="bg-gradient-to-br from-white to-teal-50/20 p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-150">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estoque de Beneficiados</span>
                <span className="text-2xl font-extrabold text-teal-950 mt-1 block font-mono">
                  {saldosKpis.beneficiadoSum.toFixed(4).replace(".", ",")} <span className="text-xs font-normal text-slate-500">m³</span>
                </span>
              </div>
              <div className="text-[10px] font-bold text-teal-800 flex items-center gap-1.5 mt-4 pt-2 border-t border-slate-100">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>madeira processada/aparelhada</span>
              </div>
            </div>

            {/* Card Total */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl border border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all duration-150">
              <div>
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Volume Geral Estocado</span>
                <span className="text-2xl font-extrabold text-emerald-400 mt-1 block font-mono">
                  {saldosKpis.totalSum.toFixed(4).replace(".", ",")} <span className="text-xs font-normal text-slate-400">m³</span>
                </span>
              </div>
              <div className="text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 mt-4 pt-2 border-t border-white/5">
                <Scale className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Soma acumulada de saldos</span>
              </div>
            </div>

          </div>


          {/* 3. The Spreadsheet Table Rendering */}
          <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-800" />
                  <span>Demonstrativo Analítico de Saldos do Estoque</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Disposição das toras roliças, serrados e beneficiamento em estoque sincronizados em tempo real.</p>
              </div>

              {/* Instant Search Bar & Export CSV */}
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto shrink-0 transition-all">
                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Pesquisar produto, essência..."
                    value={saldosFilter}
                    onChange={(e) => setSaldosFilter(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportSaldosCSV}
                  className="w-full sm:w-auto bg-emerald-850 hover:bg-emerald-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border border-emerald-950/20 active:scale-[0.98]"
                  title="Exportar os saldos de estoque atuais em formato CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar Estoque em CSV</span>
                </button>
              </div>
            </div>

            {filteredSaldosList.length === 0 ? (
              <div className="p-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                Nenhum saldo encontrado no estoque do sistema da serraria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-xl shadow-xs">
                {/* Visual Spreadsheet Theme matching Excel picture precisely: custom solid borders & solid black headers */}
                <table className="w-full border-collapse text-xs text-left">
                  <thead>
                    <tr className="bg-black text-white font-extrabold uppercase font-sans border-b-2 border-slate-950 text-[11px] tracking-wider select-none">
                      <th className="px-4 py-3 border border-slate-450 w-1/4">PRODUTO</th>
                      <th className="px-4 py-3 border border-slate-450 w-1/4">CIENTIFICO</th>
                      <th className="px-4 py-3 border border-slate-450 w-1/4">POPULAR</th>
                      <th className="px-4 py-3 border border-slate-450 w-1/6 text-right font-mono">SALDO</th>
                      <th className="px-4 py-3 border border-slate-450 w-1/6 text-center no-print">ESTADO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white leading-relaxed">
                    {filteredSaldosList.map((item, i) => {
                      return (
                        <tr 
                          key={item.id} 
                          className={`${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"} hover:bg-emerald-50/15 transition`}
                        >
                          
                          {/* PRODUCT COL */}
                          <td className="px-4 py-2 border border-slate-200 font-medium text-slate-800">
                            <span>{item.produto}</span>
                          </td>

                          {/* SCIENTIFIC COL */}
                          <td className="px-4 py-2 border border-slate-200 italic text-slate-500 font-mono text-[11px]">
                            <span>{item.cientifico || "—"}</span>
                          </td>

                          {/* POPULAR COL */}
                          <td className="px-4 py-2 border border-slate-200 font-bold text-slate-900 border-r">
                            <span>{item.popular}</span>
                          </td>

                          {/* BALANCE COL */}
                          <td className="px-4 py-2 border border-slate-200 text-right font-mono font-bold text-slate-950 text-xs bg-slate-50/20">
                            <span>{item.saldo.toFixed(4).replace(".", ",")} m³</span>
                          </td>

                          {/* STATUS COL */}
                          <td className="px-4 py-2 border border-slate-200 text-center no-print">
                            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-md border border-emerald-200 inline-block font-sans">
                              Sincronizado
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Info footer */}
            <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <span className="font-extrabold uppercase font-mono tracking-wide text-indigo-750 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded leading-none">Dica de Exportação</span>
              <span>Para sincronizar esses saldos com sua planilha geral, use o módulo de backup no painel do administrador para obter cópias íntegras de faturamento em tempo real.</span>
            </div>
            
          </div>

        </div>
      )}

      {/* Edit Sale Modal */}
      {editingLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="bg-indigo-900 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Editar Saída (Venda)</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingLog(null)}
                className="text-white/80 hover:text-white transition cursor-pointer p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditVenda} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto text-xs">
              {/* Espécie */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Espécie de Madeira
                </label>
                <select
                  value={editEspecie}
                  onChange={(e) => {
                    const esp = e.target.value;
                    setEditEspecie(esp);
                    const relatedOwners = sawmillLogs.filter(
                      l => l.volumeSerrado > 0 && l.especie.toLowerCase().trim() === esp.toLowerCase().trim()
                    );
                    if (relatedOwners.length > 0) {
                      const firstDono = relatedOwners[0].dono;
                      setEditDono(firstDono);
                      const relatedProds = sawmillLogs.filter(
                        l => l.volumeSerrado > 0 &&
                             l.especie.toLowerCase().trim() === esp.toLowerCase().trim() &&
                             l.dono.toLowerCase().trim() === firstDono.toLowerCase().trim()
                      );
                      if (relatedProds.length > 0) {
                        setEditProduto(getBaseProduct(relatedProds[0].produtoSaida));
                      } else {
                        setEditProduto("");
                      }
                    } else {
                      setEditDono("");
                      setEditProduto("");
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                  required
                >
                  <option value="">-- Selecione uma espécie --</option>
                  {editUniqueSpecies.map(esp => (
                    <option key={esp} value={esp}>{esp}</option>
                  ))}
                </select>
              </div>

              {/* Proprietário / Dono */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Proprietário / Dono do lote
                </label>
                <select
                  value={editDono}
                  onChange={(e) => {
                    const dono = e.target.value;
                    setEditDono(dono);
                    const relatedProds = sawmillLogs.filter(
                      l => l.volumeSerrado > 0 &&
                           l.especie.toLowerCase().trim() === editEspecie.toLowerCase().trim() &&
                           l.dono.toLowerCase().trim() === dono.toLowerCase().trim()
                    );
                    if (relatedProds.length > 0) {
                      setEditProduto(getBaseProduct(relatedProds[0].produtoSaida));
                    } else {
                      setEditProduto("");
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                  required
                >
                  <option value="">-- Selecione o dono --</option>
                  {editUniqueOwnersForSpecies.map(dono => (
                    <option key={dono} value={dono}>{dono}</option>
                  ))}
                </select>
              </div>

              {/* Produto Acabado */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Produto Acabado
                </label>
                <select
                  value={editProduto}
                  onChange={(e) => setEditProduto(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                  required
                >
                  <option value="">-- Selecione o produto --</option>
                  {editUniqueProductsForSpecAndOwner.map(prod => (
                    <option key={prod} value={prod}>{prod}</option>
                  ))}
                </select>
              </div>

              {/* Balance Badge */}
              {editEspecie && editDono && editProduto && (
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center text-xs text-indigo-950">
                  <span className="font-semibold text-indigo-800">Saldo disponível para alteração:</span>
                  <span className="font-mono font-bold text-indigo-950">{currentSawnStockBalanceForEdit.toFixed(3)} m³</span>
                </div>
              )}

              {/* Volume */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Volume de Saída / Venda (M³)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Ex: 5.420"
                    value={editVolume}
                    onChange={(e) => setEditVolume(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (editEspecie && editDono && editProduto) {
                        setEditVolume(currentSawnStockBalanceForEdit.toString());
                      }
                    }}
                    className="px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-[9px] uppercase transition border border-indigo-200 rounded-lg cursor-pointer"
                    disabled={!editEspecie || !editDono || !editProduto}
                  >
                    Tudo
                  </button>
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Cliente / Destinatário (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Madeireira Silva Ltda"
                  value={editCliente}
                  onChange={(e) => setEditCliente(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition"
                />
              </div>

              {/* Data */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Data da Saída
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition font-mono text-slate-800"
                  required
                />
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-900 hover:bg-indigo-850 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
