import type { ChatMessage } from "../../domain/chat-message.js";

export type BehavioralState =
  | "idle"
  | "advisory"
  | "execution"
  | "public-facing"
  | "high-risk"
  | "recovery";

export interface AssistantRequest {
  sessionId: string;
  message: string;
  history: readonly ChatMessage[];
  behaviorState?: BehavioralState;
  systemPatches?: readonly string[];
}

export interface AssistantResponse {
  text: string;
  metadata?: Record<string, string>;
}

export interface AssistantPort {
  respond(request: AssistantRequest): Promise<AssistantResponse>;
}
