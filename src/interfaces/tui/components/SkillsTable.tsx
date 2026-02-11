import React, { useMemo } from "react";
import { Box, Text } from "ink";

import type { SkillCatalogEntry } from "../../../application/ports/skills-catalog-port.js";

interface SkillsTableProps {
  skills: readonly SkillCatalogEntry[];
  enabledSkillNames: readonly string[];
  activeIndex: number;
  maxWidth: number;
  maxRows: number;
}

const normalizeSkillName = (value: string) => value.trim().toLowerCase();

const toSingleLine = (value: string): string => value.replace(/\s+/g, " ").trim();

const truncate = (value: string, width: number): string => {
  if (width <= 0) return "";
  if (value.length <= width) return value;
  if (width <= 3) return ".".repeat(width);
  return `${value.slice(0, width - 3)}...`;
};

const padCell = (value: string, width: number): string =>
  truncate(value, width).padEnd(width, " ");

export const SkillsTable = ({
  skills,
  enabledSkillNames,
  activeIndex,
  maxWidth,
  maxRows,
}: SkillsTableProps) => {
  const normalizedEnabled = useMemo(
    () =>
      new Set(
        enabledSkillNames
          .map((name) => normalizeSkillName(name))
          .filter(Boolean),
      ),
    [enabledSkillNames],
  );

  const layout = useMemo(() => {
    const effectiveWidth = Math.max(64, maxWidth);
    const indexWidth = 3;
    const statusWidth = 5;
    const longestName = skills.reduce((max, skill) => Math.max(max, skill.name.length), 12);
    let nameWidth = Math.min(28, Math.max(12, longestName));
    let descriptionWidth = effectiveWidth - (indexWidth + statusWidth + nameWidth + 9);

    if (descriptionWidth < 18) {
      const deficit = 18 - descriptionWidth;
      nameWidth = Math.max(10, nameWidth - deficit);
      descriptionWidth = effectiveWidth - (indexWidth + statusWidth + nameWidth + 9);
    }

    return {
      indexWidth,
      statusWidth,
      nameWidth,
      descriptionWidth: Math.max(10, descriptionWidth),
    };
  }, [maxWidth, skills]);

  const rows = useMemo(
    () =>
      skills.map((skill, index) => {
        const isEnabled = normalizedEnabled.has(normalizeSkillName(skill.name));
        const line = [
          padCell(String(index + 1), layout.indexWidth),
          padCell(isEnabled ? "[ON]" : "[OFF]", layout.statusWidth),
          padCell(skill.name, layout.nameWidth),
          truncate(toSingleLine(skill.description || "Sem descricao"), layout.descriptionWidth),
        ].join(" | ");

        return {
          key: `${skill.name}-${skill.path}`,
          line,
          isActive: index === activeIndex,
        };
      }),
    [activeIndex, layout.descriptionWidth, layout.indexWidth, layout.nameWidth, layout.statusWidth, normalizedEnabled, skills],
  );

  const enabledCount = skills.filter((skill) => normalizedEnabled.has(normalizeSkillName(skill.name))).length;
  const visibleBounds = useMemo(() => {
    const visibleCount = Math.max(4, maxRows);
    if (rows.length <= visibleCount) {
      return { start: 0, end: rows.length };
    }

    const half = Math.floor(visibleCount / 2);
    let start = Math.max(0, activeIndex - half);
    let end = start + visibleCount;
    if (end > rows.length) {
      end = rows.length;
      start = Math.max(0, end - visibleCount);
    }
    return { start, end };
  }, [activeIndex, maxRows, rows]);
  const visibleRows = rows.slice(visibleBounds.start, visibleBounds.end);

  const headerLine = [
    padCell("#", layout.indexWidth),
    padCell("Status", layout.statusWidth),
    padCell("Skill", layout.nameWidth),
    "Descricao",
  ].join(" | ");
  const divider = "-".repeat(Math.max(40, Math.min(maxWidth, headerLine.length)));

  if (skills.length === 0) {
    return (
      <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
        <Text bold color="magenta">
          Skills
        </Text>
        <Text color="gray">Nenhuma skill disponivel em `src/skills`.</Text>
      </Box>
    );
  }

  return (
    <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
      <Text bold color="magenta">
        Skills Disponiveis ({enabledCount}/{skills.length} ON)
      </Text>
      <Text color="gray">Use Up/Down para navegar, Space para ligar/desligar e Enter/Esc para voltar.</Text>
      <Text color="gray">{headerLine}</Text>
      <Text color="gray">{divider}</Text>
      {visibleBounds.start > 0 && (
        <Text color="gray">... {visibleBounds.start} skill(s) acima</Text>
      )}
      {visibleRows.map((row) => (
        <Text key={row.key} color={row.isActive ? "cyan" : "white"}>
          {row.isActive ? ">" : " "} {row.line}
        </Text>
      ))}
      {visibleBounds.end < rows.length && (
        <Text color="gray">... {rows.length - visibleBounds.end} skill(s) abaixo</Text>
      )}
    </Box>
  );
};
