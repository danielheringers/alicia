import React, { useEffect, useState } from "react";

import type { ChatService } from "../../application/services/chat-service.js";
import { createChatService } from "../../infrastructure/composition/bootstrap.js";
import { ErrorScreen } from "./screens/ErrorScreen.js";
import { HomeScreen } from "./screens/HomeScreen.js";
import { LoadingScreen } from "./screens/LoadingScreen.js";

type AppState =
  | { status: "loading" }
  | { status: "ready"; chatService: ChatService }
  | { status: "error"; error: string };

export const App = () => {
  const [state, setState] = useState<AppState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      try {
        const chatService = await createChatService();
        if (!mounted) return;
        setState({ status: "ready", chatService });
      } catch (cause) {
        if (!mounted) return;
        const message = cause instanceof Error ? cause.message : "Falha desconhecida";
        setState({ status: "error", error: message });
      }
    };

    start();

    return () => {
      mounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return <LoadingScreen />;
  }

  if (state.status === "error") {
    return <ErrorScreen error={state.error} />;
  }

  return <HomeScreen chatService={state.chatService} />;
};
