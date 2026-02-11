import React, { useEffect, useMemo, useState } from "react";
import { Box, Newline, Spacer, Text, useApp, useInput, useStdout } from "ink";
import TextInput from "ink-text-input";

import type { SkillCatalogEntry } from "../../../application/ports/skills-catalog-port.js";
import type { ChatService } from "../../../application/services/chat-service.js";
import type { MessageRole } from "../../../domain/chat-message.js";
import {
  clampConcurrency,
  getModelContextLimits,
  getModelsByProvider,
  PROVIDER_OPTIONS,
  type RuntimeSettings,
} from "../../../domain/runtime-settings.js";
import { Footer } from "../components/Footer.js";
import { Header } from "../components/Header.js";
import { SkillsTable } from "../components/SkillsTable.js";
import { StatusLine } from "../components/StatusLine.js";
import { useChatController } from "../hooks/use-chat-controller.js";

const MAX_VISIBLE_MESSAGES = 14;
const SETTINGS_FIELDS = ["provider", "model", "concurrency"] as const;
type SettingsField = (typeof SETTINGS_FIELDS)[number];
type ScreenMode = "chat" | "settings" | "skills";

const COMMAND_OPTIONS = [
  { command: "/help", description: "Mostra ajuda" },
  { command: "/auth", description: "Autenticacao Codex/OpenAI" },
  { command: "/skills", description: "Abre tabela de skills (toggle com Space)" },
  { command: "/settings", description: "Abre configuracoes" },
  { command: "/py", description: "Executa Python inline" },
  { command: "/exit", description: "Encerra a Alicia" },
] as const;

const ROLE_LABEL: Record<MessageRole, string> = {
  user: "Voce",
  assistant: "Alicia",
  system: "Sistema",
};

const ROLE_COLOR: Record<MessageRole, string> = {
  user: "blue",
  assistant: "green",
  system: "yellow",
};

const formatTokenLimit = (value: number | null): string =>
  value === null ? "n/d" : value.toLocaleString("en-US");

const normalizeSkillName = (value: string) => value.trim().toLowerCase();

const cycleOption = <T extends string>(options: readonly T[], current: T, direction: number): T => {
  if (options.length === 0) return current;
  const currentIndex = options.indexOf(current);
  if (currentIndex < 0) return options[0];

  const nextIndex = (currentIndex + direction + options.length) % options.length;
  return options[nextIndex];
};

const updateSettingsField = (
  settings: RuntimeSettings,
  field: SettingsField,
  direction: number,
): RuntimeSettings => {
  if (field === "provider") {
    const provider = cycleOption(PROVIDER_OPTIONS, settings.provider, direction);
    const allowedModels = getModelsByProvider(provider);
    const model = allowedModels.includes(settings.model) ? settings.model : (allowedModels[0] ?? "");
    return { ...settings, provider, model };
  }

  if (field === "model") {
    const models = getModelsByProvider(settings.provider);
    if (models.length === 0) {
      return settings;
    }
    const model = cycleOption(models, settings.model, direction);
    return { ...settings, model };
  }

  return {
    ...settings,
    concurrency: clampConcurrency(settings.concurrency + direction),
  };
};

interface HomeScreenProps {
  chatService: ChatService;
}

export const HomeScreen = ({ chatService }: HomeScreenProps) => {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [input, setInput] = useState("");
  const [screen, setScreen] = useState<ScreenMode>("chat");
  const [activeFieldIndex, setActiveFieldIndex] = useState(0);
  const [activeCommandIndex, setActiveCommandIndex] = useState(0);
  const [activeSkillIndex, setActiveSkillIndex] = useState(0);
  const [skillsFilter, setSkillsFilter] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettings>(() =>
    chatService.getRuntimeSettings(),
  );
  const [draftSettings, setDraftSettings] = useState<RuntimeSettings>(() =>
    chatService.getRuntimeSettings(),
  );
  const [skillsCatalog, setSkillsCatalog] = useState<readonly SkillCatalogEntry[]>(() =>
    chatService.listAvailableSkills(),
  );
  const { messages, isSending, error, send } = useChatController(chatService);

  const openSettings = () => {
    const current = chatService.getRuntimeSettings();
    setDraftSettings(current);
    setActiveFieldIndex(0);
    setStatusMessage(null);
    setScreen("settings");
  };

  const applySettings = () => {
    const saved = chatService.updateRuntimeSettings(draftSettings);
    setRuntimeSettings(saved);
    setStatusMessage("Status: Configuracoes salvas.");
    setScreen("chat");
  };

  const cancelSettings = () => {
    setStatusMessage("Status: Configuracao cancelada.");
    setScreen("chat");
  };

  const openSkills = () => {
    setSkillsCatalog(chatService.listAvailableSkills());
    setActiveSkillIndex(0);
    setSkillsFilter("");
    setStatusMessage(null);
    setScreen("skills");
  };

  const closeSkills = () => {
    setRuntimeSettings(chatService.getRuntimeSettings());
    setSkillsFilter("");
    setStatusMessage("Status: Gerenciador de skills fechado.");
    setScreen("chat");
  };

  const toggleSkillAtIndex = (skills: readonly SkillCatalogEntry[], index: number) => {
    const selectedSkill = skills[index];
    if (!selectedSkill) return;

    const current = chatService.getRuntimeSettings();
    const enabledLookup = new Set(
      current.enabledSkills.map((name) => normalizeSkillName(name)),
    );
    const normalizedSelected = normalizeSkillName(selectedSkill.name);
    const willEnable = !enabledLookup.has(normalizedSelected);

    if (willEnable) {
      enabledLookup.add(normalizedSelected);
    } else {
      enabledLookup.delete(normalizedSelected);
    }

    const nextEnabledSkills = skillsCatalog
      .filter((skill) => enabledLookup.has(normalizeSkillName(skill.name)))
      .map((skill) => skill.name);

    const saved = chatService.updateRuntimeSettings({
      ...current,
      enabledSkills: nextEnabledSkills,
    });
    setRuntimeSettings(saved);
    setStatusMessage(
      `Status: Skill ${willEnable ? "habilitada" : "desabilitada"}: ${selectedSkill.name}.`,
    );
  };

  const commandSuggestions = useMemo(() => {
    if (screen !== "chat") return [];

    const trimmed = input.trim();
    if (!trimmed.startsWith("/")) return [];

    return COMMAND_OPTIONS.filter((option) => option.command.startsWith(trimmed));
  }, [input, screen]);
  const hasCommandSuggestions = commandSuggestions.length > 0;
  const normalizedSkillsFilter = skillsFilter.trim().toLowerCase();
  const filteredSkillsCatalog = useMemo(() => {
    if (!normalizedSkillsFilter) {
      return skillsCatalog;
    }

    return skillsCatalog.filter((skill) => {
      const normalizedName = normalizeSkillName(skill.name);
      const normalizedDescription = skill.description.trim().toLowerCase();
      return (
        normalizedName.includes(normalizedSkillsFilter) ||
        normalizedDescription.includes(normalizedSkillsFilter)
      );
    });
  }, [normalizedSkillsFilter, skillsCatalog]);

  useInput((inputKey, key) => {
    if (key.ctrl && inputKey.toLowerCase() === "c") {
      exit();
      return;
    }

    if (screen === "chat") {
      if (!hasCommandSuggestions) return;

      if (key.downArrow || key.tab) {
        setActiveCommandIndex((current) => (current + 1) % commandSuggestions.length);
        return;
      }

      if (key.upArrow) {
        setActiveCommandIndex(
          (current) => (current - 1 + commandSuggestions.length) % commandSuggestions.length,
        );
      }
      return;
    }

    if (screen === "settings") {
      if (key.escape) {
        cancelSettings();
        return;
      }

      if (key.return) {
        applySettings();
        return;
      }

      if (key.tab || key.downArrow) {
        setActiveFieldIndex((current) => (current + 1) % SETTINGS_FIELDS.length);
        return;
      }

      if (key.upArrow) {
        setActiveFieldIndex((current) => (current - 1 + SETTINGS_FIELDS.length) % SETTINGS_FIELDS.length);
        return;
      }

      if (key.leftArrow || key.rightArrow) {
        const direction = key.rightArrow ? 1 : -1;
        const field = SETTINGS_FIELDS[activeFieldIndex];
        setDraftSettings((current) => updateSettingsField(current, field, direction));
      }
      return;
    }

    if (screen === "skills") {
      if (key.escape || key.return) {
        closeSkills();
        return;
      }

      if (inputKey === " ") {
        if (filteredSkillsCatalog.length > 0) {
          toggleSkillAtIndex(filteredSkillsCatalog, activeSkillIndex);
        }
        return;
      }

      if (key.backspace || key.delete) {
        setSkillsFilter((current) => current.slice(0, -1));
        setActiveSkillIndex(0);
        return;
      }

      if (key.downArrow || key.tab) {
        if (filteredSkillsCatalog.length > 0) {
          setActiveSkillIndex((current) => (current + 1) % filteredSkillsCatalog.length);
        }
        return;
      }

      if (key.upArrow) {
        if (filteredSkillsCatalog.length > 0) {
          setActiveSkillIndex(
            (current) =>
              (current - 1 + filteredSkillsCatalog.length) % filteredSkillsCatalog.length,
          );
        }
        return;
      }

      if (
        inputKey &&
        !key.ctrl &&
        !key.meta &&
        !key.tab &&
        !key.upArrow &&
        !key.downArrow &&
        !key.leftArrow &&
        !key.rightArrow
      ) {
        setSkillsFilter((current) => `${current}${inputKey}`);
        setActiveSkillIndex(0);
      }
    }
  });

  useEffect(() => {
    setActiveCommandIndex((current) => {
      if (!hasCommandSuggestions) {
        return 0;
      }
      return Math.min(current, commandSuggestions.length - 1);
    });
  }, [commandSuggestions, hasCommandSuggestions]);

  useEffect(() => {
    setActiveSkillIndex((current) => {
      if (filteredSkillsCatalog.length === 0) {
        return 0;
      }
      return Math.min(current, filteredSkillsCatalog.length - 1);
    });
  }, [filteredSkillsCatalog]);

  const visibleMessages = useMemo(
    () => messages.slice(Math.max(0, messages.length - MAX_VISIBLE_MESSAGES)),
    [messages],
  );
  const runtimeModelLimits = useMemo(
    () => getModelContextLimits(runtimeSettings.provider, runtimeSettings.model),
    [runtimeSettings.model, runtimeSettings.provider],
  );
  const draftModelLimits = useMemo(
    () => getModelContextLimits(draftSettings.provider, draftSettings.model),
    [draftSettings.model, draftSettings.provider],
  );
  const draftModelOptions = getModelsByProvider(draftSettings.provider);
  const draftModelIndex = draftModelOptions.indexOf(draftSettings.model);
  const draftModelPosition = draftModelIndex < 0 ? 0 : draftModelIndex + 1;
  const isNarrowLayout = (stdout.columns ?? 120) < 120;

  const selectedCommand = hasCommandSuggestions
    ? commandSuggestions[Math.min(activeCommandIndex, commandSuggestions.length - 1)]
    : null;
  const commandSelectionValue = (command: string) => {
    if (command === "/py") return "/py ";
    return command;
  };

  const onSubmit = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    if (
      screen === "chat" &&
      trimmed.startsWith("/") &&
      selectedCommand &&
      trimmed !== selectedCommand.command
    ) {
      setInput(commandSelectionValue(selectedCommand.command));
      return;
    }

    if (trimmed === "/exit") {
      exit();
      return;
    }

    if (trimmed === "/settings") {
      setInput("");
      openSettings();
      return;
    }

    if (trimmed === "/skills") {
      setInput("");
      openSkills();
      return;
    }

    setStatusMessage(null);
    setInput("");
    await send(trimmed);
    setRuntimeSettings(chatService.getRuntimeSettings());
  };

  const runtimeProviderModels = getModelsByProvider(runtimeSettings.provider);
  const runtimeSummary = `Runtime | Provider: ${runtimeSettings.provider} | Modelo: ${runtimeSettings.model || "(sem modelo)"
    } | Contexto in/out: ${formatTokenLimit(runtimeModelLimits.inputContextTokens)}/${formatTokenLimit(
      runtimeModelLimits.outputContextTokens,
    )} | Concorrencia: ${runtimeSettings.concurrency} | Skills ON: ${runtimeSettings.enabledSkills.length
    } | Modelos disponiveis: ${runtimeProviderModels.length}`;
  const draftModelPreview = draftModelOptions.slice(0, 5);
  const commandPalette = commandSuggestions;
  const commandLabelWidth = Math.max(
    0,
    ...commandPalette.map((option) => option.command.length),
  );
  const skillsTableWidth = Math.max(72, (stdout.columns ?? 120) - 8);
  const skillsTableRows = Math.max(6, (stdout.rows ?? 32) - 16);

  const chatColumn = (
    <Box flexDirection="column" flexGrow={1} marginTop={isNarrowLayout ? 1 : 0}>
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="round"
        borderColor="blue"
        paddingX={1}
        minHeight={16}
      >
        <Box flexDirection="row">
          <Text color="gray">
            Mensagens: {messages.length} | Janela: {visibleMessages.length}/{MAX_VISIBLE_MESSAGES}
          </Text>
        </Box>
        <Text color="gray">
          Digite "/" para abrir autocomplete de comandos e confirme com Enter.
        </Text>
        <Newline />
        {visibleMessages.length === 0 ? (
          <Text color="gray">Sem mensagens ainda. Comece com /help.</Text>
        ) : (
          visibleMessages.map((message) => (
            <Box
              key={message.id}
              flexDirection="column"
              marginBottom={1}
              borderStyle="round"
              borderColor={ROLE_COLOR[message.role]}
              paddingX={1}
            >
              <Text color={ROLE_COLOR[message.role]}>
                {ROLE_LABEL[message.role]} [{message.createdAt.toLocaleTimeString()}]
              </Text>
              <Text>{message.content}</Text>
            </Box>
          ))
        )}
      </Box>
      <Box marginTop={1} borderStyle="round" borderColor="green" paddingX={1}>
        <Text color="green" wrap="truncate-end">
          {runtimeSummary}
        </Text>
      </Box>
      <Box marginTop={1} paddingX={1}>
        <Text color="blue">{"> "}</Text>
        <TextInput value={input} onChange={setInput} onSubmit={onSubmit} />
      </Box>
      {hasCommandSuggestions && (
        <Box marginTop={1} paddingX={1} flexDirection="column">
          {commandPalette.map((option, index) => {
            const isActive = index === activeCommandIndex;
            const commandLabel = `${isActive ? ">" : " "} ${option.command}`.padEnd(
              commandLabelWidth + 3,
            );

            return (
              <Text key={option.command} wrap="truncate-end">
                <Text color={isActive ? "cyanBright" : "cyan"}>{commandLabel}</Text>
                <Text color="gray">{option.description}</Text>
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );

  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Header
        title="Alicia"
        mode={screen === "chat" ? "Chat" : screen === "settings" ? "Settings" : "Skills"}
        provider={runtimeSettings.provider}
        model={runtimeSettings.model}
      />

      {statusMessage && <StatusLine message={statusMessage} color="green" />}

      {screen === "chat" ? (
        <Box marginTop={1}>
          {chatColumn}
        </Box>
      ) : screen === "settings" ? (
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text bold color="yellow">
            Configuracoes
          </Text>
          <Text color="gray">
            Cima/baixo selecionam campo. Esquerda/direita alteram valor. Enter salva. Esc cancela.
          </Text>
          <Text color={activeFieldIndex === 0 ? "cyan" : "white"}>
            {activeFieldIndex === 0 ? ">" : " "} Provider: {draftSettings.provider}
          </Text>
          <Text color="gray">Modelos disponiveis no provider: {draftModelOptions.length}</Text>
          <Text color={activeFieldIndex === 1 ? "cyan" : "white"}>
            {activeFieldIndex === 1 ? ">" : " "} Model: {draftSettings.model || "(sem modelo)"} (
            {draftModelPosition}/{draftModelOptions.length})
          </Text>
          <Text color="gray">
            Contexto in/out: {formatTokenLimit(draftModelLimits.inputContextTokens)}/
            {formatTokenLimit(draftModelLimits.outputContextTokens)}
          </Text>
          <Text color={activeFieldIndex === 2 ? "cyan" : "white"}>
            {activeFieldIndex === 2 ? ">" : " "} Concurrency: {draftSettings.concurrency}
          </Text>
          <Newline />
          <Text color="gray">Preview de modelos desse provider:</Text>
          {draftModelPreview.length === 0 ? (
            <Text color="gray">Nenhum modelo disponivel no login atual.</Text>
          ) : (
            draftModelPreview.map((model, index) => (
              <Text key={model} color={model === draftSettings.model ? "cyan" : "gray"}>
                {index + 1}. {model}
              </Text>
            ))
          )}
        </Box>
      ) : (
        <Box marginTop={1} flexDirection="column">
          <Box marginBottom={1} borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
            <Text color="magenta">
              Filtro: {skillsFilter || "(vazio)"} | Mostrando {filteredSkillsCatalog.length}/{skillsCatalog.length}
            </Text>
            <Text color="gray">Digite para filtrar por nome/descricao. Backspace apaga.</Text>
          </Box>
          {filteredSkillsCatalog.length === 0 ? (
            <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
              <Text bold color="magenta">
                Skills Disponiveis
              </Text>
              <Text color="gray">Nenhuma skill encontrada para o filtro atual.</Text>
            </Box>
          ) : (
            <SkillsTable
              skills={filteredSkillsCatalog}
              enabledSkillNames={runtimeSettings.enabledSkills}
              activeIndex={activeSkillIndex}
              maxWidth={skillsTableWidth}
              maxRows={skillsTableRows}
            />
          )}
        </Box>
      )}

      {screen === "settings" && <Text color="gray">Salve ou cancele para voltar ao chat.</Text>}
      {screen === "skills" && (
        <Text color="gray">Use Enter ou Esc para voltar ao chat.</Text>
      )}

      <Footer isSending={isSending} />

      {error && <StatusLine message={`Erro: ${error}`} color="red" />}
    </Box>
  );
};
