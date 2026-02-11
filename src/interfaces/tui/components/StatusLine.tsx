import React from "react";
import { Box, Text } from "ink";

interface StatusLineProps {
  message: string;
  color?: string;
}

export const StatusLine = ({ message, color = "green" }: StatusLineProps) => (
  <Box marginTop={1}>
    <Text color={color}>{message}</Text>
  </Box>
);
