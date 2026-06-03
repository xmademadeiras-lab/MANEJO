/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Lock, Shield, AlertCircle, ArrowRight, Eye, EyeOff } from "lucide-react";
import { UserAccount } from "../types";
import logoUrl from "../assets/images/logo_transparent.png";

interface LoginOverlayProps {
  onLogin: (username: string) => void;
  onAddSecurityLog: (acao: string, detalhes: string, status: "sucesso" | "erro" | "alerta", userOverride?: string) => void;
}

export default function LoginOverlay({ onLogin, onAddSecurityLog }: LoginOverlayProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
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
      permissoes: ["Visualização Completa", "Lançar Abates", "Configurar Logística", "Industrializar Serraria", "Efetuar Backup", "Controle de Usuários"]
    };

    const saved = localStorage.getItem("etw_user_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserAccount[];
        const hasCosta = parsed.some(u => u.username.toUpperCase() === "COSTA");
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
        permissoes: ["Visualização Completa", "Lançar Abates", "Configurar Logística", "Industrializar Serraria", "Efetuar Backup", "Controle de Usuários"]
      }
    ];
    localStorage.setItem("etw_user_accounts", JSON.stringify(initialList));
    return initialList;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    const cleanUsername = username.trim().toUpperCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg("Informe o usuário e a senha de segurança.");
      setIsSubmitting(false);
      return;
    }

    // Direct universal master login check for maximum reliability
    if (cleanUsername === "COSTA") {
      if (cleanPassword === "1318") {
        // Ensure COSTA exists in localStorage
        getRegisteredUsers();
        onAddSecurityLog("AUTENTICAÇÃO TERMINAL", `Login efetuado com sucesso no terminal operacional`, "sucesso", "COSTA");
        setTimeout(() => {
          onLogin("COSTA");
          setIsSubmitting(false);
        }, 450);
        return;
      } else {
        setErrorMsg("Assinatura ou senha de segurança incorreta.");
        onAddSecurityLog("FALHA LOGIN", `Senha incorreta para o operador: COSTA`, "alerta", "COSTA");
        setIsSubmitting(false);
        return;
      }
    }

    // Load available operators with passwords
    const users = getRegisteredUsers();
    
    // Find matching operator (case-insensitive username check, case-sensitive password check)
    const match = users.find(u => u.username.toUpperCase() === cleanUsername);

    if (!match) {
      setErrorMsg("Operador não localizado no banco de credenciais.");
      onAddSecurityLog("FALHA LOGIN", `Tentativa de login malsucedida para usuário inexistente: ${username}`, "alerta", username);
      setIsSubmitting(false);
      return;
    }

    if (!match.ativo) {
      setErrorMsg("Esta credencial de login está desativada. Contrate o administrador.");
      onAddSecurityLog("FALHA LOGIN", `Tentativa de acesso com conta desativada: ${match.username}`, "erro", match.username);
      setIsSubmitting(false);
      return;
    }

    // Default master check and secondary operators check
    const correctPassword = match.senha || "1234";

    if (cleanPassword !== correctPassword) {
      setErrorMsg("Assinatura ou senha de segurança incorreta.");
      onAddSecurityLog("FALHA LOGIN", `Senha incorreta para o operador: ${match.username}`, "alerta", match.username);
      setIsSubmitting(false);
      return;
    }

    // Successful login
    onAddSecurityLog("AUTENTICAÇÃO TERMINAL", `Login efetuado com sucesso no terminal operacional`, "sucesso", match.username);
    
    // Switch and login successfully
    setTimeout(() => {
      onLogin(match.username);
      setIsSubmitting(false);
    }, 450);
  };

  return (
    <div className="min-h-screen w-full bg-radial from-slate-900 via-emerald-950 to-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Decorative ambient background blur vectors */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-800/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-emerald-800/40 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-md relative z-10 transition-all">
        
        {/* Header Branding */}
        <div className="text-center space-y-3.5">
          <div className="mx-auto w-24 h-24 bg-transparent flex items-center justify-center relative z-10 transition-transform hover:scale-105 duration-300">
            <img src={logoUrl} alt="ETW Logo" className="w-22 h-22 object-contain" referrerPolicy="no-referrer" />
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

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {errorMsg && (
            <div className="bg-rose-950/45 border border-rose-800/50 p-4 rounded-xl flex items-start gap-2.5 text-xs text-rose-350 animate-bounce leading-relaxed">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

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
                placeholder="Ex: COSTA"
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
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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

        {/* Security watermark banner */}
        <div className="mt-8 pt-5 border-t border-slate-800/40 text-center text-[10px] text-slate-500/90 leading-relaxed font-mono">
          Operação homologada pelo SISDOF/Ibama. <br />
          Sua presença e endereço IP estão sendo auditados.
        </div>

      </div>

      {/* Default reminder helper pill for easier visual testing */}
      <div className="mt-6 text-center text-xs text-slate-500 bg-slate-900/40 border border-emerald-905/10 px-4 py-2 rounded-full leading-normal z-10 max-w-sm">
        <span className="font-bold text-emerald-400">Default Master Admin:</span> <br />
        Cobrador de Acesso → Usuário: <strong className="text-white">COSTA</strong> | Senha: <strong className="text-white">1318</strong>
      </div>
    </div>
  );
}
