import {
  completeSimple,
  type Api,
  type Model,
  type TextContent,
  type ThinkingLevel,
} from "@mariozechner/pi-ai";

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
  prompt: string;
  thinkingLevel?: string;
  getAuth: (model: Model<Api>) => Promise<ResolvedRequestAuth>;
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

export function createCompleteText(options?: { completeSimpleFn?: typeof completeSimple }) {
  const completeSimpleFn = options?.completeSimpleFn ?? completeSimple;

  return async function completeText(input: CompleteTextInput): Promise<string> {
    const auth = await input.getAuth(input.model);
    if (!auth.ok) {
      throw new Error(auth.error);
    }

    const reasoning = input.model.reasoning ? toReasoningLevel(input.thinkingLevel) : undefined;
    const response = await completeSimpleFn(
      input.model,
      {
        messages: [{ role: "user", content: input.prompt, timestamp: Date.now() }],
      },
      {
        apiKey: auth.apiKey,
        headers: auth.headers,
        ...(reasoning ? { reasoning } : {}),
      },
    );

    const text = response.content
      .filter(isTextBlock)
      .map((block) => block.text)
      .join("\n");

    if (!text.trim()) {
      throw new Error(response.errorMessage || "No command generated");
    }

    return text;
  };
}
