import React from "react";
import { Box, Text } from "ink";

import { ProgressBar } from "../components/ProgressBar.js";
import { useTimer } from "../hooks/useTimer.js";

interface LoadingScreenProps {
  label?: string;
}

export const LoadingScreen = ({ label = "Inicializando Alicia..." }: LoadingScreenProps) => {
  const tick = useTimer(true, 120);
  const progress = ((tick % 30) + 1) / 30;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">
        Alicia
      </Text>
      <Text color="gray">{label}</Text>
      <ProgressBar value={progress} />
    </Box>
  );
};
