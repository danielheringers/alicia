import React from "react";
import { Box, Spacer, Text } from "ink";

import { useTimer } from "../hooks/useTimer.js";
import { ProgressBar } from "./ProgressBar.js";

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

interface FooterProps {
  isSending: boolean;
}

export const Footer = ({ isSending }: FooterProps) => {
  const tick = useTimer(isSending, 90);
  const spinner = SPINNER_FRAMES[tick % SPINNER_FRAMES.length];
  const progressValue = ((tick % 24) + 1) / 24;

  return (
    <Box marginTop={1} flexDirection="column">
      <Box flexDirection="row">
        {isSending ? (
          <Text color="yellow">{spinner} Processando resposta...</Text>
        ) : (
          <Text color="gray">Pronto para enviar.</Text>
        )}
        <Spacer />
        <Text color="gray">Ctrl+C para sair</Text>
      </Box>
      {isSending && <ProgressBar value={progressValue} color="yellow" />}
    </Box>
  );
};
