import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { embedMany, generateText, Output } from "ai";

const CLAUDE_MODEL = "claude-opus-5";
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function complete(system: string, user: string): Promise<string> {
  const result = await generateText({
    model: anthropic(CLAUDE_MODEL),
    system,
    prompt: user,
    output: Output.json(),
  });
  return result.text;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const result = await embedMany({
    model: openai.embeddingModel(EMBEDDING_MODEL),
    values: texts,
  });
  return result.embeddings;
}
