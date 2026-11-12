/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { UserChecklist, UserEvent, UserNote } from "../types";
import {
  fetchUserWorkspaceDb,
  saveUserEventInDb,
  deleteUserEventInDb,
  saveUserNoteInDb,
  deleteUserNoteInDb,
  saveUserChecklistInDb,
  deleteUserChecklistInDb,
} from "../lib/supabase";
import {
  Calendar,
  StickyNote,
  CheckSquare,
  Plus,
  Trash2,
  Pin,
  PinOff,
  CheckCircle2,
  Circle,
  Clock,
  Search,
  Edit2,
  Save,
  X,
  Tag,
  Cloud,
} from "lucide-react";

interface UserWorkspaceModuleProps {
  currentUser: string;
  isSupabaseConnected: boolean;
  onAddSecurityLog: (
    action: string,
    details: string,
    status: "sucesso" | "erro" | "alerta"
  ) => void;
}

const NOTE_COLORS: Record<
  UserNote["cor"],
  { bg: string; border: string; badge: string; label: string }
> = {
  emerald: {
    bg: "bg-emerald-50/70",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
    label: "Verde",
  },
  amber: {
    bg: "bg-amber-50/70",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-800",
    label: "Âmbar",
  },
  sky: {
    bg: "bg-sky-50/70",
    border: "border-sky-200",
    badge: "bg-sky-100 text-sky-800",
    label: "Azul",
  },
  rose: {
    bg: "bg-rose-50/70",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-800",
    label: "Rosa",
  },
  slate: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    badge: "bg-slate-200 text-slate-700",
    label: "Neutro",
  },
};

export default function UserWorkspaceModule({
  currentUser,
  isSupabaseConnected,
  onAddSecurityLog,
}: UserWorkspaceModuleProps) {
  const [subTab, setSubTab] = useState<"eventos" | "notas" | "checklists">("eventos");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);

  // Per-user state
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [checklists, setChecklists] = useState<UserChecklist[]>([]);

  // Event form
  const [evTitulo, setEvTitulo] = useState("");
  const [evDescricao, setEvDescricao] = useState("");
  const [evData, setEvData] = useState(() => new Date().toISOString().split("T")[0]);
  const [evHora, setEvHora] = useState("08:00");
  const [evCategoria, setEvCategoria] = useState<UserEvent["categoria"]>("Operacional");
  const [evPrioridade, setEvPrioridade] = useState<UserEvent["prioridade"]>("media");
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Note form
  const [noteTitulo, setNoteTitulo] = useState("");
  const [noteConteudo, setNoteConteudo] = useState("");
  const [noteCor, setNoteCor] = useState<UserNote["cor"]>("emerald");
  const [noteTags, setNoteTags] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Checklist form
  const [clTitulo, setClTitulo] = useState("");
  const [clCategoria, setClCategoria] = useState("Operacional");
  const [clInitialItemsText, setClInitialItemsText] = useState("");
  const [newItemInputs, setNewItemInputs] = useState<Record<string, string>>({});

  const eventsKey = `etw_user_events_${currentUser}`;
  const notesKey = `etw_user_notes_${currentUser}`;
  const checklistsKey = `etw_user_checklists_${currentUser}`;

  const saveEventsLocal = (list: UserEvent[]) => {
    setEvents(list);
    localStorage.setItem(eventsKey, JSON.stringify(list));
  };

  const saveNotesLocal = (list: UserNote[]) => {
    setNotes(list);
    localStorage.setItem(notesKey, JSON.stringify(list));
  };

  const saveChecklistsLocal = (list: UserChecklist[]) => {
    setChecklists(list);
    localStorage.setItem(checklistsKey, JSON.stringify(list));
  };

  // Load workspace when user changes or Supabase connects
  useEffect(() => {
    let active = true;
    const loadWorkspace = async () => {
      setIsLoadingWorkspace(true);

      // 1. Fast load from localStorage
      try {
        const localEv = localStorage.getItem(eventsKey);
        const localNo = localStorage.getItem(notesKey);
        const localCl = localStorage.getItem(checklistsKey);
        if (active) {
          setEvents(localEv ? JSON.parse(localEv) : []);
          setNotes(localNo ? JSON.parse(localNo) : []);
          setChecklists(localCl ? JSON.parse(localCl) : []);
        }
      } catch {
        if (active) {
          setEvents([]);
          setNotes([]);
          setChecklists([]);
        }
      }

      // 2. Sync from Supabase if connected
      const remote = await fetchUserWorkspaceDb(currentUser);
      if (active && remote) {
        saveEventsLocal(remote.events);
        saveNotesLocal(remote.notes);
        saveChecklistsLocal(remote.checklists);
      }

      if (active) setIsLoadingWorkspace(false);
    };

    void loadWorkspace();
    return () => {
      active = false;
    };
  }, [currentUser, isSupabaseConnected]);

  // --- EVENTS HANDLERS ---
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitulo.trim()) return;

    const now = new Date().toISOString();
    const existing = editingEventId
      ? events.find((ev) => ev.id === editingEventId)
      : null;

    const eventObj: UserEvent = {
      id: existing ? existing.id : `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: currentUser,
      titulo: evTitulo.trim(),
      descricao: evDescricao.trim(),
      dataEvento: evData,
      horaEvento: evHora || undefined,
      categoria: evCategoria,
      prioridade: evPrioridade,
      concluido: existing ? existing.concluido : false,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    const updated = existing
      ? events.map((ev) => (ev.id === existing.id ? eventObj : ev))
      : [eventObj, ...events];

    saveEventsLocal(updated);
    await saveUserEventInDb(currentUser, eventObj);
    onAddSecurityLog(
      existing ? "ATUALIZAR EVENTO" : "CRIAR EVENTO",
      `Evento "${eventObj.titulo}" salvo para @${currentUser}`,
      "sucesso"
    );

    setEvTitulo("");
    setEvDescricao("");
    setEditingEventId(null);
  };

  const handleToggleEvent = async (id: string) => {
    const target = events.find((ev) => ev.id === id);
    if (!target) return;
    const updatedItem: UserEvent = {
      ...target,
      concluido: !target.concluido,
      updatedAt: new Date().toISOString(),
    };
    saveEventsLocal(events.map((ev) => (ev.id === id ? updatedItem : ev)));
    await saveUserEventInDb(currentUser, updatedItem);
  };

  const handleDeleteEvent = async (id: string) => {
    const target = events.find((ev) => ev.id === id);
    saveEventsLocal(events.filter((ev) => ev.id !== id));
    await deleteUserEventInDb(currentUser, id);
    if (target) {
      onAddSecurityLog(
        "EXCLUIR EVENTO",
        `Evento "${target.titulo}" removido por @${currentUser}`,
        "alerta"
      );
    }
  };

  // --- NOTES HANDLERS ---
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitulo.trim() || !noteConteudo.trim()) return;

    const now = new Date().toISOString();
    const existing = editingNoteId
      ? notes.find((n) => n.id === editingNoteId)
      : null;

    const parsedTags = noteTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const noteObj: UserNote = {
      id: existing ? existing.id : `note-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: currentUser,
      titulo: noteTitulo.trim(),
      conteudo: noteConteudo.trim(),
      cor: noteCor,
      fixada: existing ? existing.fixada : false,
      tags: parsedTags,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    const updated = existing
      ? notes.map((n) => (n.id === existing.id ? noteObj : n))
      : [noteObj, ...notes];

    saveNotesLocal(updated);
    await saveUserNoteInDb(currentUser, noteObj);
    onAddSecurityLog(
      existing ? "ATUALIZAR NOTA" : "CRIAR NOTA",
      `Nota "${noteObj.titulo}" salva para @${currentUser}`,
      "sucesso"
    );

    setNoteTitulo("");
    setNoteConteudo("");
    setNoteTags("");
    setEditingNoteId(null);
  };

  const handleTogglePinNote = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const updatedItem: UserNote = {
      ...target,
      fixada: !target.fixada,
      updatedAt: new Date().toISOString(),
    };
    saveNotesLocal(notes.map((n) => (n.id === id ? updatedItem : n)));
    await saveUserNoteInDb(currentUser, updatedItem);
  };

  const handleDeleteNote = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    saveNotesLocal(notes.filter((n) => n.id !== id));
    await deleteUserNoteInDb(currentUser, id);
    if (target) {
      onAddSecurityLog(
        "EXCLUIR NOTA",
        `Nota "${target.titulo}" removida por @${currentUser}`,
        "alerta"
      );
    }
  };

  // --- CHECKLISTS HANDLERS ---
  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clTitulo.trim()) return;

    const now = new Date().toISOString();
    const lines = clInitialItemsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const newChecklist: UserChecklist = {
      id: `chk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: currentUser,
      titulo: clTitulo.trim(),
      categoria: clCategoria.trim() || "Operacional",
      items: lines.map((texto, idx) => ({
        id: `ci-${Date.now()}-${idx}`,
        texto,
        concluido: false,
      })),
      createdAt: now,
      updatedAt: now,
    };

    saveChecklistsLocal([newChecklist, ...checklists]);
    await saveUserChecklistInDb(currentUser, newChecklist);
    onAddSecurityLog(
      "CRIAR CHECKLIST",
      `Checklist "${newChecklist.titulo}" criada para @${currentUser}`,
      "sucesso"
    );

    setClTitulo("");
    setClInitialItemsText("");
  };

  const handleAddChecklistItem = async (checklistId: string) => {
    const text = (newItemInputs[checklistId] || "").trim();
    if (!text) return;
    const target = checklists.find((c) => c.id === checklistId);
    if (!target) return;

    const updatedCl: UserChecklist = {
      ...target,
      items: [
        ...target.items,
        {
          id: `ci-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          texto: text,
          concluido: false,
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    saveChecklistsLocal(
      checklists.map((c) => (c.id === checklistId ? updatedCl : c))
    );
    setNewItemInputs((prev) => ({ ...prev, [checklistId]: "" }));
    await saveUserChecklistInDb(currentUser, updatedCl);
  };

  const handleToggleChecklistItem = async (checklistId: string, itemId: string) => {
    const target = checklists.find((c) => c.id === checklistId);
    if (!target) return;

    const updatedCl: UserChecklist = {
      ...target,
      items: target.items.map((item) =>
        item.id === itemId ? { ...item, concluido: !item.concluido } : item
      ),
      updatedAt: new Date().toISOString(),
    };

    saveChecklistsLocal(
      checklists.map((c) => (c.id === checklistId ? updatedCl : c))
    );
    await saveUserChecklistInDb(currentUser, updatedCl);
  };

  const handleRemoveChecklistItem = async (checklistId: string, itemId: string) => {
    const target = checklists.find((c) => c.id === checklistId);
    if (!target) return;

    const updatedCl: UserChecklist = {
      ...target,
      items: target.items.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    };

    saveChecklistsLocal(
      checklists.map((c) => (c.id === checklistId ? updatedCl : c))
    );
    await saveUserChecklistInDb(currentUser, updatedCl);
  };

  const handleDeleteChecklist = async (id: string) => {
    const target = checklists.find((c) => c.id === id);
    saveChecklistsLocal(checklists.filter((c) => c.id !== id));
    await deleteUserChecklistInDb(currentUser, id);
    if (target) {
      onAddSecurityLog(
        "EXCLUIR CHECKLIST",
        `Checklist "${target.titulo}" removida por @${currentUser}`,
        "alerta"
      );
    }
  };

  // Filtered lists
  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...events]
      .filter(
        (ev) =>
          !q ||
          ev.titulo.toLowerCase().includes(q) ||
          ev.descricao.toLowerCase().includes(q) ||
          ev.categoria.toLowerCase().includes(q)
      )
      .sort((a, b) => a.dataEvento.localeCompare(b.dataEvento));
  }, [events, searchTerm]);

  const filteredNotes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return [...notes]
      .filter(
        (n) =>
          !q ||
          n.titulo.toLowerCase().includes(q) ||
          n.conteudo.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      )
      .sort((a, b) => Number(b.fixada) - Number(a.fixada));
  }, [notes, searchTerm]);

  const filteredChecklists = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return checklists.filter(
      (c) =>
        !q ||
        c.titulo.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        c.items.some((i) => i.texto.toLowerCase().includes(q))
    );
  }, [checklists, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in" id="user-workspace-module">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 p-6 rounded-sm border border-emerald-800 shadow-xs text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-800/80 border border-emerald-700/60 rounded-lg flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                Agenda, Notas & Checklists — @{currentUser}
              </h2>
              <p className="text-xs text-emerald-300 font-medium mt-1">
                Espaço individual vinculado à conta do operador. Eventos, anotações e checklists ficam salvos por usuário no banco de dados.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono bg-emerald-900/50 border border-emerald-700/50 px-3 py-2 rounded-sm">
            <Cloud className={`w-4 h-4 ${isSupabaseConnected ? "text-emerald-400" : "text-slate-400"}`} />
            <span>
              {isLoadingWorkspace
                ? "Sincronizando..."
                : isSupabaseConnected
                ? "Sincronizado no Supabase"
                : "Salvo localmente (Offline-First)"}
            </span>
          </div>
        </div>

        {/* Sub-Navigation & Search */}
        <div className="mt-5 pt-4 border-t border-emerald-800/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSubTab("eventos")}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subTab === "eventos"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/70"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Eventos ({events.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("notas")}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subTab === "notas"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/70"
              }`}
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Notas ({notes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab("checklists")}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subTab === "checklists"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/70"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Checklists ({checklists.length})</span>
            </button>
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-emerald-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar eventos, notas ou itens..."
              className="w-full pl-9 pr-3 py-2 bg-emerald-950/60 border border-emerald-700/60 rounded-sm text-xs text-white placeholder-emerald-400/70 focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* TAB: EVENTOS */}
      {subTab === "eventos" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <form
            onSubmit={handleSaveEvent}
            className="bg-white border border-slate-200 p-5 rounded-sm shadow-2xs space-y-4 h-fit"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-700" />
                {editingEventId ? "Editar Evento" : "Novo Evento do Operador"}
              </h3>
              {editingEventId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingEventId(null);
                    setEvTitulo("");
                    setEvDescricao("");
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Título do Evento
              </label>
              <input
                type="text"
                required
                value={evTitulo}
                onChange={(e) => setEvTitulo(e.target.value)}
                placeholder="Ex: Conferência DOF / Vistoria Pátio"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={evData}
                  onChange={(e) => setEvData(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Hora
                </label>
                <input
                  type="time"
                  value={evHora}
                  onChange={(e) => setEvHora(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Categoria
                </label>
                <select
                  value={evCategoria}
                  onChange={(e) =>
                    setEvCategoria(e.target.value as UserEvent["categoria"])
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
                >
                  <option value="Operacional">Operacional</option>
                  <option value="Fiscal/IBAMA">Fiscal/IBAMA</option>
                  <option value="Logística">Logística</option>
                  <option value="Serraria">Serraria</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Prioridade
                </label>
                <select
                  value={evPrioridade}
                  onChange={(e) =>
                    setEvPrioridade(e.target.value as UserEvent["prioridade"])
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
                >
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Detalhes / Observações
              </label>
              <textarea
                rows={3}
                value={evDescricao}
                onChange={(e) => setEvDescricao(e.target.value)}
                placeholder="Descreva os detalhes do compromisso ou prazo..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingEventId ? "Atualizar Evento" : "Salvar Evento"}</span>
            </button>
          </form>

          {/* List */}
          <div className="lg:col-span-2 bg-white border border-slate-200 p-5 rounded-sm shadow-2xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3">
              Compromissos & Eventos de @{currentUser} ({filteredEvents.length})
            </h3>

            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-sm text-xs text-slate-400">
                Nenhum evento cadastrado para @{currentUser}. Crie o primeiro ao lado.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-3.5 border rounded-sm flex items-start justify-between gap-3 transition ${
                      ev.concluido
                        ? "bg-slate-50 border-slate-200 opacity-70"
                        : "bg-white border-slate-200 hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleEvent(ev.id)}
                        className="mt-0.5 text-emerald-700 hover:text-emerald-900 cursor-pointer shrink-0"
                        title={ev.concluido ? "Marcar como pendente" : "Concluir evento"}
                      >
                        {ev.concluido ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              ev.concluido ? "line-through text-slate-500" : "text-slate-900"
                            }`}
                          >
                            {ev.titulo}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-xs text-[10px] font-semibold">
                            {ev.categoria}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-xs text-[10px] font-bold uppercase ${
                              ev.prioridade === "alta"
                                ? "bg-rose-100 text-rose-700"
                                : ev.prioridade === "media"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {ev.prioridade}
                          </span>
                        </div>

                        {ev.descricao && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {ev.descricao}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] font-mono text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {ev.dataEvento}
                          </span>
                          {ev.horaEvento && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {ev.horaEvento}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEventId(ev.id);
                          setEvTitulo(ev.titulo);
                          setEvDescricao(ev.descricao);
                          setEvData(ev.dataEvento);
                          setEvHora(ev.horaEvento || "");
                          setEvCategoria(ev.categoria);
                          setEvPrioridade(ev.prioridade);
                        }}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-sm cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-sm cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NOTAS */}
      {subTab === "notas" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSaveNote}
            className="bg-white border border-slate-200 p-5 rounded-sm shadow-2xs space-y-4 h-fit"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-emerald-700" />
                {editingNoteId ? "Editar Nota" : "Nova Anotação Pessoal"}
              </h3>
              {editingNoteId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingNoteId(null);
                    setNoteTitulo("");
                    setNoteConteudo("");
                    setNoteTags("");
                  }}
                  className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Título da Nota
              </label>
              <input
                type="text"
                required
                value={noteTitulo}
                onChange={(e) => setNoteTitulo(e.target.value)}
                placeholder="Ex: Observações sobre lote de Ipê"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Conteúdo
              </label>
              <textarea
                rows={5}
                required
                value={noteConteudo}
                onChange={(e) => setNoteConteudo(e.target.value)}
                placeholder="Escreva lembretes, números de guias, observações de pátio..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Cor do Cartão
                </label>
                <select
                  value={noteCor}
                  onChange={(e) => setNoteCor(e.target.value as UserNote["cor"])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
                >
                  {Object.entries(NOTE_COLORS).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                  Tags (vírgula)
                </label>
                <input
                  type="text"
                  value={noteTags}
                  onChange={(e) => setNoteTags(e.target.value)}
                  placeholder="autex, patio, urgente"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{editingNoteId ? "Atualizar Nota" : "Salvar Nota"}</span>
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            {filteredNotes.length === 0 ? (
              <div className="md:col-span-2 bg-white border border-dashed border-slate-200 p-12 rounded-sm text-center text-xs text-slate-400">
                Nenhuma nota salva para @{currentUser}.
              </div>
            ) : (
              filteredNotes.map((note) => {
                const palette = NOTE_COLORS[note.cor] || NOTE_COLORS.emerald;
                return (
                  <div
                    key={note.id}
                    className={`${palette.bg} border ${palette.border} p-4 rounded-sm shadow-2xs flex flex-col justify-between gap-3`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-xs font-extrabold text-slate-900">
                          {note.titulo}
                        </h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTogglePinNote(note.id)}
                            className={`p-1 rounded-sm cursor-pointer ${
                              note.fixada
                                ? "text-amber-700 bg-amber-100"
                                : "text-slate-400 hover:text-slate-700"
                            }`}
                            title={note.fixada ? "Desafixar" : "Fixar no topo"}
                          >
                            {note.fixada ? (
                              <Pin className="w-3.5 h-3.5" />
                            ) : (
                              <PinOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setNoteTitulo(note.titulo);
                              setNoteConteudo(note.conteudo);
                              setNoteCor(note.cor);
                              setNoteTags(note.tags.join(", "));
                            }}
                            className="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-slate-500 hover:text-rose-700 cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {note.conteudo}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-black/5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-1.5 py-0.5 rounded-xs text-[10px] font-semibold flex items-center gap-1 ${palette.badge}`}
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {new Date(note.updatedAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB: CHECKLISTS */}
      {subTab === "checklists" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateChecklist}
            className="bg-white border border-slate-200 p-5 rounded-sm shadow-2xs space-y-4 h-fit"
          >
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-700" />
              Nova Checklist Operacional
            </h3>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Título da Checklist
              </label>
              <input
                type="text"
                required
                value={clTitulo}
                onChange={(e) => setClTitulo(e.target.value)}
                placeholder="Ex: Vistoria de Embarque NF-e"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Categoria
              </label>
              <input
                type="text"
                value={clCategoria}
                onChange={(e) => setClCategoria(e.target.value)}
                placeholder="Operacional, Logística, Serraria..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                Itens Iniciais (1 por linha)
              </label>
              <textarea
                rows={4}
                value={clInitialItemsText}
                onChange={(e) => setClInitialItemsText(e.target.value)}
                placeholder={"Conferir placa do caminhão\nValidar XML da NF-e\nConfirmar pátio de destino"}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm text-xs text-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Checklist</span>
            </button>
          </form>

          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            {filteredChecklists.length === 0 ? (
              <div className="md:col-span-2 bg-white border border-dashed border-slate-200 p-12 rounded-sm text-center text-xs text-slate-400">
                Nenhuma checklist criada para @{currentUser}.
              </div>
            ) : (
              filteredChecklists.map((cl) => {
                const doneCount = cl.items.filter((i) => i.concluido).length;
                const totalCount = cl.items.length;
                const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                return (
                  <div
                    key={cl.id}
                    className="bg-white border border-slate-200 p-4 rounded-sm shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-xs">
                          {cl.categoria}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                          {cl.titulo}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteChecklist(cl.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-sm cursor-pointer"
                        title="Excluir checklist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
                        <span>
                          {doneCount}/{totalCount} concluídos
                        </span>
                        <span className="font-bold text-emerald-700">{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {cl.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-sm hover:bg-slate-50 text-xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleChecklistItem(cl.id, item.id)}
                            className="flex items-center gap-2 text-left flex-1 cursor-pointer"
                          >
                            {item.concluido ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span
                              className={
                                item.concluido
                                  ? "line-through text-slate-400"
                                  : "text-slate-700"
                              }
                            >
                              {item.texto}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveChecklistItem(cl.id, item.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                            title="Remover item"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Quick Add Item */}
                    <div className="pt-2 border-t border-slate-100 flex gap-2">
                      <input
                        type="text"
                        value={newItemInputs[cl.id] || ""}
                        onChange={(e) =>
                          setNewItemInputs((prev) => ({
                            ...prev,
                            [cl.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddChecklistItem(cl.id);
                          }
                        }}
                        placeholder="Adicionar novo item..."
                        className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-sm text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => void handleAddChecklistItem(cl.id)}
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-sm text-xs font-bold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
