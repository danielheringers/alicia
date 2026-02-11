import React from "react";
import { Text } from "ink";

interface ProgressBarProps {
  value: number;
  width?: number;
  color?: string;
}

export const ProgressBar = ({ value, width = 24, color = "cyan" }: ProgressBarProps) => {
  const normalized = Math.max(0, Math.min(1, value));
  const filled = Math.round(normalized * width);
  const bar = `${"#".repeat(filled)}${"-".repeat(Math.max(0, width - filled))}`;
  const percent = Math.round(normalized * 100);

  return (
    <Text color={color}>
      [{bar}] {percent}%
    </Text>
  );
};
