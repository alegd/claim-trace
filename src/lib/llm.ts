import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createProviderRegistry, embedMany, generateText, Output } from "ai";

const registry = createProviderRegistry({ anthropic, openai });

type ModelId = `anthropic:${string}` | `openai:${string}`;

const COMPLETION_MODEL = (process.env.COMPLETION_MODEL ?? "openai:gpt-5.6") as ModelId;
const EMBEDDING_MODEL = (process.env.EMBEDDING_MODEL ?? "openai:text-embedding-3-small") as ModelId;

export async function complete(system: string, user: string): Promise<string> {
  const result = await generateText({
    model: registry.languageModel(COMPLETION_MODEL),
    system,
    prompt: user,
    output: Output.json()
  });
  return result.text;
}

export async function embed(texts: string[]): Promise<number[][]> {
  const result = await embedMany({
    model: registry.embeddingModel(EMBEDDING_MODEL),
    values: texts
  });
  return result.embeddings;
}
