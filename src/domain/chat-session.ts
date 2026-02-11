import { randomUUID } from "node:crypto";

import type { ChatMessage } from "./chat-message.js";

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
}

export const createChatSession = (): ChatSession => ({
  id: randomUUID(),
  messages: [],
});
