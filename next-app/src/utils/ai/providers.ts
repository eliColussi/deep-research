// providers.ts
import { Configuration, OpenAIApi } from 'openai';
import { getEncoding } from 'js-tiktoken';
import { RecursiveCharacterTextSplitter } from './text-splitter';

/**
 * 1) Setup OpenAI client
 *    Replaces the custom '@ai-sdk/openai' approach.
 */
const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY, // or OPENAI_API_KEY
  basePath: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
});
export const openaiClient = new OpenAIApi(configuration);

// 2) Example model name
//    If you want to allow custom models, you can read from env or pass it in
export const customModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

/**
 * 3) A function that calls openai to get a chat completion (like your original code).
 *    This is a placeholder example. Adjust system/user messages as needed.
 */
export async function callOpenAI(model: string, prompt: string): Promise<string> {
  const response = await openaiClient.createChatCompletion({
    model,
    messages: [
      { role: 'system', content: 'You are an AI assistant' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.7,
  });

  // Return the assistant's text
  return response.data.choices?.[0]?.message?.content || '';
}

// 4) Trim logic
const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

/**
 * Trims a prompt to fit a maximum context size, using text-splitter if needed.
 */
export function trimPrompt(
  prompt: string,
  contextSize = Number(process.env.CONTEXT_SIZE) || 128_000,
) {
  if (!prompt) {
    return '';
  }

  const length = encoder.encode(prompt).length;
  if (length <= contextSize) {
    return prompt;
  }

  const overflowTokens = length - contextSize;
  // on average it's ~3 characters per token, so multiply by 3
  const chunkSize = prompt.length - overflowTokens * 3;
  if (chunkSize < MinChunkSize) {
    return prompt.slice(0, MinChunkSize);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
  });
  const trimmedPrompt = splitter.splitText(prompt)[0] ?? '';

  if (trimmedPrompt.length === prompt.length) {
    // Hard cut if it didn't actually reduce
    return trimPrompt(prompt.slice(0, chunkSize), contextSize);
  }

  // Recursively trim
  return trimPrompt(trimmedPrompt, contextSize);
}
