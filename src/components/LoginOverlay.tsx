/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  User,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Download,
  Info,
  ExternalLink,
  UserPlus,
  Briefcase,
  BadgeCheck,
  LogIn,
} from "lucide-react";
import { UserAccount } from "../types";
import {
  loginWithSupabase,
  registerWithSupabase,
  fetchUserAccountsDb,
} from "../lib/supabase";
const logoUrl = "/logo.png";

interface LoginOverlayProps {
  onLogin: (username: string) => void;
  onAddSecurityLog: (
    acao: string,
    detalhes: string,
    status: "sucesso" | "erro" | "alerta",
    userOverride?: string
  ) => void;
  deferredPrompt?: any;
  onOpenInstallModal?: () => void;
}

export default function LoginOverlay({
  onLogin,
  onAddSecurityLog,
  deferredPrompt,
  onOpenInstallModal,
}: LoginOverlayProps) {
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const [rememberUser, setRememberUser] = useState(() => {
    return localStorage.getItem("etw_remember_user") === "true";
  });
  const [username, setUsername] = useState(() => {
    const savedRemember = localStorage.getItem("etw_remember_user") === "true";
    if (savedRemember) {
      return localStorage.getItem("etw_remembered_username") || "";
    }
    return "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Registration fields
  const [regNome, setRegNome] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regCargo, setRegCargo] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Retrieve user accounts dynamically from localStorage or match default master credentials
  const getRegisteredUsers = (): UserAccount[] => {
    const defaultMaster: UserAccount = {
      id: "user-master",
      username: "COSTA",
      senha: "1318",
      nome: "Diretor Costa (Master)",
      cargo: "Administrador Geral Integrado",
      role: "admin",
      ativo: true,
      dataCriacao: "2026-06-03",
      permissoes: [
        "Visualização Completa",
        "Lançar Abates",
        "Configurar Logística",
        "Industrializar Serraria",
        "Efetuar Backup",
        "Controle de Usuários",
      ],
    };

    const saved = localStorage.getItem("etw_user_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserAccount[];
        const hasCosta = parsed.some((u) => u.username.toUpperCase() === "COSTA");
        if (!hasCosta) {
          const updated = [defaultMaster, ...parsed];
          localStorage.setItem("etw_user_accounts", JSON.stringify(updated));
          return updated;
        }
        return parsed;
      } catch {
        // Safe fallback below
      }
    }

    const initialList: UserAccount[] = [
      defaultMaster,
      {
        id: "user-1",
        username: "Gestor_Matriz_01",
        senha: "1234",
        nome: "Marcos Estrela",
        cargo: "Diretor Geral de Operações",
        role: "admin",
        ativo: true,
        dataCriacao: "2026-01-10",
        permissoes: [
          "Visualização Completa",
          "Lançar Abates",
          "Configurar Logística",
          "Industrializar Serraria",
          "Efetuar Backup",
          "Controle de Usuários",
        ],
      },
    ];
    localStorage.setItem("etw_user_accounts", JSON.stringify(initialList));
    return initialList;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    const cleanUsername = username.trim().toUpperCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg("Informe o usuário e a senha de segurança.");
      setIsSubmitting(false);
      return;
    }

    if (rememberUser) {
      localStorage.setItem("etw_remember_user", "true");
      localStorage.setItem("etw_remembered_username", cleanUsername);
    } else {
      localStorage.removeItem("etw_remember_user");
      localStorage.removeItem("etw_remembered_username");
    }

    // 1. Cloud authentication via Supabase
    const cloudAuth = await loginWithSupabase(username.trim(), cleanPassword);
    if (cloudAuth.handled) {
      if (cloudAuth.authenticated && cloudAuth.user) {
        const syncedUsers = await fetchUserAccountsDb();
        if (syncedUsers && syncedUsers.length > 0) {
          localStorage.setItem("etw_user_accounts", JSON.stringify(syncedUsers));
        }
        onAddSecurityLog(
          "AUTENTICAÇÃO TERMINAL",
          `Login autenticado via Supabase para @${cloudAuth.user.username}`,
          "sucesso",
          cloudAuth.user.username
        );
        onLogin(cloudAuth.user.username);
        setIsSubmitting(false);
        return;
      } else {
        setErrorMsg(cloudAuth.error || "Credenciais inválidas no banco de dados.");
        onAddSecurityLog(
          "FALHA LOGIN",
          `Tentativa de login falhou no Supabase para: ${username.trim()}`,
          "alerta",
          username.trim()
        );
        setIsSubmitting(false);
        return;
      }
    }

    // 2. Offline-first fallback
    if (cleanUsername === "COSTA") {
      if (cleanPassword === "1318") {
        getRegisteredUsers();
        onAddSecurityLog(
          "AUTENTICAÇÃO TERMINAL",
          `Login efetuado com sucesso no terminal operacional`,
          "sucesso",
          "COSTA"
        );
        setTimeout(() => {
          onLogin("COSTA");
          setIsSubmitting(false);
        }, 300);
        return;
      } else {
        setErrorMsg("Assinatura ou senha de segurança incorreta.");
        onAddSecurityLog(
          "FALHA LOGIN",
          `Senha incorreta para o operador: COSTA`,
          "alerta",
          "COSTA"
        );
        setIsSubmitting(false);
        return;
      }
    }

    const users = getRegisteredUsers();
    const match = users.find((u) => u.username.toUpperCase() === cleanUsername);

    if (!match) {
      setErrorMsg("Operador não localizado no banco de credenciais.");
      onAddSecurityLog(
        "FALHA LOGIN",
        `Tentativa de login malsucedida para usuário inexistente: ${username}`,
        "alerta",
        username
      );
      setIsSubmitting(false);
      return;
    }

    if (!match.ativo) {
      setErrorMsg(
        "Esta credencial de login está desativada. Contate o administrador."
      );
      onAddSecurityLog(
        "FALHA LOGIN",
        `Tentativa de acesso com conta desativada: ${match.username}`,
        "erro",
        match.username
      );
      setIsSubmitting(false);
      return;
    }

    const correctPassword = match.senha || "1234";

    if (cleanPassword !== correctPassword) {
      setErrorMsg("Assinatura ou senha de segurança incorreta.");
      onAddSecurityLog(
        "FALHA LOGIN",
        `Senha incorreta para o operador: ${match.username}`,
        "alerta",
        match.username
      );
      setIsSubmitting(false);
      return;
    }

    onAddSecurityLog(
      "AUTENTICAÇÃO TERMINAL",
      `Login efetuado com sucesso no terminal operacional`,
      "sucesso",
      match.username
    );
    setTimeout(() => {
      onLogin(match.username);
      setIsSubmitting(false);
    }, 300);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanNome = regNome.trim();
    const cleanUsername = regUsername.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanCargo = regCargo.trim() || "Operador Operacional";
    const cleanPassword = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanNome) {
      setErrorMsg("Informe seu nome completo.");
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setErrorMsg(
        "O usuário de acesso precisa ter ao menos 3 caracteres (letras, números, _ ou -)."
      );
      return;
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      setErrorMsg("A senha de acesso deve ter pelo menos 4 caracteres.");
      return;
    }
    if (cleanPassword !== cleanConfirm) {
      setErrorMsg("As senhas digitadas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    // 1. Try creating account directly in Supabase
    const cloudReg = await registerWithSupabase({
      nome: cleanNome,
      username: cleanUsername,
      cargo: cleanCargo,
      password: cleanPassword,
    });

    if (cloudReg.handled) {
      if (cloudReg.registered && cloudReg.user) {
        const syncedUsers = await fetchUserAccountsDb();
        if (syncedUsers && syncedUsers.length > 0) {
          localStorage.setItem("etw_user_accounts", JSON.stringify(syncedUsers));
        } else {
          const currentLocal = getRegisteredUsers();
          localStorage.setItem(
            "etw_user_accounts",
            JSON.stringify([...currentLocal, { ...cloudReg.user, senha: cleanPassword }])
          );
        }

        onAddSecurityLog(
          "CADASTRO EXTERNO",
          `Nova conta criada no acesso do sistema e salva no Supabase: @${cloudReg.user.username}`,
          "sucesso",
          cloudReg.user.username
        );

        setSuccessMsg(
          `Conta @${cloudReg.user.username} criada e salva no banco de dados! Acessando o sistema...`
        );
        setTimeout(() => {
          onLogin(cloudReg.user!.username);
          setIsSubmitting(false);
        }, 700);
        return;
      } else {
        setErrorMsg(cloudReg.error || "Não foi possível criar o usuário.");
        setIsSubmitting(false);
        return;
      }
    }

    // 2. Offline-first fallback
    const localUsers = getRegisteredUsers();
    if (
      localUsers.some(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
      )
    ) {
      setErrorMsg(`O usuário "${cleanUsername}" já está cadastrado.`);
      setIsSubmitting(false);
      return;
    }

    const newLocalUser: UserAccount = {
      id: `user-${Date.now()}`,
      username: cleanUsername,
      senha: cleanPassword,
      nome: cleanNome,
      cargo: cleanCargo,
      role: "operator",
      ativo: true,
      dataCriacao: new Date().toISOString().split("T")[0],
      permissoes: [
        "Visualização Completa",
        "Lançar Abates",
        "Configurar Logística",
        "Industrializar Serraria",
      ],
    };

    localStorage.setItem(
      "etw_user_accounts",
      JSON.stringify([...localUsers, newLocalUser])
    );

    onAddSecurityLog(
      "CADASTRO EXTERNO",
      `Nova conta criada localmente no acesso: @${newLocalUser.username}`,
      "sucesso",
      newLocalUser.username
    );

    setSuccessMsg(
      `Conta @${newLocalUser.username} criada com sucesso! Acessando o sistema...`
    );
    setTimeout(() => {
      onLogin(newLocalUser.username);
      setIsSubmitting(false);
    }, 600);
  };

  const isInsideIframe =
    typeof window !== "undefined" && window.self !== window.top;

  return (
    <div className="min-h-screen w-full bg-radial from-slate-900 via-emerald-950 to-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      {/* Decorative ambient background blur vectors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-800/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Early Iframe warning banner highlighting PWA install requirements */}
      {isInsideIframe && (
        <div className="w-full max-w-md mb-6 bg-slate-900/95 border border-amber-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md relative z-10 animate-fade-in flex flex-col items-center gap-3">
          <div className="flex gap-2.5 items-start">
            <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                Modo de Visualização Detectado
              </h4>
              <p className="text-[11px] text-slate-350 leading-relaxed">
                Por regras de segurança dos navegadores, a função{" "}
                <strong className="text-white">BAIXAR/INSTALAR</strong> o
                aplicativo fica indisponível por dentro de visualizadores de
                código (Iframe).
              </p>
              <p className="text-[11.5px] text-emerald-450 font-medium">
                Para baixar e adicionar o ícone na sua área de trabalho agora,
                você precisa abrir em uma nova aba fora do editor!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.open(window.location.href, "_blank")}
            className="w-full mt-1.5 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-450 text-white font-sans font-bold text-xs uppercase rounded-xl transition duration-150 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir em Nova Aba & Instalar</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-md bg-slate-900/90 border border-emerald-800/40 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-md relative z-10 transition-all">
        {/* Header Branding */}
        <div className="text-center space-y-3.5">
          <div className="mx-auto w-24 h-24 bg-transparent flex items-center justify-center relative z-10 transition-transform hover:scale-105 duration-300">
            <img
              src={logoUrl}
              alt="ETW Logo"
              className="w-22 h-22 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-450 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-900/50">
              Terminal Seguro
            </span>
            <h1 className="text-2xl font-extrabold text-white tracking-tight mt-3">
              ETW CONTROLE DE AUTEX
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Rastreabilidade de Abates & Gestão de Créditos Florestais
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs: Login vs Create User */}
        <div className="mt-6 grid grid-cols-2 gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-emerald-900/40">
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
              authMode === "login"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Entrar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("register");
              setErrorMsg("");
              setSuccessMsg("");
            }}
            className={`py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer ${
              authMode === "register"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Criar Usuário</span>
          </button>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mt-5 bg-rose-950/45 border border-rose-800/50 p-4 rounded-xl flex items-start gap-2.5 text-xs text-rose-350 leading-relaxed">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-5 bg-emerald-950/60 border border-emerald-600/50 p-4 rounded-xl flex items-start gap-2.5 text-xs text-emerald-300 leading-relaxed">
            <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {authMode === "login" ? (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Usuário */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Usuário / Operador
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600/60" />
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Ex: USUÁRIO"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-emerald-900/40 rounded-xl text-sm font-semibold tracking-wide text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600/60" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={isSubmitting}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 bg-slate-950/60 border border-emerald-900/40 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-white transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Lembrar Usuário */}
            <div className="flex items-center justify-between pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  checked={rememberUser}
                  onChange={(e) => setRememberUser(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-emerald-600 bg-slate-950/85 border-emerald-900 focus:ring-emerald-500/20 accent-emerald-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 group-hover:text-slate-350 transition duration-150 tracking-wide font-medium">
                  Lembrar operador neste terminal
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-550 disabled:bg-emerald-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/20"
            >
              {isSubmitting ? (
                <span>Validando Credenciais...</span>
              ) : (
                <>
                  <span>Autenticar Terminal</span>
                  <ArrowRight className="w-4 h-4 text-emerald-300" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
            {/* Nome Completo */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Nome Completo
              </label>
              <div className="relative">
                <BadgeCheck className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600/60" />
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Ex: João da Silva"
                  value={regNome}
                  onChange={(e) => setRegNome(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-emerald-900/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Login / Usuário */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Usuário de Acesso (sem espaços)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600/60" />
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Ex: joao_silva"
                  value={regUsername}
                  onChange={(e) =>
                    setRegUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))
                  }
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-emerald-900/40 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Cargo / Função */}
            <div className="space-y-1.5">
              <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Cargo / Setor
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600/60" />
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="Ex: Operador de Pátio / Escritório"
                  value={regCargo}
                  onChange={(e) => setRegCargo(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/60 border border-emerald-900/40 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
              </div>
            </div>

            {/* Senha & Confirmação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isSubmitting}
                    placeholder="Mín. 4 dígitos"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-11 pr-9 py-3 bg-slate-950/60 border border-emerald-900/40 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-500 hover:text-white transition"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-emerald-600/60" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    disabled={isSubmitting}
                    placeholder="Repita a senha"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-11 pr-3 py-3 bg-slate-950/60 border border-emerald-900/40 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 mt-2 bg-emerald-600 hover:bg-emerald-550 disabled:bg-emerald-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-950 flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/20"
            >
              {isSubmitting ? (
                <span>Criando Conta no Banco...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 text-emerald-200" />
                  <span>Criar Usuário & Acessar</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Security watermark banner */}
        <div className="mt-8 pt-5 border-t border-slate-800/40 text-center text-[10px] text-slate-500/90 leading-relaxed font-mono">
          Operação homologada pelo SISDOF/Ibama. <br />
          Sua presença e endereço IP estão sendo auditados.
        </div>
      </div>

      {/* PWA download helper button on login page */}
      {onOpenInstallModal && (
        <div className="mt-6 z-10 w-full max-w-md animate-fade-in flex flex-col items-center">
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-950/60 hover:bg-emerald-900/80 hover:scale-102 active:scale-98 text-emerald-450 hover:text-white border border-emerald-500/25 hover:border-emerald-500/50 rounded-2xl text-xs font-bold transition-all shadow-lg cursor-pointer uppercase tracking-wider"
          >
            <Download className="w-4 h-4 animate-bounce" />
            <span>Baixar e Instalar Aplicativo (PWA)</span>
          </button>

          {typeof window !== "undefined" && window.self !== window.top && (
            <p className="text-[10px] text-slate-500 mt-2 text-center max-w-xs leading-normal">
              Você está visualizando por dentro do editor. Clique para abrir em
              nova aba e instalar direto na tela inicial.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
