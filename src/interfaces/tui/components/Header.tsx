import React from "react";
import { Box, Spacer, Text } from "ink";

interface HeaderProps {
  title: string;
  mode: string;
  provider: string;
  model: string;
}

export const Header = ({ title, mode, provider, model }: HeaderProps) => (
  <Box borderStyle="double" borderColor="cyan" paddingX={1} flexDirection="row">
    <Text bold color="cyan">
      {title}
    </Text>
    <Spacer />
    <Text color="gray">
      {mode} | {provider} | {model || "(sem modelo)"}
    </Text>
  </Box>
);
