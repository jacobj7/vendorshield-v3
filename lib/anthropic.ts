import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export { anthropic };

export interface RiskScoreResult {
  score: number;
  level: "low" | "medium" | "high" | "critical";
  reasoning: string;
  factors: string[];
}

export async function calculateRiskScore(
  context: string,
  additionalData?: Record<string, unknown>,
): Promise<RiskScoreResult> {
  const prompt = `You are a risk assessment expert. Analyze the following context and provide a risk score.

Context:
${context}

${additionalData ? `Additional Data:\n${JSON.stringify(additionalData, null, 2)}` : ""}

Provide a risk assessment in the following JSON format:
{
  "score": <number between 0 and 100>,
  "level": <"low" | "medium" | "high" | "critical">,
  "reasoning": <brief explanation of the risk score>,
  "factors": [<list of key risk factors identified>]
}

Guidelines:
- Score 0-25: low risk
- Score 26-50: medium risk
- Score 51-75: high risk
- Score 76-100: critical risk

Respond with ONLY the JSON object, no additional text.`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Anthropic API");
  }

  let parsed: RiskScoreResult;
  try {
    parsed = JSON.parse(content.text);
  } catch {
    throw new Error(`Failed to parse risk score response: ${content.text}`);
  }

  if (
    typeof parsed.score !== "number" ||
    !["low", "medium", "high", "critical"].includes(parsed.level) ||
    typeof parsed.reasoning !== "string" ||
    !Array.isArray(parsed.factors)
  ) {
    throw new Error("Invalid risk score response structure");
  }

  return parsed;
}

export async function analyzeText(
  text: string,
  systemPrompt?: string,
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: text,
    },
  ];

  const requestParams: Anthropic.MessageCreateParamsNonStreaming = {
    model: "claude-opus-4-5",
    max_tokens: 2048,
    messages,
  };

  if (systemPrompt) {
    requestParams.system = systemPrompt;
  }

  const message = await anthropic.messages.create(requestParams);

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Anthropic API");
  }

  return content.text;
}

export default anthropic;
