import { randomUUID } from "node:crypto";

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  metadata?: Record<string, string>;
}

export const createMessage = (
  role: MessageRole,
  content: string,
  metadata?: Record<string, string>,
): ChatMessage => ({
  id: randomUUID(),
  role,
  content,
  createdAt: new Date(),
  metadata,
});
