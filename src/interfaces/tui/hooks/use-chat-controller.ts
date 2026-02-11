import { useCallback, useState } from "react";

import type { ChatService } from "../../../application/services/chat-service.js";
import type { ChatMessage } from "../../../domain/chat-message.js";

export interface ChatController {
  messages: readonly ChatMessage[];
  isSending: boolean;
  error: string | null;
  send: (input: string) => Promise<void>;
}

export const useChatController = (chatService: ChatService): ChatController => {
  const [messages, setMessages] = useState<readonly ChatMessage[]>(chatService.getHistory());
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (input: string) => {
      if (!input.trim()) return;
      setError(null);
      setIsSending(true);
      try {
        const history = await chatService.send(input);
        setMessages([...history]);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Falha ao enviar mensagem";
        setError(message);
      } finally {
        setIsSending(false);
      }
    },
    [chatService],
  );

  return { messages, isSending, error, send };
};
