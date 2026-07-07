/**
 * LM Studio local vision backend.
 * Talks to LM Studio's OpenAI-compatible server (default http://localhost:1234)
 * so no data ever leaves the machine. Requires a vision-capable model loaded
 * (e.g. gemma, qwen-vl, llava) and CORS enabled in LM Studio's server settings.
 */
import { SYSTEM_INSTRUCTION, LOCAL_JSON_PROMPT } from '../constants';
import type { AnalysisData, LMStudioConfig } from '../types';

const FALLBACK_DATA: AnalysisData = {
  AGE: "?",
  WEIGHT: "?",
  HEIGHT: "?",
  RACE: "?",
  MOOD: "?",
  HAIR_COLOR: "?",
  SHIRT_COLOR: "?",
};

const normalizeEndpoint = (endpoint: string): string =>
  endpoint.trim().replace(/\/+$/, '').replace(/\/v1$/, '');

// Local models (especially thinking models) wrap output in <think> blocks
// and markdown fences; extract the first JSON object we can find.
const extractJson = (raw: string): Record<string, string> | null => {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*/gi, '')
    .replace(/```(?:json)?/gi, '');
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

export const fetchLocalModels = async (endpoint: string): Promise<string[]> => {
  const res = await fetch(`${normalizeEndpoint(endpoint)}/v1/models`);
  if (!res.ok) throw new Error(`LM Studio responded ${res.status}`);
  const data = await res.json();
  return (data?.data ?? []).map((m: { id: string }) => m.id);
};

export const analyzePersonLocal = async (
  base64Image: string,
  config: LMStudioConfig,
): Promise<AnalysisData> => {
  try {
    const res = await fetch(`${normalizeEndpoint(config.endpoint)}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(config.model ? { model: config.model } : {}),
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          {
            role: 'user',
            content: [
              { type: 'text', text: LOCAL_JSON_PROMPT },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Image}` } },
            ],
          },
        ],
        temperature: 0.2,
        // Thinking models burn tokens on reasoning before the JSON appears.
        max_tokens: 1000,
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`LM Studio error ${res.status}:`, body);
      return { ...FALLBACK_DATA, MOOD: 'LOCAL UPLINK ERROR', AGE: 'OFFLINE' };
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? '';
    const parsed = extractJson(text);
    if (!parsed) {
      console.error('LM Studio returned unparseable output:', text);
      return { ...FALLBACK_DATA, MOOD: 'SIGNAL CORRUPTED' };
    }

    return {
      AGE: parsed.AGE || "?",
      WEIGHT: parsed.WEIGHT || "?",
      HEIGHT: parsed.HEIGHT || "?",
      RACE: parsed.RACE || "?",
      MOOD: parsed.MOOD || "?",
      HAIR_COLOR: parsed.HAIR_COLOR || "?",
      SHIRT_COLOR: parsed.SHIRT_COLOR || "?",
    };
  } catch (error) {
    // fetch throws on network/CORS failure — the server is unreachable.
    console.error('Error analyzing person with LM Studio:', error);
    return { ...FALLBACK_DATA, MOOD: 'LOCAL UPLINK UNREACHABLE', AGE: 'OFFLINE' };
  }
};
