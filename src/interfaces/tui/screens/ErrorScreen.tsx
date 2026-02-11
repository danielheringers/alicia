import React from "react";
import { Box, Text } from "ink";

interface ErrorScreenProps {
  error: string;
}

export const ErrorScreen = ({ error }: ErrorScreenProps) => (
  <Box flexDirection="column" padding={1}>
    <Text bold color="red">
      Falha ao iniciar a Alicia
    </Text>
    <Text color="gray">Detalhes:</Text>
    <Text color="red">{error}</Text>
    <Text color="gray">Corrija o problema e reinicie com `pnpm dev`.</Text>
  </Box>
);
