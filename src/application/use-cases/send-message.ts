import { createMessage } from "../../domain/chat-message.js";
import type { ChatSession } from "../../domain/chat-session.js";
import {
  getDefaultModelsByProvider,
  getModelsByProvider,
  resetModelsByProvider,
  setModelsByProvider,
  type RuntimeSettings,
} from "../../domain/runtime-settings.js";
import type { AssistantPort, BehavioralState } from "../ports/assistant-port.js";
import type { CodexAuthPort } from "../ports/codex-auth-port.js";
import type { CodexModelDiscoveryPort } from "../ports/codex-model-discovery-port.js";
import type { PythonRunnerPort } from "../ports/python-runner-port.js";
import type { RuntimeSettingsPort } from "../ports/runtime-settings-port.js";
import type {
  SkillCatalogEntry,
  SkillsCatalogPort,
} from "../ports/skills-catalog-port.js";
import type { TaskQueuePort } from "../ports/task-queue-port.js";

const PYTHON_COMMAND_PREFIX = "/py ";
const AUTH_COMMAND_PREFIX = "/auth";
const AUTH_API_COMMAND_PREFIX = "/auth api ";
const SKILLS_COMMAND_PREFIX = "/skills";
const DEFAULT_CODEX_MODEL = "gpt-5.3-codex";
const PUBLIC_FACING_KEYWORDS = [
  "postar",
  "publicar",
  "linkedin",
  "tweet",
  "twitter",
  "x.com",
  "instagram",
  "tiktok",
  "youtube",
  "email para",
  "e-mail para",
  "enviar email",
  "mensagem publica",
  "comunicado publico",
] as const;
const HIGH_RISK_KEYWORDS = [
  "pix",
  "pagamento",
  "transferencia",
  "boleto",
  "fatura",
  "nota fiscal",
  "financeiro",
  "producao",
  "deploy em producao",
  "credencial",
  "senha",
  "chave api",
  "token",
  "dado sensivel",
  "dados sensiveis",
  "cliente real",
] as const;
const RECOVERY_KEYWORDS = [
  "erro",
  "falha",
  "exception",
  "stack trace",
  "traceback",
  "bug",
  "quebrou",
  "nao funciona",
  "timeout",
  "crash",
  "failed",
] as const;
const EXECUTION_KEYWORDS = [
  "crie",
  "faca",
  "implemente",
  "gere",
  "edite",
  "refatore",
  "adicione",
  "remova",
  "mude",
  "aplique",
  "configure",
  "corrija",
  "ajuste",
  "rode",
  "execute",
] as const;
const ADVISORY_PATTERNS = [
  /^o que e\b/,
  /^qual a diferenca\b/,
  /^como funciona\b/,
  /^me explique\b/,
  /^explique\b/,
  /^arquitetura\b/,
  /^tradeoff\b/,
  /^por que\b/,
] as const;

export interface SendMessageDeps {
  assistant: AssistantPort;
  taskQueue: TaskQueuePort;
  pythonRunner: PythonRunnerPort;
  codexAuth: CodexAuthPort;
  codexModelDiscovery: CodexModelDiscoveryPort;
  runtimeSettings: RuntimeSettingsPort;
  skillsCatalog: SkillsCatalogPort;
}

export class SendMessageUseCase {
  constructor(private readonly deps: SendMessageDeps) {}

  async execute(session: ChatSession, rawInput: string) {
    const input = rawInput.trim();
    if (!input) return null;

    const userMessage = createMessage("user", this.sanitizeInputForHistory(input));
    session.messages.push(userMessage);

    const assistantMessage = input.startsWith(PYTHON_COMMAND_PREFIX)
      ? await this.executePythonCommand(input)
      : input === SKILLS_COMMAND_PREFIX || input.startsWith(`${SKILLS_COMMAND_PREFIX} `)
        ? await this.executeSkillsCommand(input)
      : input.startsWith(AUTH_COMMAND_PREFIX)
        ? await this.executeAuthCommand(input)
      : await this.executeAssistantTurn(session, input);

    session.messages.push(assistantMessage);
    return { userMessage, assistantMessage };
  }

  private async executeAssistantTurn(session: ChatSession, input: string) {
    const behaviorState = this.resolveBehaviorState(input);
    const behaviorPatch = this.buildBehaviorSystemPatch(behaviorState);
    const reply = await this.deps.taskQueue.schedule(() =>
      this.deps.assistant.respond({
        sessionId: session.id,
        message: input,
        history: session.messages,
        behaviorState,
        systemPatches: [behaviorPatch],
      }),
    );

    return createMessage("assistant", reply.text, {
      ...(reply.metadata ?? {}),
      behaviorState,
    });
  }

  private async executePythonCommand(input: string) {
    const script = input.slice(PYTHON_COMMAND_PREFIX.length).trim();
    if (!script) {
      return createMessage(
        "assistant",
        "Comando inválido. Use `/py print(\"Olá\")`.",
        { source: "python" },
      );
    }

    const result = await this.deps.taskQueue.schedule(() =>
      this.deps.pythonRunner.runInlineScript(script),
    );

    if (result.exitCode !== 0) {
      return createMessage(
        "assistant",
        `Erro no Python (exit ${result.exitCode}):\n${result.stderr.trim() || "sem detalhes"}`,
        { source: "python" },
      );
    }

    const stdout = result.stdout.trim() || "(sem saída)";
    return createMessage("assistant", stdout, { source: "python" });
  }

  private sanitizeInputForHistory(input: string): string {
    if (!input.startsWith(AUTH_API_COMMAND_PREFIX)) {
      return input;
    }
    return "/auth api ******";
  }

  private async executeAuthCommand(input: string) {
    const parts = input.split(/\s+/);
    const action = (parts[1] ?? "help").toLowerCase();

    if (action === "help") {
      const status = await this.deps.codexAuth.getStatus().catch(() => ({
        loggedIn: false,
        mode: "unknown",
        details: "Nao foi possivel verificar status.",
      }));
      return createMessage(
        "assistant",
        [
          "Autenticacao Codex/OpenAI:",
          `/auth status - mostra status atual (${this.formatAuthMode(status.mode)})`,
          "/auth login - login ChatGPT (browser OAuth)",
          "/auth device - login ChatGPT com device code",
          "/auth api <OPENAI_API_KEY> - login com API key",
          "/auth logout - remove credenciais salvas",
          "",
          "Para usar modelos Codex no Alicia, selecione provider `codex` em /settings.",
        ].join("\n"),
        { source: "codex-auth", command: "help" },
      );
    }

    if (action === "status") {
      const status = await this.deps.codexAuth.getStatus();
      const modelsSummary = status.loggedIn ? await this.refreshCodexModelsForCurrentLogin() : null;
      return createMessage(
        "assistant",
        [
          `Autenticado: ${status.loggedIn ? "sim" : "nao"}`,
          `Modo: ${this.formatAuthMode(status.mode)}`,
          `Detalhes: ${status.details || "(sem detalhes)"}`,
          ...(modelsSummary ? [modelsSummary] : []),
        ].join("\n"),
        { source: "codex-auth", command: "status" },
      );
    }

    if (action === "login") {
      const output = await this.deps.codexAuth.loginWithChatGPT();
      const modelsSummary = await this.refreshCodexModelsForCurrentLoginAndActivate();
      return createMessage(
        "assistant",
        [output, modelsSummary].filter(Boolean).join("\n"),
        { source: "codex-auth", command: "login" },
      );
    }

    if (action === "device") {
      const output = await this.deps.codexAuth.loginWithDeviceCode();
      const modelsSummary = await this.refreshCodexModelsForCurrentLoginAndActivate();
      return createMessage(
        "assistant",
        [output, modelsSummary].filter(Boolean).join("\n"),
        { source: "codex-auth", command: "device" },
      );
    }

    if (action === "logout") {
      const output = await this.deps.codexAuth.logout();
      resetModelsByProvider("codex");
      return createMessage(
        "assistant",
        `${output}\nModelos Codex restaurados para o catálogo padrão.`,
        { source: "codex-auth", command: "logout" },
      );
    }

    if (action === "api") {
      const apiKey = input.slice(AUTH_API_COMMAND_PREFIX.length).trim();
      if (!apiKey) {
        return createMessage(
          "assistant",
          "Comando invalido. Use `/auth api <OPENAI_API_KEY>`.",
          { source: "codex-auth", command: "api" },
        );
      }

      const output = await this.deps.codexAuth.loginWithApiKey(apiKey);
      process.env.OPENAI_API_KEY = apiKey;
      const modelsSummary = await this.refreshCodexModelsForCurrentLoginAndActivate();
      return createMessage(
        "assistant",
        [output, "OPENAI_API_KEY carregada no processo atual da Alicia.", modelsSummary]
          .filter(Boolean)
          .join("\n"),
        { source: "codex-auth", command: "api" },
      );
    }

    return createMessage(
      "assistant",
      "Comando /auth desconhecido. Use `/auth help`.",
      { source: "codex-auth", command: "unknown" },
    );
  }

  private async executeSkillsCommand(input: string) {
    const availableSkills = this.deps.skillsCatalog.listAvailableSkills();
    const tokens = input.split(/\s+/).filter(Boolean);
    const action = (tokens[1] ?? "list").toLowerCase();
    const selection = tokens.slice(2).join(" ").trim();
    const current = this.deps.runtimeSettings.getSettings();

    if (action === "help") {
      return createMessage(
        "assistant",
        [
          "Comandos de skills:",
          "/skills - lista skills disponiveis e status (ON/OFF)",
          "/skills list - lista skills disponiveis",
          "/skills enable <nome|indice|all> - habilita skill(s)",
          "/skills disable <nome|indice|all> - desabilita skill(s)",
          "/skills toggle <nome|indice> - alterna status de uma skill",
          "/skills help - mostra esta ajuda",
          "",
          "As skills sao descobertas em `src/skills/*/SKILL.md`.",
        ].join("\n"),
        { source: "skills", command: "help" },
      );
    }

    if (action === "list") {
      return createMessage(
        "assistant",
        this.buildSkillsListMessage(availableSkills, current.enabledSkills),
        { source: "skills", command: "list" },
      );
    }

    if (action !== "enable" && action !== "disable" && action !== "toggle") {
      return createMessage(
        "assistant",
        "Comando /skills desconhecido. Use `/skills help`.",
        { source: "skills", command: "unknown" },
      );
    }

    if (!selection) {
      return createMessage(
        "assistant",
        `Informe a skill alvo. Exemplo: \`/skills ${action} 1\` ou \`/skills ${action} all\`.`,
        { source: "skills", command: action },
      );
    }

    if (availableSkills.length === 0) {
      return createMessage(
        "assistant",
        [
          "Nenhuma skill encontrada para gerenciar.",
          "Adicione pastas com `SKILL.md` em `src/skills`.",
        ].join("\n"),
        { source: "skills", command: action },
      );
    }

    const targets = this.resolveSkillTargets(selection, availableSkills);
    if (targets.error) {
      return createMessage(
        "assistant",
        `${targets.error}\n\n${this.buildSkillsListMessage(availableSkills, current.enabledSkills)}`,
        { source: "skills", command: action },
      );
    }

    const enabledLookup = new Set(
      current.enabledSkills.map((name) => this.normalizeSkillName(name)),
    );

    for (const target of targets.items) {
      const normalized = this.normalizeSkillName(target.name);
      if (action === "enable") {
        enabledLookup.add(normalized);
        continue;
      }
      if (action === "disable") {
        enabledLookup.delete(normalized);
        continue;
      }
      if (enabledLookup.has(normalized)) {
        enabledLookup.delete(normalized);
      } else {
        enabledLookup.add(normalized);
      }
    }

    const nextEnabledSkills = availableSkills
      .filter((skill) => enabledLookup.has(this.normalizeSkillName(skill.name)))
      .map((skill) => skill.name);

    this.deps.runtimeSettings.setSettings({
      ...current,
      enabledSkills: nextEnabledSkills,
    });

    const summaryAction =
      action === "enable"
        ? "habilitadas"
        : action === "disable"
          ? "desabilitadas"
          : "alternadas";

    return createMessage(
      "assistant",
      [
        `Skills ${summaryAction}: ${targets.items.map((skill) => skill.name).join(", ")}.`,
        this.buildSkillsListMessage(availableSkills, nextEnabledSkills),
      ].join("\n\n"),
      { source: "skills", command: action },
    );
  }

  private buildSkillsListMessage(
    availableSkills: readonly SkillCatalogEntry[],
    enabledSkills: readonly string[],
  ): string {
    if (availableSkills.length === 0) {
      return [
        "Nenhuma skill disponivel.",
        "Crie skills em `src/skills/<nome-da-skill>/SKILL.md`.",
      ].join("\n");
    }

    const enabledLookup = new Set(
      enabledSkills.map((name) => this.normalizeSkillName(name)),
    );
    const enabledCount = availableSkills.filter((skill) =>
      enabledLookup.has(this.normalizeSkillName(skill.name)),
    ).length;

    const lines = [
      `Skills disponiveis: ${availableSkills.length} | Habilitadas: ${enabledCount}`,
      "Use `/skills enable <nome|indice|all>` e `/skills disable <nome|indice|all>` para configurar.",
      "",
      ...availableSkills.map((skill, index) => {
        const isEnabled = enabledLookup.has(this.normalizeSkillName(skill.name));
        const status = isEnabled ? "[ON]" : "[OFF]";
        return `${index + 1}. ${status} ${skill.name} - ${skill.description} (${skill.path})`;
      }),
    ];

    return lines.join("\n");
  }

  private resolveSkillTargets(
    selection: string,
    availableSkills: readonly SkillCatalogEntry[],
  ): { items: SkillCatalogEntry[]; error?: string } {
    const requested = selection
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
    if (requested.length === 0) {
      return { items: [], error: "Selecao de skill vazia." };
    }

    if (requested.length === 1 && requested[0].toLowerCase() === "all") {
      return { items: [...availableSkills] };
    }

    const items: SkillCatalogEntry[] = [];
    const dedupe = new Set<string>();

    for (const token of requested) {
      const asIndex = Number.parseInt(token, 10);
      if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= availableSkills.length) {
        const byIndex = availableSkills[asIndex - 1];
        const key = this.normalizeSkillName(byIndex.name);
        if (!dedupe.has(key)) {
          dedupe.add(key);
          items.push(byIndex);
        }
        continue;
      }

      const normalizedToken = this.normalizeSkillName(token);
      const exactMatch = availableSkills.find(
        (skill) => this.normalizeSkillName(skill.name) === normalizedToken,
      );
      if (exactMatch) {
        const key = this.normalizeSkillName(exactMatch.name);
        if (!dedupe.has(key)) {
          dedupe.add(key);
          items.push(exactMatch);
        }
        continue;
      }

      const partialMatches = availableSkills.filter((skill) =>
        this.normalizeSkillName(skill.name).includes(normalizedToken),
      );
      if (partialMatches.length === 1) {
        const key = this.normalizeSkillName(partialMatches[0].name);
        if (!dedupe.has(key)) {
          dedupe.add(key);
          items.push(partialMatches[0]);
        }
        continue;
      }

      if (partialMatches.length > 1) {
        return {
          items: [],
          error: `Selecao ambigua: "${token}". Seja mais especifico.`,
        };
      }

      return {
        items: [],
        error: `Skill nao encontrada: "${token}".`,
      };
    }

    return { items };
  }

  private normalizeSkillName(value: string): string {
    return value.trim().toLowerCase();
  }

  private normalizeForIntent(input: string): string {
    return input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  private includesKeyword(normalizedInput: string, keywords: readonly string[]): boolean {
    return keywords.some((keyword) => normalizedInput.includes(keyword));
  }

  private resolveBehaviorState(input: string): BehavioralState {
    const normalized = this.normalizeForIntent(input);

    if (this.includesKeyword(normalized, PUBLIC_FACING_KEYWORDS)) {
      return "public-facing";
    }

    if (this.includesKeyword(normalized, HIGH_RISK_KEYWORDS)) {
      return "high-risk";
    }

    if (this.includesKeyword(normalized, RECOVERY_KEYWORDS)) {
      return "recovery";
    }

    if (ADVISORY_PATTERNS.some((pattern) => pattern.test(normalized))) {
      return "advisory";
    }

    if (this.includesKeyword(normalized, EXECUTION_KEYWORDS)) {
      return "execution";
    }

    return "idle";
  }

  private buildBehaviorSystemPatch(state: BehavioralState): string {
    const base = [
      `BehaviorState=${state}`,
      "Nunca se descreva como projeto, ferramenta ou sistema.",
      "Nunca use expressao 'projeto Alicia' para definir sua identidade.",
    ];

    const byState: Record<BehavioralState, readonly string[]> = {
      idle: [
        "Resposta curta e natural.",
        "Faça no maximo 1 pergunta objetiva para destravar o proximo passo.",
      ],
      advisory: [
        "Explique de forma estruturada com tradeoffs objetivos.",
        "Priorize clareza tecnica e recomendacao pratica.",
      ],
      execution: [
        "Foque em execucao: passos concretos e proximo passo imediato.",
        "Evite teoria longa se nao for solicitada.",
      ],
      "public-facing": [
        "Entregue como rascunho/preview antes de qualquer acao publica.",
        "Peca confirmacao explicita antes de qualquer acao irreversivel.",
      ],
      "high-risk": [
        "Trate como risco medio/alto por padrao.",
        "Peca confirmacao explicita para mudancas com impacto financeiro/producao/dados sensiveis.",
      ],
      recovery: [
        "Explique causa provavel, opcoes de correcao e risco de cada opcao.",
        "Seja objetiva e orientada a restaurar estabilidade.",
      ],
    };

    return [...base, ...byState[state]].join("\n");
  }

  private formatAuthMode(mode: string): string {
    if (mode === "chatgpt") return "ChatGPT";
    if (mode === "api") return "API key";
    if (mode === "none") return "Nao autenticado";
    return "Desconhecido";
  }

  private async refreshCodexModelsForCurrentLogin(): Promise<string> {
    const candidates = getDefaultModelsByProvider("codex");
    const available = await this.deps.codexModelDiscovery.listAvailableModels(candidates);
    if (available.length === 0) {
      setModelsByProvider("codex", []);
      return [
        "Modelos Codex disponiveis no login atual: 0",
        "Nao foi possivel detectar modelos ativos para esta autenticacao.",
      ].join("\n");
    }

    setModelsByProvider("codex", available);
    const activeModels = getModelsByProvider("codex");
    return `Modelos Codex disponiveis no login atual (${activeModels.length}).`;
  }

  private async refreshCodexModelsForCurrentLoginAndActivate(): Promise<string> {
    const summary = await this.refreshCodexModelsForCurrentLogin();
    const activeModels = getModelsByProvider("codex");
    if (activeModels.length === 0) {
      return summary;
    }

    const preferredModel = activeModels.includes(DEFAULT_CODEX_MODEL)
      ? DEFAULT_CODEX_MODEL
      : activeModels[0];
    this.switchToCodex(preferredModel);

    const modelLines = activeModels.map((model, index) => {
      const suffix = model === preferredModel ? " (padrao ativo)" : "";
      return `${index + 1}. ${model}${suffix}`;
    });

    return [
      summary,
      "Provider alterado automaticamente para `codex`.",
      `Modelo padrao selecionado: ${preferredModel}`,
      "Modelos disponiveis nesse provider:",
      ...modelLines,
      "Use /settings para trocar de modelo.",
    ].join("\n");
  }

  private switchToCodex(model: string): void {
    const current = this.deps.runtimeSettings.getSettings();
    const next: RuntimeSettings = {
      ...current,
      provider: "codex",
      model,
    };
    this.deps.runtimeSettings.setSettings(next);
  }
}
