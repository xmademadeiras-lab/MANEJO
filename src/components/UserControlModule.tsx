/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { UserAccount, SecurityLog } from "../types";
import { 
  Users, 
  Shield, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Unlock, 
  Activity, 
  Trash2, 
  LogIn
} from "lucide-react";

interface UserControlModuleProps {
  currentUser: string;
  onSwitchUser: (username: string) => void;
  securityLogs: SecurityLog[];
  onAddSecurityLog: (action: string, details: string, status: "sucesso" | "erro" | "alerta") => void;
  onClearSecurityLogs: () => void;
}

const DEFAULT_USERS: UserAccount[] = [
  {
    id: "user-1",
    username: "Gestor_Matriz_01",
    nome: "Marcos Estrela",
    cargo: "Diretor Geral de Operações",
    role: "admin",
    ativo: true,
    dataCriacao: "2026-01-10",
    permissoes: ["Visualização Completa", "Lançar Abates", "Configurar Logística", "Industrializar Serraria", "Efetuar Backup", "Controle de Usuários"]
  },
  {
    id: "user-2",
    username: "Operador_Patio_01",
    nome: "Reginaldo de Souza",
    cargo: "Supervisor de Logística",
    role: "operator",
    ativo: true,
    dataCriacao: "2026-02-15",
    permissoes: ["Visualização Completa", "Lançar Abates", "Configurar Logística"]
  },
  {
    id: "user-3",
    username: "Ind_Serraria_Sec",
    nome: "Ademir Nogueira",
    cargo: "Operador Industrial (Serraria)",
    role: "operator",
    ativo: true,
    dataCriacao: "2026-02-28",
    permissoes: ["Visualização Completa", "Industrializar Serraria"]
  },
  {
    id: "user-4",
    username: "Auditor_Fiscal_Ibama",
    nome: "Dra. Eliane Prado",
    cargo: "Auditora Ambiental Fiscal",
    role: "auditor",
    ativo: true,
    dataCriacao: "2026-05-20",
    permissoes: ["Visualização Completa"]
  }
];

export default function UserControlModule({
  currentUser,
  onSwitchUser,
  securityLogs,
  onAddSecurityLog,
  onClearSecurityLogs
}: UserControlModuleProps) {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form states for new user
  const [formUsername, setFormUsername] = useState("");
  const [formNome, setFormNome] = useState("");
  const [formCargo, setFormCargo] = useState("");
  const [formRole, setFormRole] = useState<"admin" | "operator" | "auditor">("operator");
  const [selectedPerms, setSelectedPerms] = useState<string[]>(["Visualização Completa"]);

  // Available permissions to grant
  const availablePermissions = [
    "Visualização Completa",
    "Lançar Abates",
    "Configurar Logística",
    "Industrializar Serraria",
    "Efetuar Backup",
    "Controle de Usuários"
  ];

  // Load from local storage or initialize defaults
  useEffect(() => {
    const saved = localStorage.getItem("etw_user_accounts");
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch (e) {
        setUsers(DEFAULT_USERS);
      }
    } else {
      setUsers(DEFAULT_USERS);
      localStorage.setItem("etw_user_accounts", JSON.stringify(DEFAULT_USERS));
    }
  }, []);

  const saveToStorage = (updatedUsers: UserAccount[]) => {
    setUsers(updatedUsers);
    localStorage.setItem("etw_user_accounts", JSON.stringify(updatedUsers));
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.cargo.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  // Toggle user activation status
  const handleToggleStatus = (id: string) => {
    const userToToggle = users.find(u => u.id === id);
    if (!userToToggle) return;

    if (userToToggle.username === currentUser) {
      setFeedback({ text: "Impossível desativar a si próprio no momento.", type: "error" });
      return;
    }

    const updated = users.map(u => {
      if (u.id === id) {
        const nextStatus = !u.ativo;
        return { ...u, ativo: nextStatus };
      }
      return u;
    });

    saveToStorage(updated);
    const updatedUser = updated.find(u => u.id === id);
    onAddSecurityLog(
      "EDITAR USUÁRIO",
      `${updatedUser?.ativo ? "Ativou" : "Desativou"} acesso de operador para ${userToToggle.username}`,
      "sucesso"
    );
    setFeedback({ text: `Status de ${userToToggle.nome} alterado com sucesso!`, type: "success" });
  };

  // Switch role template perms
  useEffect(() => {
    if (formRole === "admin") {
      setSelectedPerms(availablePermissions);
    } else if (formRole === "auditor") {
      setSelectedPerms(["Visualização Completa"]);
    } else {
      setSelectedPerms(["Visualização Completa", "Lançar Abates"]);
    }
  }, [formRole]);

  // Create new user submit
  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanUsername = formUsername.trim().replace(/[^a-zA-Z0-9__-]/g, "");
    if (!cleanUsername) {
      setFeedback({ text: "Nome de usuário inválido ou em branco.", type: "error" });
      return;
    }

    if (users.some(u => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
      setFeedback({ text: `Nome de usuário "${cleanUsername}" já está cadastrado.`, type: "error" });
      return;
    }

    if (!formNome.trim()) {
      setFeedback({ text: "Informe o nome completo do operador.", type: "error" });
      return;
    }

    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      nome: formNome.trim(),
      cargo: formCargo.trim() || "Operador Operacional",
      role: formRole,
      ativo: true,
      dataCriacao: new Date().toISOString().split("T")[0],
      permissoes: selectedPerms
    };

    const updated = [...users, newUser];
    saveToStorage(updated);

    onAddSecurityLog("ADICIONAR USUÁRIO", `Criou novo usuário "${cleanUsername}" (${formRole})`, "sucesso");
    setFeedback({ text: `Usuário ${newUser.nome} criado com sucesso!`, type: "success" });

    // Clean form
    setFormUsername("");
    setFormNome("");
    setFormCargo("");
    setIsAddingUser(false);
  };

  const handleTogglePermission = (perm: string) => {
    if (selectedPerms.includes(perm)) {
      if (perm === "Visualização Completa") return; // View complete is basic read permission
      setSelectedPerms(selectedPerms.filter(p => p !== perm));
    } else {
      setSelectedPerms([...selectedPerms, perm]);
    }
  };

  // Simulations of logging in as another user
  const handleSimulateLogin = (username: string) => {
    const userObj = users.find(u => u.username === username);
    if (!userObj) return;

    if (!userObj.ativo) {
      setFeedback({ text: `Este usuário "${username}" está inativo. Ative para logar.`, type: "error" });
      return;
    }

    onSwitchUser(username);
    onAddSecurityLog("SIMULAÇÃO LOGIN", `Login efetuado como operador "${username}"`, "sucesso");
    setFeedback({ text: `Sessão alterada para ${userObj.nome} (${userObj.cargo})`, type: "success" });
  };

  // Delete user
  const handleDeleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;

    if (target.username === currentUser) {
      setFeedback({ text: "Impossível excluir seu próprio login corrente.", type: "error" });
      return;
    }

    if (confirm(`Deseja realmente remover permanentemente o usuário ${target.nome}?`)) {
      const updated = users.filter(u => u.id !== id);
      saveToStorage(updated);
      onAddSecurityLog("EXCLUIR USUÁRIO", `Deletou o usuário de login "${target.username}"`, "alerta");
      setFeedback({ text: `Usuário ${target.nome} excluído.`, type: "success" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" id="user-control-module">
      {/* Module Title Header */}
      <div className="bg-gradient-to-r from-teal-950 via-emerald-950 to-teal-950 p-6 rounded-sm border border-emerald-800 shadow-xs text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-800/80 border border-emerald-700/60 rounded-lg flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Controle de Usuários e Segurança</h2>
              <p className="text-xs text-emerald-300 font-medium mt-1">
                Gerencie operadores, restrinja permissões ambientais e audite históricos de segurança do sistema.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingUser(!isAddingUser)}
            className="px-5 py-3 bg-emerald-700 hover:bg-emerald-600 border border-emerald-605 text-white font-bold text-xs uppercase tracking-wider rounded-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-emerald-300" />
            <span>{isAddingUser ? "Visualizar Usuários" : "Cadastrar Operador"}</span>
          </button>
        </div>
      </div>

      {/* Notifications bar */}
      {feedback && (
        <div className={`p-4 rounded-sm flex items-start justify-between gap-3 border text-xs leading-relaxed ${
          feedback.type === "success" 
            ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" 
            : "bg-rose-50/70 border-rose-200 text-rose-950"
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-[10px] text-slate-400 hover:text-slate-650 cursor-pointer">Fechar</button>
        </div>
      )}

      {/* Conditional: Add Operador Form */}
      {isAddingUser ? (
        <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-2xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
            <UserPlus className="w-4 h-4 text-emerald-905" />
            <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Formulário de Cadastro de Novo Operador</h3>
          </div>

          <form onSubmit={handleCreateUserSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wide font-black text-slate-500 mb-1.5">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide font-black text-slate-500 mb-1.5">Login / Usuário (Letras, números, _, sem espaços)</label>
                <input
                  type="text"
                  required
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="Ex: joao_silva"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide font-black text-slate-500 mb-1.5">Cargo / Função Administrativa</label>
                <input
                  type="text"
                  required
                  value={formCargo}
                  onChange={(e) => setFormCargo(e.target.value)}
                  placeholder="Ex: Supervisor do Pátio Principal"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wide font-black text-slate-500 mb-1.5">Nível de Classificação / Papel</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:border-slate-800 rounded-sm focus:ring-1 focus:ring-slate-800"
                >
                  <option value="operator">Operador (Logística & Industrialização)</option>
                  <option value="admin">Administrador (Total Acesso)</option>
                  <option value="auditor">Auditor Externo (Fiscal - Somente Leitura)</option>
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-[11px] uppercase tracking-wide font-black text-slate-500 mb-2">Conceder Permissões customizadas</label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2">
                {availablePermissions.map(perm => {
                  const isChecked = selectedPerms.includes(perm);
                  const isBasicView = perm === "Visualização Completa";
                  return (
                    <label 
                      key={perm}
                      className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-sm text-xs transition select-none ${
                        isBasicView ? "bg-slate-50 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed" :
                        isChecked ? "bg-emerald-50 border-emerald-350 text-emerald-950 cursor-pointer font-bold" :
                        "hover:bg-slate-50 border-slate-205 text-slate-650 cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isBasicView}
                        onChange={() => handleTogglePermission(perm)}
                        className="rounded-sm accent-emerald-800 w-4 h-4 cursor-pointer"
                      />
                      <span>{perm}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-150 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddingUser(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition cursor-pointer shadow-sm border border-emerald-950"
              >
                Cadastrar Operador
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* USERS DIRECTORY LIST (ColSpan-2) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-2xs">
              
              {/* Directory Filter Panel */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-905" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Diretório de Operadores do Sistema</h3>
                </div>
                <div className="relative w-auto sm:w-64 shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar operadores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-slate-800 rounded-sm font-medium"
                  />
                </div>
              </div>

              {/* Grid of Users cards */}
              <div className="space-y-3">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => {
                    const isSelf = user.username === currentUser;
                    return (
                      <div 
                        key={user.id} 
                        className={`p-4 border rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                          isSelf 
                            ? "border-emerald-350 bg-emerald-50/20 shadow-xs" 
                            : user.ativo 
                            ? "border-slate-200 bg-white" 
                            : "border-slate-105 bg-slate-50/50 opacity-70"
                        }`}
                      >
                        {/* Left Info Column */}
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 uppercase text-xs font-black select-none ${
                            isSelf 
                              ? "bg-emerald-800 text-white" 
                              : user.ativo 
                              ? "bg-slate-200 text-slate-700" 
                              : "bg-slate-150 text-slate-400"
                          }`}>
                            {user.nome.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-baseline gap-2">
                              <span className="font-extrabold text-xs text-slate-800 leading-tight">{user.nome}</span>
                              <span className="text-[10px] font-mono text-slate-450">@{user.username}</span>
                              {isSelf && (
                                <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 text-[8px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded-xs leading-none">
                                  Logado
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-medium mt-1 block">
                              {user.cargo} • <span className="font-mono text-slate-400 block sm:inline">Criado {user.dataCriacao}</span>
                            </span>

                            {/* Badges permissions */}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {user.permissoes.map(perm => (
                                <span 
                                  key={perm} 
                                  className="px-1.5 py-0.5 border border-slate-150 bg-slate-50 text-[8px] text-slate-600 font-bold uppercase rounded-3xs font-mono"
                                >
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right Interaction Column */}
                        <div className="flex items-center gap-2 shrink-0 md:justify-end self-end md:self-center">
                          {/* Toggle Active status */}
                          <button
                            onClick={() => handleToggleStatus(user.id)}
                            disabled={isSelf}
                            className={`px-2 py-1 text-[9px] uppercase tracking-wider font-bold rounded-sm border select-none transition cursor-pointer ${
                              isSelf 
                                ? "bg-slate-50 border-slate-150 text-slate-350 cursor-not-allowed"
                                : user.ativo 
                                ? "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100" 
                                : "border-rose-300 bg-rose-50 text-rose-950 hover:bg-rose-100"
                            }`}
                          >
                            {user.ativo ? "Ativo" : "Inativo"}
                          </button>

                          {/* Login Simulation Button */}
                          <button
                            onClick={() => handleSimulateLogin(user.username)}
                            disabled={isSelf || !user.ativo}
                            className={`px-2.5 py-1 text-[9px] uppercase tracking-wider font-extrabold rounded-sm border flex items-center gap-1 transition ${
                              isSelf || !user.ativo
                                ? "bg-slate-50 border-slate-150 text-slate-305 cursor-not-allowed" 
                                : "bg-slate-800 hover:bg-slate-700 text-white border-slate-900 cursor-pointer shadow-2xs"
                            }`}
                            title="Simular login com esta credencial de operador"
                          >
                            <LogIn className="w-3 h-3" />
                            <span>Logar</span>
                          </button>

                          {/* Delete Operador */}
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={isSelf}
                            className={`p-1.5 rounded-sm transition ${
                              isSelf 
                                ? "text-slate-300 cursor-not-allowed" 
                                : "text-slate-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer border border-slate-105 hover:border-rose-200"
                            }`}
                            title="Excluir operador permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 border border-dashed border-slate-300 rounded-sm text-slate-450">
                    Nenhum operador encontrado com o termo de pesquisa.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR: AUDIT SECURITY TRIAL (ColSpan-1) */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-sm shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-905" />
                  <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-800">Trilha de Auditoria</h3>
                </div>
                {securityLogs.length > 0 && (
                  <button 
                    onClick={onClearSecurityLogs}
                    className="text-[9px] font-bold text-rose-600 hover:text-rose-700 uppercase cursor-pointer"
                  >
                    Zerar Logs
                  </button>
                )}
              </div>

              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1">
                {securityLogs.length > 0 ? (
                  securityLogs.map(log => (
                    <div key={log.id} className="text-[11px] leading-relaxed border-b border-slate-50 pb-2.5 last:border-0 last:pb-0 font-mono">
                      <div className="flex items-center justify-between text-[9px] text-slate-450 font-semibold mb-1">
                        <span>@{log.usuario}</span>
                        <span>{log.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          log.status === "sucesso" ? "bg-emerald-500" :
                          log.status === "alerta" ? "bg-cyan-555" : "bg-rose-500"
                        }`}></span>
                        <strong className="text-slate-850 font-bold uppercase tracking-wider text-[9px] block">
                          {log.acao}
                        </strong>
                      </div>
                      <span className="text-slate-600 block mt-0.5 pl-3 leading-normal">{log.detalhes}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-slate-450 italic text-xs">
                    Nenhuma transação de auditoria gravada para esta sessão.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
