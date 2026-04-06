import {
  completeSimple,
  streamSimple,
  type Api,
  type AssistantMessage,
  type AssistantMessageEvent,
  type Model,
  type SimpleStreamOptions,
  type TextContent,
  type ThinkingLevel,
} from "@mariozechner/pi-ai";
import type { DebugLogger } from "./debug";

export type ResolvedRequestAuth =
  | {
      ok: true;
      apiKey?: string;
      headers?: Record<string, string>;
    }
  | {
      ok: false;
      error: string;
    };

export type CompleteTextInput = {
  model: Model<Api>;
  systemPrompt: string;
  userPrompt: string;
  thinkingLevel?: string;
  getAuth: (model: Model<Api>) => Promise<ResolvedRequestAuth>;
  debugLogger: DebugLogger;
};

function isTextBlock(block: { type: string }): block is TextContent {
  return block.type === "text";
}

function toReasoningLevel(value: string | undefined): ThinkingLevel | undefined {
  if (!value || value === "off") {
    return undefined;
  }

  if (
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
  ) {
    return value;
  }

  return undefined;
}

function getResponseText(response: AssistantMessage): string {
  const text = response.content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join("\n");

  if (!text.trim()) {
    throw new Error(response.errorMessage || "No command generated");
  }

  return text;
}

function summarizeEvent(event: AssistantMessageEvent): Record<string, unknown> {
  switch (event.type) {
    case "text_delta":
    case "thinking_delta":
    case "toolcall_delta":
      return {
        type: event.type,
        contentIndex: event.contentIndex,
        delta: event.delta,
      };
    case "text_end":
    case "thinking_end":
      return {
        type: event.type,
        contentIndex: event.contentIndex,
        content: event.content,
      };
    case "toolcall_end":
      return {
        type: event.type,
        contentIndex: event.contentIndex,
        toolCall: event.toolCall,
      };
    case "done":
      return {
        type: event.type,
        reason: event.reason,
        stopReason: event.message.stopReason,
      };
    case "error":
      return {
        type: event.type,
        reason: event.reason,
        errorMessage: event.error.errorMessage,
      };
    default:
      return {
        type: event.type,
        contentIndex: "contentIndex" in event ? event.contentIndex : undefined,
      };
  }
}

function buildRequestOptions(
  input: CompleteTextInput,
  auth: Extract<ResolvedRequestAuth, { ok: true }>,
): SimpleStreamOptions {
  const reasoning = input.model.reasoning ? toReasoningLevel(input.thinkingLevel) : undefined;

  return {
    apiKey: auth.apiKey,
    headers: auth.headers,
    ...(reasoning ? { reasoning } : {}),
    onPayload(payload: unknown): void {
      input.debugLogger.log("provider-payload", payload);
    },
  };
}

export function createCompleteText(options?: {
  completeSimpleFn?: typeof completeSimple;
  streamSimpleFn?: typeof streamSimple;
}) {
  const completeSimpleFn = options?.completeSimpleFn ?? completeSimple;
  const streamSimpleFn = options?.streamSimpleFn ?? streamSimple;

  return async function completeText(input: CompleteTextInput): Promise<string> {
    const auth = await input.getAuth(input.model);
    if (!auth.ok) {
      throw new Error(auth.error);
    }

    const context = {
      systemPrompt: input.systemPrompt,
      messages: [{ role: "user" as const, content: input.userPrompt, timestamp: Date.now() }],
    };
    const requestOptions = buildRequestOptions(input, auth);

    if (input.debugLogger.enabled) {
      const responseStream = streamSimpleFn(input.model, context, requestOptions);
      for await (const event of responseStream) {
        input.debugLogger.log("model-stream-event", summarizeEvent(event));
      }
      const response = await responseStream.result();
      const text = getResponseText(response);
      input.debugLogger.log("model-response-text", text);
      return text;
    }

    const response = await completeSimpleFn(input.model, context, requestOptions);
    const text = getResponseText(response);
    input.debugLogger.log("model-response-text", text);
    return text;
  };
}
