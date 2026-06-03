import React, { useState } from "react";
import { 
  X, 
  Download, 
  Smartphone, 
  Monitor, 
  CheckCircle, 
  Share, 
  PlusSquare, 
  ArrowRight,
  Info
} from "lucide-react";
import logoUrl from "../assets/images/logo_transparent.png";

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any; // BeforeInstallPromptEvent or null
  onInstallSuccess: () => void;
}

export default function PwaInstallModal({ 
  isOpen, 
  onClose, 
  deferredPrompt, 
  onInstallSuccess 
}: PwaInstallModalProps) {
  const [activeTab, setActiveTab ] = useState<"tutorial" | "beneficios">("tutorial");
  const [copied, setCopied] = useState(false);
  const [osTab, setOsTab] = useState<"android" | "ios" | "desktop">(() => {
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return "ios";
      if (/android/.test(ua)) return "android";
    }
    return "desktop";
  });

  const isInsideIframe = typeof window !== "undefined" && window.self !== window.top;

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install request: ${outcome}`);
        if (outcome === "accepted") {
          onInstallSuccess();
          onClose();
        }
      } catch (err) {
        console.error("Erro ao invocar prompt de instalação:", err);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in"
      id="pwa-install-modal-overlay"
    >
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        id="pwa-install-modal-content"
      >
        {/* Header styling */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-emerald-950/25">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-950 rounded-xl flex items-center justify-center border border-emerald-800/40">
              <img src={logoUrl} alt="Logo ETW" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                Baixar Aplicativo ETW
              </h3>
              <p className="text-[10px] text-emerald-450 font-mono tracking-widest uppercase">
                Progressive Web App (PWA)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            title="Fechar"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal tabs */}
        <div className="flex border-b border-slate-850 px-4 bg-slate-950/20 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("tutorial")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "tutorial" 
                ? "border-emerald-500 text-emerald-400" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            📱 Instruções de Instalação
          </button>
          <button
            onClick={() => setActiveTab("beneficios")}
            className={`py-3 px-4 border-b-2 transition ${
              activeTab === "beneficios" 
                ? "border-emerald-500 text-emerald-400" 
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            🌟 Vantagens de Baixar
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === "tutorial" ? (
            <div className="space-y-4">
              {isInsideIframe ? (
                /* Inside AI Studio Iframe Warning and Open Link */
                <div className="bg-amber-950/40 border border-amber-850/60 p-4 rounded-xl text-center space-y-4 shadow-inner animate-fade-in">
                  <div className="mx-auto w-12 h-12 bg-amber-900/30 border border-amber-600/40 rounded-full flex items-center justify-center text-amber-400">
                    <Info className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                      Visualizador de Testes (Iframe)
                    </h4>
                    <p className="text-[11px] text-slate-350 mt-1.5 leading-relaxed">
                      O Google Chrome e Safari não permitem instalar aplicativos Web (PWAs) diretamente por dentro de frames incorporados por questões de segurança.
                    </p>
                    <p className="text-[11px] text-emerald-400 mt-2 font-medium">
                      Para instalar este site instantaneamente na sua tela inicial, basta clicar no botão abaixo para abrir o painel em uma nova aba fora do visualizador do AI Studio!
                    </p>
                  </div>
                  
                  <div className="pt-1.5 space-y-2">
                    <button
                      onClick={() => {
                        window.open(window.location.href, "_blank");
                        onClose();
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-450 hover:shadow-lg text-white font-sans font-bold uppercase py-3 rounded-xl transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-xs"
                      type="button"
                    >
                      <Share className="w-4 h-4" />
                      Abrir em Nova Aba & Instalar
                    </button>
                    
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(window.location.href);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="w-full bg-slate-850 hover:bg-slate-800 text-slate-300 font-sans font-bold uppercase py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-[10px]"
                      type="button"
                    >
                      {copied ? "✓ Copiado com sucesso!" : "Copiar Link do Sistema"}
                    </button>
                  </div>
                </div>
              ) : deferredPrompt ? (
                /* Native prompt available */
                <div className="bg-emerald-950/40 border border-emerald-800/50 p-4 rounded-xl text-center space-y-3.5 shadow-inner">
                  <div className="mx-auto w-12 h-12 bg-emerald-900/40 border border-emerald-500/50 rounded-full flex items-center justify-center text-emerald-450 shadow-md">
                    <Download className="w-6 h-6 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                      Seu navegador suporta instalação direta!
                    </h4>
                    <p className="text-[11px] text-slate-350 mt-1 leading-relaxed">
                      Clique no botão de instalação rápida abaixo para baixar o sistema de forma instantânea em sua tela inicial.
                    </p>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    className="w-full bg-emerald-500 hover:bg-emerald-450 hover:shadow-lg text-white font-sans font-bold uppercase py-3 rounded-xl transition shadow duration-150 flex items-center justify-center gap-2 cursor-pointer text-xs"
                  >
                    <Download className="w-4 h-4" />
                    Instalar Aplicativo Oficial
                  </button>
                </div>
              ) : (
                /* No native prompt, show OS instruction cards */
                <div className="space-y-4.5">
                  <div className="bg-slate-950/50 border border-slate-800/70 p-3.5 rounded-xl flex gap-3 text-xs text-slate-300 leading-relaxed">
                    <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">Instalação Segura</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        O aplicativo roda sob segurança restrita do seu navegador e não adiciona arquivos pesados.
                      </p>
                    </div>
                  </div>

                  {/* Device selectors */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                    <button
                      onClick={() => setOsTab("android")}
                      className={`py-2 px-1 border rounded-xl transition flex flex-col items-center gap-1.5 ${
                        osTab === "android"
                          ? "bg-emerald-950/60 border-emerald-500/50 text-white shadow"
                          : "bg-slate-950/20 border-slate-800 text-slate-400 hover:bg-slate-850"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-emerald-450" />
                      <span>Android</span>
                    </button>
                    <button
                      onClick={() => setOsTab("ios")}
                      className={`py-2 px-1 border rounded-xl transition flex flex-col items-center gap-1.5 ${
                        osTab === "ios"
                          ? "bg-emerald-950/60 border-emerald-500/50 text-white shadow"
                          : "bg-slate-950/20 border-slate-800 text-slate-400 hover:bg-slate-850"
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-emerald-450" />
                      <span>iPhone / iPad</span>
                    </button>
                    <button
                      onClick={() => setOsTab("desktop")}
                      className={`py-2 px-1 border rounded-xl transition flex flex-col items-center gap-1.5 ${
                        osTab === "desktop"
                          ? "bg-emerald-950/60 border-emerald-500/50 text-white shadow"
                          : "bg-slate-950/20 border-slate-800 text-slate-400 hover:bg-slate-850"
                      }`}
                    >
                      <Monitor className="w-4 h-4 text-emerald-450" />
                      <span>Computador</span>
                    </button>
                  </div>

                  {/* Guided explanations based on active platform */}
                  <div className="bg-slate-950/45 p-4 border border-slate-850/60 rounded-xl space-y-4">
                    {osTab === "android" && (
                      <div className="space-y-3.5">
                        <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Como instalar no Android:
                        </div>
                        <ol className="text-[11px] text-slate-350 space-y-3 list-decimal list-inside leading-relaxed">
                          <li>Abra este painel de controle pelo navegador <strong className="text-white">Google Chrome</strong>.</li>
                          <li>Toque no botão de menu do Chrome <strong className="text-white">(três pontos)</strong> no canto superior direito.</li>
                          <li>Selecione a opção <strong className="text-white">"Adicionar à tela inicial"</strong> ou <strong className="text-white">"Instalar aplicativo"</strong>.</li>
                          <li>Toque em <strong className="text-white">Adicionar</strong> para confirmar e pronto!</li>
                        </ol>
                      </div>
                    )}

                    {osTab === "ios" && (
                      <div className="space-y-3.5">
                        <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Como instalar no iPhone (Safari):
                        </div>
                        <ol className="text-[11px] text-slate-350 space-y-3 leading-relaxed">
                          <li className="flex gap-2.5 items-start">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-900 border border-emerald-600/30 text-[9px] font-bold text-emerald-400 shrink-0 mt-0.5">1</span>
                            <span>Abra o painel utilizando obrigatoriamente o navegador nativo <strong className="text-white">Safari</strong>.</span>
                          </li>
                          <li className="flex gap-2.5 items-start">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-900 border border-emerald-600/30 text-[9px] font-bold text-emerald-400 shrink-0 mt-0.5">2</span>
                            <span className="flex items-center flex-wrap gap-1">
                              Clique no ícone de <strong>Compartilhar</strong> 
                              <span className="inline-flex p-0.5 bg-slate-800 border border-slate-750 rounded text-slate-300 mx-0.5">
                                <Share className="w-3 h-3" />
                              </span>
                              na barra de menu do Safari (embaixo no celular, em cima no iPad).
                            </span>
                          </li>
                          <li className="flex gap-2.5 items-start">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-900 border border-emerald-600/30 text-[9px] font-bold text-emerald-400 shrink-0 mt-0.5">3</span>
                            <span className="flex items-center flex-wrap gap-1">
                              Procure e clique na opção <strong className="text-white">"Adicionar à Tela de Início"</strong>
                              <span className="inline-flex p-0.5 bg-slate-800 border border-slate-750 rounded text-slate-300 mx-0.5">
                                <PlusSquare className="w-3 h-3" />
                              </span>.
                            </span>
                          </li>
                          <li className="flex gap-2.5 items-start">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-900 border border-emerald-600/30 text-[9px] font-bold text-emerald-400 shrink-0 mt-0.5">4</span>
                            <span>Toque em <strong className="text-white">Adicionar</strong> no canto superior direito para finalizar.</span>
                          </li>
                        </ol>
                      </div>
                    )}

                    {osTab === "desktop" && (
                      <div className="space-y-3.5">
                        <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-2 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Como instalar no Computador (Chrome/Edge):
                        </div>
                        <ol className="text-[11px] text-slate-350 space-y-3 list-decimal list-inside leading-relaxed">
                          <li>Na barra de endereços do topo do seu navegador, procure pelo ícone de monitor com uma seta para baixo <strong className="text-white">(Instalar)</strong> no lado direito.</li>
                          <li>Ou clique nos <strong className="text-white">três pontos (Chrome) / Menu</strong> no topo direito e vá em <strong className="text-white">"Salvar e compartilhar"</strong> &rarr; <strong className="text-white">"Instalar página como app"</strong>.</li>
                          <li>Clique na opção <strong className="text-white">Instalar</strong> no pop-up de confirmação.</li>
                          <li>O painel será aberto na sua própria janela de aplicativo independente na área de trabalho.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Advantages tab listing benefits of PWA */
            <div className="space-y-4">
              <div className="bg-slate-950/40 border border-slate-800/70 p-4 rounded-xl space-y-3.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest border-b border-slate-800/80 pb-2">
                  Por que instalar o WebApp?
                </h4>
                
                <ul className="space-y-4">
                  <li className="flex gap-3 items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-450 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Visualização Sem Distorções e Sem Navegador</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Esconde a url e barras de navegação do browser, aproveitando todo o espaço físico e a densidade de informações em tela cheia de forma integrada.
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex gap-3 items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-450 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Consumo Incrivelmente Baixo de Armazenamento</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Ao contrário de apps normais de lojas de aplicativos que consomem centenas de MBs, o PWA ocupa menos de 1MB, garantindo o máximo de velocidade.
                      </p>
                    </div>
                  </li>
                  
                  <li className="flex gap-3 items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-450 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Garantia de Atualização Automática</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Toda vez que você abrir o aplicativo conectado à internet, o Service Worker atualiza as telas silenciosamente em segundo plano.
                      </p>
                    </div>
                  </li>

                  <li className="flex gap-3 items-start">
                    <CheckCircle className="w-5 h-5 text-emerald-450 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white">Ícone Exclusivo na Sua Tela Inicial</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Acesse o painel direto da tela inicial do celular ou desktop rapidamente em um único clique sem precisar digitar sites ou procurar links.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white font-semibold rounded-xl text-xs transition cursor-pointer"
            type="button"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
}
