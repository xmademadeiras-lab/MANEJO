import express from "express";
import type { Express } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REQUIRED_TABLES = [
  "autex",
  "autex_items",
  "deductions",
  "sawmill_logs",
  "user_accounts",
  "security_logs",
  "trucks",
  "galpoes",
  "galpao_dispatches",
  "sawmills",
  "yards",
  "nfe_mappings",
  "user_events",
  "user_notes",
  "user_checklists",
] as const;

export function getSupabaseConfig() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  const hasServerSecrets = Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
  );
  return { url, key, configured: Boolean(url && key), hasServerSecrets };
}

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = "";

export function getSupabaseClient(): SupabaseClient | null {
  const { url, key, configured } = getSupabaseConfig();
  if (!configured) return null;
  const sig = `${url}::${key}`;
  if (!cachedClient || cachedConfigKey !== sig) {
    cachedClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    cachedConfigKey = sig;
  }
  return cachedClient;
}

export function getMigrationSqlText(): string {
  const candidates = [
    path.resolve(
      __dirname,
      "../supabase/migrations/20261112000000_full_persistence_and_user_workspace.sql"
    ),
    path.resolve(
      process.cwd(),
      "supabase/migrations/20261112000000_full_persistence_and_user_workspace.sql"
    ),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf8");
    }
  }
  return "-- Migration file not found.";
}

const DEFAULT_USERS_SEED = [
  {
    id: "user-master",
    username: "COSTA",
    senha: "1318",
    nome: "Diretor Costa (Master)",
    cargo: "Administrador Geral Integrado",
    role: "admin",
    ativo: true,
    data_criacao: "2026-06-03",
    permissoes: [
      "Visualização Completa",
      "Lançar Abates",
      "Configurar Logística",
      "Industrializar Serraria",
      "Efetuar Backup",
      "Controle de Usuários",
    ],
  },
  {
    id: "user-1",
    username: "Gestor_Matriz_01",
    senha: "1234",
    nome: "Marcos Estrela",
    cargo: "Diretor Geral de Operações",
    role: "admin",
    ativo: true,
    data_criacao: "2026-01-10",
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

export function registerSupabaseRoutes(app: Express) {
  app.use(express.json({ limit: "15mb" }));

  // Health & Supabase configuration status
  app.get("/api/supabase/status", async (_req, res) => {
    const cfg = getSupabaseConfig();
    if (!cfg.configured) {
      return res.json({
        configured: false,
        connected: false,
        hasServerSecrets: false,
        missingTables: [...REQUIRED_TABLES],
        message:
          "Credenciais do Supabase não configuradas nos Secrets (SUPABASE_URL e SUPABASE_ANON_KEY).",
      });
    }

    const client = getSupabaseClient();
    if (!client) {
      return res.json({
        configured: false,
        connected: false,
        hasServerSecrets: cfg.hasServerSecrets,
        missingTables: [...REQUIRED_TABLES],
        message: "Cliente Supabase indisponível.",
      });
    }

    const start = Date.now();
    try {
      const checks = await Promise.all(
        REQUIRED_TABLES.map(async (table) => {
          const { error } = await client.from(table).select("*").limit(1);
          return { table, error };
        })
      );
      const latency = Date.now() - start;

      const missingTables = checks
        .filter(
          (c) =>
            c.error &&
            (c.error.code === "42P01" ||
              c.error.code === "PGRST205" ||
              c.error.message?.includes("does not exist") ||
              c.error.message?.includes("Could not find the table"))
        )
        .map((c) => c.table);

      const permissionError = checks.find(
        (c) =>
          c.error &&
          (c.error.code === "42501" ||
            c.error.message?.toLowerCase().includes("permission denied"))
      )?.error;

      if (permissionError) {
        return res.json({
          configured: true,
          connected: false,
          hasServerSecrets: cfg.hasServerSecrets,
          latency,
          missingTables,
          permissionDenied: true,
          message:
            "As tabelas foram criadas, mas falta liberar permissão GRANT no Supabase (erro: permission denied). Execute os comandos GRANT no SQL Editor do Supabase ou configure SUPABASE_SERVICE_ROLE_KEY nos Secrets.",
        });
      }

      const firstFatalError = checks.find(
        (c) =>
          c.error &&
          !missingTables.includes(c.table) &&
          c.error.code !== "PGRST116"
      )?.error;

      if (firstFatalError) {
        return res.json({
          configured: true,
          connected: false,
          hasServerSecrets: cfg.hasServerSecrets,
          latency,
          missingTables,
          message: `Erro ao conectar no Supabase: ${firstFatalError.message}`,
        });
      }

      if (missingTables.length > 0) {
        return res.json({
          configured: true,
          connected: false,
          hasServerSecrets: cfg.hasServerSecrets,
          latency,
          missingTables,
          message: `Conectado ao Supabase, porém faltam ${missingTables.length} tabela(s): ${missingTables.join(", ")}. Execute a migração SQL no Supabase SQL Editor.`,
        });
      }

      return res.json({
        configured: true,
        connected: true,
        hasServerSecrets: cfg.hasServerSecrets,
        latency,
        missingTables: [],
        message:
          "Conectado ao Supabase via Secrets com todas as tabelas ativas e sincronizadas!",
      });
    } catch (err: any) {
      return res.json({
        configured: true,
        connected: false,
        hasServerSecrets: cfg.hasServerSecrets,
        latency: Date.now() - start,
        missingTables: [],
        message: `Falha de conexão com o Supabase: ${err?.message || String(err)}`,
      });
    }
  });

  app.get("/api/supabase/migration-sql", (_req, res) => {
    res.type("text/plain; charset=utf-8").send(getMigrationSqlText());
  });

  // Bootstrap all operational tables
  app.get("/api/supabase/bootstrap", async (_req, res) => {
    const client = getSupabaseClient();
    if (!client) {
      return res.status(503).json({ error: "Supabase não configurado nos Secrets." });
    }

    try {
      const [
        autexRes,
        itemsRes,
        deductionsRes,
        sawmillRes,
        usersRes,
        secLogsRes,
        trucksRes,
        galpoesRes,
        dispatchesRes,
        sawmillsRes,
        yardsRes,
        mappingsRes,
      ] = await Promise.all([
        client.from("autex").select("*"),
        client.from("autex_items").select("*"),
        client.from("deductions").select("*"),
        client.from("sawmill_logs").select("*"),
        client.from("user_accounts").select("*"),
        client
          .from("security_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(150),
        client.from("trucks").select("*"),
        client.from("galpoes").select("*"),
        client.from("galpao_dispatches").select("*"),
        client.from("sawmills").select("*"),
        client.from("yards").select("*"),
        client.from("nfe_mappings").select("*"),
      ]);

      const autexList = (autexRes.data || []).map((a: any) => ({
        id: a.id,
        numero: a.numero,
        descricao: a.descricao || "",
        detentores: a.detentores || [],
        dataCriacao: a.data_criacao,
        items: (itemsRes.data || [])
          .filter((i: any) => i.autex_id === a.id)
          .map((i: any) => ({
            id: i.id,
            especie: i.especie,
            volumeAutorizado: Number(i.volume_autorizado),
            dono: i.dono,
          })),
      }));

      const deductions = (deductionsRes.data || []).map((d: any) => ({
        id: d.id,
        autexId: d.autex_id,
        autexItemId: d.autex_item_id,
        numeroNfe: d.numero_nfe,
        chaveAcesso: d.chave_acesso || undefined,
        dataEmissao: d.data_emissao,
        dono: d.dono,
        especie: d.especie,
        volume: Number(d.volume),
        dataImportacao: d.data_importacao,
        xmlFileName: d.xml_file_name || undefined,
        placaCaminhao: d.placa_caminhao || undefined,
        tipoLancamento: d.tipo_lancamento || "Manual",
        destinoTipo: d.destino_tipo || undefined,
        serrariaDestino: d.serraria_destino || undefined,
        patioDescarregamento: d.patio_descarregamento || undefined,
        galpaoDestino: d.galpao_destino || undefined,
        galpaoEndereco: d.galpao_endereco || undefined,
      }));

      const sawmillLogs = (sawmillRes.data || []).map((s: any) => ({
        id: s.id,
        especie: s.especie,
        dono: s.dono,
        volumeTora: Number(s.volume_tora),
        volumeSerrado: Number(s.volume_serrado),
        produtoSaida: s.produto_saida,
        rendimento: Number(s.rendimento),
        dataProcessamento: s.data_processamento,
        serraria: s.serraria || undefined,
        patio: s.patio || undefined,
      }));

      let userAccounts = (usersRes.data || []).map((u: any) => ({
        id: u.id,
        username: u.username,
        senha: u.senha || undefined,
        nome: u.nome,
        cargo: u.cargo,
        role: u.role,
        ativo: u.ativo,
        dataCriacao: u.data_criacao,
        permissoes: u.permissoes || [],
      }));

      if (!usersRes.error && userAccounts.length === 0) {
        await client.from("user_accounts").upsert(DEFAULT_USERS_SEED);
        userAccounts = DEFAULT_USERS_SEED.map((u) => ({
          id: u.id,
          username: u.username,
          senha: u.senha,
          nome: u.nome,
          cargo: u.cargo,
          role: u.role as "admin" | "operator" | "auditor",
          ativo: u.ativo,
          dataCriacao: u.data_criacao,
          permissoes: u.permissoes,
        }));
      }

      const securityLogs = (secLogsRes.data || []).map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        usuario: l.usuario,
        acao: l.acao,
        detalhes: l.detalhes || "",
        status: l.status,
      }));

      const trucks = (trucksRes.data || []).map((t: any) => ({
        id: t.id,
        placa: t.placa,
        modelo: t.modelo || "",
        motorista: t.motorista || "",
        capacidadeMaxM3: Number(t.capacidade_max_m3 || 45),
      }));

      const galpoes = (galpoesRes.data || []).map((g: any) => ({
        id: g.id,
        nome: g.nome,
        endereco: g.endereco,
        cidadeUf: g.cidade_uf,
        pontoReferencia: g.ponto_referencia || undefined,
        responsavel: g.responsavel || undefined,
        telefone: g.telefone || undefined,
        capacidadeM3:
          g.capacidade_m3 !== null && g.capacidade_m3 !== undefined
            ? Number(g.capacidade_m3)
            : undefined,
        observacoes: g.observacoes || undefined,
      }));

      const galpaoDispatches = (dispatchesRes.data || []).map((d: any) => ({
        id: d.id,
        galpaoId: d.galpao_id,
        galpaoNome: d.galpao_nome,
        especie: d.especie,
        dono: d.dono,
        volume: Number(d.volume),
        tipoSaida: d.tipo_saida,
        destinatario: d.destinatario,
        documentoRef: d.documento_ref || undefined,
        placaCaminhao: d.placa_caminhao || undefined,
        motorista: d.motorista || undefined,
        dataSaida: d.data_saida,
        observacoes: d.observacoes || undefined,
      }));

      const sawmills = (sawmillsRes.data || []).map((s: any) => s.nome);
      const yards = (yardsRes.data || []).map((y: any) => y.nome);
      const nfeMappings: Record<string, { especie: string; dono: string }> = {};
      for (const m of mappingsRes.data || []) {
        nfeMappings[m.chave_xml] = { especie: m.especie, dono: m.dono };
      }

      return res.json({
        autexList: autexRes.error ? null : autexList,
        deductions: deductionsRes.error ? null : deductions,
        sawmillLogs: sawmillRes.error ? null : sawmillLogs,
        userAccounts: usersRes.error ? null : userAccounts,
        securityLogs: secLogsRes.error ? null : securityLogs,
        trucks: trucksRes.error ? null : trucks,
        galpoes: galpoesRes.error ? null : galpoes,
        galpaoDispatches: dispatchesRes.error ? null : galpaoDispatches,
        sawmills: sawmillsRes.error ? null : sawmills,
        yards: yardsRes.error ? null : yards,
        nfeMappings: mappingsRes.error ? null : nfeMappings,
      });
    } catch (err: any) {
      console.error("Bootstrap error:", err);
      return res.status(500).json({ error: err?.message || "Erro ao carregar dados" });
    }
  });

  // Login endpoint checking Supabase user_accounts
  app.post("/api/supabase/auth/login", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) {
      return res.status(503).json({ configured: false, error: "Supabase não configurado." });
    }

    const { username, password } = req.body || {};
    const cleanUser = String(username || "").trim();
    const cleanPass = String(password || "").trim();

    if (!cleanUser || !cleanPass) {
      return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
    }

    try {
      const { data: allUsers, error } = await client.from("user_accounts").select("*");
      if (error) throw error;

      let users = allUsers || [];
      if (users.length === 0) {
        await client.from("user_accounts").upsert(DEFAULT_USERS_SEED);
        users = DEFAULT_USERS_SEED as any[];
      }

      const match = users.find(
        (u: any) => String(u.username || "").toUpperCase() === cleanUser.toUpperCase()
      );

      if (!match) {
        return res.status(401).json({
          authenticated: false,
          error: "Operador não localizado no banco de dados.",
        });
      }

      if (!match.ativo) {
        return res.status(403).json({
          authenticated: false,
          error: "Esta credencial de login está desativada. Contate o administrador.",
        });
      }

      const expectedPass = match.senha || "1234";
      if (cleanPass !== expectedPass) {
        return res.status(401).json({
          authenticated: false,
          error: "Assinatura ou senha de segurança incorreta.",
        });
      }

      return res.json({
        authenticated: true,
        user: {
          id: match.id,
          username: match.username,
          nome: match.nome,
          cargo: match.cargo,
          role: match.role,
          ativo: match.ativo,
          dataCriacao: match.data_criacao,
          permissoes: match.permissoes || [],
        },
      });
    } catch (err: any) {
      console.error("Supabase login error:", err);
      return res.status(500).json({ error: err?.message || "Erro na autenticação." });
    }
  });

  // Public self-registration endpoint creating account in Supabase user_accounts
  app.post("/api/supabase/auth/register", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) {
      return res.status(503).json({ configured: false, error: "Supabase não configurado." });
    }

    const { nome, username, cargo, password } = req.body || {};
    const cleanNome = String(nome || "").trim();
    const cleanUsername = String(username || "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const cleanCargo = String(cargo || "").trim() || "Operador Operacional";
    const cleanPassword = String(password || "").trim();

    if (!cleanNome) {
      return res.status(400).json({ error: "Informe o nome completo." });
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({
        error: "O login deve ter pelo menos 3 caracteres (letras, números, _ ou -).",
      });
    }
    if (!cleanPassword || cleanPassword.length < 4) {
      return res.status(400).json({
        error: "A senha deve ter pelo menos 4 caracteres.",
      });
    }

    try {
      const { data: existingUsers, error: fetchErr } = await client
        .from("user_accounts")
        .select("id, username");
      if (fetchErr) throw fetchErr;

      const list = existingUsers || [];
      if (list.length === 0) {
        await client.from("user_accounts").upsert(DEFAULT_USERS_SEED);
      }

      const duplicate = [...list, ...(list.length === 0 ? DEFAULT_USERS_SEED : [])].some(
        (u: any) =>
          String(u.username || "").toLowerCase() === cleanUsername.toLowerCase()
      );

      if (duplicate) {
        return res.status(409).json({
          registered: false,
          error: `O usuário "${cleanUsername}" já está cadastrado.`,
        });
      }

      const newAccount = {
        id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        username: cleanUsername,
        senha: cleanPassword,
        nome: cleanNome,
        cargo: cleanCargo,
        role: "operator",
        ativo: true,
        data_criacao: new Date().toISOString().split("T")[0],
        permissoes: [
          "Visualização Completa",
          "Lançar Abates",
          "Configurar Logística",
          "Industrializar Serraria",
        ],
        updated_at: new Date().toISOString(),
      };

      const { error: insertErr } = await client
        .from("user_accounts")
        .insert(newAccount);
      if (insertErr) throw insertErr;

      return res.json({
        registered: true,
        user: {
          id: newAccount.id,
          username: newAccount.username,
          nome: newAccount.nome,
          cargo: newAccount.cargo,
          role: newAccount.role,
          ativo: newAccount.ativo,
          dataCriacao: newAccount.data_criacao,
          permissoes: newAccount.permissoes,
        },
      });
    } catch (err: any) {
      console.error("Supabase register error:", err);
      return res.status(500).json({
        registered: false,
        error: err?.message || "Erro ao criar conta no banco de dados.",
      });
    }
  });

  // Users CRUD
  app.get("/api/supabase/users", async (_req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { data, error } = await client.from("user_accounts").select("*");
      if (error) throw error;

      let rows = data || [];
      if (rows.length === 0) {
        await client.from("user_accounts").upsert(DEFAULT_USERS_SEED);
        rows = DEFAULT_USERS_SEED as any[];
      }

      return res.json(
        rows.map((u: any) => ({
          id: u.id,
          username: u.username,
          senha: u.senha || undefined,
          nome: u.nome,
          cargo: u.cargo,
          role: u.role,
          ativo: u.ativo,
          dataCriacao: u.data_criacao,
          permissoes: u.permissoes || [],
        }))
      );
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/supabase/users", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const users = Array.isArray(req.body) ? req.body : [req.body];
      const payload = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        senha: u.senha || null,
        nome: u.nome,
        cargo: u.cargo,
        role: u.role || "operator",
        ativo: u.ativo !== undefined ? Boolean(u.ativo) : true,
        data_criacao: u.dataCriacao || new Date().toISOString().split("T")[0],
        permissoes: u.permissoes || [],
        updated_at: new Date().toISOString(),
      }));

      const { error } = await client.from("user_accounts").upsert(payload);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/users/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client
        .from("user_accounts")
        .delete()
        .eq("id", req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // AUTEX CRUD
  app.post("/api/supabase/autex", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const autex = req.body;
      const { error: autexErr } = await client.from("autex").upsert({
        id: autex.id,
        numero: autex.numero,
        descricao: autex.descricao || "",
        detentores: autex.detentores || [],
        data_criacao: autex.dataCriacao,
      });
      if (autexErr) throw autexErr;

      const { error: delErr } = await client
        .from("autex_items")
        .delete()
        .eq("autex_id", autex.id);
      if (delErr) throw delErr;

      if (Array.isArray(autex.items) && autex.items.length > 0) {
        const itemsPayload = autex.items.map((item: any) => ({
          id: item.id,
          autex_id: autex.id,
          especie: item.especie,
          volume_autorizado: item.volumeAutorizado,
          dono: item.dono,
        }));
        const { error: itemsErr } = await client
          .from("autex_items")
          .insert(itemsPayload);
        if (itemsErr) throw itemsErr;
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/autex/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client.from("autex").delete().eq("id", req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Deductions CRUD
  app.post("/api/supabase/deductions", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const list = Array.isArray(req.body) ? req.body : [req.body];
      if (list.length === 0) return res.json({ success: true });

      const payload = list.map((d: any) => ({
        id: d.id,
        autex_id: d.autexId,
        autex_item_id: d.autexItemId,
        numero_nfe: d.numeroNfe,
        chave_acesso: d.chaveAcesso || null,
        data_emissao: d.dataEmissao,
        dono: d.dono,
        especie: d.especie,
        volume: d.volume,
        data_importacao: d.dataImportacao,
        xml_file_name: d.xmlFileName || null,
        placa_caminhao: d.placaCaminhao || null,
        tipo_lancamento: d.tipoLancamento || "Manual",
        destino_tipo: d.destinoTipo || "serraria",
        serraria_destino: d.serrariaDestino || null,
        patio_descarregamento: d.patioDescarregamento || null,
        galpao_destino: d.galpaoDestino || null,
        galpao_endereco: d.galpaoEndereco || null,
      }));

      const { error } = await client.from("deductions").upsert(payload);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/deductions/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client
        .from("deductions")
        .delete()
        .eq("id", req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Sawmill Logs CRUD
  app.post("/api/supabase/sawmill-logs", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const list = Array.isArray(req.body) ? req.body : [req.body];
      if (list.length === 0) return res.json({ success: true });

      const payload = list.map((s: any) => ({
        id: s.id,
        especie: s.especie,
        dono: s.dono,
        volume_tora: s.volumeTora,
        volume_serrado: s.volumeSerrado,
        produto_saida: s.produtoSaida,
        rendimento: s.rendimento,
        data_processamento: s.dataProcessamento,
        serraria: s.serraria || null,
        patio: s.patio || null,
      }));

      const { error } = await client.from("sawmill_logs").upsert(payload);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/sawmill-logs/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client
        .from("sawmill_logs")
        .delete()
        .eq("id", req.params.id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Security Logs
  app.post("/api/supabase/security-logs", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const list = Array.isArray(req.body) ? req.body : [req.body];
      if (list.length === 0) return res.json({ success: true });

      const payload = list.map((l: any) => ({
        id: l.id,
        timestamp: l.timestamp,
        usuario: l.usuario,
        acao: l.acao,
        detalhes: l.detalhes || "",
        status: l.status || "sucesso",
      }));

      const { error } = await client.from("security_logs").upsert(payload);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/security-logs", async (_req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client
        .from("security_logs")
        .delete()
        .neq("id", "");
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Trucks CRUD
  app.post("/api/supabase/trucks", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const list = Array.isArray(req.body) ? req.body : [req.body];
      const { error: delErr } = await client.from("trucks").delete().neq("id", "");
      if (delErr) throw delErr;

      if (list.length > 0) {
        const payload = list.map((t: any) => ({
          id: t.id,
          placa: t.placa,
          modelo: t.modelo || "",
          motorista: t.motorista || "",
          capacidade_max_m3: Number(t.capacidadeMaxM3 || 45),
        }));
        const { error } = await client.from("trucks").upsert(payload);
        if (error) throw error;
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Sawmills & Yards directories
  app.post("/api/supabase/directories", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { sawmills, yards } = req.body || {};
      if (Array.isArray(sawmills)) {
        await client.from("sawmills").delete().neq("nome", "");
        if (sawmills.length > 0) {
          await client
            .from("sawmills")
            .upsert(sawmills.map((nome: string) => ({ nome })));
        }
      }
      if (Array.isArray(yards)) {
        await client.from("yards").delete().neq("nome", "");
        if (yards.length > 0) {
          await client
            .from("yards")
            .upsert(yards.map((nome: string) => ({ nome })));
        }
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Galpões & Dispatches
  app.post("/api/supabase/galpoes", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const list = Array.isArray(req.body) ? req.body : [req.body];
      await client.from("galpoes").delete().neq("id", "");
      if (list.length > 0) {
        const payload = list.map((g: any) => ({
          id: g.id,
          nome: g.nome,
          endereco: g.endereco,
          cidade_uf: g.cidadeUf,
          ponto_referencia: g.pontoReferencia || null,
          responsavel: g.responsavel || null,
          telefone: g.telefone || null,
          capacidade_m3: g.capacidadeM3 ?? null,
          observacoes: g.observacoes || null,
        }));
        const { error } = await client.from("galpoes").upsert(payload);
        if (error) throw error;
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/supabase/galpao-dispatches", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const list = Array.isArray(req.body) ? req.body : [req.body];
      await client.from("galpao_dispatches").delete().neq("id", "");
      if (list.length > 0) {
        const payload = list.map((d: any) => ({
          id: d.id,
          galpao_id: d.galpaoId,
          galpao_nome: d.galpaoNome,
          especie: d.especie,
          dono: d.dono,
          volume: d.volume,
          tipo_saida: d.tipoSaida,
          destinatario: d.destinatario,
          documento_ref: d.documentoRef || null,
          placa_caminhao: d.placaCaminhao || null,
          motorista: d.motorista || null,
          data_saida: d.dataSaida,
          observacoes: d.observacoes || null,
        }));
        const { error } = await client.from("galpao_dispatches").upsert(payload);
        if (error) throw error;
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // NF-e XML Mappings
  app.post("/api/supabase/nfe-mappings", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const mappingsObj = req.body || {};
      const entries = Object.entries(mappingsObj).map(([chave, val]: [string, any]) => ({
        chave_xml: chave,
        especie: val.especie,
        dono: val.dono,
        updated_at: new Date().toISOString(),
      }));
      if (entries.length > 0) {
        const { error } = await client.from("nfe_mappings").upsert(entries);
        if (error) throw error;
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // --- PER-USER WORKSPACE: EVENTS, NOTES, CHECKLISTS ---
  app.get("/api/supabase/workspace/:username", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    const username = req.params.username;
    try {
      const [eventsRes, notesRes, checklistsRes] = await Promise.all([
        client
          .from("user_events")
          .select("*")
          .eq("username", username)
          .order("data_evento", { ascending: true }),
        client
          .from("user_notes")
          .select("*")
          .eq("username", username)
          .order("fixada", { ascending: false }),
        client
          .from("user_checklists")
          .select("*")
          .eq("username", username),
      ]);

      return res.json({
        events: (eventsRes.data || []).map((e: any) => ({
          id: e.id,
          username: e.username,
          titulo: e.titulo,
          descricao: e.descricao || "",
          dataEvento: e.data_evento,
          horaEvento: e.hora_evento || undefined,
          categoria: e.categoria || "Operacional",
          prioridade: e.prioridade || "media",
          concluido: Boolean(e.concluido),
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        })),
        notes: (notesRes.data || []).map((n: any) => ({
          id: n.id,
          username: n.username,
          titulo: n.titulo,
          conteudo: n.conteudo,
          cor: n.cor || "emerald",
          fixada: Boolean(n.fixada),
          tags: n.tags || [],
          createdAt: n.created_at,
          updatedAt: n.updated_at,
        })),
        checklists: (checklistsRes.data || []).map((c: any) => ({
          id: c.id,
          username: c.username,
          titulo: c.titulo,
          categoria: c.categoria || "Operacional",
          items: Array.isArray(c.items) ? c.items : [],
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        })),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/supabase/workspace/:username/events", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const ev = req.body;
      const { error } = await client.from("user_events").upsert({
        id: ev.id,
        username: req.params.username,
        titulo: ev.titulo,
        descricao: ev.descricao || "",
        data_evento: ev.dataEvento,
        hora_evento: ev.horaEvento || null,
        categoria: ev.categoria || "Operacional",
        prioridade: ev.prioridade || "media",
        concluido: Boolean(ev.concluido),
        created_at: ev.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/workspace/:username/events/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client
        .from("user_events")
        .delete()
        .eq("id", req.params.id)
        .eq("username", req.params.username);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/supabase/workspace/:username/notes", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const note = req.body;
      const { error } = await client.from("user_notes").upsert({
        id: note.id,
        username: req.params.username,
        titulo: note.titulo,
        conteudo: note.conteudo,
        cor: note.cor || "emerald",
        fixada: Boolean(note.fixada),
        tags: note.tags || [],
        created_at: note.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/workspace/:username/notes/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client
        .from("user_notes")
        .delete()
        .eq("id", req.params.id)
        .eq("username", req.params.username);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.post("/api/supabase/workspace/:username/checklists", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const cl = req.body;
      const { error } = await client.from("user_checklists").upsert({
        id: cl.id,
        username: req.params.username,
        titulo: cl.titulo,
        categoria: cl.categoria || "Operacional",
        items: Array.isArray(cl.items) ? cl.items : [],
        created_at: cl.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  app.delete("/api/supabase/workspace/:username/checklists/:id", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) return res.status(503).json({ error: "Supabase não configurado." });

    try {
      const { error } = await client
        .from("user_checklists")
        .delete()
        .eq("id", req.params.id)
        .eq("username", req.params.username);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Bulk sync all client data to Supabase
  app.post("/api/supabase/sync-all", async (req, res) => {
    const client = getSupabaseClient();
    if (!client) {
      return res.status(503).json({
        success: false,
        message: "Supabase não configurado nos Secrets do ambiente.",
      });
    }

    try {
      const {
        autexList = [],
        deductions = [],
        sawmillLogs = [],
        userAccounts = [],
        securityLogs = [],
        trucks = [],
        galpoes = [],
        galpaoDispatches = [],
        sawmills = [],
        yards = [],
        nfeMappings = {},
        userEvents = [],
        userNotes = [],
        userChecklists = [],
      } = req.body || {};

      for (const a of autexList) {
        const { error: aErr } = await client.from("autex").upsert({
          id: a.id,
          numero: a.numero,
          descricao: a.descricao || "",
          detentores: a.detentores || [],
          data_criacao: a.dataCriacao,
        });
        if (aErr) throw aErr;

        await client.from("autex_items").delete().eq("autex_id", a.id);
        if (Array.isArray(a.items) && a.items.length > 0) {
          const { error: iErr } = await client.from("autex_items").insert(
            a.items.map((item: any) => ({
              id: item.id,
              autex_id: a.id,
              especie: item.especie,
              volume_autorizado: item.volumeAutorizado,
              dono: item.dono,
            }))
          );
          if (iErr) throw iErr;
        }
      }

      if (deductions.length > 0) {
        const { error } = await client.from("deductions").upsert(
          deductions.map((d: any) => ({
            id: d.id,
            autex_id: d.autexId,
            autex_item_id: d.autexItemId,
            numero_nfe: d.numeroNfe,
            chave_acesso: d.chaveAcesso || null,
            data_emissao: d.dataEmissao,
            dono: d.dono,
            especie: d.especie,
            volume: d.volume,
            data_importacao: d.dataImportacao,
            xml_file_name: d.xmlFileName || null,
            placa_caminhao: d.placaCaminhao || null,
            tipo_lancamento: d.tipoLancamento || "Manual",
            destino_tipo: d.destinoTipo || "serraria",
            serraria_destino: d.serrariaDestino || null,
            patio_descarregamento: d.patioDescarregamento || null,
            galpao_destino: d.galpaoDestino || null,
            galpao_endereco: d.galpaoEndereco || null,
          }))
        );
        if (error) throw error;
      }

      if (sawmillLogs.length > 0) {
        const { error } = await client.from("sawmill_logs").upsert(
          sawmillLogs.map((s: any) => ({
            id: s.id,
            especie: s.especie,
            dono: s.dono,
            volume_tora: s.volumeTora,
            volume_serrado: s.volumeSerrado,
            produto_saida: s.produtoSaida,
            rendimento: s.rendimento,
            data_processamento: s.dataProcessamento,
            serraria: s.serraria || null,
            patio: s.patio || null,
          }))
        );
        if (error) throw error;
      }

      if (userAccounts.length > 0) {
        const { error } = await client.from("user_accounts").upsert(
          userAccounts.map((u: any) => ({
            id: u.id,
            username: u.username,
            senha: u.senha || null,
            nome: u.nome,
            cargo: u.cargo,
            role: u.role || "operator",
            ativo: u.ativo !== undefined ? u.ativo : true,
            data_criacao: u.dataCriacao,
            permissoes: u.permissoes || [],
            updated_at: new Date().toISOString(),
          }))
        );
        if (error) throw error;
      }

      if (securityLogs.length > 0) {
        const { error } = await client.from("security_logs").upsert(
          securityLogs.map((l: any) => ({
            id: l.id,
            timestamp: l.timestamp,
            usuario: l.usuario,
            acao: l.acao,
            detalhes: l.detalhes || "",
            status: l.status || "sucesso",
          }))
        );
        if (error) throw error;
      }

      if (trucks.length > 0) {
        const { error } = await client.from("trucks").upsert(
          trucks.map((t: any) => ({
            id: t.id,
            placa: t.placa,
            modelo: t.modelo || "",
            motorista: t.motorista || "",
            capacidade_max_m3: Number(t.capacidadeMaxM3 || 45),
          }))
        );
        if (error) throw error;
      }

      if (galpoes.length > 0) {
        const { error } = await client.from("galpoes").upsert(
          galpoes.map((g: any) => ({
            id: g.id,
            nome: g.nome,
            endereco: g.endereco,
            cidade_uf: g.cidadeUf,
            ponto_referencia: g.pontoReferencia || null,
            responsavel: g.responsavel || null,
            telefone: g.telefone || null,
            capacidade_m3: g.capacidadeM3 ?? null,
            observacoes: g.observacoes || null,
          }))
        );
        if (error) throw error;
      }

      if (galpaoDispatches.length > 0) {
        const { error } = await client.from("galpao_dispatches").upsert(
          galpaoDispatches.map((d: any) => ({
            id: d.id,
            galpao_id: d.galpaoId,
            galpao_nome: d.galpaoNome,
            especie: d.especie,
            dono: d.dono,
            volume: d.volume,
            tipo_saida: d.tipoSaida,
            destinatario: d.destinatario,
            documento_ref: d.documentoRef || null,
            placa_caminhao: d.placaCaminhao || null,
            motorista: d.motorista || null,
            data_saida: d.dataSaida,
            observacoes: d.observacoes || null,
          }))
        );
        if (error) throw error;
      }

      if (sawmills.length > 0) {
        await client
          .from("sawmills")
          .upsert(sawmills.map((nome: string) => ({ nome })));
      }

      if (yards.length > 0) {
        await client
          .from("yards")
          .upsert(yards.map((nome: string) => ({ nome })));
      }

      const mapEntries = Object.entries(nfeMappings || {});
      if (mapEntries.length > 0) {
        await client.from("nfe_mappings").upsert(
          mapEntries.map(([chave_xml, val]: [string, any]) => ({
            chave_xml,
            especie: val.especie,
            dono: val.dono,
            updated_at: new Date().toISOString(),
          }))
        );
      }

      if (userEvents.length > 0) {
        const { error } = await client.from("user_events").upsert(
          userEvents.map((ev: any) => ({
            id: ev.id,
            username: ev.username,
            titulo: ev.titulo,
            descricao: ev.descricao || "",
            data_evento: ev.dataEvento,
            hora_evento: ev.horaEvento || null,
            categoria: ev.categoria || "Operacional",
            prioridade: ev.prioridade || "media",
            concluido: Boolean(ev.concluido),
            created_at: ev.createdAt || new Date().toISOString(),
            updated_at: ev.updatedAt || new Date().toISOString(),
          }))
        );
        if (error) throw error;
      }

      if (userNotes.length > 0) {
        const { error } = await client.from("user_notes").upsert(
          userNotes.map((n: any) => ({
            id: n.id,
            username: n.username,
            titulo: n.titulo,
            conteudo: n.conteudo,
            cor: n.cor || "emerald",
            fixada: Boolean(n.fixada),
            tags: n.tags || [],
            created_at: n.createdAt || new Date().toISOString(),
            updated_at: n.updatedAt || new Date().toISOString(),
          }))
        );
        if (error) throw error;
      }

      if (userChecklists.length > 0) {
        const { error } = await client.from("user_checklists").upsert(
          userChecklists.map((c: any) => ({
            id: c.id,
            username: c.username,
            titulo: c.titulo,
            categoria: c.categoria || "Operacional",
            items: Array.isArray(c.items) ? c.items : [],
            created_at: c.createdAt || new Date().toISOString(),
            updated_at: c.updatedAt || new Date().toISOString(),
          }))
        );
        if (error) throw error;
      }

      return res.json({
        success: true,
        message:
          "Sincronização completa enviada para o Supabase com sucesso (contas, eventos, notas, checklists, AUTEX, notas fiscais e logística)!",
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Erro ao sincronizar dados com o Supabase: ${err?.message || String(err)}`,
      });
    }
  });
}
